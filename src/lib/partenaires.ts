/**
 * Partenaires B2B (SGI, banques, écoles…).
 *
 * - L'habillage et le quota de chaque partenaire sont dans config/partenaires.json (non secret).
 * - Les codes d'accès sont dans la variable d'environnement ACCESS_CODES (secret),
 *   au format "id:code,id:code". Voir docs/PARTENAIRES.md.
 */
import { timingSafeEqual } from "node:crypto";
import config from "../../config/partenaires.json";

export interface Partenaire {
  id: string;
  nom: string;
  couleur: string;
  quotaQuotidien: number;
  messageAccueil?: string;
}

const PARTENAIRES: Partenaire[] = config.partenaires;

export function trouverPartenaire(id: string): Partenaire | null {
  return PARTENAIRES.find((p) => p.id === id) ?? null;
}

export function listerPartenaires(): Partenaire[] {
  return PARTENAIRES;
}

/** Lit "demo:DEMO-2026,sgi-x:ABC" -> [{id:"demo", code:"DEMO-2026"}, ...]. */
export function lireCodes(brut: string | undefined): { id: string; code: string }[] {
  if (!brut) return [];
  return brut
    .split(",")
    .map((paire) => paire.trim())
    .filter(Boolean)
    .map((paire) => {
      const sep = paire.indexOf(":");
      return sep > 0 ? { id: paire.slice(0, sep).trim(), code: paire.slice(sep + 1).trim() } : null;
    })
    .filter((x): x is { id: string; code: string } => x !== null && x.code.length > 0);
}

function egal(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Renvoie le partenaire dont le code correspond (comparaison insensible à la casse et en temps constant). */
export function partenaireParCode(code: string, brut = process.env.ACCESS_CODES): Partenaire | null {
  const saisi = code.trim().toUpperCase();
  if (!saisi) return null;
  let trouve: Partenaire | null = null;
  for (const { id, code: attendu } of lireCodes(brut)) {
    if (egal(saisi, attendu.toUpperCase())) trouve = trouve ?? trouverPartenaire(id);
  }
  return trouve;
}
