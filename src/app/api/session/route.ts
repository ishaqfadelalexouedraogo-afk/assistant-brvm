import { z } from "zod";
import { quotaRestant } from "@/lib/compteurs";
import { erreurJson, lireCorps } from "@/lib/garde";
import { partenaireParCode, trouverPartenaire } from "@/lib/partenaires";
import { creerJeton, DUREE_SESSION_S, NOM_COOKIE, sessionDepuisRequete } from "@/lib/session";

export const runtime = "nodejs";

const cookie = (valeur: string, maxAge: number) =>
  `${NOM_COOKIE}=${encodeURIComponent(valeur)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` +
  (process.env.NODE_ENV === "production" ? "; Secure" : "");

// Limite simple contre les essais de codes en rafale (par instance du serveur).
const essais = new Map<string, { n: number; depuis: number }>();
function tropDEssais(ip: string): boolean {
  const maintenant = Date.now();
  const e = essais.get(ip);
  if (!e || maintenant - e.depuis > 15 * 60 * 1000) {
    essais.set(ip, { n: 1, depuis: maintenant });
    return false;
  }
  e.n += 1;
  return e.n > 10;
}

/** Connexion avec un code d'accès partenaire. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnue";
  if (tropDEssais(ip)) return erreurJson(429, "Trop d'essais. Réessaie dans 15 minutes.");

  const corps = await lireCorps(req, z.object({ code: z.string().min(1).max(100) }));
  if (!corps) return erreurJson(400, "Saisis ton code d'accès.");
  const partenaire = partenaireParCode(corps.code);
  if (!partenaire) return erreurJson(401, "Code d'accès incorrect. Vérifie-le auprès de ton organisme.");

  let jeton: string;
  try {
    jeton = creerJeton(partenaire.id);
  } catch (e) {
    console.error("[session]", (e as Error).message);
    return erreurJson(500, "Le service n'est pas configuré correctement. Préviens l'administrateur.");
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie(jeton, DUREE_SESSION_S) } });
}

/** Informations sur la session en cours (partenaire, demandes restantes aujourd'hui). */
export async function GET(req: Request) {
  const session = sessionDepuisRequete(req);
  const partenaire = session ? trouverPartenaire(session.p) : null;
  if (!session || !partenaire) return erreurJson(401, "Pas de session.");
  const restant = await quotaRestant(partenaire.id, session.u, partenaire.quotaQuotidien);
  return Response.json(
    { partenaire: { nom: partenaire.nom, couleur: partenaire.couleur }, restant, quota: partenaire.quotaQuotidien },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Déconnexion. */
export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie("", 0) } });
}
