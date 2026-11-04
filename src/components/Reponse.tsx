"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Affiche une réponse de l'IA (Markdown). Le HTML brut est ignoré par react-markdown : pas d'injection possible. */
export default function Reponse({ texte }: { texte: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="tableau">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {texte}
      </ReactMarkdown>
    </div>
  );
}
