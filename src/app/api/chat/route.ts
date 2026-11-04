import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { repondreEnStreaming } from "@/lib/claude";
import { rendreQuota } from "@/lib/compteurs";
import { erreurJson, lireCorps, verifierAcces } from "@/lib/garde";
import { chargerCotations, contexteMarche } from "@/lib/marche";
import { construireSysteme } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_TOURS = 20;
const MAX_CARACTERES = 60_000;
const MAX_IMAGE_BASE64 = 7_000_000; // ~5 Mo

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20_000) }))
    .min(1)
    .max(100),
  image: z
    .object({
      mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
      data: z.string().min(1).max(MAX_IMAGE_BASE64),
    })
    .optional(),
});

export async function POST(req: Request) {
  const corps = await lireCorps(req, schema);
  if (!corps) return erreurJson(400, "Message invalide ou image trop lourde (5 Mo maximum).");

  // On ne garde que la fin de la conversation : elle doit commencer et finir par un message de l'utilisateur.
  let tours = corps.messages.slice(-MAX_TOURS);
  while (tours.length && tours[0].role !== "user") tours = tours.slice(1);
  while (tours.reduce((n, t) => n + t.content.length, 0) > MAX_CARACTERES && tours.length > 1) tours = tours.slice(2);
  if (!tours.length || tours[tours.length - 1].role !== "user") return erreurJson(400, "Le dernier message doit être ta question.");

  const acces = await verifierAcces(req, { consommer: true });
  if (!acces.ok) return acces.reponse;

  const messages: Anthropic.Beta.BetaMessageParam[] = tours.map((t, i) => {
    const dernier = i === tours.length - 1;
    if (dernier && corps.image) {
      return {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: corps.image.mediaType, data: corps.image.data } },
          { type: "text", text: t.content + "\n\n(Image jointe par l'utilisateur : capture de cours, d'états financiers ou de document.)" },
        ],
      };
    }
    return { role: t.role, content: t.content };
  });

  return repondreEnStreaming({
    partenaireId: acces.partenaire.id,
    surEchec: () => rendreQuota(acces.partenaire.id, acces.session.u),
    route: "chat",
    system: construireSysteme(acces.partenaire, contexteMarche(await chargerCotations())),
    messages,
    effort: "low",
  });
}
