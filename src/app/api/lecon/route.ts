import { z } from "zod";
import { repondreEnStreaming } from "@/lib/claude";
import { rendreQuota } from "@/lib/compteurs";
import { erreurJson, lireCorps, verifierAcces } from "@/lib/garde";
import { trouverModule } from "@/lib/modules";
import { consigneLecon, construireSysteme, NIVEAUX } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({ moduleId: z.string().max(60), niveau: z.enum(NIVEAUX) });

export async function POST(req: Request) {
  const corps = await lireCorps(req, schema);
  const module = corps ? trouverModule(corps.moduleId) : null;
  if (!corps || !module) return erreurJson(400, "Module inconnu.");

  const acces = await verifierAcces(req, { consommer: true });
  if (!acces.ok) return acces.reponse;

  return repondreEnStreaming({
    partenaireId: acces.partenaire.id,
    surEchec: () => rendreQuota(acces.partenaire.id, acces.session.u),
    route: "lecon",
    // Une leçon n'a pas besoin des cours du jour : bloc variable minimal.
    system: construireSysteme(acces.partenaire, "DONNÉES DE MARCHÉ : non utilisées pour les leçons. Utilise uniquement des exemples fictifs."),
    messages: [{ role: "user", content: consigneLecon(module.titre, module.description, corps.niveau) }],
    effort: "medium",
  });
}
