# MicroDots

**Your own AI operations team — self-hosted, permissioned, and durable.**

One orchestrator plans the work. Specialized workers do it. A policy engine decides what they are allowed to touch. You get the results, the evidence, and the receipts — on a VPS you own.

[![Status](https://img.shields.io/badge/status-pre--alpha-orange)](#project-status)
[![License](https://img.shields.io/badge/license-AGPL--3.0--only-blue)](./LICENSE)
[![Stack](https://img.shields.io/badge/stack-TypeScript%20%C2%B7%20Node%20%C2%B7%20React%20%C2%B7%20Postgres-3178c6)](#tech-stack)

> **Project status:** M0, the M1A production spine and the avatar package are complete. The active track is a **personal operator** on a shared 4 GB / 1 vCPU VPS: native systemd/cgroups, operator-owned budgets, one real workflow. Docker Compose remains an optional reference profile. The current phase is **P1 — native execution runtime**; the app is not yet a daily-driver operator. The roadmap below is the plan, not a changelog.

---

## Why MicroDots

AI can write code, read pages and reason through plans. What it cannot do, in most products, is **continue working when you close the tab**, **survive a restart**, **prove what it did**, or **stop and ask before doing something irreversible**.

Chat is request/response. Real work is stateful, multi-step, interruptible, and often happens while you are asleep.

MicroDots is built on one inversion: **the durable task is the system; chat is just a view onto it.**

- **Persistent by design.** Tasks run on the server. Close your laptop, switch devices, reboot — the work and its history remain.
- **Permissioned by default.** Workers get scoped capabilities. A gateway — not a prompt — decides what executes.
- **Human-directed.** It asks when judgment, credentials or authorization are required. It does not pretend every decision is safe to automate.
- **Engine-agnostic.** OpenCode is the first coding engine. Cline, Codex CLI, Aider or a custom engine can run instead — or alongside it.
- **Self-hosted and open source.** One Postgres, one compose file, one command. Your keys, your code, your data.

---

## What it will feel like

```text
You    The build is failing on main. Find out why, fix it, run the tests,
       and show me the diff.

Dots   I'll inspect the repo, reproduce the failure, and report the cause
       before changing anything. Task created.

       ● Coder · running          acme-api · opencode · Balanced
         Reproducing failure… 2 files read, 1 command run

Dots   Root cause: a missing null check in parseConfig. I fixed it and
       added a regression test. 128 tests pass.

       ⚠ Approval needed · push branch fix/build · R2
         +48 −12 in 3 files · tests passing · expires in 12m
         [ Review ]

You    (approve from your phone)

Dots   Pushed. Branch: fix/build. Task complete, verified.
```

---

## Current fast path (P1–P4)

The personal-operator MVP is deliberately small: **native execution, an operator budget, one real workflow, the gateway/approvals, OpenCode, and avatars.** If it is not on this list, it is not in the fast path.

| Capability | Phase | Status |
|---|---|---|
| Native systemd/cgroup runtime + verified cleanup | P1 | Next |
| Operator budget, admission, queue, resource dashboard | P2 | Planned |
| First real repo/deploy workflow through the gateway | P3 | Planned |
| OpenCode coding worker | P4 | Planned |
| Agent avatars driven by real task state | P4 | Package done; wiring planned |
| Browser + human takeover | P5 | Later |
| Memory graph + retrieval (RAG) | P6 | Later |
| WebRTC / optional Docker runtime / product track | P7 | Deferred |

**Explicitly not in the fast path:** public installer/passkey polish, multi-user, marketplace, skill management UI, research worker, MCP catalog, mobile app, WebRTC, a second datastore.

### Definition of done for the fast path

> The owner asks for a real repository change or deployment. MicroDots admits it against the host budget, executes it in a confined native runtime, asks for the one consequential approval, produces evidence, cleans up completely, and survives a restart without lying about the result.

Full criteria and demo script: [`Docs/roadmap.md`](./Docs/roadmap.md) §5.

---

## Architecture at a glance

```text
                    PWA (React + Vite)  ·  future React Native
                                   │ HTTPS
                                   ▼
                    Existing proxy (nginx/Caddy/Traefik)
                                   │
                                   ▼
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
        Fastify API + SSE                    Worker (pg-boss)
        auth · policy · gateway              orchestrator · admission
                 │                                   │
                 └──────────────┬────────────────────┘
                                ▼
                     PostgreSQL 17 (truth + queue)
                                │
                                ▼
                 microdots-exec (root, narrow)
                                │
                                ▼
                 transient systemd unit + cgroup v2
                 OpenCode · Cline · custom engines
                 shared browser (on demand)
                                │
                                ▼
              Models · Git · MCP · APIs · Web (allowlisted)
```

- **Modular monolith + isolated execution runtimes.** Not microservices. One shared VPS is the target.
- **Native first.** systemd transient units + cgroups v2; app/worker unprivileged; Docker is an optional runtime/profile.
- **One datastore.** Postgres holds state, events, queue (pg-boss) and later memory. No Redis or vector DB.
- **Engines and runtimes are modules.** Adding Cline or a Docker runtime must not touch the core.
- **Every effect that leaves the task sandbox goes through the gateway.** Workspace edits run in a cgroup-limited unit; push, network, secrets and deploys are gateway-mediated. Deny by default; approvals are scoped and single-use.
- **Resources are operator-owned.** The agent requests a profile; it cannot raise a budget or cgroup limit.

Details: [`Docs/technical-architecture.md`](./Docs/technical-architecture.md) · [`Docs/extensibility-and-modules.md`](./Docs/extensibility-and-modules.md)

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | One language across API, worker, PWA and contracts |
| Runtime | Node.js 22 LTS | Stable, native fetch/WebCrypto |
| API | Fastify 5 | Schema-first, fast, first-class SSE |
| Validation | Zod 4 | Shared runtime + types with the client |
| Data | PostgreSQL 17 + Drizzle | One store; SQL-first, typed migrations |
| Queue | pg-boss | Durable jobs without a second service |
| Auth | better-auth | Passkeys, sessions, self-hosted, no vendor |
| AI | Vercel AI SDK | Provider-agnostic: OpenAI-compatible, Anthropic, Google, OpenRouter, Ollama |
| Web | React 19 + Vite 7 + Tailwind 4 + shadcn/ui | Fast PWA, accessible primitives |
| Realtime | Server-Sent Events | One-way, reconnecting, replayable |
| Engines | OpenCode (P4); Cline later; others via contract | Pluggable; multiple can coexist |
| Runtime | Native systemd + cgroups v2; Docker optional | Per-run limits, cleanup, no daemon dependency |
| Browser (P5) | Playwright, shared service | On demand, isolated contexts, human takeover |
| Deploy | Existing proxy + systemd; Docker Compose optional | Fits the shared host; no port squatting |
| Tests | Vitest, Playwright, Testcontainers | Unit, e2e, real Postgres |
| Lint | Biome | One fast tool |

**Every dependency is open source and free.** The only unavoidable cost is model inference, and it is your key, your provider.

---

## Quickstart

> The native personal runbook is P1 work; the Docker reference profile exists but is not the default. Do not run either on the shared VPS without reading [`Docs/native-execution-and-resources.md`](./Docs/native-execution-and-resources.md).

The target native flow is documented in [`Docs/installer-and-operations.md`](./Docs/installer-and-operations.md) §3.0. It will:

- detect systemd/cgroup v2 and the existing proxy;
- create an unprivileged app/worker, a narrow root helper and a root-owned budget;
- run one sample execution with limits and verified cleanup;
- print the setup URL/token once.

The optional Docker reference profile (Caddy, app, worker, Postgres) remains available from M1A. It is not required and is not what the shared host should run by default.

### Local development

> The scaffold and production spine run. Native runtime, admission and the first workflow arrive in P1–P3.

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm db:up          # PostgreSQL 17 via Docker; the API starts without it but /readyz stays 503
pnpm dev            # API :3000, web :5173, idle worker
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Health: `/healthz` (process) and `/readyz` (database)

See [`Docs/engineering-guide.md`](./Docs/engineering-guide.md).

---

## Roadmap

| Phase | Outcome |
|---|---|
| **P0** ✅ | Foundation, M1A spine, avatar package, docs pivot |
| **P1** | Native systemd/cgroup runtime, helper, limits, verified cleanup |
| **P2** | Operator budget, admission, queue, resource dashboard |
| **P3** | Gateway, approvals, audit and one real repo/deploy workflow |
| **P4** | OpenCode coding worker + avatars |
| **P5** | Shared browser + human takeover |
| **P6** | Memory graph + retrieval (RAG), Postgres-first |
| **P7** | WebRTC, optional Docker runtime, managed Postgres, product track |

**Fast path: P1–P4.** Full detail, gates and risks: [`Docs/roadmap.md`](./Docs/roadmap.md). The original product plan is preserved in [`Docs/product-roadmap.md`](./Docs/product-roadmap.md).

---

## Documentation

| Document | What it covers |
|---|---|
| [`Docs/00-index.md`](./Docs/00-index.md) | Map, reading order, conventions |
| [`Docs/master-prd.md`](./Docs/master-prd.md) | Full product requirements |
| [`Docs/product-thesis.md`](./Docs/product-thesis.md) | Positioning, users, differentiation, metrics |
| [`Docs/roadmap.md`](./Docs/roadmap.md) | Active P0–P7 plan, fast-path MVP, gates |
| [`Docs/backlog.md`](./Docs/backlog.md) | Live stories and status |
| [`Docs/native-execution-and-resources.md`](./Docs/native-execution-and-resources.md) | Native runtime, budgets, browser, cleanup, memory/RAG |
| [`Docs/product-roadmap.md`](./Docs/product-roadmap.md) | Deferred M0–M11 product plan |
| [`Docs/technical-architecture.md`](./Docs/technical-architecture.md) | Stack, topology, flows, scaling |
| [`Docs/extensibility-and-modules.md`](./Docs/extensibility-and-modules.md) | Engine/module contracts, multi-engine routing |
| [`Docs/data-model.md`](./Docs/data-model.md) | Schema, states, retention |
| [`Docs/api-contracts.md`](./Docs/api-contracts.md) | REST, SSE, events, internal contracts |
| [`Docs/security-and-auth.md`](./Docs/security-and-auth.md) | Auth, policy, isolation, threat model |
| [`Docs/ux-spec.md`](./Docs/ux-spec.md) | IA, screens, flows, accessibility |
| [`Docs/installer-and-operations.md`](./Docs/installer-and-operations.md) | Install, TLS, upgrade, backup, doctor |
| [`Docs/engineering-guide.md`](./Docs/engineering-guide.md) | Conventions, tests, CI, releases |
| [`Docs/skills-system.md`](./Docs/skills-system.md) | Skill format, trust, bank |
| [`Docs/decisions.md`](./Docs/decisions.md) | Decision log and open questions |
| [`AGENTS.md`](./AGENTS.md) | Working rules for AI agents |

---

## Principles we will not trade away

1. **The task is the system.** If it cannot survive a restart and be audited, it is not a feature.
2. **The gateway is law for boundary effects.** A model cannot push, fetch, deploy or read a secret because it asserted that it should.
3. **Deny by default.** Permissions are explicit, scoped and revocable.
4. **Ask at the edge of judgment.** Approvals are specific; no blanket toggles.
5. **Show the evidence.** "Done" requires proof.
6. **Engines are replaceable.** OpenCode is first, not forever.
7. **Boring infrastructure.** One Postgres, one host, native systemd; Docker optional.
8. **Own your data.** No hidden telemetry, no required hosted service.
9. **Extend without forking.** Skills, engines, adapters and runtimes are modules.
10. **Resources are not the agent's to take.** The operator owns the budget.
11. **Under-promise, verify, then report.**

---

## Contributing

MicroDots is in its documentation and foundations phase. The most useful contributions right now:

- Review the architecture, threat model and roadmap for gaps.
- Challenge decisions in [`Docs/decisions.md`](./Docs/decisions.md).
- Write or evaluate a skill for the bank.
- Stress-test the installer spec against a VPS you actually use.
- Build a fixture repo for engine contract tests.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`AGENTS.md`](./AGENTS.md). Please do not open public issues for security vulnerabilities — see [`SECURITY.md`](./SECURITY.md).

---

## License

**AGPL-3.0-only** — see [`LICENSE`](./LICENSE) and [`ADR-0009`](./Docs/adr/0009-license-agpl.md).

This keeps the self-hosted product open, including when someone hosts a modified version as a service. If you modify MicroDots and let other people use it over a network, AGPL §13 requires you to offer them the corresponding source. Self-hosting, internal use and private modification are unrestricted.

---

## FAQ

**Is this another chatbot?** No. Chat is one interface onto durable tasks, workers, approvals and an audit trail.

**Do I need a GPU?** No. Models are API-provided (or local via Ollama if you want). The current target is a shared 4 GB / 1 vCPU VPS, with a host reserve and one heavy execution at a time.

**Do I have to use OpenCode?** No. It is the first engine (P4). Cline and others can run behind the same contract. Several can coexist, subject to the operator budget.

**Does it phone home?** No telemetry by default. No required MicroDots service.

**Is it production-ready?** Not yet. Pre-alpha. The MVP is `v0.1.0`, defined by a demo that works on a fresh VPS — not by a feature list.

**Why "MicroDots"?** Small, specialized units of work that add up to something larger. Also: the opposite of a monolith agent.
