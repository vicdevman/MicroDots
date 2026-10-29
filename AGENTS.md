# AGENTS.md — Working Rules

This repository is built by humans and AI agents together. These rules exist so that any agent can make a correct change without re-deriving the architecture, and without quietly breaking the product's trust model.

**Read this file before your first edit. Re-read it when a task feels ambiguous.**

---

## 1. Read first (in order, minimum set)

1. [`Docs/product-thesis.md`](./Docs/product-thesis.md) — what this is and what it refuses to be.
2. [`Docs/technical-architecture.md`](./Docs/technical-architecture.md) — stack, boundaries, flows.
3. [`Docs/roadmap.md`](./Docs/roadmap.md) §5 — the MVP definition.
4. [`Docs/backlog.md`](./Docs/backlog.md) — the work board and current focus.
5. The doc specific to your area:
   - Backend → [`data-model.md`](./Docs/data-model.md), [`api-contracts.md`](./Docs/api-contracts.md)
   - Security/auth/policy → [`security-and-auth.md`](./Docs/security-and-auth.md)
   - UI → [`ux-spec.md`](./Docs/ux-spec.md)
   - Engines/adapters → [`extensibility-and-modules.md`](./Docs/extensibility-and-modules.md)
   - Installer/ops → [`installer-and-operations.md`](./Docs/installer-and-operations.md)
   - Skills → [`skills-system.md`](./Docs/skills-system.md)

`Docs/master-prd.md` is the product source of truth. If implementation conflicts with it, stop and surface the conflict; do not silently simplify a requirement.

---

## 2. The invariants (never violate these)

1. **The backend owns task state.** Never let a client, prompt or engine become the source of truth.
2. **Every effect that crosses the task sandbox passes through the execution gateway.** Workspace-local edits and commands run inside a capability-scoped container, authorized at task admission and fully captured; git push, network egress, secrets, deployments, external APIs and host actions are gateway-mediated. No adapter is called directly from a route, orchestrator or worker.
3. **Policy is code, not prose.** Never implement a permission check by asking a model or by trusting a tool description.
4. **Deny by default.** An unknown capability or missing grant is denied.
5. **Approvals are scoped, expiring, single-use and audited.** Never add an "approve all" or a mode that bypasses approval.
6. **`packages/domain` and `packages/policy` are pure.** No `fs`, `fetch`, DB, clock or randomness. Accept `now` as an argument.
7. **Engines and adapters are modules.** Core code imports the contract, never an engine/adaptor implementation.
8. **Engine selection happens after policy.** Switching engines cannot grant capabilities.
9. **Events are append-only and ordered per task.** Never update or delete a task event.
10. **Secrets never reach the client, prompts or logs.** Use the secret store; inject values only inside the gateway/adapter for the duration of one call.
11. **A restart cannot mark unverified work as complete.** Recovery must be honest.
12. **One Postgres is the only required stateful dependency.** Do not add Redis, Kafka, a vector DB or a second service without an ADR.
13. **Closing the client cannot stop server work.** No execution loop in the browser.
14. **Docs change with the code.** An interface, env var, event, capability or flow change updates its doc in the same PR.
15. **No new core dependency without justification** (see engineering guide §11). Major choices get an ADR.

If a task cannot be completed without violating an invariant, **stop and report the conflict** with options. Do not work around it.

---

## 3. Repository map

```text
apps/server/src/
  api/        HTTP routes, plugins, serializers
  auth/       better-auth config, setup token, guards
  domain/     application services + gateway (I/O only through ports)
  runtime/    queue consumers, scheduler, recovery, module registry
  infra/      db, queue, secrets, storage, push
  worker.ts   worker entry
  index.ts    api entry

apps/web/src/
  app/        router, providers, layout
  routes/     screens
  features/   chat, tasks, approvals, workers, projects…
  components/ composites
  lib/        api client, sse, query keys

packages/
  contracts/  Zod schemas, DTOs, event + UI card schemas
  domain/     pure state machines and plan logic
  policy/     capability model + evaluator
  db/         Drizzle schema, migrations, repositories
  engines/    ExecutionEngine contract + implementations
  adapters/   IntegrationAdapter contract + implementations
  ai/         provider registry, prompts, planner
  ui/         design system
  avatars/    agent avatars: SVG morph engine + <microdots-bot> web component
              (per-agent shape/colour/expression customisation, agent state →
              avatar state; see packages/avatars/README.md and ORIGIN.md)
  config/     env schema, constants, compat ranges
```

**Dependency direction:**

```
apps/* → packages/*
packages/domain  → contracts, policy
packages/db      → contracts
packages/engines → contracts, config
packages/adapters→ contracts, config
packages/avatars → (none: pure engine, no dependency; apps/web → avatars
                    allowed — the avatar never imports other packages)
apps/web         → contracts, ui
```

Never import upward. Never import an app from a package. Never import `db` from `web`.

`apps/server/src/domain` is the **application service layer** and may perform I/O through explicit ports. `packages/domain` is the **pure domain model** (no `fs`, `fetch`, DB, clock or randomness). They share a word, not an implementation; do not merge them.

---

## 4. Commands

```bash
pnpm install
pnpm dev                 # api + web + worker
pnpm check               # biome + typecheck
pnpm test                # unit
pnpm test:integration    # real Postgres via Testcontainers
pnpm test:e2e            # Playwright
pnpm build
pnpm db:up               # dev Postgres (Docker)
pnpm db:generate
pnpm db:migrate
```

Before you finish: `pnpm check && pnpm test` must pass. If you cannot run something, say so explicitly in the PR.

---

## 5. How to pick work

1. Open [`Docs/backlog.md`](./Docs/backlog.md).
2. Work only on the **current milestone** (currently M0) unless explicitly directed.
3. Pick a `⬜` story. If unclear, choose the lowest-ID story in the current epic.
4. If the story depends on an open decision in [`Docs/decisions.md`](./Docs/decisions.md), stop and ask rather than guessing.
5. Mark `🟨` when you start, `✅` when the definition of done is met, and append the PR link.
6. Do not renumber stories or rewrite completed history.

**Sequencing rules that are not optional:**

- No write-capable worker before the policy/gateway milestone is complete.
- No second worker type before the first is verified end-to-end.
- No multi-user before single-owner auth is secure.
- No integration before the adapter contract exists.

---

## 6. Engineering rules

### Backend

- Routes are thin: validate → authorize → call service → serialize.
- No SQL outside `packages/db`.
- One transaction per state transition; never hold a transaction across a network call.
- Use the ULID helper; no ad-hoc IDs.
- Emit events after commit, with the per-task sequence assigned atomically.
- Every mutating endpoint states its idempotency behavior.
- Errors use the standard envelope and stable codes.

### Frontend

- Server state in TanStack Query; never duplicate it in a global store.
- Task status changes only from events, never optimistic updates.
- Every screen defines empty, loading, error and offline states.
- Use semantic design tokens; no hard-coded colors.
- Accessibility is part of the definition of done (labels, focus, keyboard, contrast).
- Initial route bundle ≤ 250 KB gzip.

### Data

- Migrations are forward-only and reviewed. Never edit a shipped migration.
- Expand → backfill → contract for breaking changes.
- No speculative indexes.

### Tests

- Policy: 100% branch coverage.
- Domain: ≥ 90%.
- Every illegal state transition has a test.
- Every engine/adapter passes the shared contract harness.
- A flaky test is a bug; quarantine with an issue, do not retry-loop.

---

## 7. Security rules for agents

- Never print, log, commit or paste secrets, tokens, cookies or private keys.
- Never weaken origin checks, CSP, rate limits or session flags to make a test pass.
- Never add `eval`, `new Function`, dynamic `require`, or arbitrary model-generated code execution.
- Never let a model output select a tool that is not in the task's allowlist.
- Never bypass path confinement; resolve and check real paths.
- Never add a network call to a private IP range or metadata endpoint.
- Never put repository/web content into a system prompt as instructions; label it as untrusted data.
- If you find a vulnerability, do not open a public issue; follow [`SECURITY.md`](./SECURITY.md).

---

## 8. Documentation rules

- Update the doc that owns the thing you changed; link it in the PR.
- Add an ADR for decisions that are expensive to reverse.
- Keep `Docs/00-index.md` accurate.
- Do not add `TODO: decide` in code. Put the question in `Docs/decisions.md` §4.
- Prefer editing an existing doc over creating a new one. Docs multiply faster than code.

---

## 9. How to add things (quick index)

| Task | Read | Do not |
|---|---|---|
| New engine | extensibility §5, architecture §10 | Import it in core, or edit OpenCode |
| New adapter/tool | extensibility §3, api §7 | Call it outside the gateway |
| New worker | architecture §10, policy doc | Grant capabilities by default |
| New event | api §6 | Update/delete old events |
| New endpoint | api §1–§5, eng-guide §9 | Put SQL or policy logic in the route |
| New screen | ux spec | Skip empty/error/offline states |
| New skill | skills-system | Give it permissions or secrets |
| New migration | eng-guide §10 | Edit a shipped migration |

---

## 10. Definition of done (checklist)

- [ ] Behavior implemented server-side; authorization enforced.
- [ ] Durable state persisted where required.
- [ ] Failure, retry and cancellation handled and visible.
- [ ] Tests at the right level; policy/contract tests updated.
- [ ] Logs/events useful and secret-free.
- [ ] UI copy final; states covered.
- [ ] Docs and contracts updated.
- [ ] `pnpm check && pnpm test` green.
- [ ] Backlog story updated with PR link.
- [ ] End-to-end outcome demonstrated (or explicitly noted as not runnable).

---

## 11. When to stop and ask

Stop rather than guess when:

- A requirement conflicts with an invariant or the PRD.
- A decision is listed as open and blocks the work.
- A change would require a new core dependency, a second datastore, or a schema-breaking migration.
- You cannot verify the outcome and the story claims verification.
- A security control would need to be relaxed.
- Two docs disagree and you cannot tell which is authoritative.

Ask with: the conflict, the options, your recommendation, and the cost of each. Do not ask open-ended questions when a specific trade-off can be presented.

---

## 12. Current focus

- **Milestone:** M0 — Bedrock, complete locally. The first CI run and green default branch happen on the first push.
- **Epics:** E0 and E1 complete.
- **License:** AGPL-3.0-only, decided (ADR-0009, `LICENSE` present). SDK/contracts licensing is D17.
- **Next:** push, confirm CI green, then start M1 (installer and auth).

Do not start M1 (installer/auth) until M0's exit criteria are met, including a green CI run.
