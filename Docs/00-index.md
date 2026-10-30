# MicroDots — Documentation Index

**Doc set version:** 1.1
**Last updated:** 2026-10-30
**Project status:** Pre-alpha — personal operator, native runtime in progress
**Active roadmap:** [`roadmap.md`](./roadmap.md)
**Long-term product scope:** [`master-prd.md`](./master-prd.md)

---

## 1. What this folder is

`Docs/` is the operating system of the project. The PRD says *what MicroDots must become*. The documents here say *how we build it, in what order, and how we know we are done*.

Every document is written to be read by both humans and AI coding agents. That means:

- Explicit interfaces and invariants, not vibes.
- Stable IDs for requirements, phases, epics and stories.
- Clear "definition of done" and exit criteria.
- Decisions recorded with context and consequences, not just conclusions.

**Current track:** a personal AI operator on a shared 4 GB / 1 vCPU VPS. The open-source product track is preserved but deferred. See [ADR-0013](./adr/0013-personal-operator-first.md).

---

## 2. Reading order

### If you are new to the project (human or agent)

1. [`product-thesis.md`](./product-thesis.md) — what this is, why it exists, what "good" looks like.
2. [`roadmap.md`](./roadmap.md) — the active `P0`–`P7` personal-operator plan and fast-path MVP.
3. [`native-execution-and-resources.md`](./native-execution-and-resources.md) — systemd/cgroups, helper, budgets, browser, cleanup, memory position.
4. [`technical-architecture.md`](./technical-architecture.md) — stack, topology, module boundaries, runtime flows.
5. [`AGENTS.md`](../AGENTS.md) — working rules for anyone (human or AI) changing the repo.

### If you are implementing

- [`engineering-guide.md`](./engineering-guide.md) — repo layout, conventions, testing, CI, release process.
- [`data-model.md`](./data-model.md) — entities, states, indexes, retention.
- [`api-contracts.md`](./api-contracts.md) — HTTP/SSE contracts and internal adapter interfaces.
- [`security-and-auth.md`](./security-and-auth.md) — auth flows, capability model, policy matrix, isolation.
- [`backlog.md`](./backlog.md) — the live work board. Pick from here.

### If you are designing

- [`ux-spec.md`](./ux-spec.md) — IA, screens, states, flows, generative UI registry, accessibility.
- [`product-thesis.md`](./product-thesis.md) — positioning and principles the design must express.

### If you are deploying or operating

- [`installer-and-operations.md`](./installer-and-operations.md) — native personal profile, optional Docker profile, TLS, upgrades, backup, restore, doctor.
- [`native-execution-and-resources.md`](./native-execution-and-resources.md) — runtime, budget, cleanup, host facts.

### If you are extending

- [`extensibility-and-modules.md`](./extensibility-and-modules.md) — contract catalogue, `ExecutionRuntime`, engines, adapters, registries.
- [`skills-system.md`](./skills-system.md) — skill format, trust tiers, bundled bank.
- [`technical-architecture.md`](./technical-architecture.md) §10 — how to add engines, workers and adapters.

### If you are looking for the deferred product plan

- [`product-roadmap.md`](./product-roadmap.md) — original `M0`–`M11` milestones.
- [`product-backlog.md`](./product-backlog.md) — original `E0`–`E20` epics.
- [`master-prd.md`](./master-prd.md) — long-term product requirements and vision.

---

## 3. Document map

| Document | Purpose | Audience | Changes when |
|---|---|---|---|
| [`master-prd.md`](./master-prd.md) | Long-term product requirements and vision | Everyone | Product direction changes (rare, deliberate) |
| [`product-thesis.md`](./product-thesis.md) | Positioning, users, differentiation, success metrics | Founders, design, agents | Strategy or market assumptions change |
| [`roadmap.md`](./roadmap.md) | Active `P0`–`P7` plan, fast-path MVP, sequencing | Everyone | A phase starts or exits |
| [`backlog.md`](./backlog.md) | Active epics and stories with status | Builders | Continuously |
| [`native-execution-and-resources.md`](./native-execution-and-resources.md) | Native runtime, helper, budgets, browser, cleanup, memory/retrieval design | Builders, infra, security | Runtime/resource design changes |
| [`product-roadmap.md`](./product-roadmap.md) | Deferred `M0`–`M11` product milestones | Everyone | Product track resumes or changes |
| [`product-backlog.md`](./product-backlog.md) | Deferred `E0`–`E20` product epics | Builders | Product track resumes or changes |
| [`technical-architecture.md`](./technical-architecture.md) | Stack, topology, components, flows, scaling | Builders, operators | Architecture or a core technology changes (via ADR) |
| [`extensibility-and-modules.md`](./extensibility-and-modules.md) | Module contracts, engines, adapters, registries | Builders, integrators | A module contract or registry rule changes |
| [`data-model.md`](./data-model.md) | Schema, enums, relationships, retention | Backend, agents | Schema changes |
| [`api-contracts.md`](./api-contracts.md) | Public API, SSE, event and adapter contracts | Frontend, backend, agents | An interface changes |
| [`security-and-auth.md`](./security-and-auth.md) | Threat model, auth, permissions, policy, secrets | Everyone | Security model changes |
| [`ux-spec.md`](./ux-spec.md) | IA, screens, flows, components, accessibility | Design, frontend | UX changes |
| [`installer-and-operations.md`](./installer-and-operations.md) | Native profile, optional Docker, upgrades, backups, diagnostics | Operators, agents | Deployment changes |
| [`engineering-guide.md`](./engineering-guide.md) | Repo layout, conventions, tests, CI, releases | Builders | Process changes |
| [`skills-system.md`](./skills-system.md) | Skill format, lifecycle, trust model, bank | Builders, skill authors | Skill format or bank changes |
| [`decisions.md`](./decisions.md) | ADR index and open decisions | Everyone | A decision is made or reopened |
| [`adr/`](./adr/) | One record per significant decision | Everyone | New significant decision |
| [`glossary.md`](./glossary.md) | Shared vocabulary | Everyone | A term is added or redefined |

---

## 4. Conventions used across these docs

### Requirement IDs

Requirement IDs come from the PRD and are never renumbered:

`ORC` orchestration · `WRK` workers · `SEC` security & execution · `TSK` tasks & persistence · `OPC` OpenCode · `INT` integrations · `SKL` skills · `BRW` browser · `UI` client · `NTF` notifications · `INS` installation · `AC` product acceptance criteria.

When a document or PR says "delivers `TSK-003`", it means that specific requirement is satisfied and testable.

### Phase, epic and story IDs

- **Active phases:** `P0`–`P7` (see [`roadmap.md`](./roadmap.md)).
- **Active epics/stories:** `P0`–`P7`, `P1-S3` (phase 1, story 3).
- **Deferred product milestones:** `M0`–`M11` (see [`product-roadmap.md`](./product-roadmap.md)).
- **Deferred product epics/stories:** `E0`–`E20`, `E5-S3`.
- **Decisions:** `ADR-0001`, `ADR-0002`, …

Do not mix `P` and `M` without saying which track you mean.

### Status vocabulary

| Marker | Meaning |
|---|---|
| `planned` | Agreed in scope, not started |
| `in progress` | Actively being built |
| `blocked` | Cannot proceed; reason recorded |
| `done` | Meets the definition of done below |
| `deferred` | Consciously moved out of the current horizon |

### Normative language

- **MUST / MUST NOT** — required for correctness, security or compatibility.
- **SHOULD / SHOULD NOT** — strong default; deviation needs a recorded reason.
- **MAY** — optional.

### Definition of done (applies to every story)

A story is done only when all of the following are true:

1. The behavior exists in the backend, not only in the UI or in a prompt.
2. Authorization is enforced server-side; the agent cannot grant itself resources or capabilities.
3. State that must survive a restart is persisted; unverified work is never marked complete.
4. Failure, retry, cancellation and cleanup are handled and visible.
5. Tests exist at the level appropriate to the risk.
6. Logs and events are useful and secret-free.
7. User-facing copy is written (no placeholders).
8. Docs affected by the change are updated in the same PR.
9. The end-to-end outcome can be demonstrated on the target host.

This mirrors PRD §34.4 and is enforced in code review.

---

## 5. How these docs stay true

- **Docs are part of the change.** A PR that alters an interface, state machine, env var, permission or flow updates the relevant doc in the same PR.
- **No silent drift.** If code and docs disagree, that is a bug. Fix whichever is wrong and note it.
- **Decisions get an ADR.** Any choice that is expensive to reverse (datastore, auth model, license, deployment model, public contract) becomes an ADR in `Docs/adr/`.
- **Open questions live in one place.** [`decisions.md`](./decisions.md) §4. Do not scatter `TODO: decide` across the codebase.
- **The PRD does not absorb implementation detail.** It stays the product vision. Implementation decisions live here.
- **The active and deferred tracks are explicit.** `P` means active; `M`/`E` means deferred product track.

---

## 6. Current state at a glance

| Area | State |
|---|---|
| Product scope | Long-term PRD complete; personal-operator fast path active |
| Positioning & strategy | Defined — `product-thesis.md` |
| Active roadmap | Defined — `roadmap.md` (`P0`–`P7`) |
| Native execution/resources | Designed — `native-execution-and-resources.md`; P1 in progress |
| Architecture & stack | Defined; Docker demoted to optional, native systemd default |
| Data model | Defined (logical) — `data-model.md`; resource/memory tables planned |
| API contracts | Defined (v1 draft) — runtime/resource endpoints planned |
| UX | Defined (structure and flows); resource dashboard and avatars planned |
| Code | M0 and M1A complete; avatars package complete; native runtime next |
| Installer | Docker reference implemented; native personal profile specified |
| License | **Decided** — AGPL-3.0-only (`ADR-0009`, `LICENSE` present) |

The immediate next action is **P1** in [`roadmap.md`](./roadmap.md): the `ExecutionRuntime` contract, `microdots-exec` helper, transient systemd unit, cgroup limits, usage/logs, stop and verified cleanup.

Host facts still needed are listed in [`native-execution-and-resources.md`](./native-execution-and-resources.md) §12.
