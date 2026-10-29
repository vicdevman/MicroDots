/**
 * Rendu d'une image du moteur en arbre SVG virtuel.
 *
 * C'est le port du template de `BloubBot.vue` (bloub), retire de Vue pour que
 * la couche de rendu soit testable sans DOM et consommable par plusieurs
 * surfaces : un serializeur en chaine (`serialize.ts`) pour un usage fige ou
 * serveur, et un painteur diff en DOM (`painter.ts`) pour le web component.
 *
 * L'ordre des couches est celui du template d'origine et il est significatif :
 * la moitie arriere des anneaux est dessinee AVANT le corps pour etre occultee,
 * les yeux sont de vrais trous percés dans un `<mask>`, pas poses dessus.
 */

import type { ArcRender, DotRender } from "../bot/decor.js";
import { NOTIF_BLUE } from "../bot/decor.js";
import type { BotFrame } from "../bot/engine.js";
import { DEMI_VIEWBOX, RAYON } from "../bot/repere.js";
import { mixHex } from "../bot/skins.js";

/** Noeud SVG minimal, serialisable et diff-able. */
export interface SVGNode {
  tag: string;
  attrs: Record<string, string | number | null | undefined>;
  children: SVGNode[];
}

/** Demi-cote du viewBox : il vient du repere du moteur, pas du consommateur. */
const VB = DEMI_VIEWBOX;
/** Rayon du corps au repos, en unites de viewBox. */
const R = RAYON;

export interface PaintOptions {
  /** Couleur du corps et des yeux, l'encre de `skins.ts` par defaut. */
  ink: string;
  /**
   * Couleur du fond derriere les trous des yeux. Un trou laisse voir ce qui est
   * dessine derriere — or l'arriere des anneaux et les particules de
   * l'eclatement le sont pour etre occultes : sans ce fond, un anneau
   * reapparait DANS les yeux. Rempli avec `paper` (le fond de page) et non un
   * blanc pur.
   */
  paper: string;
  /**
   * Prefixe d'identifiants pour le mask et les gradients. Plusieurs bots dans
   * un meme document doivent avoir des prefixes distincts.
   */
  id: string;
  /** Cote du SVG rendu, en pixels ; le viewBox, lui, ne bouge jamais. */
  size: number;
  /** Etiquette d'accessibilite pour role="img". */
  label?: string;
}

/** Borne la valeur d'un id d'arc au jeu de caracteres d'un ID XML. */
function gid(prefix: string, arcId: string): string {
  return `${prefix}-g-${arcId.replace(/[^a-zA-Z0-9-]/g, "-")}`;
}

function node(tag: string, attrs: SVGNode["attrs"], children: SVGNode[] = []): SVGNode {
  return { tag, attrs, children };
}

/**
 * Un point est un simple disque, sauf quand l'etat fournit une forme (la goutte
 * du "!" penche) : le path est en unites de rayon de boule et centre sur
 * l'origine, pose avec translate/rotate/scale. Port fidele de `dotAttrs`.
 */
function dotNode(dot: DotRender, opts: PaintOptions): SVGNode {
  const fill =
    dot.color ?? (dot.depth === undefined ? opts.ink : mixHex(opts.paper, opts.ink, dot.depth));
  return dot.d
    ? node("path", {
        d: dot.d,
        transform: `translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`,
        fill,
        opacity: dot.opacity,
      })
    : node("circle", {
        cx: dot.x,
        cy: dot.y,
        r: dot.r,
        fill,
        opacity: dot.opacity,
      });
}

function gradientNode(arc: ArcRender, opts: PaintOptions): SVGNode {
  const stops = arc.grad.stops;
  return node(
    "linearGradient",
    {
      id: gid(opts.id, arc.id),
      gradientUnits: "userSpaceOnUse",
      x1: arc.grad.x1,
      y1: arc.grad.y1,
      x2: arc.grad.x2,
      y2: arc.grad.y2,
    },
    stops.map((c, i) => node("stop", { offset: i / (stops.length - 1), "stop-color": c })),
  );
}

/**
 * L'arbre SVG d'une image. Pur : memes entrees = meme arbre = meme chaine
 * serialisee, ce que les tests verrouillent.
 */
export function frameTree(frame: BotFrame, opts: PaintOptions): SVGNode {
  const maskId = `${opts.id}-mask`;

  return node(
    "svg",
    {
      viewBox: `${-VB} ${-VB} ${VB * 2} ${VB * 2}`,
      width: opts.size,
      height: opts.size,
      role: "img",
      ...(opts.label ? { "aria-label": opts.label } : {}),
    },
    [
      node("defs", {}, [
        // Les yeux sont de vrais trous percés dans le corps (comme sur l'avatar
        // d'origine), pas des formes blanches posees dessus : ils restent
        // rognes par la silhouette quand ils glissent vers le bord.
        node(
          "mask",
          {
            id: maskId,
            maskUnits: "userSpaceOnUse",
            x: -VB,
            y: -VB,
            width: VB * 2,
            height: VB * 2,
          },
          [
            node("path", { d: frame.bodyPath, fill: "#fff" }),
            ...frame.eyes.map((e) =>
              node("path", {
                d: e.d,
                transform: e.matrix,
                opacity: e.alpha,
                fill: "#000",
              }),
            ),
            ...(frame.notch
              ? [
                  node("circle", {
                    cx: frame.notch.x,
                    cy: frame.notch.y,
                    r: frame.notch.r,
                    fill: "#000",
                  }),
                ]
              : []),
          ],
        ),
        ...frame.arcs.map((arc) => gradientNode(arc, opts)),
      ]),
      // moitie arriere des orbites : dessinee avant le corps, donc occultee
      node(
        "g",
        { fill: "none", "stroke-linecap": "round" },
        frame.arcs.map((arc) =>
          node("path", {
            d: arc.back,
            stroke: `url(#${gid(opts.id, arc.id)})`,
            "stroke-width": arc.width,
            opacity: arc.opacity,
          }),
        ),
      ),
      // particules de l'eclatement : derriere le noyau
      ...(frame.dotsBehind
        ? [
            node(
              "g",
              {},
              frame.dots.map((d) => dotNode(d, opts)),
            ),
          ]
        : []),
      // corps : fond opaque a la forme exacte, puis l'encre rognee par le mask
      node("g", { opacity: frame.bodyAlpha }, [
        node("path", { d: frame.bodyPath, fill: opts.paper }),
        node("g", { mask: `url(#${maskId})` }, [
          node("rect", { x: -VB, y: -VB, width: VB * 2, height: VB * 2, fill: opts.ink }),
        ]),
      ]),
      // points de devant
      ...(!frame.dotsBehind
        ? [
            node(
              "g",
              {},
              frame.dots.map((d) => dotNode(d, opts)),
            ),
          ]
        : []),
      // pastille de notification, ancree au contour du corps par le moteur
      ...(frame.notif
        ? [
            node("circle", {
              cx: frame.notif.x,
              cy: frame.notif.y,
              r: frame.notif.r,
              fill: NOTIF_BLUE,
            }),
          ]
        : []),
      // moitie avant des orbites
      node(
        "g",
        { fill: "none", "stroke-linecap": "round" },
        frame.arcs.map((arc) =>
          node("path", {
            d: arc.front,
            stroke: `url(#${gid(opts.id, arc.id)})`,
            "stroke-width": arc.width,
            opacity: arc.opacity,
          }),
        ),
      ),
    ],
  );
}
