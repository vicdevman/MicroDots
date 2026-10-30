# MicroDots — Native Execution, Resources and Browser

**Status:** Active design — P1/P2
**Audience:** Backend, infrastructure, security, agents
**Companions:** [`roadmap.md`](./roadmap.md) · [`backlog.md`](./backlog.md) · [`technical-architecture.md`](./technical-architecture.md) · [`security-and-auth.md`](./security-and-auth.md)

This document is the authoritative design for how MicroDots executes work on a **shared, small, native Linux host**. Docker Compose remains an optional reference deployment, not the default runtime.

---

## 1. Purpose and scope

MicroDots is becoming a personal operator on a VPS with **4 GB RAM and 1 vCPU**, shared with three existing production backends. It must do real work — repository changes, pull requests, Vercel/nginx deployments, cloud operations — without consuming the whole host.

In scope:

- a native `ExecutionRuntime` backed by **transient systemd units/scopes and cgroups v2**;
- a privileged helper while the app and worker stay unprivileged;
- operator-owned resource budgets, admission control, queues and concurrency;
- one shared browser, started on demand, with human takeover;
- verified cleanup after every task;
- a dashboard for host health, budget, jobs, usage and cleanup;
- an explicit, deferred memory/retrieval design.

Out of scope for P1/P2:

- multi-user, public installer polish, passkeys;
- Docker/Podman as the default runtime (they become optional adapters);
- WebRTC live browser (last);
- a dedicated graph or vector database;
- a second stateful service.

---

## 2. Host constraints

| Constraint | Design consequence |
|---|---|
| 4 GB RAM / 1 vCPU | MicroDots reserves headroom for the host and the three backends; only one heavy execution at a time. |
| Shared host | No host-wide package upgrades, firewall rewrites, port changes or Docker socket access without explicit operator action. |
| Native Linux | systemd + cgroups v2 are the execution substrate. Windows/macOS development reports the runtime unavailable. |
| Existing reverse proxy likely owns 80/443 | MicroDots binds only an internal port and integrates with the existing proxy; it does not squat the ports. |
| Production backends | The resource budget is operator-owned; a busy MicroDots task must never starve them. |
| One owner | Simple auth/recovery; no tenancy complexity in the fast path. |
| One Postgres | State, queue, audit, events and (later) memory retrieval live in Postgres. |

### 2.1 Honest limits

On 1 vCPU, a coding run, a build, and a browser are each heavy. MicroDots MUST NOT run two of them concurrently by default. If the operator wants more, they must explicitly raise the budget and accept the risk.

The system should degrade by **queueing**, not by silently overcommitting or killing production services.

---

## 3. Execution architecture

```text
User / PWA
   │ HTTPS
   ▼
Existing reverse proxy (nginx/Caddy/Traefik) ──► app (Fastify, unprivileged)
                                                   │
                                                   ├── Postgres (state, queue, audit)
                                                   ├── worker (unprivileged)
                                                   │      │
                                                   │      ├── scheduler + admission
                                                   │      ├── engine/adapters
                                                   │      └── gateway (boundary effects)
                                                   │
                                                   ▼
                                      microdots-exec (root, narrow API)
                                                   │
                                                   ▼
                                  transient systemd unit / scope + cgroup v2
                                                   │
                                                   ├── workspace (confined)
                                                   ├── engine process
                                                   └── logs + usage
                                                   │
                                  shared browser service (on demand)
```

### 3.1 Process roles

| Role | Privilege | Responsibility |
|---|---|---|
| `app` | Unprivileged user | HTTP API, auth, SSE, static PWA, task creation, policy evaluation, gateway decisions |
| `worker` | Unprivileged user | Queue consumers, orchestrator turns, scheduler, engine/adapter hosting |
| `microdots-exec` | Root, narrow API | Validates an execution request, starts/stops transient units, reads usage, verifies cleanup |
| execution unit | Unprivileged, per-run UID/GID or shared worker UID | Runs one engine/command inside the cgroup and workspace |
| browser service | Unprivileged, no host display | Shared Chromium/Playwright, on-demand, one or few contexts |
| Postgres | Local or managed | Truth, queue, audit, events, memory |

**Separation of concerns.** Agent definitions are durable configuration (role, model, prompt, capability ceiling, avatar). Task creation happens in the app. Scheduling and admission happen in the worker. Execution happens in a short-lived unit, not a long-lived agent process. This keeps agent identity separate from execution and lets the scheduler queue, stop or replace a run without killing an agent.\n\n`app` and `worker` share code and contracts. They never receive root, the Docker socket, or arbitrary systemd control.

### 3.2 Why a helper

Starting a transient systemd unit requires privilege. Giving the app/worker root would make every prompt-injection or adapter bug a host compromise. The helper exists to keep that power narrow:

- fixed, typed operations — no arbitrary shell, no arbitrary systemd properties;
- path and executable validation;
- profile-based cgroup limits (the caller cannot raise them);
- peer credential checks on a Unix socket;
- audit of every start/stop/cleanup;
- no secrets in the helper's request or logs.

The helper is not a general-purpose supervisor. If it cannot validate a request against an operator profile, it denies it.

---

## 4. Resource model

### 4.1 Operator-owned budget

The budget is a root-owned configuration file (for example `/etc/microdots/budget.toml`) plus a durable record of the active values. The app/worker can **read** it; they cannot raise it. Changes require the operator/root and are audited.

Example starting values (to be replaced by measurements):

```toml
[host]
reserve_memory = "1GiB"     # never allocate this to MicroDots
reserve_cpu = "0.15"        # leave room for the host and backends

[microdots]
memory_max = "2GiB"         # hard ceiling for all MicroDots cgroups
cpu_max = "0.85"            # fraction of one vCPU
tasks_max = 512

[profiles.light]
memory_high = "192MiB"
memory_max = "320MiB"
cpu_quota = "0.25"
pids_max = 128
timeout = "5m"

[profiles.standard]
memory_high = "768MiB"
memory_max = "1GiB"
cpu_quota = "0.60"
pids_max = 256
timeout = "20m"

[profiles.heavy]
memory_high = "1400MiB"
memory_max = "1800MiB"
cpu_quota = "1.0"
pids_max = 512
timeout = "45m"

[profiles.browser]
memory_high = "900MiB"
memory_max = "1200MiB"
cpu_quota = "0.80"
pids_max = 384
timeout = "30m"
```

These values must fit the host reserve. The helper MUST reject a profile whose `memory_max` exceeds the remaining MicroDots budget.

### 4.2 Workload profiles

| Profile | Used for | Concurrency |
|---|---|---|
| `interactive` | API/orchestrator turns, small fetches | small |
| `light` | CLI checks, git inspection, notifications | 1–2 |
| `standard` | tests, small builds, non-browser adapters | 1 |
| `heavy` | coding engine, large build, deploy | 1 |
| `browser` | Playwright/Chromium | 1, and not with `heavy` by default |

The agent may **request** a profile. It cannot grant itself one. Admission decides based on the operator budget, current usage and the task's declared/estimated need.

### 4.3 Admission control

Admission happens before a run starts, in the worker, using:

1. the operator budget and host reserve;
2. current cgroup usage and host memory/PSI;
3. the declared workload profile;
4. measured history for similar tasks (EWMA), if available;
5. queue priority and dependencies;
6. the "one heavy at a time" rule.

Decision:

| Decision | When | UI |
|---|---|---|
| `allow` | Fits budget and capacity | Start immediately |
| `queue` | Fits eventually, but not now | Queued with a reason and position |
| `deny` | Exceeds a hard limit or forbidden profile | Rejected with a stable code and remediation |
| `downgrade` | Operator policy allows a smaller profile | Start with the smaller profile, visibly |

No admission path may be bypassed by a prompt, an engine, or a model. The engine selection happens **after** policy and admission.

### 4.4 Backpressure

- If free host memory < reserve, stop dequeuing heavy work.
- If PSI memory stall is high, stop starting new heavy work.
- If queue depth exceeds the configured cap, reject new heavy tasks with `RESOURCE_QUEUE_FULL`.
- Priority: user-initiated > retries > maintenance.
- One workspace, one writer, enforced by a Postgres advisory lock.

### 4.5 Estimations

A task declares an estimated profile. The scheduler refines it with measured history. Estimations are hints for admission, never grants. A task that consistently exceeds its estimate is stopped at its cgroup limit, marked failed/blocked, and the history is updated.

---

## 5. `ExecutionRuntime` contract

The contract lives in `packages/contracts`. Core code imports the contract, never the native implementation.

```ts
interface ExecutionRuntime {
  readonly kind: "native" | "docker" | "podman" | "fake";
  health(): Promise<RuntimeHealth>;

  prepare(spec: ExecutionSpec): Promise<PreparedExecution>;
  start(prepared: PreparedExecution): Promise<RunningExecution>;

  stop(runRef: ExecutionRef, opts: StopOptions): Promise<StopOutcome>;
  kill(runRef: ExecutionRef): Promise<StopOutcome>;

  logs(runRef: ExecutionRef, opts: LogOptions): Promise<LogChunk>;
  usage(runRef: ExecutionRef): Promise<UsageSample>;

  cleanup(runRef: ExecutionRef): Promise<CleanupResult>;
  reconcile(): Promise<ReconcileResult>;
}
```

```ts
interface ExecutionSpec {
  runId: string;
  taskId: string;
  workspace: string;              // absolute, realpath-checked
  profile: WorkloadProfile;       // resolved by admission, not by the agent
  argv: string[];                 // no shell interpolation
  cwd: string;                    // inside workspace
  env: Record<string, string>;    // no long-lived secrets
  timeoutMs: number;
  network: "none" | "allowlisted";
  capture: { stdout: boolean; stderr: boolean; usage: boolean };
}
```

Rules:

- `argv` is an array; the runtime never invokes a shell.
- `workspace`/`cwd` are canonicalized and checked against the project root.
- `env` contains only run-scoped values; secrets are injected only inside a gateway adapter call.
- `profile` is the resolved operator profile; the runtime cannot raise it.
- Stop is always idempotent. Cleanup is always safe to retry.
- Every outcome distinguishes `stopped`, `completed`, `failed`, `timed_out`, `unknown`.

### 5.1 Native adapter

The native adapter:

1. validates the spec and resolves the profile;
2. asks `microdots-exec` to start a transient unit;
3. records the unit name and cgroup path;
4. streams/captures logs and usage;
5. stops/kills via the helper;
6. verifies cleanup;
7. reports honestly on restart.

### 5.2 Transient unit shape

The exact unit properties must be validated per distro. Baseline:

```ini
[Unit]
Description=MicroDots run %i
CollectMode=inactive-or-failed

[Service]
Type=exec
User=microdots-worker
Group=microdots
WorkingDirectory=/var/lib/microdots/workspaces/<project>/<run>
EnvironmentFile=/run/microdots/<run>/env
ExecStart=/usr/bin/env -i /path/to/engine ...
KillMode=control-group
KillSignal=SIGTERM
TimeoutStopSec=15
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=/var/lib/microdots/workspaces/<project>/<run>
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
LockPersonality=yes
CapabilityBoundingSet=
AmbientCapabilities=
RestrictAddressFamilies=AF_UNIX
IPAddressDeny=any
MemoryAccounting=yes
CPUAccounting=yes
TasksAccounting=yes
IOAccounting=yes
MemoryHigh=<profile>
MemoryMax=<profile>
CPUQuota=<profile>
TasksMax=<profile>
```

Notes:

- Network-enabled commands use a separate profile and an egress proxy/allowlist; the long-lived engine unit stays network-off.
- `ProtectSystem=strict` and `ReadWritePaths` must be tested with the engine's actual writes (cache, temp).
- A per-run cache directory may be allowed read/write, then deleted at cleanup.
- Do not use `--scope` blindly: a scope runs in the caller's cgroup unless explicitly configured. A transient service with a dedicated cgroup is easier to limit and observe.
- Unit names are `microdots-run-<runId>`; they are not user-controlled.

### 5.3 `microdots-exec` API

Suggested operations over a Unix socket (`/run/microdots/exec.sock`, `0660 root:microdots`):

| Operation | Input | Validation |
|---|---|---|
| `start` | `ExecutionSpec` + admission token | Peer UID/GID; profile exists; paths canonical; argv allowlist; no shell; budget fits |
| `stop` | `runId`, `mode` | Unit belongs to MicroDots; idempotent |
| `kill` | `runId` | Same; SIGKILL after TERM timeout |
| `logs` | `runId`, cursor | Unit belongs to MicroDots; size cap |
| `usage` | `runId` | Unit belongs to MicroDots |
| `cleanup` | `runId` | Unit belongs to MicroDots; removes only run-owned temp/cache |
| `reconcile` | none | Lists orphan `microdots-run-*` units and reports |

Peer credentials are checked with `SO_PEERCRED`. The helper never accepts arbitrary `ExecStart`, arbitrary unit properties, arbitrary paths, or a shell. It does not expose a generic `systemctl` passthrough.

Authentication is defense in depth: the worker is trusted core, but the helper still validates every request because the agent can influence command arguments.

### 5.4 Usage and logs

- **Logs:** journald with a unit-specific identifier, plus an optional capped stream to the artifact store. Secrets are redacted before persistence. Log retention is bounded.
- **Usage:** read cgroup `memory.peak`, `cpu.stat`, `pids.peak`/`pids.current`, `io.stat` where available; store a usage sample per run. If the helper dies, the DB still holds the run; on restart the cgroup may be gone, so the result is `unknown`/`interrupted`, not `completed`.
- **Events:** `task.started`, `task.progress`, `run.usage`, `task.cleanup`, `task.completed`/`failed`/`blocked`.

### 5.5 Stop, kill, timeout

1. Set `cancel_requested_at`, emit `task.cancel_requested`.
2. Helper sends `SIGTERM` to the unit's cgroup.
3. Wait `TimeoutStopSec` (default 15 s).
4. If still active, send `SIGKILL` to the cgroup.
5. Record whether the external effect was stopped, completed, or unknown.
6. Run cleanup and record the result.
7. Task ends `cancelled` only with a recorded outcome; uncertain external effects become `blocked` with a reconciliation note.

### 5.6 Cleanup verification

A cleanup is complete only when all are true:

- the transient unit is inactive/gone;
- the cgroup has no processes (`cgroup.procs` empty);
- the run's temp/cache directories are removed;
- workspace locks are released;
- no run-owned port is listening;
- no browser process/profile lock remains (if applicable);
- the result is written durably, even if cleanup failed.

Cleanup failure is visible and retryable. It is never silently ignored.

### 5.7 Boot reconciliation

On boot, the worker/helper:

1. lists `microdots-run-*` units and compares them to active runs in Postgres;
2. marks runs with no live unit as `interrupted` or `unknown`;
3. never marks unverified work `completed`;
4. cleans orphan units and temp dirs;
5. emits `task.recovered` / `task.recovery_failed`;
6. records a cleanup result.

---

## 6. Queue, scheduling and lifecycle

```text
task admitted
   → estimate profile
   → check budget/capacity
   → allow | queue | deny | downgrade
   → create worker_run
   → start native unit
   → capture events/logs/usage
   → stop/finish
   → cleanup + verify
   → terminal state + evidence
```

- The queue is durable in Postgres (pg-boss).
- Jobs carry IDs only; state is re-read at execution time.
- One heavy execution at a time by default.
- One writer per workspace via a Postgres advisory lock.
- A scheduler tick selects only tasks whose dependencies are complete and whose admission is current.
- A task cannot start from a stale admission decision after the budget changes.

### 6.1 Task classes

| Class | Example | Profile |
|---|---|---|
| Interactive | chat turn, plan | `interactive` |
| Light | git status, fetch docs via API/CLI | `light` |
| Standard | tests, small build, adapter call | `standard` |
| Heavy | coding engine, large build, deploy | `heavy` |
| Browser | login-gated site, screenshot | `browser` |

### 6.2 Queue reasons

Every queued task shows one stable reason:

- `RESOURCE_MEMORY`
- `RESOURCE_CPU`
- `RESOURCE_HEAVY_BUSY`
- `RESOURCE_BROWSER_BUSY`
- `RESOURCE_QUEUE_FULL`
- `DEPENDENCY_PENDING`
- `APPROVAL_PENDING`

The UI must explain what would unblock it.

---

## 7. Browser model and tool order

### 7.1 Tool preference

The operator MUST prefer the least expensive, most reliable tool:

1. **API or MCP** — structured, authenticated, cheap.
2. **CLI** — local tooling with an allowlisted command.
3. **Reliable HTTP** — a documented endpoint or static page.
4. **Browser automation** — only when the above cannot do it.

A browser task must record why the higher-preference tools were insufficient. This is policy, not a prompt suggestion.

### 7.2 Shared browser

- One shared Chromium/Playwright service, started on demand and stopped after idle timeout.
- No browser per agent. Tasks share the service; contexts/profiles are isolated per integration.
- Browser memory is inside the MicroDots budget and counts as a heavy execution.
- No host display. Downloads are quarantined. Egress is allowlisted; metadata/private IPs are blocked with DNS re-resolution.
- Browser session state is separate from task state; a restart does not pretend the session survived.

### 7.3 Human takeover

Order of control:

1. screenshot + input (click, type, scroll);
2. DOM/accessibility snapshot where reliable;
3. WebRTC live video **last**, only if measured to be affordable.

Takeover flow:

```text
task hits login/CAPTCHA/2FA
  → pause, preserve browser state
  → notify owner
  → owner opens takeover view
  → screenshot/input (or live view later)
  → owner completes the step
  → task resumes
  → evidence + cleanup
```

The owner's takeover is an authenticated, scoped, expiring session. It is audited. It does not grant the agent new capabilities.

---

## 8. Security boundaries

| Boundary | Rule |
|---|---|
| App/worker → helper | Unix socket, peer credentials, typed operations, profile allowlist |
| Helper → systemd | Only `microdots-run-*` units; no generic passthrough |
| Execution unit → host | Non-root, cgroup limits, no host HOME, no Docker socket, no arbitrary paths |
| Execution unit → network | None by default; allowlisted egress via a gateway/proxy profile |
| Engine → boundary effects | Gateway only; secrets injected per call |
| Browser → host | No display, no host filesystem, quarantined downloads, allowlisted egress |
| Model output → tools | Tool allowlist; policy outside the model; untrusted content labelled as data |
| Avatar → data | Identity and state only; never task content, secrets or capabilities |

The existing invariants still apply:

- the backend owns task state;
- every effect crossing the sandbox goes through the gateway;
- policy is code, not prose;
- deny by default;
- approvals are scoped, expiring, single-use and audited;
- secrets never reach the client, prompts or logs;
- a restart cannot mark unverified work as complete;
- one Postgres is the only required stateful dependency.

---

## 9. Dashboard and observability

The minimal dashboard answers four questions:

1. **Is the host healthy?** memory, CPU, PSI, disk, load, uptime.
2. **What is MicroDots allowed to use?** budget, current usage, reserve.
3. **What is running or waiting?** active, queued, profile, age, reason.
4. **Did the last task clean up?** cleanup status and orphans.

API surface (planned, see [`api-contracts.md`](./api-contracts.md) §5.17):

- `GET /api/v1/system/resources` — host, budget, usage, PSI.
- `GET /api/v1/system/queue` — active/queued jobs with reasons.
- `GET /api/v1/system/cleanup` — last cleanup and orphans.
- `GET /api/v1/runs/:id/usage` — per-run cgroup usage.
- `POST /api/v1/runs/:id/stop` — cancel with an outcome.
- `POST /api/v1/system/cleanup` — safe sweep.

Events: `run.admitted`, `run.queued`, `run.started`, `run.usage`, `run.stopping`, `run.stopped`, `run.cleanup`, `run.cleanup_failed`, `run.orphan_detected`.

Logs are structured JSON with `requestId`, `taskId`, `runId`, `profile`, `unit`, `decision`, `durationMs`. Secrets are redacted.

---

## 10. Memory graph, vector DB and RAG (deferred)

Memory is a later differentiator (P6), not part of the fast path. The design is deliberately conservative.

### 10.1 Graph memory

Use Postgres tables, not a graph database:

- `memory_node` — id, kind, title, body, scope, confidence, created_at, updated_at.
- `memory_edge` — from, to, relation, weight, created_at.
- `memory_source` — node/edge, source type (`task_event`, `artifact`, `note`, `decision`), source id, citation.
- Optional `memory_revision` for corrections.

Rules:

- **No memory without provenance.** Every node/edge cites a source.
- **Explicit writes win.** The owner can add/correct/forget; automatic writes are limited and reviewable.
- **No secrets.** Credentials, tokens, private keys and sensitive personal data are rejected by the memory writer.
- **Scoped retrieval.** Memory is retrieved for the task/project scope, not globally by default.
- **Prompt safety.** Retrieved text is labelled as untrusted recalled data, never instructions.
- **User control.** Inspect, correct, forget, export, disable.

### 10.2 Retrieval and RAG

Start with Postgres:

1. **Full-text search** (`tsvector`, GIN) over titles/bodies and task summaries.
2. **Metadata filters** (scope, kind, time, source).
3. **Hybrid** keyword + vector only if measurements justify it.

`pgvector` is the likely vector option because it stays in the same Postgres. Enabling it requires an ADR and a migration. A dedicated vector database is **not planned** and would violate the one-Postgres invariant without an ADR.

RAG pipeline:

```text
query
  → scope + permission filter
  → Postgres full-text (and vector if enabled)
  → rank + dedupe
  → fetch cited sources
  → prompt as labelled recalled data, with source ids
  → answer with citations
```

Retrieved content is never executed, never treated as policy, and never allowed to expand capabilities.

### 10.3 Why not now

- It does not make the first workflow work.
- It adds prompt-injection and privacy risk.
- It needs provenance and deletion semantics first.
- It must not become an excuse for a second datastore.

---

## 11. Optional runtimes and outsourcing

- **Docker/Podman** are `ExecutionRuntime` adapters, implemented only after native is stable.
- **Managed Postgres** is an explicit external dependency, not the default. Use a direct connection (not a transaction pooler) for migrations and pg-boss. Avoid free-tier autosuspend.
- **Object storage** can replace local artifact storage via the existing adapter when artifacts outgrow the host.
- **Outsourcing** is allowed where it removes operational burden, but the control plane and task truth stay local.

---

## 12. Host facts still needed

Before P3, collect and record:

- distro and version;
- systemd version;
- cgroup v2 mounted and delegated? (`/sys/fs/cgroup/cgroup.controllers`)
- whether the three backends run under systemd or Docker;
- what owns ports 80/443 (nginx, Caddy, Traefik, other);
- available disk and current disk usage;
- Postgres choice (local vs managed) and connection mode;
- access mode (Tailscale/Cloudflare Access vs public auth);
- current memory/CPU headroom at idle and under production load;
- first workflow choice.

Do not hard-code assumptions about the host. The runtime must detect and report.

---

## 13. Acceptance criteria for P1/P2

P1 is done only when:

- one execution starts in a transient unit with a dedicated cgroup;
- memory/CPU/PID limits are enforced, and the task cannot raise them;
- logs, exit status and usage are durable;
- stop/timeout kills the whole cgroup;
- cleanup verifies no unit, process, temp dir, lock, port or cache remains;
- a restart produces an honest `interrupted`/`blocked` state;
- Linux CI covers the native path; other platforms report unavailable.

P2 is done only when:

- the dashboard shows host, budget, queue, usage and cleanup;
- a second heavy task queues with a visible reason;
- lowering the budget changes admission without a restart;
- the three backends retain their reserve under load;
- queue and admission survive a restart;
- every terminal task has a cleanup result.

---

## 14. Open questions

1. Exact systemd unit properties that work with OpenCode and the chosen distro.
2. Whether a transient service or a delegated scope gives cleaner cleanup for child processes.
3. Whether the helper should run as root or as a narrowly scoped systemd manager user.
4. Whether browser contexts can share one Chromium on 1 vCPU without violating the budget.
5. Whether `pgvector` is needed after full-text retrieval is measured.
6. Whether managed Postgres is acceptable for pg-boss latency and migrations.
7. Which reverse proxy integration is least invasive on the shared host.

These are recorded in [`decisions.md`](./decisions.md) §4/§5 until resolved.

---

## 15. Related decisions

- [ADR-0011](./adr/0011-native-systemd-execution.md) — native systemd/cgroup execution is the default; Docker is optional.
- [ADR-0012](./adr/0012-operator-owned-resource-budgets.md) — budgets are operator-owned and admission-controlled.
- [ADR-0013](./adr/0013-personal-operator-first.md) — personal operator first; product track deferred.
- [ADR-0002](./adr/0002-postgres-only-pg-boss.md) — one Postgres; no second datastore.
