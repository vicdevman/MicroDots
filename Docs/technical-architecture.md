# MicroDots — Technical Architecture

**Status:** Proposed — accepted for M0 unless superseded by an ADR
**Audience:** Backend, frontend, infrastructure, AI agents
**Related:** [`data-model.md`](./data-model.md) · [`api-contracts.md`](./api-contracts.md) · [`security-and-auth.md`](./security-and-auth.md) · [`installer-and-operations.md`](./installer-and-operations.md) · [`adr/`](./adr/)

---

## 1. Architectural stance

MicroDots is a **modular monolith plus isolated execution runners**, deployed as a single Docker Compose stack on one VPS.

It is also **engine-agnostic by construction**: every capability that talks to the outside world — coding engines, model providers, integrations, notification channels, artifact storage — is a module behind a small, versioned contract. OpenCode is the first coding engine, not *the* architecture. Cline, Codex CLI, Aider, a custom HTTP agent, or several of them at once are all valid configurations without touching the orchestrator, task system, policy engine or UI.

That is the whole design. Everything below defends it.

What we optimize for, in order:

1. **Correctness of state.** A task must never be silently lost, duplicated or misreported.
2. **Containment.** Workers execute in a box with explicit capabilities; the host is not their playground.
3. **Operational simplicity.** One database, one queue, one proxy, one command.
4. **Debuggability.** One request ID traces from click to worker log.
5. **Modularity at every seam.** Anything that can be swapped (engine, model, tool, store, channel) is a module with a contract, not an `if` statement.
6. **Extensibility without core edits.** Adapters, engines, skills and UI cards are registries, not branches.

What we explicitly refuse:

- Microservices, message buses, service mesh, Kubernetes.
- A second datastore (Redis, Mongo, vector DB) in the MVP.
- Client-owned execution loops.
- Safety implemented in prompts.
- Abstractions for scale we do not have.

---

## 2. System context

```text
                         ┌──────────────────────────────────────────┐
                         │              User (browser / PWA)         │
                         │  desktop · mobile · installed · push      │
                         └───────────────────┬──────────────────────┘
                                             │ HTTPS (Caddy, auto TLS)
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              MicroDots host (VPS)                             │
│                                                                              │
│  ┌──────────────────────────────┐        ┌─────────────────────────────────┐ │
│  │  app  (Fastify, Node 22)     │        │  worker  (same image)           │ │
│  │  · REST /api/v1              │        │  · pg-boss consumers            │ │
│  │  · SSE /api/v1/events        │        │  · orchestrator turns           │ │
│  │  · auth (better-auth)        │        │  · task scheduler               │ │
│  │  · static PWA (built assets) │        │  · engine + adapter host        │ │
│  │  · policy + gateway          │        │  · recovery sweep               │ │
│  └──────────────┬───────────────┘        └───────────────┬─────────────────┘ │
│                 │                                        │                   │
│                 ▼                                        ▼                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL 17  (single source of truth)              │  │
│  │   relational state · task events · audit · pg-boss queue · migrations  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────┐        ┌─────────────────────────────────┐ │
│  │ runner pod                    │        │ caddy (TLS, proxy, headers)     │ │
│  │ · engine containers:          │        │ · automatic certificates        │ │
│  │   opencode / cline / other    │        │ · HTTP/2, compression, limits   │ │
│  │ · non-root, workspace-only    │        └─────────────────────────────────┘ │
│  │ · no docker socket            │                                            │
│  │ · CPU/mem/time caps           │                                            │
│  └──────────────┬───────────────┘                                            │
│                 │ scoped network                                             │
└─────────────────┼────────────────────────────────────────────────────────────┘
                  │
                  ▼
      Model providers · Git remotes · MCP servers · Web (allowlisted)
```

**Process model**

| Process | Image | Responsibility | Scaling |
|---|---|---|---|
| `caddy` | `caddy:2-alpine` | TLS, reverse proxy, security headers, compression | 1 |
| `app` | `microdots/app` | HTTP API, auth, SSE, static PWA, policy evaluation, task creation | 1 (stateless; could scale later) |
| `worker` | `microdots/app` (`node dist/worker.js`) | Queue consumers, orchestrator runs, adapter execution, recovery | 1 per deployment; internal concurrency |
| `runner` | `microdots/runner` | Isolated execution engines (OpenCode, Cline, …) + workspaces | 1 per engine profile; per-workspace lock |
| `postgres` | `postgres:17-alpine` | State, queue, events | 1 |

`app` and `worker` share one codebase and one image. This is intentional: the domain layer, policy engine and schemas must not drift between the process that decides and the process that executes.

---

## 3. Technology stack

### 3.1 Chosen stack

| Layer | Choice | Version | Why | Cost |
|---|---|---|---|---|
| Language | TypeScript (strict) | 5.x | One language across stack; shared contracts | Free |
| Runtime | Node.js LTS | 22 | Stable, native fetch/WebCrypto, wide support | Free |
| Package manager | pnpm workspaces | 12.x | Fast, strict, good monorepo ergonomics | Free |
| API framework | Fastify | 5.x | Schema-first, fast, first-class SSE/streams, plugins | Free |
| Validation | Zod | 4.x | Runtime + types; shared with client | Free |
| ORM / migrations | Drizzle ORM + drizzle-kit | latest | SQL-first, typed, no runtime magic, good migrations | Free |
| Database | PostgreSQL | 17 | Relational truth, JSONB, full-text, advisory locks, one store | Free |
| Queue | pg-boss | 10.x | Durable jobs in Postgres; no Redis; retries, backoff, singletons | Free |
| Auth | better-auth | latest | Sessions, passkeys, TOTP, orgs; self-hosted, no vendor | Free |
| AI orchestration | Vercel AI SDK (`ai`) | v5+ | Provider-agnostic, streaming, tool calls, structured output | Free |
| Frontend | React + Vite | 19 / 7 | Fast SPA, mature ecosystem, PWA tooling | Free |
| Routing / data | React Router + TanStack Query | 7 / 5 | Simple routing; server-state caching and invalidation | Free |
| Styling | Tailwind CSS + shadcn/ui (Radix) | 4 / latest | Tokens, accessible primitives, no lock-in | Free |
| PWA | vite-plugin-pwa + Workbox | latest | Manifest, precache, offline shell, push | Free |
| Realtime | Server-Sent Events (native) | — | One-way server→client is the requirement; simpler than WS; HTTP-friendly | Free |
| Browser automation | Playwright (Chromium) | latest | Best-in-class, isolation, tracing | Free |
| Coding engine | **Pluggable engines**: OpenCode (first), Cline, Codex CLI, Aider, custom | per-engine | Engine is replaceable and multiple can coexist; MicroDots owns task, workspace, policy and result | Free |
| Reverse proxy | Caddy | 2.x | Automatic TLS, tiny config, single binary | Free |
| Containers | Docker Engine + Compose v2 | 27+ | Universal VPS support | Free |
| Logging | pino | 9.x | Structured JSON, redaction, fast | Free |
| Testing | Vitest, Playwright Test, Testcontainers | latest | Unit, e2e, real Postgres | Free |
| Lint/format | Biome | 2.x | One fast tool; fewer configs | Free |
| Push | web-push (VAPID) | latest | Standards-based, no vendor | Free |
| Icons | lucide-react | latest | Consistent, tree-shakeable | Free |
| Charts (later) | Recharts | latest | Simple, adequate | Free |
| Release | Changesets + GHCR | latest | Semver, changelogs, multi-arch images | Free |

**No required paid service exists in this stack.** Model inference is the only unavoidable external cost, and it is user-supplied and provider-agnostic.

### 3.2 Rejected alternatives (and why)

| Rejected | Reason |
|---|---|
| Next.js | SSR is unnecessary for an authenticated SPA; adds server/client boundary complexity and deployment coupling. Vite is simpler and faster. |
| NestJS | Decorator-heavy, more ceremony than a modular Fastify app needs. |
| Prisma | Migration ergonomics and generated-client weight; Drizzle gives SQL control and shared types. |
| Redis + BullMQ | A second stateful service for a single-VPS product. pg-boss meets durability requirements. |
| WebSockets | Bidirectional not needed for v1; SSE reconnects and proxy behavior are simpler. Live browser view may add a WS channel later, scoped to that feature. |
| MongoDB | Relational task/approval/audit semantics are the core of the product. |
| LangChain / graph frameworks | Opaque control flow, hard to test, easy to over-abstract. We need explicit state machines and a small orchestration loop. |
| Kubernetes | Operationally hostile to the target user. |
| Electron/Tauri desktop | PWA first per PRD; no native shell needed. |
| tRPC | Couples client and server; we want a versioned, documented HTTP API for future mobile clients. |

Versions are pinned in `package.json` / `pnpm-lock.yaml`. Major upgrades require an ADR.

---

## 4. Repository layout

```text
microdots/
├─ apps/
│  ├─ server/                  # Fastify API + worker entrypoints
│  │  ├─ src/
│  │  │  ├─ api/               # routes, plugins, serializers
│  │  │  ├─ auth/              # better-auth config, setup-token, guards
│  │  │  ├─ domain/            # tasks, approvals, policy orchestration (pure)
│  │  │  ├─ runtime/           # queue consumers, scheduler, recovery, module registry
│  │  │  ├─ infra/             # db, queue, secrets, storage, mail, push
│  │  │  ├─ http/              # server bootstrap, plugins, error mapping
│  │  │  ├─ worker.ts          # worker process entry
│  │  │  └─ index.ts           # api process entry
│  │  └─ test/
│  └─ web/                     # React PWA
│     ├─ src/
│     │  ├─ app/               # router, providers, layout
│     │  ├─ routes/            # screens
│     │  ├─ features/          # chat, tasks, approvals, workers, projects…
│     │  ├─ components/        # app-level composites
│     │  ├─ lib/               # api client, sse, query keys, formatting
│     │  └─ styles/            # tokens, globals
│     └─ public/
├─ packages/
│  ├─ contracts/               # zod schemas, DTOs, event types, UI component schema
│  ├─ domain/                  # pure domain logic shared by api/worker (no I/O)
│  ├─ db/                      # drizzle schema, migrations, repositories
│  ├─ policy/                  # capability model, rule evaluation, tests
│  ├─ engines/                 # engine contract, registry, concrete engines
│  ├─ adapters/                # integration contracts + MCP/CLI/browser adapters
│  ├─ ai/                      # model providers, prompts, planner, summarizer
│  ├─ ui/                      # design system (web now, RN tokens later)
│  └─ config/                  # env schema, constants, feature flags, compat ranges
├─ deploy/
│  ├─ compose.yaml
│  ├─ compose.dev.yaml
│  ├─ caddy/Caddyfile
│  ├─ docker/                  # Dockerfiles (app, runner)
│  ├─ install.sh
│  └─ scripts/                 # backup, restore, upgrade, doctor, uninstall
├─ skills/                     # bundled skill bank (markdown + manifests)
├─ tests/e2e/                  # cross-process Playwright tests
├─ Docs/                       # this documentation set
├─ AGENTS.md
├─ README.md
└─ CONTRIBUTING.md
```

**Dependency rule (enforced by lint):**

```
apps/*  →  packages/*  →  (nothing)
packages/domain  →  contracts, policy
packages/db      →  contracts
packages/engines →  contracts, config        (never domain, db, policy or api)
packages/adapters→  contracts, config
apps/server      →  all packages
apps/web         →  contracts, ui  (never db or domain internals)
```

A package must not import from an app. `domain` and `policy` must not import I/O (no `fs`, no `fetch`, no db client). This is what makes them testable and portable.

---

## 5. Module responsibilities

### 5.1 API layer (`apps/server/src/api`)

- HTTP surface only: parse, validate (Zod), authorize, call domain, serialize.
- No business logic. No direct SQL. No adapter calls.
- One error mapper produces the standard envelope.
- SSE endpoint lives here but reads from the event store.

### 5.2 Domain (`packages/domain`)

Pure functions and types for:

- Task state machine and transition guards.
- Worker run lifecycle.
- Orchestration planning (plan validation, dependency graph, cycle detection).
- Approval scope and expiry rules.
- Risk classification inputs.
- Event construction (typed factories).

No network, no filesystem, no clock injection except an explicit `now` parameter. Deterministic and unit-testable.

### 5.3 Policy (`packages/policy`)

- Capability registry and parsing (`resource.action[:qualifier]`).
- Rule evaluation with deterministic precedence.
- Mode defaults and risk matrix.
- Explanation output (matched rule ID, reason, required approval scope).
- Zero I/O. Evaluated identically in API and worker.

### 5.4 Execution gateway (`apps/server/src/domain/gateway`)

The only path from a proposal to an effect:

```text
proposal (worker, task, capability, input)
   → schema validation
   → authority check (worker is assigned to task, task is running)
   → policy evaluate (pure)
   → decision:
       allow    → adapter.execute()
       approve  → create approval, suspend run, event
       deny     → throw PolicyDenied, audit
       clarify  → suspend, ask user
   → audit record (always, including denials)
   → structured result
```

Adapters never receive a database handle or the policy engine. They receive a validated input and an `AbortSignal`.

### 5.5 Runtime (`apps/server/src/runtime`)

- **Scheduler:** finds `queued` tasks with satisfied dependencies and free capacity, enqueues runs.
- **Consumers:** pg-boss handlers for `task.run`, `task.resume`, `task.reconcile`, `notification.send`, `maintenance.sweep`.
- **Recovery sweeper:** on boot and every 60s, detects stale heartbeats, requeues or fails honestly.
- **Capacity:** enforces concurrency from config and live resource signals.
- **Budget guard:** checks token/cost before each model call, halts on breach.

### 5.6 Engines and adapters (`packages/engines`, `packages/adapters`)

Two module families, one gateway:

- **Engines** perform work in a workspace (coding, research, browser, custom).
- **Adapters** connect to external systems (MCP servers, CLIs, APIs, notification channels, storage).

Both implement versioned contracts (see §8, §9) and are resolved from a registry in `apps/server/src/runtime`, never imported directly by domain code.

| Module | Family | Status | Purpose |
|---|---|---|---|
| `fake` | engine | M2 | Deterministic worker for durability testing |
| `opencode` | engine | M5 | Coding (reference engine) |
| `cline` | engine | v0.2 | Alternative coding engine |
| `codex-cli` / `aider` | engine | community/v0.3 | Alternative coding engines |
| `research` | engine | M7 | Web research with citations |
| `browser` | engine | M8 | Playwright automation |
| `mcp` | adapter | M7 | External tool servers |
| `cli` | adapter | M9 | Allowlisted commands |
| `vercel` | adapter | M9 | Deployment reference integration |
| `web-push` / `smtp` | adapter | M6 | Notification channels |

Adapters and engines are registered in a manifest with: id, capabilities, input schemas, health check, version and required configuration.

### 5.7 Frontend (`apps/web`)

- Feature-sliced: `chat`, `tasks`, `approvals`, `workers`, `projects`, `skills`, `settings`, `health`.
- Server state via TanStack Query; realtime events patch the cache and invalidate where needed.
- No business rules in the client. The client never decides permissions or task state.
- Offline: app shell only; task and artifact content are not cached in v1. Writes are not queued (avoids conflicting state).

---

## 6. Core runtime flows

### 6.1 Chat turn → task

```text
POST /api/v1/conversations/:id/messages
  ├─ persist user message (idempotency key)
  ├─ enqueue orchestrator.turn
  └─ 202 { messageId, turnId }             (never blocks on the model)

worker: orchestrator.turn
  ├─ load bounded context (last N messages + open tasks summary)
  ├─ model call (streamed)
  ├─ structured output: { reply, plan? , clarifications? }
  ├─ if plan: validate → create tasks + deps + runs (one DB transaction)
  ├─ persist assistant message + task links
  └─ emit events → SSE
```

Why queue the turn: the HTTP request must return promptly (`§24.3`), retries must be possible, and a dropped connection must not lose the turn.

### 6.2 Task execution

```text
scheduler tick
  ├─ select queued tasks: deps complete, capacity available, budget ok
  ├─ create worker_run (attempt N), set task running
  └─ enqueue task.run { runId }  (singleton per run, idempotency key = runId)

consumer task.run
  ├─ load task + scope + worker + project + grants
  ├─ build context bundle (no raw secrets)
  ├─ engine.run(input, { signal, emit, gateway })     (engine resolved after policy)
  ├─ on boundary call → gateway → policy/approval → adapter
  ├─ on approval needed → status waiting_approval, persist, release job
  └─ on finish → validate result → write artifacts → verified status → event
```

Long tasks do not hold a database transaction open. Progress is committed in small writes.

### 6.3 Approval → resume

```text
worker proposes capability C on resource R
  → policy: require approval (scope S, expires T)
  → approval row { taskId, runId, capability, resource, scope, risk, expiresAt }
  → task waiting_approval, run suspended, event emitted
user approves (authenticated POST)
  → validate still pending + not expired + user authorized
  → approval decided (single-use), audit
  → enqueue task.resume { runId, approvalId }
  → gateway re-evaluates policy and checks approval matches scope exactly
  → adapter proceeds
```

An approval is a **grant for one exact operation**, not a mode switch. Re-evaluation on resume prevents replay and scope drift.

### 6.4 SSE and replay

```text
GET /api/v1/events?scope=task:<id>&after=<seq>
  → auth
  → replay task_event where seq > after (batched internally)
  → LISTEN microdots_events for new rows
  → fetch by global_seq, re-check access, fan out
  → heartbeat every 15s (comment frame)
  → on disconnect, client reconnects with Last-Event-ID
```

Cross-process delivery is **not** an in-process bus: the worker runs in a different container. The writer commits the event row, then issues `pg_notify('microdots_events', { taskId, globalSeq })` in the same transaction. The API holds one dedicated listener connection, fans out to SSE clients, and re-checks authorization per connection.

If the listener connection drops, the API polls `task_event` by `global_seq` every second until caught up, then re-subscribes. Notifications carry **IDs only** (Postgres payload limit); the row is always read from the table, so a missed notification is recoverable and replay remains authoritative.

`seq` is per-task, monotonic, assigned inside the same transaction as the event insert. Clients never rely on wall-clock ordering.

**Connection limit:** five concurrent streams per user. The global activity stream has priority. A sixth request returns `429 TOO_MANY_STREAMS`; the client closes the least-recently-used task stream and retries. The connection chip shows when a stream was closed for capacity.

### 6.5 Restart and recovery

On boot:

1. Acquire a Postgres advisory lock (`microdots:migrate`) and run pending migrations.
2. Start pg-boss; jobs with expired leases become available automatically.
3. Sweeper marks runs with heartbeat older than `2 × interval` as `interrupted`.
4. For each interrupted run: if idempotent and resumable → requeue with attempt+1; else → task `blocked` with a recovery approval if the external effect is uncertain.
5. Emit `task.recovered` / `task.recovery_failed` events.
6. Never mark a task `completed` on recovery without verified evidence.

### 6.6 Cancellation

- API sets `cancel_requested_at`, emits `task.cancel_requested`.
- Worker checks the flag at step boundaries and aborts the adapter via `AbortSignal`.
- Adapter must report whether the external operation stopped, completed, or is unknown.
- Task ends `cancelled` only with a recorded outcome. Uncertain external effects become `blocked` with a reconciliation note.

---

## 7. Concurrency and resource model

| Resource | Default | Config |
|---|---|---|
| Worker process concurrency | 2 | `MICRODOTS_WORKER_CONCURRENCY` |
| Coding runs per workspace | 1 (mutex) | fixed |
| Browser contexts | 1 | `MICRODOTS_BROWSER_CONCURRENCY` |
| Orchestrator turns | 2 | internal |
| Runner memory | 2 GB | `MICRODOTS_RUNNER_MEMORY` |
| Runner CPUs | 1.5 | `MICRODOTS_RUNNER_CPUS` |
| Task timeout | 30 min | per task / `MICRODOTS_TASK_TIMEOUT_MS` |
| Task model budget | $2 | per task / settings |
| SSE connections per user | 5 | fixed |

Backpressure rules:

- When queue depth > 50 or free memory < 400 MB, the scheduler stops dequeuing and the UI shows "queued — server busy".
- Priority: user-initiated > retries > maintenance.
- One workspace, one writer. Parallel tasks on the same repo are serialized by a DB advisory lock keyed on `projectId`.

---

## 8. Pluggable execution engines

### 8.1 Principle

MicroDots executes work through **engines**. An engine is any external agent runtime that takes a scoped task plus a workspace and produces changes, events and results. Engines are modules: zero, one or many can be installed, and the core never imports an engine SDK. It only knows the `ExecutionEngine` contract.

The critical inversion: **MicroDots owns the workspace, task, policy, artifacts and truth. The engine is a replaceable worker process.** Remove every engine and the product still runs; coding tasks become unavailable with a clear remediation. Add a second engine and nothing else changes.

This is deliberate. Coding agents are the fastest-moving layer in this stack. Coupling the product to one would make the product a wrapper and make every upstream change a rewrite.

### 8.1.1 The sandbox boundary

A coding engine must edit files and run commands. Requiring a gateway round-trip for every file write would be slow, brittle, and impossible to enforce uniformly across engines. Authority is therefore split by whether an effect stays inside the task sandbox:

| Class | Examples | Authorized by | Enforced by |
|---|---|---|---|
| **Sandbox-local** | read/write workspace files, run build/test commands, create a local branch | Task admission: `project.fs.read/write` and `project.exec` grants + operating mode | Container mount, non-root user, read-only rootfs, no network, no host mounts, CPU/memory/time limits; diff and command log captured |
| **Boundary-crossing** | git push/fetch, network egress, secret injection, deploy, external APIs, host actions | Every call through the gateway; approval when risk/mode requires | Runner has no route or credential to perform it directly; only the task capability bridge can |

The engine gets no ambient authority beyond the workspace. It cannot push because it has no credential and no egress; it must call `ctx.gateway.request(...)`. That makes "all boundary-crossing effects pass through the gateway" an enforceable property rather than a convention.

Inside the sandbox the engine has **delegated, bounded authority**, and the diff makes it reviewable. The product accepts that a coding agent may write any file inside the workspace it was granted. That is why the workspace is isolated, the task scope is explicit, and the resulting diff is evidence rather than a surprise.

A command that genuinely needs the network (`project.exec.network`) is a boundary call: the gateway authorizes it, the runtime starts a one-shot network-enabled sandbox attached to an egress proxy with a per-command allowlist, and the long-lived engine sandbox stays network-off. See `security-and-auth.md` §8.3.

### 8.2 Engine contract

```ts
interface ExecutionEngine {
  manifest: EngineManifest;
  health(ctx: EngineContext): Promise<EngineHealth>;
  prepare(ctx: EngineContext): Promise<void>;          // session/workspace handshake
  run(input: EngineRunInput, ctx: EngineContext): Promise<EngineResult>;
  cancel(runRef: string): Promise<CancelOutcome>;
  dispose(runRef: string): Promise<void>;
}

interface EngineManifest {
  id: string;                        // "opencode" | "cline" | "codex-cli" | custom
  apiVersion: 1;                     // module contract version
  displayName: string;
  version: string;
  workKind: "coding" | "research" | "browser" | "generic";
  capabilities: CapabilityId[];      // declared, still policy-checked
  transports: ("http" | "stdio" | "cli" | "sdk")[];
  configSchema: ZodType;             // per-engine settings, validated at boot
  resultSchema: ZodType;
  streaming: boolean;                // false → coarse progress + hard timeout
  cancellable: boolean;
  concurrency: { perWorkspace: number; global: number };
  requires?: { binary?: string; env?: string[]; image?: string; versionRange?: string };
  docsUrl?: string;
}

interface EngineContext {
  runId: string;
  workspace: WorkspaceHandle;        // confined to the mounted project root
  emit(event: EngineEvent): void;    // normalized, sandbox-local observability
  gateway: {
    request<T>(req: BoundaryRequest): Promise<GatewayOutcome<T>>;
  };
  signal: AbortSignal;
  deadline: number;
  logger: Logger;                    // bound to runId, redacted
}
```

`EngineContext` provides exactly: a confined workspace handle, normalized event emission, a gateway bridge for boundary crossings, an abort signal, a deadline, and a run-scoped logger.

It never provides raw secrets, the database, the policy engine, the host filesystem, another project's workspace, or direct network egress.

A `BoundaryRequest` carries `capability`, `resource`, validated `input`, and a human-readable `reason`. The gateway returns `allow` (with the result), `deny` (with rule + explanation), `approval_pending` (with approval id and expiry), or `clarify` (with one question). The engine waits; it cannot self-approve.

### 8.3 Registry, binding and routing

- `engines` stores installed engine instances: type, version, endpoint, enabled state, health, capacity.
- `engine_bindings` binds a **worker role** (not a task) to one or more engines:

| Strategy | Behavior | Use case |
|---|---|---|
| `primary` | Use this engine; optional fallback if unhealthy | Default |
| `fallback` | Ordered list, advance on health/transient failure | Resilience |
| `least_busy` | Pick the engine with free capacity | Two equivalent engines |
| `round_robin` | Distribute evenly | Load spreading |
| `pinned` | Task explicitly selects an engine | "Run with Cline" in UI |

- The orchestrator selects a **worker role** (e.g. `coding`). Engine resolution happens in the runtime **after** policy evaluation, so engine choice can never expand permissions.
- Multiple engines can run concurrently on different tasks. A single workspace still has one writer, enforced by a Postgres advisory lock on `projectId`.
- Comparison runs (same objective, two engines, diff results) are a v0.4 design item. They require isolated workspace copies and separate runs; v1 does not claim schema support for them.

### 8.4 What engines never own

Task state and transitions · permission decisions · approval records · the audit trail · artifact storage · raw credentials or secret values · the user-facing narrative.

That boundary is the reason swapping OpenCode for Cline is a config change plus a thin engine module, not a product rewrite.

### 8.5 First engine: OpenCode

- **Transport:** `opencode serve` HTTP on the internal network, per-session token.
- **Workspace:** MicroDots clones and branches; OpenCode edits; MicroDots captures the diff, changed files, commands and test output.
- **Compatibility:** declared in `packages/engines/opencode/compat.ts` (a range, never a hard-coded version in the installer).
- **Events:** internal work is normalized to `engine.progress`, `file.changed` and `command.finished`; boundary calls additionally emit `tool.requested`/`tool.finished` from the gateway, after the policy decision.
- **Failure mapping:** generic taxonomy in §8.8, with engine-specific diagnostics attached.

OpenCode is first because it has a supported headless server, strong coding ability and an active upstream. It is **not** a product dependency.

### 8.6 Other supported engine shapes

| Engine | Transport | Integration notes |
|---|---|---|
| **Cline** | SDK / headless CLI where available | Map its task stream to normalized events; same workspace contract; capabilities declared per version |
| **Codex CLI** | CLI, JSON/stdio | Non-interactive invocation only; arguments constructed by the adapter, never by the model |
| **Aider** | CLI | Prompt piped in, diff parsed out; good for narrow edits; weak long-horizon planning |
| **Custom / internal** | HTTP stream or webhook | Anyone can implement the manifest; useful for teams with an in-house agent |
| **Fake** | in-process | Deterministic, used in tests and demos |

An engine that cannot stream or cancel still works in **degraded mode** — coarse progress, hard timeout, no mid-run approval granularity. That is declared in its manifest and shown in the UI, not hidden.

### 8.7 Version and health policy

- Each engine has its own supported range, stored in config/code, never baked into the installer.
- The installer treats every engine as **optional and independent**. Installing or removing one cannot break another.
- Startup performs a health handshake per enabled engine and records version + status in `system_state`.
- The UI shows engine-by-engine health, with the exact remediation for each failure.
- An engine upgrade never changes task history or approval records.

### 8.8 Failure taxonomy (engine-neutral)

| Symptom | Code | User-facing remedy |
|---|---|---|
| No engine installed for this role | `engine_missing` | Install a coding engine (OpenCode/Cline/…) |
| Version outside supported range | `engine_incompatible` | Safe upgrade path, preserving config |
| Process up, handshake fails | `engine_unhealthy` | Restart engine, view logs |
| Protocol/stream parse failure | `engine_protocol_error` | Report; adapter may retry once |
| Provider 401/403 | `provider_auth` | Fix model credentials — **not** an engine fault |
| Provider quota/rate limit | `provider_quota` | Wait, change model/provider |
| Tool denied by policy | `policy_denied` | Adjust grant or approve |
| Attempt to exceed workspace or network rights | `sandbox_denied` | Report; never retry around the sandbox |
| Workspace missing/locked | `workspace_error` | Reattach project or wait for lock |
| Deadline exceeded | `task_timeout` | Extend limit or split task |

This distinction is required by `OPC-010` and `AC-009`, and applies identically to every future engine. A missing binary must never be reported as an auth failure.

---

## 9. Module, engine, adapter and tool contracts

Every seam in the system has a contract. There are five module families:

| Family | Contract | Examples | Swappable at |
|---|---|---|---|
| Execution engine | `ExecutionEngine` | OpenCode, Cline, Aider, custom | Runtime, per worker binding |
| Integration adapter | `IntegrationAdapter` | MCP, CLI, Vercel, GitHub, SMTP | Runtime, per integration |
| Model provider | AI SDK provider interface | OpenAI, Anthropic, Google, Ollama, OpenRouter | Runtime, per worker/model |
| Storage adapter | `ArtifactStore` / `SecretStore` | local disk, S3-compatible; file key, KMS | Restart/config |
| Notification channel | `NotificationChannel` | in-app, web push, email, (native later) | Runtime, per event type |

An engine, adapter or provider is **never imported by domain code**. It is registered, health-checked, and resolved by id through the registry. Removing a module removes a capability; it does not break the build.

Every capability exposed to a worker is a **tool** with metadata:

```ts
interface ToolDefinition<I, O> {
  id: string;                    // "project.fs.write"
  capability: Capability;        // policy-checked
  description: string;
  input: ZodType<I>;
  output: ZodType<O>;
  risk: RiskClass;               // R0..R4
  idempotent: boolean;
  timeoutMs: number;
  execute(input: I, ctx: ExecContext): Promise<O>;
}
```

Rules:

- A tool cannot be invoked except through the gateway.
- Unknown capability → deny (default deny).
- `risk` and `idempotent` are declared by the adapter and verified in tests; they are inputs to policy, not decisions.
- Outputs are validated before persistence.
- Tool descriptions are shown to the model but are **not** authority.

---

## 10. Adding a new capability (the extension path)

### New execution engine

1. Implement `ExecutionEngine` in `packages/engines/<id>`: manifest, health, run, cancel.
2. Map the engine's native events to normalized events (`engine.progress`, `file.changed`, `command.finished`).
3. Declare capabilities and the supported version range in the manifest.
4. Add a container/profile in `deploy/` if the engine needs its own runtime.
5. Register it; add it to `engine_bindings` for the relevant worker role.
6. Add contract tests against the shared engine test harness (health, streaming, cancel, timeout, error mapping).
7. Update the installer matrix and the UI engine picker.

No orchestrator, policy, task or UI-core changes. That is the acceptance test for this architecture: **adding Cline must not touch OpenCode's code, and running both must not touch the core.**

### New worker type

1. Define capabilities and risk classes in `packages/policy`.
2. Implement the worker as one or more engines/adapters behind the registry.
3. Add a seeded worker definition plus default grants (deny-by-default).
4. Write contract tests against the fake harness.
5. Add a task result card (validated UI schema) if output is structured.
6. Update docs: data model (if new entities), API (if new endpoints), skills bank.

No orchestrator changes. No new tables required unless the worker has domain-specific state.

### New tool/integration

1. Declare `ToolDefinition` with schema and risk.
2. Implement execution behind an adapter (MCP/CLI/API/browser).
3. Map to capabilities; add policy tests.
4. Add health check and error mapping.
5. Surface in the integration catalog.

### New skill

See [`skills-system.md`](./skills-system.md). Skills contain instructions and requirements only; they never add capabilities.

### New UI card

1. Add a Zod schema to `packages/contracts/ui`.
2. Add a renderer to the web registry.
3. Add to the allowlist the model may select.
4. Test with malicious/oversized payloads.

---

## 11. Configuration

All configuration is environment-based, validated at boot by `packages/config` (Zod). Invalid config fails fast with a readable message, never a stack trace.

| Variable | Default | Notes |
|---|---|---|
| `MICRODOTS_ENV` | `production` | `development` \| `test` \| `production` |
| `MICRODOTS_URL` | — | Public origin; used for cookies, push, links |
| `DATABASE_URL` | — | Postgres connection |
| `MICRODOTS_MASTER_KEY_FILE` | `/data/secrets/master.key` | 32-byte key for secret encryption |
| `MICRODOTS_SESSION_SECRET` | generated | better-auth signing |
| `MICRODOTS_SETUP_TOKEN_FILE` | `/data/secrets/setup-token` | First-run claim |
| `MICRODOTS_WORKSPACE_ROOT` | `/workspaces` | Project checkouts |
| `MICRODOTS_ARTIFACT_ROOT` | `/data/artifacts` | Content-addressed artifacts |
| `MICRODOTS_WORKER_CONCURRENCY` | `2` | |
| `MICRODOTS_TASK_TIMEOUT_MS` | `1800000` | |
| `MICRODOTS_DEFAULT_MODE` | `balanced` | |
| `MICRODOTS_VAPID_PUBLIC_KEY` / `_PRIVATE_KEY` | generated | Web push |
| `MICRODOTS_LOG_LEVEL` | `info` | |
| `MICRODOTS_TELEMETRY` | `off` | Never on by default |

Secrets are never exposed through `/api` and never logged. See `security-and-auth.md` §7. Engine endpoints and tokens are **not** core environment variables; they live in the engine registration record (encrypted at rest) and are injected into that engine's runner session.

---

## 12. Observability

- **Logs:** pino JSON, one line per event, fields `requestId`, `userId`, `taskId`, `runId`, `workerDefinitionId`, `capability`, `decision`, `durationMs`. Redaction list plus a regex scrubber for keys/tokens.
- **Health:**
  - `GET /healthz` — process alive (no dependencies).
  - `GET /readyz` — DB reachable, queue responsive, migrations applied.
  - `GET /api/v1/system/health` — rich, authenticated: DB, queue depth, workers, provider, OpenCode, disk, memory, version.
- **Audit:** append-only `audit_log` for every policy decision, approval, credential use, config change, login, permission change.
- **Metrics:** counters and histograms exposed at `/metrics` behind auth (Prometheus format) from v0.2; in-app charts later.
- **Tracing:** request ID propagates API → queue job → adapter; OpenTelemetry optional later, never required.

---

## 13. Performance targets

| Path | Target |
|---|---|
| API p95 (non-AI) | < 150 ms |
| Task submit → 202 | < 300 ms |
| Event delivery (API fan-out) | < 500 ms |
| SSE replay of 10k events | < 2 s |
| Task list first paint (cached) | < 1 s |
| PWA cold load on 4G | < 3 s, Lighthouse ≥ 90 |
| Recovery sweep detection | < 60 s |
| Memory (app + worker idle) | < 400 MB combined |
| Disk per install (no workspaces) | < 1.5 GB |

Budgets are checked in CI where measurable (bundle size, build time) and in the M6 performance pass.

---

## 14. Scaling path (without rewriting)

| Stage | Change | Trigger |
|---|---|---|
| 1 VPS (default) | nothing | — |
| Bigger VPS | raise concurrency, runner limits | queue wait > 5 min regularly |
| Separate worker host | move `worker` + `runner`, same DB | CPU saturation on app host |
| Managed Postgres | swap `DATABASE_URL`, disable bundled db | durability/compliance needs |
| Object storage | artifact adapter → S3-compatible | artifacts > 20 GB |
| Multiple app replicas | stateless API behind Caddy; SSE via DB polling fallback | > 50 concurrent users |
| Hosted relay | outbound tunnel for push/remote access | users behind CGNAT |

Each step is an adapter or config change, not an architecture change. That is the test of the design.

---

## 15. Architecture invariants

These must remain true in every PR:

1. The backend owns authoritative task state.
2. Every effect that crosses the task sandbox passes through the gateway.
3. Policy is evaluated in code, never inferred from model output.
4. `packages/domain` and `packages/policy` are pure and I/O-free.
5. Events are append-only and sequence-ordered per task.
6. Approvals are scoped, single-use, expiring and audited.
7. Workers cannot read the database, host filesystem or other projects.
8. Secrets never reach the client or logs.
9. Closing the client cannot stop server work.
10. A restart cannot silently mark unverified work as complete.
11. Adding an engine, worker, tool, skill or UI card does not modify the orchestrator core — or any other engine.
12. One Postgres is the only required stateful dependency.
13. No engine is required for the product to start; coding capability degrades gracefully and explicitly.
14. Engine selection happens after policy evaluation and cannot change the effective permissions of a task.

If a change violates one of these, it needs an ADR and explicit approval — not a workaround.
