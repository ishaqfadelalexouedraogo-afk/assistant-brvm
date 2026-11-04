"use client";

import { useCallback, useEffect, useState } from "react";
import Analyse from "./Analyse";
import Apprendre from "./Apprendre";
import Chat from "./Chat";
import { Avertissement, Bandeau } from "./Commun";

type Onglet = "discuter" | "analyser" | "apprendre";
const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: "discuter", libelle: "Discuter" },
  { id: "analyser", libelle: "Analyser une société" },
  { id: "apprendre", libelle: "Apprendre" },
];

export default function Espace({
  partenaire,
}: {
  partenaire: { nom: string; couleur: string; messageAccueil: string | null };
}) {
  const [onglet, setOnglet] = useState<Onglet>("discuter");
  const [restant, setRestant] = useState<{ restant: number; quota: number } | null>(null);

  const rafraichir = useCallback(async () => {
    try {
      const r = await fetch("/api/session", { cache: "no-store" });
      if (r.status === 401) {
        window.location.href = "/";
        return;
      }
      if (r.ok) setRestant(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    const h = window.location.hash.slice(1) as Onglet;
    if (ONGLETS.some((o) => o.id === h)) setOnglet(h);
    rafraichir();
    window.addEventListener("brvm:consommation", rafraichir);
    return () => window.removeEventListener("brvm:consommation", rafraichir);
  }, [rafraichir]);

  function choisir(o: Onglet) {
    setOnglet(o);
    history.replaceState(null, "", "#" + o);
  }

  async function deconnecter() {
    await fetch("/api/session", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <main className="wrap" style={{ ["--accent-base" as string]: partenaire.couleur }}>
      <Bandeau />
      <header className="entete">
        <div>
          <h1>
            Assistant <em>BRVM</em>
          </h1>
          <p className="intro">Proposé par {partenaire.nom}</p>
        </div>
        <div className="compte">
          {restant && (
            <span className="compteur" title="Demandes à l'IA restantes aujourd'hui">
              <b>{restant.restant}</b> / {restant.quota} demandes aujourd&apos;hui
            </span>
          )}
          <button className="btn" type="button" onClick={deconnecter}>
            Se déconnecter
          </button>
        </div>
      </header>
      {partenaire.messageAccueil && <p className="accueil-partenaire">{partenaire.messageAccueil}</p>}
      <Avertissement />

      <nav className="onglets" role="tablist" aria-label="Sections">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            role="tab"
            id={`onglet-${o.id}`}
            aria-selected={onglet === o.id}
            aria-controls={`vue-${o.id}`}
            onClick={() => choisir(o.id)}
          >
            {o.libelle}
          </button>
        ))}
      </nav>

      {/* Les trois vues restent montées pour ne pas perdre ce qui est en cours quand on change d'onglet. */}
      <section id="vue-discuter" role="tabpanel" aria-labelledby="onglet-discuter" hidden={onglet !== "discuter"}>
        <Chat />
      </section>
      <section id="vue-analyser" role="tabpanel" aria-labelledby="onglet-analyser" hidden={onglet !== "analyser"}>
        <Analyse />
      </section>
      <section id="vue-apprendre" role="tabpanel" aria-labelledby="onglet-apprendre" hidden={onglet !== "apprendre"}>
        <Apprendre />
      </section>

      <footer className="pied">
        Sources officielles pour des données à jour : brvm.org (cours, indices, avis), amf-umoa.org (régulation, SGI agréées),
        bceao.int (taux, statistiques), umoatitres.org (titres publics).
      </footer>
    </main>
  );
}
