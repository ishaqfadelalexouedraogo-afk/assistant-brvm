# Viabilité du projet

Ce document sert à décider des prix, à préparer les échanges avec les partenaires et à anticiper les obligations réglementaires. Les chiffres de coût sont des **estimations** à vérifier avec ta consommation réelle (voir plus bas).

## 1. Le modèle économique : B2B

Wedra n'est pas vendu directement au grand public. Il est vendu à des organisations qui l'offrent à leurs propres utilisateurs.

| Partenaire | Ce qu'il y gagne | Ce qu'il paie |
|---|---|---|
| **SGI** | Des clients mieux formés, qui investissent davantage et posent moins de questions de base au service client | Abonnement mensuel selon le nombre d'utilisateurs actifs |
| **Banque** | Un service à valeur ajoutée pour ses épargnants ; éducation financière | Abonnement ou licence annuelle |
| **École, université** | Un outil pédagogique pour les cursus finance, avec quiz | Licence annuelle par promotion |
| **Société de gestion (OPCVM)** | Faire connaître les fonds communs de placement | Abonnement |

**Arguments de vente :**

- Outil adapté à la zone UEMOA (BRVM, SYSCOHADA, FCFA, fiscalités nationales), pas un outil générique.
- Prudence intégrée : pas de conseil d'achat ou de vente, mise en garde contre les arnaques, renvoi vers les sources officielles.
- Aux couleurs du partenaire, avec quotas maîtrisés et suivi de consommation.
- Aucune donnée personnelle collectée.

## 2. Les coûts

### Coût de l'IA (le principal poste)

L'API Claude est facturée au nombre de « jetons » (un jeton ≈ ¾ de mot) lus et écrits par le modèle. Tarifs de `claude-opus-5-5`, le modèle par défaut, en dollars US par million de jetons : **4 $ en entrée**, **20 $ en sortie**, **0,20 $ pour les entrées lues depuis le cache**. Vérifie les tarifs à jour sur https://claude.com/pricing.

Estimation par demande (la sortie inclut la réflexion interne du modèle) :

| Type de demande | Jetons en entrée | Jetons en sortie | Coût estimé |
|---|---|---|---|
| Question en discussion | ≈ 3 000 | ≈ 800 | ≈ 0,03 $ |
| Leçon | ≈ 2 000 | ≈ 1 500 | ≈ 0,04 $ |
| Analyse de société | ≈ 2 500 | ≈ 2 500 | ≈ 0,06 $ |
| Quiz | ≈ 3 000 | ≈ 600 | ≈ 0,025 $ |

Ordre de grandeur : **de 0,02 à 0,06 $ par demande**, soit environ **12 à 40 FCFA**, au taux d'environ 600 FCFA pour 1 $. Le taux varie avec le cours euro-dollar.

**Exemple de calcul pour un partenaire** (hypothèses à ajuster) : 500 utilisateurs actifs, 30 demandes chacun par mois, coût moyen de 0,035 $ par demande. Cela donne 15 000 demandes × 0,035 $ ≈ **525 $ par mois**, soit environ 315 000 FCFA.

### Autres coûts

| Poste | Coût indicatif |
|---|---|
| Hébergement Vercel, offre Pro (obligatoire pour un usage commercial) | Environ 20 $ par mois et par membre de l'équipe |
| Upstash Redis | Gratuit au début, puis quelques dollars par mois |
| Nom de domaine | Environ 10 à 15 $ par an |
| Données de marché licenciées (si besoin) | À négocier avec la BRVM ou un fournisseur |

## 3. Fixer les prix

Règle simple : **prix ≥ coût de l'IA × 3**, pour couvrir l'hébergement, le support, le commercial et la marge.

Deux formules possibles :

1. **Par utilisateur actif et par mois** : par exemple de 1 000 à 2 000 FCFA, avec un quota de demandes inclus. Simple à comprendre pour le partenaire.
2. **Forfait par paliers** : par exemple 0 à 200 utilisateurs, 200 à 1 000, plus de 1 000. Plus prévisible pour le budget du partenaire.

Ces montants sont des points de départ. Fixe les vrais prix après un **pilote** de 1 à 3 mois avec un premier partenaire, en mesurant la consommation réelle.

### Calculer le coût réel d'un partenaire

À partir des compteurs de `/api/admin/usage` (voir [PARTENAIRES.md](PARTENAIRES.md#suivre-la-consommation)) :

```
coût en $ ≈ (jetonsEntree × 4 + jetonsCacheLus × 0,20 + jetonsSortie × 20) ÷ 1 000 000
```

Avec un autre modèle, remplace 4, 0,20 et 20 par ses tarifs.

### Les leviers pour réduire les coûts

- **Le quota quotidien** de chaque partenaire (`quotaQuotidien`) : c'est le levier principal, il plafonne la dépense.
- **Le modèle** (`CLAUDE_MODEL`) : par exemple `claude-sonnet-5-5` coûte deux fois moins cher (2 $ en entrée, 10 $ en sortie par million de jetons). La qualité des réponses est à tester avant de basculer. C'est une décision commerciale : on peut aussi proposer deux offres à des prix différents.
- **L'effort par tâche** (dans les routes `src/app/api/*/route.ts`) : un effort plus bas réduit les jetons de sortie.
- **Une limite de dépense** dans la console Anthropic, par sécurité.

## 4. Conformité et risques

**À valider avec un juriste avant le lancement commercial.** Ce qui suit est une liste de points d'attention, pas un avis juridique.

| Sujet | Point d'attention | Ce que fait déjà l'application |
|---|---|---|
| **Conseil en investissement** | Le conseil en investissement est une activité réglementée par l'AMF-UMOA. Il faut rester dans l'éducation financière et l'information. | Les instructions interdisent de recommander l'achat ou la vente d'un titre ; avertissement affiché en permanence. |
| **Données personnelles** | Chaque pays de l'UEMOA a sa loi de protection des données personnelles et son autorité de contrôle. | Aucune donnée personnelle collectée : pas de nom, pas d'e-mail, identifiant anonyme. L'historique reste sur le téléphone de l'utilisateur. |
| **Données de marché** | Les cours appartiennent à la BRVM. | Les cours sont chargés manuellement par l'administrateur (voir [DONNEES_MARCHE.md](DONNEES_MARCHE.md)). |
| **Erreurs de l'IA** | L'IA peut se tromper. | Avertissement, interdiction d'inventer des chiffres, ratios calculés par le code et non par l'IA, renvoi aux sources officielles. |
| **Contrats partenaires** | Préciser les responsabilités, le quota, le prix et la durée. | Un modèle de contrat est à préparer avec un juriste. |

## 5. Feuille de route

| Étape | Contenu | Pour quoi faire |
|---|---|---|
| **v1 (actuelle)** | Discussion, analyse, apprentissage ; multi-partenaires ; quotas ; suivi de consommation | Pilote avec un premier partenaire |
| **v2** | Mise à jour automatique des cours (flux de données licencié) ; tableau de bord administrateur ; suivi de progression des apprenants (utile pour les écoles) | Passer à plusieurs partenaires payants |
| **v3** | Bot WhatsApp ; comparaison de sociétés ; contenu audio pour les utilisateurs moins à l'aise avec l'écrit | Toucher plus d'épargnants |

## 6. Prochaines actions concrètes

1. Mettre le site en ligne sur Vercel et le tester avec le code de démonstration.
2. Faire relire les instructions de l'IA (`src/lib/prompts.ts`) par une personne du métier : analyste, conseiller en SGI ou enseignant en finance.
3. Préparer une présentation d'une page pour les partenaires, à partir de la partie 1.
4. Contacter 2 ou 3 partenaires potentiels pour un pilote gratuit ou à prix réduit.
5. Consulter un juriste sur la partie 4 avant toute facturation.
