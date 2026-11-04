# Gérer les partenaires

Un **partenaire** est une organisation qui offre Wedra à ses utilisateurs : une SGI à ses clients, une banque à ses épargnants, une école à ses étudiants. Ses utilisateurs se connectent avec un **code d'accès** propre au partenaire.

## Ajouter un partenaire

**1. Déclarer le partenaire** dans `config/partenaires.json` :

```json
{
  "partenaires": [
    {
      "id": "demo",
      "nom": "Démonstration",
      "couleur": "#0b6e4f",
      "quotaQuotidien": 30,
      "messageAccueil": "Bienvenue sur la version de démonstration de Wedra."
    },
    {
      "id": "ecole-finance-dakar",
      "nom": "École de finance de Dakar",
      "couleur": "#1f4e8c",
      "quotaQuotidien": 40,
      "messageAccueil": "Bienvenue aux étudiants du master Finance."
    }
  ]
}
```

| Champ | Rôle |
|---|---|
| `id` | Identifiant technique : minuscules, chiffres et tirets, sans espace ni accent. Ne le change plus ensuite (il sert au suivi de consommation). |
| `nom` | Nom affiché aux utilisateurs (« Proposé par … »). |
| `couleur` | Couleur principale de l'interface, au format `#RRGGBB`. Choisis une couleur assez foncée pour que le texte blanc reste lisible sur les boutons. |
| `quotaQuotidien` | Nombre maximum de demandes à l'IA par utilisateur et par jour. C'est ce qui maîtrise les coûts. |
| `messageAccueil` | Facultatif. Phrase affichée en haut de l'espace. |

L'exemple « École de finance de Dakar » ci-dessus est fictif.

**2. Créer son code d'accès** dans la variable `ACCESS_CODES` (dans `.env.local` en local, dans Vercel en ligne) :

```
ACCESS_CODES=demo:DEMO-2026,ecole-finance-dakar:EFD-7Q4M-2026
```

Format : `id:code`, séparés par des virgules. La majuscule ou minuscule n'a pas d'importance à la saisie. Choisis des codes difficiles à deviner (au moins 10 caractères, avec des chiffres).

**3. Mettre en ligne** : envoie le changement de `config/partenaires.json` sur GitHub (`git add`, `git commit`, `git push`). Si tu as modifié `ACCESS_CODES` dans Vercel, relance un déploiement (*Deployments → … → Redeploy*).

## Retirer ou suspendre un partenaire

- **Suspendre** : retire son code de `ACCESS_CODES`. Plus personne ne peut se connecter avec.
- **Retirer complètement** : retire aussi sa ligne de `config/partenaires.json`. Les sessions déjà ouvertes s'arrêtent immédiatement.

## Changer un code d'accès

Remplace le code dans `ACCESS_CODES` puis redéploie. Les utilisateurs déjà connectés le restent (30 jours au maximum). Pour déconnecter tout le monde, change aussi `SESSION_SECRET`.

## Suivre la consommation

Chaque appel à l'IA est compté par partenaire et par mois : nombre de demandes et jetons consommés (les « jetons » sont l'unité de facturation de l'API Claude). Ces chiffres servent à facturer les partenaires.

Pour les consulter (remplace l'adresse et le jeton) :

```bash
curl -H "Authorization: Bearer TON_ADMIN_TOKEN" "https://ton-site.vercel.app/api/admin/usage?mois=2026-11"
```

Réponse :

```json
{
  "mois": "2026-11",
  "partenaires": [
    { "partenaire": "demo", "nom": "Démonstration", "requetes": 412, "jetonsEntree": 1530000, "jetonsSortie": 380000, "jetonsCacheLus": 0 }
  ]
}
```

Les chiffres de cet exemple sont illustratifs. Pour convertir en coût, voir [VIABILITE.md](VIABILITE.md#calculer-le-coût-réel-dun-partenaire).

> Le suivi n'est fiable qu'avec Upstash configuré (voir le README, partie 3). Sans Upstash, chaque appel est quand même écrit dans les logs Vercel (ligne `"evt":"usage"`).
