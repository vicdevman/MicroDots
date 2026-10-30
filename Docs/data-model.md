# MicroDots — Data Model

**Status:** Logical schema, v1 draft
**Database:** PostgreSQL 17
**ORM:** Drizzle (SQL-first, typed)
**Related:** [`api-contracts.md`](./api-contracts.md) · [`technical-architecture.md`](./technical-architecture.md) · [`security-and-auth.md`](./security-and-auth.md) · [`native-execution-and-resources.md`](./native-execution-and-resources.md)

---

## 1. Principles

1. **Postgres is the only source of truth.** Tasks, events, approvals, audit, the queue and (later) memory all live here. No Redis, vector DB or second store without an ADR.
2. **Append-only where truth matters.** Events and audit records are never updated or deleted by application code (retention jobs excepted, with policy).
3. **IDs are ULIDs.** Lexicographically sortable, opaque, safe in URLs. Auth tables use better-auth's own IDs.
4. **Timestamps are `timestamptz`, UTC.** Never store local time.
5. **State transitions are validated in the domain layer and constrained in the DB** where practical (enums + transition checks).
6. **Secrets are ciphertext.** The database never contains a plaintext API key.
7. **Forward-only migrations.** No down migrations in production; rollback is restore + redeploy.
8. **Denormalize for the read path, not the write path.** Only after measurement.

---

## 2. Entity map

```text
user ─┬─ session / account / passkey / api_token
      ├─ conversation ── message
      ├─ notification ── notification_delivery
      └─ push_subscription

project ─┬─ workspace
         ├─ project_grant
         ├─ project_member (v0.5)
         └─ task

conversation ── task ─┬─ task_dependency
                      ├─ task_event
                      ├─ worker_run ── approval
                      │             └─ artifact
                      ├─ artifact
                      └─ usage_record

worker_definition ── worker_run
worker_definition ── engine_binding ── engine
worker_definition ── skill_binding ── skill

integration ── integration_tool
secret (scoped to project | worker | integration | instance)

room ── room_member
     └─ room_message

audit_log   (references everything, owned by nothing)
system_state
admission_decision ── resource_sample ── cleanup_record   (P1/P2)
memory_node ── memory_edge ── memory_source                (P6)
```

`pg-boss` owns its own schema (`pgboss`) for queue jobs. Application code never reads it directly; the runtime wrapper does.

Resource budget values are operator-owned configuration, but admission decisions, usage samples and cleanup results are durable rows for audit and the dashboard.

---

## 3. Enums

| Enum | Values |
|---|---|
| `task_status` | `draft`, `queued`, `running`, `waiting_approval`, `waiting_input`, `blocked`, `retrying`, `completed`, `failed`, `cancelled` |
| `run_status` | `created`, `starting`, `running`, `waiting_approval`, `waiting_input`, `completed`, `failed`, `cancelled`, `interrupted` |
| `approval_status` | `pending`, `approved`, `rejected`, `changes_requested`, `expired`, `cancelled` |
| `risk_class` | `R0` read-only · `R1` reversible local write · `R2` external side effect · `R3` production/destructive · `R4` secrets/host admin |
| `operating_mode` | `restricted`, `balanced`, `autonomous` |
| `worker_kind` | `orchestrator`, `coding`, `research`, `browser`, `integration`, `devops`, `review`, `documentation`, `custom` |
| `engine_kind` | `coding`, `research`, `browser`, `generic` |
| `artifact_kind` | `diff`, `log`, `test_report`, `report`, `file`, `link`, `screenshot`, `deployment` |
| `notification_kind` | `task_started`, `task_progress`, `task_completed`, `task_failed`, `task_blocked`, `approval_required`, `input_required`, `takeover_required`, `system_health`, `security` |
| `integration_kind` | `mcp`, `cli`, `api`, `browser_profile` |
| `secret_scope` | `instance`, `project`, `worker`, `integration`, `user` |
| `actor_type` | `user`, `worker`, `system`, `scheduler` |
| `skill_source` | `bundled`, `local`, `community` |
| `trust_tier` | `bundled`, `verified`, `local`, `untrusted` |
| `delivery_status` | `pending`, `sent`, `failed`, `skipped` |

Enums are additive. Removing or renaming a value requires a migration that rewrites existing rows and an ADR.

---

## 4. Tables

### 4.1 Authentication (managed by better-auth)

better-auth owns these tables and their migrations. MicroDots does not hand-edit them; it references `user.id` everywhere.

| Table | Purpose |
|---|---|
| `user` | identity: id, name, email, emailVerified, image, role, createdAt, updatedAt |
| `session` | server-side sessions: id, userId, token (hashed), expiresAt, ipAddress, userAgent, createdAt |
| `account` | credential records (password hash, OAuth links) |
| `verification` | email/OTP verification tokens |
| `passkey` | WebAuthn credentials: id, userId, publicKey, counter, deviceType, backedUp, transports, name |

**Instance ownership:** `system_state.instance.owner_user_id`. Registration is closed after the owner is created until invitations exist (v0.5). Enforced in the auth hook, not the UI.

### 4.2 Access and API tokens

```sql
create table api_token (
  id            text primary key,              -- ulid
  user_id       text not null references "user"(id) on delete cascade,
  name          text not null,
  token_hash    text not null unique,          -- sha256 of token, never plaintext
  scopes        text[] not null default '{}',  -- e.g. {tasks:read,tasks:write}
  last_used_at  timestamptz,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);
```

Only the hash is stored. The plaintext is shown once at creation. Scoped tokens cannot exceed the owning user's permissions.

### 4.3 Instance and settings

```sql
create table system_state (
  key         text primary key,                -- 'instance', 'versions', 'last_backup', ...
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create table setting (
  key         text primary key,                -- 'default_mode', 'retention', 'telemetry'
  value       jsonb not null,
  updated_by  text references "user"(id),
  updated_at  timestamptz not null default now()
);
```

Settings are validated by the config package before write. Secrets never live here (see §4.13).

### 4.4 Projects and workspaces

```sql
create table project (
  id                text primary key,
  name              text not null,
  slug              text not null unique,
  repo_url          text,
  default_branch    text not null default 'main',
  local_path        text not null,             -- /workspaces/<id>
  default_engine_id text references engine(id),
  mode_override     operating_mode,
  settings          jsonb not null default '{}',
  created_by        text references "user"(id),
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table workspace (
  id             text primary key,
  project_id     text not null references project(id) on delete cascade,
  path           text not null,
  base_commit    text,
  branch         text,
  status         text not null default 'ready', -- ready|locked|dirty|missing|error
  locked_by_run  text,
  last_used_at   timestamptz,
  created_at     timestamptz not null default now()
);

create table project_grant (
  id           text primary key,
  project_id   text not null references project(id) on delete cascade,
  capability   text not null,                 -- 'project.fs.write'
  selector     text,                          -- path glob, env name, command id
  constraints  jsonb not null default '{}',   -- read-only paths, allowed domains, expiry
  granted_by   text references "user"(id),
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (project_id, capability, selector)
);
```

`project_grant` is the durable authorization. It is independent of operating mode; mode changes do not mutate grants.

### 4.5 Engines, bindings and model providers

```sql
create table engine (
  id            text primary key,
  kind          engine_kind not null,
  provider      text not null,                -- 'opencode' | 'cline' | 'codex-cli' | ...
  display_name  text not null,
  version       text,
  endpoint      text,                         -- internal URL, nullable for in-process
  config        jsonb not null default '{}',  -- non-secret; validated by manifest
  enabled       boolean not null default true,
  health        text not null default 'unknown', -- healthy|degraded|unhealthy|unknown
  capacity      int not null default 1,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (provider, endpoint)
);

create table engine_binding (
  id           text primary key,
  worker_role  text not null,                 -- 'coding', 'research', ...
  engine_id    text not null references engine(id) on delete cascade,
  strategy     text not null default 'primary', -- primary|fallback|least_busy|round_robin|pinned
  priority     int not null default 0,
  config       jsonb not null default '{}',
  enabled      boolean not null default true,
  unique (worker_role, engine_id)
);

create table model_provider (
  id          text primary key,
  kind        text not null,                  -- 'openai-compatible'|'anthropic'|'google'|'ollama'
  name        text not null,
  base_url    text,
  config      jsonb not null default '{}',    -- non-secret settings
  secret_id   text references secret(id),     -- API key reference
  enabled     boolean not null default true,
  health      text not null default 'unknown',
  last_checked_at timestamptz,
  created_at  timestamptz not null default now()
);
```

Multiple engines and multiple providers are first-class. A task may request an engine (`requested_engine_id`), but the engine that actually executed it is recorded per run (`worker_run.engine_id`) for auditability.

### 4.6 Conversations and messages

```sql
create table conversation (
  id            text primary key,
  user_id       text not null references "user"(id) on delete cascade,
  project_id    text references project(id) on delete set null,
  title         text,
  archived_at   timestamptz,
  last_message_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table message (
  id            text primary key,
  conversation_id text not null references conversation(id) on delete cascade,
  role          text not null,                -- user|assistant|system
  content       text not null default '',
  content_json  jsonb,                        -- validated UI cards, citations, plan refs
  task_ids      text[] not null default '{}',
  turn_id       text,
  model         text,
  input_tokens  int,
  output_tokens int,
  status        text not null default 'complete', -- streaming|complete|failed
  created_at    timestamptz not null default now()
);

create index on message (conversation_id, created_at);
```

A message is not a task. A conversation can contain many tasks; a task can be referenced by many messages (`§19.6`).

### 4.7 Tasks

```sql
create table task (
  id                   text primary key,
  conversation_id      text references conversation(id) on delete set null,
  parent_task_id       text references task(id) on delete set null,
  project_id           text references project(id) on delete set null,
  worker_role          text not null default 'coding',
  requested_engine_id  text references engine(id) on delete set null, -- optional pin; resolved engine is on worker_run
  skill_id             text references skill(id) on delete set null,
  objective            text not null,
  normalized_objective text,
  status               task_status not null default 'draft',
  priority             smallint not null default 5,       -- 0 highest
  mode                 operating_mode not null,
  risk                 risk_class not null default 'R1',
  success_criteria     jsonb not null default '[]',
  scope                jsonb not null default '{}',       -- paths, env, domains
  budget               jsonb not null default '{}',       -- maxUsd, maxTokens, maxDurationMs
  usage                jsonb not null default '{}',
  result               jsonb,
  result_summary       text,
  error                jsonb,
  attempt              int not null default 0,
  max_attempts         int not null default 2,
  idempotency_key      text,
  event_seq            bigint not null default 0,         -- atomic per-task counter
  version              int not null default 0,            -- optimistic lock
  created_by           text references "user"(id),
  created_at           timestamptz not null default now(),
  started_at           timestamptz,
  deadline_at          timestamptz,
  finished_at          timestamptz,
  cancel_requested_at  timestamptz
);

create unique index on task (created_by, idempotency_key)
  where idempotency_key is not null;
create index on task (status, priority, created_at)
  where status in ('queued','retrying');
create index on task (conversation_id);
create index on task (project_id, created_at desc);
```

`event_seq` is incremented atomically:

```sql
update task set event_seq = event_seq + 1 where id = $1 returning event_seq;
```

The returned value is used inside the same transaction as the event insert. This guarantees gapless, monotonic per-task ordering without a global sequence.

### 4.8 Task dependencies

```sql
create table task_dependency (
  task_id        text not null references task(id) on delete cascade,
  depends_on_id  text not null references task(id) on delete cascade,
  condition      text not null default 'completed', -- completed|succeeded
  primary key (task_id, depends_on_id),
  check (task_id <> depends_on_id)
);
```

Cycles are rejected in the domain layer before insert (`ORC-005`). The DB constraint prevents self-dependency only; cycle detection is tested exhaustively.

### 4.9 Task events (append-only)

```sql
create table task_event (
  id         text primary key,
  task_id    text not null references task(id) on delete cascade,
  seq        bigint not null,                 -- per-task, gapless
  global_seq bigint generated always as identity, -- cross-task feed cursor
  type       text not null,
  actor_type actor_type not null,
  actor_id   text,
  run_id     text references worker_run(id) on delete set null,
  payload    jsonb not null default '{}',
  redacted   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (task_id, seq)
);

create index on task_event (task_id, seq);
create index on task_event (global_seq);
create index on task_event (created_at);
```

Event types are a controlled vocabulary (see `api-contracts.md` §6). Unknown types are persisted as `custom.*` and rendered generically — but the core never depends on them.

**Never update or delete** a `task_event` in application code. Retention deletes whole tasks, not individual events.

### 4.10 Worker definitions and runs

```sql
create table worker_definition (
  id               text primary key,
  slug             text not null unique,      -- 'coder', 'researcher'
  name             text not null,
  kind             worker_kind not null,
  description      text,
  instructions     text,
  avatar           text,
  model_provider_id text references model_provider(id),
  model            text,
  skills           text[] not null default '{}',
  declared_caps    jsonb not null default '[]', -- capability ceiling; effective = ceiling ∩ grant ∩ task scope
  limits           jsonb not null default '{}', -- concurrency, timeout, budget
  enabled          boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table worker_run (
  id             text primary key,
  task_id        text not null references task(id) on delete cascade,
  worker_id      text not null references worker_definition(id),
  engine_id      text references engine(id),
  attempt        int not null default 1,
  status         run_status not null default 'created',
  session_ref    text,                        -- engine session id
  runtime_kind   text,                        -- native|docker|podman|fake (P1)
  unit_ref       text,                        -- microdots-run-<id> / container id
  profile        text,                        -- resolved workload profile
  heartbeat_at   timestamptz,
  error_code     text,
  error          jsonb,
  usage          jsonb not null default '{}',
  output         jsonb,
  cancel_requested_at timestamptz,
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index on worker_run (task_id);
create index on worker_run (status, heartbeat_at);

`worker_definition` is the role and capability ceiling. `worker_run` is one execution. The worker *process* (the queue consumer) is infrastructure and never appears in policy input. Effective permission = `declared_caps` ∩ `project_grant` ∩ task scope; a grant cannot exceed the worker's ceiling.
```

One active run per task, enforced by a partial unique index:

```sql
create unique index one_active_run_per_task on worker_run (task_id)
  where status in ('created','starting','running','waiting_approval','waiting_input');
```

### 4.11 Approvals

```sql
create table approval (
  id            text primary key,
  task_id       text not null references task(id) on delete cascade,
  run_id        text references worker_run(id) on delete set null,
  capability    text not null,               -- exact capability
  resource      text not null,               -- exact target (path, env, command id)
  scope         jsonb not null default '{}', -- arguments hash, branch, domain
  risk          risk_class not null,
  reason        text not null,
  status        approval_status not null default 'pending',
  requested_by  text,                        -- worker id
  decided_by    text references "user"(id),
  decision_note text,
  expires_at    timestamptz not null,
  decided_at    timestamptz,
  consumed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index on approval (status, expires_at)
  where status = 'pending';
create index on approval (task_id);
```

Rules enforced by the gateway (not only the DB):

- `scope` includes a hash of the exact arguments. Resume re-validates it.
- `consumed_at` makes an approval single-use.
- Expired approvals cannot be consumed.
- A new operation requires a new approval, even if a similar one was granted.

### 4.12 Artifacts

```sql
create table artifact (
  id           text primary key,
  task_id      text not null references task(id) on delete cascade,
  run_id       text references worker_run(id) on delete set null,
  kind         artifact_kind not null,
  name         text not null,
  mime         text,
  size_bytes   bigint,
  sha256       text not null,
  storage_key  text not null,                -- content-addressed path or object key
  preview      jsonb,                        -- small inline summary for the UI
  created_at   timestamptz not null default now(),
  expires_at   timestamptz
);

create index on artifact (task_id);
create unique index on artifact (sha256, storage_key);
```

Content is stored by the `ArtifactStore` module (local disk in v1). The DB stores metadata only. Downloads are authenticated and path-checked.

### 4.13 Secrets

```sql
create table secret (
  id           text primary key,
  name         text not null,
  ciphertext   bytea not null,
  nonce        bytea not null,
  key_version  int not null default 1,
  scope        secret_scope not null,
  scope_id     text,                         -- project/worker/integration id
  created_by   text references "user"(id),
  created_at   timestamptz not null default now(),
  rotated_at   timestamptz,
  revoked_at   timestamptz,
  unique (name, scope, scope_id)
);
```

Encrypted with AES-256-GCM using the master key from `/data/secrets/master.key` (never in the DB). Decryption happens only in the API/worker process, only for the execution that needs it, and the value is never returned by an endpoint or written to a log.

### 4.14 Integrations and tools

```sql
create table integration (
  id           text primary key,
  kind         integration_kind not null,
  name         text not null,
  version      text,
  config       jsonb not null default '{}',
  secret_id    text references secret(id),
  enabled      boolean not null default true,
  health       text not null default 'unknown',
  last_checked_at timestamptz,
  created_by   text references "user"(id),
  created_at   timestamptz not null default now()
);

create table integration_tool (
  id             text primary key,
  integration_id text not null references integration(id) on delete cascade,
  tool_id        text not null,
  capability     text not null,
  input_schema   jsonb not null,
  risk           risk_class not null,
  enabled        boolean not null default true,
  unique (integration_id, tool_id)
);
```

### 4.15 Skills

```sql
create table skill (
  id           text primary key,
  slug         text not null,
  name         text not null,
  version      text not null,
  description  text,
  source       skill_source not null,
  trust        trust_tier not null,
  path         text,
  manifest     jsonb not null,
  enabled      boolean not null default false,
  installed_at timestamptz not null default now(),
  unique (slug, version)
);

create table skill_binding (
  skill_id   text not null references skill(id) on delete cascade,
  worker_id  text references worker_definition(id) on delete cascade,
  project_id text references project(id) on delete cascade,
  enabled    boolean not null default true,
  primary key (skill_id, worker_id, project_id)
);
```

Null `worker_id` or `project_id` means "all". Skills never carry `project_grant` rows; they only declare requirements.

### 4.16 Rooms (deferred to v0.5 — not in v1 migrations)

These tables are specified so the model is stable, but they are **not created in v1**. Room APIs, UI and the `room.message` event are v0.5. `AC-004` (room membership grants nothing) is a v0.5 acceptance test.

```sql
create table room (
  id         text primary key,
  task_id    text references task(id) on delete cascade,
  project_id text references project(id) on delete cascade,
  name       text not null,
  purpose    text,
  created_at timestamptz not null default now()
);

create table room_member (
  room_id  text not null references room(id) on delete cascade,
  actor_type actor_type not null,
  actor_id text not null,
  role     text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (room_id, actor_type, actor_id)
);

create table room_message (
  id         text primary key,
  room_id    text not null references room(id) on delete cascade,
  actor_type actor_type not null,
  actor_id   text not null,
  content    text not null,
  refs       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

Room membership never creates a grant (`WRK-008`, `AC-004`). Authorization is evaluated per actor at execution time.

### 4.17 Notifications

```sql
create table notification (
  id          text primary key,
  user_id     text not null references "user"(id) on delete cascade,
  kind        notification_kind not null,
  title       text not null,
  body        text,
  task_id     text references task(id) on delete set null,
  approval_id text references approval(id) on delete set null,
  priority    smallint not null default 5,
  data        jsonb not null default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index on notification (user_id, read_at, created_at desc);

create table push_subscription (
  id          text primary key,
  user_id     text not null references "user"(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  failed_count int not null default 0,
  last_used_at timestamptz,
  created_at  timestamptz not null default now()
);

create table notification_delivery (
  id              text primary key,
  notification_id text not null references notification(id) on delete cascade,
  channel         text not null,            -- in_app|web_push|email|...
  status          delivery_status not null default 'pending',
  error           text,
  attempted_at    timestamptz not null default now()
);
```

The `notification` row is the durable record. Push/email are delivery attempts. Failure never removes the requirement (`NTF-003`).

### 4.18 Usage and cost

```sql
create table usage_record (
  id            text primary key,
  task_id       text references task(id) on delete set null,
  run_id        text references worker_run(id) on delete set null,
  provider      text not null,
  model         text not null,
  input_tokens  int,
  output_tokens int,
  cost_micro_usd bigint,                       -- integer micro-USD; never a float
  measured      boolean not null default false, -- false = estimated
  created_at    timestamptz not null default now()
);
```

`measured=false` is displayed as an estimate (`§22.5`). Budget checks happen before the call using the configured cap, and after using reported usage.

### 4.19 Audit log

```sql
create table audit_log (
  id          text primary key,
  actor_type  actor_type not null,
  actor_id    text,
  action      text not null,               -- 'policy.decision', 'approval.granted', ...
  capability  text,
  task_id     text,
  run_id      text,
  resource    text,
  decision    text,                        -- allow|deny|approval_pending|clarify
  rule_id     text,
  ip          inet,
  user_agent  text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index on audit_log (created_at desc);
create index on audit_log (task_id);
create index on audit_log (actor_id, created_at desc);
```

No FKs by design: audit must survive deletion of the thing it describes.

### 4.20 Idempotency records

```sql
create table idempotency_record (
  id              text primary key,
  user_id         text not null references "user"(id) on delete cascade,
  route           text not null,              -- method + path template
  key             text not null,
  fingerprint     text not null,              -- sha256 of canonical body
  state           text not null default 'pending', -- pending|completed
  response_status int,
  response_body   jsonb,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  unique (user_id, route, key)
);

create index on idempotency_record (expires_at);
```

A `pending` row is a claim: the same key cannot run concurrently. The response is completed in the same transaction as the resulting write where possible; failures release the claim or store the error response. A nightly sweep deletes expired rows. Stored responses never include secrets.

### 4.21 Resource, admission and cleanup (planned P1/P2)

These tables are planned, not in the current M1A migration. They make the operator budget observable without storing secrets or making the agent authoritative.

```sql
create table admission_decision (
  id             text primary key,
  task_id        text not null references task(id) on delete cascade,
  run_id         text references worker_run(id) on delete set null,
  profile        text not null,              -- light|standard|heavy|browser
  decision       text not null,              -- allow|queue|deny|downgrade
  reason         text not null,              -- RESOURCE_MEMORY, ...
  estimate       jsonb not null default '{}',-- memory/cpu/time hints; not a grant
  host_snapshot  jsonb not null default '{}',-- memory, PSI, load, disk at decision time
  created_at     timestamptz not null default now()
);

create index on admission_decision (task_id, created_at desc);
create index on admission_decision (decision, created_at desc);
```

```sql
create table resource_sample (
  id             text primary key,
  run_id         text not null references worker_run(id) on delete cascade,
  sampled_at     timestamptz not null default now(),
  memory_peak    bigint,                     -- bytes
  cpu_usage_usec bigint,
  pids_peak      int,
  io_read_bytes  bigint,
  io_write_bytes bigint,
  source         text not null default 'cgroup' -- cgroup|estimate
);

create index on resource_sample (run_id, sampled_at);
```

```sql
create table cleanup_record (
  id             text primary key,
  run_id         text not null references worker_run(id) on delete cascade,
  status         text not null,              -- clean|failed|partial
  checks         jsonb not null default '{}',-- unit, cgroup, temp, lock, port, browser
  detail         text,
  created_at     timestamptz not null default now(),
  finished_at    timestamptz
);

create index on cleanup_record (run_id, created_at desc);
create index on cleanup_record (status, created_at desc);
```

The active budget itself is a root-owned file plus an audited `system_state` snapshot. It is not editable through the API. A budget change writes an audit row and may be mirrored into `system_state` for display.

### 4.22 Memory graph and retrieval (planned P6)

Memory is explicit, sourced and user-controlled. It is not a hidden transcript index and not a second datastore.

```sql
create table memory_node (
  id             text primary key,
  kind           text not null,              -- decision|fact|preference|project|person|...
  title          text not null,
  body           text not null,
  scope          text not null,              -- instance|project|task
  project_id     text references project(id) on delete cascade,
  confidence     numeric(3,2) not null default 0.50,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table memory_edge (
  id             text primary key,
  from_id        text not null references memory_node(id) on delete cascade,
  to_id          text not null references memory_node(id) on delete cascade,
  relation       text not null,              -- supports|contradicts|derived_from|relates_to
  weight         numeric(3,2) not null default 0.50,
  created_at     timestamptz not null default now()
);

create table memory_source (
  id             text primary key,
  node_id        text references memory_node(id) on delete cascade,
  edge_id        text references memory_edge(id) on delete cascade,
  source_type    text not null,              -- task_event|artifact|note|decision|user
  source_id      text not null,
  citation       text not null,
  created_at     timestamptz not null default now(),
  check (node_id is not null or edge_id is not null)
);

create index on memory_node using gin (to_tsvector('english', title || ' ' || body));
create index on memory_source (node_id);
create index on memory_source (edge_id);
```

Rules:

- Every node/edge has at least one source. No memory without provenance.
- `body` is untrusted data at prompt time; it is labelled as recalled data, never instructions.
- Secrets and credentials are rejected before insert.
- `deleted_at` removes a node from retrieval; deletion is audited and exportable before purge.
- `pgvector` is optional and requires an ADR; if enabled, add an embedding column/table in the same database, never a second store.

---

## 5. Task state machine

```text
draft ──► queued ──► running ──┬──► completed
  │         │         │        ├──► failed
  │         │         │        └──► cancelled
  │         │         ├──► waiting_approval ──► running
  │         │         ├──► waiting_input ─────► running
  │         │         ├──► blocked ───────────► queued | failed | cancelled
  │         │         └──► retrying ──► queued
  │         └──► cancelled
  └──► cancelled
```

Allowed transitions (enforced by `packages/domain/task-state.ts`):

| From | To |
|---|---|
| `draft` | `queued`, `cancelled` |
| `queued` | `running`, `cancelled`, `failed` |
| `running` | `waiting_approval`, `waiting_input`, `blocked`, `retrying`, `completed`, `failed`, `cancelled` |
| `waiting_approval` | `running`, `blocked`, `cancelled`, `failed` |
| `waiting_input` | `running`, `blocked`, `cancelled`, `failed` |
| `blocked` | `queued`, `failed`, `cancelled` |
| `retrying` | `queued`, `failed`, `cancelled` |
| `completed` / `failed` / `cancelled` | terminal |

Every transition writes a `task_event` and bumps `task.version`. Illegal transitions throw `InvalidStateTransition` and are never silently coerced. The DB status is written with `where version = $n` to prevent lost updates.

## 6. Run state machine

```text
created ─► starting ─► running ─┬─► waiting_approval ─► running
                                ├─► waiting_input ────► running
                                ├─► completed
                                ├─► failed
                                ├─► cancelled
                                └─► interrupted ──► (requeue as new run) | failed
```

A run is a single attempt. Retries create a new run with `attempt+1`; history is never overwritten.

## 7. Approval lifecycle

```text
pending ─┬─► approved ──► (consumed at execution)
         ├─► rejected
         ├─► changes_requested ──► pending (new approval)
         ├─► expired
         └─► cancelled (task cancelled)
```

Consumption is atomic:

```sql
update approval
set consumed_at = now()
where id = $1 and status = 'approved' and consumed_at is null and expires_at > now()
returning *;
```

Zero rows means the approval is invalid, expired or already used. The gateway fails closed.

---

## 8. Indexes and query paths

| Query | Index |
|---|---|
| Task board by status | `(status, priority, created_at)` partial on active states |
| Task list for a conversation | `(conversation_id, created_at desc)` |
| Project history | `(project_id, created_at desc)` |
| Event replay | `(task_id, seq)` unique |
| Pending approvals | `(status, expires_at)` partial on pending |
| Inbox | `(user_id, read_at, created_at desc)` |
| Stale runs | `(status, heartbeat_at)` |
| Audit by task/actor | `(task_id)`, `(actor_id, created_at desc)` |
| Usage rollup | `(task_id)`, plus monthly aggregate table if needed |

Do not add indexes speculatively. Measure with `pg_stat_statements` before v0.4.

---

## 9. Constraints and invariants

1. One active run per task (partial unique index).
2. One writer per workspace (advisory lock on `project_id`, plus `workspace.locked_by_run`).
3. `(task_id, seq)` unique and gapless per task.
4. Approvals are single-use and expiring.
5. A task cannot depend on itself; cycles rejected in domain.
6. `task.mode` is copied from the policy at creation and does not mutate mid-task; a mode change affects new tasks and re-evaluated operations only.
7. Deleting a project cascades workspace and grants, but **not** tasks (set null) — history survives.
8. Secrets are never selected by generic repository methods; only `SecretStore.get(ref)`.
9. `audit_log` has no cascading deletes.
10. Admission never grants resources; it records a decision against an operator profile.
11. Every terminal run has a cleanup record, even when cleanup failed.
12. Memory nodes/edges require provenance; deletion is soft, audited and removes them from retrieval.

---

## 10. Retention and deletion

Defaults (configurable per instance from v0.5):

| Data | Default | Notes |
|---|---|---|
| Tasks, messages, events, artifacts | Indefinite | User-owned; explicit delete only |
| Application logs | 30 days | journald (native) or pino rotation; size-capped |
| Resource samples | 90 days | Aggregates/dashboard only after that |
| Cleanup records | 365 days | Audit evidence |
| Memory nodes/edges | Until user forget/delete | Soft delete, then purge |
| Audit log | 365 days | Exportable before purge |
| Notification deliveries | 30 days | Notifications themselves persist |
| Usage records | 24 months | Aggregates retained |
| Soft-deleted conversations | 30 days | Then hard delete |
| Workspace checkouts | Until task/project delete | Pruned by maintenance job |
| Queue jobs (pg-boss) | 7 days after completion | Config |
| Idempotency records | 24 hours | Swept after `expires_at` |

Deleting a task deletes its events, approvals, artifacts and runs in one transaction and writes an audit record. Artifact blobs are deleted only if no other artifact references the same `sha256`.

**Export:** an instance owner can export tasks, messages, events, artifacts and (P6) memory as JSONL + files (`§26.5`). The format is defined in the logical model; P3 ships the first task export.

---

## 11. Migration policy

- Drizzle generates SQL migrations; every migration is reviewed by a human.
- Numbered, forward-only, committed to `packages/db/migrations`.
- Applied automatically at boot **after** acquiring `pg_advisory_lock(841273)`; a second app instance waits rather than racing.
- Migrations must be:
  - **idempotent where possible** (`if not exists`, guarded updates),
  - **backward compatible for one release** (expand → migrate → contract),
  - **safe under load** (no long table locks; use concurrent index creation).
- A failed migration aborts startup with the failing statement and a restore hint. It never leaves a half-applied schema silently.
- Seed data (default workers, default engine binding, bundled skills) is applied idempotently after migrations.

---

## 12. pg-boss usage

This table is the **single queue registry**. Architecture diagrams and code must use these names.

| Queue | Payload (IDs only) | Retry | Singleton key | Expire |
|---|---|---|---|---|
| `task.run` | `{ taskId, runId }` | 2 | `runId` | task timeout + 2 min |
| `task.resume` | `{ taskId, runId, approvalId }` | 2 | `runId` | 30 min |
| `task.reconcile` | `{ taskId, runId }` | 3 | `runId` | 1 h |
| `orchestrator.turn` | `{ conversationId, turnId, userId }` | 2 | `turnId` | 10 min |
| `notification.send` | `{ notificationId, channel }` | 5 | `notificationId:channel` | 5 min |
| `maintenance.sweep` | `{}` | 1 | `sweep` | 5 min |

Other settings:

| Setting | Value |
|---|---|
| Schema | `pgboss` |
| Backoff | exponential, 5 s base, 15 min cap |
| Retention | 7 days completed, 30 days failed |

A job payload contains only IDs, never prompts or secrets. State is read from the database at execution time so a retry cannot act on stale input.

Restoring a backup rebuilds queue state: active tasks are re-enqueued by the recovery sweeper, while completed pg-boss history is intentionally not restored. In-flight external effects at backup time are flagged for reconciliation, not replayed blindly.

---

## 13. Data model decisions to watch

| Question | Current answer | Revisit when |
|---|---|---|
| JSONB vs. normalized detail tables | JSONB for scope, budgets, usage, payloads | Querying inside them becomes hot |
| One `worker_definition` per role | Seeded, user-editable | Users need multiple variants per role (v0.4) |
| Task-level event stream | Per-task `seq` + `global_seq` for the cross-task feed | Cursor needs a retention strategy (v0.2) |
| Rooms | Deferred to v0.5; tables are specified but not created in v1 migrations | v0.5 collaboration |
| Soft delete | Only conversations/projects; memory has an explicit forget state | Compliance requirements |
| Multi-tenancy | Single instance, one owner | Product track |
| Memory retrieval | Postgres full-text first; optional `pgvector` | Retrieval quality/measurement |
| Admission history | Store every decision, not just the current one | Dashboard/audit needs |
