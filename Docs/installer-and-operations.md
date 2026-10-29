# MicroDots — Installer and Operations

**Status:** Specification for M1/M6
**Audience:** Operators, infrastructure, agents
**Related:** [`roadmap.md`](./roadmap.md) · [`technical-architecture.md`](./technical-architecture.md) · [`security-and-auth.md`](./security-and-auth.md)

---

## 1. Goal

> One command on a fresh VPS produces a working, secure, upgradeable MicroDots installation — with no manual YAML, no dependency archaeology, and no destructive surprises on re-run.

The installer is a **product surface**, not a script. It is versioned, tested, idempotent, and explains every failure.

---

## 2. Supported environments (v0.1)

| Item | Supported |
|---|---|
| OS | Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, Debian 12 |
| Architecture | x86_64, arm64 |
| Docker | Engine 24+ with Compose v2 (installed if missing) |
| CPU | 2 vCPU minimum, 4 recommended |
| RAM | 4 GB minimum, 8 GB recommended |
| Disk | 40 GB minimum, 80 GB recommended |
| Network | Outbound HTTPS; inbound 80/443 (or tunnel mode) |
| Time | NTP synchronized (required for TLS and WebAuthn) |

Explicitly unsupported in v0.1: Windows host, macOS host, Podman, rootless Docker, Kubernetes, Alpine host, 32-bit. Fail with a clear message rather than a broken install.

**Access modes**

| Mode | Requirement | Trade-off |
|---|---|---|
| **A. Domain + automatic TLS** (default) | DNS A/AAAA → VPS, ports 80/443 | Full PWA, web push, passkeys |
| **B. Existing reverse proxy** | Proxy forwards to `127.0.0.1:3000` | You manage TLS; app trusts proxy headers |
| **C. Tunnel** (Cloudflare/Tailscale) | Outbound only, no public ports | Great for CGNAT; push works with a valid hostname |
| **D. LAN / IP** | Self-signed or HTTP | **No web push**, passkeys restricted; dev only |

Web push and passkeys require a secure context. Mode D is documented as limited, never presented as equivalent.

---

## 3. Install

### 3.1 Command

```bash
curl -fsSL https://get.microdots.dev/install.sh -o install.sh
less install.sh                 # inspect
sudo bash install.sh
```

or the shorter, less cautious form:

```bash
curl -fsSL https://get.microdots.dev | sudo bash
```

Both are documented. The script supports:

```
--dir /opt/microdots       install root (default)
--domain dots.example.com  public hostname
--mode domain|proxy|tunnel|lan
--version 0.1.0            image tag (default: latest stable)
--non-interactive          require all flags; no prompts
--skip-engine              do not offer engine installation
--no-start                 prepare only
--force                    re-run even if healthy (still non-destructive)
--uninstall                remove app, keep data unless --purge
--purge                    with --uninstall, delete data (explicit confirmation)
```

### 3.2 What the installer does

1. Verify OS, architecture, kernel, clock sync, disk and memory.
2. Verify it is not already installed; if it is, switch to **upgrade/repair** mode.
3. Install Docker Engine + Compose plugin if absent (official repo, pinned major).
4. Create `/opt/microdots` (mode 0750) and a dedicated system user where applicable.
5. Generate secrets **once**, write to `.env` (0600) and `/data/secrets/`:
   - `MICRODOTS_SESSION_SECRET`
   - master key (32 bytes) → `/data/secrets/master.key`, referenced by `MICRODOTS_MASTER_KEY_FILE`
   - setup token → `/data/secrets/setup-token` (0600), referenced by `MICRODOTS_SETUP_TOKEN_FILE`; single-use, valid 7 days, regenerable
   - VAPID keypair (private key in `/data/secrets/`, public key in env)
   - Postgres password
   - Engine credentials are **not** core env vars: each engine gets its own scoped token in its registry/config at registration time

   A direct `docker compose up` without the installer is also supported: the app entrypoint
   generates the master key and setup token if they are absent and never overwrites them.
   The installer remains responsible for the session secret, Postgres password and VAPID keys.
6. Write `compose.yaml` + `compose.override.yaml` (site-specific values only).
7. Pull pinned images (by digest) and start `postgres`, then `app` (migrations run at boot), then `worker`, `caddy`, and the runner if enabled.
8. Wait for `/readyz` with a 120 s timeout; on failure, dump sanitized diagnostics.
9. Configure and verify TLS (mode A) or proxy trust (mode B/C).
10. Install the `microdots` CLI shim at `/usr/local/bin/microdots`.
11. Offer optional engine installation: detect first, install only if missing (see §6).
12. Print the URL and the setup token **once**, read directly from the file by the installer. The app never logs the token.
13. Write `/opt/microdots/install-state.json` (version, mode, checks, timestamps).

The setup token can be re-read locally at any time with `microdots setup-token` (requires shell access on the host). It is consumed atomically on successful claim; after that, the endpoint returns `409 SETUP_COMPLETE` and the file is deleted.

**Target:** 60–180 seconds on a decent network, excluding DNS propagation. First `docker pull` dominates.

### 3.3 Non-negotiable installer behaviors

- **Idempotent:** re-running never creates a second install, rotates secrets, or deletes data.
- **State-aware:** existing `.env` is backed up (`.env.bak.<timestamp>`) before any change, and only missing keys are added.
- **Fail-closed:** if health checks fail, it does not print "success"; it prints the failed check and the exact command to inspect.
- **No secrets in shell history:** prompts read silently; generated values go to files. Only the setup token is echoed, once, by the installer itself.
- **No curl-pipe-obfuscation:** the script is human-readable, checksummed, and versioned.
- **No host mutation beyond scope:** no firewall changes without asking; no system-wide packages beyond Docker.
- **Offline-tolerant:** if images are preloaded (`--offline-bundle`), the install works without registry access.

### 3.4 Install state file

```json
{
  "version": "0.1.0",
  "installedAt": "2026-10-28T09:00:00Z",
  "mode": "domain",
  "domain": "dots.example.com",
  "dir": "/opt/microdots",
  "images": { "app": "sha256:…", "runner": "sha256:…" },
  "engines": [{ "id": "opencode", "version": "0.6.4", "action": "reused" }],
  "checks": { "docker": "ok", "ports": "ok", "dns": "ok", "tls": "ok", "db": "ok" },
  "lastUpgrade": null
}
```

Used by `doctor`, `upgrade`, `uninstall`, and support. Never contains secrets.

---

## 4. Deployment topology

```yaml
services:
  caddy:      # 80/443, automatic TLS, headers, compression
  app:        # API + SSE + static PWA, port 3000 internal
  worker:     # same image, node dist/worker.js
  runner:     # engine host(s), no public ports
  postgres:   # 17-alpine, volume pgdata, no public port
```

Volumes:

| Volume | Contents | Backup |
|---|---|---|
| `pgdata` | All relational state, queue, events | Yes (pg_dump) |
| `artifacts` | Task artifacts (content-addressed) | Yes |
| `workspaces` | Project checkouts | No (re-clonable) |
| `secrets` | Master key, setup token | Master key only with `--include-key` (see §7); setup token is not backed up |
| `caddy_data` | Certificates | No (re-issued) |
| `engine_cache` | Engine/model caches | No |

Only `caddy` publishes ports. Postgres, runner and the app are on an internal network. `app` and `worker` share a network with `postgres`; `runner` is on a separate network with only the worker-facing endpoint.

Restart policies: `unless-stopped` for all. Healthchecks for `postgres`, `app`, `caddy`, `runner`.

Resource limits (defaults, configurable):

| Service | Memory | CPUs |
|---|---|---|
| app | 512 MB | 1.0 |
| worker | 768 MB | 1.0 |
| runner | 2 GB | 1.5 |
| postgres | 512 MB | 1.0 |
| caddy | 128 MB | 0.5 |

---

## 5. Environment configuration

`.env` at `/opt/microdots/.env` (0600). Generated values are never committed. See `technical-architecture.md` §11 for the full list.

Minimum site-specific keys:

```dotenv
MICRODOTS_URL=https://dots.example.com
MICRODOTS_MODE=domain
POSTGRES_PASSWORD=<generated>
MICRODOTS_SESSION_SECRET=<generated>
MICRODOTS_MASTER_KEY_FILE=/data/secrets/master.key
MICRODOTS_SETUP_TOKEN_FILE=/data/secrets/setup-token
MICRODOTS_DEFAULT_MODE=balanced
MICRODOTS_TELEMETRY=off
```

Changing `MICRODOTS_URL` invalidates cookies and passkeys (RP ID). The installer warns and offers to keep the old value or proceed with re-registration.

---

## 6. Engine installation (OpenCode first, others optional)

The PRD requires the installer to **detect before installing** (`OPC-001…007`). Engines are independent modules; the app runs without any.

### 6.1 Detection

```bash
command -v opencode
opencode --version
```

Also check known install locations (`~/.opencode/bin`, `/usr/local/bin`, the runner image) and the configured endpoint.

### 6.2 Decision matrix

| Case | Condition | Action | Never do |
|---|---|---|---|
| **A. Missing** | No binary/endpoint | Verify OS/arch and network; install the pinned supported version; verify version and handshake; record | Install silently when the user opted out |
| **B. Compatible present** | Version in supported range | Reuse; record path/version; verify handshake | Reinstall or overwrite config |
| **C. Incompatible present** | Version outside range | Report version and the failed requirement; offer a safe upgrade path; require explicit consent; preserve config | Silent overwrite or downgrade |
| **D. Present but unhealthy** | Binary exists, handshake fails | Capture diagnostics; distinguish install vs config vs provider vs network; offer targeted repair | Reinstall when the real issue is credentials |
| **E. Cannot proceed** | Missing prerequisites | Explain exactly what is missing and the next action | Report coding as "ready" |

Applies identically to Cline, Codex CLI or any engine: each has its own version range and health check, and installing one never affects another.

### 6.3 Version policy

- Supported range lives in `packages/engines/<id>/compat.ts` and is read by the installer.
- The installer pins a tested version but accepts a compatible existing one.
- Upgrades are explicit (`--upgrade-engine opencode`) and tested against the adapter contract suite.
- The detected version is shown in **Settings → Team → Engines** and in `microdots doctor`.

### 6.4 Unhealthy is not missing

The user-facing messages must be distinct:

| Condition | Message |
|---|---|
| Missing | "No coding engine installed. Install OpenCode or connect another engine." |
| Incompatible | "OpenCode 0.5.1 is below the supported range 0.6.x. Upgrade?" |
| Unhealthy | "OpenCode is installed but not responding. Check the runner logs." |
| Provider auth | "OpenCode is running, but the model provider rejected the key." |
| Quota | "The model provider quota is exhausted. Wait or switch providers." |

This distinction is `OPC-010`/`AC-009`. A missing binary must never surface as an auth failure.

---

## 7. Backup and restore

### 7.1 Backup

```bash
microdots backup --out /root/microdots-2026-10-28.age
```

- `pg_dump --format=custom` of the app database (excluding `pgboss` history beyond active jobs).
- Artifacts volume (deduplicated by sha256).
- `.env` and `install-state.json` (config only; secret material lives in `/data/secrets` and is backed up separately); the whole archive is encrypted.
- **Master key excluded by default.** `--include-key` includes it and prints a warning: without it, encrypted secrets cannot be restored.
- Encrypted with `age` or AES-256-GCM using a passphrase (prompted, never on the command line).
- Checksummed; manifest lists versions and migration number.

Artifacts and DB are captured consistently: pause the worker (or use a brief maintenance lock) so no new run starts mid-backup. Running tasks are reported as "will resume after restore".

### 7.2 Restore

```bash
microdots restore /root/microdots-2026-10-28.age
```

1. Verify checksum and manifest.
2. Refuse if the backup schema is newer than the binary (upgrade first).
3. Stop app/worker, take a safety snapshot of current data.
4. Restore database, artifacts, config; re-encrypt secrets with the local key if `--include-key`.
5. Run migrations to the current version.
6. Start and verify `/readyz`, then a smoke task. The recovery sweeper re-enqueues active tasks; completed pg-boss history is intentionally not restored.
7. Report any external states that cannot be restored (open PRs, deployments, browser sessions).

### 7.3 What backups cannot restore

- External side effects (pushed commits, deployments, sent emails).
- Browser sessions (must re-authenticate).
- Engine caches (rebuilt).
- In-flight external operations whose outcome was unknown at backup time (flagged for reconciliation).

This is stated in the restore output, not buried in docs.

---

## 8. Upgrade and rollback

```bash
microdots upgrade            # latest stable
microdots upgrade --version 0.2.0
microdots upgrade --check    # no changes
```

Sequence:

1. Pre-flight: disk space, current health, backup (automatic unless `--no-backup`).
2. Pull pinned images by digest.
3. Stop worker (drain), stop app.
4. Start app with migrations; wait for `/readyz`.
5. Start worker and runner; health check.
6. Smoke test: DB, queue, one queued fake task (or skip in production).
7. Record `lastUpgrade` in state.

Rollback:

```bash
microdots rollback --to 0.1.0
```

- Images are retained for the previous two versions.
- Database migrations are forward-only; rollback is allowed only if the previous version's schema is compatible. Otherwise the CLI restores the pre-upgrade backup (explicit confirmation, data-loss window stated).
- Never claim a successful rollback without a health check.

**Upgrade gates:** migration test, backup/restore test, fresh install test, changelog, compatibility check for engines.

---

## 9. `microdots doctor`

Runs a prioritized diagnostic and prints pass/warn/fail with fixes:

| Check | Fail example |
|---|---|
| OS/arch | "Ubuntu 20.04 is not supported; upgrade to 22.04+" |
| Docker/Compose | "Compose v2 not found" |
| Clock sync | "Clock drift 42s — WebAuthn will fail" |
| Disk | "1.8 GB free — below 5 GB safety margin" |
| Memory | "3.2 GB total — 4 GB recommended for coding tasks" |
| Ports | "443 already in use by nginx" |
| DNS | "dots.example.com does not resolve to this host" |
| TLS | "Certificate expires in 3 days; renewal failed" |
| Database | "Migration 0042 pending" |
| Queue | "17 jobs stuck > 20 min" |
| Engines | "opencode missing / cline unhealthy" |
| Providers | "Anthropic key rejected (401)" |
| Secrets | "master.key permissions are 0644 (expected 0600)" |
| Backups | "Last backup 38 days ago" |
| Version | "0.1.0 available; running 0.0.4" |

Exit code 0 = all pass, 1 = warnings, 2 = failures. Machine-readable with `--json` for support.

---

## 10. Logs and diagnostics

```bash
microdots logs app --follow
microdots logs worker --since 1h
microdots logs runner
microdots logs db
microdots support-bundle --out support.tar.gz
```

The support bundle contains: versions, `doctor --json`, sanitized logs, compose config with secrets redacted, migration status, queue depth, engine health. It **never** contains prompts, task content, keys or tokens unless `--include-content` is explicitly passed.

Log rotation: Docker `json-file` with `max-size=20m`, `max-file=5`. App logs are structured JSON.

---

## 11. Uninstall

```bash
microdots uninstall
```

Default: stop and remove containers, networks, app files and images. **Keep** `pgdata`, `artifacts`, `secrets`, and `.env`; print their locations.

```bash
microdots uninstall --purge
```

Requires typing `DELETE` and a second confirmation listing exactly what will be destroyed. Backups are not deleted.

The distinction between application files and user data is required by `INS-010`.

---

## 12. Firewall and network

Recommended:

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

- Do not expose 3000, 5432, 4096, or the Docker socket.
- Bind internal services to the Docker network only.
- If using a tunnel, close 80/443 and let the tunnel connect to `app:3000`.
- SSH: key-only, non-root user, fail2ban recommended (documented, not enforced).
- Outbound: allow 443; engine egress can be further restricted by the operator.

---

## 13. Resource sizing and expectations

| Workload | vCPU | RAM | Disk | Notes |
|---|---|---|---|---|
| Chat only, no coding | 1 | 2 GB | 20 GB | Demo only; the installer warns and does not treat this as supported |
| Coding, 1 task at a time | 2 | 4 GB | 40 GB | **Recommended minimum** |
| Coding + browser | 4 | 8 GB | 80 GB | Comfortable |
| Team (3–5 users) | 4–8 | 8–16 GB | 120 GB | Concurrency raised |

Reality checks to communicate in the installer and docs:

- A coding run can use 1–2 GB with Node + tests.
- Browser automation adds ~500 MB per context.
- Postgres + app + worker idle ≈ 350–500 MB.
- Two concurrent coding runs on 4 GB will swap; the default concurrency is 2 with a warning.
- Disk fills from `node_modules`, caches and artifacts; `microdots doctor` warns at 20% free.

---

## 14. Troubleshooting (top issues)

| Symptom | Likely cause | Fix |
|---|---|---|
| Setup page says instance claimed | Token already used | `microdots auth reset` |
| Passkey prompt doesn't appear | RP ID/domain mismatch or insecure context | Use the exact configured HTTPS URL |
| Web push not delivered | No valid TLS, permission denied, expired subscription | Re-subscribe; check `doctor` |
| "No engine" on coding task | Engine missing or disabled | Install/enable in Team → Engines |
| Engine unhealthy after upgrade | Version outside range | `microdots upgrade --engine opencode` |
| Tasks stuck queued | Worker down, capacity, or dependency | Check health, queue depth, logs |
| Everything slow, disk full | Cache/artifacts | `docker system prune` guidance, artifact retention |
| 502 from Caddy | App not ready | `microdots logs app`, `/readyz` |
| Migration failed | Interrupted upgrade | Restore pre-upgrade backup; report |
| Can't log in after URL change | Cookies/passkeys bound to old origin | Revert URL or re-register passkey |

Each row exists in the public troubleshooting guide with exact commands.

---

## 15. Operational SLOs (single instance)

| Metric | Target |
|---|---|
| Install success on supported OS | ≥ 98% |
| Install time (excluding DNS) | < 5 min p95 |
| Upgrade success | ≥ 99% |
| Backup success | ≥ 99% |
| Restore verified | 100% in release gate |
| Task recovery after restart | 100% of eligible tasks |
| `doctor` false "ok" | 0 |

---

## 16. Release artifacts

- Multi-arch images: `ghcr.io/microdots/app:<version>` (API+worker), `ghcr.io/microdots/runner:<version>`.
- `install.sh` + `SHA256SUMS` per release.
- `compose.yaml` versioned with the release; overrides are site-local.
- `microdots` CLI (shell shim over compose) shipped in the image and installed by the script.
- Changelog + upgrade notes + known issues.
- SBOM (CycloneDX) attached to the release.
