# MicroDots — Personal Operator Roadmap

**Status:** Active plan
**Last updated:** 2026-10-30
**Tracking board:** [`backlog.md`](./backlog.md)
**Execution and resource design:** [`native-execution-and-resources.md`](./native-execution-and-resources.md)
**Long-term product track (deferred):** [`product-roadmap.md`](./product-roadmap.md)

---

## 1. Mission

Build a **personal AI operator** that runs on one shared VPS and does real work for its owner: repository changes, pull requests, Vercel and nginx deployments, and cloud operations.

The operator must be:

- **resource-aware** — the VPS has 4 GB RAM and 1 vCPU and is shared with three production backends;
- **interruptible** — work survives a closed browser and a restart;
- **permissioned** — consequential actions pass through the gateway, policy, approvals and audit;
- **clean** — every task leaves no orphan process, session, temporary file or cache;
- **inspectable** — the owner can see host health, the MicroDots budget, active and queued jobs, usage, and cleanup state.

This is deliberately narrower than the open-source product described in [`master-prd.md`](./master-prd.md). The product track still exists, but it is deferred until the personal operator is genuinely useful. See [ADR-0013](./adr/0013-personal-operator-first.md).

---

## 2. Constraints that shape the plan

| Constraint | Consequence |
|---|---|
| 4 GB RAM / 1 vCPU, shared with three production backends | MicroDots gets an operator-owned budget, not the host. One heavy execution at a time. |
| Native systemd and cgroups v2 available on the host | Execution uses transient systemd services/scopes, not Docker by default. |
| Docker is not installed locally and is not the default runtime | Docker/Podman become optional `ExecutionRuntime` adapters, never a prerequisite. |
| The agent must not raise its own limits | Budgets and runtime profiles are operator configuration; the app/worker cannot edit them. |
| Browser work is occasional and expensive | One shared browser, started on demand, never one browser per agent. Screenshots first; WebRTC last. |
| The host already has production services | No port squatting, no global firewall rewrites, no unbounded caches, no host-wide package upgrades without approval. |
| One owner, one instance | Auth and recovery stay simple; multi-user remains deferred. |
| One Postgres is the only required stateful dependency | No Redis, vector DB or second queue without an ADR. Managed Postgres is an optional external provider. |

The detailed design, contracts and acceptance criteria live in [`native-execution-and-resources.md`](./native-execution-and-resources.md).

---

## 3. Phase overview

| Phase | Name | Outcome | Exit criterion |
|---|---|---|---|
| **P0** | Foundation (done) | Monorepo, CI, docs, M1A production spine, avatar package | `pnpm check && pnpm test && pnpm build` green; CI green; avatars build and test |
| **P1** | Native runtime | Run one execution under a transient systemd unit/scope with fixed cgroup limits, captured logs and verified cleanup | A sample job runs, is measured, can be stopped, and leaves no orphan process or temp state |
| **P2** | Resource-aware scheduler | Host metrics, operator budget, admission control, durable queue, one heavy task, cleanup verification, minimal dashboard | Over-budget or over-capacity work queues or is denied, visibly and durably |
| **P3** | First real workflow | Gateway, approvals, audit, secrets and one end-to-end workflow (repo change/PR, Vercel deploy, or nginx deploy) | A real change or deployment completes with scoped approval and evidence |
| **P4** | OpenCode and agent presence | OpenCode engine adapter, workspace flow, diffs/tests, avatars wired to agent state | A real failing test is fixed and verified; avatar state matches the task without leaking secrets |
| **P5** | Browser and human takeover | Shared browser lifecycle, tool preference order, screenshots, input, human login/CAPTCHA/2FA takeover | A login-gated workflow pauses, asks the human, resumes and finishes |
| **P6** | Memory graph and retrieval | Explicit memory graph in Postgres with provenance, full-text retrieval, optional pgvector, user controls | The operator recalls a prior decision with citations; the owner can inspect, export and delete it |
| **P7** | Optional surfaces | WebRTC live browser, Docker/Podman runtime adapters, managed Postgres/storage, deferred product track | Each is gated by a measured need and an ADR where required |

**P1–P4 are the fast path to a working operator.** P5–P7 are deliberate expansions, not prerequisites for daily use. P6 must not delay P1–P4.

---

## 4. Phase detail

### P0 — Foundation (complete)

**Goal:** A repository that a human or agent can enter and change safely.

**Already delivered**

- M0 monorepo, strict TypeScript, Biome, Vitest, Playwright, CI.
- Domain state machine and policy matrix with tests.
- M1A production spine: compose, multi-stage image, Caddy, boot migrations, first-boot secrets, static PWA serving, env generation, health/logging.
- `packages/avatars`: SVG morph engine, `<microdots-bot>` web component, per-agent shape/colour/expression, agent-state mapping. The package is built and tested but not yet wired into the web app.
- Documentation set, ADR log, backlog and operating rules.

**Exit:** `pnpm check`, `pnpm test`, `pnpm build` and CI are green. M1A remains available as an optional Docker reference deployment.

---

### P1 — Native execution runtime

**Goal:** Execute a task on the host without Docker and without letting it consume the host.

**Scope**

- `ExecutionRuntime` contract: prepare, start, stop, kill, capture logs, capture usage, cleanup, health.
- Native runtime adapter: transient systemd service or scope per execution.
- Privileged `microdots-exec` helper; app and worker remain unprivileged.
- cgroup v2 limits: memory high/max, CPU quota/weight, PIDs, IO where available.
- Workspace and temp-directory confinement; per-run environment; no inherited secrets.
- Log and usage capture; durable run record even if the unit dies.
- Stop, timeout and cleanup verification: no unit, process, session, temp directory, cache or port left behind.
- Boot reconciliation: units orphaned by a restart are detected and resolved honestly.

**Exit**

- A sample long-running job starts under its own transient unit and is visible in `systemctl`/cgroup inspection.
- The job cannot exceed the operator-assigned memory/CPU/PID limits.
- Stopping or timing out the job leaves no process, unit, temp directory or workspace lock.
- A worker restart does not mark an unfinished run complete.
- Unit and cleanup tests run on a Linux CI runner; local Windows development reports the runtime as unavailable rather than pretending.

**Demo:** Start a memory-hungry sample job, watch it hit its budget, stop it, and show a clean host.

---

### P2 — Resource-aware scheduler and dashboard

**Goal:** Never surprise the host, and show the owner exactly what is happening.

**Scope**

- Host metrics: memory, CPU, PSI, disk, load, cgroup usage.
- Operator-owned budget: MicroDots share, headroom reserved for the three backends, per-class limits.
- Admission control: reject, queue or downgrade work before it starts.
- Durable queue and scheduling: priority, dependencies, one heavy execution at a time, separate light work.
- Task estimation: a declared workload profile (light/standard/heavy/browser) plus measured history; estimation cannot grant resources.
- Cleanup sweeper and orphan detection.
- Minimal dashboard: host health, MicroDots budget, active/queued jobs, usage, last cleanup result, and a clear "why is this queued?" explanation.

**Exit**

- With the host near its reserve, new heavy work queues instead of starting.
- An operator can lower the MicroDots budget and see the effect without restarting the app.
- The dashboard reflects real cgroup and host values, not estimates.
- A task that completes or fails always produces a cleanup result.
- Queue and admission decisions survive a restart.

**Demo:** Fill the budget with one heavy job; submit a second; show it queued with a reason; lower the budget; show the queue behaviour change.

---

### P3 — First real workflow

**Goal:** The operator does one useful thing end to end, with the trust core intact.

**Choose one workflow after the VPS facts are known:**

1. **Repository fix/PR** — inspect a repo, make a change, run tests, show a diff, push a branch or open a PR after approval.
2. **Vercel deploy** — build/deploy a project, verify the deployment, roll back on failure.
3. **nginx deploy** — update a site config or release artifact, validate, reload, verify, roll back.

**Scope**

- Gateway remains the only path for boundary effects: git push/fetch, network egress, secret injection, deploy, host actions.
- Scoped, expiring, single-use approvals with audit.
- Secret store and injection only for the duration of one adapter call.
- One adapter for the chosen workflow, plus a fake adapter for tests.
- Result evidence: command output, diff, deployment URL/health, rollback path.
- UI: task timeline, approval card, result card, failure/retry/cancel states.

**Exit**

- The workflow runs on the shared VPS without touching the other backends.
- An unapproved push/deploy is denied and audited.
- A failed deploy has a recorded, tested rollback path.
- Secrets never appear in prompts, logs, events or the client.
- The operator can cancel and the cleanup result is visible.

**Demo:** Perform the real workflow from chat, approve the one consequential step, and inspect the evidence.

---

### P4 — OpenCode and agent presence

**Goal:** A real coding worker and a UI that shows which agent is doing what.

**Scope**

- OpenCode engine adapter: detect, version-check, health, session, stream, cancel, normalized events.
- Workspace lifecycle: clone/attach, per-run branch, diff capture, cleanup.
- Verification: tests/exit codes, "verified vs claimed", artifacts.
- Agent avatars: wire the existing `packages/avatars` component into task cards, task detail and the agent roster.
- Avatar states map to real task/run state: idle, thinking, working, waiting for approval, blocked, done, failed.
- Initials fallback; no customization UI; no avatar ever implies a capability or permission.

**Exit**

- A failing test in a fixture repo is diagnosed, fixed and verified.
- The diff and test output are visible and downloadable.
- The avatar changes state from real events, not from a client-side guess.
- Killing the engine leaves an honest failure and a cleanup result.
- No engine can read the database, host filesystem outside the workspace, or another project.

**Demo:** Fix a real failing test; the task card shows the agent working, waiting, then verified.

---

### P5 — Browser and human takeover

**Goal:** Operate the web when an API or CLI is not enough — without a browser per agent.

**Scope**

- Tool preference: API/MCP → CLI → reliable HTTP → browser automation.
- One shared browser service, started on demand and stopped after idle timeout.
- Isolated contexts/profiles per integration; downloads quarantined; no host display.
- Screenshot + input control first; DOM/accessibility snapshots where reliable.
- Human takeover for login, CAPTCHA and 2FA: pause, notify, hand over, resume with preserved state.
- Domain allowlists, SSRF defenses, untrusted-content handling.
- Browser session state separated from task state.

**Exit**

- A login-gated workflow pauses for the human, resumes and completes.
- No second browser instance is started while the shared one is healthy.
- Browser memory is inside the MicroDots budget; idle shutdown is verified.
- A browser task that fails or is cancelled leaves no Chromium process, profile lock or temp profile.
- No WebRTC required for this phase.

**Demo:** A site login with 2FA pauses, asks the owner, resumes and finishes; cleanup shows no browser process.

---

### P6 — Memory graph and retrieval

**Goal:** The operator remembers useful context without inventing a second brain or a second datastore.

**Scope**

- Explicit memory graph in Postgres: nodes, edges, sources, scope, confidence, timestamps.
- Sources cite task events, artifacts, user notes or explicit decisions. No memory without provenance.
- Retrieval: Postgres full-text first; hybrid keyword + vector only if `pgvector` is enabled by ADR.
- User controls: inspect, correct, forget, export, disable.
- Prompt use: retrieved memory is labelled as untrusted/recalled data, never as instructions.
- No automatic write of secrets, credentials or sensitive personal data.

**Exit**

- A prior decision can be recalled with citations to its source.
- Deleting a memory removes it from retrieval and is audited.
- The owner can export the graph.
- No separate vector database is introduced without an ADR.

**Demo:** Ask why a deployment pattern was chosen; get the decision, the task and the evidence, with links.

---

### P7 — Optional surfaces

Only after P1–P6 are stable:

- **WebRTC live browser** — last, because encoding is expensive on 1 vCPU. Screenshots and input remain the default.
- **Docker/Podman `ExecutionRuntime` adapters** — portability, not the default.
- **Managed Postgres/storage** — explicit external dependency, direct connection for migrations and pg-boss; no free-tier autosuspend.
- **Deferred product track** — auth polish, installer, passkeys, multi-user, mobile; see [`product-roadmap.md`](./product-roadmap.md).

---

## 5. Fast-path MVP definition

> The owner asks for a real repository change or deployment from chat. MicroDots admits it against the host budget, executes it in a confined native runtime, asks for the one consequential approval, produces evidence, cleans up completely, and survives a restart without lying about the result.

### 5.1 Must include

| Capability | Why |
|---|---|
| Native runtime + cgroup limits + verified cleanup | The host is shared and small |
| Operator budget, admission control, durable queue | Prevent host exhaustion and surprise failures |
| One real workflow through the gateway | Proves usefulness, not just plumbing |
| Scoped approvals + audit + secret handling | The trust core is the product |
| Task timeline, evidence, cancel/retry, honest recovery | Work must be inspectable |
| Minimal resource dashboard | The owner must see the host and the budget |
| Avatar state from real events | Agent presence without pretending |

### 5.2 Explicitly out of the fast path

- Multi-user, roles, invitations.
- Public installer/passkey polish.
- Marketplace, plugin SDK, skill management UI.
- Research worker, MCP catalog, multi-engine comparison.
- WebRTC live view.
- Memory graph and RAG (P6).
- Mobile app.
- Kubernetes, HA, multi-region.
- A second datastore.

Anything here that appears in P1–P4 is a scope bug. Cut it or move it later.

### 5.3 Fast-path demo

1. Open the dashboard; confirm the host reserve and MicroDots budget.
2. Ask: "The tests are failing in `acme-api`. Find the cause, fix it, and show me the diff."
3. Watch admission estimate the job, queue it if needed, and start one heavy execution.
4. See the agent avatar move from thinking to working from real events.
5. Inspect the diff and test output; approve the push/deploy.
6. Confirm the audit record, result evidence and cleanup result.
7. Restart the worker mid-task; confirm the task is recovered honestly, not marked complete.
8. Confirm no orphan process, unit, browser, temp directory or cache remains.

---

## 6. Sequencing rules

```text
P0 foundation
      │
      ▼
P1 native runtime + helper + cleanup
      │
      ▼
P2 budget + admission + queue + dashboard
      │
      ▼
P3 gateway + approvals + audit + first real workflow
      │
      ▼
P4 OpenCode + avatars
      │
      ├──► P5 browser + human takeover
      │
      ├──► P6 memory graph + retrieval
      │
      └──► P7 WebRTC / optional runtimes / product track
```

Hard rules:

1. **No scheduler before the native runtime can start, stop and clean up one job.**
2. **No write-capable worker before the gateway, policy and approvals exist** — the existing sequencing rule still applies.
3. **No second workflow before the first one is verified end to end.**
4. **No browser automation before the shared browser lifecycle and budget exist.**
5. **No WebRTC before screenshots and human takeover are proven.**
6. **No memory graph before the operator is useful without it.** Memory is a differentiator, not a crutch for a broken core.
7. **No Docker/Podman runtime adapter before the native runtime is stable.**
8. **No second datastore.** Any vector or graph database needs an ADR and a measured reason.

---

## 7. Initial resource assumptions (to validate)

These are starting points, not promises. P1/P2 must replace them with measurements.

| Item | Starting value | Notes |
|---|---|---|
| Host reserve | ≥ 1 GB RAM + headroom for the three backends | Never allocate the whole host |
| MicroDots budget | Operator-set; start below the reserve | Lowering it must not require a restart |
| Heavy executions | 1 at a time | Coding, browser, builds |
| Light work | Small concurrency | API, orchestration, notifications |
| Browser | On demand, idle shutdown | One shared browser, not per agent |
| Default task timeout | 30 min | Per-task override with a hard cap |
| Default model budget | Operator-set, hard stop | Cost is separate from host resources |
| Workspace retention | Explicit cleanup after task | No unbounded caches |

If a measurement contradicts these values, update this table and the native execution doc in the same PR.

---

## 8. Avatars in scope

The avatar package is already built. It is **not** a new core dependency and must not become one.

- **P4:** wire `<microdots-bot>` into the task card, task detail header and agent roster.
- **States (conceptual):** idle, thinking, working, waiting for approval, blocked, done, failed; these map onto the package's visual state catalog.
- **Rules:** state comes from task/run events; no client-side guessing; initials fallback; no customization UI in the fast path.
- **Security:** the avatar never receives task content, secrets or capabilities. It renders identity and state only.
- **Docs:** [`packages/avatars/README.md`](../packages/avatars/README.md).

---

## 9. Memory, vector DB and RAG position

- **Graph memory is in scope later (P6), not in the fast path.** It is an explicit graph in Postgres with provenance, not a hidden transcript index.
- **No separate vector database is planned.** Retrieval starts with Postgres full-text; `pgvector` is the likely next step if measurements justify it.
- **RAG is a retrieval feature, not a new store.** Sources are cited; retrieved content is untrusted data, never instructions.
- **One Postgres remains the invariant.** A dedicated graph/vector store requires an ADR and a measured reason.
- **User control is mandatory:** inspect, correct, forget, export, disable.

Details: [`native-execution-and-resources.md`](./native-execution-and-resources.md) §10 and [`decisions.md`](./decisions.md) §4/§5.

---

## 10. Deferred product track

The original open-source product plan (`M0`–`M11`, `E0`–`E20`) is preserved in [`product-roadmap.md`](./product-roadmap.md) and [`product-backlog.md`](./product-backlog.md). It is not deleted and not renumbered. It resumes only after the personal operator is stable and the owner chooses to productize.

---

## 11. Next action

1. Collect the host facts in [`native-execution-and-resources.md`](./native-execution-and-resources.md) §12: distro, systemd version, cgroup v2, current backends, ports 80/443, Postgres choice, access mode.
2. Start **P1**: `ExecutionRuntime` contract, `microdots-exec` helper, transient systemd unit, cgroup limits, logs/usage, stop and verified cleanup.
3. Do not start P2 until P1's cleanup test is real.
