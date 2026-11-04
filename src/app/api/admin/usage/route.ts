import { timingSafeEqual } from "node:crypto";
import { lireConsommation, moisCourant } from "@/lib/compteurs";
import { erreurJson } from "@/lib/garde";
import { listerPartenaires } from "@/lib/partenaires";

export const runtime = "nodejs";

/**
 * Consommation par partenaire pour un mois, pour la facturation B2B.
 * Appel : GET /api/admin/usage?mois=2026-11  avec l'en-tête  Authorization: Bearer <ADMIN_TOKEN>
 */
export async function GET(req: Request) {
  const attendu = process.env.ADMIN_TOKEN;
  const recu = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok =
    !!attendu && attendu.length >= 16 && recu.length === attendu.length && timingSafeEqual(Buffer.from(recu), Buffer.from(attendu));
  if (!ok) return erreurJson(401, "Accès refusé.");

  const mois = new URL(req.url).searchParams.get("mois") ?? moisCourant();
  if (!/^\d{4}-\d{2}$/.test(mois)) return erreurJson(400, "Paramètre mois attendu au format AAAA-MM.");

  try {
    const lignes = await Promise.all(
      listerPartenaires().map(async (p) => ({ partenaire: p.id, nom: p.nom, ...(await lireConsommation(p.id, mois)) })),
    );
    return Response.json({ mois, partenaires: lignes }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin/usage]", (e as Error).message);
    return erreurJson(502, "Compteurs indisponibles (Upstash).");
  }
}
