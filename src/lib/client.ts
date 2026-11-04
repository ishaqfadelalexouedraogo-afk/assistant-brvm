/** Outils côté navigateur pour appeler l'API. */

export class ErreurApi extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function lireErreur(res: Response): Promise<ErreurApi> {
  let message = "Le service ne répond pas correctement. Réessaie dans un instant.";
  try {
    const d = (await res.json()) as { erreur?: string };
    if (d.erreur) message = d.erreur;
  } catch {}
  if (res.status === 401 && typeof window !== "undefined") window.location.href = "/";
  return new ErreurApi(res.status, message);
}

/** POST JSON et lecture de la réponse texte au fil de l'eau. Renvoie le texte complet. */
export async function streamer(
  url: string,
  corps: unknown,
  opts: { signal?: AbortSignal; surTexte: (texteComplet: string) => void },
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw await lireErreur(res);
  const lecteur = res.body.getReader();
  const dec = new TextDecoder();
  let texte = "";
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    texte += dec.decode(value, { stream: true });
    opts.surTexte(texte);
  }
  texte += dec.decode();
  opts.surTexte(texte);
  return texte;
}

export async function posterJson<T>(url: string, corps: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
  if (!res.ok) throw await lireErreur(res);
  return (await res.json()) as T;
}

export const estAnnulation = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

/** Signale à l'en-tête qu'une demande a été consommée (mise à jour du compteur). */
export const signalerConsommation = () => window.dispatchEvent(new Event("brvm:consommation"));
