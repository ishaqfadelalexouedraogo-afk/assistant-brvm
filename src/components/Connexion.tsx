"use client";

import { useState } from "react";
import { posterJson } from "@/lib/client";

export default function Connexion() {
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur("");
    try {
      await posterJson("/api/session", { code });
      window.location.href = "/espace";
    } catch (err) {
      setErreur((err as Error).message);
      setEnvoi(false);
    }
  }

  return (
    <form className="panneau connexion" onSubmit={valider}>
      <label htmlFor="code">Code d&apos;accès</label>
      <p className="aide">Ton code t&apos;est fourni par ton organisme (SGI, banque, école).</p>
      <div className="ligne">
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="Ex. : DEMO-2026"
          required
        />
        <button className="btn primaire" type="submit" disabled={envoi || !code.trim()}>
          {envoi ? "Connexion…" : "Entrer"}
        </button>
      </div>
      {erreur && <p className="note erreur" role="alert">{erreur}</p>}
    </form>
  );
}
