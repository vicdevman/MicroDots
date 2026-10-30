# MicroDots — UX Specification

**Status:** Structural spec v1 — visual design pending
**Audience:** Design, frontend, product, AI agents
**Related:** [`product-thesis.md`](./product-thesis.md) §10 · [`api-contracts.md`](./api-contracts.md) · [`data-model.md`](./data-model.md)

---

## 1. Experience principles

MicroDots should feel like **a quiet operations desk**, not a slot machine.

| Principle | What it means | What it forbids |
|---|---|---|
| **Answer three questions first** | What needs me? What is running? What finished? | Dashboards full of vanity metrics |
| **Calm by default, loud when it matters** | Muted surfaces; strong emphasis only for approvals, failures and blocks | Confetti, pulsing gradients, constant toasts |
| **The task is the object** | Work has a stable identity, state and history | Results that exist only as chat text |
| **Show the evidence** | Diffs, commands, test output, links, timestamps | "Done!" without proof |
| **One primary action per moment** | Every screen has an obvious next step | Competing CTAs, ambiguous icon rows |
| **Interrupt with respect** | Ask only when judgment or authorization is required | Approval for every harmless step |
| **Reversible confidence** | Say what can be undone, and how | Hiding irreversible consequences |
| **Own the wait** | Long work is visible, resumable and reportable | Spinners that block the app |
| **Keyboard-first, touch-friendly** | Power users move fast; phones work fully | Desktop-only interactions |

### The emotional target

- **Before:** "I have a pile of things and no time."
- **During:** "It's working, and it will ask me if it matters."
- **After:** "I know exactly what happened, and I can prove it."

---

## 2. Information architecture

```text
Home (conversation)
├─ Needs-you strip (approvals, questions, blocks)
├─ Message stream with inline task cards
└─ Composer (project · mode · send)

Tasks
├─ List / board (status, project, worker, engine)
└─ Task detail
   ├─ Overview (objective, plan, verification)
   ├─ Timeline (events, progress, tool calls)
   ├─ Artifacts (diff, tests, reports, files)
   ├─ Logs (collapsed, filterable)
   └─ Approvals (inline + linked)

Approvals
├─ Pending (sorted by expiry, then risk)
├─ Decided (history)
└─ Approval detail (what/where/why/evidence/actions)

Projects
├─ List
├─ Project detail (repo, branch, workspace, grants, default engine, mode)
└─ Connect project (wizard)

Team
├─ Workers (roles, engines, load, health)
├─ Worker detail (prompt, model, limits, skills, recent runs)
└─ Engines (installed, version, health, routing)

Settings
├─ General (instance, URL, timezone)
├─ Operating mode
├─ Model providers
├─ Engines & routing
├─ Notifications
├─ Security (sessions, passkeys, recovery, API tokens)
├─ Data (backup, export, retention)
└─ System
   ├─ Health & logs
   ├─ Resources (host, budget, queue, cleanup)   (P2)
   └─ Memory (inspect/forget/export)              (P6)

Browser takeover (P5)
└─ /runs/:id/browser (screenshot + input; WebRTC later)
```

### Navigation by viewport

**Desktop ≥ 1280 px:** fixed left rail (72 px icons + labels on hover, 240 px expanded), content max-width 1100 px, optional right context panel for task detail. Between 1024 and 1279 px, the context panel becomes a full-screen detail view. Exact layout: §11.

**Tablet 640–1023 px:** icon rail, content, task detail as a full screen.

**Mobile < 640 px:** bottom tab bar with **Home · Tasks · Approvals · Team**, plus a "More" sheet for Projects, Settings, System. Approvals tab shows a badge count. Composer is sticky above the keyboard.

**Global "Needs you" indicator:** a single badge on the nav and a persistent strip on Home. It aggregates approvals, questions and blocks. It is the one thing allowed to be visually loud.

---

## 3. Screen inventory (active path)

| # | Screen | Route | Purpose |
|---|---|---|---|
| 1 | Setup | `/setup` | Claim instance, create owner, passkey, provider, project |
| 2 | Login | `/login` | Passkey-first sign in |
| 3 | Home / Chat | `/` | Converse, see active work, act on needs-you |
| 4 | Tasks | `/tasks` | All work, filtered |
| 5 | Task detail | `/tasks/:id` | Inspect and intervene |
| 6 | Approvals | `/approvals` | Decide pending actions |
| 7 | Approval detail | `/approvals/:id` | Full evidence and decision |
| 8 | Projects | `/projects` | Repositories and access |
| 9 | Project detail | `/projects/:id` | Repo, grants, engine, workspace |
| 10 | Team | `/team` | Workers and engines |
| 11 | Worker detail | `/team/workers/:id` | Configuration and runs |
| 12 | Engines | `/team/engines` | Installed engines, health, routing |
| 13 | Settings | `/settings/*` | Mode, providers, security, data |
| 14 | Security | `/settings/security` | Sessions, passkeys, tokens, recovery |
| 15 | System | `/settings/system` | Health, version, logs, diagnostics |
| 16 | Resources | `/settings/resources` | Host, budget, queue, usage, cleanup (P2) |
| 17 | Browser takeover | `/runs/:id/browser` | Screenshot/input human takeover (P5) |
| 18 | Memory | `/memory` | Inspect, correct, forget, export (P6) |

Later / deferred product track: Skills, Integrations, Rooms, Audit viewer, Members.

---

## 4. Wireframes

### 4.1 Home / Chat (desktop)

```text
┌──────────┬───────────────────────────────────────────────────────────────┐
│ ◉ Micro  │  Home                                        ⌘K   ● Live      │
│          │                                                               │
│ ⌂ Home   │  ┌─────────────────────────────────────────────────────────┐  │
│ ▤ Tasks 3│  │  NEEDS YOU                                              │  │
│ ✓ Appr. 1│  │  ⚠ Approval · push branch fix/build     R2 · 12m left   │  │
│ ◈ Team   │  │    [ Review ]                                           │  │
│ ▦ Projects│ └─────────────────────────────────────────────────────────┘  │
│          │                                                               │
│          │  You  09:12                                                   │
│          │  Tests are failing on main. Find the cause, fix it, and       │
│          │  show me the diff.                                            │
│          │                                                               │
│          │  Coder · working                                   14m 22s    │
│          │  ┌─────────────────────────────────────────────────────────┐  │
│          │  │ ● Running tests            ████████░░░  72%             │  │
│          │  │ 3 files changed · +48 −12 · opencode                    │  │
│          │  │ [ Open task ]                                           │  │
│          │  └─────────────────────────────────────────────────────────┘  │
│          │                                                               │
│          │  MicroDots  09:13                                            │
│          │  Root cause: a null check missing in `parseConfig`. I fixed   │
│          │  it and added a regression test. Waiting on you to approve    │
│          │  the push.                                                    │
│          │                                                               │
│          │ ┌───────────────────────────────────────────────────────────┐ │
│          │ │ Ask for work…                    ◎ acme-api  ◐ Balanced ▲ │ │
│          │ └───────────────────────────────────────────────────────────┘ │
└──────────┴───────────────────────────────────────────────────────────────┘
```

Notes:

- The needs-you strip is the only high-contrast block.
- Task cards are inline, compact, and expandable; they never replace the message.
- The composer shows the active project and mode; tapping either opens a quick switcher.
- "Live" reflects SSE connection state; when reconnecting, it becomes "Reconnecting…" with a tooltip.

### 4.2 Home (mobile)

```text
┌─────────────────────────────┐
│ MicroDots          ● Live   │
│                             │
│ ┌─────────────────────────┐ │
│ │ 1 thing needs you       │ │
│ │ Review push · R2        │ │
│ └─────────────────────────┘ │
│                             │
│ You 09:12                   │
│ Tests are failing on main…  │
│                             │
│ Coder · working      14m    │
│ ┌─────────────────────────┐ │
│ │ ● Running tests   72%   │ │
│ │ 3 files · +48 −12       │ │
│ └─────────────────────────┘ │
│                             │
│ MicroDots 09:13             │
│ Root cause: missing null…   │
│                             │
├─────────────────────────────┤
│ Ask for work…        [ ➤ ]  │
├─────────────────────────────┤
│ ⌂ Home  ▤ Tasks  ✓(1)  ◈ Team│
└─────────────────────────────┘
```

### 4.3 Task detail (desktop)

```text
┌──────────┬───────────────────────────────────────────────────────────────┐
│          │  ← Tasks / Fix failing build            ● Running    ⋯        │
│          │  Fix the failing build and verify tests                       │
│          │  acme-api · Coder · opencode · Balanced · R2                  │
│          │  ┌─────────────┬──────────────┬─────────────┐                 │
│          │  │  Overview   │  Timeline    │  Artifacts  │                 │
│          │  └─────────────┴──────────────┴─────────────┘                 │
│          │                                                               │
│          │  Plan                                           2/4 done     │
│          │  ✓ Inspect repository and reproduce failure                   │
│          │  ✓ Identify root cause                                        │
│          │  ● Implement fix                               running        │
│          │  ○ Run tests and report evidence               pending        │
│          │                                                               │
│          │  Waiting on approval                                          │
│          │  ┌─────────────────────────────────────────────────────────┐  │
│          │  │ Push branch `fix/build` to origin           R2 · 12m    │  │
│          │  │ +48 −12 in 3 files · tests passing                      │  │
│          │  │ [ Review ]  [ Reject ]                                  │  │
│          │  └─────────────────────────────────────────────────────────┘  │
│          │                                                               │
│          │  Recent activity                                              │
│          │  09:31  file.changed   src/config.ts        +12 −3            │
│          │  09:32  command       npm test · exit 0 · 42s                 │
│          │  09:32  approval      push requested · R2                     │
│          │                                                               │
│          │  [ Cancel task ]                              Cost $0.31 · est │
└──────────┴───────────────────────────────────────────────────────────────┘
```

### 4.4 Approval detail (mobile, bottom sheet or full screen)

```text
┌─────────────────────────────┐
│ ← Approval            R2    │
│                             │
│ Push branch `fix/build`     │
│ to origin (acme-api)        │
│                             │
│ Why                         │
│ The fix is verified locally │
│ (tests pass) and needs to   │
│ be shared for review.       │
│                             │
│ Changes                     │
│ 3 files · +48 −12           │
│ src/config.ts               │
│ src/config.test.ts          │
│ CHANGELOG.md                │
│ [ View diff ]               │
│                             │
│ Evidence                    │
│ ✓ npm test · 128 passed     │
│ ✓ build · 0 errors          │
│                             │
│ Reversible                  │
│ Yes — delete the branch     │
│ or force-push the base.     │
│                             │
│ Expires in 11:42            │
│                             │
│ [ Approve ]                 │
│ [ Reject ]  [ Request fix ] │
└─────────────────────────────┘
```

### 4.5 Tasks list

```text
┌───────────────────────────────────────────────────────────────┐
│ Tasks                                        [+ New task]     │
│ [ All ] [ Running ] [ Needs you ] [ Done ]    Project ▾  ⌕    │
│                                                               │
│ ● Running   Fix failing build       acme-api   14m   opencode │
│ ⏸ Waiting   Add pagination to API   acme-api    3m   cline    │
│ ✓ Done      Update onboarding copy  website     1h   opencode │
│ ✕ Failed    Migrate auth tables     api         2h   opencode │
│                                                               │
│ Showing 4 of 4                                                │
└───────────────────────────────────────────────────────────────┘
```

### 4.6 Setup wizard

```text
┌───────────────────────────────────────────────────────────────┐
│  MicroDots                                      Step 1 of 3   │
│  ───────────────────────────────────────────────────────────  │
│                                                               │
│  Claim this instance                                          │
│  Paste the setup token printed in your terminal.              │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ md_setup_•••••••••••••••••••••••••••••••••              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Where to find it:                                            │
│  On the server, run:  microdots setup-token                   │
│  (printed once at the end of install)                         │
│                                                               │
│                                       [ Continue ]            │
└───────────────────────────────────────────────────────────────┘
```

Step 2: create owner (name, email, password optional, **Create a passkey** primary). Show recovery codes once, with download/copy and a "I saved them" confirmation.

Step 3: connect a model provider (paste key, choose provider/model, **Test connection** with inline result) → connect a project (repo URL, branch, engine) → land on Home with a suggested first prompt.

Every step is skippable except claim and owner; skipping shows a persistent, dismissible checklist on Home ("Finish setup: add a model, connect a project").

### 4.7 Login

```text
┌──────────────────────────────────────────────┐
│              ◉  MicroDots                    │
│                                              │
│         [ Sign in with a passkey ]           │
│                                              │
│         Use password instead                 │
│                                              │
│         Trouble signing in? →                │
└──────────────────────────────────────────────┘
```

- Conditional UI allows the OS passkey sheet to appear automatically.
- "Trouble signing in?" explains recovery codes and the CLI reset, without revealing whether an account exists.

### 4.8 Team / Engines

```text
┌───────────────────────────────────────────────────────────────┐
│ Team                                                          │
│ Workers                                                       │
│ ◈ Coder     coding    opencode ▸ cline    2 runs   healthy    │
│ ◈ Researcher research opencode            0 runs   v0.2       │
│                                                               │
│ Engines                                                       │
│ ● OpenCode  0.6.4   healthy    2 slots   [ Configure ]        │
│ ○ Cline     —       not installed         [ Add ]             │
│ ● Fake      built-in healthy   1 slot                          │
│                                                               │
│ Routing · coding: opencode (primary) → cline (fallback)       │
└───────────────────────────────────────────────────────────────┘
```

Engine cards show version, health, slots, and a one-line remediation when unhealthy. "Add engine" opens a guided form with the engine's config schema rendered from JSON Schema.

### 4.9 Resources (P2)

```text
┌───────────────────────────────────────────────────────────────┐
│ System · Resources                             updated 3s ago  │
│                                                               │
│ HOST            4.0 GB total · 1.1 GB free · load 0.82        │
│ Reserve         1.0 GB (protected)                            │
│ MicroDots       2.0 GB budget · 1.6 GB in use                 │
│ PSI memory      some 0.4% · full 0.0%                         │
│                                                               │
│ RUNNING         Coder · heavy · 12m · 1.4 GB · 0.9 CPU        │
│                 Browser · idle · stopping in 2m               │
│                                                               │
│ QUEUED (2)                                                    │
│ • Fix build      heavy   RESOURCE_HEAVY_BUSY   starts ~12m    │
│ • Deploy staging standard RESOURCE_MEMORY       starts ~14m   │
│                                                               │
│ CLEANUP         last: clean · 2m ago · 0 orphans              │
│ [ Run cleanup ]                                               │
└───────────────────────────────────────────────────────────────┘
```

Rules:

- Show measured values and label estimates.
- Every queued item has one stable reason and an explanation of what would unblock it.
- The budget is read-only in the app; changing it is an operator action with a documented command.
- Cleanup failure is loud and offers a retry.

### 4.10 Browser takeover (P5)

- Opens as a full-screen view, not a modal inside a modal.
- Shows the live page as a screenshot with input controls; WebRTC is a later enhancement.
- A banner explains why the task paused and what the human must do.
- The takeover session is scoped, expiring and audited; "Done" resumes the task.
- The agent is visibly paused; the human never has to guess whether it is still acting.

### 4.11 Agent avatars (P4)

- `<microdots-bot>` appears on task cards, task detail and the agent roster.
- State is event-driven: idle, thinking, working, waiting, blocked, done, failed (mapped to the package's visual states).
- Initials fallback for unknown agents; accessible name includes the agent and state.
- The avatar never renders task content, secrets or capabilities, and never implies a permission.
- No customization UI in the fast path.

---

## 5. Core flows

### 5.1 First run (target < 10 minutes)

1. Terminal prints the URL and setup token.
2. User opens the URL → redirect to `/setup`.
3. Claim with token (paste, 15-minute window).
4. Create owner; passkey offered first; recovery codes shown once.
5. Provider: choose from OpenAI-compatible / Anthropic / Google / OpenRouter / Ollama; paste key; **Test** shows latency and model list.
6. Project: repo URL, branch, engine; validation clones and reports the detected stack in under 30 seconds.
7. Home with a suggested first task tailored to the project ("Run the tests and fix anything broken").
8. A dismissible setup checklist remains until complete.

Failure handling: every step has an inline error with the exact fix; the user can go back without losing earlier steps.

### 5.2 Delegating work

1. User types an objective (or taps a suggestion).
2. Composer shows the active project and mode; if no project, prompt to pick one (or allow a general task).
3. Message sends optimistically; a "thinking" row appears with a stop control.
4. Orchestrator replies with a one-line acknowledgment and a plan; tasks appear as cards.
5. If clarification is needed, it asks one focused question with options, not a paragraph.
6. User can leave; the task continues.

Guardrails in the composer:

- Character limit 4,000, with a clear counter near the limit.
- Cmd/Ctrl+Enter sends; Enter sends on mobile; Shift+Enter newline.
- If a project is required but missing, send is disabled with an inline reason.
- If the instance is unhealthy, a banner explains what still works.

### 5.3 Approval

1. Push/in-app notification → deep link to approval.
2. Approval screen shows: who, what, where, why, evidence, reversibility, expiry.
3. Primary action **Approve**; secondary **Reject**; tertiary **Request changes** with a note.
4. On approve: optimistic "Approving…" with a spinner, then "Approved — resuming task" and navigation back to the task.
5. On expiry: screen becomes read-only with "Expired" and a "Ask again" action that returns the task to the worker.
6. On rejection: the worker receives the note and may propose an alternative; the task does not silently fail.

Anti-patterns: no "Approve all", no hidden scroll containing the real command, no auto-approve toggle in the flow.

### 5.4 Intervention

When a worker needs a human (login, MFA, CAPTCHA, judgment):

- Task status becomes **Waiting for you** with a distinct amber treatment.
- The task detail shows exactly what is needed and why, plus a "Take over" or "Provide input" action.
- For browser takeover (v0.3), a live view opens with a clear "You are in control" state and a "Hand back" button.
- On resume, the worker restates what changed and continues from the preserved step.

### 5.5 Failure and recovery

- Failures are first-class: red-accented card, plain-language cause, "what you can do" (retry, change model, open logs, ask for help).
- Never show a raw stack trace by default; a "Technical details" disclosure holds the sanitized error and request ID.
- Recovery after restart is visible: "Recovered after restart — resumed at step 3" or "Could not safely resume; review the last action."
- Uncertain external effects are stated plainly: "The deploy may have started. Check the provider before retrying."

### 5.6 Offline and reconnect

- The app shell (navigation, static assets) loads offline.
- No task, conversation or artifact content is cached in v1. Opening a task offline shows "Connect to see this task" rather than a stale snapshot.
- Banner: "Offline — actions are disabled. Task data is not cached."
- SSE reconnect: subtle "Reconnecting…" chip; on success, replay missed events; if reset, refetch and show "Refreshed".
- Sends are never queued offline in v1 (avoids duplicate/conflicting work).

---

## 6. Status system

Status must never rely on color alone. Every state has a **label + icon + color**.

| State | Label | Icon | Color token | Notes |
|---|---|---|---|---|
| `draft` | Draft | ○ | neutral | Not yet queued |
| `queued` | Queued | ◷ | neutral | Show position if > 3 |
| `running` | Running | ● | blue | Animated only if genuinely active |
| `waiting_approval` | Needs approval | ⚠ | amber | Global needs-you |
| `waiting_input` | Needs you | ? | amber | |
| `blocked` | Blocked | ⊘ | red-muted | Explain + remediation |
| `retrying` | Retrying | ↻ | amber-muted | Show attempt |
| `completed` | Done | ✓ | green | Show verification badge |
| `failed` | Failed | ✕ | red | Retryable vs not |
| `cancelled` | Cancelled | — | neutral | Show external effect |

Verification badges on completed tasks:

- **Verified** — tests/exit code/API confirmed.
- **Partially verified** — some evidence, gaps listed.
- **Unverified** — worker claims completion without evidence (explicitly labeled).

---

## 7. Component inventory

### 7.1 Primitives

Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Tabs, Dialog, Sheet, Popover, Tooltip, Toast, Badge, Avatar, Progress, Skeleton, Separator, ScrollArea, Command palette.

Built on Radix + Tailwind, themed with semantic tokens. No custom focus handling; use the primitive.

### 7.2 Composites

| Component | Used on | Notes |
|---|---|---|
| `NeedsYouStrip` | Home, nav | Aggregates approvals/questions/blocks |
| `TaskCard` | Home, Tasks | Compact and expanded variants |
| `TaskStatusPill` | Everywhere | Icon + label + color |
| `WorkerAvatar` | Cards, detail | Uses the existing avatar package; initials fallback |
| `EngineChip` | Task, Team | Shows engine + health dot |
| `ModeBadge` | Composer, Settings | Restricted / Balanced / Autonomous |
| `ApprovalCard` | Home, Approvals | Risk, scope, expiry, actions |
| `DiffSummary` | Task, Approval | File list + counts; expand to full diff |
| `EvidenceList` | Task, Approval | Commands, tests, links with status |
| `PlanList` | Task detail | Steps with states |
| `Timeline` | Task detail | Grouped events, collapsible noise |
| `ArtifactList` | Task detail | Kind icon, size, download |
| `LogViewer` | Task detail | Virtualized, search, copy, redaction notice |
| `CostMeter` | Task detail, Settings | Measured vs estimated |
| `HealthCheckRow` | System | Status, latency, message |
| `BudgetMeter` | Resources | Host reserve, MicroDots budget, measured use |
| `QueueTable` | Resources | Profile, age, stable queue reason |
| `CleanupStatus` | Resources, Task detail | Last cleanup, orphans, retry |
| `AgentAvatar` | Task, Team | Event-driven identity/state; no content |
| `EmptyState` | Everywhere | One sentence + one action |
| `InlineError` | Forms, flows | Cause + fix + retry |
| `ConnectionChip` | Global | Live / reconnecting / offline |

### 7.3 Generative UI cards (validated registry)

The model may select a card id and supply data. It may not supply code.

| Card | MVP | Schema highlights | Guardrails |
|---|---|---|---|
| `task_card` | ✅ | taskId, title, status, progress, worker, engine | taskId must exist and be visible |
| `approval_card` | ✅ | approvalId, capability, risk, expiresAt | Rendered from the approval record, not model text |
| `diff_summary` | ✅ | files[], additions, deletions, taskId | Counts derived server-side |
| `test_results` | ✅ | passed, failed, skipped, duration, command | Exit code from the run, not the model |
| `file_list` | ✅ | artifactIds[] | Must resolve to owned artifacts |
| `log_view` | ✅ | artifactId, lines | Size cap, redaction applied |
| `plan` | ✅ | steps[{title, status}] | Server-validated plan |
| `citations` | v0.2 | [{title, url, quote}] | https only, max 20, no javascript: |
| `deployment_status` | v0.4 | env, status, url, commit | URL scheme allowlist |
| `form` | v0.4 | fields[] | Never auto-submits; actions are API intents |

Rendering rules: schema validation server-side before persistence, again client-side; unknown card → generic JSON fallback; oversized payload → truncated with a notice.

---

## 8. Onboarding details

### 8.1 Setup checklist (persistent until done)

- [ ] Create owner account
- [ ] Add a passkey
- [ ] Connect a model provider
- [ ] Connect a project
- [ ] Run your first task

Each item links to the exact screen. Dismissing hides the checklist but not the underlying state.

### 8.2 First task suggestion

Generated from the project type detected during connect:

- Node project with tests → "Run the tests and fix anything that fails."
- Python project → "Set up the environment and run the test suite."
- Unknown → "Summarize this repository and suggest a first improvement."

The suggestion is a button that fills the composer; it does not auto-run.

### 8.3 Permission priming

Do not dump a permissions matrix at signup. Explain in context:

- On first write: "MicroDots can edit files in this project. It will ask before pushing or deploying."
- On first approval: a one-line explainer of what approval means and why it exists.
- Settings holds the full model for users who want it.

---

## 9. Notifications

| Event | Kind | In-app | Push | Default |
|---|---|---|---|---|
| Task completed | `task_completed` | ✓ | ✓ | On |
| Task failed | `task_failed` | ✓ | ✓ | On |
| Task blocked | `task_blocked` | ✓ | ✓ | On |
| Approval required | `approval_required` | ✓ | ✓ | On (critical) |
| Input required | `input_required` | ✓ | ✓ | On |
| Task started | `task_started` | ✓ | — | On |
| Progress milestones | `task_progress` | ✓ | — | Off |
| System health degraded | `system_health` | ✓ | ✓ | On |
| Security event | `security` | ✓ | ✓ | On |
| Browser takeover (v0.3) | `takeover_required` | ✓ | ✓ | On |

Rules:

- Push permission is requested **after the first task is created**, with a one-sentence rationale — never on page load.
- Push payload contains no secrets, only ids and a short title.
- Deep links open the exact approval/task after auth.
- Delivery failure never removes the inbox item (`NTF-003`).
- Quiet hours are configurable (v0.5); critical approvals always break quiet hours if enabled.

---

## 10. Accessibility (WCAG 2.2 AA)

- **Semantics:** real buttons, links, headings, lists; no clickable divs.
- **Focus:** visible 2 px focus ring, logical order, focus trap in dialogs, focus restored on close.
- **Keyboard:** all actions reachable; `⌘K` command palette; `g h` / `g t` / `g a` navigation shortcuts; `Esc` closes overlays.
- **Screen readers:** status changes announced via `aria-live="polite"` (approvals via `assertive`); task status has text, not just color; progress has `aria-valuenow`.
- **Contrast:** ≥ 4.5:1 body, ≥ 3:1 large text and UI boundaries; verified in both themes.
- **Targets:** ≥ 44×44 px on touch.
- **Motion:** respect `prefers-reduced-motion`; no parallax; progress animation disabled when reduced.
- **Zoom:** usable at 200% and 320 px width without horizontal scroll.
- **Forms:** labels always visible (no placeholder-only), errors linked with `aria-describedby`, no time-limited forms except approval expiry (which is stated and generous).
- **Language:** plain language, no idioms in critical actions, abbreviations expanded on first use.

---

## 11. Responsive behavior

| Breakpoint | Layout |
|---|---|
| ≥ 1280 | Rail + content + optional context panel |
| 1024–1279 | Rail + content |
| 768–1023 | Icon rail; detail as full screen |
| < 768 | Bottom nav; single column; sticky composer; sheets for actions |

Mobile specifics:

- Task cards truncate titles to two lines; tap opens detail.
- Diff viewer is horizontally scrollable with line numbers pinned.
- Approvals open as a full screen, not a modal inside a modal.
- The composer grows to a max of 6 lines, then scrolls.
- Pull-to-refresh on lists; no infinite scroll without a "load more" fallback.

---

## 12. Motion and feedback

| Interaction | Motion | Duration |
|---|---|---|
| Page transition | Fade + 4 px rise | 150 ms |
| Sheet/dialog | Slide/fade | 200 ms |
| Task status change | Crossfade pill + subtle highlight | 250 ms |
| New event | Fade-in row, no layout jump | 150 ms |
| Approval needed | One-time amber pulse on the nav badge, then static | 600 ms, once |
| Progress | Determinate bar; indeterminate only when no percentage | — |
| Reduced motion | Opacity only | ≤ 100 ms |

No sound by default. No confetti. No skeleton longer than 800 ms without a message.

---

## 13. Microcopy

Voice: **calm, specific, honest, never salesy.**

| Context | Good | Bad |
|---|---|---|
| Task start | "I'll inspect the repo, reproduce the failure, and report the cause before changing anything." | "On it! 🚀" |
| Long run | "Still running — tests are taking longer than usual." | "Please wait…" |
| Success | "Fixed and verified. 128 tests pass. Diff: 3 files." | "Done!" |
| Unverified | "The fix looks right, but I couldn't run the tests (no test command found)." | "Fixed." |
| Denied | "I can't push to `main` — that isn't allowed for this project. I can push a branch instead." | "Permission denied." |
| Approval | "Push branch `fix/build` to origin? This shares the change with your team." | "Allow operation?" |
| Failure | "The test command timed out after 30 minutes. You can raise the limit or split the task." | "Something went wrong." |
| Offline | "You're offline. Task data isn't available until you reconnect; actions are paused." | "Network error." |

Rules:

- Never claim success without evidence.
- Never use "just", "simply", "obviously".
- Name the thing: file, branch, environment, command.
- Errors state cause, effect, and next action.
- No emoji in critical states.

---

## 14. Design tokens (structure, not final visual)

Visual design is pending, but the token *shape* is fixed so implementation can start.

```text
color.bg.{canvas, surface, raised, overlay}
color.fg.{default, muted, subtle, inverted}
color.border.{default, strong, focus}
color.status.{neutral, info, success, warning, danger}.{bg, fg, border}
color.accent.{default, hover, active, fg}
color.risk.{r0..r4}.{bg, fg}

font.sans / font.mono
text.{xs, sm, base, lg, xl, 2xl, 3xl}
weight.{regular, medium, semibold}
leading.{tight, normal, relaxed}

space.{0,1,2,3,4,5,6,8,10,12,16,20,24}
radius.{sm, md, lg, xl, full}
shadow.{sm, md, lg, overlay}

motion.duration.{fast, base, slow}
motion.ease.{standard, enter, exit}

z.{base, sticky, overlay, toast, command}
```

Constraints:

- Dark and light themes from the same semantic tokens; no hard-coded hex in components.
- Status colors are paired with icons and labels.
- Max content width 1100 px; readable line length 72 ch.
- 4 px spacing grid; 8 px baseline for text.
- Avatar package integrated as-is; consistent crop, ring, and fallback.

---

## 15. Empty, loading and error states

Every list and screen must define:

| State | Requirement |
|---|---|
| **Empty** | One sentence explaining the value + one primary action |
| **Loading** | Skeletons matching layout; no spinner-only full pages |
| **Error** | Cause, effect, retry, request ID (collapsed) |
| **Offline** | App shell loads; task data is not cached; actions disabled |
| **Permission** | Explanation and a path to request access (v0.5) |
| **First-run** | Checklist + suggested first task |

Examples:

- Tasks empty: "No work yet. Ask MicroDots to fix, research or build something." → [Start in Home]
- Approvals empty: "Nothing needs you. We'll notify you when something does."
- Team empty (no engine): "No coding engine installed. Coding tasks can't run until you add one." → [Add OpenCode]
- Queue empty: "Nothing is waiting. The host has room."
- Cleanup failed: "A previous task left something behind. [Inspect] [Retry cleanup]" — never silent.
- Memory empty: "No memories yet. Decisions you save will appear here with their sources."
- Browser takeover: "The agent is paused. Finish the sign-in, then return to MicroDots."

---

## 16. Trust UX requirements

These are product requirements, not polish:

1. **Evidence before celebration.** Completion cards link to tests, diff and logs.
2. **Risk is visible before consent.** Approval shows R2/R3 and reversibility.
3. **Scope is exact.** The branch, environment, path and command are named.
4. **Expiry is visible.** Countdown on pending approvals.
5. **Failure is honest.** Uncertain outcomes say so.
6. **No silent retries of consequential actions.** Retries are shown.
7. **Mode is always visible** in the composer; changing it confirms the effect.
8. **Engine is always attributable.** Task cards show which engine did the work.
9. **Every action is reversible or labeled irreversible.**
10. **The system never pretends to be human.** Worker names and avatars are clearly AI; avatar state reflects real events, not a decorative guess.
11. **Resources are visible, not mysterious.** The owner can see the reserve, budget, queue reason and cleanup result.

---

## 17. UX acceptance criteria (active fast path)

- A first-time user completes setup and starts a task in under 10 minutes without documentation.
- A user can identify what needs them within 3 seconds of opening Home.
- A user can explain what an approval will do and whether it is reversible after reading it once (usability test, 5 participants, ≥ 80% correct).
- A user can find the evidence for a completed task in ≤ 2 taps.
- All core flows work at 320 px width and with keyboard only.
- Lighthouse accessibility = 100 on Home, Tasks, Approval detail.
- No status is communicated by color alone.
- Offline mode never shows an enabled action that cannot complete.
- Reconnect after 60 s offline replays events with no duplicates or gaps in the visible timeline.

---

## 18. Open design questions

Tracked in [`decisions.md`](./decisions.md):

- Final visual direction (typography, brand, illustration).
- Avatar package integration specifics.
- Whether Home is single-conversation or a conversation list on desktop.
- Density preference (comfortable vs compact) for power users.
- Whether approvals appear inline in chat only or also as a dedicated persistent panel.
- Exact copy for the three modes (need a one-line explanation each).
- Whether to show estimated cost before running a task by default.
