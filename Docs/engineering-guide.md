# MicroDots — Engineering Guide

**Status:** Active conventions (P0 complete; P1 native runtime in progress)
**Audience:** Contributors, maintainers, AI agents
**Related:** [`technical-architecture.md`](./technical-architecture.md) · [`native-execution-and-resources.md`](./native-execution-and-resources.md) · [`data-model.md`](./data-model.md) · [`api-contracts.md`](./api-contracts.md) · [`AGENTS.md`](../AGENTS.md)

> The scaffold and M1A production spine run today. The active work is P1: native systemd/cgroup execution, the narrow helper, limits and verified cleanup. Docker remains an optional dev/reference profile.

---

## 1. First 30 minutes

```bash
git clone https://github.com/<org>/microdots.git
cd microdots
corepack enable
pnpm install
cp .env.example .env.local
pnpm db:up          # docker compose -f compose.dev.yaml up -d postgres
pnpm dev            # api :3000, web :5173, idle worker
```

Open `http://localhost:5173`. Check `GET /healthz` for the process and `GET /readyz` for the database. In development the API starts even when Postgres is down; `/readyz` returns 503 until it is reachable. The native execution runtime is Linux-only; on Windows/macOS the runtime reports `unavailable` and unit/runtime tests run in Linux CI.

| Command | Purpose |
|---|---|
| `pnpm dev` | API + web + worker with watch |
| `pnpm build` | Build all packages and apps |
| `pnpm check` | Lint + format check + typecheck |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:integration` | DB/queue tests (Testcontainers) |
| `pnpm test:e2e` | Playwright against the web dev server |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm docs:check` | Broken links, required docs present |

Node 22.x, pnpm 12.x. `.nvmrc` is authoritative.

---

## 2. Repository layout

```text
apps/
  server/        Fastify API + worker entrypoints
  web/           React PWA
packages/
  contracts/     Zod schemas, DTOs, event types, UI card schemas
  domain/        Pure task/run/plan/approval logic (no I/O)
  policy/        Capability model + evaluator (pure)
  db/            Drizzle schema, migrations, repositories
  engines/       Engine contract + opencode, cline, fake
  adapters/      Integration contracts + mcp, cli, browser, vercel
  avatars/       SVG morph engine + <microdots-bot> web component
  ai/            Provider registry, prompts, planner, summarizer
  ui/            Design system (tokens + components)
  config/        Env schema, constants, compatibility ranges
deploy/native/   systemd units, microdots-exec helper, budget profiles (P1)
deploy/          optional compose, Dockerfiles, install.sh, scripts
skills/          Bundled skill bank
tests/e2e/       Cross-process tests
Docs/            This documentation set
```

The dependency rule is enforced by lint (see architecture §4). If an import requires an exception, the design is probably wrong.

---

## 3. TypeScript conventions

- `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- No `any` in exported types. `unknown` + schema parsing at boundaries.
- Prefer `type` for unions/aliases, `interface` for extendable object contracts.
- Branded IDs: `type TaskId = string & { __brand: 'TaskId' }`. Parse at the edge, trust internally.
- Discriminated unions for states and results; exhaustive `switch` with `never` check.
- No enums in app code; use `as const` maps and derive union types.
- Dates: `Date` in memory, ISO strings at the API boundary, `timestamptz` in SQL. Never `Date.now()` inside domain functions — accept `now`.
- Money: integer micro-USD internally (`cost_micro_usd`, `costMicroUsd`), formatted at the edge. Never floats for billing; user-entered `maxUsd` budgets are converted at the boundary.

### Error handling

| Layer | Style |
|---|---|
| Domain | `Result<T, DomainError>` for expected outcomes; throw only for programmer errors |
| Gateway | Returns a decision object; never throws for deny |
| HTTP | One error mapper; no route-level `try/catch` formatting |
| Worker | Catch at the job boundary; record `error_code` + sanitized `error` |
| Adapters | Map native errors to the shared taxonomy; never leak raw provider text with secrets |

Never swallow an error. If it is expected, log it at `debug`/`info` with context; if unexpected, `error` with `requestId`/`runId`.

### Logging

```ts
logger.info({ taskId, runId, capability, decision, durationMs }, 'policy decision');
```

- Message is a short constant; data goes in fields.
- No string interpolation of user content into the message.
- Redact at the logger level, not at call sites.
- Never log prompts, full file contents, tokens or cookies.

---

## 4. Backend conventions

### 4.1 Routes

```ts
app.post('/api/v1/tasks', {
  schema: { body: CreateTaskInput, response: { 202: TaskSummary } },
  preHandler: [requireUser, rateLimit('tasks:write')],
}, async (req, reply) => {
  const task = await taskService.create(req.user, req.body, { requestId: req.id });
  reply.code(202).send(task);
  // SSE emission happens after commit: INSERT event + pg_notify('microdots_events')
});
```

- Routes are thin. Validation, auth and rate limit are declarative.
- Services receive `userId`, never a session object.
- Responses use DTOs from `contracts`, never DB rows.
- Every mutating route has an idempotency policy documented.

### 4.2 Transactions

- One transaction per state transition (task + event + audit).
- Never hold a transaction across an external call (model, engine, HTTP).
- Use `select … for update` or optimistic `version` checks for contended rows.
- Advisory locks: `project:<id>` for workspace writes, `migrate` for migrations.
- Emit events **after** commit via an outbox table or pg-boss job, never inside the transaction if delivery is external.

### 4.3 IDs and time

- ULID via a single helper (`newId()`); no ad-hoc `crypto.randomUUID()` in domain rows.
- Clock injection for tests; never `new Date()` in pure functions.
- All DB defaults `now()`; application timestamps only where the domain requires a specific moment.

### 4.4 Configuration

- `packages/config` parses `process.env` once at boot with Zod.
- Missing/invalid config fails fast with a readable message and exits non-zero.
- No `process.env` access outside `config`.
- Feature flags are typed and listed in one file; remove them when the feature ships.

---

## 5. Frontend conventions

- Feature folders, not type folders: `features/tasks/{components,hooks,api.ts}`.
- Server state: TanStack Query. No global store for server data.
- UI state: local `useState`, or a small Zustand store for cross-cutting UI (command palette, sidebar).
- Query keys are centralized (`lib/query-keys.ts`) and invalidated by events.
- Never optimistic-update task status; only events change it.
- Forms: React Hook Form + Zod resolver; the same schema as the API where possible.
- Accessibility is part of the component API: labels required, `aria-*` props forwarded.
- No inline hex colors; use semantic tokens.
- Skeleton components must match final layout.
- Bundle budget: initial route ≤ 250 KB gzip; check in CI.

Event integration:

```ts
useTaskEvents(taskId, {
  onEvent: (event) => {
    queryClient.setQueryData(taskKey(taskId), (prev) => applyEvent(prev, event));
  },
  onReset: () => queryClient.invalidateQueries(taskKey(taskId)),
});
```

---

## 6. Testing strategy

### 6.1 Levels

| Level | Tool | Scope | Required for |
|---|---|---|---|
| Unit | Vitest | Pure domain, policy, schemas, formatters | Every change |
| Integration | Vitest + Testcontainers | Repositories, queue, migrations, gateway + fake engine | Backend changes |
| Contract | Vitest harness | Engines/adapters/runtimes against shared spec | Every module |
| Runtime | Linux CI | cgroup limits, stop/kill, logs, usage, cleanup, reconcile | Native runtime changes |
| E2E | Playwright | Setup → task → approval → completion → cleanup → restart | Critical paths |
| Visual | Playwright screenshots | Core screens, light/dark, mobile, avatars | UI changes |

### 6.2 Coverage targets

| Area | Target |
|---|---|
| `packages/policy` | **100% branches** |
| `packages/domain` | ≥ 90% |
| Gateway | ≥ 95% |
| Overall | ≥ 70% |
| E2E | All MVP demo steps |

Coverage is a floor, not a goal. A test that asserts nothing is worse than no test.

### 6.3 What must be tested

- Every task/run/approval transition, including illegal ones.
- Policy allow/deny/approve/clarify across all modes and risk classes.
- Approval scope hash mismatch, expiry, double-consume.
- Idempotency: same key, same body → one task; different body → 409.
- SSE replay: no gaps, no duplicates, reset behavior.
- Restart recovery: stale run → requeue or honest failure.
- Secret redaction in logs/events.
- Path traversal and symlink escape.
- Engine contract: health, stream, cancel, timeout, error mapping.
- Fresh install and upgrade in CI (nightly).

### 6.4 Test data

- Factories in `packages/db/test/factories.ts`; no shared mutable fixtures.
- Each integration test runs in a transaction or a fresh schema.
- The `fake` engine is deterministic and supports scripted scenarios (`succeed`, `fail-twice`, `needs-approval`, `hang`).
- Golden event fixtures live in `packages/engines/testkit/golden/`.

### 6.5 Flakiness policy

A flaky test is a bug. Quarantine with an issue within 24 hours; do not retry-loop in CI. Two quarantines in the same area trigger a design review.

---

## 7. CI/CD

### 7.1 Required checks on every PR

1. `pnpm check` (Biome + typecheck)
2. `pnpm test` (unit)
3. `pnpm test:integration` (Postgres service)
4. `pnpm build`
5. OpenAPI diff (fail on undocumented change)
6. Dependency audit (high/critical fail)
7. Docs link check
8. Secret scan (gitleaks)
9. Bundle size budget

### 7.2 On `main`

- Build multi-arch images, sign/attest, push `sha-<short>`.
- Deploy to a staging VPS; run smoke tests.
- Nightly: fresh install, upgrade from previous minor, backup/restore, arm64.

### 7.3 Release

```bash
pnpm changeset
pnpm version-packages
git push --follow-tags
```

- Changesets produce semver + changelog.
- Tag `vX.Y.Z` triggers image build with that tag + `latest` (stable only).
- Release notes: highlights, breaking changes, upgrade steps, known issues.
- No release without a green fresh-install test and a completed security checklist.

---

## 8. Branching and review

- **Trunk-based.** Short-lived branches (`feat/…`, `fix/…`), squash merge.
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- PRs should be < 400 changed lines where possible; large changes are split.
- Every PR description states: what, why, how verified, risk, docs updated.
- One approving review minimum; two for security-sensitive areas (policy, auth, gateway, migrations, secrets).
- Self-merge is allowed only for docs and trivial fixes after CI.

### Reviewer checklist

- [ ] Authorization enforced server-side, not in the UI.
- [ ] State transition goes through the domain layer.
- [ ] No secrets in logs, events, errors, prompts or bundles.
- [ ] Tests cover failure paths, not only the happy path.
- [ ] Idempotency and retries considered for side effects.
- [ ] Migrations are safe and reversible in the expand/contract sense.
- [ ] API/event changes are additive and documented.
- [ ] UI has empty/loading/error/offline states.
- [ ] Accessibility: labels, focus, keyboard, contrast.
- [ ] Docs updated in the same PR.

---

## 9. Recipes

### Add an API endpoint

1. Schema in `packages/contracts`.
2. Route with schema + guards; call a service.
3. Service uses repositories; no SQL in routes.
4. Emit events via the outbox.
5. Tests: validation, auth, happy path, failure, idempotency.
6. Update `api-contracts.md` and the OpenAPI snapshot.

### Add an event type

1. Add to the controlled vocabulary in `contracts/events.ts` with a payload schema.
2. Emit through the domain helper (assigns `seq` atomically).
3. Render generically in the timeline; add a custom renderer only if needed.
4. Update the event table in `api-contracts.md`.
5. Test replay and client reducer.

### Add a screen

1. Route + nav entry (desktop and mobile).
2. Define empty/loading/error/offline states before the happy path.
3. Use existing primitives; do not fork them.
4. Keyboard and screen-reader pass.
5. Add to the UX spec and screenshot tests if visual testing exists.

### Add an engine

Follow `extensibility-and-modules.md` §5 and `technical-architecture.md` §10. Contract tests are mandatory. No edits to domain/policy/orchestrator.

### Add a worker role

1. Capabilities + risk classes.
2. Seed definition with deny-by-default grants.
3. Engine binding.
4. Result card schema.
5. Docs + tests.

### Add a skill

Follow `skills-system.md`. Skills never grant capabilities and never contain secrets.

---

## 10. Database changes

- Edit the Drizzle schema, then `pnpm db:generate`.
- Review the generated SQL; never hand-edit a migration after it has shipped.
- Expand → backfill → contract for breaking changes:
  1. add nullable column / new table,
  2. deploy code writing both,
  3. backfill in a job,
  4. switch reads,
  5. drop old column in a later release.
- Indexes on large tables use `CREATE INDEX CONCURRENTLY` (outside a transaction).
- Every migration has a one-line comment explaining intent.
- Destructive migrations require a backup note and a release-note entry.

---

## 11. Dependency policy

A new dependency must justify:

1. **Necessity:** can we do this in < 100 lines without it?
2. **Maintenance:** recent releases, responsive maintainers, no unpatched CVEs.
3. **License:** compatible with the project license (see ADR-0009).
4. **Size:** impact on server image and web bundle.
5. **Security:** no postinstall scripts, minimal transitive tree.
6. **Exit:** how hard is it to remove?

Rules:

- Pin exact versions; commit the lockfile.
- No dependency for a single utility function.
- Major upgrades and new core dependencies require an ADR.
- Run `pnpm audit` before release.
- Vendor nothing without a license check.

---

## 12. Performance budgets

| Metric | Budget |
|---|---|
| API p95 (non-AI) | < 150 ms |
| Initial JS (gzip) | < 250 KB |
| Route chunk | < 80 KB |
| Lighthouse mobile performance | ≥ 90 |
| Lighthouse accessibility | 100 |
| Docker image (optional app) | < 400 MB |
| Cold start (app) | < 3 s |
| SSE replay 10k events | < 2 s |
| Idle app + worker memory | < 400 MB combined |
| Heavy execution | within its cgroup profile, never above the MicroDots budget |

Regressions block release. Measure, don't guess.

---

## 13. Documentation discipline

- Docs live with the code and change in the same PR.
- Every env var, endpoint, event, capability and migration is documented.
- Screenshots in docs are generated from the real app, not mockups, once UI exists.
- `Docs/00-index.md` is the map; keep it current.
- Decisions go to `Docs/decisions.md` + an ADR.
- If a doc is wrong, fixing it is a P0 for the next PR.

---

## 14. Agent-specific rules

AI agents working in this repo must also follow `AGENTS.md`:

- Read the relevant docs before editing.
- Never bypass the gateway, policy or state machine to "make it work".
- Never add a direct engine import to core code.
- Never put secrets, prompts or user content in logs or fixtures.
- Update the backlog status when completing a story.
- Leave the repo green: `pnpm check && pnpm test`.
- When unsure between two designs, write the trade-off in the PR instead of guessing silently.

---

## 15. Definition of done

A change is done when:

1. Behavior is implemented server-side and authorization is enforced.
2. Durable state is persisted where required.
3. Failure, retry and cancellation paths are handled and visible.
4. Tests cover the risk (unit/integration/e2e as appropriate).
5. Logs and events are useful and secret-free.
6. UI copy is final, with empty/loading/error/offline states.
7. Docs and contracts are updated.
8. The end-to-end outcome is demonstrated.
9. CI is green.
10. The backlog story is marked done with a link to the PR.
