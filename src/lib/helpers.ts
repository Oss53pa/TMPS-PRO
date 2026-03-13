import { ENTITIES, BANKS, FLOW_TYPES } from "../constants";
import type { FlowRow } from "../types";

export const p = (v: unknown): number =>
  parseFloat((v || "").toString().replace(/\s/g, "").replace(",", ".")) || 0;

export const fmt = (v: number): string =>
  v === 0 ? "—" : new Intl.NumberFormat("fr-FR").format(Math.round(v));

// CDC 4.3: Cryptographically secure UUID v4
export const uid = (): string => crypto.randomUUID();

export const toXOF = (v: number, ccy: string, fx: Record<string, number>): number =>
  v * (fx[ccy] || 1);

export const newRow = (): FlowRow => ({
  id: uid(),
  entity: ENTITIES[0].id,
  bank: BANKS[0],
  section: "ope",
  type: FLOW_TYPES.ope[0].label,
  cat: "enc",
  ccy: "XOF",
  label: "",
  amounts: Array(12).fill(""),
  amountsReel: Array(12).fill(""),
  note: "",
  scenario: "base",
  statut: "prevu",
  recurrence: "ponctuel",
  probabilite: 100,
  exercice: new Date().getFullYear(),
});
