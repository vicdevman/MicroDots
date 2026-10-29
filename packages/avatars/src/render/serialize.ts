/**
 * Serialisation d'un arbre SVG virtuel en chaine.
 *
 * Elle sert aux rendus sans boucle d'animation : vignettes figees, images de
 * documentation, un futur endpoint serveur `GET /avatar/:state.svg`. Le
 * painteur DOM prefere diff l'arbre (voir `painter.ts`) : reecrire l'innerHTML
 * de tout le SVG a chaque image creerait une montagne de noeuds jetables.
 *
 * L'echappement ne porte que sur les attributs remplis par l'exterieur
 * (couleurs, etiquettes) ; tous les nombres viennent du moteur, qui ne rend
 * jamais de `NaN` — et un test balaie les 14 etats pour le verrouiller.
 */

import type { SVGNode } from "./tree.js";

function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// l'echappement texte viendra avec un contenu mixte eventuel; absent aujourd'hui.

/** Rend l'arbre en chaine SVG autonome, consumable par le DOM, un serveur ou un fichier. */
export function serialize(root: SVGNode): string {
  const out: string[] = [];
  write(root, out);
  return out.join("");
}

function write(n: SVGNode, out: string[]): void {
  out.push(`<${n.tag}`);
  for (const [key, value] of Object.entries(n.attrs)) {
    if (value === undefined || value === null) continue;
    out.push(` ${key}="${escAttr(String(value))}"`);
  }
  if (n.children.length === 0) {
    out.push("/>");
    return;
  }
  out.push(">");
  for (const child of n.children) write(child, out);
  out.push(`</${n.tag}>`);
}
