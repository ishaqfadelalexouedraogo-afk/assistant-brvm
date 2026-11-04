/**
 * Calcul des ratios financiers d'une société cotée.
 *
 * Fonction pure, partagée par le navigateur (affichage immédiat) et le serveur
 * (les ratios envoyés à l'IA sont recalculés côté serveur, jamais repris du client).
 *
 * Unités :
 *  - cours et dividende par action : FCFA
 *  - chiffre d'affaires, résultat net, capitaux propres, dettes : millions de FCFA
 *  - nombre d'actions : unités
 */

export interface DonneesSociete {
  cours: number | null;
  nbActions: number | null;
  chiffreAffaires: number | null;
  resultatNet: number | null;
  capitauxPropres: number | null;
  dettesFinancieres: number | null;
  dividendeParAction: number | null;
  resultatNetPrecedent: number | null;
}

export type Unite = "MFCFA" | "FCFA" | "x" | "%";

export interface Ratio {
  cle: string;
  libelle: string;
  valeur: number | null;
  unite: Unite;
  explication: string;
}

const MILLION = 1_000_000;

const estNombre = (v: number | null): v is number => v !== null && Number.isFinite(v);

/** Division protégée : null si une donnée manque ou si le dénominateur n'est pas strictement positif. */
function diviser(a: number | null, b: number | null): number | null {
  if (!estNombre(a) || !estNombre(b) || b <= 0) return null;
  return a / b;
}

export function calculerRatios(d: DonneesSociete): Ratio[] {
  const capitalisation =
    estNombre(d.cours) && estNombre(d.nbActions) ? (d.cours * d.nbActions) / MILLION : null;
  const bnpa = diviser(estNombre(d.resultatNet) ? d.resultatNet * MILLION : null, d.nbActions);
  const actifNetParAction = diviser(
    estNombre(d.capitauxPropres) ? d.capitauxPropres * MILLION : null,
    d.nbActions,
  );
  const croissance = diviser(d.resultatNet, d.resultatNetPrecedent);

  return [
    {
      cle: "capitalisation",
      libelle: "Capitalisation boursière",
      valeur: capitalisation,
      unite: "MFCFA",
      explication: "Cours × nombre d'actions : la valeur de la société en bourse.",
    },
    {
      cle: "bnpa",
      libelle: "Bénéfice net par action (BNPA)",
      valeur: bnpa,
      unite: "FCFA",
      explication: "Résultat net ÷ nombre d'actions.",
    },
    {
      cle: "per",
      libelle: "PER",
      valeur: diviser(d.cours, bnpa),
      unite: "x",
      explication: "Cours ÷ BNPA : combien d'années de bénéfice l'investisseur paie.",
    },
    {
      cle: "pb",
      libelle: "Cours / actif net (P/B)",
      valeur: diviser(d.cours, actifNetParAction),
      unite: "x",
      explication: "Cours ÷ capitaux propres par action.",
    },
    {
      cle: "rendement",
      libelle: "Rendement du dividende",
      valeur: diviser(d.dividendeParAction, d.cours),
      unite: "%",
      explication: "Dividende ÷ cours, avant impôt.",
    },
    {
      cle: "distribution",
      libelle: "Taux de distribution",
      valeur: diviser(d.dividendeParAction, bnpa),
      unite: "%",
      explication: "Part du bénéfice reversée en dividende.",
    },
    {
      cle: "marge",
      libelle: "Marge nette",
      valeur: diviser(d.resultatNet, d.chiffreAffaires),
      unite: "%",
      explication: "Résultat net ÷ chiffre d'affaires (ou PNB pour une banque).",
    },
    {
      cle: "roe",
      libelle: "Rentabilité des capitaux propres (ROE)",
      valeur: diviser(d.resultatNet, d.capitauxPropres),
      unite: "%",
      explication: "Résultat net ÷ capitaux propres.",
    },
    {
      cle: "gearing",
      libelle: "Endettement (gearing)",
      valeur: diviser(d.dettesFinancieres, d.capitauxPropres),
      unite: "x",
      explication: "Dettes financières ÷ capitaux propres.",
    },
    {
      cle: "croissance",
      libelle: "Croissance du résultat net",
      valeur: croissance === null ? null : croissance - 1,
      unite: "%",
      explication: "Évolution par rapport à l'exercice précédent.",
    },
  ];
}

/** Mise en forme française : "1 500 000 M FCFA", "8,3 x", "7,3 %". */
export function formaterRatio(r: Pick<Ratio, "valeur" | "unite">): string {
  if (r.valeur === null || !Number.isFinite(r.valeur)) return "–";
  const fr = (v: number, dec: number) =>
    v.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  // Espaces insécables -> espaces simples pour un rendu identique navigateur / serveur / tests.
  const propre = (s: string) => s.replace(/[  ]/g, " ");
  switch (r.unite) {
    case "MFCFA":
      return propre(fr(r.valeur, 0)) + " M FCFA";
    case "FCFA":
      return propre(fr(r.valeur, 0)) + " FCFA";
    case "x":
      return propre(fr(r.valeur, r.valeur < 10 ? 2 : 1)) + " x";
    case "%":
      return propre(fr(r.valeur * 100, 1)) + " %";
  }
}
