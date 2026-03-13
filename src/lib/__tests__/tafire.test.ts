import { describe, it, expect } from "vitest";
import { computeTafire, classifyTafire } from "../tafire";
import type { FlowRow } from "../../types";
import { uid } from "../helpers";

const makeRow = (overrides: Partial<FlowRow>): FlowRow => ({
  id: uid(), entity: "CI", bank: "SGBCI", section: "ope", type: "Loyers & revenus locatifs",
  cat: "enc", ccy: "XOF", label: "", amounts: Array(12).fill("100000"),
  amountsReel: Array(12).fill(""), note: "", scenario: "base", statut: "prevu",
  recurrence: "mensuel", probabilite: 100,
  ...overrides,
});

describe("classifyTafire()", () => {
  it("classifies operational income as cafg_enc", () => {
    const row = makeRow({ section: "ope", cat: "enc" });
    expect(classifyTafire(row)).toBe("cafg_enc");
  });

  it("classifies operational expense as cafg_dec", () => {
    const row = makeRow({ section: "ope", cat: "dec", type: "Salaires & charges sociales" });
    expect(classifyTafire(row)).toBe("cafg_dec");
  });

  it("classifies investment income as cessions_actifs", () => {
    const row = makeRow({ section: "inv", cat: "enc", type: "Cessions d'actifs immobiliers" });
    expect(classifyTafire(row)).toBe("cessions_actifs");
  });

  it("classifies investment expense as acquisitions_immo", () => {
    const row = makeRow({ section: "inv", cat: "dec", type: "CAPEX Gros œuvre / structure" });
    expect(classifyTafire(row)).toBe("acquisitions_immo");
  });

  it("classifies capital increase as augmentation_capitaux", () => {
    const row = makeRow({ section: "fin", cat: "enc", type: "Augmentation de capital" });
    expect(classifyTafire(row)).toBe("augmentation_capitaux");
  });

  it("classifies debt as augmentation_dettes", () => {
    const row = makeRow({ section: "fin", cat: "enc", type: "Emprunt bancaire LT reçu" });
    expect(classifyTafire(row)).toBe("augmentation_dettes");
  });

  it("classifies dividend distribution as dividendes_distribues", () => {
    const row = makeRow({ section: "fin", cat: "dec", type: "Dividendes versés (résidents)" });
    expect(classifyTafire(row)).toBe("dividendes_distribues");
  });

  it("classifies debt repayment as remboursement_dettes", () => {
    const row = makeRow({ section: "fin", cat: "dec", type: "Remboursement emprunt — capital" });
    expect(classifyTafire(row)).toBe("remboursement_dettes");
  });

  it("classifies cash pooling as pool", () => {
    const row = makeRow({ cat: "pool", type: "Cash pooling — apport" });
    expect(classifyTafire(row)).toBe("pool");
  });

  it("classifies BFR DSO as bfr_actif", () => {
    const row = makeRow({ cat: "bfr", type: "Variation BFR clients (DSO)" });
    expect(classifyTafire(row)).toBe("bfr_actif");
  });

  it("classifies BFR DPO as bfr_passif", () => {
    const row = makeRow({ cat: "bfr", type: "Variation BFR fournisseurs (DPO)" });
    expect(classifyTafire(row)).toBe("bfr_passif");
  });
});

describe("computeTafire()", () => {
  const fx = { XOF: 1, EUR: 655.957, USD: 610 };

  it("returns balanced Ressources = Emplois when only CAFG", () => {
    const rows = [
      makeRow({ section: "ope", cat: "enc", amounts: Array(12).fill("1000000") }),
      makeRow({ section: "ope", cat: "dec", amounts: Array(12).fill("600000") }),
    ];
    const result = computeTafire({ rows, fx, scMult: 1, reportCcy: "XOF" });
    // CAFG = 12M enc - 7.2M dec = 4.8M
    expect(result.partI.cafg).toBe(12000000 - 7200000);
    // With only CAFG, totalRessources = CAFG, totalEmplois = 0, variationFR = CAFG
    expect(result.partI.variationFR).toBe(result.partI.totalRessources - result.partI.totalEmplois);
  });

  it("computes per-entity TAFIRE", () => {
    const rows = [
      makeRow({ entity: "CI", section: "ope", cat: "enc", amounts: Array(12).fill("500000") }),
      makeRow({ entity: "SN", section: "ope", cat: "enc", amounts: Array(12).fill("300000") }),
    ];
    const result = computeTafire({ rows, fx, scMult: 1, reportCcy: "XOF" });
    expect(result.byEntity["CI"]).toBeDefined();
    expect(result.byEntity["SN"]).toBeDefined();
    expect(result.byEntity["CI"].partI.cafg).toBe(6000000);
    expect(result.byEntity["SN"].partI.cafg).toBe(3600000);
  });

  it("Part II: variationTresorerieNette = FR - BFR", () => {
    const rows = [
      makeRow({ section: "ope", cat: "enc", amounts: Array(12).fill("1000000") }),
      makeRow({ cat: "bfr", type: "Variation BFR clients (DSO)", amounts: Array(12).fill("100000") }),
      makeRow({ cat: "bfr", type: "Variation BFR fournisseurs (DPO)", amounts: Array(12).fill("50000") }),
    ];
    const result = computeTafire({ rows, fx, scMult: 1, reportCcy: "XOF" });
    const expectedBfr = 1200000 - 600000; // actif - passif
    expect(result.partII.variationBfrExploitation).toBe(expectedBfr);
    expect(result.partII.variationTresorerieNette).toBe(
      result.partI.variationFR - result.partII.variationBfrExploitation
    );
  });

  it("handles currency conversion (EUR → XOF)", () => {
    const rows = [
      makeRow({ section: "ope", cat: "enc", ccy: "EUR", amounts: Array(12).fill("1000") }),
    ];
    const result = computeTafire({ rows, fx, scMult: 1, reportCcy: "XOF" });
    expect(result.partI.cafg).toBeCloseTo(12 * 1000 * 655.957, -2);
  });

  it("excludes pool flows from TAFIRE", () => {
    const rows = [
      makeRow({ section: "ope", cat: "enc", amounts: Array(12).fill("1000000") }),
      makeRow({ cat: "pool", type: "Cash pooling — apport", amounts: Array(12).fill("500000") }),
    ];
    const result = computeTafire({ rows, fx, scMult: 1, reportCcy: "XOF" });
    // Pool should not affect CAFG
    expect(result.partI.cafg).toBe(12000000);
  });
});
