# Donner les cours du jour à l'IA

L'IA (Claude) **n'a pas accès à Internet ni aux cours en direct**. Ses connaissances générales peuvent dater. Pour qu'elle raisonne sur des chiffres à jour, l'administrateur dépose les cours dans le fichier `data/marche/cours.csv`.

Quand ce fichier contient des cours :

- l'IA les utilise dans ses réponses et cite leur date ;
- dans l'onglet « Analyser une société », l'utilisateur peut choisir une société cotée pour préremplir son cours.

Quand le fichier est vide (cas par défaut), l'IA indique qu'elle ne connaît aucun cours actuel et renvoie vers brvm.org. Elle a pour consigne de ne jamais inventer de cours.

## Format du fichier

Fichier texte, séparateur **point-virgule**, encodage UTF-8, avec cette première ligne exacte :

```
date;symbole;societe;pays;secteur;cours;variation_pct;volume
```

Puis une ligne par société. Exemple **fictif** :

```
date;symbole;societe;pays;secteur;cours;variation_pct;volume
2026-11-03;ABC;Société ABC (fictive);Sénégal;Télécommunications;15 200;1,3;900
2026-11-03;XYZ;Banque XYZ (fictive);Côte d'Ivoire;Banque / finance;8500;-0,4;1250
```

| Colonne | Obligatoire | Format |
|---|---|---|
| `date` | oui | `AAAA-MM-JJ` (ex. `2026-11-03`) |
| `symbole` | oui | Code de la valeur à la BRVM |
| `societe` | non | Nom de la société |
| `pays` | non | Pays du siège (utilise les noms : Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo) |
| `secteur` | non | Secteur d'activité |
| `cours` | oui | Cours de clôture en FCFA. `15 200`, `15200` et `15200,50` sont acceptés |
| `variation_pct` | non | Variation du jour en %, ex. `1,3` ou `-0,4` |
| `volume` | non | Nombre de titres échangés |

Si le même symbole apparaît à plusieurs dates, seule la plus récente est utilisée. Les lignes invalides sont ignorées et signalées dans les logs.

## Le remplir depuis Excel

1. Recopie les cours depuis le bulletin officiel de la cote publié par la BRVM (brvm.org) dans un tableau Excel avec les 8 colonnes ci-dessus.
2. **Fichier → Enregistrer sous → CSV UTF-8 (délimité par des points-virgules)**. Sur un Excel configuré en français, le séparateur est déjà le point-virgule.
3. Remplace `data/marche/cours.csv` par ce fichier, puis envoie-le sur GitHub :

   ```bash
   git add data/marche/cours.csv
   ```

   ```bash
   git commit -m "Cours BRVM du 03/11/2026"
   ```

   ```bash
   git push
   ```

Vercel met le site à jour en 1 à 2 minutes.

## Droits sur les données

Les données de marché appartiennent à la BRVM. Avant un lancement commercial, vérifie auprès d'elle les conditions de réutilisation des cours, ou passe par un fournisseur de données licencié. C'est aussi la voie pour automatiser la mise à jour (voir la feuille de route dans [VIABILITE.md](VIABILITE.md)).
