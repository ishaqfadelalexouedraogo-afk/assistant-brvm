"use client";

import { useRef, useState } from "react";
import { ErreurApi, estAnnulation, posterJson, signalerConsommation, streamer } from "@/lib/client";
import { MODULES } from "@/lib/modules";
import { NIVEAUX, type Niveau } from "@/lib/prompts";
import Reponse from "./Reponse";

interface Question {
  question: string;
  choix: string[];
  bonne: number;
  explication: string;
}

export default function Apprendre() {
  const [niveau, setNiveau] = useState<Niveau>("débutant");
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [lecon, setLecon] = useState("");
  const [leconFinie, setLeconFinie] = useState(false);
  const [note, setNote] = useState("");
  const [quiz, setQuiz] = useState<Question[] | null>(null);
  const [reponses, setReponses] = useState<Record<number, number>>({});
  const [chargeQuiz, setChargeQuiz] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const zoneLecon = useRef<HTMLDivElement>(null);

  async function ouvrir(id: string, niv: Niveau = niveau) {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setModuleId(id);
    setLecon("");
    setLeconFinie(false);
    setQuiz(null);
    setReponses({});
    setNote("");
    setTimeout(() => zoneLecon.current?.scrollIntoView({ block: "nearest" }), 0);
    try {
      await streamer("/api/lecon", { moduleId: id, niveau: niv }, { signal: c.signal, surTexte: (t) => ctl.current === c && setLecon(t) });
      if (ctl.current === c) setLeconFinie(true);
    } catch (e) {
      if (!estAnnulation(e) && ctl.current === c) setNote((e as Error).message);
    } finally {
      signalerConsommation();
    }
  }

  function changerNiveau(n: Niveau) {
    setNiveau(n);
    if (moduleId) ouvrir(moduleId, n);
  }

  async function lancerQuiz() {
    setChargeQuiz(true);
    setNote("");
    try {
      const d = await posterJson<{ questions: Question[] }>("/api/quiz", { lecon, niveau });
      setQuiz(d.questions);
      setReponses({});
    } catch (e) {
      setNote(e instanceof ErreurApi ? e.message : "Le quiz n'a pas pu être préparé. Réessaie.");
    } finally {
      setChargeQuiz(false);
      signalerConsommation();
    }
  }

  const repondues = Object.keys(reponses).length;
  const justes = quiz ? quiz.filter((q, i) => reponses[i] === q.bonne).length : 0;

  return (
    <div className="panneau">
      <div className="ligne-fin">
        <h2>Parcours de culture boursière</h2>
        <div className="niveaux" role="group" aria-label="Niveau">
          {NIVEAUX.map((n) => (
            <button key={n} type="button" aria-pressed={niveau === n} onClick={() => changerNiveau(n)}>
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <p className="aide">Choisis un module : l&apos;assistant rédige la leçon à ton niveau, avec des exemples de la zone UEMOA, puis te propose un quiz.</p>
      <div className="modules">
        {MODULES.map((m) => (
          <button key={m.id} type="button" className="module" aria-current={moduleId === m.id} onClick={() => ouvrir(m.id)}>
            <strong>{m.titre}</strong>
            <span>{m.description}</span>
          </button>
        ))}
      </div>

      <div ref={zoneLecon}>
        {moduleId && (
          <div className="sortie">
            {lecon ? <Reponse texte={lecon} /> : !note && <p className="note">Rédaction de la leçon…</p>}
            <div className="ligne-fin">
              <span className="note erreur" role="alert">{note}</span>
              {leconFinie && !quiz && (
                <button className="btn primaire" type="button" onClick={lancerQuiz} disabled={chargeQuiz}>
                  {chargeQuiz ? "Préparation du quiz…" : "Faire le quiz"}
                </button>
              )}
            </div>
          </div>
        )}

        {quiz && (
          <div className="quiz">
            {quiz.map((q, i) => {
              const choisi = reponses[i];
              return (
                <div className="question" key={i}>
                  <p>
                    {i + 1}. {q.question}
                  </p>
                  <div className="choix">
                    {q.choix.map((c, j) => {
                      const etat = choisi === undefined ? "" : j === q.bonne ? "juste" : j === choisi ? "faux" : "";
                      return (
                        <button
                          key={j}
                          type="button"
                          className={etat}
                          disabled={choisi !== undefined}
                          onClick={() => setReponses((r) => ({ ...r, [i]: j }))}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  {choisi !== undefined && <p className="explication">{q.explication}</p>}
                </div>
              );
            })}
            {repondues > 0 && (
              <p className="score">
                Score : {justes} / {repondues}
                {repondues === quiz.length && (justes === quiz.length ? " · Parfait." : " · Relis la leçon pour les points manqués.")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
