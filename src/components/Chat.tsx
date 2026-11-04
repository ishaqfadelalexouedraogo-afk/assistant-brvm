"use client";

import { useEffect, useRef, useState } from "react";
import { estAnnulation, signalerConsommation, streamer } from "@/lib/client";
import Reponse from "./Reponse";

interface Tour {
  role: "user" | "assistant";
  content: string;
  erreur?: boolean;
}

const SUGGESTIONS = [
  "Comment acheter ma première action à la BRVM ?",
  "C'est quoi une SGI et comment la choisir ?",
  "Quelle différence entre les indices de la BRVM ?",
  "Actions ou obligations d'État UEMOA : que choisir pour débuter ?",
  "Comment sont imposés les dividendes selon le pays ?",
  "Comment reconnaître une arnaque à l'investissement ?",
];

const CLE_STOCKAGE = "wedra-chat-v1";
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

function lireFichier(f: File): Promise<string> {
  return new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = () => ko(r.error);
    r.readAsDataURL(f);
  });
}

export default function Chat() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [saisie, setSaisie] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [enCours, setEnCours] = useState<AbortController | null>(null);
  const [note, setNote] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? "[]");
      if (Array.isArray(s)) setTours(s.slice(-40));
    } catch {}
  }, []);

  function sauver(t: Tour[]) {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(t.filter((x) => !x.erreur).slice(-40)));
    } catch {}
  }

  async function envoyer(texte: string) {
    texte = texte.trim();
    if (!texte || enCours) return;
    setNote("");
    let imageJointe: { mediaType: string; data: string } | undefined;
    if (image) {
      if (image.size > TAILLE_MAX_IMAGE) {
        setNote("Image trop lourde : 5 Mo maximum.");
        return;
      }
      imageJointe = { mediaType: image.type, data: await lireFichier(image) };
    }
    const affiche = image ? `${texte}\n\n[Image jointe : ${image.name}]` : texte;
    const historique: Tour[] = [...tours.filter((t) => !t.erreur), { role: "user", content: affiche }];
    setTours([...historique, { role: "assistant", content: "" }]);
    setSaisie("");
    setImage(null);
    if (champFichier.current) champFichier.current.value = "";

    const ctl = new AbortController();
    setEnCours(ctl);
    try {
      const reponse = await streamer(
        "/api/chat",
        { messages: historique.map(({ role, content }) => ({ role, content })), image: imageJointe },
        {
          signal: ctl.signal,
          surTexte: (t) => setTours([...historique, { role: "assistant", content: t }]),
        },
      );
      const final = [...historique, { role: "assistant" as const, content: reponse }];
      setTours(final);
      sauver(final);
    } catch (e) {
      if (estAnnulation(e)) {
        setTours((t) => {
          const dernier = t[t.length - 1];
          const final = dernier?.content ? t : t.slice(0, -1);
          sauver(final);
          return final;
        });
      } else {
        setTours([...historique, { role: "assistant", content: (e as Error).message, erreur: true }]);
      }
    } finally {
      setEnCours(null);
      signalerConsommation();
    }
  }

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "nearest" });
  }, [tours.length]);

  function nouvelle() {
    enCours?.abort();
    setTours([]);
    sauver([]);
  }

  return (
    <div className="chat">
      <div className="messages">
        <div className="msg ia">
          <span className="qui">Wedra</span>
          <p>
            Bonjour. Je peux t&apos;expliquer le fonctionnement de la BRVM, t&apos;aider à lire les états financiers d&apos;une société
            cotée ou comparer des placements dans la zone UEMOA. Pose ta question, ou choisis-en une ci-dessous.
          </p>
        </div>
        {tours.map((t, i) => (
          <div key={i} className={`msg ${t.role === "user" ? "moi" : "ia"}${t.erreur ? " erreur" : ""}`}>
            <span className="qui">{t.role === "user" ? "Toi" : "Wedra"}</span>
            {t.role === "user" ? (
              <p className="brut">{t.content}</p>
            ) : t.content ? (
              t.erreur ? <p>{t.content}</p> : <Reponse texte={t.content} />
            ) : (
              <p className="note">Réflexion en cours…</p>
            )}
          </div>
        ))}
        <div ref={fin} />
      </div>

      {tours.length === 0 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => envoyer(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="saisie"
        onSubmit={(e) => {
          e.preventDefault();
          envoyer(saisie);
        }}
      >
        <textarea
          id="question"
          aria-label="Ta question"
          rows={2}
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              envoyer(saisie);
            }
          }}
          placeholder="Écris ta question… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"
          maxLength={20000}
        />
        <div className="actions">
          <label className="lien-fichier">
            {image ? `Image : ${image.name}` : "Joindre une image"}
            <input
              ref={champFichier}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
          </label>
          {enCours ? (
            <button className="btn" type="button" onClick={() => enCours.abort()}>
              Arrêter
            </button>
          ) : (
            <button className="btn primaire" type="submit" disabled={!saisie.trim()}>
              Envoyer
            </button>
          )}
        </div>
      </form>
      <div className="ligne-fin">
        <span className="note" role="status">{note}</span>
        <button className="btn" type="button" onClick={nouvelle}>
          Nouvelle conversation
        </button>
      </div>
    </div>
  );
}
