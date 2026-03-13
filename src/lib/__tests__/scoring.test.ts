import { describe, it, expect } from "vitest";
import { computeHealthScore } from "../scoring";
import type { AppStats, HealthScore, FlowRow } from "../../types";
import { uid } from "../helpers";

const makeEmptyStats = (): AppStats => ({
  byEntity: {},
  byBank: {},
  cons: {
    monthly: Array(12).fill(0).map(() => ({ enc: 0, dec: 0, bfr: 0, ope: 0, inv: 0, fin: 0 })),
    cum: Array(12).fill(0),
  },
  bfrKpi: {},
  predRows: [],
  consPred: [0, 0, 0],
  niveauAlerts: [],
  tafire: {
    partI: { cafg: 0, dividendesDistribues: 0, cessionsActifs: 0, augmentationCapitaux: 0, augmentationDettes: 0, totalRessources: 0, acquisitionsImmo: 0, remboursementCapitaux: 0, remboursementDettes: 0, totalEmplois: 0, variationFR: 0 },
    partII: { variationActifsCirculants: 0, variationPassifsCirculants: 0, variationBfrExploitation: 0, variationBfrHAO: 0, variationTresorerieNette: 0 },
    byEntity: {},
  },
  healthScore: { global: 0, liquidite: 0, bfr: 0, levier: 0, dscr: 0, expositionChange: 0, nivellement: 0, conformite: 0, previsionVsRealise: 0, diversificationBancaire: 0, qualiteTresorerie: 0 },
});

const makeRow = (overrides: Partial<FlowRow>): FlowRow => ({
  id: uid(), entity: "CI", bank: "SGBCI", section: "ope", type: "Test",
  cat: "enc", ccy: "XOF", label: "", amounts: Array(12).fill("100000"),
  amountsReel: Array(12).fill(""), note: "", scenario: "base", statut: "prevu",
  recurrence: "mensuel", probabilite: 100,
  ...overrides,
});

describe("computeHealthScore()", () => {
  it("returns score between 0 and 100", () => {
    const stats = makeEmptyStats();
    const result = computeHealthScore(stats, []);
    expect(result.global).toBeGreaterThanOrEqual(0);
    expect(result.global).toBeLessThanOrEqual(100);
  });

  it("all 10 components are present", () => {
    const result = computeHealthScore(makeEmptyStats(), []);
    const keys: (keyof HealthScore)[] = [
      "global", "liquidite", "bfr", "levier", "dscr",
      "expositionChange", "nivellement", "conformite",
      "previsionVsRealise", "diversificationBancaire", "qualiteTresorerie",
    ];
    keys.forEach(k => expect(result[k]).toBeDefined());
  });

  it("no hardcoded values — all computed from data", () => {
    const stats = makeEmptyStats();
    // With enc and dec data
    stats.cons.monthly.forEach(m => { m.enc = 10000000; m.dec = 8000000; });
    stats.cons.cum = stats.cons.monthly.map((_, i) =>
      stats.cons.monthly.slice(0, i + 1).reduce((s, m) => s + m.enc - m.dec, 1000000)
    );

    const rows = [
      makeRow({ cat: "enc", ccy: "XOF", compteComptable: "706", statut: "realise" }),
      makeRow({ cat: "dec", ccy: "XOF", compteComptable: "661", statut: "realise" }),
    ];

    const result = computeHealthScore(stats, rows);
    // With actual data, scores should be non-trivial
    expect(result.liquidite).toBeGreaterThan(0);
    expect(result.expositionChange).toBeGreaterThan(0);
    expect(result.conformite).toBe(100); // Both rows have compteComptable
  });

  it("conformite = 100% when all flows have SYSCOHADA account", () => {
    const rows = [
      makeRow({ compteComptable: "706", statut: "realise" }),
      makeRow({ compteComptable: "661", statut: "valide" }),
    ];
    const result = computeHealthScore(makeEmptyStats(), rows);
    expect(result.conformite).toBe(100);
  });

  it("conformite = 0% when no flows have SYSCOHADA account", () => {
    const rows = [
      makeRow({ compteComptable: "", statut: "realise" }),
      makeRow({ compteComptable: undefined, statut: "valide" }),
    ];
    const result = computeHealthScore(makeEmptyStats(), rows);
    expect(result.conformite).toBe(0);
  });

  it("expositionChange = 100+ when all flows in XOF", () => {
    const rows = [
      makeRow({ ccy: "XOF" }),
      makeRow({ ccy: "XOF" }),
    ];
    const result = computeHealthScore(makeEmptyStats(), rows);
    expect(result.expositionChange).toBe(100); // 100% local → clamped at 100
  });

  it("nivellement = 100 when no alerts", () => {
    const stats = makeEmptyStats();
    stats.niveauAlerts = [];
    const result = computeHealthScore(stats, []);
    expect(result.nivellement).toBe(100);
  });

  it("degraded score when all indicators are poor", () => {
    const stats = makeEmptyStats();
    stats.cons.monthly.forEach(m => { m.dec = 10000000; m.enc = 1000000; });
    stats.cons.cum = Array(12).fill(-50000000);
    stats.niveauAlerts = Array(50).fill({
      bank: "SGBCI", mi: 0, month: "Jan", type: "déficit", val: 0, seuil: 1, ecart: 1,
    });

    const rows = [makeRow({ ccy: "USD", compteComptable: "" })];
    const result = computeHealthScore(stats, rows);
    expect(result.global).toBeLessThan(50);
  });
});
