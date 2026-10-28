# MicroDots

**Your own AI operations team — self-hosted, permissioned, and durable.**

One orchestrator plans the work. Specialized workers do it. A policy engine decides what they are allowed to touch. You get the results, the evidence, and the receipts — on a VPS you own.

[![Status](https://img.shields.io/badge/status-pre--alpha-orange)](#project-status)
[![License](https://img.shields.io/badge/license-AGPL--3.0--only-blue)](./LICENSE)
[![Stack](https://img.shields.io/badge/stack-TypeScript%20%C2%B7%20Node%20%C2%B7%20React%20%C2%B7%20Postgres-3178c6)](#tech-stack)

> **Project status:** documentation, architecture, and the M0 repository scaffold are complete. The app is a development shell; nothing here is installable yet. M1 (installer, auth, and the first authenticated shell) is next. The roadmap below is the plan, not a changelog.

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

## Planned for v0.1 (the working MVP)

The MVP is deliberately small: **one orchestrator, one coding worker, durable tasks, policy and approvals, a PWA, and a one-command install.** If it is not on this list, it is not in v0.1.

| Capability | Status |
|---|---|
| One-command install on Ubuntu/Debian (amd64/arm64) | Planned |
| First-run claim token, passkeys, clean auth | Planned |
| Setup wizard: provider + project | Planned |
| Chat orchestrator that plans into durable tasks | Planned |
| Task states, events, cancellation, restart recovery | Planned |
| Policy engine, three modes, scoped approvals | Planned |
| Coding worker via OpenCode, isolated runner | Planned |
| Verified results: diff, tests, logs, honest status | Planned |
| In-app + web push notifications | Planned |
| System health, backup, restore, upgrade, doctor | Planned |
| Responsive, installable PWA | Planned |

**Explicitly not in v0.1:** research worker, browser worker, MCP, multi-user, skill management UI, deployment integrations, mobile app, marketplace.

### Definition of done for the MVP

> A technical stranger installs MicroDots on a fresh VPS with one command, connects a model provider and a repository, delegates a real code fix, approves the one risky step, and receives a verified result — then closes the browser, reboots the server, and finds the task and its evidence intact.

Full criteria and demo script: [`Docs/roadmap.md`](./Docs/roadmap.md) §5.

---

## Architecture at a glance

```text
                    PWA (React + Vite)  ·  future React Native
                                   │ HTTPS
                                   ▼
                            Caddy (auto TLS)
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
        Fastify API + SSE                    Worker (pg-boss)
        auth · policy · gateway              orchestrator · scheduler
                 │                                   │
                 └──────────────┬────────────────────┘
                                ▼
                     PostgreSQL 17 (truth + queue)
                                │
                                ▼
                 Runner containers (isolated)
                 OpenCode · Cline · custom engines
                                │
                                ▼
              Models · Git · MCP · APIs · Web (allowlisted)
```

- **Modular monolith + isolated runners.** Not microservices. One VPS is the target.
- **One datastore.** Postgres holds state, events and the queue (pg-boss). No Redis.
- **Engines are modules.** Adding Cline must not touch OpenCode or the core.
- **Every effect that leaves the task sandbox goes through the gateway.** Workspace edits run in an isolated, capability-scoped container; push, network, secrets and deploys are gateway-mediated. Deny by default; approvals are scoped and single-use.

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
| Engines | OpenCode (v0.1); Cline (v0.2); others via contract | Pluggable; multiple can coexist |
| Browser (v0.3) | Playwright | Isolation and tracing |
| Deploy | Docker Compose + Caddy | One command, automatic TLS |
| Tests | Vitest, Playwright, Testcontainers | Unit, e2e, real Postgres |
| Lint | Biome | One fast tool |

**Every dependency is open source and free.** The only unavoidable cost is model inference, and it is your key, your provider.

---

## Quickstart

> Not available yet. This is the target experience for `v0.1.0`.

```bash
curl -fsSL https://get.microdots.dev/install.sh -o install.sh
less install.sh
sudo bash install.sh
```

The installer checks the OS, installs Docker if needed, generates secrets, starts the stack, verifies health, and prints:

```text
MicroDots is running at https://dots.example.com
Setup token: md_setup_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Open the URL, paste the token, create a passkey, add a model key, connect a repo. Ten minutes, no YAML.

### Local development

> The M0 scaffold runs. Installer, auth, migrations and the setup token arrive in M1.

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

| Phase | Outcome | Est. solo |
|---|---|---|
| **M0** | Docs, repo, CI, decisions | 1 wk |
| **M1** | Install + auth + empty app on a VPS | 2 wks |
| **M2** | Durable tasks, events, queue, replay | 2 wks |
| **M3** | Orchestrator creates real tasks | 2 wks |
| **M4** | Policy engine, gateway, approvals | 2 wks |
| **M5** | Coding worker via OpenCode | 3 wks |
| **M6** | **v0.1.0 MVP** — hardened, installable | 2 wks |
| **M7** | v0.2 — research, MCP, skill bank | 3–4 wks |
| **M8** | v0.3 — browser + human takeover | 4 wks |
| **M9** | v0.4 — DevOps, integrations, standing grants | 4 wks |
| **M10** | v0.5 — multi-user | 4 wks |
| **M11** | v1.0 — mobile, API freeze | 6+ wks |

**MVP: ~12–14 weeks solo, or 7–9 weeks with two engineers.** Full detail, gates and risks: [`Docs/roadmap.md`](./Docs/roadmap.md).

---

## Documentation

| Document | What it covers |
|---|---|
| [`Docs/00-index.md`](./Docs/00-index.md) | Map, reading order, conventions |
| [`Docs/master-prd.md`](./Docs/master-prd.md) | Full product requirements |
| [`Docs/product-thesis.md`](./Docs/product-thesis.md) | Positioning, users, differentiation, metrics |
| [`Docs/roadmap.md`](./Docs/roadmap.md) | Phases, MVP, gates, risks |
| [`Docs/backlog.md`](./Docs/backlog.md) | Live stories and status |
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
7. **Boring infrastructure.** One Postgres, one compose file, one VPS.
8. **Own your data.** No hidden telemetry, no required hosted service.
9. **Extend without forking.** Skills, engines and adapters are modules.
10. **Under-promise, verify, then report.**

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

**Do I need a GPU?** No. Models are API-provided (or local via Ollama if you want). A 2 vCPU / 4 GB VPS is the target.

**Do I have to use OpenCode?** No. It is the first engine, shipped in v0.1. Cline is the second (v0.2), and Codex CLI, Aider or a custom engine can run behind the same contract. Several can coexist, per project or per task.

**Does it phone home?** No telemetry by default. No required MicroDots service.

**Is it production-ready?** Not yet. Pre-alpha. The MVP is `v0.1.0`, defined by a demo that works on a fresh VPS — not by a feature list.

**Why "MicroDots"?** Small, specialized units of work that add up to something larger. Also: the opposite of a monolith agent.
