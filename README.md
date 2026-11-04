# Assistant BRVM

Assistant d'intelligence artificielle pour la zone UEMOA. Il sert à trois choses :

- **Discuter** : répondre aux questions sur la bourse et l'épargne dans la zone (BRVM, SGI, AMF-UMOA, titres publics, fiscalité…).
- **Analyser une société** : calculer automatiquement 10 ratios financiers à partir du rapport annuel, puis les expliquer simplement.
- **Apprendre** : 11 modules de formation en 3 niveaux, avec un quiz à la fin de chaque leçon.

Le service est vendu à des **partenaires** (SGI, banques, écoles, associations d'épargnants) qui l'offrent à leurs clients ou étudiants. Chaque partenaire a son code d'accès, sa couleur, son quota et son suivi de consommation.

> L'assistant fait de la pédagogie, pas du conseil en investissement. Voir [docs/VIABILITE.md](docs/VIABILITE.md), partie conformité.

---

## Sommaire

1. [Ce qu'il faut avant de commencer](#1-ce-quil-faut-avant-de-commencer)
2. [Lancer le projet sur ton ordinateur](#2-lancer-le-projet-sur-ton-ordinateur)
3. [Mettre le site en ligne (Vercel)](#3-mettre-le-site-en-ligne-vercel)
4. [Gérer au quotidien](#4-gérer-au-quotidien)
5. [Organisation du code](#5-organisation-du-code)
6. [En cas de problème](#6-en-cas-de-problème)

---

## 1. Ce qu'il faut avant de commencer

| Outil | À quoi ça sert | Où l'obtenir |
|---|---|---|
| **Node.js** version 20.9 ou plus récente (22 conseillé) | Faire tourner le projet | https://nodejs.org (bouton « LTS ») |
| **Git** | Récupérer et sauvegarder le code | https://git-scm.com |
| **Compte GitHub** | Héberger le code | https://github.com |
| **Clé API Claude** | Faire fonctionner l'IA (payant à l'usage) | https://console.anthropic.com → *API Keys* |
| **Compte Vercel** | Mettre le site en ligne | https://vercel.com (se connecter avec GitHub) |
| Compte **Upstash** (facultatif au début) | Compter les quotas et la consommation en production | https://upstash.com |

Pour vérifier que Node.js est bien installé, ouvre un terminal (sur Windows : « Invite de commandes » ou « PowerShell ») et tape :

```bash
node -v
```

Le résultat doit commencer par `v20.9`, `v22` ou plus.

---

## 2. Lancer le projet sur ton ordinateur

**Étape 1. Récupérer le code** (remplace `TON-COMPTE` par ton nom d'utilisateur GitHub) :

```bash
git clone https://github.com/TON-COMPTE/assistant-brvm.git
```

```bash
cd assistant-brvm
```

**Étape 2. Installer les dépendances** (une seule fois, environ 1 minute) :

```bash
npm install
```

**Étape 3. Créer le fichier de configuration.** Copie le modèle :

```bash
cp .env.example .env.local
```

Sur Windows (Invite de commandes), utilise `copy .env.example .env.local` à la place.

Ouvre ensuite `.env.local` avec un éditeur de texte (VS Code, Notepad++…) et remplis :

- `ANTHROPIC_API_KEY` : ta clé API Claude.
- `SESSION_SECRET` : une longue chaîne aléatoire. Pour en générer une :

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- `ACCESS_CODES` : laisse `demo:DEMO-2026` pour tester.
- `ADMIN_TOKEN` : une autre longue chaîne aléatoire (même commande que ci-dessus).

> **Important :** le fichier `.env.local` contient tes secrets. Il est exclu de Git automatiquement. Ne l'envoie jamais à personne.

**Étape 4. Démarrer le site :**

```bash
npm run dev
```

Ouvre http://localhost:3000 dans ton navigateur et saisis le code `DEMO-2026`.

Pour arrêter le serveur, appuie sur `Ctrl + C` dans le terminal.

**Vérifier que tout va bien (facultatif) :**

```bash
npm test
```

```bash
npm run build
```

La première commande lance les tests automatiques, la seconde vérifie que le site se compile pour la production.

---

## 3. Mettre le site en ligne (Vercel)

1. Va sur https://vercel.com, connecte-toi avec GitHub.
2. Clique sur **Add New… → Project**, choisis le dépôt `assistant-brvm`, puis **Import**.
3. Ouvre **Environment Variables** et ajoute **les mêmes variables que dans `.env.local`** : `ANTHROPIC_API_KEY`, `SESSION_SECRET`, `ACCESS_CODES`, `ADMIN_TOKEN`, et `CLAUDE_MODEL` si tu veux changer de modèle.
4. Clique sur **Deploy**. Après 1 à 2 minutes, Vercel te donne l'adresse du site (par exemple `assistant-brvm.vercel.app`).

À chaque fois que tu envoies du code sur GitHub (`git push`), Vercel met le site à jour automatiquement.

**Avant d'ouvrir le service à de vrais utilisateurs :**

- **Crée une base Upstash Redis** (offre gratuite), puis copie `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` dans les variables Vercel. Sans elle, les quotas et la consommation sont comptés en mémoire et se perdent à chaque redémarrage. Vercel fait tourner plusieurs copies du serveur, donc les quotas ne seraient pas fiables.
- **Fixe une limite de dépense** dans la console Anthropic (*Settings → Limits*), pour ne jamais avoir de mauvaise surprise sur la facture.
- **Lis l'offre Vercel :** l'offre gratuite (Hobby) est réservée aux projets non commerciaux. Pour un service vendu à des partenaires, il faut l'offre Pro.

---

## 4. Gérer au quotidien

| Je veux… | Comment | Documentation |
|---|---|---|
| Ajouter un partenaire (SGI, banque, école) | Une ligne dans `config/partenaires.json` + son code dans `ACCESS_CODES` | [docs/PARTENAIRES.md](docs/PARTENAIRES.md) |
| Donner à l'IA les cours du jour | Mettre à jour `data/marche/cours.csv` | [docs/DONNEES_MARCHE.md](docs/DONNEES_MARCHE.md) |
| Savoir combien consomme chaque partenaire | Appeler `/api/admin/usage` | [docs/PARTENAIRES.md](docs/PARTENAIRES.md#suivre-la-consommation) |
| Ajouter un module de formation | Une ligne dans `src/lib/modules.ts` | — |
| Modifier le comportement de l'IA | Le texte `INSTRUCTIONS` dans `src/lib/prompts.ts` | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Estimer les coûts et fixer les prix | — | [docs/VIABILITE.md](docs/VIABILITE.md) |

---

## 5. Organisation du code

```
assistant-brvm/
├── config/partenaires.json    Liste des partenaires (nom, couleur, quota)
├── data/marche/cours.csv      Cours BRVM fournis à l'IA (mis à jour par l'administrateur)
├── docs/                      Documentation
├── src/
│   ├── app/                   Pages du site et routes de l'API
│   │   ├── page.tsx           Page d'accueil (saisie du code d'accès)
│   │   ├── espace/page.tsx    Espace utilisateur (3 onglets)
│   │   └── api/               chat, analyse, lecon, quiz, marche, session, admin/usage
│   ├── components/            Éléments d'interface (Chat, Analyse, Apprendre…)
│   └── lib/                   Logique métier : ratios, IA, partenaires, quotas…
└── .env.example               Modèle de configuration
```

Le détail du fonctionnement est expliqué dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 6. En cas de problème

| Message ou symptôme | Cause probable | Solution |
|---|---|---|
| « Le service n'est pas configuré correctement (clé API) » | `ANTHROPIC_API_KEY` absente ou fausse | Vérifie la clé dans `.env.local` ou dans Vercel, puis redémarre |
| « Le service n'est pas configuré correctement. Préviens l'administrateur » à la connexion | `SESSION_SECRET` absent ou trop court | Mets une chaîne d'au moins 32 caractères |
| « Code d'accès incorrect » avec le bon code | L'identifiant dans `ACCESS_CODES` n'existe pas dans `config/partenaires.json` | Vérifie que les deux correspondent exactement |
| Les quotas repartent à zéro | Pas de base Upstash | Configure Upstash (voir partie 3) |
| `npm install` échoue | Node.js trop ancien | Installe Node.js 22 |

Les erreurs détaillées apparaissent dans le terminal (en local) ou dans **Vercel → ton projet → Logs** (en ligne).
