# MicroDots — Backlog and Tracking Board

**Status:** Live
**Last updated:** 2026-10-28
**Companion:** [`roadmap.md`](./roadmap.md)
**Rule:** Every story maps to a milestone and (where applicable) a PRD requirement. If it does not, it is not ready.

---

## 1. How to use this board

| Marker | Meaning |
|---|---|
| `⬜` | Todo — ready or clearly scoped |
| `🟨` | In progress — one owner, one branch |
| `✅` | Done — meets the definition of done |
| `⛔` | Blocked — reason recorded in the row |
| `⏸` | Deferred — consciously out of the current milestone |

**Updating:** change the marker and append the PR link at the end of the row (`— #123`). Do not renumber stories. If scope changes, add a story rather than rewriting history.

**Definition of ready:** the story has an owner, a milestone, acceptance criteria (implicit in the row), no unresolved product decision, and the docs it touches are known.

**Current focus:** `M0` scaffold complete locally; the first CI run happens on the first push. `M1` is next. E0 and E1 are complete; license D1 is resolved (AGPL-3.0-only).

---

## 2. Progress summary

| Epic | Scope | Milestone | Done | Total |
|---|---|---|---|---|
| E0 | Product & docs | M0 | 11 | 11 |
| E1 | Repo, tooling, CI | M0 | 10 | 10 |
| E2 | Installer & deployment | M1 | 0 | 16 |
| E3 | Auth & onboarding | M1 | 0 | 14 |
| E4 | Data layer | M2 | 0 | 9 |
| E5 | Task engine & queue | M2 | 0 | 12 |
| E6 | Events & realtime | M2 | 0 | 8 |
| E7 | Orchestrator | M3 | 0 | 10 |
| E8 | Policy & approvals | M4 | 0 | 12 |
| E9 | Gateway & tools | M4 | 0 | 8 |
| E10 | Engines (coding) | M5 | 0 | 14 |
| E11 | Web app & UX | M1–M6 | 0 | 22 |
| E12 | Notifications | M6 | 0 | 7 |
| E13 | Operations & release | M6 | 0 | 14 |
| E14 | Research & MCP | M7 | 0 | 7 |
| E15 | Skills | M5/M7 | 0 | 6 |
| E16 | Browser | M8 | 0 | 7 |
| E17 | Integrations & DevOps | M9 | 0 | 8 |
| E18 | Multi-user | M10 | 0 | 6 |
| E19 | Mobile | M11 | 0 | 5 |
| E20 | Hardening (cross-cutting) | M6+ | 0 | 8 |

MVP (`v0.1.0`) = E0–E13 plus the E20-S1…S6 release gates. E14+ is explicitly out.

---

## 3. E0 — Product and documentation (M0)

| ID | Story | Status | Notes |
|---|---|---|---|
| E0-S1 | Read and internalize the master PRD; resolve contradictions | ✅ | Docs written against it |
| E0-S2 | Write product thesis (positioning, users, metrics, risks) | ✅ | `product-thesis.md` |
| E0-S3 | Write roadmap with milestones, MVP definition, gates | ✅ | `roadmap.md` |
| E0-S4 | Write technical architecture and stack rationale | ✅ | `technical-architecture.md` |
| E0-S5 | Write data model and state machines | ✅ | `data-model.md` |
| E0-S6 | Write API and event contracts | ✅ | `api-contracts.md` |
| E0-S7 | Write security, auth and policy model | ✅ | `security-and-auth.md` |
| E0-S8 | Write UX spec (IA, flows, states, a11y) | ✅ | `ux-spec.md` |
| E0-S9 | Write installer and operations spec | ✅ | `installer-and-operations.md` |
| E0-S10 | Write modularity/engine contract spec; skill bank + 4 skills | ✅ | `extensibility-and-modules.md`, `skills/` |
| E0-S11 | Write README, AGENTS, CONTRIBUTING, SECURITY; resolve license (D1) | ✅ | AGPL-3.0-only; `LICENSE` added |

---

## 4. E1 — Repository, tooling, CI (M0)

| ID | Story | Status | Refs |
|---|---|---|---|
| E1-S1 | Initialize monorepo: pnpm workspaces, apps/packages, base tsconfig | ✅ | ADR-0001 |
| E1-S2 | Strict TypeScript config + shared path aliases | ✅ | eng-guide §3 |
| E1-S3 | Biome lint/format with import boundary rules | ✅ | eng-guide §6 |
| E1-S4 | Vitest setup + first policy/domain tests | ✅ | |
| E1-S5 | Testcontainers Postgres harness | ✅ | Docker required; not run on this Windows host |
| E1-S6 | Playwright skeleton for e2e | ✅ | `test:e2e` passes with Chromium installed |
| E1-S7 | `.env.example` validated by `packages/config` | ✅ | |
| E1-S8 | Dev compose with Postgres only | ✅ | |
| E1-S9 | CI: install, check, test, build, docs links, secret scan | ✅ | First run exposed a gitleaks root-commit bug; replaced with a pinned CLI scan |
| E1-S10 | Changesets + conventional commit + PR template | ✅ | |

---

## 5. E2 — Installer and deployment (M1)

| ID | Story | Status | Refs |
|---|---|---|---|
| E2-S1 | Production `compose.yaml` (caddy, app, worker, postgres, runner) | 🟨 | INS-001 — app/worker/Postgres/Caddy in [M1A](https://github.com/vicdevman/MicroDots/commit/c9432e4); runner in M5 |
| E2-S2 | Multi-stage Dockerfile for app/worker | ✅ | [M1A](https://github.com/vicdevman/MicroDots/commit/c9432e4) |
| E2-S3 | Runner image with engine runtime, non-root, limits | ⬜ | SEC-002 |
| E2-S4 | Caddyfile with TLS, headers, compression, proxy | ✅ | [M1A](https://github.com/vicdevman/MicroDots/commit/c9432e4) |
| E2-S5 | `install.sh`: OS/arch/resource checks | ⬜ | INS-001 |
| E2-S6 | Secret generation and `/data/secrets` permissions | 🟨 | INS-006, SEC-005 — boot entrypoint and env script in M1A; installer wiring in M1D |
| E2-S7 | `.env` creation, backup-before-change, 0600 | ⬜ | INS-008 |
| E2-S8 | Start stack, wait for `/readyz`, print setup URL/token | ⬜ | INS-007 |
| E2-S9 | Install state file + idempotent re-run | ⬜ | INS-008 |
| E2-S10 | Access modes: domain, proxy, tunnel, LAN (documented limits) | ⬜ | |
| E2-S11 | `microdots` CLI shim (logs, backup, restore, upgrade, doctor, uninstall) | ⬜ | INS-009/010 |
| E2-S12 | Backup script (pg_dump + artifacts, encrypted) | ⬜ | INS-009 |
| E2-S13 | Restore script with version/checksum verification | ⬜ | INS-009 |
| E2-S14 | Upgrade + rollback scripts with pre-backup | ⬜ | INS-009 |
| E2-S15 | Fresh-install matrix: Ubuntu 22/24, Debian 12, amd64/arm64 | ⬜ | |
| E2-S16 | Uninstall with data-preserving default and `--purge` | ⬜ | INS-010 |

---

## 6. E3 — Auth and onboarding (M1)

| ID | Story | Status | Refs |
|---|---|---|---|
| E3-S1 | better-auth integration (sessions, accounts, passkeys) | ⬜ | SEC-001 |
| E3-S2 | Auth schema + migrations | ⬜ | |
| E3-S3 | Setup token generation, storage, single-use verification | ⬜ | |
| E3-S4 | `GET /setup/status`, `POST /setup/verify-token`, `/setup/complete` | ⬜ | |
| E3-S5 | Owner creation closes registration | ⬜ | |
| E3-S6 | Passkey registration + authentication (WebAuthn) | ⬜ | |
| E3-S7 | Password fallback (scrypt via better-auth) + TOTP optional | ⬜ | |
| E3-S8 | Recovery codes (hashed, single-use, regenerate) | ⬜ | |
| E3-S9 | Session rotation, device list, revoke one/all | ⬜ | |
| E3-S10 | API tokens (scoped, hashed, revoke) | ⬜ | |
| E3-S11 | Origin/CSRF checks + auth rate limits | ⬜ | |
| E3-S12 | `microdots auth reset` CLI | ⬜ | |
| E3-S13 | Setup wizard UI (claim, account, provider, project) | ⬜ | |
| E3-S14 | Login UI (passkey-first, fallback, recovery help) | ⬜ | |

---

## 7. E4 — Data layer (M2)

| ID | Story | Status | Refs |
|---|---|---|---|
| E4-S1 | Drizzle schema: all v1 tables and enums | 🟨 | data-model — `system_state` bootstrapped in [M1A](https://github.com/vicdevman/MicroDots/commit/c9432e4) |
| E4-S2 | Migration pipeline + advisory lock at boot | ✅ | [M1A](https://github.com/vicdevman/MicroDots/commit/c9432e4) |
| E4-S3 | Seed: instance, default workers, fake engine, demo project | ⬜ | |
| E4-S4 | Repositories for tasks, events, approvals, runs, projects | ⬜ | |
| E4-S5 | SecretStore (AES-256-GCM, key file, rotate) | ⬜ | SEC-005 |
| E4-S6 | ArtifactStore (content-addressed, auth reads) | ⬜ | TSK-007 |
| E4-S7 | Audit writer with redaction | ⬜ | SEC-006 |
| E4-S8 | Test factories + transactional test harness | ⬜ | |
| E4-S9 | Backup/restore compatibility checks (schema version) | ⬜ | INS-009 |

---

## 8. E5 — Task engine and queue (M2)

| ID | Story | Status | Refs |
|---|---|---|---|
| E5-S1 | Task state machine + transition table + tests | ⬜ | TSK-004 |
| E5-S2 | Task service: create, queue, start, finish, fail, cancel | ⬜ | TSK-001 |
| E5-S3 | pg-boss wrapper + queues + job schemas | ⬜ | TSK-005 |
| E5-S4 | Scheduler: deps, capacity, priority | ⬜ | ORC-005 |
| E5-S5 | `task.run` consumer with fake engine | ⬜ | |
| E5-S6 | Retries with backoff; transient vs permanent classification | ⬜ | TSK-005 |
| E5-S7 | Cancellation: request, abort, outcome recording | ⬜ | TSK-006 |
| E5-S8 | Recovery sweeper: stale heartbeat, requeue or block | ⬜ | TSK-003 |
| E5-S9 | Idempotency keys on task creation | ⬜ | TSK-008 |
| E5-S10 | Budget guard (tokens/cost) with hard stop | ⬜ | |
| E5-S11 | Concurrency caps + backpressure behavior | ⬜ | WRK-005 |
| E5-S12 | One-active-run and one-writer-per-workspace locks | ⬜ | |

---

## 9. E6 — Events and realtime (M2)

| ID | Story | Status | Refs |
|---|---|---|---|
| E6-S1 | Atomic per-task `seq` + event writer | ⬜ | |
| E6-S2 | Event payload schemas + vocabulary | ⬜ | api §6 |
| E6-S3 | `GET /tasks/:id/events` SSE with replay | ⬜ | UI-007 |
| E6-S4 | `GET /events` user-scoped stream (global seq) | ⬜ | |
| E6-S5 | Heartbeat, retry, disconnect handling | ⬜ | |
| E6-S6 | `stream.reset` when cursor too old | ⬜ | |
| E6-S7 | Client `useTaskEvents` + query cache reducer | ⬜ | |
| E6-S8 | Turn stream for assistant deltas (ephemeral) | ⬜ | |

---

## 10. E7 — Orchestrator (M3)

| ID | Story | Status | Refs |
|---|---|---|---|
| E7-S1 | Provider registry + config + health | ⬜ | |
| E7-S2 | Orchestrator loop: classify → clarify/plan → reply | ⬜ | ORC-001/002 |
| E7-S3 | Structured plan schema + validation | ⬜ | ORC-003 |
| E7-S4 | Task creation from plan (transactional, deps) | ⬜ | ORC-004/005 |
| E7-S5 | Clarification behavior (one focused question) | ⬜ | |
| E7-S6 | Context builder (bounded messages + open tasks) | ⬜ | |
| E7-S7 | Prompt registry + versioning | ⬜ | |
| E7-S8 | Streaming persistence + recovery mid-stream | ⬜ | |
| E7-S9 | Token/cost accounting per run | ⬜ | |
| E7-S10 | No-provider graceful degradation | ⬜ | |

---

## 11. E8 — Policy and approvals (M4)

| ID | Story | Status | Refs |
|---|---|---|---|
| E8-S1 | Capability registry + parsing | ⬜ | SEC-003 |
| E8-S2 | Pure policy evaluator (deny-wins, modes, risks) | ⬜ | SEC-001/003 |
| E8-S3 | 100% branch test matrix (capability × risk × mode) | ⬜ | |
| E8-S4 | Project grants CRUD + effective grants | ⬜ | |
| E8-S5 | Operating modes + invariants | ⬜ | SEC-008 |
| E8-S6 | Approval creation with scope hash, expiry, risk | ⬜ | |
| E8-S7 | Atomic consume-once on resume | ⬜ | |
| E8-S8 | Approve / reject / request changes API | ⬜ | |
| E8-S9 | Approval expiry job + notification | ⬜ | |
| E8-S10 | Audit every decision with rule id | ⬜ | SEC-006 |
| E8-S11 | Policy simulator (admin) + parity test | ⬜ | |
| E8-S12 | Mode/risk explanation copy | ⬜ | |

---

## 12. E9 — Execution gateway and tools (M4)

| ID | Story | Status | Refs |
|---|---|---|---|
| E9-S1 | `ToolDefinition` contract + registry | ⬜ | |
| E9-S2 | Gateway pipeline: validate → authorize → execute → audit | ⬜ | SEC-001 |
| E9-S3 | Deny path (fail closed) + structured error | ⬜ | |
| E9-S4 | Approve path (suspend/resume, scope recheck) | ⬜ | |
| E9-S5 | Clarify path | ⬜ | |
| E9-S6 | Input/output schema validation | ⬜ | INT-007 |
| E9-S7 | Timeouts, abort signals, result caps | ⬜ | |
| E9-S8 | Gateway integration tests with fake tools | ⬜ | |

---

## 13. E10 — Engines (M5)

| ID | Story | Status | Refs |
|---|---|---|---|
| E10-S1 | `ExecutionEngine` contract + manifest schema | ⬜ | ADR-0008 |
| E10-S2 | Engine registry + bindings + resolution order | ⬜ | |
| E10-S3 | `fake` engine (deterministic scenarios) | ⬜ | |
| E10-S4 | OpenCode engine: health, session, run, cancel | ⬜ | OPC-007/008 |
| E10-S5 | Event normalization for OpenCode | ⬜ | |
| E10-S6 | Runner container + workspace mount + hardening | ⬜ | SEC-002 |
| E10-S7 | Workspace manager: clone, branch, lock, diff, cleanup | ⬜ | |
| E10-S8 | Version compat range + health handshake | ⬜ | OPC-006 |
| E10-S9 | Installer matrix A–E for OpenCode | ⬜ | OPC-001…005 |
| E10-S10 | Failure taxonomy mapping (engine vs provider vs policy) | ⬜ | OPC-010 |
| E10-S11 | Engine contract test harness | ⬜ | |
| E10-S12 | Cline engine (v0.2) | ⏸ | ADR-0008 |
| E10-S13 | Engine picker + routing UI | ⬜ | |
| E10-S14 | Comparison run mode (v0.4) | ⏸ | |

---

## 14. E11 — Web app and UX (M1–M6)

| ID | Story | Status | Refs |
|---|---|---|---|
| E11-S1 | Design tokens + Tailwind + shadcn base | ⬜ | UI-001 |
| E11-S2 | App shell: rail, mobile nav, routing, error boundary | ⬜ | |
| E11-S3 | Setup wizard screens | ⬜ | |
| E11-S4 | Login + passkey + recovery screens | ⬜ | |
| E11-S5 | Home: chat stream, composer, needs-you strip | ⬜ | UI-002 |
| E11-S6 | Task list with filters + empty/loading/error | ⬜ | |
| E11-S7 | Task detail: overview, timeline, artifacts, logs | ⬜ | |
| E11-S8 | Approval inbox + detail + decision flow | ⬜ | UI-004 |
| E11-S9 | Projects list/detail/connect + grants UI | ⬜ | |
| E11-S10 | Team: workers + engines + routing | ⬜ | UI-003 |
| E11-S11 | Settings: mode, providers, notifications, security | ⬜ | |
| E11-S12 | System health page | ⬜ | |
| E11-S13 | Generative UI cards (task, approval, diff, tests, artifacts) | ⬜ | UI-005/006 |
| E11-S14 | PWA manifest, icons, install prompt, offline shell | ⬜ | |
| E11-S15 | SSE reconnect + offline banner | ⬜ | UI-007 |
| E11-S16 | Avatar package integration | ⬜ | UI-008 |
| E11-S17 | Responsive pass at 320/768/1280 | ⬜ | |
| E11-S18 | Accessibility pass (WCAG 2.2 AA) | ⬜ | |
| E11-S19 | Command palette + keyboard shortcuts | ⬜ | |
| E11-S20 | Notification inbox + preferences | ⬜ | |
| E11-S21 | Empty/loading/error state library | ⬜ | |
| E11-S22 | Microcopy review (honesty, no false success) | ⬜ | |

---

## 15. E12 — Notifications (M6)

| ID | Story | Status | Refs |
|---|---|---|---|
| E12-S1 | Notification model + creation on events | ⬜ | NTF-001 |
| E12-S2 | In-app inbox + unread badge | ⬜ | |
| E12-S3 | VAPID keys + web push subscription | ⬜ | NTF-002 |
| E12-S4 | Push worker with retries + failure tracking | ⬜ | NTF-003 |
| E12-S5 | Deep links to task/approval after auth | ⬜ | NTF-004 |
| E12-S6 | Preferences per kind | ⬜ | |
| E12-S7 | Push permission prompt timing + rationale | ⬜ | |

---

## 16. E13 — Operations and release (M6)

| ID | Story | Status | Refs |
|---|---|---|---|
| E13-S1 | `/healthz`, `/readyz`, rich `/system/health` | ⬜ | INS-007 |
| E13-S2 | Structured logs + request/task/run correlation | ⬜ | |
| E13-S3 | `microdots doctor` with 15 checks | ⬜ | |
| E13-S4 | Support bundle (sanitized) | ⬜ | |
| E13-S5 | E2E: setup → task → approval → completion → restart | ⬜ | |
| E13-S6 | Restart recovery e2e | ⬜ | AC-014 |
| E13-S7 | Backup → destroy → restore verification | ⬜ | |
| E13-S8 | Upgrade from previous minor test | ⬜ | INS-009 |
| E13-S9 | Fresh install on 3 providers + arm64 | ⬜ | |
| E13-S10 | Multi-arch images, digests, GHCR, changelog | ⬜ | |
| E13-S11 | Security checklist + dependency audit | ⬜ | |
| E13-S12 | Performance pass (Lighthouse, API p95, 10k events) | ⬜ | |
| E13-S13 | Docs site / public docs | ⬜ | |
| E13-S14 | MVP demo script run twice unaided | ⬜ | roadmap §5.3 |

---

## 17. E14 — Research and MCP (v0.2)

| ID | Story | Status | Refs |
|---|---|---|---|
| E14-S1 | Research engine with fetch + extraction | ⬜ | INT-005 |
| E14-S2 | Domain allowlist + SSRF defenses + tests | ⬜ | |
| E14-S3 | Citations artifact + UI card | ⬜ | |
| E14-S4 | MCP client (stdio/HTTP) + registry | ⬜ | INT-002 |
| E14-S5 | Tool discovery, schema validation, per-tool grants | ⬜ | |
| E14-S6 | Integration health + errors | ⬜ | INT-006 |
| E14-S7 | Prompt-injection fixture for MCP output | ⬜ | SEC-007 |

---

## 18. E15 — Skills (M5 loader, M7 management)

S1–S4 land in M5 so the coding worker can use the bundled skills at MVP. S5–S6 (UI, eval harness) land in M7.

| ID | Story | Status | Refs |
|---|---|---|---|
| E15-S1 | SKILL.md parser + validator + strict mode | ⬜ | SKL-001 |
| E15-S2 | Loader, trust tiers, enable/disable | ⬜ | |
| E15-S3 | Worker/project binding + selection | ⬜ | SKL-007 |
| E15-S4 | Bundled skills wired to coding worker (3 ready; `setup-project-workspace` stays draft until evaluated) | ⬜ | |
| E15-S5 | Skills UI (browse, preview, requirements) | ⬜ | SKL-006 |
| E15-S6 | Eval harness with fixture tasks | ⬜ | |

---

## 19. E16 — Browser (v0.3)

| ID | Story | Status | Refs |
|---|---|---|---|
| E16-S1 | Playwright engine + isolated contexts | ⬜ | BRW-001 |
| E16-S2 | Persistent profiles per integration | ⬜ | |
| E16-S3 | Domain allowlist + download quarantine | ⬜ | BRW-002 |
| E16-S4 | Live view stream | ⬜ | BRW-006 |
| E16-S5 | Pause / takeover / handback | ⬜ | BRW-003/007 |
| E16-S6 | Intervention notifications + resume | ⬜ | AC-010 |
| E16-S7 | Untrusted content handling tests | ⬜ | BRW-005 |

---

## 20. E17 — Integrations and DevOps (v0.4)

| ID | Story | Status | Refs |
|---|---|---|---|
| E17-S1 | CLI adapter framework + allowlisted commands | ⬜ | INT-003 |
| E17-S2 | Git/GitHub adapter (PR, checks, issues) | ⬜ | |
| E17-S3 | Vercel adapter (status, deploy, logs) | ⬜ | |
| E17-S4 | Staging vs production grants | ⬜ | |
| E17-S5 | Standing grants (scoped, time-boxed) | ⬜ | |
| E17-S6 | Integration catalog UI | ⬜ | |
| E17-S7 | Scheduled/recurring tasks | ⬜ | |
| E17-S8 | Cost dashboard + per-project budgets | ⬜ | |

---

## 21. E18 — Multi-user (v0.5)

| ID | Story | Status | Refs |
|---|---|---|---|
| E18-S1 | Invitations (one-time links, no email required) | ⬜ | |
| E18-S2 | Roles: owner/admin/member/viewer | ⬜ | |
| E18-S3 | Per-project membership + visibility | ⬜ | |
| E18-S4 | Approval authority routing | ⬜ | |
| E18-S5 | Audit export + retention settings | ⬜ | |
| E18-S6 | Per-user notification preferences | ⬜ | |

---

## 22. E19 — Mobile (v1.0)

| ID | Story | Status | Refs |
|---|---|---|---|
| E19-S1 | React Native app shell on the v1 API | ⬜ | UI-009 |
| E19-S2 | Conversation, tasks, approvals, notifications | ⬜ | |
| E19-S3 | Native push adapter | ⬜ | |
| E19-S4 | Biometric unlock + secure token storage | ⬜ | |
| E19-S5 | API v1 freeze + deprecation policy | ⬜ | |

---

## 23. E20 — Hardening (M6+, continuous)

**E20-S1…S6 are MVP release gates.** S7–S8 run after MVP and stay continuous.

| ID | Story | Status | Refs |
|---|---|---|---|
| E20-S1 | Threat model review + pen-test checklist | ⬜ | §2 security |
| E20-S2 | Prompt-injection fixture repo + CI gate | ⬜ | SEC-007 |
| E20-S3 | Path traversal / symlink / SSRF test suite | ⬜ | |
| E20-S4 | Secret scanning in logs, events, bundles | ⬜ | SEC-005 |
| E20-S5 | Dependency and image audit | ⬜ | |
| E20-S6 | Accessibility audit (automated + manual) | ⬜ | |
| E20-S7 | Disaster recovery drill | ⬜ | |
| E20-S8 | Performance regression suite | ⬜ | |

---

## 24. Cross-cutting acceptance tests (kept green)

| ID | Test | Refs |
|---|---|---|
| X1 | Task survives client close and server restart | AC-001, AC-014 |
| X2 | Unauthorized operation denied and audited | AC-003 |
| X3 | Approval scope cannot authorize a different operation | §10.4 |
| X4 | Room membership grants nothing (v0.5; runs when room tables ship) | AC-004 |
| X5 | Mode change does not expand grants | AC-005 |
| X6 | Engine missing ≠ provider auth failure | AC-009 |
| X7 | Notification failure preserves pending approval | AC-016 |
| X8 | Installer re-run is idempotent | AC-015 |
| X9 | Structured UI payload cannot execute code | AC-013 |
| X10 | Skill cannot grant a capability | SKL-004 |

---

## 25. Parking lot (not scheduled)

Ideas that are deliberately outside the roadmap. Promote only with a decision.

- Voice interface.
- Desktop app (Tauri).
- Team chat / rooms UI.
- Skill marketplace.
- Hosted relay for push/remote access.
- Usage-based hosted tier.
- Vector memory / semantic search over tasks.
- Visual workflow builder.
- Custom model hosting.
- Mobile offline execution.
- Multi-region deployments.
