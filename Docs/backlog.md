# MicroDots — Personal Operator Backlog

**Status:** Live
**Last updated:** 2026-10-30
**Companion:** [`roadmap.md`](./roadmap.md)
**Design:** [`native-execution-and-resources.md`](./native-execution-and-resources.md)
**Deferred product board:** [`product-backlog.md`](./product-backlog.md)

**Rule:** Every story maps to a phase and, where applicable, a PRD requirement or an owning doc. If it does not, it is not ready.

---

## 1. How to use this board

| Marker | Meaning |
|---|---|
| `⬜` | Todo — ready or clearly scoped |
| `🟨` | In progress — one owner, one branch |
| `✅` | Done — meets the definition of done |
| `⛔` | Blocked — reason recorded in the row |
| `⏸` | Deferred — consciously out of the current phase |

**Updating:** change the marker and append the PR link at the end of the row (`— #123`). Do not renumber stories. If scope changes, add a story rather than rewriting history.

**Current focus:** **P1 — native execution runtime.** P0 is complete. P2 does not start until P1's cleanup test is real.

**Blocked inputs** (needed before P3): VPS distro, systemd version, cgroup v2 availability, whether the three backends run under systemd or Docker, what owns ports 80/443, and the first workflow (repo fix/PR, Vercel deploy, or nginx deploy).

---

## 2. Progress summary

| Phase | Scope | Done | Total |
|---|---|---|---|
| P0 | Foundation (complete) | 6 | 6 |
| P1 | Native execution runtime | 0 | 10 |
| P2 | Resource-aware scheduler and dashboard | 0 | 9 |
| P3 | First real workflow | 0 | 9 |
| P4 | OpenCode and agent presence | 0 | 7 |
| P5 | Browser and human takeover | 0 | 8 |
| P6 | Memory graph and retrieval | 0 | 8 |
| P7 | Optional surfaces | 0 | 5 |

**Fast path:** P1–P4. **Enhancements:** P5–P6. **Optional / deferred:** P7.

---

## 3. P0 — Foundation (complete)

| ID | Story | Status | Notes |
|---|---|---|---|
| P0-S1 | Monorepo, strict TypeScript, Biome, Vitest, Playwright, CI | ✅ | M0 |
| P0-S2 | Domain task state machine and policy matrix + tests | ✅ | M0 |
| P0-S3 | M1A production spine: compose, image, Caddy, migrations, secrets, static PWA, health/logging | ✅ | `c9432e4`, `97e5c19`; optional Docker reference |
| P0-S4 | Avatar package: SVG morph engine, web component, agent-state mapping | ✅ | `54a0297`; not yet wired into the web app |
| P0-S5 | Docs pivot: personal-operator roadmap, backlog, native execution design, ADRs | ✅ | This change |
| P0-S6 | Preserve deferred product roadmap/backlog without renumbering | ✅ | `product-roadmap.md`, `product-backlog.md` |

---

## 4. P1 — Native execution runtime

**Goal:** Start, limit, observe, stop and clean up one real execution on the host without Docker.

| ID | Story | Status | Acceptance / refs |
|---|---|---|---|
| P1-S1 | Define `ExecutionRuntime` contract in `packages/contracts` | ⬜ | prepare/start/stop/kill/logs/usage/cleanup/health; versioned; no systemd types leak into core |
| P1-S2 | Privileged `microdots-exec` helper with a narrow, authenticated API | ⬜ | app/worker unprivileged; helper validates operator-owned profiles; no arbitrary shell |
| P1-S3 | Native adapter: transient systemd service or scope per execution | ⬜ | unique unit name; `Type=exec`; no shell interpolation; unit cleanup on exit |
| P1-S4 | cgroup v2 limits: memory high/max, CPU quota/weight, PIDs, IO where available | ⬜ | limits applied at start; child processes inherit; cannot be raised by the task |
| P1-S5 | Workspace/temp/env confinement | ⬜ | realpath checks; per-run temp dir; no inherited secrets; no host HOME |
| P1-S6 | Capture logs, exit status and usage durably | ⬜ | log size cap; usage survives helper/worker restart; no secrets in logs |
| P1-S7 | Stop, kill and timeout paths | ⬜ | graceful TERM then KILL; deadline enforced; outcome recorded honestly |
| P1-S8 | Verified cleanup and orphan sweeper | ⬜ | no unit, process, temp dir, lock, port or cache remains; orphan units detected |
| P1-S9 | Boot reconciliation | ⬜ | interrupted run is `interrupted`/`blocked`, never `completed`; evidence preserved |
| P1-S10 | Linux test harness for unit/cgroup/cleanup | ⬜ | runs in CI on Linux; Windows reports runtime unavailable |

**P1 exit:** a memory-hungry sample job hits its cgroup limit, is stopped, and the host is clean. Cleanup output is durable and visible.

---

## 5. P2 — Resource-aware scheduler and dashboard

**Goal:** Keep the three production backends safe and make MicroDots' share visible.

| ID | Story | Status | Acceptance / refs |
|---|---|---|---|
| P2-S1 | Host metrics: memory, CPU, PSI, disk, load, cgroup usage | ⬜ | sampled cheaply; no agent; values exposed to health API |
| P2-S2 | Operator-owned budget and workload profiles | ⬜ | config/file owned by operator; app/worker cannot raise; hot reload |
| P2-S3 | Admission control | ⬜ | allow/queue/deny with a reason; reserve respected; no start over budget |
| P2-S4 | Durable queue, priority, dependencies, one heavy execution | ⬜ | pg-boss; one heavy at a time; light work separate; restart-safe |
| P2-S5 | Task estimation and measured history | ⬜ | declared profile + history; estimates never grant resources |
| P2-S6 | Cleanup sweeper and orphan detection | ⬜ | every terminal task has a cleanup result; repeated cleanup is safe |
| P2-S7 | Resource/system API | ⬜ | host, budget, active, queued, usage, cleanup; stable error codes |
| P2-S8 | Minimal dashboard UI | ⬜ | host health, budget, queue with reasons, usage, cleanup; empty/loading/error/offline |
| P2-S9 | Load test on 4 GB / 1 vCPU | ⬜ | heavy + light + browser-ish load; no host-wide exhaustion; documented numbers |

**P2 exit:** a second heavy task queues with a visible reason; lowering the budget changes admission without a restart; dashboard values match cgroup/host measurements.

---

## 6. P3 — First real workflow

**Goal:** One useful repo or deploy workflow, with gateway, approvals, audit and secrets.

**P3-S1 is blocked until the host facts and workflow choice are known.**

| ID | Story | Status | Acceptance / refs |
|---|---|---|---|
| P3-S1 | Choose and document the first workflow | ⛔ | repo fix/PR, Vercel deploy, or nginx deploy; host facts required |
| P3-S2 | Execution gateway skeleton in `apps/server/src/domain/gateway` | ⬜ | validate → authority → policy → approval → adapter → audit; no direct adapter calls |
| P3-S3 | Scoped, expiring, single-use approvals | ⬜ | exact scope hash; re-evaluated on resume; no "approve all" |
| P3-S4 | Append-only audit for decisions and effects | ⬜ | actor, task, capability, resource, rule, decision; no secrets |
| P3-S5 | Secret injection for one adapter call | ⬜ | secret store; no prompts/logs/client; value cleared after call |
| P3-S6 | First adapter (repo/Vercel/nginx) + fake adapter | ⬜ | schema validation; timeout; error taxonomy; rollback where applicable |
| P3-S7 | Result and evidence UI | ⬜ | command output, diff/deploy URL/health, verification, artifact links |
| P3-S8 | Cancel, retry and failure visibility | ⬜ | honest external-effect outcome; cleanup result; no silent retry |
| P3-S9 | End-to-end workflow test on the shared VPS | ⬜ | unapproved action denied; approved action audited; host unaffected |

**P3 exit:** the chosen workflow completes from chat with one scoped approval and inspectable evidence; an unapproved action is denied and audited.

---

## 7. P4 — OpenCode and agent presence

**Goal:** A real coding worker and avatars driven by real events.

| ID | Story | Status | Acceptance / refs |
|---|---|---|---|
| P4-S1 | OpenCode engine adapter | ⬜ | detect, version range, health, session, stream, cancel, normalized events |
| P4-S2 | Workspace lifecycle | ⬜ | clone/attach, per-run branch, diff capture, cleanup; one writer per project |
| P4-S3 | Verification and artifacts | ⬜ | tests/exit codes parsed; verified vs claimed; diff/log/test artifacts |
| P4-S4 | Wire `<microdots-bot>` into task card, task detail and agent roster | ⬜ | initials fallback; no customization UI; accessible name |
| P4-S5 | Map task/run events to avatar state | ⬜ | conceptual idle/thinking/working/waiting/blocked/done/failed mapped to the package catalog; event-driven, not guessed |
| P4-S6 | End-to-end fix-a-failing-test flow | ⬜ | real diff, real tests, honest result, approval for push |
| P4-S7 | Engine crash/cancel cleanup | ⬜ | no orphan process/workspace lock; task retryable or blocked with evidence |

**P4 exit:** a failing test is fixed and verified; the avatar reflects real state; killing the engine leaves an honest failure and a clean host.

---

## 8. P5 — Browser and human takeover

**Goal:** Use a browser only when API/CLI/HTTP cannot do the job, and hand control to the human when needed.

| ID | Story | Status | Acceptance / refs |
|---|---|---|---|
| P5-S1 | Tool preference order in policy/prompt | ⬜ | API/MCP → CLI → reliable HTTP → browser; browser requires a reason |
| P5-S2 | Shared browser service, started on demand | ⬜ | one instance; health; idle shutdown; no browser per agent |
| P5-S3 | Isolated context/profile per integration | ⬜ | no host display; downloads quarantined; profile lock handling |
| P5-S4 | Screenshot + input control | ⬜ | screenshot, click, type, scroll; no WebRTC required |
| P5-S5 | Human takeover for login/CAPTCHA/2FA | ⬜ | pause, notify, hand over, resume with preserved state |
| P5-S6 | Egress allowlist and SSRF defenses | ⬜ | block metadata/private IPs; re-resolve DNS; per-task allowlist |
| P5-S7 | Browser cleanup and budget | ⬜ | no Chromium process, temp profile, lock or port after task; memory in budget |
| P5-S8 | End-to-end login-gated workflow | ⬜ | human step required; resume; evidence; cleanup |

**P5 exit:** a login-gated workflow pauses for the human, resumes and completes; no browser process remains.

---

## 9. P6 — Memory graph and retrieval

**Goal:** Useful, cited memory without a second datastore.

| ID | Story | Status | Acceptance / refs |
|---|---|---|---|
| P6-S1 | Postgres schema: memory node, edge, source | ⬜ | provenance required; scope; confidence; timestamps; no secrets |
| P6-S2 | Explicit memory writes from decisions/notes/tasks | ⬜ | source citation; user-visible; no automatic sensitive writes |
| P6-S3 | Postgres full-text retrieval with citations | ⬜ | ranked results with source links; no vector DB required |
| P6-S4 | Prompt use as untrusted recalled data | ⬜ | labelled data, not instructions; injection tests |
| P6-S5 | `pgvector` evaluation and ADR before enabling | ⬜ | hybrid retrieval; same Postgres; measured need |
| P6-S6 | Memory UI: inspect, correct, forget, export, disable | ⬜ | deletion removes from retrieval; audit |
| P6-S7 | Retention and privacy controls | ⬜ | user-owned; export; no silent retention |
| P6-S8 | End-to-end recall/delete test | ⬜ | recall a prior decision with sources; delete it; verify gone |

**P6 exit:** a prior decision is recalled with citations; the owner can inspect, export and delete it; no separate vector database exists.

---

## 10. P7 — Optional surfaces (deferred)

| ID | Story | Status | Gate |
|---|---|---|---|
| P7-S1 | WebRTC live browser | ⏸ | only after screenshots/takeover are proven; 1 vCPU measurement |
| P7-S2 | Docker `ExecutionRuntime` adapter | ⏸ | native runtime stable; portability need |
| P7-S3 | Podman `ExecutionRuntime` adapter | ⏸ | measured demand; rootless constraints |
| P7-S4 | Managed Postgres/storage profile | ⏸ | explicit external dependency; direct connection; no autosuspend |
| P7-S5 | Resume deferred product track | ⏸ | personal operator stable; owner decision; `product-roadmap.md` |

---

## 11. Definition of done (every story)

1. Behavior exists in the backend, not only in the UI or a prompt.
2. Authorization is enforced server-side, and the agent cannot grant itself resources or capabilities.
3. Durable state survives a restart; unverified work is never marked complete.
4. Failure, retry, cancellation and cleanup are handled and visible.
5. Tests exist at the right level; policy branch coverage and contract harnesses are updated.
6. Logs/events are useful and secret-free.
7. UI states (empty, loading, error, offline) are covered where the story touches UI.
8. Docs and contracts are updated in the same PR.
9. `pnpm check && pnpm test` pass; Linux-only runtime tests are run or explicitly noted.
10. The end-to-end outcome is demonstrated on the target host, or the reason it could not be is recorded.
