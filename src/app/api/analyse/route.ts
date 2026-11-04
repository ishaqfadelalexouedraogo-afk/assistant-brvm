import { z } from "zod";
import { repondreEnStreaming } from "@/lib/claude";
import { rendreQuota } from "@/lib/compteurs";
import { erreurJson, lireCorps, verifierAcces } from "@/lib/garde";
import { chargerCotations, contexteMarche } from "@/lib/marche";
import { construireSysteme } from "@/lib/prompts";
import { calculerRatios, formaterRatio } from "@/lib/ratios";

export const runtime = "nodejs";
export const maxDuration = 300;

const nombre = z.number().finite().nullable();
const texte = (max: number) => z.string().trim().max(max);

const schema = z.object({
  societe: texte(120).min(1),
  pays: texte(40),
  secteur: texte(60),
  cours: nombre,
  nbActions: nombre,
  chiffreAffaires: nombre,
  resultatNet: nombre,
  capitauxPropres: nombre,
  dettesFinancieres: nombre,
  dividendeParAction: nombre,
  resultatNetPrecedent: nombre,
  notes: texte(4000).optional(),
});

const fmt = (v: number | null, unite: string) => (v === null ? "non renseigné" : `${v.toLocaleString("fr-FR")} ${unite}`);

export async function POST(req: Request) {
  const d = await lireCorps(req, schema);
  if (!d) return erreurJson(400, "Données incomplètes : le nom de la société est obligatoire et les montants doivent être des nombres.");

  const acces = await verifierAcces(req, { consommer: true });
  if (!acces.ok) return acces.reponse;

  // Les ratios sont toujours recalculés ici, à partir des données brutes.
  const ratios = calculerRatios(d).map((r) => `- ${r.libelle} : ${formaterRatio(r)}`).join("\n");

  const consigne = `Interprète l'analyse financière ci-dessous pour un investisseur particulier de la zone UEMOA.
Les ratios ont été calculés par l'application à partir des chiffres saisis par l'utilisateur : utilise-les tels quels et n'invente aucun autre chiffre.

Structure ta réponse ainsi :
## Ce que disent les chiffres
(lecture en langage simple de chaque ratio important)
## Points forts
## Points de vigilance
## Pour aller plus loin
(3 à 5 vérifications à faire : rapport annuel, comparaison avec les sociétés du même secteur à la BRVM, contexte du pays, fiscalité du dividende)

Si le secteur est la banque, explique que l'endettement et la marge se lisent autrement, et cite les indicateurs propres aux banques (PNB, coût du risque, coefficient d'exploitation, ratios de solvabilité).
Termine par une phrase rappelant que ce n'est pas un conseil en investissement.

<donnees_saisies>
Société : ${d.societe}
Pays : ${d.pays || "non renseigné"}
Secteur : ${d.secteur || "non renseigné"}
Cours : ${fmt(d.cours, "FCFA")}
Nombre d'actions : ${fmt(d.nbActions, "")}
Chiffre d'affaires ou PNB : ${fmt(d.chiffreAffaires, "M FCFA")}
Résultat net : ${fmt(d.resultatNet, "M FCFA")} (exercice précédent : ${fmt(d.resultatNetPrecedent, "M FCFA")})
Capitaux propres : ${fmt(d.capitauxPropres, "M FCFA")}
Dettes financières : ${fmt(d.dettesFinancieres, "M FCFA")}
Dividende par action : ${fmt(d.dividendeParAction, "FCFA")}
</donnees_saisies>

<ratios_calcules>
${ratios}
</ratios_calcules>

<informations_complementaires>
${d.notes || "aucune"}
</informations_complementaires>`;

  return repondreEnStreaming({
    partenaireId: acces.partenaire.id,
    surEchec: () => rendreQuota(acces.partenaire.id, acces.session.u),
    route: "analyse",
    system: construireSysteme(acces.partenaire, contexteMarche(await chargerCotations())),
    messages: [{ role: "user", content: consigne }],
    effort: "high",
  });
}
