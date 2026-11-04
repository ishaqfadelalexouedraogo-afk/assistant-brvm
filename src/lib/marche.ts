/**
 * Données de marché BRVM chargées par l'administrateur.
 *
 * L'IA n'a pas accès aux cours en direct. Pour qu'elle raisonne sur des chiffres à jour,
 * l'administrateur dépose le fichier data/marche/cours.csv (séparateur « ; », format décrit
 * dans docs/DONNEES_MARCHE.md), par exemple à partir du bulletin officiel de la cote.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface Cotation {
  date: string; // AAAA-MM-JJ
  symbole: string;
  societe: string;
  pays: string;
  secteur: string;
  cours: number;
  variationPct: number | null;
  volume: number | null;
}

const COLONNES = ["date", "symbole", "societe", "pays", "secteur", "cours", "variation_pct", "volume"] as const;

/** Convertit "15 000,50" ou "15000.5" en nombre. */
function nombre(v: string | undefined): number | null {
  if (v === undefined) return null;
  const propre = v.replace(/[\s  ]/g, "").replace(",", ".");
  if (propre === "") return null;
  const n = Number(propre);
  return Number.isFinite(n) ? n : null;
}

export function analyserCsv(texte: string): { cotations: Cotation[]; erreurs: string[] } {
  const lignes = texte.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const erreurs: string[] = [];
  if (lignes.length === 0) return { cotations: [], erreurs: ["Fichier vide."] };

  const entete = lignes[0].split(";").map((c) => c.trim().toLowerCase());
  const manquantes = COLONNES.filter((c) => !entete.includes(c));
  if (manquantes.length) return { cotations: [], erreurs: [`Colonnes manquantes : ${manquantes.join(", ")}.`] };
  const idx = (c: (typeof COLONNES)[number]) => entete.indexOf(c);

  const cotations: Cotation[] = [];
  lignes.slice(1).forEach((ligne, i) => {
    const c = ligne.split(";").map((x) => x.trim());
    const cours = nombre(c[idx("cours")]);
    const date = c[idx("date")] ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || cours === null || !c[idx("symbole")]) {
      erreurs.push(`Ligne ${i + 2} ignorée : date (AAAA-MM-JJ), symbole et cours sont obligatoires.`);
      return;
    }
    cotations.push({
      date,
      symbole: c[idx("symbole")].toUpperCase(),
      societe: c[idx("societe")] ?? "",
      pays: c[idx("pays")] ?? "",
      secteur: c[idx("secteur")] ?? "",
      cours,
      variationPct: nombre(c[idx("variation_pct")]),
      volume: nombre(c[idx("volume")]),
    });
  });
  return { cotations, erreurs };
}

/** Garde la cotation la plus récente de chaque symbole, triée par symbole. */
export function dernieresCotations(cotations: Cotation[]): Cotation[] {
  const parSymbole = new Map<string, Cotation>();
  for (const c of cotations) {
    const actuelle = parSymbole.get(c.symbole);
    if (!actuelle || c.date > actuelle.date) parSymbole.set(c.symbole, c);
  }
  return [...parSymbole.values()].sort((a, b) => a.symbole.localeCompare(b.symbole));
}

/** Texte injecté dans les instructions de l'IA. */
export function contexteMarche(cotations: Cotation[]): string {
  if (cotations.length === 0) {
    return "DONNÉES DE MARCHÉ : aucune cote n'a été chargée. Tu ne connais donc aucun cours actuel : ne cite aucun cours, et invite l'utilisateur à consulter brvm.org ou à saisir les chiffres lui-même.";
  }
  const dateMax = cotations.reduce((m, c) => (c.date > m ? c.date : m), cotations[0].date);
  const lignes = cotations.map(
    (c) =>
      `${c.symbole} | ${c.societe} | ${c.pays} | ${c.secteur} | ${c.cours} FCFA` +
      (c.variationPct !== null ? ` | ${c.variationPct > 0 ? "+" : ""}${c.variationPct} %` : ""),
  );
  return [
    `DONNÉES DE MARCHÉ chargées par l'administrateur (dernière date : ${dateMax}).`,
    "Ce sont les seuls cours que tu connais. Cite toujours leur date. Pour une société absente de cette liste, dis que tu n'as pas son cours.",
    "Symbole | Société | Pays | Secteur | Cours | Variation du jour",
    ...lignes,
  ].join("\n");
}

let cache: { lu: number; cotations: Cotation[] } | null = null;
const DUREE_CACHE_MS = 5 * 60 * 1000;

/** Lit data/marche/cours.csv (mis en cache 5 minutes). Ne lève jamais d'erreur. */
export async function chargerCotations(): Promise<Cotation[]> {
  if (cache && Date.now() - cache.lu < DUREE_CACHE_MS) return cache.cotations;
  try {
    const texte = await readFile(path.join(process.cwd(), "data", "marche", "cours.csv"), "utf8");
    const { cotations, erreurs } = analyserCsv(texte);
    if (erreurs.length) console.warn("[marche]", erreurs.slice(0, 5).join(" | "));
    cache = { lu: Date.now(), cotations: dernieresCotations(cotations) };
  } catch (e) {
    console.warn("[marche] fichier de cours illisible :", (e as Error).message);
    cache = { lu: Date.now(), cotations: [] };
  }
  return cache.cotations;
}
