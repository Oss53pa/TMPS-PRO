import { ENTITIES, BANKS, MONTHS } from "../constants";
import { p, toXOF } from "./helpers";
import { predictNext3Months, computeAnomaly } from "./predictions";
import { computeTafire } from "./tafire";
import { computeHealthScore } from "./scoring";
import type { FlowRow, AppStats, MonthlyData, BankData, NiveauAlert, ConsolidatedMonthly } from "../types";

type AggregationMode = "previsionnel" | "realise" | "complet";

interface StatsInput {
  rows: FlowRow[];
  fx: Record<string, number>;
  siMap: Record<string, string>;
  minMap: Record<string, string>;
  maxMap: Record<string, string>;
  dso: Record<string, string>;
  dpo: Record<string, string>;
  scMult: number;
  reportCcy: string;
  mode?: AggregationMode;
}

// ══════════════════════════════════════════════════════════════════
// CDC C6 — Probabilité effective par statut
// CDC C7 — Le statut du flux influence les agrégations
// ══════════════════════════════════════════════════════════════════
function effectiveProbability(row: FlowRow): number {
  switch (row.statut) {
    case "realise": return 100;
    case "valide":  return 95;
    case "engage":  return Math.max(50, row.probabilite ?? 100);
    case "prevu":
    default:        return row.probabilite ?? 70;
  }
}

// CDC C7 — Filter rows by aggregation mode
function filterByMode(rows: FlowRow[], mode: AggregationMode): FlowRow[] {
  if (mode === "previsionnel") return rows.filter(r => ["prevu", "engage"].includes(r.statut));
  if (mode === "realise")      return rows.filter(r => ["realise", "valide"].includes(r.statut));
  return rows; // complet = all
}

export function computeStats(input: StatsInput): AppStats {
  const { rows: allRows, fx, siMap, minMap, maxMap, dso, dpo, scMult, reportCcy, mode = "complet" } = input;
  const rows = filterByMode(allRows, mode);
  const toR = (v: number, ccy: string) => toXOF(v, ccy, fx) * (fx[reportCcy] ? 1 / fx[reportCcy] : 1);

  // Per entity per month
  const byEntity: Record<string, { monthly: MonthlyData[] }> = {};
  ENTITIES.forEach(e => {
    byEntity[e.id] = {
      monthly: Array(12).fill(0).map(() => ({
        enc: 0, dec: 0, bfr: 0, pool: 0,
        sections: { ope: { enc: 0, dec: 0 }, inv: { enc: 0, dec: 0 }, fin: { enc: 0, dec: 0 } },
      })),
    };
  });

  rows.forEach(row => {
    const ent = byEntity[row.entity];
    if (!ent) return;
    const ccyRow = row.ccy || "XOF";
    // C6: Apply probability weighting
    const probaFactor = effectiveProbability(row) / 100;

    row.amounts.forEach((v, mi) => {
      const raw = p(v) * scMult * probaFactor;
      const val = toR(raw, ccyRow);
      if (row.cat === "enc") {
        ent.monthly[mi].enc += val;
        if (ent.monthly[mi].sections[row.section]) ent.monthly[mi].sections[row.section].enc += val;
      } else if (row.cat === "dec") {
        ent.monthly[mi].dec += val;
        if (ent.monthly[mi].sections[row.section]) ent.monthly[mi].sections[row.section].dec += val;
      } else if (row.cat === "bfr") {
        ent.monthly[mi].bfr += val;
      } else if (row.cat === "pool") {
        ent.monthly[mi].pool += val;
      }
    });
  });

  // Per bank
  const byBank: Record<string, BankData> = {};
  BANKS.forEach(b => {
    byBank[b] = { si: toR(p(siMap[b]), "XOF"), monthly: Array(12).fill(0).map(() => ({ enc: 0, dec: 0 })), cum: [] };
  });
  rows.forEach(row => {
    const bk = byBank[row.bank];
    if (!bk) return;
    const ccyRow = row.ccy || "XOF";
    // C6: Apply probability weighting
    const probaFactor = effectiveProbability(row) / 100;

    row.amounts.forEach((v, mi) => {
      const val = toR(p(v) * scMult * probaFactor, ccyRow);
      if (row.cat === "enc") bk.monthly[mi].enc += val;
      else if (row.cat === "dec") bk.monthly[mi].dec += val;
    });
  });
  BANKS.forEach(b => {
    let run = byBank[b].si;
    byBank[b].cum = MONTHS.map((_, mi) => {
      run += byBank[b].monthly[mi].enc - byBank[b].monthly[mi].dec;
      return run;
    });
  });

  // Consolidated
  const cons: { monthly: ConsolidatedMonthly[]; cum: number[] } = {
    monthly: MONTHS.map((_, mi) => ({
      enc: ENTITIES.reduce((s, e) => s + byEntity[e.id].monthly[mi].enc, 0),
      dec: ENTITIES.reduce((s, e) => s + byEntity[e.id].monthly[mi].dec, 0),
      bfr: ENTITIES.reduce((s, e) => s + byEntity[e.id].monthly[mi].bfr, 0),
      ope: ENTITIES.reduce((s, e) => s + (byEntity[e.id].monthly[mi].sections.ope.enc - byEntity[e.id].monthly[mi].sections.ope.dec), 0),
      inv: ENTITIES.reduce((s, e) => s + (byEntity[e.id].monthly[mi].sections.inv.enc - byEntity[e.id].monthly[mi].sections.inv.dec), 0),
      fin: ENTITIES.reduce((s, e) => s + (byEntity[e.id].monthly[mi].sections.fin.enc - byEntity[e.id].monthly[mi].sections.fin.dec), 0),
    })),
    cum: [],
  };
  let run = BANKS.reduce((s, b) => s + byBank[b].si, 0);
  cons.cum = MONTHS.map((_, mi) => {
    run += cons.monthly[mi].enc - cons.monthly[mi].dec + cons.monthly[mi].bfr;
    return run;
  });

  // BFR KPIs (use raw amounts, not probability-weighted, for DSO/DPO calculation)
  const bfrKpi: Record<string, { dso: number; dpo: number; creances: number; dettes: number; bfrNet: number }> = {};
  ENTITIES.forEach(e => {
    const revAnn = rows
      .filter(r => r.entity === e.id && r.cat === "enc")
      .reduce((s, r) => {
        const ccyRow = r.ccy || "XOF";
        return s + r.amounts.reduce((a: number, v: string) => a + toR(p(v), ccyRow), 0);
      }, 0);
    const expAnn = rows
      .filter(r => r.entity === e.id && r.cat === "dec")
      .reduce((s, r) => {
        const ccyRow = r.ccy || "XOF";
        return s + r.amounts.reduce((a: number, v: string) => a + toR(p(v), ccyRow), 0);
      }, 0);
    const dsoVal = p(dso[e.id]);
    const dpoVal = p(dpo[e.id]);
    bfrKpi[e.id] = {
      dso: dsoVal,
      dpo: dpoVal,
      creances: (revAnn / 365) * dsoVal,
      dettes: (expAnn / 365) * dpoVal,
      bfrNet: (revAnn / 365) * dsoVal - (expAnn / 365) * dpoVal,
    };
  });

  // Predictions (use raw amounts, not probability-weighted)
  const predRows = rows.map(r => ({
    ...r,
    pred: predictNext3Months(r.amounts),
    anomalies: computeAnomaly(r.amounts),
  }));
  const consPred = [0, 1, 2].map(i =>
    predRows.reduce((s, r) => s + toR(r.pred[i] * (r.cat === "dec" ? -1 : 1), r.ccy || "XOF"), 0)
  );

  // Nivellement alerts
  const niveauAlerts: NiveauAlert[] = [];
  BANKS.forEach(b => {
    const minV = toR(p(minMap[b]), "XOF");
    const maxV = toR(p(maxMap[b]), "XOF");
    byBank[b].cum.forEach((v, mi) => {
      if (maxV > 0 && v > maxV)
        niveauAlerts.push({ bank: b, mi, month: MONTHS[mi], type: "excédent", val: v, seuil: maxV, ecart: v - maxV });
      if (minV > 0 && v < minV)
        niveauAlerts.push({ bank: b, mi, month: MONTHS[mi], type: "déficit", val: v, seuil: minV, ecart: minV - v });
    });
  });

  // TAFIRE
  const tafire = computeTafire({ rows, fx, scMult, reportCcy });

  // Build partial stats for scoring
  const partialStats: AppStats = {
    byEntity, byBank, cons, bfrKpi, predRows, consPred, niveauAlerts,
    tafire,
    healthScore: { global: 0, liquidite: 0, bfr: 0, levier: 0, dscr: 0, expositionChange: 0, nivellement: 0, conformite: 0, previsionVsRealise: 0, diversificationBancaire: 0, qualiteTresorerie: 0 },
  };

  // C1: Pass rows to scoring for real calculations
  const healthScore = computeHealthScore(partialStats, rows);

  return { byEntity, byBank, cons, bfrKpi, predRows, consPred, niveauAlerts, tafire, healthScore };
}
