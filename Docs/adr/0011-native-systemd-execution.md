# ADR-0011: Native systemd/cgroup execution is the default runtime

**Status:** Accepted
**Date:** 2026-10-30
**Deciders:** Architecture, infrastructure, security
**Supersedes:** [ADR-0007](./0007-docker-compose-caddy-deploy.md) **as the default deployment/runtime**. ADR-0007 remains valid as an optional Docker profile.

---

## Context

MicroDots is being used as a personal operator on a **4 GB RAM / 1 vCPU VPS** shared with three production backends. The host already runs native services, Docker is not the default, and the operator needs hard per-task limits without giving the app root.

The original plan (ADR-0007) made Docker Compose the deployment unit. That is still useful as a portable reference, but it is the wrong default here:

- Docker adds daemon/network/storage overhead on a 1 vCPU host.
- Running Docker on a host with existing production backends broadens the blast radius.
- The operator needs transient, per-run cgroups and cleanup, not a long-lived container stack.
- The app must not receive the Docker socket or root.

Options:

1. **Native systemd transient units/scopes + cgroups v2, with a narrow privileged helper.**
2. Docker Compose as the only runtime.
3. A root worker process with no helper.
4. Podman/rootless containers.
5. A hosted execution service.

## Decision

Use **native systemd + cgroups v2** as the default `ExecutionRuntime`:

- The app and worker run as an unprivileged user.
- A root `microdots-exec` helper exposes a narrow, typed API over a Unix socket.
- Each execution runs in a transient `microdots-run-<id>` unit/scope with cgroup limits, a confined workspace and no ambient network.
- The helper validates the operator profile, paths and executable; the caller cannot raise limits or request arbitrary systemd properties.
- Docker/Podman remain optional `ExecutionRuntime` adapters, implemented only after native is stable.
- The existing Docker artifacts are kept as an optional reference deployment, not deleted.

## Consequences

**Positive**

- No Docker dependency on the personal host.
- Per-run memory/CPU/PID limits are enforceable and observable.
- Cleanup can verify units, cgroups, processes, temp dirs and ports.
- The app/worker never get root; the helper is the only privileged surface.
- Works on the shared VPS without taking over ports or the host.

**Negative**

- Linux-only runtime; Windows/macOS development must report it unavailable.
- Distro/systemd/cgroup differences need a detection and test matrix.
- A privileged helper is a new security surface and must be reviewed.
- The product's portable installer story still needs the optional Docker path.

**Neutral**

- Docker Compose remains supported as an explicit profile.
- A future container runtime can implement the same contract.

## Guardrails

- No arbitrary shell; argv arrays only.
- No arbitrary systemd properties from the caller.
- No root in the execution unit; `NoNewPrivileges`, capability drop, protected system/home.
- Network off by default; allowlisted egress only through a separate profile/proxy.
- One heavy execution at a time unless the operator explicitly raises the budget.
- Cleanup is verified; a failed cleanup is visible.
- Every start/stop/cleanup is audited.
- Linux CI is required for the native path.

## Alternatives rejected

- **Docker-only:** wrong default for this host and increases the blast radius.
- **Root worker:** violates least privilege and the existing security invariants.
- **Podman rootless first:** still a container daemon/dependency; not needed for the native host.
- **Hosted execution:** moves the operator's code and credentials off-host; conflicts with ownership.

## References

- [`native-execution-and-resources.md`](../native-execution-and-resources.md)
- [`security-and-auth.md`](../security-and-auth.md) §8
- [`technical-architecture.md`](../technical-architecture.md) §2, §7, §15
- [`installer-and-operations.md`](../installer-and-operations.md)
