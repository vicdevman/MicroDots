# MicroDots — Security, Authentication and Policy

**Status:** Normative design
**Audience:** Everyone who writes code, prompts, skills or docs
**Related:** [`master-prd.md`](./master-prd.md) §9–§11, §26 · [`api-contracts.md`](./api-contracts.md) · [`technical-architecture.md`](./technical-architecture.md)

---

## 1. Security objective

MicroDots holds repository access, API keys, and the ability to run commands and deploy software. The security model assumes:

- models will be wrong, manipulated, or overconfident,
- repositories and web pages contain hostile instructions,
- third-party modules and skills may be malicious or compromised,
- users will click "approve" without reading,
- and the server is a single small VPS with no security team.

Therefore:

> **Safety is enforced by architecture, not by instructions to a model.**
> The model proposes. The gateway decides. The audit records.

---

## 2. Assets and trust boundaries

| Asset | Why it matters |
|---|---|
| Model API keys, Git tokens, deployment credentials | Direct financial and infrastructure access |
| Source code and repositories | IP, secrets accidentally committed, supply chain |
| Host filesystem, systemd/Docker control | Full server compromise |
| Task/approval/audit records | Integrity of the product's promise |
| Session cookies and passkeys | Account takeover |
| Outbound network | SSRF, data exfiltration |

```text
Browser  ──HTTPS──►  existing proxy  ──►  app (trusted core)
                                            │
                                            ├──► Postgres (internal only)
                                            ├──► worker (trusted core logic)
                                            │       │
                                            │       └──► gateway (policy) ──► engine/adapters (semi-trusted)
                                            │                                      │
                                            │                                      └──► workspace (untrusted content)
                                            │
                                            └──► SSE

app/worker (unprivileged) ──Unix socket──► microdots-exec (root, narrow)
                                                │
                                                └──► transient systemd unit + cgroup (semi-trusted)
```

Untrusted: repo contents, web pages, MCP outputs, engine output, skills from outside, user-supplied files.
Trusted: core code, policy engine, database, secrets service, the narrow helper's validation logic.

The **execution unit** is a semi-trusted zone: it executes model-driven actions but has no database, no host mount except its confined workspace, no systemd/Docker control, and no long-lived credentials. The **helper** is privileged but deliberately narrow: it validates typed requests, applies operator profiles, and never exposes arbitrary shell or systemd control.

---

## 3. Threat model

| # | Threat | Impact | Mitigation | Requirements |
|---|---|---|---|---|
| T1 | Worker performs destructive action without consent | Data loss, deployment outage | Gateway + risk classes + approvals; deny-by-default | `SEC-001…004` |
| T2 | Prompt injection via repo/web/MCP | Exfiltration, policy bypass | Content-as-data framing; tool allowlists; policy outside model; egress control | `SEC-007`, `BRW-005` |
| T3 | Secret exfiltration to model or client | Credential compromise | Gateway-injected secrets; never in prompts/logs/client; redaction | `SEC-005` |
| T4 | Sandbox escape (native unit or container) | Full VPS compromise | Non-root, confined workspace, dropped caps, protected system/home, no control socket, cgroup limits | `SEC-002` |
| T5 | Session theft / CSRF | Account takeover | HttpOnly/Secure/SameSite, origin checks, passkeys, rotation, device revoke | §4 |
| T6 | Malicious skill or MCP server | Privilege escalation | Trust tiers, declared capabilities, explicit grants, quarantine | `SKL-004`, §8 |
| T7 | Path traversal in workspace | Read/write outside project | Canonical path checks, mount confinement, symlink resolution | `SEC-002` |
| T8 | SSRF via research/browser | Internal network access | Egress allowlist, block link-local/metadata IPs, DNS re-resolution | §7.4 |
| T9 | Approval fatigue / rubber-stamping | Unintended consent | Specific scopes, plain-language diffs, risk badges, batch limits | §6.3 |
| T10 | Replay of an approval | Unauthorized repeated action | Single-use, scope hash, expiry, consume-once transaction | §6.4 |
| T11 | Supply-chain compromise | Backdoor | Lockfiles, pinned images, dependency audit, signed releases | §10 |
| T12 | Resource exhaustion / cost runaway | DoS, bill shock | Concurrency caps, timeouts, budgets, queue backpressure | §9 |
| T13 | Audit tampering | Lost accountability | Append-only table, no cascading deletes, export | §11 |
| T14 | Installer hijack | Root compromise at install | HTTPS + checksum, no curl-pipe without verification option, pinned artifacts | §12 |
| T15 | Privileged helper abuse | Root compromise | Narrow typed API, peer credentials, profile allowlist, path/argv validation, no generic systemctl, audit | §8.1 |
| T16 | Browser data exfiltration | Account/data compromise | Shared service, isolated contexts, no host display, egress allowlist, quarantined downloads, human takeover | `BRW-005`, §8.4 |

Review this table at every milestone and after any incident.

---

## 4. Authentication

### 4.1 Design goals

1. **Clean:** one tap with a passkey on return; no passwords to remember if the user chooses.
2. **Self-contained:** no email service required to sign in or recover.
3. **Single-owner first:** one human owns the instance; multi-user is additive.
4. **Recoverable:** a lost device must not brick the installation.
5. **Auditable:** every login, device and token is visible and revocable.

### 4.2 First-run claim

A fresh instance is **closed** until claimed.

1. Installer generates a 32-byte token, prints it once, writes `/data/secrets/setup-token` (mode 0600). It is valid for 7 days or until claimed; `microdots setup-token --rotate` regenerates it. It is never written to application logs.
2. `/setup` requires the token (`POST /setup/verify-token`), which sets a 15-minute setup cookie.
3. The owner creates an account and completes setup.
4. The token is deleted; registration closes.
5. Re-running setup requires shell access (`microdots auth reset`).

Why: prevents a drive-by attacker from claiming an exposed instance between deploy and first visit.

### 4.3 Credentials

| Method | Status | Notes |
|---|---|---|
| **Passkey (WebAuthn)** | Primary | Resident credential, `userVerification: preferred`, discoverable login |
| Password | Fallback | scrypt (better-auth default, memory-hard), min 12 chars, breached-password check optional |
| TOTP | Optional | For password-only users |
| Magic link | Optional (v0.5) | Requires SMTP; never required |
| OAuth | Optional (v0.5) | GitHub/Google; off by default |
| API tokens | Automation | Scoped, hashed, revocable |
| CLI reset token | Recovery | Requires shell on the host |

Passkey UX:

- Registration is offered immediately after account creation, with a clear "recommended" label.
- Login uses conditional UI (autofill) where supported; a "Use passkey" button always exists.
- Multiple passkeys per user (laptop + phone); each is named and revocable.
- RP ID is the configured domain. Changing the domain requires re-registering passkeys (documented; password fallback remains).

### 4.4 Sessions

| Property | Value |
|---|---|
| Cookie | `microdots.session`, HttpOnly, Secure, SameSite=Lax, Path=/ |
| Lifetime | 30 days rolling; 7 days idle |
| Rotation | On login and privilege change; old session revoked |
| Storage | Server-side row; token hashed, never in JWT |
| Revocation | Per device, all devices, on password/passkey change |
| Concurrent | Allowed, each listed with device + last seen + IP (truncated) |

Session list UI: device name, browser, last active, approximate location (from IP, offline lookup — optional), revoke button.

### 4.5 Recovery (no email required)

In order of preference:

1. **Second passkey** on another device.
2. **Recovery codes** — 10 single-use codes, shown once at setup, stored hashed. Each regenerates on use.
3. **Password** if configured.
4. **CLI reset** — `microdots auth reset` (requires root/shell on the VPS) issues a one-time login token valid 15 minutes and invalidates all sessions. This is the ultimate escape hatch and is documented plainly.

There is no "email me a link" path in v1, because a self-hosted instance may have no mail server. That is a feature, not a gap.

### 4.6 Brute force and abuse

- Auth: 10 attempts/min/IP, exponential backoff after 5 failures, 15-minute lockout after 20.
- Setup: 5/min/IP; token comparison is constant-time.
- API: per-user and per-token limits (see API doc §4).
- Password hashing: scrypt with better-auth defaults; no MD5/SHA. Argon2id is a possible later upgrade with a migration test.
- Timing: generic "invalid credentials" response; no user enumeration.
- All auth events audited (success and failure, with IP and user agent).

### 4.7 CSRF and CORS

- Same-origin deployment by default (PWA served by the same app).
- `SameSite=Lax` blocks cross-site POST cookies.
- All mutating requests require an `Origin`/`Referer` match against `MICRODOTS_URL`; mismatch → `403 CSRF_ORIGIN_MISMATCH`.
- `Content-Type: application/json` required for JSON endpoints (blocks simple form posts).
- CORS is disabled by default; if enabled, explicit allowlist + credentials, never `*`.
- Bearer-token requests are not CSRF-able and are exempt from the cookie origin check (still rate-limited).

### 4.8 Multi-user (v0.5)

- Owner invites by one-time link (no email required; link is shown/copied).
- Roles: `owner` (billing/settings/instance), `admin` (projects, engines, grants), `member` (tasks in assigned projects), `viewer` (read-only).
- Per-project membership is independent of instance role.
- Approval authority is explicit: project admins + owner by default; configurable.
- A user cannot approve an operation they themselves initiated via their own token? (Decision: allowed for owner, but audited; v0.5 revisits separation of duties.)

---

## 5. Authorization model

### 5.1 Layers

Authorization is evaluated in this order. **Deny wins.**

1. **Hard denies** (non-overridable): host admin, Docker socket, `/proc`, other projects' paths, secret enumeration, policy modification.
2. **Instance policy:** capabilities disabled globally by the owner.
3. **Project scope:** the task's project must match the resource.
4. **Grants:** explicit `project_grant` rows (capability + selector + constraints).
5. **Worker scope:** the worker definition's role, capability ceiling and limits.
6. **Task scope:** paths/domains/commands allowed for this task.
7. **Operating mode:** raises or lowers the approval threshold within granted capabilities.
8. **Risk/approval rules:** final decision.

A capability not explicitly granted is **denied**, never "allowed by default".

### 5.1.1 Sandbox-local vs boundary-crossing

Authorization is evaluated at two moments, not for every file write:

| Effect | Evaluation point | Examples |
|---|---|---|
| **Sandbox-local** | Once, at task admission, against the task's grants and mode | read/write workspace files, run build/test commands, create a local branch |
| **Boundary-crossing** | Per call, through the gateway, with approval when required | git push/fetch, network egress, secret injection, deploy, external APIs, host actions |

The execution runtime enforces the sandbox: non-root, confined workspace, protected system/home, no host network, no systemd/Docker control, CPU/memory/PID/time limits. The engine has no credential or route to perform a boundary effect directly, so the gateway is not advisory — it is the only path.

Within the sandbox, the engine has delegated authority over files the task granted. The diff and command log are the accountability mechanism. This is a deliberate trade-off: per-file mediation would make coding agents unusable and would not survive engine substitution.

### 5.2 Capabilities

| Capability | Resource | Risk | Notes |
|---|---|---|---|
| `project.fs.read` | path glob | R0 | Confined to workspace |
| `project.fs.write` | path glob | R1 | Diff captured |
| `project.exec` | command id | R1 | Allowlisted commands, **no network**, sandbox-local |
| `project.exec.network` | command id + domain allowlist | R2 | Boundary; needed for dependency installs |
| `project.git.read` | repository | R0 | log, diff, status |
| `project.git.branch` | repository | R1 | Create/switch branch |
| `git.push` | remote + branch | R2 | Credentials injected by the gateway at execution, never exposed to the engine |
| `net.fetch` | domain allowlist | R0/R2 | Research; SSRF controls |
| `browser.use` | domain allowlist | R2 | v0.3 |
| `deploy.staging` | environment | R2 | v0.4 |
| `deploy.production` | environment | R3 | Always approval in the fast path |
| `secret.inject` | named secret + target operation | — | **Gateway-internal precondition**, not a worker-callable capability. Attaches a secret to one already-granted operation (e.g. `git.push`); never returns the value. |
| `integration.use` | integration id | R1–R3 | Per-tool risk |
| `task.create` | — | R0 | Orchestrator only |
| `task.cancel` | task | R1 | User or orchestrator |

Capability ids and their risk/resource descriptors live in `packages/contracts/capabilities.ts` so engines can declare them without importing policy. `packages/policy` owns the evaluator and validates the catalogue; modules cannot invent a capability at runtime, and a module capability that shadows a core id is rejected at registration.

### 5.3 Risk classes

| Class | Definition | Examples |
|---|---|---|
| **R0** | Read-only, local, reversible | read file, git status, fetch public page |
| **R1** | Local write, reversible via diff/rollback | edit source file, create branch, run tests |
| **R2** | External side effect, usually reversible with effort | push branch, create PR, staging deploy, send message |
| **R3** | Production, destructive or costly | production deploy, force push, delete resource |
| **R4** | Secrets or host-level authority | read a credential, host admin |

Risk is declared by the tool and used by policy. It is never inferred from model text.

### 5.4 Mode matrix

| Risk | Restricted | Balanced (default) | Autonomous |
|---|---|---|---|
| R0 | allow | allow | allow |
| R1 | **approve** | allow | allow |
| R2 | **approve** | **approve** | allow (within grant) |
| R3 | **approve** | **approve** | **approve** |
| R4 | deny | deny (user-only) | deny (user-only) |

**Sandbox-local R1 effects are covered by the task's admission approval.** In Restricted mode, the user approves the task's declared write scope once, before the execution starts; the engine does not request approval for each file. Boundary effects (R2+) use a per-call approval whenever the matrix says approve. One bounded approval, not a prompt storm.

Rules that override the matrix:

- A capability with no grant is denied in every mode.
- Mandatory approvals (`R3`, production) cannot be disabled by mode.
- A mode change never expands grants; it only changes the routine interruption level for already-granted capabilities.
- An approval is valid only for the exact scope requested.

### 5.5 Decision algorithm (normative)

```ts
function decide(input: PolicyInput): PolicyDecision {
  if (hardDenied(input)) return deny("HARD_DENY", ...);
  if (!instanceAllows(input.capability)) return deny("INSTANCE_DISABLED", ...);
  if (!projectMatches(input)) return deny("PROJECT_SCOPE", ...);
  const grant = findGrant(input.grants, input.capability, input.resource);
  if (!grant) return deny("NOT_GRANTED", ...);
  if (!withinConstraints(grant, input)) return deny("CONSTRAINT_VIOLATION", ...);
  if (!workerAllows(input.worker, input.capability)) return deny("WORKER_SCOPE", ...);
  if (!taskAllows(input.task, input.resource)) return deny("TASK_SCOPE", ...);

  const required = requiredApproval(input.requestRisk, input.task.mode, grant);
  if (required) return approvalPending(scopeOf(input), ttlFor(input.requestRisk));
  return allow(scopeOf(input));
}
```

`input.worker` is the worker **definition** (role + allowed capabilities), not the worker process. `input.requestRisk` is the risk class declared by the tool/capability, not inferred from the model.

Deterministic, pure, unit-tested. The same function runs in the API (preview) and the worker (enforcement). Any divergence is a bug.

### 5.6 What grants *cannot* do

- Grant host filesystem access, Docker socket, or root.
- Grant access to another project.
- Grant raw secret values; secrets are injected only by the gateway during a granted operation.
- Override a hard deny.
- Persist beyond their expiry.
- Be inherited through rooms, conversations, or worker collaboration (`WRK-008`).

---

## 6. Approvals

### 6.1 What requires approval

- Any operation whose risk/mode combination says `approve`.
- Any operation outside existing grants that the user chooses to authorize (creates a new grant + approval).
- Production deploys, force pushes, destructive Git, deleting resources (always).
- Installing a skill or integration (v0.2+).

### 6.2 Approval content (required fields)

| Field | Purpose |
|---|---|
| Worker + task | Who is asking and why |
| Exact operation | Tool + capability + canonical arguments |
| Target | Repository, branch, environment, path, domain |
| Scope hash | Tamper/replay guard |
| Risk class | R0–R4 with plain-language explanation |
| Expected effect | What will change, in user terms |
| Reversibility | How to undo, or "not reversible" |
| Evidence | Diff stat, command, test results as applicable |
| Expiry | Default 30 min for R1/R2, 15 min for R3 |
| Actions | Approve · Reject · Request changes |

### 6.3 Anti-rubber-stamp measures

- Show the **diff or command**, not a summary alone, for R2+.
- Never batch unrelated approvals.
- Rate-limit approvals to 20/min and warn on bursts.
- Default action is "reject" on timeout; expired approvals are visible.
- High-risk approvals require typing the environment name (v0.4) or a passkey re-auth (v0.5).

### 6.4 Single-use semantics

```text
approval created (scopeHash H, expires T)
  → user approves
  → gateway resume: recompute H', compare H' == H, check not expired, atomically consume
  → execute once
  → further identical operations need a new approval
```

Rejections and changes are recorded with notes and returned to the worker as structured feedback, not free-form chat.

### 6.5 Standing grants (v0.4)

Scoped, time-boxed, explicitly created by the user:

```json
{
  "capability": "deploy.staging",
  "selector": "project:acme-api/env:staging",
  "maxUses": 5,
  "expiresAt": "2026-11-04T00:00:00Z",
  "createdBy": "user_01..."
}
```

Standing grants never cover R3 production or R4 secrets in v0.4. They are visible on a dedicated page and revocable in one click.

---

## 7. Secrets

### 7.1 Storage

- AES-256-GCM with a 32-byte master key from `/data/secrets/master.key` (0600, owned by the app/worker user).
- Ciphertext + nonce + key version in `secret`.
- The master key is excluded from backups by default; the backup command includes it only with `--include-key` and prints a warning (otherwise a restored backup cannot decrypt). Documented trade-off.
- Key rotation: new key version, re-encrypt on write, background re-encrypt later.

### 7.2 Access

- The API and worker can decrypt; the web client never can.
- `SecretStore.resolve(ref)` is callable only inside the gateway/adapter execution that needs it.
- **The engine never receives a secret value.** For a boundary operation (`git.push`, deploy, authenticated API), the gateway resolves the secret and injects it into the adapter process for the duration of that one call, then scrubs it.
- If a sandbox command needs registry credentials, it is a `project.exec.network` boundary operation: the gateway authorizes a one-shot network-enabled sandbox with a per-command allowlist and a one-shot environment, and returns the output. The value is never written to disk, events, logs or the engine's environment.
- No endpoint returns a secret value. Only metadata: name, scope, last rotated, last used.
- Workers request capabilities by name; they never receive secret handles or a secret list.

### 7.3 Redaction

- pino redact list: `authorization`, `cookie`, `set-cookie`, `password`, `token`, `apiKey`, `secret`, `*.key`, `*.pem`.
- A regex scrubber removes `md_*`, `sk-*`, `ghp_*`, `github_pat_*`, `xoxb-*`, JWTs, and long base64 blobs from logs and event payloads.
- Event payloads are scanned before insert; a hit sets `redacted: true` and replaces the value with `[REDACTED]`.
- Exception messages from adapters are sanitized before storage.

### 7.4 Network egress (SSRF)

- Research/browser egress goes through an allowlist of domains per task/project.
- Block: `127.0.0.0/8`, `::1`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16` (metadata), link-local, multicast, `.internal`, `.local`.
- Resolve DNS and re-check the resolved IP immediately before connect (prevents DNS rebinding).
- No redirects to blocked hosts; max 3 redirects; HTTPS only by default.
- Downloads are size-capped and stored as quarantined artifacts, never executed.

---

## 8. Execution isolation

### 8.1 Native execution hardening (default)

The native runtime is authoritative in [`native-execution-and-resources.md`](./native-execution-and-resources.md) §5. Baseline controls:

| Control | Value |
|---|---|
| User | non-root `microdots-worker` |
| Workspace | per-run directory; `realpath`-checked; `ProtectSystem=strict` + `ReadWritePaths` |
| Host home | `ProtectHome=yes` |
| Devices | `PrivateDevices=yes` |
| Temp | `PrivateTmp=yes`; per-run cache removed at cleanup |
| systemd/Docker control | never available to the execution unit |
| Capabilities | `CapabilityBoundingSet=` empty; `NoNewPrivileges=yes` |
| Address families | `AF_UNIX` only by default; network profile is separate |
| Network | **no egress by default**; only the task capability bridge is reachable. Research/browser egress goes through a gateway-mediated proxy with a domain allowlist. |
| PIDs | profile; 512 max for heavy |
| Memory | `MemoryHigh`/`MemoryMax` from the operator profile |
| CPU | `CPUQuota` from the operator profile |
| Timeout | task deadline + hard kill via the cgroup |
| Logs | size-capped, redacted |
| Cleanup | unit/cgroup/process/temp/lock/port verification |

**Privileged helper (`microdots-exec`).** Root-owned, narrow API on a Unix socket:

- peer credentials (`SO_PEERCRED`) checked;
- only typed start/stop/kill/logs/usage/cleanup/reconcile operations;
- only operator profiles; the caller cannot set cgroup values;
- argv arrays, no shell; path and executable validation;
- no generic `systemctl` passthrough;
- every operation audited;
- no secrets in requests or logs.

If a request cannot be validated, it is denied. The helper is not a convenience wrapper around root.

### 8.2 Workspace confinement

- Every path is resolved with `realpath` and checked against the workspace root prefix.
- Symlinks pointing outside are rejected.
- Git hooks and `.git/config` are sanitized; `core.hooksPath` is cleared.
- `GIT_*` environment variables are stripped except the adapter's explicit ones.
- Project roots are distinct per project; no cross-project access.
- The confined workspace is the entire sandbox: `/data`, the database socket, the helper socket and other projects are not reachable from the engine.

### 8.3 Untrusted repository code

Running tests and builds executes repository code. Mitigations:

- Only inside the execution unit, never in the app/worker process.
- No host home, no systemd/Docker control, no DB credentials, no unrelated secrets, no ambient network.
- `project.exec` is network-off. A command that needs the network is a separate `project.exec.network` boundary operation, evaluated and audited as R2.
- `project.exec.network` runs in a **one-shot network-enabled execution profile**: same workspace, no host home/control, attached only to an egress proxy with a per-command domain allowlist and optional short-lived secret injection. The long-lived engine unit stays network-off; the one-shot unit is destroyed after the command and its output is captured.
- `npm install` scripts run with `--ignore-scripts` unless explicitly approved.
- Timeouts, output caps and cgroup kill of the whole process tree.
- The runtime and engine binaries are pinned per release.

This does not make arbitrary code safe. It bounds the blast radius and makes the risk explicit in the UI.

### 8.4 Shared browser isolation

- One shared Chromium/Playwright service, started on demand; no browser per agent.
- No host display; isolated contexts/profiles per integration.
- Downloads quarantined; egress allowlisted; metadata/private IPs blocked with DNS re-resolution.
- Human takeover is an authenticated, scoped, expiring session; it is audited and does not grant the agent new capabilities.
- Browser memory counts against the MicroDots budget and is a heavy execution.
- Cleanup verifies no Chromium process, profile lock or temp profile remains.
- WebRTC is last and requires a measured affordability decision.

---

## 9. Prompt injection and untrusted content

Rules:

1. Repository files, web pages, issue text, MCP outputs and tool results are **data**, wrapped and labeled as untrusted.
2. System policy is never placed after untrusted content; tool outputs cannot redefine it.
3. The model cannot call a tool that is not in the task's allowlist, regardless of instructions.
4. The gateway re-validates every call; a model claiming "the user approved" changes nothing.
5. Tool descriptions come from the registry, not from fetched content.
6. Secrets are never included in prompts; if a task needs a credential, the adapter injects it at execution time.
7. Outputs that look like instructions are not executed; they are displayed or passed to the user.
8. Browser pages cannot trigger host actions; only the gateway can.

Testing: a prompt-injection fixture repo and a malicious MCP server run in CI from P3/P5; the expected outcome is a policy denial and an audit record, never execution.

---

## 10. Supply chain

- Lockfile committed; `pnpm install --frozen-lockfile` in CI (and the optional Docker build).
- Dependency audit (`pnpm audit`) in CI; high/critical blocks release unless documented.
- Optional Docker images pinned by digest; native runtime/engine binaries pinned by version.
- Release artifacts built in CI with provenance attestation (where supported).
- Installer verifies checksums of downloaded artifacts; `curl | bash` is documented but also offered as download-then-inspect.
- No postinstall scripts from dependencies in production images unless reviewed.
- Skills and modules have trust tiers (§8 of extensibility doc) and never auto-enable.

---

## 11. Audit

Every security-relevant event writes an `audit_log` row:

- login success/failure, logout, session revoke, passkey add/remove
- setup claim, owner creation, auth reset
- token create/revoke
- project/grant create/revoke/change
- policy decision (allow, deny, approval_pending, clarify) with rule id
- approval requested/decided/expired/consumed
- secret create/rotate/revoke/use (metadata only, never value)
- engine/module enable/disable
- settings changes
- backup/restore/upgrade
- task cancel, recovery, forced failure

Audit is append-only at the application layer, has no cascading deletes, and is exportable as JSONL/CSV. A hash-chain (each row includes the previous hash) is a v0.5 option for tamper evidence.

---

## 12. Transport and browser hardening

The existing reverse proxy (or the optional Caddy profile) sets:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self';
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'none';
  form-action 'self';
  object-src 'none';
```

- TLS 1.2+ only; modern ciphers; automatic renewal.
- HTTP redirected to HTTPS.
- Compression enabled; BREACH risk accepted for JSON APIs (no secrets in compressed responses beyond session data).
- The service worker caches only static assets and the app shell, never API responses containing secrets.

---

## 13. Backup, restore and data protection

- `microdots backup` → `pg_dump` (custom format) + artifacts + config, encrypted with a user-supplied passphrase (age or AES-GCM).
- The master key is **not** included by default; `--include-key` requires confirmation.
- Backups are written to a user-chosen path and never uploaded anywhere automatically.
- Restore verifies checksums and migration version; a newer schema cannot be restored into an older binary.
- Deletion of a task/project is audited and irreversible after the retention window.
- No telemetry by default. If enabled, it is aggregate, documented, and off unless the owner opts in.

---

## 14. Incident response

1. **Contain:** disable the affected module/engine (`MICRODOTS_DISABLED_MODULES`), revoke tokens, stop the worker.
2. **Preserve:** export audit log, task events, execution logs and cleanup results before cleanup.
3. **Assess:** determine what executed, with which credentials, and whether external effects occurred.
4. **Rotate:** all secrets reachable by the affected scope; sessions; Git/deploy credentials.
5. **Notify:** instance owner; if the project is open source and the issue affects others, follow responsible disclosure.
6. **Fix and record:** post-incident note in `Docs/incidents/` (private until disclosure), regression test, docs update.

A security incident is never resolved by deleting logs.

---

## 15. Security checklist (every release)

- [ ] Auth: session rotation, origin check, rate limits, lockout verified.
- [ ] Setup: token required, single-use, deleted after claim.
- [ ] Policy: deny-by-default verified; matrix tests green; branch coverage 100%.
- [ ] Approvals: scope hash, expiry, single-use, audit verified.
- [ ] Secrets: no plaintext in DB/logs/client bundle; redaction test passes.
- [ ] Execution: non-root, no control socket, caps dropped, cgroup limits set, cleanup verified.
- [ ] Helper: peer credentials, profile allowlist, no generic systemctl, audited.
- [ ] Path traversal and symlink tests pass.
- [ ] SSRF: metadata and private ranges blocked, DNS rebinding test passes.
- [ ] Prompt injection fixtures do not execute tools.
- [ ] Dependency audit clean or documented.
- [ ] Runtime/engine binaries and optional images pinned; checksums verified.
- [ ] Headers and CSP verified with a scanner.
- [ ] Backup/restore includes/excludes the key as documented.
- [ ] `microdots doctor` reports security-relevant misconfigurations.
- [ ] No P0/P1 findings open.

---

## 16. Disclosure

`SECURITY.md` defines the reporting channel, scope, and timelines. Do not open public issues for vulnerabilities. The project aims to acknowledge within 72 hours and ship a fix or mitigation within 14 days for critical issues. Credit is given unless the reporter prefers otherwise.
