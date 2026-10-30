# @microdots/avatars

The MicroDots agent avatar: one black SVG shape that morphs between states
(`idle`, `thinking`, `notify`, `sleep`, `wink`, ...), eyes pierced through the
body like a mask hole, zero dependencies.

```txt
   ┌──────────────────────────── packaging ────────────────────────────┐
   │  src/bot/        the engine, ported 1:1 from bloub (see ORIGIN)   │
   │                  engine.sample(t) is a PURE function of time —    │
   │                  no framework, no clock, no DOM.                  │
   │  src/render/     a frame → virtual SVG tree → (string | DOM)      │
   │                  renderer that replaces bloub's Vue template.     │
   │  src/web.ts      <microdots-bot> custom element, no framework.    │
   │  test/           node-only tests: NaN sweep, determinism, tree.   │
   └───────────────────────────────────────────────────────────────────┘
```

Purpose in MicroDots: **each agent a user creates can wear its own avatar**
(shape × colour × rest expression from `src/bot/skins.ts` + `expressions.ts`),
and the avatar **is** the live status indicator — the morph between states is
driven by task/agent events the backend already emits. No images are served;
the avatar is vector, reactive and costs zero network.

## Product placement

| Item | Decision |
|---|---|
| Active phase | **P4 — OpenCode and agent presence** |
| Surfaces | Task card, task detail header, agent/team roster |
| State source | Backend task/run events; never a client-side guess |
| Data exposure | Identity and state only; no task content, secrets or capabilities |
| Customization UI | Later; the fast path uses the per-agent defaults + initials fallback |
| Core dependency | None; this package imports nothing and the core never imports it |

See [`Docs/roadmap.md`](../../Docs/roadmap.md) §8 and
[`Docs/ux-spec.md`](../../Docs/ux-spec.md) §4.11. The package is built and
tested; wiring is the P4 story, not a new engine or runtime dependency.

## Where things live (the map)

| Layer | Path | What it is |
|---|---|---|
| **Engine (the main stuff)** | `src/bot/engine.ts` | `engine.sample(t)` → a complete SVG frame for any time `t`. Pure, replayable, DOM-free. |
| State machine | `src/bot/states.ts` | The 14 states (`idle`, `thinking`, `notify`, ...) and every measured constant behind each pose. |
| Appearance options | `src/bot/skins.ts`, `src/bot/expressions.ts` | The customiser's tables: 8 shapes, 12 colours, 16 rest expressions. These are the per-agent knobs. |
| Frame → SVG | `src/render/tree.ts` | Pure "virtual SVG tree" builder (port of bloub's `BloubBot.vue` template, minus Vue). |
| Tree → string | `src/render/serialize.ts` | Frozen/server rendering: build the SVG as a string (vignettes, future icons, OG images). |
| Tree → DOM | `src/render/painter.ts` | Attribute-diffing painter for the animation loop (same idea as bloub's Vue patch, zero deps). |
| Browser component | `src/web.ts` | `<microdots-bot>` + `registerMicrodotsBot()`. |
| Public API | `src/index.ts` | Everything above, in one barrel. |

The **customiser UI** (click-pick a shape/colour/expression, like bloub's
"Customise" view) intentionally does **not** live in this package — it's an
`apps/web` feature; this package only exposes what the picker needs
(`SHAPE_BY_ID`, `COLOR_BY_ID`, `EXPRESSION_BY_ID`) plus `<microdots-bot>` as
the live preview.

## Why not served images

The avatar's value is the live morph when agent state changes — a static GIF or
PNG would hard-cut between states and scale badly. It is SVG at any size, costs
zero network, and the animatable state channel is one event away:

```ts
import { BotEngine, frameTree, serialize } from "@microdots/avatars";
```

The string path (`frameTree` + `serialize`) is where a *server* could join
later (task favicon, push-notification still, OG image) — not for the live UI.

## How apps use it

### 1. Register once (app entry, `apps/web`)

```ts
import { registerMicrodotsBot } from "@microdots/avatars";

registerMicrodotsBot(); // defines <microdots-bot>
```

Since apps import workspace packages by source (see `vitest.config.ts`
aliases) or via `dist` through the `exports` map, no bundler config changes.

### 2. Drive it from agent/task state (the whole "status UI")

```tsx
/** Map a MicroDots task/worker status onto the avatar's catalog. */
const STATE_BY_TASK = {
  queued: "egg",        // created, waiting
  running: "thinking",  // working (the three-dot pulse state)
  streaming: "comet",   // tokens flowing back
  waiting_approval: "notify", // the blue notification dot
  needs_input: "exclaim",     // the "!"
  error: "alert",
  cancelled: "burst",
  done: "wink",
  parked: "sleep",
} as const;

type TaskStatus = keyof typeof STATE_BY_TASK;
type AvatarState = (typeof STATE_BY_TASK)[TaskStatus];

function AgentAvatar({
  status,
  size = 48,
}: {
  status: TaskStatus;
  size?: number;
}) {
  return <microdots-bot state={STATE_BY_TASK[status]} size={size} />;
}
```

React 19 propagates unknown-but-declared custom element attributes as-is, so
`state="notify"` lands on `attributeChangedCallback` and the engine morphs.

### 3. Per-agent customisation (what the user picks)

An agent record carries its avatar config — three discriminant values, no
colours in DB that `skins.ts` could rename (`treat persist ids as data`):

```jsonc
// agents.avatar (Drizzle/jsonb — schema decision lands in P4 data-model work)
{
  "shape": "cube",        // SHAPE_BY_ID key  (8 choices)
  "color": "miel",        // COLOR_BY_ID key  (12 choices)
  "expression": "sourcil" // EXPRESSION_BY_ID key (16 choices)
}
```

Render it with any subset overridden:

```tsx
<microdots-bot shape={agent.avatar.shape}
               color={agent.avatar.color}
               expression={agent.avatar.expression}
               state={STATE_BY_TASK[agent.status]}
               size={72} />
```

`setShape`/`setExpression` are engine calls that **morph** to the new value,
so a settings change animates instead of popping.

### 4. The customizer picker (a `packages/ui` / `apps/web` feature, later)

The data knobs are all exposed for a settings screen:

```tsx
import { SHAPE_BY_ID, COLOR_BY_ID, EXPRESSION_BY_ID } from "@microdots/avatars";

function AvatarCustomizer({ agent, onChange }: { agent: Agent; ... }) {
  return (
    <div className="grid gap-4">
      {/* shape pickers render every entry as a tiny frozen sample */}
      {[...SHAPE_BY_ID.values()].map((shape) => (
        <button key={shape.id} aria-pressed={shape.id === agent.avatar.shape}>
          <microdots-bot frozen-at={0.8} shape={shape.id} size={64}
                         color={agent.avatar.color} />
        </button>
      ))}
      {/* same pattern with COLOR_BY_ID and EXPRESSION_BY_ID */}
      <microdots-bot shape={...} color={...} expression={...}
                     state={STATE_BY_TASK[agent.status]} size={120} />
    </div>
  );
}
```

`frozen-at` = "one exact frame, no animation loop" (bloub's mechanism, kept
here) — perfect for picker thumbnails. Change `shape`/`color`/`expression`
props and the engine morphs between thumbnails without a re-mount.

### 5. Many agents at once (the "team" panel)

`<microdots-bot>` renders into its own shadow DOM with instance-scoped ids
(mask/gradient prefixes), so dozens of avatars coexist harmlessly. Idle ones
in an overview can share a `size="32"` attribute; the engine costs ~nothing.

```tsx
{agents.map((a) => (
  <li>
    <microdots-bot ... size={32} state={STATE_BY_TASK[a.status]} />
    <span>{a.name}</span> <StatusText>{a.status}</StatusText>
  </li>
))}
```

### Server / non-DOM use (optional, later)

```ts
import { BotEngine, frameTree, serialize } from "@microdots/avatars";

const engine = new BotEngine(100, "notify");
const svg = serialize(frameTree(engine.sample(0.5), {
  ink: "#0a0a0c", paper: "#f9f9f9", id: "n1", size: 128,
}));
// → one <svg> string; e.g. write a favicon or a task OG image. In node the
//   module is import-safe: the web-component class degrades to a plain class.
```

## The engine rule (inherited from bloub — do not violate)

The numeric constants in `src/bot/` are **measurements** taken frame by frame
from a reference video. They are neither chosen nor tidy: rounding them breaks
the resemblance, which is the whole point. Full details:
See the bloub README §"Why the numbers look arbitrary" and docs/measurements.md.

## Origin & license

The engine (`src/bot/`) is ported from the *bloub* repository
(`grok-agent-avatars`, MIT license, © 2026 Jérémy Perret) with only formatting
and import paths changed. The render/web layers are new code under
this repository's license, AGPL-3.0-only (MicroDots, ADR-0009); see
[ORIGIN.md](ORIGIN.md) for the MIT notice and the design caveat (it recreates
the *behaviour* of the x.ai bot avatar, and is not affiliated with x.ai).
