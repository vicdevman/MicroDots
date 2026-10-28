# ADR-0002: PostgreSQL as the only datastore, pg-boss for the queue

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Architecture, backend

---

## Context

MicroDots needs durable state, a queue, event history, and recovery across restarts, on a single small VPS. The PRD requires a durable queue with retries, scheduling, cancellation and recovery (`TSK-003`, `TSK-005`, `TSK-008`).

Options:

1. **Postgres + Redis/BullMQ** — mature queue, second stateful service.
2. **Postgres + pg-boss** — queue in the same database, one service.
3. **Postgres + a custom `SELECT … FOR UPDATE SKIP LOCKED` worker** — full control, more code.
4. **Postgres + RabbitMQ/Kafka** — heavy operational burden.

## Decision

Use **PostgreSQL 17 as the only datastore**, with **pg-boss** for durable jobs. No Redis, no message broker in v1.

- Tasks, runs, events, approvals, audit, settings and jobs all live in one database.
- Job payloads contain IDs only; state is re-read at execution time.
- A runtime wrapper isolates pg-boss so it can be replaced without touching domain code.

## Consequences

**Positive**

- One service to install, back up, monitor and reason about.
- Transactional consistency between task state and job enqueue (same DB).
- Backup/restore covers queue state automatically.
- Lower memory footprint on a 4 GB VPS.
- Fewer failure modes for a self-hosted product.

**Negative**

- Queue throughput is bounded by Postgres; fine for tens of concurrent jobs, not thousands.
- Polling/notify overhead; must tune and monitor.
- pg-boss's schema and behavior become an operational dependency.
- Heavy job payloads would bloat the database (prohibited: IDs only).

**Neutral**

- Recovery still requires an explicit sweeper for stale runs; a queue alone is not recovery.
- `SKIP LOCKED` semantics must be understood by maintainers.

## Guardrails

- Job payload ≤ 4 KB, IDs only.
- One queue per concern; no unbounded retries.
- `pg_stat_statements` and queue-depth metrics from M4.
- If queue wait p95 exceeds 60 s under real load, revisit with an ADR (likely a dedicated worker host before a new broker).

## Alternatives rejected

- **Redis/BullMQ:** a second stateful service, backup story, and memory cost for a single-VPS product.
- **Custom queue:** duplicates a solved problem; pg-boss already provides retries, backoff, singleton keys and retention.
- **Kafka/RabbitMQ:** operationally hostile to the target user.

## References

- [`data-model.md`](../data-model.md) §12
- [`technical-architecture.md`](../technical-architecture.md) §5.5, §6.5
- [`roadmap.md`](../roadmap.md) M2
