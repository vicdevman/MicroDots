# MicroDots — Decision Log

**Status:** Living record
**Last updated:** 2026-10-30
**Rule:** A decision that is expensive to reverse gets an ADR. Everything else is recorded here in the open-questions table.
**Track note:** `P0`–`P7` are the active personal-operator track. `M0`–`M11` and `E0`–`E20` are the deferred product track.

---

## 1. Accepted decisions

| ADR | Decision | Status | Date |
|---|---|---|---|
| [0001](./adr/0001-monorepo-pnpm.md) | Monorepo with pnpm workspaces; no build orchestrator in v1 | Accepted | 2026-10-28 |
| [0002](./adr/0002-postgres-only-pg-boss.md) | PostgreSQL as the only datastore; pg-boss for the durable queue | Accepted | 2026-10-28 |
| [0003](./adr/0003-fastify-zod-drizzle.md) | Fastify + Zod + Drizzle for the backend | Accepted | 2026-10-28 |
| [0004](./adr/0004-react-vite-pwa-sse.md) | React + Vite PWA; SSE for realtime | Accepted | 2026-10-28 |
| [0005](./adr/0005-auth-passkey-first.md) | better-auth, passkey-first, single owner, CLI recovery | Accepted | 2026-10-28 |
| [0006](./adr/0006-ai-sdk-provider-abstraction.md) | AI SDK provider abstraction; no vendor lock-in | Accepted | 2026-10-28 |
| [0007](./adr/0007-docker-compose-caddy-deploy.md) | Docker Compose + Caddy + one-command installer | Partially superseded (optional profile) | 2026-10-28 |
| [0008](./adr/0008-engine-agnostic-execution.md) | Engine-agnostic execution; OpenCode first, multiple engines supported | Accepted | 2026-10-28 |
| [0009](./adr/0009-license-agpl.md) | License: AGPL-3.0-only | Accepted | 2026-10-28 |
| [0010](./adr/0010-local-content-addressed-artifacts.md) | Local content-addressed artifact storage with an adapter | Accepted | 2026-10-28 |
| [0011](./adr/0011-native-systemd-execution.md) | Native systemd/cgroup execution is the default runtime; Docker is optional | Accepted | 2026-10-30 |
| [0012](./adr/0012-operator-owned-resource-budgets.md) | Operator-owned resource budgets and admission control | Accepted | 2026-10-30 |
| [0013](./adr/0013-personal-operator-first.md) | Personal operator first; open-source product track deferred | Accepted | 2026-10-30 |

---

## 2. Decisions in force (summary)

1. **One control plane, one Postgres.** App and worker share code; the native runtime is the default; Docker Compose remains an optional profile.
2. **Tasks are the system.** Chat is a view; the durable task record is authoritative.
3. **Policy outside the model.** Gateway + pure evaluator + scoped approvals.
4. **Engines are modules.** OpenCode is first, never required; Cline and others are additive.
5. **Models are modules.** Any AI SDK-compatible provider; per-worker binding.
6. **Deny by default.** No grant, no action.
7. **Balanced is the default mode.**
8. **Resources are operator-owned.** The agent may request a profile; it cannot grant or raise one.
9. **No paid service is required.** Model inference is the only unavoidable external cost; managed Postgres/storage are optional.
10. **No telemetry by default.**
11. **English-only UI in v1**, strings structured for later extraction.
12. **No second datastore.** A graph or vector database needs an ADR and a measured reason.

---

## 3. How to change a decision

1. Open an ADR with status `Proposed`.
2. State the decision, context, alternatives, consequences and migration cost.
3. Get review from a maintainer (and a second reviewer if security-related).
4. If accepted, mark `Accepted`, link it here, and update affected docs in the same PR.
5. Superseded ADRs are never deleted; they get `Superseded by ADR-XXXX`.

---

## 4. Open decisions

These block or shape upcoming milestones. Each has a recommendation so work can continue without waiting.

**D1 — Project license: resolved.** AGPL-3.0-only was adopted on 2026-10-28 ([ADR-0009](./adr/0009-license-agpl.md)); [`LICENSE`](../LICENSE) is present. The SDK/contracts license remains open as D17.

| # | Decision | Recommendation | Needed by | Owner |
|---|---|---|---|---|
| D2 | **Public domain and install URL** | `microdots.dev` + `get.microdots.dev/install.sh`; fallback to GitHub raw. Deferred product track | Product track | Owner |
| D3 | **Default model provider** | No default vendor. Offer OpenAI-compatible, Anthropic, Google, OpenRouter, Ollama. Recommended preset: Anthropic Claude for coding, but user chooses | P3 | Owner |
| D4 | **OpenCode supported range** | Pin the latest stable minor at release; accept `>=0.6 <0.7` initially; test upgrades | P4 | Backend |
| D5 | **Cline as second engine** | Deferred until the first engine is verified end to end; requires headless transport validation | P4+ | Backend |
| D6 | **Visual design direction** | Structure first (this doc set); brand/type/color from the incoming design docs; tokens defined, values pending | P2 | Design |
| D7 | **Avatar package integration** | Use as-is; map worker ids to assets; initials fallback; no customization UI; wire at P4 | P4 | Frontend |
| D8 | **Artifact retention default** | Keep until task deletion; warn at 20 GB; configurable later | P3 | Backend |
| D9 | **Backup key inclusion** | Exclude master key by default; `--include-key` with warning; document the trade-off | P3 | Infra |
| D10 | **Browser isolation** | Shared Chromium/Playwright service, isolated contexts/profiles, no host display, on-demand lifecycle, human takeover | P5 | Backend |
| D11 | **Extension packaging** | Directory-based local install first; signed tarball registry later | Product track | Platform |
| D12 | **Native mobile distribution** | React Native via Expo; TestFlight + Play internal; no public store commitment until v1 | Product track | Mobile |
| D13 | **Telemetry** | Off by default; anonymous aggregate only, opt-in, documented payload | P3 | Product |
| D14 | **Multi-user separation of duties** | Deferred; project admins can approve later, a user cannot approve their own request unless owner | Product track | Security |
| D15 | **i18n** | English only in v1; no runtime i18n library until there is demand | Product track | Product |
| D16 | **Hosted relay** | Optional paid convenience later (push/remote access); never required for core | Post-v1 | Product |
| D17 | **SDK/contracts license** | Apache-2.0 for `packages/contracts` and a future plugin SDK, so third-party modules are not forced into copyleft | Before publishing an SDK or plugin API | Owner |
| D18 | **Host facts** | Record distro, systemd, cgroup v2, backend runtime, 80/443 owner, disk, idle headroom | P1 | Infra |
| D19 | **First workflow** | Choose repo fix/PR, Vercel deploy, or nginx deploy after D18; default recommendation: repo fix/PR because it proves the coding path | P3 | Owner |
| D20 | **Postgres choice** | Local Postgres by default; managed Postgres only as an explicit external dependency with a direct connection | P2 | Infra |
| D21 | **Access mode** | Tailscale/Cloudflare Access-first for the personal host; public auth only if needed | P2 | Owner |
| D22 | **Retrieval store** | Postgres full-text first; `pgvector` only by ADR after measurement; no dedicated vector DB | P6 | Backend |

### 4.1 D1 — License (resolved)

**Decision:** AGPL-3.0-only for the application, installer, engines and bundled skills. Full text in [`LICENSE`](../LICENSE); details in [ADR-0009](./adr/0009-license-agpl.md).

Options considered:

| License | Pros | Cons |
|---|---|---|
| **AGPL-3.0** | Keeps hosted derivatives open; strong fit for a self-hosted product; community-friendly | Some companies forbid AGPL; may deter corporate contributions |
| Apache-2.0 | Maximum adoption and contribution; patent grant | A cloud provider can host a closed fork |
| MIT | Simplest | Same as Apache, weaker patent language |
| BSL / SSPL | Commercial protection | Not OSI-approved; conflicts with "open source" positioning |

**Why:** the product's value is the self-hosted system, not the model. AGPL keeps hosted derivatives open while leaving self-hosting and internal modification unrestricted.

**Follow-up:** D17 (SDK/contracts license) before any public SDK or plugin API.

---

## 5. Deferred decisions (explicitly not now)

| Topic | Defer until | Why |
|---|---|---|
| Kubernetes/Helm | Post-v1.0 | Single VPS is the target |
| Redis/alternative queue | Never unless Postgres queue fails measured SLOs | Operational simplicity |
| Vector database / semantic memory | P6, after the operator works | Postgres full-text first; `pgvector` only by ADR; no separate vector DB |
| Dedicated graph database | Not planned | Explicit graph tables in Postgres; a second store needs an ADR |
| Workflow builder | Not planned | Different product |
| Marketplace | v0.5+ | Needs trust, signing and review capacity |
| Multi-region / HA | Post-v1.0 | No user need yet |
| Custom model hosting | Never | Not a differentiator |
| Mobile offline execution | Never | Server owns execution |
| Windows host support | Post-v1.0 | Different installer and container story |

---

## 6. Assumptions to validate

| Assumption | How to validate | When |
|---|---|---|
| The shared host can spare 2 GB for MicroDots | Real measurements with the three backends under load | P1–P2 |
| One heavy execution is enough for daily use | Queue wait and task completion data | P2–P4 |
| Coding is the right first wedge | Task type distribution | P3–P4 |
| Approval latency is acceptable | Median approval time + abandonment | P3+ |
| Native cgroup cleanup is reliable across restarts | Orphan sweep tests + real restarts | P1–P2 |
| OpenCode's headless API is stable enough | Upgrade tests across 2 minors | P4 |
| A shared browser fits the budget on 1 vCPU | Measured memory/CPU with one context | P5 |
| Users want multiple engines | Engine usage data (opt-in) + interviews | Product track |
| AGPL does not block adoption | Contributor/company feedback | Product track |

If an assumption fails, update the product thesis before changing the architecture.
