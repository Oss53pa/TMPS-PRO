import { ENTITIES } from "../constants";
import { p, toXOF } from "./helpers";
import type { FlowRow, TafireData, TafirePartI, TafirePartII } from "../types";

// ══════════════════════════════════════════════════════════════════
// CDC C7 — Mapping TAFIRE EXPLICITE par type de flux
// Remplace le filtrage fragile par string.includes()
// ══════════════════════════════════════════════════════════════════

type TafireCategory =
  | "cafg_enc" | "cafg_dec"
  | "cessions_actifs" | "acquisitions_immo"
  | "augmentation_capitaux" | "augmentation_dettes"
  | "remboursement_dettes" | "dividendes_distribues"
  | "bfr_actif" | "bfr_passif"
  | "pool" | "hors_tafire";

// ── Fin / Enc sub-categories ──
const FIN_ENC_CAPITAL = new Set([
  "Apport en capital",
  "Augmentation de capital",
  "Compte courant associé — apport",
]);

const FIN_ENC_DETTES = new Set([
  "Emprunt bancaire LT reçu",
  "Emprunt obligataire (COSUMAF)",
  "Ligne trésorerie CT (tirage)",
]);

// ── Fin / Dec sub-categories ──
const FIN_DEC_DIVIDENDES = new Set([
  "Dividendes versés (résidents)",
  "Dividendes versés (non-résidents)",
]);

const FIN_DEC_REMBOURSEMENT = new Set([
  "Remboursement emprunt — capital",
  "Remboursement emprunt — intérêts",
  "Remboursement crédit-bail",
  "Remboursement ligne CT",
]);

// ── Inv / Enc sub-categories ──
const INV_ENC_CESSIONS = new Set([
  "Cessions d'actifs immobiliers",
  "Cessions de participations",
  "Remboursements prêts intra-groupe",
  "Subventions d'investissement",
]);

// ── BFR sub-categories ──
const BFR_ACTIF = new Set([
  "Variation BFR clients (DSO)",
  "Variation stocks",
]);

const BFR_PASSIF = new Set([
  "Variation BFR fournisseurs (DPO)",
  "Variation autres créances/dettes",
]);

// ── Pool flows (excluded from TAFIRE) ──
const POOL_TYPES = new Set([
  "Cash pooling — apport",
  "Cash pooling — retrait",
  "Virement inter-entités entrant",
  "Virement inter-entités sortant",
]);

/**
 * Classify a FlowRow into its TAFIRE category using explicit mapping.
 */
function classifyTafire(row: FlowRow): TafireCategory {
  const { section, cat, type } = row;

  // Pool flows → excluded
  if (cat === "pool" || POOL_TYPES.has(type)) return "pool";

  // BFR flows
  if (cat === "bfr") {
    if (BFR_ACTIF.has(type)) return "bfr_actif";
    if (BFR_PASSIF.has(type)) return "bfr_passif";
    // Default BFR to actif if not mapped
    return "bfr_actif";
  }

  // Operating flows → CAFG
  if (section === "ope") {
    return cat === "enc" ? "cafg_enc" : "cafg_dec";
  }

  // Investment flows
  if (section === "inv") {
    if (cat === "enc") {
      return INV_ENC_CESSIONS.has(type) ? "cessions_actifs" : "cessions_actifs";
    }
    return "acquisitions_immo";
  }

  // Financing flows
  if (section === "fin") {
    if (cat === "enc") {
      if (FIN_ENC_CAPITAL.has(type)) return "augmentation_capitaux";
      if (FIN_ENC_DETTES.has(type)) return "augmentation_dettes";
      // Default fin/enc (dividendes reçus, collecte MM, cashout MM)
      return "cafg_enc"; // Treated as operational income for TAFIRE
    }
    if (cat === "dec") {
      if (FIN_DEC_DIVIDENDES.has(type)) return "dividendes_distribues";
      if (FIN_DEC_REMBOURSEMENT.has(type)) return "remboursement_dettes";
      // Default fin/dec (intérêts, frais bancaires, frais MM)
      return "cafg_dec"; // Treated as operational expense for TAFIRE
    }
  }

  return "hors_tafire";
}

// ══════════════════════════════════════════════════════════════════

interface TafireInput {
  rows: FlowRow[];
  fx: Record<string, number>;
  scMult: number;
  reportCcy: string;
}

function rowTotal(row: FlowRow, fx: Record<string, number>, reportCcy: string, scMult: number): number {
  const ccyRow = row.ccy || "XOF";
  const toR = (v: number) => toXOF(v, ccyRow, fx) * (fx[reportCcy] ? 1 / fx[reportCcy] : 1);
  return row.amounts.reduce((a, v) => a + toR(p(v) * scMult), 0);
}

function computePartI(
  rows: FlowRow[],
  entityId: string | null,
  fx: Record<string, number>,
  reportCcy: string,
  scMult: number
): TafirePartI {
  const filtered = entityId === null ? rows : rows.filter(r => r.entity === entityId);

  let cafg = 0;
  let dividendesDistribues = 0;
  let cessionsActifs = 0;
  let augmentationCapitaux = 0;
  let augmentationDettes = 0;
  let acquisitionsImmo = 0;
  let remboursementDettes = 0;

  filtered.forEach(row => {
    const total = rowTotal(row, fx, reportCcy, scMult);
    const cat = classifyTafire(row);

    switch (cat) {
      case "cafg_enc":            cafg += total; break;
      case "cafg_dec":            cafg -= total; break;
      case "cessions_actifs":     cessionsActifs += total; break;
      case "acquisitions_immo":   acquisitionsImmo += total; break;
      case "augmentation_capitaux": augmentationCapitaux += total; break;
      case "augmentation_dettes": augmentationDettes += total; break;
      case "remboursement_dettes": remboursementDettes += total; break;
      case "dividendes_distribues": dividendesDistribues += total; break;
      // bfr, pool, hors_tafire → handled in Part II or ignored
    }
  });

  const remboursementCapitaux = 0; // No specific type for capital repayment yet
  const totalRessources = cafg + cessionsActifs + augmentationCapitaux + augmentationDettes;
  const totalEmplois = acquisitionsImmo + remboursementCapitaux + remboursementDettes + dividendesDistribues;
  const variationFR = totalRessources - totalEmplois;

  return {
    cafg, dividendesDistribues, cessionsActifs, augmentationCapitaux, augmentationDettes,
    totalRessources, acquisitionsImmo, remboursementCapitaux, remboursementDettes,
    totalEmplois, variationFR,
  };
}

function computePartII(
  rows: FlowRow[],
  entityId: string | null,
  fx: Record<string, number>,
  reportCcy: string,
  scMult: number,
  variationFR: number
): TafirePartII {
  const filtered = entityId === null ? rows : rows.filter(r => r.entity === entityId);

  let variationActifs = 0;
  let variationPassifs = 0;

  filtered.forEach(row => {
    const cat = classifyTafire(row);
    const total = rowTotal(row, fx, reportCcy, scMult);

    if (cat === "bfr_actif") variationActifs += total;
    else if (cat === "bfr_passif") variationPassifs += total;
  });

  const variationBfrExploitation = variationActifs - variationPassifs;
  const variationBfrHAO = 0;
  const variationTresorerieNette = variationFR - variationBfrExploitation - variationBfrHAO;

  return {
    variationActifsCirculants: variationActifs,
    variationPassifsCirculants: variationPassifs,
    variationBfrExploitation,
    variationBfrHAO,
    variationTresorerieNette,
  };
}

export function computeTafire(input: TafireInput): TafireData {
  const { rows, fx, scMult, reportCcy } = input;

  const partI = computePartI(rows, null, fx, reportCcy, scMult);
  const partII = computePartII(rows, null, fx, reportCcy, scMult, partI.variationFR);

  const byEntity: Record<string, { partI: TafirePartI; partII: TafirePartII }> = {};
  ENTITIES.forEach(e => {
    const ePartI = computePartI(rows, e.id, fx, reportCcy, scMult);
    const ePartII = computePartII(rows, e.id, fx, reportCcy, scMult, ePartI.variationFR);
    byEntity[e.id] = { partI: ePartI, partII: ePartII };
  });

  return { partI, partII, byEntity };
}

// Export for testing
export { classifyTafire, type TafireCategory };
