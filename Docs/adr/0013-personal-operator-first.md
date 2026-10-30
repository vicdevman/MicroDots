# ADR-0013: Personal operator first; open-source product track deferred

**Status:** Accepted
**Date:** 2026-10-30
**Deciders:** Product, architecture
**Related:** [ADR-0011](./0011-native-systemd-execution.md), [ADR-0012](./0012-operator-owned-resource-budgets.md)

---

## Context

The original plan optimized for a polished, installable open-source product: installer, passkeys, setup wizard, multi-user, marketplace, mobile. That is a large surface and it delays the thing the owner actually needs: a personal AI operator that does repository work, deployments and cloud operations on a shared VPS.

The owner has explicitly prioritized a fast working version over the full product surface. The trust core remains non-negotiable; the distribution polish does not.

## Decision

Make the **personal operator** the active track:

- Active phases: `P0`–`P7` in [`roadmap.md`](../roadmap.md).
- Fast path: native runtime (`P1`) → resource-aware scheduler/dashboard (`P2`) → first real workflow (`P3`) → OpenCode + avatars (`P4`).
- Enhancements: browser/takeover (`P5`), memory graph/retrieval (`P6`), optional surfaces (`P7`).
- Preserve the original `M0`–`M11` and `E0`–`E20` plans in [`product-roadmap.md`](../product-roadmap.md) and [`product-backlog.md`](../product-backlog.md) without renumbering.
- Keep the trust core: task state, gateway, policy, approvals, audit, secret handling, honest recovery.
- Keep one Postgres; no second datastore without an ADR.
- Add the existing avatar package to the active scope at P4; it is identity/state UI, not a core dependency.
- Keep memory graph and RAG deferred to P6; start with Postgres full-text, not a vector database.

## Consequences

**Positive**

- The owner gets a useful operator sooner.
- Engineering effort goes to runtime, resources and one real workflow instead of installer polish.
- The product track remains documented and can resume without losing history.
- Avatars and memory are explicitly scoped instead of drifting.

**Negative**

- Public install/passkey/multi-user work waits.
- The docs must distinguish the active and deferred tracks.
- Some existing M1/M2 references become historical.

**Neutral**

- The Docker reference deployment remains available.
- The product thesis and PRD remain the long-term source of truth; this ADR changes sequencing, not the vision.

## Guardrails

- Do not delete or renumber the deferred product history.
- Do not weaken the trust core to move faster.
- Do not add a second datastore, a browser per agent, or WebRTC before the fast path is stable.
- Every doc that references milestones says whether it means `P` (active) or `M` (deferred).
- The next product-track decision is explicit, not accidental.

## References

- [`roadmap.md`](../roadmap.md)
- [`backlog.md`](../backlog.md)
- [`product-roadmap.md`](../product-roadmap.md)
- [`native-execution-and-resources.md`](../native-execution-and-resources.md)
