import { describe, expect, it } from "vitest";
import { analyserCsv, contexteMarche, dernieresCotations } from "./marche";

// Cotations fictives, pour les tests uniquement.
const CSV = `date;symbole;societe;pays;secteur;cours;variation_pct;volume
2026-11-02;ABC;Société ABC (fictive);Sénégal;Télécoms;15 000;1,5;1200
2026-11-03;ABC;Société ABC (fictive);Sénégal;Télécoms;15 200;1,33;900
2026-11-03;XYZ;Banque XYZ (fictive);Côte d'Ivoire;Banque;8500;-0,4;
pas-une-date;BAD;Ligne invalide;;;100;;`;

describe("analyserCsv", () => {
  it("lit les nombres au format français et signale les lignes invalides", () => {
    const { cotations, erreurs } = analyserCsv(CSV);
    expect(cotations).toHaveLength(3);
    expect(cotations[0].cours).toBe(15000);
    expect(cotations[0].variationPct).toBe(1.5);
    expect(cotations[2].volume).toBeNull();
    expect(erreurs).toHaveLength(1);
  });

  it("rejette un fichier sans les bonnes colonnes", () => {
    expect(analyserCsv("a;b;c\n1;2;3").erreurs[0]).toMatch(/Colonnes manquantes/);
  });
});

describe("dernieresCotations / contexteMarche", () => {
  it("garde la cote la plus récente par symbole", () => {
    const d = dernieresCotations(analyserCsv(CSV).cotations);
    expect(d.map((c) => c.symbole)).toEqual(["ABC", "XYZ"]);
    expect(d[0].cours).toBe(15200);
  });

  it("indique la date et interdit d'inventer quand rien n'est chargé", () => {
    expect(contexteMarche([])).toMatch(/aucune cote/);
    const texte = contexteMarche(dernieresCotations(analyserCsv(CSV).cotations));
    expect(texte).toMatch(/2026-11-03/);
    expect(texte).toMatch(/ABC \| Société ABC/);
  });
});
