# MicroDots — Product Thesis

**Status:** Working strategy document
**Companion:** [`master-prd.md`](./master-prd.md) (requirements), [`roadmap.md`](./roadmap.md) (execution)

---

## 1. One sentence

**MicroDots is a self-hosted AI operations team you can install on your own VPS in minutes: one orchestrator that plans work, specialized workers that do it, and a permission system that decides what they are allowed to touch.**

---

## 2. The insight

The constraint on AI doing real work is no longer raw model capability. It is **operational trust**.

People already have models that can write code, read pages and reason through plans. What they do not have is a place where that work can:

- **continue without a browser tab open**,
- **survive a restart**,
- **be inspected after the fact**,
- **stop and ask before doing something irreversible**, and
- **run against their own machines, credentials and repositories without sending everything to a vendor.**

Chat is a request/response medium. Real work is a stateful, multi-step, interruptible process. The gap between those two is the product.

MicroDots is built around a simple inversion: **the conversation is not the system.** The durable task record is. Chat is one view onto it. That single decision cascades into everything else — workers, events, approvals, recovery, notifications, and the entire UI.

---

## 3. What MicroDots is

- A **personal AI operations center** for technical people.
- A **durable task system** with an AI planner and specialized executors.
- A **permissioned execution environment** for code, tools, APIs and browsers.
- A **self-hosted, open-source product** you own and can inspect.
- A **single installable package** that works on a cheap VPS.

## 4. What MicroDots is not

| Not this | Why it matters |
|---|---|
| A chatbot with tools bolted on | If tasks are not first-class, nothing else works. This is the #1 failure mode in the space. |
| A visual workflow builder | Deterministic automation is a different product (n8n, Temporal). MicroDots is goal-directed, not step-scripted. |
| An agent framework / SDK | We ship a product, not a library. Extensibility is a property, not the pitch. |
| A hosted SaaS | The value is ownership. A hosted tier may exist later, but never as the only option. |
| A general-purpose autonomous employee | It asks for judgment. That is a feature, not a limitation. |
| A wrapper around OpenCode | OpenCode is the first serious worker engine, behind the engine contract. The orchestrator, tasks, policy and UI stand alone. |

---

## 5. Who it is for

### Primary: the technical solo builder

A developer, indie founder, researcher or homelab operator who:

- already pays for a VPS or can spin one up,
- has API keys and repositories,
- wants delegation without handing their whole machine to a black box,
- values ownership of data and infrastructure,
- is comfortable with a terminal once, and never again.

They are not looking for a demo. They are looking for something that quietly finishes work while they are away.

### Secondary: the small technical studio (2–8 people)

Shared projects, shared workers, distinct permissions, an audit trail. This is the v0.5+ story, and it validates the multi-user model without changing the core.

### Explicit non-user (initially)

Non-technical consumers. The product requires a VPS, API keys and repositories. Pretending otherwise would distort the UX and the security model.

---

## 6. Jobs to be done

1. **"Fix this while I do something else."** Delegate a bounded engineering task and come back to evidence, not promises.
2. **"Tell me what actually happened."** Get a verified outcome with logs, diffs, links and timestamps — not a confident paragraph.
3. **"Don't let it break my stuff."** Know exactly what it may read, write, run and deploy, and be asked before anything consequential.
4. **"Keep my keys and code mine."** Run it on infrastructure I control, with secrets that never reach a browser.
5. **"Reuse how I work."** Teach it repeatable workflows once, then invoke them by name.

---

## 7. The wedge

**Coding-first, on your own VPS, with approvals.**

Why coding first:

- It is the highest-value, most frequently requested delegation.
- Success is objectively verifiable (tests pass, build succeeds, diff is correct).
- The execution engine already exists and is excellent (OpenCode).
- It forces the hard parts — workspaces, isolation, permissions, artifacts, long runs — to be real from day one.
- It creates a credible "this thing actually works" moment in under 15 minutes.

Why not start with browser automation or research:

- Browser work is fragile and demo-friendly but trust-hostile.
- Research is valuable but low-defensibility and cheap to replicate.
- Both are additive once the task/policy/worker core exists. Neither validates the architecture.

The wedge is deliberately narrow: **one orchestrator, one coding worker, one approval flow, one verified result.** Everything else is a fast follow on a proven spine.

---

## 8. Differentiation

| Alternative | What it does well | Where MicroDots differs |
|---|---|---|
| ChatGPT / Claude with agents | Polished chat, strong models | No durable server-side tasks, no self-hosting, no project-scoped permissions, no audit trail |
| Devin / cloud coding agents | Autonomous coding | Hosted, opaque, expensive, no BYO infrastructure, no general ops surface |
| OpenHands / SWE-agent | Open-source coding agents | Agent-centric, not operations-centric; no policy engine, approvals model or multi-worker product |
| n8n / Zapier | Deterministic automation | No goal decomposition or judgment; workflows must be designed up front |
| LangGraph / CrewAI | Agent orchestration libraries | Developer frameworks, not installable products; no UX, auth, installer or trust model |
| Home Assistant (analogy) | Self-hosted, local-first, community | MicroDots is the same posture applied to AI work rather than home devices |

The defensible part is **not the model**. It is the combination of:

1. A trust UX that makes autonomy legible and interruptible.
2. A policy/permission model that is enforced in code, not in prompts.
3. Installability that respects a $10 VPS.
4. An open extension surface (skills, adapters, MCP) that compounds with the community.

---

## 9. Product principles (and what they forbid)

| Principle | In practice | Forbidden |
|---|---|---|
| **Tasks are the system** | Every request becomes a durable record with state, events and artifacts | Chat-only features that cannot be recovered or audited |
| **The server owns execution** | Closing the client changes nothing | Client-side loops, browser-held state, "keep this tab open" |
| **Permission beats persuasion** | The gateway decides; the model proposes | Relying on system prompts for safety |
| **Ask at the edge of judgment** | Approvals are specific, scoped and expiring | Approval fatigue; blanket "allow everything" toggles |
| **Visible or it didn't happen** | Status, logs, diffs, links, verification | Claiming success without evidence |
| **Boring infrastructure** | One Postgres, one compose file, one reverse proxy | Kubernetes, Kafka, microservices for a single-owner install |
| **Extend without forking** | Skills, adapters, MCP, UI registry | Core changes for every new integration |
| **Own your data** | Local DB, local artifacts, exportable | Vendor lock-in, hidden telemetry |

---

## 10. The experience we are aiming for

A user installs MicroDots on a fresh VPS with one command. They open a URL, claim the instance with a one-time token, create a passkey, paste a model key, and connect a repository. Ten minutes, no YAML.

They type: *"The build is failing on main. Find out why, fix it, run the tests, and show me the diff."*

The orchestrator restates the goal, creates a task, and assigns the coding worker. The task card appears and starts moving. The user closes the laptop.

On the train, a push notification: **"Approval needed: push branch `fix/build` to origin."** They see the diff summary, the test results, and the exact command. They approve.

At home, the task is complete: root cause, changed files, test output, a link to the branch, and an honest note about what was not verified. The whole timeline is still there. The server was rebooted in between. Nothing was lost.

That is the product. Not the demo — the Tuesday.

---

## 11. Success metrics

### North star

**Verified tasks completed per active installation per week.** Not messages, not agents, not tokens. Work that finished and can be proven.

### Leading indicators

| Metric | Target for v0.1 | Why |
|---|---|---|
| Time from install command to first chat | < 10 min | The installer is the product |
| Time to first completed task | < 30 min | Proves the loop end-to-end |
| Approval response latency (median) | < 10 min | The human-in-the-loop must not be a bottleneck |
| Task recovery success after restart | 100% of eligible tasks | Durability is the promise |
| False-success rate (claimed vs verified) | 0 | Trust is the moat |
| Setup abandonment rate | < 20% | Measures onboarding friction |
| Week-4 retention (installations with ≥1 task/week) | > 40% | Product-market signal |

### Anti-metrics (things we refuse to optimize)

- Number of workers or integrations shipped.
- Token spend or "autonomy percentage".
- Time spent in the app. The goal is to leave and come back to results.

---

## 12. Risks that could kill this

| Risk | Why it is serious | Mitigation |
|---|---|---|
| **Scope collapse** | The PRD describes a platform; trying to ship it all yields a demo that does nothing well | Ruthless MVP: one worker, one verified workflow; backlog gated by milestone |
| **Trust incident** | One destructive unapproved action destroys the premise | Policy before power: gateway and approvals ship before the first write-capable worker |
| **"Just a wrapper"** | OpenCode churn or model changes erode the product | Adapter boundary; tasks/policy/UI independent; second worker type in v0.2 |
| **Installer fragility** | A failed install is a lost user before first value | Idempotent, state-aware, tested on 3 providers; `doctor` command |
| **Small-VPS reality** | Browsers + coding + DB exhaust 2 GB | Explicit minimums, concurrency caps, resource-aware queue, graceful queueing |
| **Cost surprise** | A runaway agent burns API budget | Per-task budgets, usage accounting, hard stops, visible spend |
| **Prompt injection** | Web/repo content manipulates a worker | Content treated as data, tool allowlists, policy outside the model, egress limits |
| **Maintainer burnout** | Open-source infra products are heavy | Boring stack, one deployable, docs-as-code, narrow v1 surface |

---

## 13. Where this goes (three horizons)

### Horizon 1 — "It works" (v0.1, ~12–14 solo weeks)

One orchestrator, one coding worker, durable tasks, policy + approvals, PWA, one-command install, verified results. A technical user can trust it with a real repository.

### Horizon 2 — "It's useful daily" (v0.2–v0.4, ~3–4 months after MVP)

Research worker, MCP integrations, a real skill bank, browser worker with human takeover, deployment workflows, standing grants, cost controls. MicroDots becomes the place work goes, not a demo you show people.

### Horizon 3 — "It's a platform" (v1.0+)

Multi-user and teams, native mobile, a curated extension ecosystem, scheduling and recurring work, richer generative UI, optional hosted relay for push/remote access (never required). The self-hosted core stays free and complete.

The invariant across all three horizons is the PRD's closing line: **one human-directed orchestrator, multiple specialized workers, persistent tasks, extensible tools and skills, controlled execution, clear visibility, human intervention when needed.**

---

## 14. What would make us wrong

We should revisit this thesis if:

- Models become reliably agentic inside a chat product with durable server-side execution and per-tool permissions (the platform absorbs the category).
- Target users prove unwilling to run a VPS at all (then the product needs a first-party hosted tier or a one-click marketplace image, not a redesign).
- Coding agents commoditize to the point where the *coding* wedge has no pull (then lead with operations: deployments, monitoring, research, browser work — the spine still holds).
- Approval friction proves higher than abandonment from mistakes (then invest in scoped standing grants and better risk classification, not in removing the gate).

Each of these is a strategy change, not an architecture change. That is the point of building the spine first.
