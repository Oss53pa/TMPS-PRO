/**
 * CDC F6: Exports PDF/Excel — TAFIRE, LTF, Rapprochement, Consolidé
 */
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { MONTHS } from "../constants";
import { fmt } from "./helpers";
import type { AppStats, FlowRow, TafireData } from "../types";

/* ═══════════════════════════════════════
   EXCEL EXPORTS
   ═══════════════════════════════════════ */

function makeWorkbook() {
  return XLSX.utils.book_new();
}

/** Export consolidé complet (flux + stats) */
export function exportConsolideXLSX(rows: FlowRow[], stats: AppStats, reportCcy: string, exercice: number) {
  const wb = makeWorkbook();

  // Sheet 1: Flux détaillés
  const fluxData = rows.map(r => ({
    Exercice: r.exercice ?? exercice,
    Entité: r.entity,
    Banque: r.bank,
    Section: r.section,
    Type: r.type,
    Catégorie: r.cat,
    Devise: r.ccy,
    Libellé: r.label,
    ...Object.fromEntries(MONTHS.map((m, i) => [m, parseFloat(r.amounts[i]) || 0])),
    Total: r.amounts.reduce((s, v) => s + (parseFloat(v) || 0), 0),
    Statut: r.statut,
    Scénario: r.scenario,
    "Probabilité %": r.probabilite ?? 100,
    Note: r.note,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fluxData), "Flux détaillés");

  // Sheet 2: Consolidé mensuel
  const consData = MONTHS.map((m, mi) => ({
    Mois: m,
    Encaissements: stats.cons.monthly[mi].enc,
    Décaissements: stats.cons.monthly[mi].dec,
    "Flux OPE": stats.cons.monthly[mi].ope,
    "Flux INV": stats.cons.monthly[mi].inv,
    "Flux FIN": stats.cons.monthly[mi].fin,
    BFR: stats.cons.monthly[mi].bfr,
    "Solde cumulé": stats.cons.cum[mi],
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consData), "Consolidé");

  // Sheet 3: Health Score
  const hs = stats.healthScore;
  const scoreData = [
    { Indicateur: "Score Global", Score: hs.global },
    { Indicateur: "Liquidité", Score: hs.liquidite },
    { Indicateur: "BFR", Score: hs.bfr },
    { Indicateur: "Levier", Score: hs.levier },
    { Indicateur: "DSCR", Score: hs.dscr },
    { Indicateur: "Exposition Change", Score: hs.expositionChange },
    { Indicateur: "Nivellement", Score: hs.nivellement },
    { Indicateur: "Conformité", Score: hs.conformite },
    { Indicateur: "Prévision vs Réalisé", Score: hs.previsionVsRealise },
    { Indicateur: "Diversification Bancaire", Score: hs.diversificationBancaire },
    { Indicateur: "Qualité Trésorerie", Score: hs.qualiteTresorerie },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scoreData), "Health Score");

  XLSX.writeFile(wb, `TMS_Export_${exercice}_${reportCcy}.xlsx`);
}

/** Export TAFIRE SYSCOHADA en Excel */
export function exportTafireXLSX(tafire: TafireData, exercice: number) {
  const wb = makeWorkbook();

  // Part I
  const p1 = tafire.partI;
  const part1Data = [
    { Poste: "RESSOURCES DURABLES", Montant: "" },
    { Poste: "CAFG (Capacité d'Autofinancement Globale)", Montant: p1.cafg },
    { Poste: "Dividendes distribués", Montant: p1.dividendesDistribues },
    { Poste: "Cessions d'actifs", Montant: p1.cessionsActifs },
    { Poste: "Augmentation de capitaux", Montant: p1.augmentationCapitaux },
    { Poste: "Augmentation de dettes financières", Montant: p1.augmentationDettes },
    { Poste: "TOTAL RESSOURCES", Montant: p1.totalRessources },
    { Poste: "", Montant: "" },
    { Poste: "EMPLOIS STABLES", Montant: "" },
    { Poste: "Acquisitions d'immobilisations", Montant: p1.acquisitionsImmo },
    { Poste: "Remboursement de capitaux", Montant: p1.remboursementCapitaux },
    { Poste: "Remboursement de dettes financières", Montant: p1.remboursementDettes },
    { Poste: "TOTAL EMPLOIS", Montant: p1.totalEmplois },
    { Poste: "", Montant: "" },
    { Poste: "VARIATION DU FONDS DE ROULEMENT (FR)", Montant: p1.variationFR },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(part1Data), "Partie I - FR");

  // Part II
  const p2 = tafire.partII;
  const part2Data = [
    { Poste: "Variation des actifs circulants", Montant: p2.variationActifsCirculants },
    { Poste: "Variation des passifs circulants", Montant: p2.variationPassifsCirculants },
    { Poste: "Variation BFR d'exploitation", Montant: p2.variationBfrExploitation },
    { Poste: "Variation BFR HAO", Montant: p2.variationBfrHAO },
    { Poste: "", Montant: "" },
    { Poste: "VARIATION DE LA TRÉSORERIE NETTE", Montant: p2.variationTresorerieNette },
    { Poste: "(= Variation FR - Variation BFR)", Montant: "" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(part2Data), "Partie II - BFR");

  // By Entity
  if (Object.keys(tafire.byEntity).length > 0) {
    const entityData: any[] = [];
    Object.entries(tafire.byEntity).forEach(([entity, data]) => {
      entityData.push({ Entité: entity, Poste: "CAFG", Montant: data.partI.cafg });
      entityData.push({ Entité: entity, Poste: "Total Ressources", Montant: data.partI.totalRessources });
      entityData.push({ Entité: entity, Poste: "Total Emplois", Montant: data.partI.totalEmplois });
      entityData.push({ Entité: entity, Poste: "Variation FR", Montant: data.partI.variationFR });
      entityData.push({ Entité: entity, Poste: "Variation Trésorerie Nette", Montant: data.partII.variationTresorerieNette });
      entityData.push({ Entité: "", Poste: "", Montant: "" });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entityData), "Par Entité");
  }

  XLSX.writeFile(wb, `TAFIRE_SYSCOHADA_${exercice}.xlsx`);
}

/* ═══════════════════════════════════════
   PDF EXPORTS
   ═══════════════════════════════════════ */

function addHeader(doc: jsPDF, title: string, exercice: number) {
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Exercice ${exercice} — Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 27);
  doc.text("TMS Pro Africa — SYSCOHADA", 14, 32);
  doc.setTextColor(0);
  return 40;
}

function addTable(doc: jsPDF, y: number, headers: string[], rows: string[][], colWidths: number[]) {
  const lineHeight = 6;
  const pageHeight = doc.internal.pageSize.height - 20;

  // Header
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y - 4, colWidths.reduce((a, b) => a + b, 0), lineHeight, "F");
  let x = 14;
  headers.forEach((h, i) => {
    doc.text(h, x + 1, y);
    x += colWidths[i];
  });
  y += lineHeight;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (const row of rows) {
    if (y > pageHeight) {
      doc.addPage();
      y = 20;
    }
    x = 14;
    row.forEach((cell, i) => {
      doc.text(cell, x + 1, y);
      x += colWidths[i];
    });
    y += lineHeight;
  }
  return y;
}

/** Export TAFIRE en PDF */
export function exportTafirePDF(tafire: TafireData, exercice: number) {
  const doc = new jsPDF();
  let y = addHeader(doc, "TAFIRE — Tableau de Financement (SYSCOHADA)", exercice);

  // Part I
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Partie I — Détermination de la Variation du Fonds de Roulement", 14, y);
  y += 8;

  const p1 = tafire.partI;
  y = addTable(doc, y,
    ["Poste", "Montant (XOF)"],
    [
      ["CAFG", fmt(p1.cafg)],
      ["(-) Dividendes distribués", fmt(p1.dividendesDistribues)],
      ["Cessions d'actifs", fmt(p1.cessionsActifs)],
      ["Augmentation de capitaux", fmt(p1.augmentationCapitaux)],
      ["Augmentation de dettes", fmt(p1.augmentationDettes)],
      ["TOTAL RESSOURCES", fmt(p1.totalRessources)],
      ["", ""],
      ["Acquisitions d'immobilisations", fmt(p1.acquisitionsImmo)],
      ["Remboursement de capitaux", fmt(p1.remboursementCapitaux)],
      ["Remboursement de dettes", fmt(p1.remboursementDettes)],
      ["TOTAL EMPLOIS", fmt(p1.totalEmplois)],
      ["", ""],
      ["VARIATION FR (Ressources - Emplois)", fmt(p1.variationFR)],
    ],
    [120, 60]
  );

  y += 10;
  if (y > 240) { doc.addPage(); y = 20; }

  // Part II
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Partie II — Variation du BFR et Trésorerie Nette", 14, y);
  y += 8;

  const p2 = tafire.partII;
  y = addTable(doc, y,
    ["Poste", "Montant (XOF)"],
    [
      ["Variation actifs circulants", fmt(p2.variationActifsCirculants)],
      ["Variation passifs circulants", fmt(p2.variationPassifsCirculants)],
      ["Variation BFR exploitation", fmt(p2.variationBfrExploitation)],
      ["Variation BFR HAO", fmt(p2.variationBfrHAO)],
      ["", ""],
      ["VARIATION TRÉSORERIE NETTE", fmt(p2.variationTresorerieNette)],
    ],
    [120, 60]
  );

  doc.save(`TAFIRE_${exercice}.pdf`);
}

/** Export consolidé mensuel en PDF */
export function exportConsolidePDF(stats: AppStats, reportCcy: string, exercice: number) {
  const doc = new jsPDF("landscape");
  let y = addHeader(doc, `Prévision de Trésorerie Consolidée — ${reportCcy}`, exercice);

  const headers = ["", ...MONTHS, "Total"];
  const colW = [40, ...Array(12).fill(16), 20];

  const makeRow = (label: string, values: number[]) => [
    label,
    ...values.map(v => fmt(v)),
    fmt(values.reduce((a, b) => a + b, 0)),
  ];

  y = addTable(doc, y, headers,
    [
      makeRow("Encaissements", stats.cons.monthly.map(m => m.enc)),
      makeRow("Décaissements", stats.cons.monthly.map(m => m.dec)),
      makeRow("Flux OPE", stats.cons.monthly.map(m => m.ope)),
      makeRow("Flux INV", stats.cons.monthly.map(m => m.inv)),
      makeRow("Flux FIN", stats.cons.monthly.map(m => m.fin)),
      makeRow("BFR", stats.cons.monthly.map(m => m.bfr)),
      makeRow("Solde cumulé", stats.cons.cum),
    ],
    colW
  );

  // Health Score section
  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Health Score", 14, y);
  y += 8;

  const hs = stats.healthScore;
  y = addTable(doc, y,
    ["Indicateur", "Score / 100"],
    [
      ["Score Global", hs.global.toFixed(0)],
      ["Liquidité", hs.liquidite.toFixed(0)],
      ["BFR", hs.bfr.toFixed(0)],
      ["DSCR", hs.dscr.toFixed(0)],
      ["Exposition Change", hs.expositionChange.toFixed(0)],
      ["Nivellement", hs.nivellement.toFixed(0)],
      ["Conformité", hs.conformite.toFixed(0)],
      ["Diversification Bancaire", hs.diversificationBancaire.toFixed(0)],
    ],
    [60, 30]
  );

  doc.save(`Consolide_${exercice}_${reportCcy}.pdf`);
}
