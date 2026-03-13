import { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ENTITIES, BANKS, CURRENCIES, MONTHS, IAS7, FLOW_TYPES, ALL_TYPES, sectionBgHeader, sectionTextColor } from "../constants";
import { p, fmt, toXOF } from "../lib/helpers";
import { computeAnomaly } from "../lib/predictions";
import type { FlowRow } from "../types";
import Badge from "./ui/Badge";

// CDC 4.2: Virtualization threshold
const VIRTUAL_THRESHOLD = 30;
const ROW_HEIGHT = 36;

/* ── VirtualizedRows: renders individual flow rows, virtualized when > threshold ── */
interface VRProps {
  typeRows: FlowRow[];
  scMult: number;
  fx: Record<string, number>;
  reportCcy: string;
  upd: (id: string, f: string, v: string) => void;
  updAmt: (id: string, mi: number, v: string) => void;
  confirmDelete: (id: string) => void;
}

function RowContent({ r, scMult, fx, reportCcy, upd, updAmt, confirmDelete }: { r: FlowRow } & Omit<VRProps, "typeRows">) {
  const anomalies = computeAnomaly(r.amounts);
  const anomalySet = new Set(anomalies.map(a => a.monthIndex));
  const rowTotal = r.amounts.reduce((s, v) => s + p(v) * scMult, 0);
  const converted = toXOF(rowTotal, r.ccy || "XOF", fx) * (fx[reportCcy] ? 1 / fx[reportCcy] : 1);

  return (
    <div className="flex items-center gap-1 px-3 py-1 border-b border-neutral-50 hover:bg-blue-50/30 text-[11px]" style={{ height: ROW_HEIGHT }}>
      {/* Entity */}
      <select value={r.entity} onChange={e => upd(r.id, "entity", e.target.value)}
        className="w-14 bg-transparent border-0 text-[10px] text-neutral-500 p-0 focus:ring-0">
        {ENTITIES.map(en => <option key={en.id} value={en.id}>{en.id}</option>)}
      </select>
      {/* Bank */}
      <select value={r.bank} onChange={e => upd(r.id, "bank", e.target.value)}
        className="w-20 bg-transparent border-0 text-[10px] text-neutral-500 p-0 truncate focus:ring-0">
        {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
      {/* Label */}
      <input value={r.label} onChange={e => upd(r.id, "label", e.target.value)}
        placeholder="Libellé…"
        className="flex-1 min-w-[80px] bg-transparent border-0 text-[11px] text-neutral-700 p-0 focus:ring-0 placeholder:text-neutral-300" />
      {/* Currency */}
      <select value={r.ccy} onChange={e => upd(r.id, "ccy", e.target.value)}
        className="w-12 bg-transparent border-0 text-[10px] text-neutral-400 p-0 focus:ring-0">
        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {/* 12 monthly amounts */}
      {MONTHS.map((_, mi) => (
        <input key={mi} value={r.amounts[mi] || ""}
          onChange={e => updAmt(r.id, mi, e.target.value)}
          className={`w-[52px] text-right bg-transparent border-0 text-[10px] font-mono p-0 focus:ring-1 focus:ring-blue-300 rounded ${anomalySet.has(mi) ? "bg-amber-100 text-amber-700 font-bold" : "text-neutral-600"}`}
          title={anomalySet.has(mi) ? `⚠ Anomalie détectée (Z-score > 2)` : MONTHS[mi]} />
      ))}
      {/* Total */}
      <span className={`w-16 text-right text-[10px] font-bold font-mono ${r.cat === "enc" ? "text-emerald-600" : r.cat === "dec" ? "text-rose-600" : "text-amber-600"}`}>
        {fmt(converted)}
      </span>
      {/* Delete */}
      <button onClick={() => confirmDelete(r.id)}
        className="ml-1 text-neutral-300 hover:text-rose-500 transition text-xs" title="Supprimer">✕</button>
    </div>
  );
}

function VirtualizedRows({ typeRows, scMult, fx, reportCcy, upd, updAmt, confirmDelete }: VRProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const useVirtual = typeRows.length > VIRTUAL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: typeRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    enabled: useVirtual,
  });

  if (!useVirtual) {
    return (
      <div className="bg-white">
        {typeRows.map(r => (
          <RowContent key={r.id} r={r} scMult={scMult} fx={fx} reportCcy={reportCcy} upd={upd} updAmt={updAmt} confirmDelete={confirmDelete} />
        ))}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="bg-white overflow-auto" style={{ maxHeight: Math.min(typeRows.length * ROW_HEIGHT, 600) }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map(vi => {
          const r = typeRows[vi.index];
          return (
            <div key={r.id} style={{ position: "absolute", top: vi.start, left: 0, right: 0, height: ROW_HEIGHT }}>
              <RowContent r={r} scMult={scMult} fx={fx} reportCcy={reportCcy} upd={upd} updAmt={updAmt} confirmDelete={confirmDelete} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  filtered: FlowRow[];
  filterEntity: string;
  setFilterEntity: (v: string) => void;
  filterSec: string;
  setFilterSec: (v: string) => void;
  addRow: () => void;
  confirmDelete: (id: string) => void;
  upd: (id: string, f: string, v: string) => void;
  updAmt: (id: string, mi: number, v: string) => void;
  scMult: number;
  fx: Record<string, number>;
  reportCcy: string;
  rows: FlowRow[];
}

export default function FlowsGrid(props: Props) {
  const { filtered, filterEntity, setFilterEntity, filterSec, setFilterSec, addRow, confirmDelete, upd, updAmt, scMult, fx, reportCcy } = props;

  // Track which sections and which flow types are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["ope", "inv", "fin"]));
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleType = (key: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="p-3 space-y-3 w-full">
      <div className="flex gap-2 flex-wrap items-center">
        <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs text-neutral-900">
          <option value="ALL">Toutes entités</option>
          {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filterSec} onChange={e => setFilterSec(e.target.value)} className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs text-neutral-900">
          <option value="ALL">Toutes sections</option>
          {IAS7.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <span className="text-neutral-400 text-xs">{filtered.length} ligne(s)</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setExpandedTypes(new Set(ALL_TYPES.map(t => t.label)))}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-2 py-1 rounded-lg text-xs font-medium transition">
            Tout déplier
          </button>
          <button onClick={() => setExpandedTypes(new Set())}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-2 py-1 rounded-lg text-xs font-medium transition">
            Tout replier
          </button>
          <button onClick={addRow} className="bg-neutral-900 hover:bg-neutral-950 text-white px-3 py-1 rounded-lg text-xs font-semibold transition">
            + Ajouter flux
          </button>
        </div>
      </div>

      {IAS7.map(sec => {
        const secRows = filtered.filter(r => r.section === sec.key);
        if (filterSec !== "ALL" && filterSec !== sec.key) return null;
        const isExpanded = expandedSections.has(sec.key);

        // Group rows by type
        const typeGroups: Record<string, FlowRow[]> = {};
        secRows.forEach(r => {
          const key = r.type || "Autres";
          if (!typeGroups[key]) typeGroups[key] = [];
          typeGroups[key].push(r);
        });

        const totByMonth = MONTHS.map((_, mi) => secRows.reduce((s, r) => {
          const v = p(r.amounts[mi]) * scMult * (r.cat === "dec" ? -1 : 1);
          return s + toXOF(v, r.ccy || "XOF", fx) * (fx[reportCcy] ? 1 / fx[reportCcy] : 1);
        }, 0));
        const annualNet = totByMonth.reduce((a, v) => a + v, 0);

        return (
          <div key={sec.key} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Section Header - clickable to collapse */}
            <button
              onClick={() => toggleSection(sec.key)}
              className={`w-full px-4 py-2.5 flex items-center justify-between ${sectionBgHeader[sec.color]} border-b cursor-pointer hover:opacity-90 transition`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs transition-transform inline-block ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                <span className="font-semibold text-sm text-neutral-900">{sec.icon} {sec.label}</span>
                <span className="text-xs text-neutral-400">({secRows.length} ligne{secRows.length > 1 ? "s" : ""} · {Object.keys(typeGroups).length} type{Object.keys(typeGroups).length > 1 ? "s" : ""})</span>
              </div>
              <span className={`text-xs font-bold ${sectionTextColor[sec.color]}`}>
                Net : {fmt(annualNet)} {reportCcy}
              </span>
            </button>

            {isExpanded && (
              <div>
                {Object.keys(typeGroups).length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 italic text-xs">Aucune ligne — cliquez sur "+ Ajouter flux"</div>
                ) : (
                  Object.entries(typeGroups).map(([typeName, typeRows]) => {
                    const typeKey = `${sec.key}:${typeName}`;
                    const typeExpanded = expandedTypes.has(typeKey);
                    const typeTotal = typeRows.reduce((s, r) => s + r.amounts.reduce((a, v) => a + p(v) * scMult, 0), 0);
                    const cat = typeRows[0]?.cat || "enc";
                    const typeTotByMonth = MONTHS.map((_, mi) => typeRows.reduce((s, r) => {
                      const v = p(r.amounts[mi]) * scMult;
                      return s + toXOF(v, r.ccy || "XOF", fx) * (fx[reportCcy] ? 1 / fx[reportCcy] : 1);
                    }, 0));

                    return (
                      <div key={typeKey}>
                        {/* Type summary row - clickable */}
                        <button
                          onClick={() => toggleType(typeKey)}
                          className={`w-full flex items-center gap-2 px-4 py-2 text-left border-b border-neutral-100 hover:bg-neutral-50 transition ${typeExpanded ? "bg-neutral-50" : ""}`}
                        >
                          <span className={`text-[10px] text-neutral-400 transition-transform inline-block ${typeExpanded ? "rotate-90" : ""}`}>▶</span>
                          <Badge cat={cat} />
                          <span className="text-xs font-semibold text-neutral-800 flex-1">{typeName}</span>
                          <span className="text-[10px] text-neutral-400 mr-3">{typeRows.length} écriture{typeRows.length > 1 ? "s" : ""}</span>
                          {/* Mini monthly sparkline */}
                          <div className="hidden md:flex gap-px mr-3">
                            {typeTotByMonth.map((v, i) => (
                              <div key={i} className="flex flex-col items-center w-5">
                                <div className="text-[8px] text-neutral-300">{MONTHS[i]}</div>
                                <div className={`text-[9px] font-mono ${v > 0 ? "text-neutral-600" : "text-neutral-300"}`}>
                                  {v > 0 ? fmt(v / 1000) + "k" : "—"}
                                </div>
                              </div>
                            ))}
                          </div>
                          <span className={`text-xs font-bold min-w-[80px] text-right ${cat === "enc" ? "text-emerald-600" : cat === "dec" ? "text-rose-600" : "text-amber-600"}`}>
                            {cat === "dec" ? "−" : "+"}{fmt(typeTotal)}
                          </span>
                        </button>

                        {/* Expanded: individual rows (CDC 4.2: virtualized when > VIRTUAL_THRESHOLD) */}
                        {typeExpanded && (
                          <VirtualizedRows
                            typeRows={typeRows}
                            scMult={scMult}
                            fx={fx}
                            reportCcy={reportCcy}
                            upd={upd}
                            updAmt={updAmt}
                            confirmDelete={confirmDelete}
                          />
                        )}
                      </div>
                    );
                  })
                )}

                {/* Section total row */}
                {secRows.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 border-t border-neutral-200 text-xs">
                    <span className="font-semibold text-neutral-500 uppercase">Total {sec.label}</span>
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex gap-2">
                        {totByMonth.map((v, i) => (
                          <div key={i} className="text-center w-14">
                            <div className="text-[8px] text-neutral-300">{MONTHS[i]}</div>
                            <div className={`text-[10px] font-bold ${v >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(v)}</div>
                          </div>
                        ))}
                      </div>
                      <span className={`text-sm font-bold ${annualNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {fmt(annualNet)} {reportCcy}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
