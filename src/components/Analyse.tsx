"use client";

import { useEffect, useMemo, useState } from "react";
import { estAnnulation, signalerConsommation, streamer } from "@/lib/client";
import type { Cotation } from "@/lib/marche";
import { calculerRatios, formaterRatio, type DonneesSociete } from "@/lib/ratios";
import Reponse from "./Reponse";

const PAYS = ["Bénin", "Burkina Faso", "Côte d'Ivoire", "Guinée-Bissau", "Mali", "Niger", "Sénégal", "Togo"];
const SECTEURS = ["Télécommunications", "Banque / finance", "Distribution", "Industrie", "Agriculture", "Services publics", "Transport", "Autre"];

type ChampNumerique = keyof DonneesSociete;
const CHAMPS: { cle: ChampNumerique; libelle: string; aide?: string }[] = [
  { cle: "cours", libelle: "Cours de l'action (FCFA)" },
  { cle: "nbActions", libelle: "Nombre d'actions" },
  { cle: "chiffreAffaires", libelle: "Chiffre d'affaires ou PNB", aide: "M FCFA" },
  { cle: "resultatNet", libelle: "Résultat net", aide: "M FCFA" },
  { cle: "capitauxPropres", libelle: "Capitaux propres", aide: "M FCFA" },
  { cle: "dettesFinancieres", libelle: "Dettes financières", aide: "M FCFA" },
  { cle: "dividendeParAction", libelle: "Dividende par action (FCFA)" },
  { cle: "resultatNetPrecedent", libelle: "Résultat net N-1 (facultatif)", aide: "M FCFA" },
];

// Exemple fictif affiché à l'ouverture, pour montrer le fonctionnement.
const EXEMPLE: Record<ChampNumerique, string> = {
  cours: "15000",
  nbActions: "100000000",
  chiffreAffaires: "1200000",
  resultatNet: "180000",
  capitauxPropres: "900000",
  dettesFinancieres: "400000",
  dividendeParAction: "1100",
  resultatNetPrecedent: "160000",
};

const versNombre = (s: string): number | null => {
  const n = Number(s.replace(/[\s  ]/g, "").replace(",", "."));
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
};

export default function Analyse() {
  const [societe, setSociete] = useState("Société exemple SA (fictive)");
  const [pays, setPays] = useState("Côte d'Ivoire");
  const [secteur, setSecteur] = useState("Télécommunications");
  const [valeurs, setValeurs] = useState<Record<ChampNumerique, string>>(EXEMPLE);
  const [notes, setNotes] = useState("");
  const [cotations, setCotations] = useState<Cotation[]>([]);
  const [resultat, setResultat] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/marche", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { cotations: [] }))
      .then((d: { cotations: Cotation[] }) => setCotations(d.cotations))
      .catch(() => setCotations([]));
  }, []);

  const donnees = useMemo(() => {
    const d = {} as DonneesSociete;
    for (const c of CHAMPS) d[c.cle] = versNombre(valeurs[c.cle]);
    return d;
  }, [valeurs]);
  const ratios = useMemo(() => calculerRatios(donnees), [donnees]);

  function choisirCotation(symbole: string) {
    const c = cotations.find((x) => x.symbole === symbole);
    if (!c) return;
    setSociete(`${c.societe} (${c.symbole})`);
    if (PAYS.includes(c.pays)) setPays(c.pays);
    setValeurs((v) => ({ ...v, cours: String(c.cours) }));
    setNotes((n) => (n ? n : `Cours du ${c.date} chargé depuis la cote officielle.`));
  }

  async function interpreter() {
    if (enCours) return;
    setErreur("");
    setResultat("");
    const ctl = new AbortController();
    setEnCours(ctl);
    try {
      await streamer("/api/analyse", { societe, pays, secteur, notes, ...donnees }, { signal: ctl.signal, surTexte: setResultat });
    } catch (e) {
      if (!estAnnulation(e)) setErreur((e as Error).message);
    } finally {
      setEnCours(null);
      signalerConsommation();
    }
  }

  return (
    <div className="deux-colonnes">
      <form className="panneau" onSubmit={(e) => e.preventDefault()}>
        <h2>Les chiffres de la société</h2>
        <p className="aide">
          Préremplis avec un <strong>exemple fictif</strong>. Remplace-les par les chiffres du dernier rapport annuel. Montants du
          bilan et du compte de résultat en <strong>millions de FCFA</strong>.
        </p>
        {cotations.length > 0 && (
          <div className="champ">
            <label htmlFor="cotation">Partir d&apos;une société cotée</label>
            <select id="cotation" defaultValue="" onChange={(e) => choisirCotation(e.target.value)}>
              <option value="" disabled>
                Choisir dans la cote ({cotations.length} sociétés)
              </option>
              {cotations.map((c) => (
                <option key={c.symbole} value={c.symbole}>
                  {c.symbole} · {c.societe} · {c.cours.toLocaleString("fr-FR")} FCFA ({c.date})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="champs">
          <div className="champ large">
            <label htmlFor="societe">Société</label>
            <input id="societe" value={societe} onChange={(e) => setSociete(e.target.value)} maxLength={120} />
          </div>
          <div className="champ">
            <label htmlFor="pays">Pays</label>
            <select id="pays" value={pays} onChange={(e) => setPays(e.target.value)}>
              {PAYS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="champ">
            <label htmlFor="secteur">Secteur</label>
            <select id="secteur" value={secteur} onChange={(e) => setSecteur(e.target.value)}>
              {SECTEURS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {CHAMPS.map((c) => (
            <div className="champ" key={c.cle}>
              <label htmlFor={c.cle}>
                {c.libelle}
                {c.aide && <span className="unite"> · {c.aide}</span>}
              </label>
              <input
                id={c.cle}
                inputMode="decimal"
                value={valeurs[c.cle]}
                onChange={(e) => setValeurs((v) => ({ ...v, [c.cle]: e.target.value }))}
              />
            </div>
          ))}
          <div className="champ large">
            <label htmlFor="notes">Autres informations (facultatif)</label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              maxLength={4000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Actionnaire majoritaire, projets, contexte du pays, extrait du rapport annuel…"
            />
          </div>
        </div>
      </form>

      <div className="panneau">
        <h2>Ratios calculés</h2>
        <table className="ratios">
          <tbody>
            {ratios.map((r) => (
              <tr key={r.cle}>
                <td>
                  {r.libelle}
                  <small>{r.explication}</small>
                </td>
                <td className="valeur">{formaterRatio(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ligne-fin">
          <span className="note erreur" role="alert">{erreur}</span>
          {enCours ? (
            <button className="btn" type="button" onClick={() => enCours.abort()}>
              Arrêter
            </button>
          ) : (
            <button className="btn primaire" type="button" onClick={interpreter} disabled={!societe.trim()}>
              Interpréter avec l&apos;IA
            </button>
          )}
        </div>
        {(resultat || enCours) && (
          <div className="sortie">{resultat ? <Reponse texte={resultat} /> : <p className="note">Analyse en cours…</p>}</div>
        )}
      </div>
    </div>
  );
}
