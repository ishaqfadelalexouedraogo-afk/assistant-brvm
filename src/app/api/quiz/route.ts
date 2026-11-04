import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { claude, messageErreur, MODELE } from "@/lib/claude";
import { enregistrerConsommation, rendreQuota } from "@/lib/compteurs";
import { erreurJson, lireCorps, verifierAcces } from "@/lib/garde";
import { consigneQuiz, INSTRUCTIONS, NIVEAUX } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

const Quiz = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      choix: z.array(z.string()),
      bonne: z.number().int(),
      explication: z.string(),
    }),
  ),
});

const schema = z.object({ lecon: z.string().min(50).max(15_000), niveau: z.enum(NIVEAUX) });

export async function POST(req: Request) {
  const corps = await lireCorps(req, schema);
  if (!corps) return erreurJson(400, "Leçon manquante : génère d'abord une leçon.");

  const acces = await verifierAcces(req, { consommer: true });
  if (!acces.ok) return acces.reponse;

  try {
    const reponse = await claude().messages.parse({
      model: MODELE,
      max_tokens: 8000,
      system: [{ type: "text", text: INSTRUCTIONS, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: consigneQuiz(corps.lecon, corps.niveau) }],
      output_config: { effort: "low", format: zodOutputFormat(Quiz) },
    });
    await enregistrerConsommation(acces.partenaire.id, "quiz", reponse.usage);

    if (reponse.stop_reason === "refusal" || !reponse.parsed_output) {
      return erreurJson(422, "Le quiz n'a pas pu être préparé. Réessaie.");
    }
    // Vérification défensive : 4 choix et un indice valide.
    const questions = reponse.parsed_output.questions
      .filter((q) => q.choix.length >= 2 && q.bonne >= 0 && q.bonne < q.choix.length)
      .slice(0, 6);
    if (!questions.length) return erreurJson(422, "Le quiz n'a pas pu être préparé. Réessaie.");
    return Response.json({ questions }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    await rendreQuota(acces.partenaire.id, acces.session.u);
    if (!(err instanceof Anthropic.APIError)) console.error("[quiz]", err);
    else console.error("[quiz]", err.status, err.message);
    return erreurJson(502, messageErreur(err));
  }
}
