# ADR-0007: Docker Compose + Caddy + one-command installer

**Status:** Partially superseded by [ADR-0011](./0011-native-systemd-execution.md) as the default runtime; remains valid as an optional Docker profile
**Date:** 2026-10-28
**Deciders:** Infrastructure, product

---

## Context

Users must install MicroDots on "any VPS" in minutes, without assembling dependencies. The stack includes Node, Postgres, an execution engine and TLS. The PRD requires idempotent installation, dependency detection, health checks and safe upgrades (`INS-001…010`, `§21`).

Options:

1. **Docker Compose + Caddy + shell installer.**
2. **Kubernetes/Helm.**
3. **Bare-metal systemd + native Postgres.**
4. **A single all-in-one binary (e.g. embedded Postgres).**
5. **A managed platform / marketplace image only.**

## Decision

Ship **Docker Compose** as the deployment unit, **Caddy** for TLS and reverse proxying, and a **single idempotent `install.sh`** that prepares the host, generates secrets, starts the stack and verifies health.

- Images pinned by digest, multi-arch (amd64/arm64).
- Only Caddy publishes ports.
- Support three access modes: domain + automatic TLS, existing proxy, tunnel. LAN/IP documented as limited.
- Postgres runs in Compose by default, with a documented path to a managed instance.
- `microdots` CLI wraps compose for backup, restore, upgrade, doctor and uninstall.

## Consequences

**Positive**

- One artifact works on any Docker-capable VPS.
- TLS is automatic and correct by default.
- Postgres and app versions are pinned together; no "works on my distro".
- Idempotent re-runs and upgrades are testable in CI.
- Users can inspect and modify a readable compose file.

**Negative**

- Docker becomes a prerequisite (installer handles it).
- Compose is not a scheduler; multi-host scaling needs a different story (post-v1).
- Docker on some VPS providers has storage-driver or firewall quirks; the installer must detect them.
- Image size and pull time affect "seconds".

**Neutral**

- Kubernetes support can be added later without changing the app.
- Bare-metal remains possible but unsupported in v1.

## Guardrails

- No `latest` in production state; explicit version + digest.
- Only 80/443 public; no Docker socket in any container.
- Healthchecks on every service; installer fails closed.
- Re-running never rotates secrets or deletes data.
- Upgrade requires a backup and a health check; rollback is documented.
- Tested on Ubuntu 22.04/24.04, Debian 12, amd64 and arm64.

## Alternatives rejected

- **Kubernetes:** operationally hostile to the target user and unnecessary for one VPS.
- **Bare metal:** dependency drift, distro-specific bugs, harder upgrades and support.
- **All-in-one binary:** embedding Postgres and a browser engine is fragile and non-standard; also harder to isolate workers.
- **Marketplace-only:** limits the "bring your own VPS" promise.

## References

- [`installer-and-operations.md`](../installer-and-operations.md)
- [`technical-architecture.md`](../technical-architecture.md) §2, §14
- [ADR-0011](./0011-native-systemd-execution.md) — native runtime is the default; this ADR is the optional Docker profile
- [`product-roadmap.md`](../product-roadmap.md) M1, M6 — deferred product track
