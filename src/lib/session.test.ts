import { describe, expect, it } from "vitest";
import { creerJeton, DUREE_SESSION_S, lireJeton } from "./session";
import { lireCodes, partenaireParCode } from "./partenaires";

const CLE = "x".repeat(40);

describe("session signée", () => {
  it("relit un jeton valide", () => {
    const s = lireJeton(creerJeton("demo", CLE), CLE);
    expect(s?.p).toBe("demo");
    expect(s?.u).toMatch(/[0-9a-f-]{36}/);
  });

  it("rejette un jeton modifié ou signé avec une autre clé", () => {
    const jeton = creerJeton("demo", CLE);
    const [charge, sig] = jeton.split(".");
    const falsifie = Buffer.from(JSON.stringify({ p: "autre", u: "x", exp: 9e9 })).toString("base64url");
    expect(lireJeton(`${falsifie}.${sig}`, CLE)).toBeNull();
    expect(lireJeton(`${charge}.${sig}`, "y".repeat(40))).toBeNull();
    expect(lireJeton("n'importe-quoi", CLE)).toBeNull();
  });

  it("rejette un jeton expiré", () => {
    const jeton = creerJeton("demo", CLE, 0);
    expect(lireJeton(jeton, CLE, (DUREE_SESSION_S + 10) * 1000)).toBeNull();
  });
});

describe("codes d'accès", () => {
  it("lit la variable ACCESS_CODES", () => {
    expect(lireCodes(" demo:DEMO-2026 , sgi:AB:C ,invalide,")).toEqual([
      { id: "demo", code: "DEMO-2026" },
      { id: "sgi", code: "AB:C" },
    ]);
  });

  it("trouve le partenaire sans tenir compte de la casse", () => {
    expect(partenaireParCode("demo-2026", "demo:DEMO-2026")?.id).toBe("demo");
    expect(partenaireParCode("mauvais", "demo:DEMO-2026")).toBeNull();
    expect(partenaireParCode("", "demo:DEMO-2026")).toBeNull();
    // Un code qui pointe vers un partenaire absent de la configuration est refusé.
    expect(partenaireParCode("ZZZ", "inconnu:ZZZ")).toBeNull();
  });
});
