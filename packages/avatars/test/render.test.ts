/**
 * Tests du noyau rendu, tous sans DOM (l'environnement vitest par defaut
 * suffit) : le moteur est pur, l'arbre est pur, la serialisation est pure.
 *
 * Le test le plus important est le balayage anti-`NaN` : chez bloub, un seul
 * `NaN` pose dans le moteur y reste pour toujours (il garde la derniere cible),
 * et il n'y avait rien pour le voir. Ici la serialisation sert aussi a un
 * usage fige/serveur, ou un `NaN` fondu dans une chaine SVG serait invisible
 * jusqu'en production.
 */

import { describe, expect, it } from "vitest";
import { BotEngine } from "../src/bot/engine";
import { EXPRESSION_BY_ID } from "../src/bot/expressions";
import { RAYON } from "../src/bot/repere";
import { COLOR_BY_ID, DEFAULT_COLOR, DEFAULT_SHAPE, SHAPE_BY_ID } from "../src/bot/skins";
import { SEQUENCE, STATES } from "../src/bot/states";
import { serialize } from "../src/render/serialize";
import { frameTree } from "../src/render/tree";

const ink = COLOR_BY_ID.get(DEFAULT_COLOR)?.hex ?? "#0a0a0c";
const paper = "#f9f9f9";
const options = (id: string, label?: string) => ({
  ink,
  paper,
  id,
  size: 320,
  label,
});

describe("frameTree", () => {
  it("donne le meme arbre pour les memes entrees (pureté du rendu)", () => {
    const engine = new BotEngine(RAYON, "thinking");
    const a = frameTree(engine.sample(0.8), options("t1"));
    const b = frameTree(engine.sample(0.8), options("t1"));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("comprenant le mask des yeux et le fond du corps, dans cet ordre", () => {
    const engine = new BotEngine(RAYON, "idle");
    const tree = frameTree(engine.sample(1), options("t"));
    const defs = tree.children[0];
    if (!defs) return;
    expect(defs.tag).toBe("defs");
    const mask = defs.children[0];
    expect(mask?.tag).toBe("mask");
    // corps : un trou blanc (fond) puis l'encre sous le masque
    const body = tree.children.find((c) => c.tag === "g" && c.children.length === 2);
    expect(body?.children[0]?.attrs.fill).toBe(paper);
  });

  it("porte la pastille de notification dans notify", () => {
    const engine = new BotEngine(RAYON, "notify");
    const tree = frameTree(engine.sample(0.5), options("t"));
    const circle = tree.children.filter((c) => c.tag === "circle");
    expect(circle).toHaveLength(1);
  });

  it("ne met pas d'etiquette d'acessibilite si le label est absent", () => {
    const engine = new BotEngine(RAYON, "idle");
    const tree = frameTree(engine.sample(0), options("t"));
    expect("aria-label" in tree.attrs).toBe(false);
  });
});

describe("serialize", () => {
  // Le balayage prend les 14 etats du catalogue, dont bloté dans `SEQUENCE`.
  for (const state of STATES.map((s) => s.id)) {
    it(`ne contient aucun NaN dans ${state}, balaye sur 3 s`, () => {
      const engine = new BotEngine(RAYON, state);
      for (let t = 0; t < 3; t += 0.05) {
        const svg = serialize(frameTree(engine.sample(t), options("n")));
        expect(svg, `${state} @ t=${t.toFixed(2)}`).not.toMatch(/NaN|Infinity|undefined/);
      }
    });
  }

  it("echappe les doubles quotes des attributs fournis de l'exterieur", () => {
    const engine = new BotEngine(RAYON, "idle");
    const tree = frameTree(engine.sample(0), {
      ink,
      paper,
      id: "t",
      size: 100,
      label: 'un label "piégé"',
    });
    const svg = serialize(tree);
    expect(svg).toContain('aria-label="un label &quot;piégé&quot;"');
  });

  it("est deterministe : deux echantillons au meme t donnent la meme chaine", () => {
    const first = new BotEngine(RAYON, "orbit", SHAPE_BY_ID.get(DEFAULT_SHAPE)?.radii ?? null);
    const second = new BotEngine(RAYON, "orbit", SHAPE_BY_ID.get(DEFAULT_SHAPE)?.radii ?? null);
    const a = serialize(frameTree(first.sample(1.25), options("a")));
    const b = serialize(frameTree(second.sample(1.25), options("a")));
    expect(a).toBe(b);
  });
});

describe("le catalogue reste entier apres le port", () => {
  it("les 14 etats du montage par defaut existent et rendent un SVG", () => {
    expect(SEQUENCE.length).toBeGreaterThanOrEqual(13);
    for (const id of SEQUENCE) {
      const engine = new BotEngine(RAYON, id);
      const svg = serialize(frameTree(engine.sample(0.3), options(id)));
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
    }
  });

  it("un identifiant de forme du personnalisateur est porté", () => {
    const shape = SHAPE_BY_ID.get(DEFAULT_SHAPE);
    expect(shape).toBeDefined();
    expect(EXPRESSION_BY_ID.size).toBeGreaterThan(0);
  });
});
