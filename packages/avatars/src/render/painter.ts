/**
 * Painteur DOM : applique un arbre SVG virtuel (#tree) a un element `<svg>`.
 *
 * C'est la surface d'animation du web component : la boucle `rAF` de
 * `web.ts` produit une image par `engine.sample(t)` a chaque image, et le
 * painteur l'applique en ne touchant que les attributs qui ont change — la
 * meme idée que le patch de Vue dans bloub, sans Vue.
 *
 * Les enfants d'un noeud sont synchronises par index : pour une meme image le
 * pool d'elements a la meme forme frame apres frame (les fonds de gradients,
 * les points, les yeux ne changent de nombre qu'entre etats, et cet aplat est
 * acceptable la-bas : l'etat ne change qu'a l'evenement).
 *
 * Deux invariants reprentes le plus cher :
 * - le <mask> et les gradients vivent dans <defs> avec des ids prefixes par
 *   instance — plusieurs bots dans le meme document ne doivent pas se ecraser;
 * - aucune lecture de layout en boucle : `sync` n'ecrit jamais que des
 *   attributs, comme a l'origine ou le gardien vetait un `triggerRef`.
 */

import type { SVGNode } from "./tree.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function create(tag: string, doc: Document): SVGElement {
  return doc.createElementNS(SVG_NS, tag);
}

export class BotPainter {
  private readonly root: SVGElement;

  constructor(root: SVGElement) {
    this.root = root;
  }

  /** Applique l'arbre, noeud racine `<svg>` inclus (viewBox, dimensions). */
  sync(tree: SVGNode): void {
    syncAttributes(this.root, tree.attrs);
    syncChildren(this.root, tree);
  }
}

/** Met a jour les attributs d'un element, en ne touchant que ceux qui ont change. */
function syncAttributes(el: SVGElement, attrs: SVGNode["attrs"]): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) {
      el.removeAttribute(key);
      continue;
    }
    const next = String(value);
    if (el.getAttribute(key) !== next) el.setAttribute(key, next);
  }
}

/**
 * Synchronise les enfants d'un element avec ceux du noeud : creation, retrait
 * et reprise a chaud. Un changement de forme (un point devient un path) recree
 * l'element, faute de correlation entre tags.
 */
function syncChildren(el: SVGElement, node: SVGNode): void {
  const wanted = node.children;
  // Le painteur ne cree que des elements SVG ; on ecarte par precaution ce qui
  // ne correspond pas, pour garder un pool type sans assertion.
  const existing: SVGElement[] = [];
  for (const child of Array.from(el.children)) {
    if (child instanceof SVGElement) existing.push(child);
  }

  // Creer ce qui manque, en se rappelant par index.
  while (existing.length < wanted.length) {
    const child = wanted[existing.length];
    if (!child) break;
    existing.push(el.appendChild(create(child.tag, el.ownerDocument)));
  }
  // Retirer le surplus : un etat plus riche qui revient doit trouver un arbre
  // sans fantome.
  while (existing.length > wanted.length) {
    const stale = existing.pop();
    if (stale) el.removeChild(stale);
  }

  for (let i = 0; i < wanted.length; i++) {
    const child = wanted[i];
    let current = existing[i];
    if (!child || !current) continue;
    if (current.localName !== child.tag) {
      const fresh = create(child.tag, el.ownerDocument);
      el.replaceChild(fresh, current);
      current = fresh;
    }
    syncAttributes(current, child.attrs);
    syncChildren(current, child);
  }
}
