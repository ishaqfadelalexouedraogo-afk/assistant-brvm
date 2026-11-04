/**
 * Quotas quotidiens et suivi de consommation par partenaire.
 *
 * - Avec Upstash Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) : compteurs partagés
 *   et durables, indispensables en production (Vercel lance plusieurs instances du serveur).
 * - Sans : compteurs en mémoire, suffisants pour tester en local.
 *
 * La consommation (requêtes et jetons) sert à facturer chaque partenaire. Voir docs/VIABILITE.md.
 */

type Commande = (string | number)[];

const memoire = new Map<string, number>();
const memoireHash = new Map<string, Map<string, number>>();

function upstash(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function pipeline(cmds: Commande[]): Promise<unknown[]> {
  const cfg = upstash()!;
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: string }[];
  return data.map((d) => {
    if (d.error) throw new Error(`Upstash : ${d.error}`);
    return d.result;
  });
}

/** Jour au fuseau de la zone UEMOA (GMT, Abidjan/Dakar), format AAAA-MM-JJ. */
export const jourCourant = (d = new Date()) => d.toISOString().slice(0, 10);
export const moisCourant = (d = new Date()) => d.toISOString().slice(0, 7);

/**
 * Consomme une unité du quota quotidien de l'utilisateur.
 * En cas de panne d'Upstash, on laisse passer (mieux vaut servir que bloquer) et on journalise.
 */
export async function consommerQuota(
  partenaireId: string,
  utilisateurId: string,
  limite: number,
): Promise<{ autorise: boolean; restant: number }> {
  const cle = `quota:${partenaireId}:${utilisateurId}:${jourCourant()}`;
  let valeur: number;
  if (upstash()) {
    try {
      const [n] = await pipeline([["INCR", cle], ["EXPIRE", cle, 2 * 24 * 3600]]);
      valeur = Number(n);
    } catch (e) {
      console.error("[quota]", (e as Error).message);
      return { autorise: true, restant: limite };
    }
  } else {
    valeur = (memoire.get(cle) ?? 0) + 1;
    memoire.set(cle, valeur);
  }
  return { autorise: valeur <= limite, restant: Math.max(0, limite - valeur) };
}

/** Rend une unité de quota (la demande a échoué à cause du service, pas de l'utilisateur). */
export async function rendreQuota(partenaireId: string, utilisateurId: string): Promise<void> {
  const cle = `quota:${partenaireId}:${utilisateurId}:${jourCourant()}`;
  if (upstash()) {
    try {
      await pipeline([["DECR", cle]]);
    } catch (e) {
      console.error("[quota]", (e as Error).message);
    }
  } else {
    memoire.set(cle, Math.max(0, (memoire.get(cle) ?? 0) - 1));
  }
}

/** Nombre de questions restantes aujourd'hui, sans rien consommer. */
export async function quotaRestant(partenaireId: string, utilisateurId: string, limite: number): Promise<number> {
  const cle = `quota:${partenaireId}:${utilisateurId}:${jourCourant()}`;
  let valeur = 0;
  if (upstash()) {
    try {
      const [n] = await pipeline([["GET", cle]]);
      valeur = Number(n ?? 0);
    } catch {
      valeur = 0;
    }
  } else {
    valeur = memoire.get(cle) ?? 0;
  }
  return Math.max(0, limite - valeur);
}

export interface Consommation {
  requetes: number;
  jetonsEntree: number;
  jetonsSortie: number;
  jetonsCacheLus: number;
}

/** Enregistre la consommation d'un appel à Claude pour le partenaire (mois en cours). */
export async function enregistrerConsommation(
  partenaireId: string,
  route: string,
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null },
): Promise<void> {
  const entree = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0);
  const lus = usage.cache_read_input_tokens ?? 0;
  // Journal structuré : visible dans les logs Vercel, utile même sans Upstash.
  console.log(JSON.stringify({ evt: "usage", partenaire: partenaireId, route, entree, lus, sortie: usage.output_tokens }));

  const cle = `conso:${partenaireId}:${moisCourant()}`;
  const champs: [keyof Consommation, number][] = [
    ["requetes", 1],
    ["jetonsEntree", entree],
    ["jetonsSortie", usage.output_tokens],
    ["jetonsCacheLus", lus],
  ];
  if (upstash()) {
    try {
      await pipeline([...champs.map(([k, v]) => ["HINCRBY", cle, k, v]), ["EXPIRE", cle, 400 * 24 * 3600]]);
    } catch (e) {
      console.error("[conso]", (e as Error).message);
    }
  } else {
    const h = memoireHash.get(cle) ?? new Map<string, number>();
    for (const [k, v] of champs) h.set(k, (h.get(k) ?? 0) + v);
    memoireHash.set(cle, h);
  }
}

export async function lireConsommation(partenaireId: string, mois: string): Promise<Consommation> {
  const cle = `conso:${partenaireId}:${mois}`;
  const vide: Consommation = { requetes: 0, jetonsEntree: 0, jetonsSortie: 0, jetonsCacheLus: 0 };
  if (upstash()) {
    const [res] = await pipeline([["HGETALL", cle]]);
    const liste = (res as string[] | null) ?? [];
    for (let i = 0; i + 1 < liste.length; i += 2) {
      const k = liste[i] as keyof Consommation;
      if (k in vide) vide[k] = Number(liste[i + 1]);
    }
    return vide;
  }
  const h = memoireHash.get(cle);
  if (h) for (const k of Object.keys(vide) as (keyof Consommation)[]) vide[k] = h.get(k) ?? 0;
  return vide;
}
