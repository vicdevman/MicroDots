# MicroDots — Glossary

Terms are listed in the sense MicroDots uses them, not their most general meaning. When code, UI and docs disagree with this list, this list wins until updated.

| Term | Definition |
|---|---|
| **Admission** | The pre-run decision (`allow` / `queue` / `deny` / `downgrade`) against the operator budget and live host capacity. Never a grant of resources. |
| **Approval** | A scoped, expiring, single-use authorization for one exact operation. Not a mode, not a blanket permission. |
| **Artifact** | A stored output of a task: diff, log, test report, screenshot, file, link. Content-addressed; accessed only through authenticated endpoints. |
| **Backlog** | The live personal-operator story board in [`backlog.md`](./backlog.md), mapped to P0–P7. The deferred product board is [`product-backlog.md`](./product-backlog.md). |
| **Budget** | Operator-owned resource allowance (memory, CPU, PIDs, time, concurrency) with a reserved host headroom. The agent cannot raise it. |
| **cgroup v2** | Linux control-group hierarchy used to enforce per-execution memory, CPU, PID and IO limits and to find leftover processes. |
| **Capability** | A named, policy-checked permission to do something (`project.fs.write`, `git.push`). Declared by tools, granted by users, enforced by the gateway. |
| **Conversation** | A chat thread. Contains messages; may reference many tasks. Not the unit of work. |
| **Core** | The non-pluggable parts: task state machine, policy evaluator, approval semantics, event log, auth core, orchestrator loop. |
| **Decision (ADR)** | A recorded, hard-to-reverse architectural choice with context and consequences. See [`adr/`](./adr/). |
| **Durable queue** | A persistent job queue (pg-boss in Postgres) that survives restarts and supports retries and recovery. |
| **Egress** | Outbound network access from a worker/engine, restricted by allowlists to prevent SSRF and exfiltration. |
| **Engine** | An external agent runtime that performs work (OpenCode, Cline, a browser engine). Implements `ExecutionEngine`, lives in `packages/engines`, and is never imported by core. The PRD calls the OpenCode integration an "adapter"; this doc set treats it as an engine module. |
| **Adapter** | A gateway-side integration for a specific effect or service (git, deploy, HTTP, MCP). Implements `IntegrationAdapter`, lives in `packages/adapters`, and is invoked only by the gateway. |
| **Engine binding** | The mapping from a worker role to one or more engines with a routing strategy (primary, fallback, least-busy, pinned). |
| **Event** | An append-only record in `task_event` with a per-task sequence number and a normalized type. Source of truth for progress and replay. |
| **Evidence** | Verifiable proof of a result: command + exit code, test counts, diff, URL, API response. Required for "verified" completion. |
| **Execution gateway** | The only path from a proposed action to an effect. Validates input, evaluates policy, handles approval, executes the adapter, writes audit. |
| **ExecutionRuntime** | The module contract that starts/stops/limits an execution process: native systemd/cgroups (default), Docker, Podman, fake. Selected after policy/admission. |
| **Grant** | A durable, explicit permission row (`project_grant`) for a capability on a project, with optional selector and constraints. |
| **Helper (`microdots-exec`)** | The narrow root-owned service that starts/stops transient units and verifies cleanup. It never exposes arbitrary shell or systemd control. |
| **Host reserve** | The memory/CPU kept outside the MicroDots budget for the host and the existing production backends. |
| **Handoff / takeover** | A human taking control of a running browser or task step, then returning control with preserved state. |
| **Idempotency key** | Client-supplied key on a mutating request; the same key + body returns the same resource instead of creating a duplicate. |
| **Instance** | One self-hosted MicroDots deployment, owned by one user (until multi-user). |
| **Integration** | A configured connection to an external system (MCP server, CLI, API), exposed as tools with capabilities. |
| **Manifest** | A module's declarative description: id, version, kind, capabilities, config schema, health, requirements. |
| **MCP** | Model Context Protocol. A standard way to expose tools/resources to AI systems. Supported as an integration kind, not trusted by default. |
| **Memory graph** | Explicit, sourced nodes/edges in Postgres for recall. Every item has provenance; users can inspect, correct, forget and export. Not a hidden transcript index. |
| **Mode** | The user's routine-interruption level: `restricted`, `balanced`, `autonomous`. Never expands grants. |
| **Module** | Any pluggable component behind a contract: runtime, engine, adapter, provider, store, channel, skill, UI card. |
| **Orchestrator** | The primary AI that talks to the user, plans, creates tasks, assigns workers and reports. Cannot override policy. |
| **Policy engine** | The pure function that returns allow / deny / approve / clarify for a (actor, task, capability, resource) tuple. |
| **Project** | A repository or workspace with its own grants, default engine, mode override and history. Isolation boundary for tasks. |
| **RAG** | Retrieval-augmented generation. Retrieval is performed in Postgres (full-text first, optional `pgvector`), results are cited, and recalled text is untrusted data. |
| **Recovery** | The process of resuming or honestly failing interrupted work after a restart, without falsely marking it complete. |
| **Risk class** | R0 read-only · R1 reversible local write · R2 external side effect · R3 production/destructive · R4 secrets/host admin. |
| **Run** | One attempt of a worker on a task. Retries create new runs; history is preserved. |
| **Skill** | Reusable procedural guidance (`SKILL.md`). Never grants capabilities. |
| **Skill bank** | The bundled and installed collection of skills under `skills/`. |
| **SSE** | Server-Sent Events. One-way server→client stream with replay via `Last-Event-ID`. |
| **Shared browser** | One Chromium/Playwright service started on demand, with isolated contexts per integration; never one browser per agent. |
| **Standing grant** | A scoped, time-boxed, revocable pre-approval (later) that reduces repetition without becoming a blanket allow. |
| **Systemd transient unit** | A short-lived service/scope created per execution (`microdots-run-<id>`) with its own cgroup, logs and lifecycle. |
| **Task** | The durable unit of work: objective, state, scope, assignments, events, approvals, artifacts, result. Authoritative over chat. |
| **Tool** | A callable capability with a schema, risk class and execution contract. Only invocable through the gateway. |
| **UI card (generative)** | A validated, schema-checked result component the model may select but not author as code. |
| **Verification** | Confirming a claimed outcome through an authoritative signal (tests, exit code, API, deployment status). Required for `task.completed`. |
| **Worker (definition)** | A role with instructions, model, engine binding, skills, limits and a capability ceiling. Instantiated per task, not a permanently running process. |
| **Worker run** | One execution of a worker definition on a task; retries create new runs. |
| **Worker process** | The unprivileged process consuming queue jobs. Infrastructure, not a policy actor; policy names `workerDefinitionId` and `runId`. |
| **Workspace** | The project checkout an engine may read/write. Confined by the runtime, locked to one writer, never the host filesystem. |
