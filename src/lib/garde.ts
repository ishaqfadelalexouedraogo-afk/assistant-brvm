/**
 * Vérifications communes à toutes les routes qui appellent l'IA :
 * session valide, partenaire actif, quota du jour.
 */
import { consommerQuota } from "./compteurs";
import { trouverPartenaire, type Partenaire } from "./partenaires";
import { sessionDepuisRequete, type Session } from "./session";

export const erreurJson = (status: number, erreur: string) =>
  Response.json({ erreur }, { status, headers: { "Cache-Control": "no-store" } });

export async function verifierAcces(
  req: Request,
  { consommer }: { consommer: boolean },
): Promise<{ ok: true; session: Session; partenaire: Partenaire } | { ok: false; reponse: Response }> {
  const session = sessionDepuisRequete(req);
  if (!session) return { ok: false, reponse: erreurJson(401, "Session expirée. Saisis à nouveau ton code d'accès.") };
  const partenaire = trouverPartenaire(session.p);
  if (!partenaire) return { ok: false, reponse: erreurJson(403, "Cet accès n'est plus actif. Contacte ton organisme.") };
  if (consommer) {
    const { autorise } = await consommerQuota(partenaire.id, session.u, partenaire.quotaQuotidien);
    if (!autorise) {
      return {
        ok: false,
        reponse: erreurJson(429, `Tu as atteint la limite de ${partenaire.quotaQuotidien} demandes pour aujourd'hui. Reviens demain.`),
      };
    }
  }
  return { ok: true, session, partenaire };
}

/** Lit et valide le corps JSON d'une requête avec un schéma zod. */
export async function lireCorps<T>(
  req: Request,
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
): Promise<T | null> {
  try {
    const r = schema.safeParse(await req.json());
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
