import { verifierAcces } from "@/lib/garde";
import { chargerCotations } from "@/lib/marche";

export const runtime = "nodejs";

/** Liste des dernières cotations chargées (pour préremplir l'analyse). */
export async function GET(req: Request) {
  const acces = await verifierAcces(req, { consommer: false });
  if (!acces.ok) return acces.reponse;
  return Response.json({ cotations: await chargerCotations() }, { headers: { "Cache-Control": "no-store" } });
}
