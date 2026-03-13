import { useState } from "react";
import { ENTITIES } from "../constants";
import { fmt } from "../lib/helpers";
import { exportTafireXLSX, exportTafirePDF } from "../lib/exports";
import type { AppStats, TafirePartI, TafirePartII } from "../types";

interface Props {
  stats: AppStats;
}

type SubTab = "Partie I" | "Partie II" | "Réconciliation" | "Par Entité";

const SUB_TABS: SubTab[] = ["Partie I", "Partie II", "Réconciliation", "Par Entité"];

function valCls(v: number): string {
  if (v > 0) return "text-emerald-600";
  if (v < 0) return "text-rose-600";
  return "text-neutral-400";
}

interface TableRow {
  label: string;
  value: number;
  bold?: boolean;
  bg?: string;
  prefix?: string;
  indent?: boolean;
}

function AmountCell({ value, bold, prefix }: { value: number; bold?: boolean; prefix?: string }) {
  const display = prefix ? `${prefix} ${fmt(Math.abs(value))}` : fmt(value);
  return (
    <td
      className={`px-4 py-2 text-right tabular-nums ${bold ? "font-bold" : "font-normal"} ${valCls(value)}`}
    >
      {display}
    </td>
  );
}

function SimpleTable({ rows }: { rows: TableRow[] }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-neutral-100">
          <th className="px-4 py-2 text-left font-semibold text-neutral-700">Libellé</th>
          <th className="px-4 py-2 text-right font-semibold text-neutral-700">Montant</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className={`border-b border-neutral-100 ${row.bg ?? "bg-white"} hover:bg-neutral-50/50`}
          >
            <td
              className={`px-4 py-2 ${row.bold ? "font-bold text-neutral-900" : "font-normal text-neutral-700"} ${row.indent ? "pl-8" : ""}`}
            >
              {row.label}
            </td>
            <AmountCell value={row.value} bold={row.bold} prefix={row.prefix} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PartieI({ partI }: { partI: TafirePartI }) {
  const rows: TableRow[] = [
    { label: "CAFG — Capacité d'autofinancement globale", value: partI.cafg },
    { label: "(+) Cessions d'actifs", value: partI.cessionsActifs, indent: true },
    { label: "(+) Augmentation des capitaux propres", value: partI.augmentationCapitaux, indent: true },
    { label: "(+) Augmentation des dettes financières", value: partI.augmentationDettes, indent: true },
    {
      label: "= Total Ressources",
      value: partI.totalRessources,
      bold: true,
      bg: "bg-emerald-50",
    },
    { label: "(-) Acquisitions d'immobilisations", value: -partI.acquisitionsImmo, indent: true },
    { label: "(-) Remboursement des capitaux", value: -partI.remboursementCapitaux, indent: true },
    { label: "(-) Remboursement des dettes financières", value: -partI.remboursementDettes, indent: true },
    { label: "(-) Dividendes distribués", value: -partI.dividendesDistribues, indent: true },
    {
      label: "= Total Emplois",
      value: partI.totalEmplois,
      bold: true,
      bg: "bg-rose-50",
    },
    {
      label: "= Variation du Fonds de Roulement",
      value: partI.variationFR,
      bold: true,
      bg: "bg-neutral-100",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
        <div className="text-sm font-semibold text-neutral-900">Partie I — Ressources et Emplois</div>
        <div className="text-xs text-neutral-500 mt-0.5">SYSCOHADA — Tableau de Financement</div>
      </div>
      <SimpleTable rows={rows} />
    </div>
  );
}

function PartieII({ partII }: { partII: TafirePartII }) {
  const rows: TableRow[] = [
    { label: "Variation des actifs circulants", value: partII.variationActifsCirculants, indent: true },
    { label: "Variation des passifs circulants", value: -partII.variationPassifsCirculants, indent: true },
    {
      label: "= Variation BFR exploitation",
      value: partII.variationBfrExploitation,
      bold: true,
      bg: "bg-neutral-50",
    },
    { label: "Variation BFR HAO", value: partII.variationBfrHAO, indent: true },
    {
      label: "= Variation de Trésorerie Nette",
      value: partII.variationTresorerieNette,
      bold: true,
      bg: "bg-neutral-100",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
        <div className="text-sm font-semibold text-neutral-900">Partie II — Variation du Besoin en Fonds de Roulement</div>
        <div className="text-xs text-neutral-500 mt-0.5">Passage du FdR à la trésorerie nette</div>
      </div>
      <SimpleTable rows={rows} />
    </div>
  );
}

const RECONCILIATION_ROWS: { tafire: string; ias7: string; note: string }[] = [
  {
    tafire: "CAFG",
    ias7: "Flux nets opérationnels (A)",
    note: "Méthode indirecte — résultat net + retraitements",
  },
  {
    tafire: "Cessions d'actifs",
    ias7: "Produits de cession (B)",
    note: "Flux d'investissement entrant",
  },
  {
    tafire: "Acquisitions d'immobilisations",
    ias7: "CAPEX (B)",
    note: "Flux d'investissement sortant",
  },
  {
    tafire: "Augmentation des capitaux propres",
    ias7: "Augmentation de capital (C)",
    note: "Flux de financement entrant",
  },
  {
    tafire: "Augmentation des dettes financières",
    ias7: "Emprunts reçus (C)",
    note: "Flux de financement entrant",
  },
  {
    tafire: "Remboursement des dettes financières",
    ias7: "Remboursements d'emprunts (C)",
    note: "Flux de financement sortant",
  },
  {
    tafire: "Dividendes distribués",
    ias7: "Dividendes versés (C)",
    note: "Flux de financement sortant",
  },
  {
    tafire: "Variation du Fonds de Roulement",
    ias7: "A + B + C (variation nette de trésorerie)",
    note: "Rapprochement TAFIRE ↔ IAS 7",
  },
];

function Reconciliation() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
        <div className="text-sm font-semibold text-neutral-900">Réconciliation — TAFIRE vs IAS 7</div>
        <div className="text-xs text-neutral-500 mt-0.5">
          Correspondance SYSCOHADA (TAFIRE) et norme internationale IAS 7
        </div>
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-neutral-100">
            <th className="px-4 py-2 text-left font-semibold text-neutral-700">TAFIRE (SYSCOHADA)</th>
            <th className="px-4 py-2 text-left font-semibold text-neutral-700">IAS 7 (IFRS)</th>
            <th className="px-4 py-2 text-left font-semibold text-neutral-700">Note</th>
          </tr>
        </thead>
        <tbody>
          {RECONCILIATION_ROWS.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-neutral-100 hover:bg-neutral-50/50 ${i === RECONCILIATION_ROWS.length - 1 ? "bg-neutral-50 font-semibold" : "bg-white"}`}
            >
              <td className={`px-4 py-2 ${i === RECONCILIATION_ROWS.length - 1 ? "font-bold text-neutral-900" : "text-neutral-800"}`}>
                {row.tafire}
              </td>
              <td className={`px-4 py-2 ${i === RECONCILIATION_ROWS.length - 1 ? "font-bold text-neutral-900" : "text-neutral-800"}`}>
                {row.ias7}
              </td>
              <td className="px-4 py-2 text-neutral-500 italic">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntityCard({
  entity,
  partI,
}: {
  entity: { id: string; name: string; country: string; ccy: string };
  partI: TafirePartI;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-neutral-900">{entity.name}</div>
          <div className="text-[10px] text-neutral-500">{entity.country} · {entity.ccy}</div>
        </div>
        <span
          className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
            partI.variationFR >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          ΔFR {fmt(partI.variationFR)}
        </span>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-neutral-500">CAFG</span>
          <span className={`text-[11px] tabular-nums font-medium ${valCls(partI.cafg)}`}>
            {fmt(partI.cafg)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-neutral-500">Total Ressources</span>
          <span className={`text-[11px] tabular-nums font-medium ${valCls(partI.totalRessources)}`}>
            {fmt(partI.totalRessources)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-neutral-500">Total Emplois</span>
          <span className={`text-[11px] tabular-nums font-medium ${valCls(-partI.totalEmplois)}`}>
            {fmt(partI.totalEmplois)}
          </span>
        </div>
        <div className="border-t border-neutral-100 pt-1.5 flex justify-between items-center">
          <span className="text-[11px] font-semibold text-neutral-700">Variation FdR</span>
          <span
            className={`text-[11px] tabular-nums font-bold ${valCls(partI.variationFR)}`}
          >
            {fmt(partI.variationFR)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ParEntite({ byEntity }: { byEntity: AppStats["tafire"]["byEntity"] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ENTITIES.map((e) => {
          const data = byEntity[e.id];
          if (!data) return null;
          return <EntityCard key={e.id} entity={e} partI={data.partI} />;
        })}
      </div>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 text-sm font-semibold text-neutral-900">
          Synthèse consolidée par entité — Partie I
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-100">
              <th className="px-3 py-2 text-left font-semibold text-neutral-700">Entité</th>
              <th className="px-3 py-2 text-right font-semibold text-neutral-700">CAFG</th>
              <th className="px-3 py-2 text-right font-semibold text-neutral-700">Ressources</th>
              <th className="px-3 py-2 text-right font-semibold text-neutral-700">Emplois</th>
              <th className="px-3 py-2 text-right font-semibold text-neutral-700">Variation FdR</th>
            </tr>
          </thead>
          <tbody>
            {ENTITIES.map((e) => {
              const data = byEntity[e.id];
              if (!data) return null;
              const { partI } = data;
              return (
                <tr key={e.id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                  <td className="px-3 py-2 font-semibold text-neutral-900">
                    {e.name}
                    <br />
                    <span className="text-neutral-400 font-normal">{e.country}</span>
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${valCls(partI.cafg)}`}>
                    {fmt(partI.cafg)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${valCls(partI.totalRessources)}`}>
                    {fmt(partI.totalRessources)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${valCls(-partI.totalEmplois)}`}>
                    {fmt(partI.totalEmplois)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums font-bold ${valCls(partI.variationFR)}`}
                  >
                    {fmt(partI.variationFR)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-neutral-50 font-bold border-t border-neutral-200">
              <td className="px-3 py-2 text-neutral-900">CONSOLIDÉ</td>
              <td className={`px-3 py-2 text-right tabular-nums ${valCls(ENTITIES.reduce((s, e) => s + (byEntity[e.id]?.partI.cafg ?? 0), 0))}`}>
                {fmt(ENTITIES.reduce((s, e) => s + (byEntity[e.id]?.partI.cafg ?? 0), 0))}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums ${valCls(ENTITIES.reduce((s, e) => s + (byEntity[e.id]?.partI.totalRessources ?? 0), 0))}`}>
                {fmt(ENTITIES.reduce((s, e) => s + (byEntity[e.id]?.partI.totalRessources ?? 0), 0))}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums ${valCls(-ENTITIES.reduce((s, e) => s + (byEntity[e.id]?.partI.totalEmplois ?? 0), 0))}`}>
                {fmt(ENTITIES.reduce((s, e) => s + (byEntity[e.id]?.partI.totalEmplois ?? 0), 0))}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums font-bold ${valCls(ENTITIES.reduce((s, e) => s + (byEntity[e.id]?.partI.variationFR ?? 0), 0))}`}>
                {fmt(ENTITIES.reduce((s, e) => s + (byEntity[e.id]?.partI.variationFR ?? 0), 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TafireTab({ stats }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("Partie I");
  const { partI, partII, byEntity } = stats.tafire;

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-neutral-900">
            TAFIRE — Tableau de Financement SYSCOHADA
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            Ressources · Emplois · Variation du Fonds de Roulement
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportTafireXLSX(stats.tafire, new Date().getFullYear())}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition">
            Excel
          </button>
          <button onClick={() => exportTafirePDF(stats.tafire, new Date().getFullYear())}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white transition">
            PDF
          </button>
        </div>
        {/* Sub-tab switcher */}
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 flex-wrap">
          {SUB_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                subTab === t
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {subTab === "Partie I" && <PartieI partI={partI} />}
      {subTab === "Partie II" && <PartieII partII={partII} />}
      {subTab === "Réconciliation" && <Reconciliation />}
      {subTab === "Par Entité" && <ParEntite byEntity={byEntity} />}
    </div>
  );
}
