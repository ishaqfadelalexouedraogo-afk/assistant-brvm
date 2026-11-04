import { describe, expect, it } from "vitest";
import { calculerRatios, formaterRatio, type DonneesSociete } from "./ratios";

// Société fictive : 100 millions d'actions à 15 000 FCFA, résultat net 180 000 M FCFA.
const exemple: DonneesSociete = {
  cours: 15_000,
  nbActions: 100_000_000,
  chiffreAffaires: 1_200_000,
  resultatNet: 180_000,
  capitauxPropres: 900_000,
  dettesFinancieres: 400_000,
  dividendeParAction: 1_100,
  resultatNetPrecedent: 160_000,
};

const valeur = (d: DonneesSociete, cle: string) => calculerRatios(d).find((r) => r.cle === cle)!.valeur;

describe("calculerRatios", () => {
  it("calcule les ratios de base", () => {
    expect(valeur(exemple, "capitalisation")).toBe(1_500_000);
    expect(valeur(exemple, "bnpa")).toBe(1_800);
    expect(valeur(exemple, "per")).toBeCloseTo(8.333, 3);
    expect(valeur(exemple, "pb")).toBeCloseTo(1.667, 3);
    expect(valeur(exemple, "rendement")).toBeCloseTo(0.07333, 4);
    expect(valeur(exemple, "distribution")).toBeCloseTo(0.6111, 4);
    expect(valeur(exemple, "marge")).toBeCloseTo(0.15, 6);
    expect(valeur(exemple, "roe")).toBeCloseTo(0.2, 6);
    expect(valeur(exemple, "gearing")).toBeCloseTo(0.4444, 4);
    expect(valeur(exemple, "croissance")).toBeCloseTo(0.125, 6);
  });

  it("ne calcule pas de PER quand la société est en perte", () => {
    const perte = { ...exemple, resultatNet: -50_000 };
    expect(valeur(perte, "bnpa")).toBe(-500);
    expect(valeur(perte, "per")).toBeNull();
    expect(valeur(perte, "roe")).toBeCloseTo(-0.0556, 4);
  });

  it("renvoie null quand une donnée manque, sans planter", () => {
    const vide: DonneesSociete = {
      cours: null, nbActions: null, chiffreAffaires: null, resultatNet: null,
      capitauxPropres: null, dettesFinancieres: null, dividendeParAction: null, resultatNetPrecedent: null,
    };
    for (const r of calculerRatios(vide)) expect(r.valeur).toBeNull();
  });

  it("refuse les dénominateurs nuls", () => {
    expect(valeur({ ...exemple, nbActions: 0 }, "bnpa")).toBeNull();
    expect(valeur({ ...exemple, capitauxPropres: 0 }, "gearing")).toBeNull();
  });
});

describe("formaterRatio", () => {
  it("formate en français", () => {
    expect(formaterRatio({ valeur: 1_500_000, unite: "MFCFA" })).toBe("1 500 000 M FCFA");
    expect(formaterRatio({ valeur: 8.3333, unite: "x" })).toBe("8,33 x");
    expect(formaterRatio({ valeur: 12.34, unite: "x" })).toBe("12,3 x");
    expect(formaterRatio({ valeur: 0.0733, unite: "%" })).toBe("7,3 %");
    expect(formaterRatio({ valeur: null, unite: "%" })).toBe("–");
  });
});
