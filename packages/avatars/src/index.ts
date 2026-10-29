/**
 * Contenu public du package.
 *
 * `src/bot/` reste la source de verite (comme chez bloub), mais le rendu et le
 * web component sont les surfaces d'usage des applis. On expose les deux :
 * - renderer bricolé à la main → `BotEngine` / `frameTree` / `serialize`,
 * - dans le navigateur → `registerMicrodotsBot()` + `<microdots-bot>`.
 */

// moteur (port 1:1 de bloub)
export { BotEngine, type BotFrame, type RenderedEye } from "./bot/engine.js";
export {
  type BotExpression,
  blendExpression,
  DEFAULT_EXPRESSION,
  EXPRESSION_BY_ID,
  EXPRESSIONS,
  type ExpressionId,
} from "./bot/expressions.js";
export { DEMI_VIEWBOX, RAYON } from "./bot/repere.js";
export {
  type BotColor,
  type BotShape,
  COLOR_BY_ID,
  COLORS,
  DEFAULT_COLOR,
  DEFAULT_SHAPE,
  mixHex,
  SHAPE_BY_ID,
  SHAPES,
} from "./bot/skins.js";
export { type Pose, STATE_BY_ID, STATES, type StateDef, type StateId } from "./bot/states.js";
export { BotPainter } from "./render/painter.js";
export { serialize } from "./render/serialize.js";
// rendu
export { frameTree, type PaintOptions, type SVGNode } from "./render/tree.js";

// navigateur
export { MicrodotsBot, registerMicrodotsBot } from "./web.js";
