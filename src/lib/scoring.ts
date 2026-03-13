import { ENTITIES, BANKS } from "../constants";
import { p } from "./helpers";
import type { FlowRow, AppStats, HealthScore } from "../types";

// ══════════════════════════════════════════════════════════════════
// CDC C1 — Health Score : toutes les valeurs calculées depuis les
// données réelles. Aucune valeur hardcodée.
// ══════════════════════════════════════════════════════════════════

/**
 * Determine the current month index (0-11) for time-aware metrics.
 * Uses actual date so backtesting windows are accurate.
 */
function currentMonthIndex(): number {
  return new Date().getMonth(); // 0 = Jan
}

export function computeHealthScore(stats: AppStats, rows: FlowRow[] = []): HealthScore {
  const scores: Record<string, number> = {};

  // ──────────────────────────────────────────
  // 1. Liquidité — couverture en jours (15%)
  //    Cible: > 90 jours = 100
  // ──────────────────────────────────────────
  const totalDec = stats.cons.monthly.reduce((s, m) => s + m.dec, 0);
  const chargesFixesJour = totalDec / 365;
  const soldeFinal = stats.cons.cum[11] || 0;
  const couvertureJours = chargesFixesJour > 0 ? soldeFinal / chargesFixesJour : 0;
  scores.liquidite = clamp((couvertureJours / 90) * 100);

  // ──────────────────────────────────────────
  // 2. BFR — DSO/DPO vs benchmarks (12%)
  //    DSO < 45 et DPO > 60 = 100
  // ──────────────────────────────────────────
  const entityIds = ENTITIES.map(e => e.id).filter(id => stats.bfrKpi[id]);
  const avgDso = entityIds.length > 0
    ? entityIds.reduce((s, id) => s + (stats.bfrKpi[id]?.dso || 0), 0) / entityIds.length
    : 45;
  const avgDpo = entityIds.length > 0
    ? entityIds.reduce((s, id) => s + (stats.bfrKpi[id]?.dpo || 0), 0) / entityIds.length
    : 60;
  const dsoScore = clamp((1 - (avgDso - 45) / 45) * 100);
  const dpoScore = clamp((avgDpo / 60) * 100);
  scores.bfr = (dsoScore + dpoScore) / 2;

  // ──────────────────────────────────────────
  // 3. Levier — dette / flux annuel (10%)
  //    Cible: < 3.5x = 100
  // ──────────────────────────────────────────
  const totalEnc = stats.cons.monthly.reduce((s, m) => s + m.enc, 0);
  const fluxNet = totalEnc - totalDec;
  const levier = fluxNet !== 0 ? Math.abs(soldeFinal) / Math.abs(fluxNet) : 0;
  scores.levier = clamp((1 - levier / 3.5) * 100);

  // ──────────────────────────────────────────
  // 4. DSCR — enc / dec (10%)
  //    Cible: > 1.2 = 100
  // ──────────────────────────────────────────
  const dscr = totalDec > 0 ? totalEnc / totalDec : 0;
  scores.dscr = clamp((dscr / 1.2) * 100);

  // ──────────────────────────────────────────
  // 5. Exposition de change (10%) — CDC C1
  //    % flux en devise locale / total
  //    Cible: > 80% local = 100
  // ──────────────────────────────────────────
  if (rows.length > 0) {
    let totalFlows = 0;
    let localFlows = 0;
    rows.forEach(r => {
      const rowTotal = r.amounts.reduce((a, v) => a + Math.abs(p(v)), 0);
      totalFlows += rowTotal;
      // XOF and XAF are local CFA currencies
      if (r.ccy === "XOF" || r.ccy === "XAF" || !r.ccy) {
        localFlows += rowTotal;
      }
    });
    const localPct = totalFlows > 0 ? (localFlows / totalFlows) * 100 : 100;
    // Scale: 80%+ local = 100, 0% local = 0
    scores.expositionChange = clamp((localPct / 80) * 100);
  } else {
    scores.expositionChange = 50;
  }

  // ──────────────────────────────────────────
  // 6. Nivellement — alertes / total (8%)
  //    0 alertes = 100
  // ──────────────────────────────────────────
  const totalComptes = BANKS.length * 12;
  const alertRatio = totalComptes > 0 ? stats.niveauAlerts.length / totalComptes : 0;
  scores.nivellement = clamp((1 - alertRatio) * 100);

  // ──────────────────────────────────────────
  // 7. Conformité comptable (10%) — CDC C1
  //    % flux avec compte SYSCOHADA assigné
  // ──────────────────────────────────────────
  if (rows.length > 0) {
    // Prioritize non-prevu rows (realise/valide/engage)
    const qualifiedRows = rows.filter(r => r.statut !== "prevu");
    const targetRows = qualifiedRows.length > 0 ? qualifiedRows : rows;
    const withAccount = targetRows.filter(r =>
      r.compteComptable && r.compteComptable.trim().length >= 2
    ).length;
    scores.conformite = clamp((withAccount / targetRows.length) * 100);
  } else {
    scores.conformite = 0;
  }

  // ──────────────────────────────────────────
  // 8. Prévision vs Réalisé (8%) — CDC C1
  //    100 - MAPE sur les 3 derniers mois
  // ──────────────────────────────────────────
  if (rows.length > 0) {
    const cm = currentMonthIndex();
    const recentMonths = [cm - 2, cm - 1, cm].filter(m => m >= 0 && m < 12);

    let mapeSum = 0;
    let mapeCount = 0;

    rows.forEach(r => {
      const amtsReel = r.amountsReel || [];
      recentMonths.forEach(mi => {
        const plan = p(r.amounts[mi]);
        const reel = p(amtsReel[mi]);
        if (plan > 0 && reel > 0) {
          mapeSum += Math.abs(reel - plan) / plan;
          mapeCount++;
        }
      });
    });

    if (mapeCount > 0) {
      const mape = (mapeSum / mapeCount) * 100;
      scores.previsionVsRealise = clamp(100 - mape);
    } else {
      // No actual data to compare → neutral score
      scores.previsionVsRealise = 50;
    }
  } else {
    scores.previsionVsRealise = 50;
  }

  // ──────────────────────────────────────────
  // 9. Diversification bancaire (7%)
  //    Herfindahl Index → inverse
  // ──────────────────────────────────────────
  const bankTotals = BANKS.map(b => {
    const bk = stats.byBank[b];
    return bk ? bk.monthly.reduce((s, m) => s + m.enc + m.dec, 0) : 0;
  });
  const totalBankVol = bankTotals.reduce((s, v) => s + v, 0);
  if (totalBankVol > 0) {
    const hhi = bankTotals.reduce((s, v) => s + (v / totalBankVol) ** 2, 0);
    scores.diversificationBancaire = clamp((1 - hhi) * 100 * 1.5);
  } else {
    scores.diversificationBancaire = 0;
  }

  // ──────────────────────────────────────────
  // 10. Qualité trésorerie (10%)
  //     Flux net positif = bon
  // ──────────────────────────────────────────
  if (totalEnc > 0) {
    scores.qualiteTresorerie = fluxNet > 0
      ? clamp(60 + (fluxNet / totalEnc) * 100)
      : clamp(60 + (fluxNet / (totalDec || 1)) * 100);
  } else {
    scores.qualiteTresorerie = 0;
  }

  // ──────────────────────────────────────────
  // GLOBAL = Moyenne pondérée
  // ──────────────────────────────────────────
  const weights = [15, 12, 10, 10, 10, 8, 10, 8, 7, 10]; // total = 100
  const vals = [
    scores.liquidite, scores.bfr, scores.levier, scores.dscr,
    scores.expositionChange, scores.nivellement, scores.conformite,
    scores.previsionVsRealise, scores.diversificationBancaire, scores.qualiteTresorerie,
  ];
  const global = vals.reduce((s, v, i) => s + v * weights[i], 0) / weights.reduce((s, w) => s + w, 0);

  return {
    global: Math.round(global),
    liquidite: Math.round(scores.liquidite),
    bfr: Math.round(scores.bfr),
    levier: Math.round(scores.levier),
    dscr: Math.round(scores.dscr),
    expositionChange: Math.round(scores.expositionChange),
    nivellement: Math.round(scores.nivellement),
    conformite: Math.round(scores.conformite),
    previsionVsRealise: Math.round(scores.previsionVsRealise),
    diversificationBancaire: Math.round(scores.diversificationBancaire),
    qualiteTresorerie: Math.round(scores.qualiteTresorerie),
  };
}

/** Clamp a score between 0 and 100 */
function clamp(v: number): number {
  return Math.min(100, Math.max(0, v));
}
