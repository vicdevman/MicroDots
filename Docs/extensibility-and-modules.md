# MicroDots — Modularity and Extensibility

**Status:** Architectural commitment
**Audience:** Backend, infrastructure, integration authors, AI agents
**Related:** [`technical-architecture.md`](./technical-architecture.md) §8–§10 · [`skills-system.md`](./skills-system.md) · [`security-and-auth.md`](./security-and-auth.md)

---

## 1. The commitment

> **Every layer that can reasonably change is a module behind a contract. The core stays small, stable and boring.**

Concretely, a user must be able to:

- run **OpenCode**, **Cline**, **Codex CLI**, **Aider**, or a custom engine,
- run **two of them at once**, per project or per task,
- replace the model provider without touching prompts or tasks,
- add an MCP server or CLI without changing the backend,
- swap local artifact storage for S3 without changing workers,
- add a notification channel without changing the event system,

and none of those changes may require editing the orchestrator, the task state machine, the policy engine, or the UI core.

This document defines the seams, the contracts, the registry, and — just as importantly — **what is deliberately not a module**.

---

## 2. Core vs. modules

### 2.1 The stable core (not pluggable in v1)

| Component | Why it stays fixed |
|---|---|
| Task state machine | Every feature depends on identical semantics; pluggability here creates unresolvable states |
| Policy evaluation | Security must have one implementation and one truth |
| Approval records | Legal/audit semantics must not vary by plugin |
| Event log | Replay and recovery depend on one ordered format |
| Auth/session core | One auth model avoids tenancy and CSRF gaps |
| Data model for tasks/runs/approvals | The product's spine |
| Orchestrator control loop | Planning contract must be stable; models vary, the loop does not |

These can evolve through versioned migrations and ADRs — but not through third-party modules. A plugin that could redefine task states or bypass policy is not an extension; it is a fork.

### 2.2 The module surface (pluggable)

| Family | Contract | Built-ins | Third-party |
|---|---|---|---|
| Execution engine | `ExecutionEngine` | fake, opencode | cline, codex-cli, aider, custom |
| Integration adapter | `IntegrationAdapter` | mcp, cli, vercel, github | any |
| Model provider | AI SDK provider | openai-compatible, anthropic, google, ollama, openrouter | any compatible |
| Artifact store | `ArtifactStore` | local disk | S3-compatible |
| Secret store | `SecretStore` | encrypted file key | KMS/Vault later |
| Notification channel | `NotificationChannel` | in-app, web-push, smtp | ntfy, Discord, native push |
| Skill | `SKILL.md` + manifest | bundled bank | local/community |
| UI result card | `UICardSchema` + renderer | task, approval, diff, tests, artifact | registry-gated |

---

## 3. Contract catalogue

All contracts live in `packages/contracts` and are versioned. Implementations live in `packages/engines/*` or `packages/adapters/*` and never import domain, db or API code.

### 3.1 ExecutionEngine

```ts
interface ExecutionEngine {
  manifest: EngineManifest;
  health(ctx: EngineContext): Promise<EngineHealth>;
  prepare(ctx: EngineContext): Promise<void>;
  run(input: EngineRunInput, ctx: EngineContext): Promise<EngineResult>;
  cancel(runRef: string): Promise<CancelOutcome>;
  dispose(runRef: string): Promise<void>;
}
```

```ts
interface EngineManifest {
  id: string;
  apiVersion: 1;                     // contract version this module speaks
  displayName: string;
  version: string;                   // module version
  workKind: "coding" | "research" | "browser" | "generic";
  capabilities: CapabilityId[];      // from contracts; still policy-checked
  transports: ("http" | "stdio" | "cli" | "sdk")[];
  configSchema: ZodType;
  resultSchema: ZodType;
  streaming: boolean;
  cancellable: boolean;
  concurrency: { perWorkspace: number; global: number };
  requires?: { binary?: string; env?: string[]; image?: string; versionRange?: string };
}
```

```ts
interface EngineContext {
  runId: string;
  workspace: WorkspaceHandle;        // confined to the mounted project root
  signal: AbortSignal;
  deadline: number;
  emit(event: EngineEvent): void;    // sandbox-local observability
  gateway: {
    request<T>(req: BoundaryRequest): Promise<GatewayOutcome<T>>;
  };
  logger: Logger;                    // bound to runId, redacted
}

interface BoundaryRequest {
  capability: CapabilityId;          // e.g. git.push, net.fetch, deploy.staging
  resource: string;                  // branch, domain, environment
  input: unknown;                    // validated against the tool schema
  reason: string;                    // shown in the approval
}

type GatewayOutcome<T> =
  | { decision: "allow"; result: T; auditId: string }
  | { decision: "deny"; code: string; reason: string; ruleId: string; auditId: string }
  | { decision: "approval_pending"; approvalId: string; expiresAt: string; auditId: string }
  | { decision: "clarify"; question: string; options?: string[] };

interface WorkspaceHandle {
  root: string;
  realpath: string;
  assertInside(path: string): string;   // throws on escape/symlink escape
}

type SkillRef = { id: string; version: string };
type ArtifactRef = { id: string; kind: string; name: string };
```

**Guarantees given to an engine:** a confined writable workspace, normalized event emission, a gateway bridge for boundary effects, an abort signal, and a deadline.

**Guarantees withheld:** raw secrets, database access, policy evaluation, host filesystem, other projects, direct network egress, and the ability to self-approve.

### 3.1.1 Run input, result and health

```ts
interface EngineRunInput {
  taskId: string;
  runId: string;
  objective: string;
  successCriteria: string[];
  workspace: { projectId: string; branch: string; baseCommit: string; writablePaths: string[] };
  limits: { deadlineMs: number; maxOutputBytes: number };
  context: { skills: SkillRef[]; artifacts: ArtifactRef[] };
  model: { providerId: string; model: string; temperature?: number };
}

interface EngineResult {
  status: "completed" | "failed" | "cancelled" | "needs_input" | "needs_approval";
  summary: string;
  verification?: {
    status: "verified" | "partial" | "unverified";
    evidence: Array<{ kind: "command" | "test" | "diff" | "url" | "api"; label: string; value: string }>;
  };
  artifacts: ArtifactRef[];
  usage: { inputTokens?: number; outputTokens?: number; costMicroUsd?: number; measured: boolean };
  error?: { code: string; message: string; retryable: boolean };
  nextQuestion?: { question: string; options?: string[] };
}

interface EngineHealth {
  status: "healthy" | "degraded" | "unhealthy";
  version?: string;
  latencyMs?: number;
  message?: string;
}

type CancelOutcome = {
  status: "cancelled" | "already_finished" | "not_found";
  externalEffect: "none" | "possible" | "confirmed";
};
```

### 3.1.2 Runner session protocol

The bridge between the core and an engine is deliberately small and transport-agnostic.

| Step | Call | Rule |
|---|---|---|
| Launch | runtime starts container | Mount workspace only; inject `MICRODOTS_RUN_ID` and a one-time bridge token; no secrets |
| Handshake | `POST /v1/runs/:id/prepare` | Validates manifest `apiVersion`, version range, workspace root |
| Heartbeat | `POST /v1/runs/:id/heartbeat` every 10 s | Three missed beats → run `interrupted`; recovery decides requeue or honest failure |
| Boundary | `POST /v1/gateway` | Forwards to policy; may return `approval_pending` |
| Approval | `GET /v1/approvals/:id` long-poll | Engine pauses; decision resumes or denies; never assumed |
| Progress | `POST /v1/runs/:id/events` | Batched, size-capped, normalized |
| Cancel | `POST /v1/runs/:id/cancel` | Engine must stop within 10 s or the container is killed; outcome records external effect |
| Result | `POST /v1/runs/:id/result` | Persisted once; later calls are idempotent |
| Teardown | container exit | Token invalidated; workspace diff captured before cleanup |

Sessions are **not required to be resumable**. The workspace and event log are the durable state; an engine restart re-runs from the base commit or fails honestly. A run that dies never reports `completed`.

### 3.2 Normalized engine events

Engines translate their native stream into a small vocabulary. Anything unknown becomes `engine.raw` with a size cap.

| Event | Payload |
|---|---|
| `engine.started` | engine id, version, model |
| `engine.progress` | message, phase, percent? |
| `plan.updated` | steps[] |
| `engine.tool` | internal engine tool call (observability only; not a policy decision) |
| `tool.requested` / `tool.finished` | **gateway boundary calls only** — tool, capability, decision, duration |
| `file.changed` | path, changeType, additions/deletions |
| `command.started` / `command.finished` | cmd (redacted), exitCode |
| `approval.requested` | approval id, scope, risk |
| `artifact.created` | kind, ref |
| `engine.warning` / `engine.error` | code, message |
| `engine.finished` | summary, usage |

The distinction matters: `engine.tool` describes what happened inside the sandbox; `tool.requested` describes a boundary request the gateway actually evaluated. The UI renders both, but only the latter is an authorization event.

This is what makes engines comparable, swappable and testable.

### 3.3 IntegrationAdapter

```ts
interface IntegrationAdapter {
  manifest: IntegrationManifest;     // id, version, kind, capabilities, configSchema
  health(): Promise<Health>;
  tools(): ToolDefinition<any, any>[];
  dispose(): Promise<void>;
}
```

MCP is one implementation of this contract, CLI another, an official API another. The gateway does not know which is which.

### 3.4 Model provider

We use the AI SDK provider interface as the contract. A provider module supplies: model listing, chat/stream, tool calling, structured output, token usage. Workers can bind to different models and providers; the orchestrator uses its own binding. No prompt may embed provider-specific quirks outside `packages/ai`.

### 3.5 Storage, secrets, notifications

```ts
interface ArtifactStore {
  put(stream: Readable, meta: ArtifactMeta): Promise<ArtifactRef>;
  get(ref: ArtifactRef): Promise<Readable>;
  delete(ref: ArtifactRef): Promise<void>;
  stat(ref: ArtifactRef): Promise<ArtifactMeta>;
}

interface SecretStore {
  put(name: string, value: string, scope: SecretScope): Promise<SecretRef>;
  get(ref: SecretRef): Promise<string>;       // backend only, never client
  revoke(ref: SecretRef): Promise<void>;
}

interface NotificationChannel {
  id: string;
  supports: NotificationKind[];
  send(n: Notification, to: ChannelTarget): Promise<DeliveryResult>;
}
```

Notification delivery failure must never lose the underlying state (`NTF-003`). Channels are best-effort; the inbox is the source of truth.

### 3.6 UI result cards

The model may select a card id and supply data. It may not supply code.

```ts
interface UICardDefinition<T> {
  id: string;
  schema: ZodType<T>;
  render: ComponentType<{ data: T; actions: AllowedAction[] }>;
  maxBytes: number;
}
```

Validation happens server-side before persistence, and again client-side before render. URLs are scheme-allowlisted (`https`, internal deep links). Actions map to authenticated API intents; a card cannot invoke a tool directly.

---

## 4. Registry and manifests

### 4.1 Registration

Modules are registered at boot from three sources, in order of trust:

1. **Bundled** — compiled into the image, always available, signed by the release.
2. **Configured** — enabled via settings/DB (e.g. an MCP server, an extra engine endpoint).
3. **Local/community** — installed by the user from a directory or package; quarantined until enabled.

Each registration validates the manifest against the contract Zod schema. A module with a mismatched `apiVersion` is listed but **not loaded**, with a clear compatibility message. It never crashes the app.

### 4.2 Engine binding configuration (example)

```yaml
workers:
  coding:
    engines:
      - id: opencode
        strategy: primary
        config:
          model: anthropic/claude-sonnet
          timeoutMs: 1800000
      - id: cline
        strategy: fallback
        config:
          model: openai/gpt-5
    routing:
      fallbackOn: [engine_unhealthy, engine_protocol_error, provider_quota]
      maxAttempts: 2
```

```yaml
projects:
  - id: prj_01...
    name: acme-api
    repo: git@github.com:acme/api.git
    defaultEngine: cline        # per-project override
```

```http
POST /api/v1/tasks
{ "objective": "...", "engine": "opencode" }   # per-task pin (optional)
```

Resolution order: explicit task pin → project default → worker binding strategy → error `engine_missing`.

**Invariant:** resolution happens after policy evaluation. Picking a different engine cannot grant a capability the task did not already have.

### 4.3 Multiple engines at once

Supported from v0.2:

- Different projects on different engines.
- One project with a primary and a fallback.
- Explicit "Run with…" per task.
- Comparison runs (v0.4): the same objective on two engines requires isolated workspace copies and separate runs; it is not a property of a single task row.

The only shared constraint is the workspace lock: one writer per project at a time. Read-only engines (research) are not affected.

---

## 5. Worked example: adding Cline

This is the acceptance test for modularity. If any step requires editing orchestrator, policy or task code, the architecture has failed.

1. `packages/engines/cline/` implements `ExecutionEngine`.
   - `manifest`: capabilities `project.fs.read`, `project.fs.write`, `project.exec`, `project.git.read`; streaming true; cancellable true.
   - `health()`: binary/endpoint check + version.
   - `run()`: spawn headless Cline in the workspace, parse its event stream, map to normalized events, and route boundary requests through `ctx.gateway`.
   - No raw secrets, DB access or direct egress; the runner profile has only the workspace mount and the bridge.
2. Add a runner profile in `deploy/compose.yaml` (or point at a remote endpoint).
3. Register in `packages/engines/index.ts` (bundled) or via settings (external).
4. Add `cline` to the coding worker binding — or let users select it in the UI.
5. Run the contract test suite: health, start, stream, file change, approval, cancel, timeout, provider failure.
6. Update `installer-and-operations.md` engine matrix and the docs page.

**Not touched:** `packages/domain`, `packages/policy`, `apps/server/src/domain/gateway`, task schema, orchestrator prompts, event log format, PWA.

Running OpenCode *and* Cline is the same work plus a second binding. No conditional code in the core.

---

## 6. Dependency enforcement

Modularity decays unless it is mechanical. We enforce it in CI:

- **Import boundaries** (Biome/ESLint `no-restricted-imports` + package `exports`):
  - `packages/engines/*` may import `contracts`, `config` only.
  - `packages/adapters/*` may import `contracts`, `config` only.
  - `packages/domain` and `packages/policy` may not import `fs`, `http`, `db`, or any engine.
  - `apps/web` may not import `db`, `domain` internals or server code.
- **No engine SDK in the core.** A grep test fails CI if `@opencode-ai/*`, `cline`, or similar appears outside its package.
- **Contract tests are mandatory** for every module; a module cannot be enabled without passing them.
- **Manifest validation** runs at boot and in CI; unknown `apiVersion` fails the build of that module only.
- **Bundle check:** a module cannot add > 150 KB gzip to the web bundle.

---

## 7. Versioning and compatibility

| Layer | Versioned by | Policy |
|---|---|---|
| Core API | `/api/v1` | Additive within v1; breaking → v2 |
| Module contract | `apiVersion` (integer) | Bump only for breaking changes; old versions supported for one minor |
| Engine binary | per-engine range | Declared in `packages/engines/<id>/compat.ts` |
| Skill format | `skillVersion` | Backward compatible parser |
| UI card schema | `cardVersion` | Additive fields; renderer tolerates unknown |
| Database | migration number | Forward-only, automatic at boot |

A module declares `apiVersion` and its own version. The host exposes `/api/v1/system/modules` with loaded version, health, and compatibility. Incompatible modules are visible and disabled — never silently skipped.

---

## 8. Security model for modules

Modules are code and therefore a supply-chain risk.

| Trust tier | Source | Default state | Review |
|---|---|---|---|
| Bundled | release image | enabled | core review |
| Verified | curated registry (future) | disabled until enabled | signed + reviewed |
| Local | user filesystem | disabled until enabled | user responsibility, warning |
| Untrusted | downloaded at runtime | blocked | not supported in v1 |

Rules:

1. A module **declares** capabilities; the user **grants** them. Declaration is not permission.
2. Every **boundary** capability call goes through the gateway and policy engine; sandbox-local effects are governed by the task's admission scope and the container.
3. Modules run out-of-process where possible (engines in containers, MCP over stdio/HTTP).
4. In-process modules (UI cards, notification channels) get no secrets, no filesystem, no eval.
5. No module can register a capability that shadows a core capability id.
6. Secrets are resolved only inside the gateway/adapter for the duration of one call; never in config, prompts or logs, and never handed to an engine.
7. Disabling a module revokes its credentials and stops new runs; in-flight runs are cancelled or allowed to finish with a recorded decision.
8. Skill content is instructions, never authority (`SKL-004`).

---

## 9. Failure isolation

A bad module must degrade one capability, not the product.

- **Health checks** per module, cached and surfaced in the UI.
- **Circuit breaker** per module id: 5 consecutive failures → open for 60s, half-open probe.
- **Timeouts** at the contract boundary; engines cannot hang a worker slot indefinitely.
- **Bulkheads:** each module family has its own concurrency budget; a slow MCP server cannot starve coding runs.
- **Fallback routing** only on declared transient errors, never on policy denials (a denial is not a reason to try another engine).
- **Kill switch:** `MICRODOTS_DISABLED_MODULES` env for emergency isolation.
- **Crash containment:** engines run in containers; adapter crashes are caught per-call.

---

## 10. Testing modules

Every module family has a shared contract test harness:

```ts
// packages/engines/testkit
runEngineContractTests({
  create: () => new ClineEngine(config),
  fixtures: { repo: "fixture-node-app", failingTest: true },
  expectations: { streaming: true, cancellable: true },
});
```

The harness verifies: manifest validity, health semantics, start/finish, normalized events, file change reporting, approval round-trip, cancellation, timeout, error taxonomy, workspace confinement, secret scoping.

The `fake` engine is the reference implementation and the deterministic test double for runtime tests. Golden event fixtures keep engine adapters honest.

---

## 11. What is *not* a module (and why)

| Not modular | Reason |
|---|---|
| Task state machine | Divergent states break replay, UI and recovery |
| Policy evaluator | One security truth; pluggable policy is a vulnerability |
| Approval semantics | Audit integrity |
| Event ordering | Replay correctness |
| Auth core | Session/CSRF/tenancy consistency |
| Orchestrator loop | Planning contract stability; models are modular, the loop is not |
| Database engine | Migrations and transactions assume one store |

If a future requirement demands one of these as a module, it needs an ADR and a compatibility plan, not a plugin hook.

---

## 12. Module author checklist

- [ ] Manifest validates against the current `apiVersion`.
- [ ] Contract test harness passes.
- [ ] Capabilities declared with correct risk classes.
- [ ] Health check is honest (does not report healthy on a failed handshake).
- [ ] Errors map to the shared taxonomy.
- [ ] Cancellation and timeout implemented (or explicitly declared unsupported).
- [ ] No secrets in logs; scoped secret access only.
- [ ] Workspace confinement verified by a traversal test.
- [ ] Version range declared and tested against the bundled engine.
- [ ] Docs page with configuration, limits and troubleshooting.
- [ ] No core imports; boundary lint passes.
- [ ] Removal test: uninstalling the module leaves the app healthy.

---

## 13. Ecosystem roadmap

| Release | Module capability |
|---|---|
| v0.1 | Registry skeleton; fake + OpenCode engines; MCP contract defined but not exposed |
| v0.2 | Cline engine; MCP adapters; skill bank; engine picker in UI |
| v0.3 | Browser engine; notification channels (ntfy/Discord); S3 artifacts |
| v0.4 | Comparison runs; engine routing UI; third-party adapter SDK |
| v0.5 | Verified module registry with signing; per-module permissions UI |
| v1.0 | Stable module API, deprecation policy, compatibility matrix |

The goal is not a marketplace for its own sake. It is that a user can keep using the engine, model and tools they already trust — and change their mind later without migrating their work.
