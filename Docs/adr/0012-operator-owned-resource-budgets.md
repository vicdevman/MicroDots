# ADR-0012: Operator-owned resource budgets and admission control

**Status:** Accepted
**Date:** 2026-10-30
**Deciders:** Architecture, infrastructure, product
**Related:** [ADR-0011](./0011-native-systemd-execution.md), [ADR-0002](./0002-postgres-only-pg-boss.md)

---

## Context

MicroDots runs on a shared 4 GB / 1 vCPU VPS with three production backends. A coding run, a build or a browser can consume the whole host. The operator needs a hard guarantee that MicroDots cannot starve the existing services, and the agent must not be able to raise its own limits.

Options:

1. **Operator-owned budget + admission control**, enforced by cgroups and a privileged helper.
2. Let each task set its own limits.
3. Let the model estimate and choose limits.
4. Rely on OS OOM behaviour and best-effort concurrency.
5. Move execution to a bigger host.

## Decision

Adopt an **operator-owned resource budget** with **admission control**:

- The budget is root-owned configuration and a durable active record.
- The app/worker can read it; only the operator/root can change it.
- The agent may request a workload profile; it cannot grant or raise one.
- Admission decides `allow`, `queue`, `deny` or `downgrade` before a run starts.
- One heavy execution at a time by default; the browser counts as heavy.
- A host reserve is never allocated to MicroDots.
- Every terminal task produces a cleanup result.
- The dashboard shows host health, the MicroDots budget, active/queued jobs, usage and cleanup.

## Consequences

**Positive**

- The three backends keep their reserve under load.
- Resource exhaustion becomes a visible queue/denial instead of a host incident.
- The agent cannot escalate resources through a prompt or tool.
- Measurements replace guesses over time.
- The owner can see why work is waiting.

**Negative**

- Work may wait; the operator must accept queueing on a 1 vCPU host.
- Estimation is imperfect; some tasks will be stopped at their limits.
- A budget change is an operator action, not a UI convenience.
- More state and UI to build.

**Neutral**

- The budget can be raised on a larger host without changing the architecture.
- Profiles are configuration, not code branches.

## Guardrails

- No "unlimited" profile in the fast path.
- No model-selected cgroup values.
- No admission bypass by retry, engine choice or mode switch.
- Budget changes are audited.
- Queue reasons are stable and user-visible.
- Cleanup failures are visible and retryable.
- The host reserve is checked against real measurements, not assumptions.

## Alternatives rejected

- **Task-set limits:** lets a compromised or confused task take the host.
- **Model-chosen limits:** policy and limits must not be model output.
- **OOM-only:** unpredictable and can kill production services.
- **Bigger host first:** avoids the design problem and does not satisfy the shared-host requirement.

## References

- [`native-execution-and-resources.md`](../native-execution-and-resources.md) §4, §6, §9
- [`roadmap.md`](../roadmap.md) P2
- [`backlog.md`](../backlog.md) P2
