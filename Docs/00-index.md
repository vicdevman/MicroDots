# MicroDots — Documentation Index

**Doc set version:** 1.0
**Last updated:** 2026-10-28
**Project status:** Pre-alpha — documentation and architecture phase
**Source of truth for product scope:** [`master-prd.md`](./master-prd.md)

---

## 1. What this folder is

`Docs/` is the operating system of the project. The PRD says *what MicroDots must become*. The documents here say *how we build it, in what order, and how we know we are done*.

Every document is written to be read by both humans and AI coding agents. That means:

- Explicit interfaces and invariants, not vibes.
- Stable IDs for requirements, milestones, epics and stories.
- Clear "definition of done" and exit criteria.
- Decisions recorded with context and consequences, not just conclusions.

---

## 2. Reading order

### If you are new to the project (human or agent)

1. [`product-thesis.md`](./product-thesis.md) — what this is, why it exists, what "good" looks like.
2. [`master-prd.md`](./master-prd.md) — the full product specification. Read at least §1–§11, §16–§19, §29–§34.
3. [`roadmap.md`](./roadmap.md) — phases, MVP definition, release gates.
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

- [`installer-and-operations.md`](./installer-and-operations.md) — install, TLS, upgrades, backup, restore, doctor, OpenCode detection.

### If you are extending

- [`extensibility-and-modules.md`](./extensibility-and-modules.md) — contract catalogue, registry, multi-engine routing, trust tiers.
- [`skills-system.md`](./skills-system.md) — skill format, trust tiers, bundled bank.
- [`technical-architecture.md`](./technical-architecture.md) §10 — how to add engines, workers and adapters.

---

## 3. Document map

| Document | Purpose | Audience | Changes when |
|---|---|---|---|
| [`master-prd.md`](./master-prd.md) | Complete product requirements and long-term vision | Everyone | Product direction changes (rare, deliberate) |
| [`product-thesis.md`](./product-thesis.md) | Positioning, users, differentiation, success metrics | Founders, design, agents | Strategy or market assumptions change |
| [`roadmap.md`](./roadmap.md) | Phases, milestones, MVP definition, release gates | Everyone | A milestone starts or exits |
| [`backlog.md`](./backlog.md) | Epics and stories with status, mapped to milestones | Builders | Continuously |
| [`technical-architecture.md`](./technical-architecture.md) | Stack, topology, components, flows, scaling | Builders, operators | Architecture or a core technology changes (via ADR) |
| [`extensibility-and-modules.md`](./extensibility-and-modules.md) | Module contracts, engines, registries, routing, trust | Builders, integrators | A module contract or registry rule changes |
| [`data-model.md`](./data-model.md) | Schema, enums, relationships, retention | Backend, agents | Schema changes |
| [`api-contracts.md`](./api-contracts.md) | Public API, SSE, event and adapter contracts | Frontend, backend, agents | An interface changes |
| [`security-and-auth.md`](./security-and-auth.md) | Threat model, auth, permissions, policy, secrets | Everyone | Security model changes |
| [`ux-spec.md`](./ux-spec.md) | IA, screens, flows, components, accessibility | Design, frontend | UX changes |
| [`installer-and-operations.md`](./installer-and-operations.md) | Install, TLS, upgrades, backups, diagnostics | Operators, agents | Deployment changes |
| [`engineering-guide.md`](./engineering-guide.md) | Repo layout, conventions, tests, CI, releases | Builders | Process changes |
| [`skills-system.md`](./skills-system.md) | Skill format, lifecycle, trust model, bank | Builders, skill authors | Skill format or bank changes |
| [`decisions.md`](./decisions.md) | ADR index and open product/technical decisions | Everyone | A decision is made or reopened |
| [`adr/`](./adr/) | One record per significant decision | Everyone | New significant decision |
| [`glossary.md`](./glossary.md) | Shared vocabulary | Everyone | A term is added or redefined |

---

## 4. Conventions used across these docs

### Requirement IDs

Requirement IDs come from the PRD and are never renumbered:

`ORC` orchestration · `WRK` workers · `SEC` security & execution · `TSK` tasks & persistence · `OPC` OpenCode · `INT` integrations · `SKL` skills · `BRW` browser · `UI` client · `NTF` notifications · `INS` installation · `AC` product acceptance criteria.

When a document or PR says "delivers `TSK-003`", it means that specific requirement is satisfied and testable.

### Milestone, epic, story IDs

- Milestones: `M0`–`M11` (see roadmap).
- Epics: `E0`–`E20` (see backlog).
- Stories: `E5-S3` (epic 5, story 3).
- Decisions: `ADR-0001`, `ADR-0002`, …

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
2. Authorization is enforced server-side.
3. State that must survive a restart is persisted.
4. Failure paths are handled and visible.
5. Tests exist at the level appropriate to the risk.
6. Logs and events are useful and secret-free.
7. User-facing copy is written (no placeholders).
8. Docs affected by the change are updated in the same PR.
9. The end-to-end outcome can be demonstrated.

This mirrors PRD §34.4 and is enforced in code review.

---

## 5. How these docs stay true

- **Docs are part of the change.** A PR that alters an interface, state machine, env var, permission or flow updates the relevant doc in the same PR.
- **No silent drift.** If code and docs disagree, that is a bug. Fix whichever is wrong and note it.
- **Decisions get an ADR.** Any choice that is expensive to reverse (datastore, auth model, license, deployment model, public contract) becomes an ADR in `Docs/adr/`.
- **Open questions live in one place.** [`decisions.md`](./decisions.md) §4. Do not scatter `TODO: decide` across the codebase.
- **The PRD does not absorb implementation detail.** It stays the product vision. Implementation decisions live here.

---

## 6. Current state at a glance

| Area | State |
|---|---|
| Product scope | Defined — PRD complete |
| Positioning & strategy | Defined — `product-thesis.md` |
| Roadmap & MVP | Defined — `roadmap.md` |
| Architecture & stack | Defined — `technical-architecture.md`, ADRs 0001–0010 |
| Data model | Defined (logical) — `data-model.md` |
| API contracts | Defined (v1 draft) — `api-contracts.md` |
| UX | Defined (structure and flows); visual design pending |
| Code | M0 scaffold in progress |
| Installer | Specified, not implemented |
| License | **Decided** — AGPL-3.0-only (`ADR-0009`, `LICENSE` present) |

The immediate next action is finishing `M0` in the roadmap: repository scaffold, CI, and the first vertical slice.
