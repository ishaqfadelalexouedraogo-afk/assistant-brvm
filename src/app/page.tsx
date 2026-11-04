import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Avertissement, Bandeau } from "@/components/Commun";
import Connexion from "@/components/Connexion";
import { trouverPartenaire } from "@/lib/partenaires";
import { lireJeton, NOM_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const jeton = (await cookies()).get(NOM_COOKIE)?.value;
  let session = null;
  try {
    session = lireJeton(jeton ? decodeURIComponent(jeton) : undefined);
  } catch {}
  if (session && trouverPartenaire(session.p)) redirect("/espace");

  return (
    <main className="wrap accueil">
      <Bandeau />
      <header>
        <h1>Wedra</h1>
        <p className="slogan">La bourse de l&apos;UEMOA, expliquée simplement.</p>
        <p className="intro">
          Comprendre la bourse, analyser une société cotée et poser tes questions sur l&apos;investissement dans la zone UEMOA.
        </p>
      </header>
      <Connexion />
      <ul className="atouts">
        <li><strong>Discuter</strong> avec une IA qui connaît le marché financier régional : BRVM, SGI, AMF-UMOA, titres publics.</li>
        <li><strong>Analyser</strong> une société : les ratios sont calculés automatiquement puis expliqués simplement.</li>
        <li><strong>Apprendre</strong> à ton rythme : leçons en 3 niveaux, avec quiz.</li>
      </ul>
      <Avertissement />
    </main>
  );
}
