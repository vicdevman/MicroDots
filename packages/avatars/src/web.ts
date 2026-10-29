/**
 * `<microdots-bot>` — le bot comme custom element, sans framework.
 *
 * C'est le client du moteur dans la famille de `BloubBot.vue` : declaratif
 * par attributs (`state`, `size`, `shape`, `color`, `expression`, `paper`,
 * `frozen-at`), moteur et rendu tout entiers dedans. React 19 et le navigateur
 * nu parlent la meme langue.
 *
 * Un `frozen-at` coupe la boucle : le moteur, fonction pure du temps, rend un
 * `sample(t)` crispe, comme les vignettes chez bloub.
 */

import { BotEngine } from "./bot/engine.js";
import { EXPRESSION_BY_ID } from "./bot/expressions.js";
import { RAYON } from "./bot/repere.js";
import { COLOR_BY_ID, DEFAULT_COLOR, SHAPE_BY_ID } from "./bot/skins.js";
import { STATE_BY_ID, type StateId } from "./bot/states.js";
import { BotPainter } from "./render/painter.js";
import { frameTree } from "./render/tree.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Attributs observes. Un changement declenche le recalage du moteur, pas une remontee. */
const ATTRIBUTES = ["state", "size", "shape", "color", "expression", "paper", "frozen-at", "label"];

function defaultSize(): number {
  return 320;
}

/**
 * La classe etend HTMLElement, mais l'evaluation du module ne doit pas exiger
 * le DOM : le barrel exporte aussi la couche de rendu, qu'un import Node
 * (serialize pour un serveur, une vignette, un favicon) doit pouvoir charger.
 * Sans DOM, la classe ne sert que de forme et `registerMicrodotsBot` no-op.
 */
const HTMLElementBase = globalThis.HTMLElement ?? (class {} as unknown as typeof HTMLElement);

export class MicrodotsBot extends HTMLElementBase {
  static get observedAttributes(): string[] {
    return ATTRIBUTES;
  }

  private readonly engine = new BotEngine(RAYON, "idle");
  private painter: BotPainter | null = null;
  private raf = 0;
  private last = 0;
  private clock = 0;
  private readonly uid = `bot-${Math.random().toString(36).slice(2, 8)}`;

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    const root = this.shadowRoot;
    if (!root) return;
    if (!root.firstElementChild) {
      const svg = root.ownerDocument.createElementNS(SVG_NS, "svg");
      svg.style.display = "block";
      root.appendChild(svg);
      this.painter = new BotPainter(svg);
    }
    // Premiere image posee avant la boucle, pour ne pas cligner au montage.
    this.sample();
    // Une vignette figee n'a pas de boucle du tout : `frozen-at` la coupe.
    if (!this.hasAttribute("frozen-at")) {
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    const now = this.clock;
    switch (name) {
      case "state": {
        // Identifiant inconnu : on retombe sur idle plutot que de casser le rendu.
        // Le catalogue indexe par StateId : la garde verifie la presence avant
        // de poser quoi que ce soit sur le moteur.
        const raw = newValue ?? "";
        const known = STATE_BY_ID.has(raw as StateId) ? (raw as StateId) : "idle";
        this.engine.setState(known, now);
        this.sample();
        break;
      }
      case "shape": {
        // la forme morphe vers la nouvelle au lieu de sauter — le moteur decide.
        this.engine.setShape(SHAPE_BY_ID.get(newValue ?? "")?.radii ?? null, now);
        this.sample();
        break;
      }
      case "expression": {
        this.engine.setExpression(EXPRESSION_BY_ID.get(newValue ?? "") ?? null, now);
        this.sample();
        break;
      }
      case "frozen-at": {
        // de lecture animee a vignette : la boucle s'arrete.
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.sample();
        break;
      }
      default: {
        // size, color, paper, label ne parlent qu'au rendu.
        this.sample();
      }
    }
  }

  private sample(): void {
    const t = this.readFrozenAt() ?? this.clock;
    if (!this.painter) return;
    const tree = frameTree(this.engine.sample(t), {
      ink: this.color,
      paper: this.getAttribute("paper") ?? "#f9f9f9",
      id: this.uid,
      size: this.size,
      label: this.getAttribute("label") ?? "agent bot",
    });
    this.painter.sync(tree);
  }

  private readFrozenAt(): number | undefined {
    const raw = this.getAttribute("frozen-at");
    if (raw === null) return undefined;
    const t = Number(raw);
    return Number.isFinite(t) ? t : undefined;
  }

  private get size(): number {
    const n = Number(this.getAttribute("size") ?? "");
    return Number.isFinite(n) && n > 0 ? n : defaultSize();
  }

  /** Couleur : identifiant de `skins.ts`, ou hexadécimal brut pour les essais. */
  private get color(): string {
    const raw = this.getAttribute("color");
    const hex = COLOR_BY_ID.get(raw ?? "")?.hex ?? COLOR_BY_ID.get(DEFAULT_COLOR)?.hex ?? "#0a0a0c";
    return raw?.startsWith("#") && raw.length > 4 ? raw : hex;
  }

  /**
   * Horloge de scene a delta borne, comme bloub : un onglet masque puis
   * reaffiche reprend sans sauter en avant (rAF est suspendu pendant ce
   * temps-la, et un delta libre ferait sauter le bot de plusieurs secondes).
   */
  private readonly tick = (ms: number): void => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = this.last ? Math.min((ms - this.last) / 1000, 0.064) : 0;
    this.last = ms;
    this.clock += dt;
    this.sample();
  };
}

/** Enregistre le custom element. No-op hors navigateur ou si deja defini. */
export function registerMicrodotsBot(tagName = "microdots-bot"): void {
  if (
    typeof customElements !== "undefined" &&
    typeof HTMLElement !== "undefined" &&
    !customElements.get(tagName)
  ) {
    customElements.define(tagName, MicrodotsBot as unknown as CustomElementConstructor);
  }
}
