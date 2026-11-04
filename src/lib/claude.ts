/**
 * Accès à l'API Claude (côté serveur uniquement : la clé n'est jamais envoyée au navigateur).
 */
import Anthropic from "@anthropic-ai/sdk";
import { enregistrerConsommation } from "./compteurs";

export const MODELE = process.env.CLAUDE_MODEL || "claude-opus-5-5";

// Modèles qui acceptent le repli automatique côté serveur (fallbacks: "default") :
// si les filtres de sécurité refusent une demande légitime, l'API la relance sur un autre modèle.
const MODELES_AVEC_REPLI = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"]);

let client: Anthropic | null = null;
export function claude(): Anthropic {
  if (!client) client = new Anthropic(); // lit ANTHROPIC_API_KEY
  return client;
}

/** Paramètres de repli à ajouter aux requêtes beta quand le modèle le permet. */
export function optionsRepli(): { betas?: Anthropic.Beta.AnthropicBeta[]; fallbacks?: "default" } {
  return MODELES_AVEC_REPLI.has(MODELE) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {};
}

export type Effort = "low" | "medium" | "high";

/** Message d'erreur lisible pour l'utilisateur, à partir des erreurs typées du SDK. */
export function messageErreur(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Le service n'est pas configuré correctement (clé API). Préviens l'administrateur.";
  if (err instanceof Anthropic.RateLimitError) return "Le service est très sollicité. Réessaie dans une minute.";
  if (err instanceof Anthropic.BadRequestError) return "La demande n'a pas pu être traitée. Raccourcis ou reformule ta question.";
  if (err instanceof Anthropic.APIConnectionError) return "Connexion au service d'IA impossible. Réessaie dans un instant.";
  if (err instanceof Anthropic.APIError) return "Le service d'IA est momentanément indisponible. Réessaie dans un instant.";
  return "Une erreur inattendue s'est produite. Réessaie dans un instant.";
}

const encodeur = new TextEncoder();

/**
 * Lance une réponse en streaming et la renvoie au navigateur sous forme de texte brut,
 * morceau par morceau. Enregistre la consommation du partenaire à la fin.
 */
export function repondreEnStreaming(opts: {
  partenaireId: string;
  route: string;
  system: Anthropic.Beta.BetaTextBlockParam[];
  messages: Anthropic.Beta.BetaMessageParam[];
  effort: Effort;
  maxTokens?: number;
  /** Appelé si le service échoue avant d'avoir produit du texte (pour rendre le quota). */
  surEchec?: () => Promise<void>;
}): Response {
  const flux = claude().beta.messages.stream({
    model: MODELE,
    max_tokens: opts.maxTokens ?? 16000,
    system: opts.system,
    messages: opts.messages,
    output_config: { effort: opts.effort },
    ...optionsRepli(),
  });

  const corps = new ReadableStream<Uint8Array>({
    async start(controller) {
      let texteEnvoye = false;
      const envoyer = (t: string) => {
        texteEnvoye = true;
        controller.enqueue(encodeur.encode(t));
      };
      try {
        for await (const ev of flux) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") envoyer(ev.delta.text);
        }
        const final = await flux.finalMessage();
        if (final.stop_reason === "refusal") {
          envoyer("\n\n> Cette demande n'a pas pu être traitée. Reformule ta question autrement.");
        } else if (final.stop_reason === "max_tokens") {
          envoyer("\n\n> Réponse coupée car trop longue. Demande la suite ou une version plus courte.");
        }
        await enregistrerConsommation(opts.partenaireId, opts.route, final.usage);
      } catch (err) {
        if (!(err instanceof Anthropic.APIUserAbortError)) {
          console.error(`[${opts.route}]`, err);
          if (!texteEnvoye) await opts.surEchec?.().catch(() => {});
          envoyer("\n\n> " + messageErreur(err));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      flux.abort(); // l'utilisateur a cliqué sur « Arrêter » : on arrête de payer la suite
    },
  });

  return new Response(corps, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
