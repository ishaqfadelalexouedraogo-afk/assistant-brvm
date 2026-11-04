import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Espace from "@/components/Espace";
import { trouverPartenaire } from "@/lib/partenaires";
import { lireJeton, NOM_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PageEspace() {
  const jeton = (await cookies()).get(NOM_COOKIE)?.value;
  let session = null;
  try {
    session = lireJeton(jeton ? decodeURIComponent(jeton) : undefined);
  } catch {}
  const partenaire = session ? trouverPartenaire(session.p) : null;
  if (!partenaire) redirect("/");

  return (
    <Espace
      partenaire={{ nom: partenaire.nom, couleur: partenaire.couleur, messageAccueil: partenaire.messageAccueil ?? null }}
    />
  );
}
