/** Parcours de formation. Ajoute ou modifie des modules ici : l'interface suit automatiquement. */
export interface Module {
  id: string;
  titre: string;
  description: string;
}

export const MODULES: Module[] = [
  { id: "bases", titre: "Les bases de la bourse", description: "Action, obligation, dividende, plus-value : le vocabulaire essentiel." },
  { id: "brvm", titre: "La BRVM et ses acteurs", description: "Comment fonctionne la bourse régionale : BRVM, DC/BR, AMF-UMOA, SGI." },
  { id: "premier-ordre", titre: "Passer son premier ordre", description: "Ouvrir un compte titres, types d'ordres, frais, déroulement d'une séance." },
  { id: "syscohada", titre: "Lire des états financiers SYSCOHADA", description: "Bilan, compte de résultat et flux de trésorerie d'une société cotée." },
  { id: "ratios", titre: "Les ratios clés", description: "PER, rendement, ROE, endettement : calculer et interpréter." },
  { id: "banques", titre: "Analyser une banque cotée", description: "PNB, coût du risque, coefficient d'exploitation, solvabilité." },
  { id: "titres-publics", titre: "Obligations et titres publics UEMOA", description: "Emprunts d'État, bons du Trésor, UMOA-Titres, coupons et rendement." },
  { id: "fiscalite", titre: "Dividendes et fiscalité", description: "Comment sont imposés les revenus selon le pays de l'UEMOA." },
  { id: "opcvm", titre: "OPCVM : FCP et SICAV", description: "Investir via un fonds plutôt qu'en direct : avantages et frais." },
  { id: "risques", titre: "Risques et diversification", description: "Liquidité, concentration, risque pays : construire un portefeuille prudent." },
  { id: "arnaques", titre: "Reconnaître une arnaque financière", description: "Promesses de gains garantis, faux intermédiaires : les signaux d'alerte." },
];

export const trouverModule = (id: string) => MODULES.find((m) => m.id === id) ?? null;
