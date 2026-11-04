/**
 * Session signée (cookie HttpOnly), sans base de données.
 * Contenu : partenaire, identifiant anonyme d'utilisateur, date d'expiration.
 * Aucune donnée personnelle n'est stockée.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const NOM_COOKIE = "brvm_session";
export const DUREE_SESSION_S = 30 * 24 * 3600;

export interface Session {
  p: string; // id du partenaire
  u: string; // identifiant anonyme de l'utilisateur
  exp: number; // expiration (secondes epoch)
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET manquant ou trop court (32 caractères minimum). Voir .env.example.");
  }
  return s;
}

const signer = (charge: string, cle: string) => createHmac("sha256", cle).update(charge).digest("base64url");

export function creerJeton(partenaireId: string, cle = secret(), maintenant = Date.now()): string {
  const session: Session = { p: partenaireId, u: randomUUID(), exp: Math.floor(maintenant / 1000) + DUREE_SESSION_S };
  const charge = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${charge}.${signer(charge, cle)}`;
}

export function lireJeton(jeton: string | undefined, cle = secret(), maintenant = Date.now()): Session | null {
  if (!jeton) return null;
  const [charge, signature] = jeton.split(".");
  if (!charge || !signature) return null;
  const attendue = Buffer.from(signer(charge, cle));
  const recue = Buffer.from(signature);
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null;
  try {
    const s = JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as Session;
    if (typeof s.p !== "string" || typeof s.u !== "string" || typeof s.exp !== "number") return null;
    if (s.exp * 1000 < maintenant) return null;
    return s;
  } catch {
    return null;
  }
}

/** Lit la session depuis l'en-tête Cookie d'une requête. */
export function sessionDepuisRequete(req: Request): Session | null {
  const cookies = req.headers.get("cookie") ?? "";
  const jeton = cookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(NOM_COOKIE + "="))
    ?.slice(NOM_COOKIE.length + 1);
  try {
    return lireJeton(jeton ? decodeURIComponent(jeton) : undefined);
  } catch (e) {
    console.error("[session]", (e as Error).message);
    return null;
  }
}
