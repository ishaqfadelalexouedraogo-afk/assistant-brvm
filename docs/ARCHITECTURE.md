# Architecture

Ce document explique comment l'application fonctionne, pour la personne qui la maintient.

## Vue d'ensemble

```
Navigateur de l'utilisateur
   │  (1) saisit un code d'accès        ──► POST /api/session ──► cookie de session signé
   │  (2) pose une question              ──► POST /api/chat     ─┐
   │      demande une analyse            ──► POST /api/analyse  ─┤  vérifie la session et le quota,
   │      ouvre une leçon                ──► POST /api/lecon    ─┤  appelle Claude, renvoie la réponse
   │      lance un quiz                  ──► POST /api/quiz     ─┘  au fil de l'eau, compte la consommation
   ▼
Serveur Next.js (Vercel)
   ├── API Claude (Anthropic) : la clé API reste sur le serveur
   ├── Upstash Redis : quotas journaliers et consommation mensuelle par partenaire
   └── Fichiers : config/partenaires.json, data/marche/cours.csv
```

Il n'y a **pas de base de données d'utilisateurs** et **aucune donnée personnelle** n'est stockée côté serveur : le cookie de session contient seulement l'identifiant du partenaire et un identifiant anonyme tiré au hasard. L'historique des conversations reste dans le navigateur de l'utilisateur (`localStorage`).

## Les fichiers importants

| Fichier | Rôle |
|---|---|
| `src/lib/prompts.ts` | Les instructions de l'IA (son rôle, le contexte UEMOA, ses règles de prudence). C'est le fichier à modifier pour changer son comportement. |
| `src/lib/claude.ts` | Connexion à l'API Claude, réponse en streaming, messages d'erreur, enregistrement de la consommation. |
| `src/lib/ratios.ts` | Calcul des 10 ratios financiers. Utilisé à la fois dans le navigateur (affichage immédiat) et sur le serveur (les ratios envoyés à l'IA sont toujours recalculés côté serveur). Testé dans `ratios.test.ts`. |
| `src/lib/marche.ts` | Lecture du fichier des cours et mise en forme pour l'IA. |
| `src/lib/partenaires.ts` | Partenaires et vérification des codes d'accès. |
| `src/lib/session.ts` | Cookie de session signé (HMAC-SHA256), valable 30 jours. |
| `src/lib/compteurs.ts` | Quotas journaliers et consommation (Upstash, ou mémoire en local). |
| `src/lib/garde.ts` | Vérifications communes aux routes : session, partenaire actif, quota. |
| `src/lib/modules.ts` | Liste des modules de formation. |

## Choix techniques et pourquoi

- **Next.js** : le site et le serveur dans un seul projet, déployable en un clic sur Vercel.
- **Modèle Claude** : `claude-opus-5-5` par défaut, modifiable avec la variable `CLAUDE_MODEL`, sans toucher au code.
- **Niveau de réflexion (« effort ») adapté à chaque tâche**, pour équilibrer qualité et coût :

  | Tâche | Effort | Pourquoi |
  |---|---|---|
  | Discussion | `low` | Réponses rapides, questions courantes |
  | Leçon | `medium` | Texte structuré de 450 à 700 mots |
  | Analyse financière | `high` | Raisonnement sur des chiffres, enjeu de justesse |
  | Quiz | `low` | Tâche simple, réponse structurée (JSON validé) |

- **Repli automatique** (`fallbacks: "default"`) : si les filtres de sécurité de l'API refusent par erreur une demande légitime, l'API la relance automatiquement sur un autre modèle. Ce repli n'est activé qu'avec les modèles qui le prennent en charge.
- **Mise en cache des instructions** : le bloc d'instructions est identique pour toutes les requêtes. L'API peut le mettre en cache, ce qui réduit le coût des jetons d'entrée. Les éléments variables (nom du partenaire, cours) sont placés après.
- **Streaming** : la réponse s'affiche au fur et à mesure. Le bouton « Arrêter » coupe la génération côté serveur, et on ne paie pas la suite.
- **Quota rendu en cas de panne** : si l'IA échoue avant d'avoir répondu, la demande n'est pas décomptée du quota de l'utilisateur.

## Sécurité

- La clé API Claude n'est jamais envoyée au navigateur.
- Les codes d'accès et secrets sont dans des variables d'environnement, jamais dans le code.
- La session est signée : impossible de se faire passer pour un autre partenaire.
- Toutes les entrées sont validées (taille, type) avec `zod` avant d'appeler l'IA.
- Les essais de codes en rafale sont limités (10 par tranche de 15 minutes et par adresse IP, sur chaque instance du serveur).
- Les réponses de l'IA sont affichées en Markdown sans HTML brut : pas d'injection de code possible.

## Tests

```bash
npm test
```

Les tests couvrent les calculs de ratios, la lecture du fichier des cours, la signature des sessions et les codes d'accès. Lance-les après chaque modification de `src/lib/`.
