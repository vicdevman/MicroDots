# ADR-0008: Engine-agnostic execution — OpenCode first, multiple engines supported

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Architecture, product

---

## Context

MicroDots needs a coding execution engine. OpenCode is a strong first choice: headless server, active development, good coding ability. But coding agents are the fastest-moving layer in the stack. Committing the product to one engine would:

- make MicroDots a thin wrapper,
- force a rewrite when the upstream changes direction or pricing,
- prevent users from using the engine they already trust,
- and block side-by-side evaluation.

The PRD already frames OpenCode as an adapter (`§12`, `§32.5`) and requires OpenCode detection and compatibility handling. The requirement is stronger than "one adapter": the architecture should support **several engines at once**.

## Decision

Make execution engines **pluggable modules** behind a versioned `ExecutionEngine` contract. Ship **OpenCode as the first reference engine**, not as a product dependency.

- Engines are registered in a registry with a manifest (id, version, capabilities, transports, config schema, health).
- Multiple engines can be installed and bound to a **worker role** with routing strategies: primary, fallback, least-busy, round-robin, pinned.
- Tasks resolve an engine at runtime, **after** policy evaluation, so engine choice cannot expand permissions.
- MicroDots owns the workspace, task, approvals, artifacts and truth; the engine only edits and reports.
- Engine versions have independent compatibility ranges; installing or upgrading one never affects another.
- Native events are normalized into a small vocabulary (`engine.started`, `engine.tool`, `file.changed`, `command.finished`, …); boundary calls emit `tool.requested` from the gateway, not the engine.
- The first contract test suite proves the seam; **Cline is the second engine**, targeted at v0.2.

## Consequences

**Positive**

- Users choose OpenCode, Cline, Codex CLI, Aider or a custom engine — or several.
- Upstream churn is contained in one package.
- Side-by-side comparison becomes a feature, not a rewrite.
- The same seam generalizes to research and browser engines.
- The core stays stable while the ecosystem moves.

**Negative**

- The lowest-common-denominator contract limits access to engine-specific features.
- More moving parts: multiple version ranges, health checks and routing rules.
- Partial engines (no streaming or cancel) require an explicit degraded mode.
- Testing multiplies: every engine needs contract tests and a container profile.
- Users can create confusing configurations (e.g. a coding engine bound to the research role); validation must prevent it.

**Neutral**

- Engine selection is recorded per run for attribution and debugging.
- A comparison mode (same objective, two engines) is deferred to v0.4; it needs isolated workspace copies and a separate design, not a change to the task row.
- The installer treats engines as optional; the product starts without any.

## Invariants

1. No core import of an engine SDK; boundary lint enforces it.
2. Engine resolution happens after policy; a different engine never grants a capability.
3. One writer per workspace, enforced by an advisory lock, regardless of engine.
4. Removing an engine cannot break task history; `worker_run.engine_id` is `set null` on delete.
5. Every engine passes the shared contract suite before it can be enabled.
6. If no engine is available, the task fails with `engine_missing` and a remediation — never a crash.

## Alternatives rejected

- **Hard-code OpenCode:** fastest for week 1, worst for month 6; contradicts the product thesis.
- **One adapter interface, one active engine:** simpler, but prevents the "use both" requirement and comparison.
- **Let each engine own its task/state:** destroys the single source of truth and audit model.
- **Build a custom engine:** out of scope and not a differentiator.

## References

- [`technical-architecture.md`](../technical-architecture.md) §8
- [`extensibility-and-modules.md`](../extensibility-and-modules.md)
- [`installer-and-operations.md`](../installer-and-operations.md) §6
- PRD §12, `OPC-001…010`, `AC-006…009`
