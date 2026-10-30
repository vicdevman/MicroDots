# MicroDots — API and Event Contracts

**Status:** v1 draft (frozen at the fast-path milestone)
**Base URL:** `/api/v1`
**Auth:** session cookie (browser) or bearer token (CLI/automation)
**Related:** [`data-model.md`](./data-model.md) · [`security-and-auth.md`](./security-and-auth.md) · [`technical-architecture.md`](./technical-architecture.md)

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Transport | HTTPS only (except `localhost` in dev) |
| Format | JSON, `application/json; charset=utf-8` |
| IDs | ULID strings, opaque to clients |
| Time | ISO-8601 UTC with milliseconds (`2026-10-28T09:14:03.221Z`) |
| Casing | `camelCase` in JSON, `snake_case` in SQL |
| Versioning | Path prefix `/api/v1`; additive changes only within v1 |
| Pagination | Cursor-based: `?cursor=&limit=` (default 25, max 100) |
| Idempotency | `Idempotency-Key` header on all `POST`s that create work |
| Partial updates | `PATCH` with only changed fields; `null` clears, omission preserves |
| Errors | One envelope, stable codes (§3) |
| Streaming | SSE for server→client; no WebSocket in v1 |
| OpenAPI | Generated from Zod schemas at `/api/v1/openapi.json` (authenticated) |

### Response envelope

Single resources are returned directly. Collections:

```json
{
  "data": [ ... ],
  "nextCursor": "01JB8Z...",
  "hasMore": true
}
```

No wrapper for single objects:

```json
{ "id": "01JB8Z...", "status": "running", ... }
```

---

## 2. Authentication

### 2.1 Browser sessions

better-auth endpoints are mounted at `/api/auth/*` (sign-in, sign-out, passkey registration/authentication, session). The session cookie is:

| Attribute | Value |
|---|---|
| Name | `microdots.session` |
| Flags | `HttpOnly; Secure; SameSite=Lax; Path=/` |
| Lifetime | 30 days rolling, 7 days idle timeout (configurable) |
| Storage | Server-side session row; token hashed |

State-changing requests must also present `Origin`/`Referer` matching the configured public URL. The API rejects mismatches with `403 CSRF_ORIGIN_MISMATCH`. No CSRF token is required for JSON+same-origin+SameSite=Lax, but the origin check is mandatory.

### 2.2 Bearer tokens

```
Authorization: Bearer md_<prefix>_<secret>
```

- Stored as SHA-256 hash (`api_token.token_hash`).
- Scoped (`tasks:read`, `tasks:write`, `approvals:write`, …).
- Cannot exceed the creating user's permissions.
- Revocable; `last_used_at` updated at most once per minute.

### 2.3 First-run setup

`GET /api/v1/setup/status` (public, no auth):

```json
{ "needsSetup": true, "instanceId": null, "url": "https://dots.example.com" }
```

`POST /api/v1/setup/verify-token`:

```json
{ "token": "md_setup_..." }
```

Returns `204` and sets a short-lived (15 min) `microdots.setup` cookie. The token is single-use, printed to the installer output, and stored at `/data/secrets/setup-token`.

`POST /api/v1/setup/complete` (requires setup cookie):

```json
{
  "name": "Ada",
  "email": "ada@example.com",
  "password": "…",
  "passkey": { "credential": { ... } },
  "instance": { "defaultMode": "balanced", "telemetry": false }
}
```

Creates the owner, closes registration, deletes the setup token, issues a session. Idempotent: repeating after success returns `409 SETUP_COMPLETE`.

### 2.4 Authorization errors

| Situation | Status | Code |
|---|---|---|
| No/invalid session | 401 | `UNAUTHENTICATED` |
| Authenticated but not allowed | 403 | `FORBIDDEN` |
| Capability denied by policy | 403 | `POLICY_DENIED` |
| Approval required | 409 | `APPROVAL_REQUIRED` |

`POLICY_DENIED` includes the rule ID and a human explanation, never the raw policy internals.

### 2.5 Idempotency

Required on every mutating `POST` that creates work or changes a decision: `POST /tasks`, `POST /conversations/:id/messages`, `POST /approvals/:id/decide`, `POST /providers`, `POST /secrets`, `POST /projects`.

| Rule | Behavior |
|---|---|
| Key format | 1–255 printable characters; UUIDv7/ULID recommended |
| Scope | `(userId, route, key)` |
| Fingerprint | SHA-256 of canonicalized body |
| Retention | 24 hours |
| Same key + same fingerprint | Replay the stored status and body; add `Idempotent-Replayed: true` |
| Same key + different fingerprint | `409 IDEMPOTENCY_CONFLICT` |
| No key on a required route | `400 VALIDATION_FAILED` |
| After retention | Key may be reused; it is a new request |

Approval decisions have an additional natural idempotency rule: repeating the **same** decision on an already-decided approval returns `200` with the existing decision; a **different** decision returns `409 APPROVAL_ALREADY_DECIDED`. Consumption of an approved scope remains atomic and single-use.

The stored response never contains secrets. The idempotency record is written in the same transaction as the resulting row where possible; otherwise it is marked `pending` and completed on response.

---

## 3. Errors

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request could not be validated.",
    "details": [{ "path": "objective", "issue": "String must contain at least 3 character(s)" }],
    "requestId": "req_01JB8Z..."
  }
}
```

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Missing/expired session or token |
| `FORBIDDEN` | 403 | Authenticated, not authorized |
| `POLICY_DENIED` | 403 | Capability denied by policy |
| `NOT_FOUND` | 404 | Resource missing or not visible |
| `VALIDATION_FAILED` | 400 | Schema validation |
| `CONFLICT` | 409 | State conflict |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key, different body |
| `APPROVAL_REQUIRED` | 409 | Operation needs an approval |
| `APPROVAL_ALREADY_DECIDED` | 409 | Approval already has a different decision |
| `APPROVAL_EXPIRED` | 410 | Approval no longer valid |
| `TOO_MANY_STREAMS` | 429 | SSE connection limit reached |
| `INVALID_STATE_TRANSITION` | 409 | Illegal task/run transition |
| `BUDGET_EXCEEDED` | 402 | Task or instance budget hit |
| `ENGINE_UNAVAILABLE` | 503 | No healthy engine for the role |
| `PROVIDER_AUTH_FAILED` | 502 | Model provider rejected credentials |
| `UPSTREAM_TIMEOUT` | 504 | Adapter/engine exceeded deadline |
| `RATE_LIMITED` | 429 | Rate limit exceeded (`Retry-After`) |
| `SETUP_COMPLETE` | 409 | Instance already claimed |
| `CSRF_ORIGIN_MISMATCH` | 403 | Origin check failed |
| `INTERNAL` | 500 | Unexpected; `requestId` only |

Rules:

- `message` is safe to display.
- `details` never contains secrets, stack traces or SQL.
- 5xx responses always include `requestId` and log the full error server-side.

---

## 4. Rate limits

| Scope | Limit |
|---|---|
| Auth endpoints | 10 / min / IP |
| Setup endpoints | 5 / min / IP |
| Authenticated API | 300 / min / user |
| Task creation | 30 / min / user |
| Message send | 60 / min / user |
| SSE connections | 5 concurrent / user |
| Artifact download | 60 / min / user |

Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`. Exceeding returns `429` with `Retry-After`.

---

## 5. Resources

### 5.1 System

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Liveness (no deps) |
| GET | `/readyz` | Readiness (DB, queue, migrations) |
| GET | `/api/v1/system/info` | Version, instance id, uptime, public URL |
| GET | `/api/v1/system/health` | Rich health: db, queue, engines, providers, disk, memory, runtime, cleanup |
| GET | `/api/v1/system/resources` | Host metrics, PSI, operator budget, cgroup usage (P2) |
| GET | `/api/v1/system/queue` | Active/queued jobs with admission reasons (P2) |
| GET | `/api/v1/system/cleanup` | Last cleanup and orphan report (P2) |
| GET | `/api/v1/system/modules` | Loaded engines/adapters/providers/runtimes, versions, health, compatibility |
| GET | `/api/v1/system/audit` | Audit query (owner) |

Example `system/health`:

```json
{
  "status": "degraded",
  "version": "0.1.0",
  "checks": [
    { "id": "database", "status": "ok", "latencyMs": 3 },
    { "id": "queue", "status": "ok", "depth": 2 },
    { "id": "engine:opencode", "status": "ok", "version": "0.6.4" },
    { "id": "engine:cline", "status": "unhealthy", "message": "binary not found" },
    { "id": "provider:anthropic", "status": "ok" },
    { "id": "runtime:native", "status": "ok", "units": 1, "orphans": 0 },
    { "id": "cleanup:last", "status": "ok", "runId": "01J..." },
    { "id": "disk", "status": "warn", "freeGb": 2.1 }
  ]
}
```

### 5.2 Conversations

| Method | Path | Purpose |
|---|---|---|
| GET | `/conversations` | List, newest first |
| POST | `/conversations` | Create |
| GET | `/conversations/:id` | Detail + linked task ids |
| PATCH | `/conversations/:id` | Rename, archive, attach project |
| DELETE | `/conversations/:id` | Soft delete (30-day recovery) |
| GET | `/conversations/:id/messages` | Paginated, ascending |
| POST | `/conversations/:id/messages` | Send a user message, start a turn |

Send message:

```http
POST /api/v1/conversations/01JB.../messages
Idempotency-Key: 3f2c1a...
Content-Type: application/json

{
  "content": "The tests are failing on main. Find the cause, fix it, and show me the diff.",
  "clientMessageId": "c_01JB...",
  "projectId": "01JB..."
}
```

`202 Accepted`:

```json
{
  "messageId": "01JB...",
  "turnId": "turn_01JB...",
  "streamUrl": "/api/v1/turns/turn_01JB.../stream"
}
```

The request never waits for the model. The turn is queued (§6.1 of the architecture).

### 5.3 Turns (ephemeral model streaming)

| Method | Path | Purpose |
|---|---|---|
| GET | `/turns/:turnId/stream` | SSE of assistant deltas for this turn |
| POST | `/turns/:turnId/cancel` | Request cancellation |

Stream is **ephemeral**: it is not replayed. On reconnect, the client fetches the message by id; if the turn is still running, it resubscribes. Final content is persisted before the `done` event.

### 5.4 Tasks

| Method | Path | Purpose |
|---|---|---|
| POST | `/tasks` | Create a task directly (orchestrator-free) |
| GET | `/tasks` | Filter: `status`, `projectId`, `worker`, `engine`, `q`, cursor |
| GET | `/tasks/:id` | Detail: objective, plan, scope, runs, approvals, artifacts |
| POST | `/tasks/:id/cancel` | Request cancellation |
| POST | `/tasks/:id/retry` | Retry a failed/blocked task (new run) |
| POST | `/tasks/:id/instructions` | Add user direction to a running/waiting task |
| GET | `/tasks/:id/events` | SSE (durable replay) |
| GET | `/tasks/:id/artifacts` | List artifacts |

Create requires `Idempotency-Key`; retrying with the same key returns the original task.

Create:

```json
{
  "objective": "Fix the failing build and run the test suite.",
  "conversationId": "01JB...",
  "projectId": "01JB...",
  "workerRole": "coding",
  "engine": "opencode",
  "mode": "balanced",
  "successCriteria": ["npm test exits 0", "build succeeds"],
  "budget": { "maxUsd": 2, "maxDurationMs": 1800000 },
  "priority": 5,
  "dependsOn": []
}
```

`202`:

```json
{
  "id": "01JB...",
  "status": "queued",
  "workerRole": "coding",
  "createdAt": "2026-10-28T09:14:03.221Z"
}
```

Validation rules:

- `objective` 3–4000 chars.
- `mode` defaults to the instance setting; cannot exceed the caller's grants.
- `engine` is a request, not a guarantee; resolution is recorded on the run.
- `dependsOn` must reference visible tasks; cycles rejected with `VALIDATION_FAILED`.
- `budget` cannot exceed instance limits.

Task detail shape:

```json
{
  "id": "01JB...",
  "objective": "…",
  "status": "waiting_approval",
  "mode": "balanced",
  "risk": "R2",
  "project": { "id": "01JB...", "name": "acme-api" },
  "worker": { "id": "01JB...", "slug": "coder", "name": "Coder" },
  "engine": { "id": "01JB...", "provider": "opencode", "version": "0.6.4" },
  "runs": [ { "id": "01JB...", "attempt": 1, "status": "waiting_approval" } ],
  "pendingApprovals": [ { "id": "01JB...", "capability": "git.push", "risk": "R2" } ],
  "usage": { "inputTokens": 18234, "outputTokens": 2211, "costMicroUsd": 310000, "measured": true },
  "createdAt": "…",
  "startedAt": "…",
  "deadlineAt": "…"
}
```

### 5.5 Events

| Method | Path | Purpose |
|---|---|---|
| GET | `/tasks/:id/events?after=<seq>` | Durable task stream |
| GET | `/events?after=<globalSeq>` | User-scoped activity stream (lists, inbox) |

Headers:

```
Last-Event-ID: 184
Accept: text/event-stream
```

Frame format:

```
id: 184
event: task.progress
data: {"type":"task.progress","taskId":"01JB...","runId":"01JB...","ts":"…","data":{"message":"Running tests","percent":62}}

```

Heartbeat every 15 s as a comment (`: ping`). `retry: 3000` on connect. Server closes idle streams after 30 min; client reconnects with `Last-Event-ID`.

Replay guarantees:

- Per-task `seq` is gapless and monotonic.
- Replay returns events with `seq > after`, batched internally, then live events.
- Duplicate suppression is the client's job only for UI dedupe; the server never sends duplicates within a connection.
- If `after` is older than retention, the server sends `event: stream.reset` with the earliest available seq; the client refetches the task.

### 5.6 Approvals

| Method | Path | Purpose |
|---|---|---|
| GET | `/approvals?status=pending` | Inbox |
| GET | `/approvals/:id` | Full request + evidence |
| POST | `/approvals/:id/decide` | Approve / reject / request changes |

```json
{
  "decision": "approve",
  "note": "Push to the feature branch is fine.",
  "expectedScopeHash": "sha256:9f2c…"
}
```

- `expectedScopeHash` must match the stored approval scope (guards against UI staleness and tampering). It is optional; the approval id is authoritative.
- Approval is single-use; the gateway consumes it atomically on resume.
- `request_changes` closes the approval and returns the task to the worker with the note.
- Decisions are audited with actor, IP and timestamp.

### 5.7 Workers and engines

| Method | Path | Purpose |
|---|---|---|
| GET | `/workers` | Definitions + current load |
| GET | `/workers/:id` | Detail, capabilities (declared), recent runs |
| PATCH | `/workers/:id` | Name, model, limits, skills, enabled |
| GET | `/workers/:role/runs` | Recent runs |
| GET | `/engines` | Installed engines, health, version |
| POST | `/engines` | Register an engine (bundled or endpoint) |
| PATCH | `/engines/:id` | Enable/disable, config |
| DELETE | `/engines/:id` | Remove binding + registration |
| POST | `/engines/:id/health` | Force health check |
| GET | `/workers/:role/engines` | Binding order and strategy |
| PUT | `/workers/:role/engines` | Replace binding list |

Binding update:

```json
{
  "engines": [
    { "engineId": "01JB...", "strategy": "primary", "priority": 0 },
    { "engineId": "01JB...", "strategy": "fallback", "priority": 1 }
  ],
  "routing": { "fallbackOn": ["engine_unhealthy", "provider_quota"], "maxAttempts": 2 }
}
```

Engine registration is admin-only. Removing an engine never deletes task history; runs keep `engine_id` (FK `set null`).

### 5.8 Projects and grants

| Method | Path | Purpose |
|---|---|---|
| GET | `/projects` | List |
| POST | `/projects` | Create (name, repo, branch) |
| GET | `/projects/:id` | Detail, workspace status, grants |
| PATCH | `/projects/:id` | Rename, repo, default engine, mode override |
| DELETE | `/projects/:id` | Archive (tasks preserved) |
| GET | `/projects/:id/grants` | Effective grants |
| POST | `/projects/:id/grants` | Add a grant (owner only) |
| DELETE | `/projects/:id/grants/:grantId` | Revoke |
| POST | `/projects/:id/workspace/reset` | Re-clone (destructive, confirmed) |

Grant example:

```json
{
  "capability": "project.fs.write",
  "selector": "src/**",
  "constraints": { "readOnly": ["vendor/**", ".env*"] },
  "expiresAt": null
}
```

### 5.9 Skills

| Method | Path | Purpose |
|---|---|---|
| GET | `/skills` | Installed + bundled, with trust and requirements |
| GET | `/skills/:slug` | Manifest + instructions preview |
| PATCH | `/skills/:slug` | Enable/disable, bind to worker/project |
| POST | `/skills/install` | v0.2: install from path/registry |
| DELETE | `/skills/:slug` | Uninstall (never affects running tasks) |

### 5.10 Integrations

| Method | Path | Purpose |
|---|---|---|
| GET | `/integrations` | List with health |
| POST | `/integrations` | Register (MCP server, CLI, API) |
| PATCH | `/integrations/:id` | Config, enable/disable |
| DELETE | `/integrations/:id` | Remove + revoke credentials |
| POST | `/integrations/:id/health` | Force check |
| GET | `/integrations/:id/tools` | Discovered tools + capabilities + risk |

### 5.11 Notifications and push

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications?unread=true` | Inbox |
| POST | `/notifications/:id/read` | Mark read |
| POST | `/notifications/read-all` | Mark all |
| GET | `/notifications/preferences` | Per-kind channel settings |
| PATCH | `/notifications/preferences` | Update |
| POST | `/push/subscribe` | Register a PushSubscription |
| DELETE | `/push/subscribe` | Unregister by endpoint |
| POST | `/push/test` | Send a test notification |

### 5.12 Settings and audit

| Method | Path | Purpose |
|---|---|---|
| GET | `/settings` | Effective settings (secrets redacted) |
| PATCH | `/settings` | Update (validated, audited) |
| GET | `/audit?taskId=&actor=&from=&to=` | Audit query (owner) |
| GET | `/usage?from=&to=&projectId=` | Usage/cost rollup (costs in micro-USD) |

### 5.13 Model providers

| Method | Path | Purpose |
|---|---|---|
| GET | `/providers` | List providers, models, health; never returns keys |
| POST | `/providers` | Create provider + store its key via the secret store |
| GET | `/providers/:id` | Detail (redacted) |
| PATCH | `/providers/:id` | Rename, base URL, enable/disable, rotate key |
| DELETE | `/providers/:id` | Remove provider and revoke its secret |
| POST | `/providers/:id/test` | Live handshake: latency, model count, actionable error |
| GET | `/providers/:id/models` | Available models for the picker |

```json
POST /api/v1/providers
{
  "kind": "anthropic",
  "name": "Anthropic",
  "baseUrl": null,
  "apiKey": "sk-ant-…",
  "enabled": true
}
```

Response is metadata only (`id`, `kind`, `name`, `health`, `lastCheckedAt`). The key is written to `secret` with scope `instance` in the same transaction and never returned, logged or included in an event.

`POST /providers/:id/test` returns `200` with `{ status: "ok", latencyMs, models }` or `502 PROVIDER_AUTH_FAILED` with a safe message. This is the endpoint the setup wizard uses for **Test connection**.

### 5.14 Secrets

| Method | Path | Purpose |
|---|---|---|
| GET | `/secrets` | Metadata only: name, scope, last rotated, last used |
| POST | `/secrets` | Create (write-only value) |
| PUT | `/secrets/:id` | Rotate the value |
| DELETE | `/secrets/:id` | Revoke |

There is **no** endpoint that returns a secret value. Reads return metadata; the value is write-only. Creating or rotating a secret is audited without the value. Scope must be one of `instance`, `project`, `worker`, `integration`, `user`, and the caller must own that scope.

### 5.15 Sessions, devices and recovery

| Method | Path | Purpose |
|---|---|---|
| GET | `/sessions` | Current user's sessions: device, user agent, IP (truncated), last seen, current flag |
| DELETE | `/sessions/:id` | Revoke one session |
| DELETE | `/sessions` | Revoke all sessions except the current one |
| POST | `/auth/recovery/redeem` | Exchange a single-use recovery code for a session |
| POST | `/auth/reset/redeem` | Exchange a CLI-issued reset token for a session |

Passkey registration, authentication and listing use better-auth's `/api/auth/*` endpoints; the UI calls them through the same origin. Recovery codes are hashed, single-use and regenerated on use. The CLI reset path requires shell access on the host and invalidates all sessions.

### 5.16 Artifacts

| Method | Path | Purpose |
|---|---|---|
| GET | `/artifacts/:id` | Metadata: kind, name, size, sha256, created, task link |
| GET | `/artifacts/:id/content` | Streamed content, `Range` supported, `ETag` = sha256 |
| GET | `/tasks/:id/artifacts` | List for a task |

- Authorization is the same as the owning task; an artifact is never public.
- `Content-Disposition` is `attachment` unless the MIME type is on the inline-preview allowlist (images, text, JSON, PDF).
- Paths are resolved from the content-addressed store, never from user input.
- Size is capped (default 100 MB). Larger outputs are truncated with a recorded note, not silently dropped.
- `sha256` is returned so the client can verify integrity.

### 5.17 Runtime and resources (planned P1/P2)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/runs/:id` | Run state, unit/cgroup ref, profile, timestamps |
| GET | `/api/v1/runs/:id/usage` | Memory peak, CPU usage, PIDs, IO; measured vs estimate |
| POST | `/api/v1/runs/:id/stop` | Request cancel; returns outcome and cleanup state |
| POST | `/api/v1/system/cleanup` | Safe sweep; returns per-run cleanup results |
| GET | `/api/v1/system/resources` | Host memory/CPU/PSI/disk/load + MicroDots budget usage |
| GET | `/api/v1/system/queue` | Active/queued jobs, profile, age, stable queue reason |

Rules:

- Resource values are measured from the host/cgroup; estimates are labelled `measured: false`.
- The API never returns a way to raise a profile or cgroup value.
- Stop is idempotent; the response distinguishes `stopped`, `completed`, `timed_out`, `unknown`.
- Cleanup is safe to retry and always records a result.
- Only the owner may call system cleanup.

Example `runs/:id/usage`:

```json
{
  "runId": "01J...",
  "profile": "heavy",
  "memoryPeakBytes": 1457520640,
  "cpuUsageUsec": 81234000,
  "pidsPeak": 84,
  "ioReadBytes": 0,
  "ioWriteBytes": 1048576,
  "measured": true
}
```

### 5.18 Memory (planned P6)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/memory?q=...` | Search/retrieve with scope and citations |
| POST | `/api/v1/memory` | Create an explicit memory with a source |
| PATCH | `/api/v1/memory/:id` | Correct title/body/scope; audit |
| DELETE | `/api/v1/memory/:id` | Forget (soft delete); removes from retrieval |
| GET | `/api/v1/memory/:id/sources` | Provenance |
| GET | `/api/v1/memory/export` | Owner export (JSONL) |

Rules:

- Memory is scoped and permission-filtered before retrieval.
- Every result carries source citations; no citation, no result.
- Retrieved content is returned as data, never instructions.
- `pgvector` is an implementation detail; the API contract stays provider-agnostic.

---

## 6. Event vocabulary

Task events (`task_event.type`). Payloads are versioned and additive.

| Type | Emitted when | Key data |
|---|---|---|
| `task.created` | Task row created | objective, workerRole, mode |
| `task.queued` | Scheduler accepts it | priority, position?, reason |
| `run.admitted` | Admission decision | profile, decision, reason, estimate |
| `run.started` | Native unit starts | runId, unit, profile, engine |
| `run.usage` | Usage sample | memoryPeak, cpuUsec, pidsPeak, measured |
| `run.stopping` | Stop requested | mode, deadline |
| `run.stopped` | Stop finished | outcome, externalEffect |
| `run.cleanup` | Cleanup verified | status, checks |
| `run.cleanup_failed` | Cleanup failed | status, detail, retryable |
| `run.orphan_detected` | Reconciliation found an orphan | unit, reason, action |
| `task.started` | Run starts | runId, engine |
| `task.progress` | Worker milestone | message, percent?, phase |
| `plan.updated` | Orchestrator/worker revises plan | steps[] |
| `engine.selected` | Routing resolved | engineId, provider, version, strategy |
| `engine.started` | Engine handshake complete | sessionRef |
| `engine.tool` | Sandbox-local engine tool call (observability) | tool, status, durationMs |
| `tool.requested` | Gateway receives a boundary request | tool, capability, preview, decision |
| `tool.finished` | Boundary operation completes/denies | status, durationMs, errorCode? |
| `file.changed` | Workspace diff detected | path, changeType, +/-, sha |
| `command.started` / `command.finished` | Sandbox-local command execution | cmd (redacted), exitCode |
| `approval.requested` | Gateway needs consent | approvalId, capability, risk, expiresAt |
| `approval.decided` | User decides | approvalId, decision |
| `approval.expired` | TTL passed | approvalId |
| `task.waiting_input` | Needs clarification | question, options? |
| `task.blocked` | Cannot proceed | reasonCode, explanation, remediation |
| `task.retry_scheduled` | Transient failure | attempt, nextAttemptAt |
| `task.recovered` | Restart recovery succeeded | previousRunId, strategy |
| `task.recovery_failed` | Recovery not possible | reasonCode |
| `task.completed` | Verified completion | summary, verification, artifactIds |
| `task.failed` | Terminal failure | errorCode, message, retryable |
| `task.cancel_requested` | Cancellation requested | requestedBy, deadlineMs |
| `task.cancelled` | Cancellation finished | outcome, externalEffect |
| `artifact.created` | Artifact stored | artifactId, kind, name |
| `usage.recorded` | Token/cost measured | provider, model, costMicroUsd, measured |
| `message.linked` | Assistant message references task | messageId, taskId |
| `room.message` | Reserved for v0.5 collaboration | roomId, actor, content |
| `custom.*` | Module-specific | module payload (rendered generically) |

Rules:

- `task.completed` **must** carry a `verification` object: `{ "status": "verified" | "unverified" | "partial", "evidence": [...] }`.
- `task.failed` must carry `retryable: boolean`.
- Sensitive values are redacted before insert (`redacted: true`).
- Event schema changes are additive; clients ignore unknown fields.

### 6.1 Normalized engine events → task events

| Engine event | Task event |
|---|---|
| `engine.started` | `engine.started` |
| `engine.progress` | `task.progress` |
| `engine.tool` | `engine.tool` (sandbox-local observability; no policy decision) |
| `tool.requested` | `tool.requested` — emitted by the **gateway**, after policy, never by the engine |
| `file.changed` | `file.changed` |
| `command.finished` | `command.finished` |
| `engine.warning` | `task.progress` with `level: "warn"` |
| `engine.error` | `task.failed` or `task.retry_scheduled` (per taxonomy) |
| `engine.finished` | `task.completed` (after verification) |

`engine.tool` and `tool.requested` are distinct on purpose: the first is what the engine did inside its sandbox; the second is a boundary effect the gateway authorized. Only the second is an authorization record.

---

## 7. Internal contracts

These are not HTTP; they are TypeScript interfaces shared by the API and worker through `packages/contracts`.

### 7.1 Module manifest

One shape, defined once in `packages/contracts/modules.ts` and imported by the registry, the API and every module author. The engine-specific extension is §7.1.1.

```ts
interface ModuleManifest {
  id: string;
  apiVersion: 1;                       // contract version
  version: string;                     // module version
  kind: "engine" | "adapter" | "provider" | "channel";
  displayName: string;
  capabilities: CapabilityId[];
  configSchema: ZodType;
  healthCheck: boolean;
  streaming: boolean;
  cancellable: boolean;
  concurrency?: { perWorkspace: number; global: number };
  requires?: { binary?: string; env?: string[]; image?: string; versionRange?: string };
  docsUrl?: string;
}
```

#### 7.1.1 Engine manifest

`EngineManifest` is `ModuleManifest` with `kind: "engine"`, a `resultSchema`, and a required `workKind` (`coding | research | browser | generic`). Engines do not add fields that the registry cannot validate.

### 7.2 Gateway request/result

```ts
interface GatewayRequest {
  taskId: string;
  runId: string;
  workerDefinitionId: string;   // the role definition, not the process
  capability: CapabilityId;
  resource: string;
  input: unknown;               // validated against the tool schema
  reason: string;               // shown to the user in an approval
  // scopeHash is computed by the gateway from canonicalized input + resource; never supplied by the engine/tool.
  // The approval-decide endpoint accepts expectedScopeHash from the approval record as a staleness check.
}

type GatewayResult =
  | { decision: "allow"; result: unknown; auditId: string }
  | { decision: "deny"; code: string; reason: string; ruleId: string; auditId: string }
  | { decision: "approval_pending"; approvalId: string; expiresAt: string; auditId: string }
  | { decision: "clarify"; question: string; options?: string[] };
```

### 7.3 Policy evaluation

```ts
interface PolicyInput {
  actor: { type: "worker"; userId: string; workerDefinitionId: string; runId: string };
  worker: { role: string; capabilities: CapabilityId[]; limits: WorkerLimits };
  task: { id: string; mode: OperatingMode; projectId: string; resourceScope: TaskScope };
  instance: { enabledCapabilities: CapabilityId[] };
  capability: CapabilityId;
  resource: string;
  requestRisk: RiskClass;              // declared by the capability/tool, not the model
  grants: ProjectGrant[];
  now: Date;
}

interface PolicyDecision {
  decision: "allow" | "deny" | "approval_pending" | "clarify";
  ruleId: string;
  reason: string;
  approval?: { scope: Record<string, unknown>; expiresInMs: number; risk: RiskClass };
}
```

`workerDefinitionId` is a `worker_definition` row. The worker **process** is identified by `runId`. `task.risk` is not used to authorize an individual operation; `requestRisk` is.

The same function is used in tests, the API (preview) and the worker (enforcement). No environment-specific branches.

---

## 8. API evolution rules

1. Additive only within v1: new fields, new endpoints, new event types.
2. Never change the meaning of an existing field or enum value.
3. Removing a field requires a deprecation window of one minor release and a changelog note.
4. Clients must ignore unknown fields and unknown event types.
5. Breaking changes ship as `/api/v2` with both versions served for one minor.
6. The OpenAPI document is generated in CI and diffed; an undocumented change fails the build.

---

## 9. Client integration notes

- Use `EventSource` for SSE; set `withCredentials: true` via a fetch-based polyfill if needed for cross-origin (same-origin is the default).
- On `401`, redirect to login; on `403 POLICY_DENIED`, show the explanation, not a generic error.
- On `409 APPROVAL_REQUIRED`, navigate to the approval, not the task list.
- Mutations send `Idempotency-Key` (UUIDv7 or ULID). Retries reuse the key.
- Never optimistic-update task status; only events change status.
- After reconnect, refetch the task if `stream.reset` is received.
- Use `ETag`/`If-None-Match` on `GET /tasks/:id` (v0.2) for cheap polling fallback.
