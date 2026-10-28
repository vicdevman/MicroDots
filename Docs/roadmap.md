# MicroDots — Roadmap

**Status:** Active plan
**Estimate basis:** 1–2 experienced full-stack engineers, full-time
**Last updated:** 2026-10-28
**Tracking board:** [`backlog.md`](./backlog.md)
**Requirements:** [`master-prd.md`](./master-prd.md)

---

## 1. How to read this roadmap

This roadmap is **milestone-gated, not date-gated**. Dates are estimates; exit criteria are commitments. A milestone is complete only when its demo runs on a clean VPS and its exit criteria are verified. No milestone starts before the previous one closes, except for explicitly parallelizable documentation and design work.

Three things matter more than feature count:

1. **A working vertical slice at every milestone.** No milestone ends with disconnected components.
2. **Trust before power.** Policy and approvals exist before the first worker can write.
3. **One installable artifact.** Every milestone produces something a user could deploy.

---

## 2. Phase overview

| Phase | Name | Outcome | Est. (solo) | Release |
|---|---|---|---|---|
| **M0** | Bedrock | Docs, repo, CI, conventions, decision log | 1 wk | — |
| **M1** | Skeleton | One-command install, auth, setup wizard, empty app shell | 2 wks | `v0.0.1` |
| **M2** | Durable core | Tasks, events, queue, chat persistence, replay | 2 wks | `v0.0.2` |
| **M3** | The mind | Orchestrator plans and creates real tasks | 2 wks | `v0.0.3` |
| **M4** | The gate | Capabilities, policy engine, approvals, audit | 2 wks | `v0.0.4` |
| **M5** | The hands | Coding worker via OpenCode, workspaces, artifacts | 3 wks | `v0.1.0-rc.1` |
| **M6** | Ship MVP | Notifications, health, backup, hardening, e2e | 2 wks | **`v0.1.0` MVP** |
| **M7** | Reach | Research worker, MCP, skill bank | 3–4 wks | `v0.2.0` |
| **M8** | Eyes and hands II | Browser worker + human takeover | 4 wks | `v0.3.0` |
| **M9** | Operations | DevOps/API integrations, standing grants, cost controls | 4 wks | `v0.4.0` |
| **M10** | Team | Multi-user, roles, shared projects | 4 wks | `v0.5.0` |
| **M11** | Everywhere | Native mobile alpha, v1.0 hardening | 6+ wks | `v1.0.0` |

**To MVP: ~12–14 solo weeks.** With two engineers working in parallel on frontend/backend after M1, expect **7–9 weeks**. These assume no major architectural rework; the estimates already include a 20% buffer.

**To daily-driver usefulness (`v0.3`): ~5–6 months solo.**
**To a platform release (`v1.0`): ~9–12 months solo.**

The critical path is **M4 → M5**. Everything before it is scaffolding; everything after it is expansion. Protect it.

---

## 3. North star and phase gates

**North star metric:** verified tasks completed per active installation per week.

Every phase must move at least one of:

- time-to-first-value down,
- verified task success rate up,
- trust incidents (unapproved consequential actions) at zero,
- extension surface wider without core changes.

A phase that ships features but moves none of these is a failed phase.

---

## 4. Milestones in detail

### M0 — Bedrock (week 1)

**Goal:** A repository that any agent or contributor can enter and work in without asking questions.

**Scope**

- Monorepo scaffold (pnpm workspaces) with `apps/web`, `apps/server`, `packages/*`, `deploy/`, `skills/`.
- TypeScript strict, Biome, Vitest, Playwright, commit conventions, PR template.
- CI: lint, typecheck, unit tests, build. No deploy yet.
- `docker-compose.dev.yml` with Postgres only.
- Documentation set (this folder) merged and linked from README.
- Decision log opened; ADR-0001–0010 recorded.
- License decided: AGPL-3.0-only (ADR-0009); `LICENSE` present. SDK/contracts license remains D17.

**Exit criteria**

- `pnpm install && pnpm check && pnpm test` passes on a clean clone.
- CI green on the default branch.
- `AGENTS.md` exists and is accurate.
- No secrets in the repo; `.env.example` complete.

**Demo:** A new contributor clones, runs two commands, and has the repo building.

---

### M1 — Skeleton (weeks 2–3)

**Goal:** A stranger can install MicroDots on a fresh VPS and reach an authenticated empty shell.

**Scope**

- `install.sh` v1: OS/arch checks, Docker detection, secret generation, `.env`, compose up, health wait, setup URL output.
- Compose stack: `caddy`, `app`, `worker` (idle), `postgres`. Volumes and restart policies.
- PWA shell: routing, layout, design tokens, light/dark, mobile nav, install prompt.
- Auth: first-run claim, owner account, passkey-first + password fallback, session cookies, logout, device list.
- Setup wizard: account → instance settings; provider and project steps unlock when M3/M4 land and resume from the same wizard.
- Health endpoints (`/healthz`, `/readyz`) and a minimal System page.
- Structured logging, request IDs, error envelope.
- Database migrations pipeline with advisory lock at boot. M1 ships only the auth/settings/setup slice; M2 extends the schema.

**Exit criteria**

- Fresh Ubuntu 22.04/24.04 VPS: install completes in < 10 minutes with a domain, < 5 without.
- Re-running the installer is idempotent (no duplicate data, no destroyed config).
- Setup token is required; a second owner cannot be created.
- Passkey login works on desktop and mobile Safari/Chrome.
- `docker compose restart` preserves sessions and data.
- No route leaks stack traces or secrets.

**Demo:** Install from scratch, claim the instance, log in with a passkey, see the app shell.

**Requirements:** `INS-001…008`, `UI-001`, `SEC-005`, and `security-and-auth.md` §4. Provider/project wizard steps are completed in M3/M4, not M1.

---

### M2 — Durable core (weeks 4–5)

**Goal:** Work exists independently of the browser.

**Scope**

- Schema: users, sessions, projects, conversations, messages, tasks, task_events, worker_runs, artifacts, audit_log.
- Task state machine with validated transitions (`TSK-004`).
- pg-boss queue; job per worker run; retries, backoff, heartbeat, visibility timeout.
- A **fake worker** that sleeps, emits progress events and completes — used to prove durability before any AI.
- SSE stream with `Last-Event-ID` replay; event sequence per task.
- Chat UI backed by persisted messages (no AI yet; deterministic echo/planner stub).
- Task list + task detail with live timeline.
- Restart recovery: stale runs requeued, interrupted marked, events preserved.
- Idempotency keys on task creation.

**Exit criteria**

- Create a task, close the browser, reopen: state and events intact.
- `docker compose restart` mid-task: task resumes or reports an honest recovery state.
- Duplicate submit with the same idempotency key creates one task (`TSK-008`).
- SSE reconnect replays exactly the missed events, no gaps, no duplicates.
- 100 fake tasks: no lost events, no stuck queue entries.

**Demo:** Kill the server mid-task; watch it recover and finish.

**Requirements:** `TSK-001…008`, `UI-007`, `SEC-006`.

---

### M3 — The mind (weeks 6–7)

**Goal:** The orchestrator turns a sentence into a durable, structured plan.

**Scope**

- Provider abstraction (AI SDK) with OpenAI-compatible, Anthropic, Google, OpenRouter, Ollama.
- Orchestrator loop: classify → clarify or plan → create tasks → narrate.
- Structured plan schema (objective, tasks, deps, worker, success criteria, risk, approvals).
- Streaming assistant messages; tool calls limited to task management (create/cancel/query).
- Conversation ↔ task linkage; follow-up instructions to a running task.
- Token/cost accounting per run; per-task budget cap; hard stop.
- Prompt registry with versioned system prompts; no secrets in prompts.
- Graceful degradation when no provider is configured.

**Exit criteria**

- "Fix the failing build" produces a visible plan and at least one queued task assigned to a worker.
- Simple questions are answered without creating tasks.
- Ambiguous requests trigger a clarifying question, not a guess.
- Killing the process mid-stream leaves a consistent, resumable conversation.
- Spending over budget stops the run with a clear message.

**Demo:** Ask for a multi-step job; watch the plan and tasks appear.

**Requirements:** `ORC-001…008`, `UI-002`, `SEC-007`.

---

### M4 — The gate (weeks 8–9)

**Goal:** Nothing consequential happens without an explicit, auditable decision.

**Scope**

- Capability model (`project.fs.read`, `project.fs.write`, `project.exec`, `project.exec.network`, `git.push`, `deploy.production`, `net.fetch`, `browser.use`).
- Policy engine: pure function, layered grants, deny-wins, mode defaults, risk classes R0–R4.
- Execution gateway for boundary effects: schema validation → policy → approval → adapter → audit. Sandbox-local effects are authorized with the task and captured as diff/command logs.
- Approval objects: scoped, expiring, single-use; approve / reject / request changes.
- Approvals inbox + approval card in chat; push-ready notifications.
- Operating modes: Restricted / Balanced / Autonomous with the PRD's safety invariants.
- Audit log with actor, task, capability, decision, rule, timestamp.
- Policy simulator (admin tool) to preview decisions without executing.

**Exit criteria**

- A worker cannot perform an ungranted capability; the denial is recorded (`SEC-001…004`, `AC-003`).
- Switching mode never expands existing grants (`SEC-008`).
- Approving a staging action does not authorize production.
- Every decision is explainable by a rule ID.
- Simulator output matches runtime decisions in tests.

**Demo:** Attempt an unauthorized action live; watch it deny and explain.

**Requirements:** `SEC-001…008`, `AC-003`, `AC-005`.

---

### M5 — The hands (weeks 10–12)

**Goal:** MicroDots does real work on a real repository.

**Scope**

- OpenCode engine module: detect, pin, health, session, stream, cancel, error taxonomy.
- Runner container: non-root, workspace mount only, no Docker socket, CPU/memory/time limits.
- Project workspaces: clone/attach, per-run branch, diff capture, cleanup policy.
- Coding worker: task context bundle, bundled skill selection + injection (loader only; management UI and eval harness in v0.2), progress normalization to events.
- Artifacts: diffs, logs, test output, reports — content-addressed, auth-served.
- Verification: tests/exit codes parsed; "verified vs claimed" surfaced in results.
- Unified diff viewer and result card.
- Approval checkpoints for boundary operations, plus the Restricted-mode task write-scope approval.
- OpenCode installer matrix A–E implemented and tested (including incompatible and unhealthy cases).

**Exit criteria**

- A failing test in a fixture repo is diagnosed, fixed and verified end-to-end.
- A push is blocked until approved; approval is scoped and recorded.
- Runner cannot read the host filesystem or the database (`SEC-002`).
- OpenCode missing / present / incompatible / unhealthy each produce the correct, distinct remediation (`OPC-001…010`, `AC-006…009`).
- Killing the runner mid-run produces an honest failure, retryable task, preserved artifacts.
- **The engine seam is proven:** a second engine can be registered, health-checked and bound through configuration alone, with no changes to domain, policy, gateway or orchestrator (the Cline engine module itself lands in v0.2).

**Demo:** The full "fix the build" flow with a real diff and real test output.

**Requirements:** `OPC-001…010`, `WRK-001…007`, `TSK-007`, `SKL-001…004` (loader/injection).

---

### M6 — Ship the MVP (weeks 13–14)

**Goal:** `v0.1.0` is installable, trustworthy and supportable by strangers.

**Scope**

- Web push (VAPID) + in-app notifications + notification preferences.
- System Health page: DB, queue, workers, provider, OpenCode, disk.
- `microdots backup | restore | upgrade | doctor | uninstall` scripts.
- Fresh-install test on Hetzner, DigitalOcean and a local VM; arm64 test.
- Upgrade test from `v0.0.4` to `v0.1.0` with data preserved.
- E2E suite: install → setup → task → approval → completion → restart → verify.
- Security pass: headers, CSRF, rate limits, secret redaction, SSRF, path traversal, dependency audit.
- Performance pass: 10k events replay, 50 queued tasks, mobile Lighthouse ≥ 90.
- Docs: README, quickstart, troubleshooting, architecture; docs site optional.
- Release engineering: images to GHCR, checksums, changelog, version endpoint.

**Exit criteria (MVP definition — see §5)**

All MVP criteria met, demo script passes twice in a row on a fresh VPS, and no P0/P1 security findings remain.

**Demo:** Give a stranger the README and a blank VPS. They get a working result without help.

**Release:** **`v0.1.0` — "First Light". This is the working MVP.**

---

### M7 — Reach (`v0.2.0`, 3–4 weeks)

**Goal:** More than one kind of work, without touching the core.

- Research worker (web fetch + citations + report artifact), egress allowlist, SSRF defenses.
- MCP client: server registry, discovery, schema validation, per-tool permissions, health.
- Skill bank v1: management UI, trust tiers, 8–10 bundled skills, eval harness (loader/validator landed in M5).
- First official skill packs: `investigate-build-failure`, `fix-failing-tests`, `review-pull-request`, `research-technical-topic`, `prepare-change-summary`.
- Worker configuration UI (model, concurrency, skills, capabilities).
- Cost dashboard v1.

**Exit:** A research task with real citations and an MCP tool both run through the same gateway with distinct permissions.

---

### M8 — Eyes and hands II (`v0.3.0`, 4 weeks)

**Goal:** Operate the web, safely, with a human on the loop.

- Playwright browser worker, isolated contexts, persistent profiles per integration.
- Live view (screenshot stream over SSE/WS), pause/resume, human takeover.
- Intervention flow: pause → notify → user completes step → resume with preserved state.
- Domain allowlists, download quarantine, untrusted-content handling.
- Browser session separation from task persistence (`BRW-004`).

**Exit:** A login-gated workflow pauses for MFA, notifies, resumes, and completes (`AC-010`).

---

### M9 — Operations (`v0.4.0`, 4 weeks)

**Goal:** Ship, deploy and maintain things, not just change code.

- CLI adapter framework + allowlisted commands; Git/GitHub flows; Vercel adapter as reference.
- DevOps worker: environment inspection, deployment with environment-scoped grants.
- Standing grants (scoped, time-boxed, revocable) to reduce approval fatigue.
- Integration catalog UI; health and revocation.
- Usage/cost controls per project and per worker; budgets with hard stops.
- Scheduled and recurring tasks.

**Exit:** Staging deploy without approval, production deploy with approval, both audited (`AC-012`).

---

### M10 — Team (`v0.5.0`, 4 weeks)

**Goal:** More than one human, without weakening the model.

- Invitations, roles (owner/admin/member/viewer), per-project membership.
- Approval routing and "who can approve what".
- Shared conversations and task visibility rules.
- Per-user notification preferences and device management.
- Audit export; retention policies.

**Exit:** Two users, distinct permissions, one shared project, correct denials (room isolation, `AC-004`, is v0.5 and tested with the room tables).

---

### M11 — Everywhere (`v1.0.0`, 6+ weeks)

**Goal:** A stable platform with a second client.

- React Native client on the same API; native push; biometric unlock.
- API stability commitment, versioned deprecation policy.
- Extension packaging and signing (skills/adapters).
- Optional hosted relay for push and remote access (never required).
- Performance and reliability hardening; disaster-recovery drill.
- Security review and public disclosure program.

**Exit:** v1 API frozen; mobile alpha in TestFlight/Play internal; upgrade path from every 0.x release documented.

---

## 5. Working MVP definition (`v0.1.0`)

> **A technical stranger can install MicroDots on a fresh Ubuntu VPS with one command, complete setup in under ten minutes, connect a model provider and a Git repository, delegate a real code fix, approve the one risky step, and receive a verified result — then close the browser, reboot the server, and find the task and its evidence intact.**

### 5.1 MVP must include

| Capability | Requirement |
|---|---|
| One-command install on Ubuntu 22.04/24.04, x86_64 and arm64 | `INS-001…008` |
| TLS via domain (or documented tunnel), secure cookies | `installer-and-operations.md` §4–§5; `security-and-auth.md` §11 |
| First-run claim token + passkey/password auth + device list | `security-and-auth.md` §4; `api-contracts.md` §2, §5.15 |
| Setup wizard: account, provider, project | `ux-spec.md` §4.2; `api-contracts.md` §5.13 |
| Chat with orchestrator; streaming; persisted history | `ORC-001`, `ORC-002`, `UI-002` |
| Structured planning into durable tasks | `ORC-003…005`, `TSK-001` |
| Task states, transitions, cancellation | `TSK-004…006` |
| Durable queue with retries and restart recovery | `TSK-002…003`, `TSK-008` |
| SSE live updates with replay | `UI-007`; `technical-architecture.md` §6.4 |
| Policy engine + capabilities + three modes | `SEC-001…004`, `SEC-008` |
| Approvals: scoped, expiring, auditable | `master-prd.md` §10.4; `AC-003` |
| Coding worker via OpenCode on an authorized repo | `OPC-001…010` |
| Workspace isolation (container, non-root, limits) | `SEC-002`; `security-and-auth.md` §8 |
| Verified results: diff, tests, logs, honest status | `master-prd.md` §25.4 |
| Artifacts viewable/downloadable | `TSK-007`; `api-contracts.md` §5.16 |
| In-app + web push notifications for approvals/completion | `NTF-001…005` |
| System health page | `master-prd.md` §27.2 |
| Backup, restore, upgrade, doctor | `INS-009`; `installer-and-operations.md` §7–§9 |
| Audit log for decisions and actions | `SEC-006` |
| Mobile-usable PWA (installable) | `UI-001` |
| Security gates before release | `E20-S1…S6` |

Where the PRD has no requirement ID for a capability, the owning document is cited instead; the table does not borrow an unrelated ID.

### 5.2 Explicitly out of MVP

- Research worker, browser worker, MCP integrations.
- Skill management UI (a fixed internal skill set is fine).
- Multi-user, roles, invitations.
- Standing grants, scheduled tasks, cost dashboards beyond a simple counter.
- Integrations catalog, Vercel/deployment flows.
- Native mobile app.
- Generative UI beyond a small validated card set (task, approval, diff, tests, artifact).
- Marketplace, extension signing, themes.
- Kubernetes, HA, multi-region.

Anything in this list that appears in MVP scope is a scope bug. Cut it.

### 5.3 MVP demo script (run on a clean VPS, twice)

1. Provision a fresh Ubuntu 24.04 VPS with a domain pointed at it.
2. Run `curl -fsSL https://get.microdots.dev | sudo bash`.
3. Open the URL; paste the setup token from the terminal.
4. Create the owner account with a passkey; save recovery codes.
5. Paste a model provider key; connect a GitHub repo (fixture with a failing test).
6. Ask: *"Tests are failing. Find the cause, fix it, and show me the diff."*
7. Observe: plan → task card → live worker events.
8. Receive an approval request for the push; inspect scope; approve.
9. Receive a completion notification: root cause, diff, test output, branch link.
10. Close the browser; reboot the VPS; reopen. Task, events and artifacts are intact.
11. Run `microdots backup`, destroy the volumes, `microdots restore`, verify again.
12. Run `microdots doctor`; all checks green.

If any step needs a terminal hack, the MVP is not done.

### 5.4 MVP release gates

- [ ] Fresh install passes on 3 providers + 1 local VM (amd64) + 1 arm64 VM.
- [ ] Upgrade from the previous minor preserves data and config.
- [ ] Backup → destroy → restore verified.
- [ ] E2E suite green in CI on every PR.
- [ ] Zero P0/P1 security findings; dependency audit clean or documented.
- [ ] Policy engine branch coverage 100%; domain coverage ≥ 90%.
- [ ] No secret in logs, API responses or client bundles (automated scan).
- [ ] Lighthouse mobile ≥ 90 performance, 100 accessibility on core screens.
- [ ] Docs: install, quickstart, troubleshooting, architecture, security, contributing.
- [ ] `CHANGELOG.md` and version endpoint accurate.
- [ ] A person who has never seen the project completes the demo unaided.

---

## 6. Sequencing rules (what must exist before what)

```
Auth + install
      │
      ▼
Durable tasks + events + queue
      │
      ▼
Orchestrator (creates tasks)
      │
      ▼
Policy + gateway + approvals  ◄── must exist before any write-capable worker
      │
      ▼
Coding worker (first real capability)
      │
      ▼
MVP release
      │
      ├──► Research worker ──► MCP ──► Skills bank
      │
      ├──► Browser worker + takeover
      │
      └──► Integrations / DevOps ──► multi-user ──► mobile
```

Hard rules:

1. **No worker with write capability before M4 is complete.** The fake worker in M2/M3 proves durability without risk.
2. **No integration before the adapter contract and gateway exist.** Otherwise integrations bypass policy.
3. **No second worker type before the first one is verified end-to-end.** It multiplies unproven abstractions.
4. **No multi-user before single-owner is secure.** Tenancy bugs are cheaper to prevent than to fix.
5. **No native client before the API is stable enough to freeze.** The PWA is the contract test.

---

## 7. Parallel work streams

These can run alongside the main path without violating sequencing:

| Stream | Runs during | Output |
|---|---|---|
| Visual design system | M0–M2 | Tokens, components, dark mode, motion |
| Documentation site | M2–M6 | Public docs, guides, architecture diagrams |
| Installer hardening | M1–M6 | Provider matrix, arm64, offline mode |
| Security review | M4–M6, then continuous | Threat model, pen-test checklist, fixes |
| Skill authoring | M5–M7 | Bundled skill bank content |
| Community scaffolding | M5–M6 | Contributing, good-first-issues, discussions |
| Model compatibility | M3–M6 | Provider matrix, prompt regression suite |

Visual design arriving after M6 is acceptable (structure ships first) but delays polish and demos. Aim to have tokens and core components by M2.

---

## 8. Release cadence and versioning

- **Semver**, `0.x` until v1.0. Breaking changes allowed in minors but documented.
- **Weekly** internal builds from M2 onward; **milestone** public releases.
- **`main` is always deployable.** Feature flags for incomplete work.
- **Changelog** generated from conventional commits + Changesets; curated highlights per release.
- **Images:** `ghcr.io/microdots/app:<version>` (API and worker, different commands) and `ghcr.io/microdots/runner:<version>`; multi-arch, `:latest` only on stable releases.
- **Migrations** are forward-only and run automatically at boot with an advisory lock.
- **Support window:** latest minor + previous minor.

---

## 9. Capacity, cost and infrastructure assumptions

### Team

| Configuration | MVP | v0.3 | v1.0 |
|---|---|---|---|
| 1 full-time engineer | 12–14 wks | 5–6 mo | 9–12 mo |
| 2 engineers (FE/BE split after M1) | 7–9 wks | 3–4 mo | 6–8 mo |
| 2 engineers + part-time design | 6–8 wks | 3 mo | 5–7 mo |

Estimates include testing, docs and a 20% buffer. They exclude community support load.

### Runtime cost for a user

| Item | Minimum | Recommended |
|---|---|---|
| VPS | 2 vCPU / 4 GB / 40 GB | 4 vCPU / 8 GB / 80 GB |
| Cost | ~$6–12/mo | ~$20–30/mo |
| Model API | $5–20/mo light use | usage-based |
| Database, queue, proxy | $0 (bundled) | $0 |
| Push, TLS | $0 | $0 |

**No paid MicroDots service is required.** Every dependency is open source. Optional hosted extras (relay, managed push) must never be required for core function.

### Resource defaults (enforced by config)

- Worker concurrency: 2 (max 4 on 4 GB+).
- Coding runs per workspace: 1.
- Browser contexts: 1 (v0.3).
- Task timeout: 30 min default, per-task override.
- Runner memory cap: 2 GB; CPU 1.5 cores.
- Per-task model budget: configurable, default $2 with hard stop.

---

## 10. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Scope creep delays MVP | High | High | MVP list frozen in §5; backlog gated; weekly cut review | Lead |
| R2 | Policy bypass or destructive action | Medium | Critical | Gateway before workers; deny-by-default; tests; audit; red-team in M6 | Backend |
| R3 | OpenCode breaking changes | Medium | High | Adapter boundary; pinned compat range; contract tests; installer matrix | Backend |
| R4 | Installer fails on a provider | Medium | High | 3-provider matrix + arm64; `doctor`; idempotent state file | Infra |
| R5 | SSE replay bugs cause lost updates | Medium | Medium | Per-task seq; property tests; reconnect e2e | Backend |
| R6 | Small VPS exhaustion | High | Medium | Concurrency caps; queue backpressure; health warnings; documented minimums | Infra |
| R7 | Model cost runaway | Medium | Medium | Budgets, hard stops, usage accounting, alerts | Backend |
| R8 | Prompt injection via repo/web | High | High | Content-as-data prompts; tool allowlists; egress control; policy outside model | Security |
| R9 | Auth/session vulnerability | Low | Critical | Established library, passkeys, CSRF, rate limits, audit, external review | Security |
| R10 | Maintainer burnout | Medium | High | Boring stack; narrow surface; docs-as-code; community early | Lead |
| R11 | "Just a wrapper" perception | Medium | Medium | Second worker in v0.2; policy/task UX front and center in messaging | Product |
| R12 | Design arrives late, rework | Medium | Medium | Structure-first UX spec; tokens by M2; components not pages | Design |

Review this register at every milestone exit. Add, close or re-rank.

---

## 11. What "done" means for a phase

A phase exits only when:

1. Its demo runs on a clean environment.
2. Its exit criteria are checked in the roadmap and backlog.
3. No P0/P1 bugs are open in its scope.
4. Docs are updated.
5. The next phase's prerequisites are satisfied.
6. A retro note is added to `Docs/retros/` (one page: what worked, what didn't, what changes).

---

## 12. Deliberate deferrals (and why)

| Deferred | Until | Reason |
|---|---|---|
| Visual workflow builder | Never (not the product) | Conflicts with goal-directed design |
| Kubernetes / HA | Post-v1.0 | A single VPS is the target; complexity without users |
| Redis / Kafka | Never for MVP | Postgres queue is sufficient and reduces ops |
| Custom model / fine-tuning | Never | Not our differentiator |
| Marketplace | v1.x | Needs trust, signing, review capacity |
| Multi-tenant SaaS | Post-v1.0 | Contradicts ownership positioning as the primary mode |
| Native mobile | v1.0 | PWA proves the API and the UX first |
| Autonomous mode default | Post-MVP | Trust must be earned; Balanced is default |
| Themes/avatars beyond package | Post-MVP | Cosmetic; avatar package integrated as-is |
| i18n | Post-v1.0 | English-first; structure strings for later extraction |
