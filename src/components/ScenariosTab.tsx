import { useState, useMemo } from "react";
import { SCENARIOS, MONTHS, ENTITIES } from "../constants";
import { p, fmt } from "../lib/helpers";
import type { FlowRow } from "../types";
import Icon from "./ui/Icon";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

interface Props {
  rows: FlowRow[];
  setRows: React.Dispatch<React.SetStateAction<FlowRow[]>>;
  scenario: string;
  setScenario: (s: string) => void;
  ccySym: string;
  fx: Record<string, number>;
  reportCcy: string;
}

const TABS = ["Comparateur", "Construction", "What-If"] as const;

const SC_COLORS: Record<string, string> = {
  base: "#475569", df: "#6366f1", bull: "#10b981", bear: "#f59e0b", crise: "#ef4444",
};

export default function ScenariosTab({ rows, setRows, scenario, setScenario, ccySym, fx, reportCcy }: Props) {
  const [sub, setSub] = useState<(typeof TABS)[number]>("Comparateur");
  const [selectedEntity, setSelectedEntity] = useState("ALL");

  // ── What-If state ──
  const [wiBase, setWiBase] = useState("base");
  const [wiAdjustments, setWiAdjustments] = useState<{ section: string; pct: number }[]>([
    { section: "ope", pct: 0 },
    { section: "inv", pct: 0 },
    { section: "fin", pct: 0 },
  ]);

  const toR = (v: number, ccy: string) => {
    const fxVal = fx[ccy] || 1;
    const fxRep = fx[reportCcy] || 1;
    return v * fxVal / fxRep;
  };

  // ── Per-scenario monthly totals ──
  const scenarioData = useMemo(() => {
    const result: Record<string, number[]> = {};
    SCENARIOS.forEach(sc => {
      const monthly = Array(12).fill(0);
      rows.forEach(row => {
        if (row.scenario !== sc.key && row.scenario !== "base") return;
        const mult = row.scenario === "base" ? sc.mult : 1;
        const filt = selectedEntity === "ALL" || row.entity === selectedEntity;
        if (!filt) return;
        row.amounts.forEach((v, mi) => {
          const raw = p(v) * mult;
          const val = toR(raw, row.ccy || "XOF");
          if (row.cat === "enc") monthly[mi] += val;
          else if (row.cat === "dec") monthly[mi] -= val;
        });
      });
      result[sc.key] = monthly;
    });
    return result;
  }, [rows, selectedEntity, fx, reportCcy]);

  // ── Cumulative for chart ──
  const chartData = useMemo(() => {
    return MONTHS.map((m, mi) => {
      const point: Record<string, string | number> = { month: m };
      SCENARIOS.forEach(sc => {
        point[sc.key] = Math.round(scenarioData[sc.key]?.[mi] || 0);
      });
      return point;
    });
  }, [scenarioData]);

  // ── What-If simulation ──
  const wiData = useMemo(() => {
    const monthly = Array(12).fill(0);
    rows.forEach(row => {
      if (row.scenario !== wiBase && row.scenario !== "base") return;
      const filt = selectedEntity === "ALL" || row.entity === selectedEntity;
      if (!filt) return;
      const adj = wiAdjustments.find(a => a.section === row.section);
      const pctMult = 1 + (adj?.pct || 0) / 100;
      const scObj = SCENARIOS.find(s => s.key === wiBase);
      const mult = row.scenario === "base" ? (scObj?.mult || 1) : 1;
      row.amounts.forEach((v, mi) => {
        const raw = p(v) * mult * pctMult;
        const val = toR(raw, row.ccy || "XOF");
        if (row.cat === "enc") monthly[mi] += val;
        else if (row.cat === "dec") monthly[mi] -= val;
      });
    });
    return monthly;
  }, [rows, wiBase, wiAdjustments, selectedEntity, fx, reportCcy]);

  const wiChartData = useMemo(() => {
    return MONTHS.map((m, mi) => ({
      month: m,
      base: Math.round(scenarioData[wiBase]?.[mi] || 0),
      whatif: Math.round(wiData[mi]),
      diff: Math.round(wiData[mi] - (scenarioData[wiBase]?.[mi] || 0)),
    }));
  }, [wiData, scenarioData, wiBase]);

  // ── Construction: copy scenario ──
  const [copyFrom, setCopyFrom] = useState("base");
  const [copyTo, setCopyTo] = useState("df");
  const [copyMult, setCopyMult] = useState("1.00");

  const handleCopy = () => {
    const mult = parseFloat(copyMult) || 1;
    setRows(prev => {
      const existing = prev.filter(r => r.scenario !== copyTo);
      const copied = prev
        .filter(r => r.scenario === copyFrom)
        .map(r => ({
          ...r,
          id: Date.now() + Math.random(),
          scenario: copyTo,
          amounts: r.amounts.map(a => {
            const v = p(a) * mult;
            return v ? v.toString() : "";
          }),
        }));
      return [...existing, ...copied];
    });
  };

  const handleReset = (scKey: string) => {
    setRows(prev => prev.filter(r => r.scenario !== scKey));
  };

  const countByScenario = useMemo(() => {
    const counts: Record<string, number> = {};
    SCENARIOS.forEach(s => { counts[s.key] = 0; });
    rows.forEach(r => { if (counts[r.scenario] !== undefined) counts[r.scenario]++; });
    return counts;
  }, [rows]);

  return (
    <div className="p-4 space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setSub(t)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${sub === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Entity filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-500">Entité :</label>
        <select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)}
          className="border rounded px-2 py-1 text-xs">
          <option value="ALL">Toutes les entités</option>
          {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* ═══ COMPARATEUR ═══ */}
      {sub === "Comparateur" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold mb-3">Comparaison des 5 scénarios — Flux nets mensuels ({ccySym})</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmt(v) + " " + ccySym} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {SCENARIOS.map(sc => (
                  <Line key={sc.key} type="monotone" dataKey={sc.key} name={sc.label}
                    stroke={SC_COLORS[sc.key]} strokeWidth={sc.key === scenario ? 3 : 1.5}
                    dot={sc.key === scenario} strokeDasharray={sc.key === scenario ? undefined : "5 3"} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b">
                  <th className="text-left px-3 py-2 font-semibold">Scénario</th>
                  {MONTHS.map(m => <th key={m} className="px-2 py-2 text-right font-semibold">{m}</th>)}
                  <th className="px-3 py-2 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map(sc => {
                  const vals = scenarioData[sc.key] || Array(12).fill(0);
                  const total = vals.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={sc.key} className={`border-b hover:bg-neutral-50 ${sc.key === scenario ? "bg-indigo-50/50" : ""}`}>
                      <td className="px-3 py-2 font-semibold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SC_COLORS[sc.key] }} />
                        {sc.label}
                        {sc.key === scenario && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full">actif</span>}
                      </td>
                      {vals.map((v, i) => (
                        <td key={i} className={`px-2 py-2 text-right tabular-nums ${v >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                          {fmt(v)}
                        </td>
                      ))}
                      <td className={`px-3 py-2 text-right font-bold tabular-nums ${total >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {fmt(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Variance vs active */}
          <div className="bg-white rounded-xl border overflow-auto">
            <div className="px-4 py-3 border-b bg-neutral-50">
              <h4 className="text-xs font-bold">Écarts par rapport au scénario actif ({SCENARIOS.find(s => s.key === scenario)?.label})</h4>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-3 py-2">Scénario</th>
                  {MONTHS.map(m => <th key={m} className="px-2 py-2 text-right">{m}</th>)}
                  <th className="px-3 py-2 text-right font-bold">Écart Total</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.filter(sc => sc.key !== scenario).map(sc => {
                  const baseVals = scenarioData[scenario] || Array(12).fill(0);
                  const scVals = scenarioData[sc.key] || Array(12).fill(0);
                  const diffs = scVals.map((v, i) => v - baseVals[i]);
                  const totalDiff = diffs.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={sc.key} className="border-b hover:bg-neutral-50">
                      <td className="px-3 py-2 font-medium">{sc.label}</td>
                      {diffs.map((d, i) => (
                        <td key={i} className={`px-2 py-2 text-right tabular-nums ${d > 0 ? "text-emerald-600" : d < 0 ? "text-rose-600" : "text-neutral-400"}`}>
                          {d > 0 ? "+" : ""}{fmt(d)}
                        </td>
                      ))}
                      <td className={`px-3 py-2 text-right font-bold tabular-nums ${totalDiff > 0 ? "text-emerald-600" : totalDiff < 0 ? "text-rose-600" : ""}`}>
                        {totalDiff > 0 ? "+" : ""}{fmt(totalDiff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ CONSTRUCTION ═══ */}
      {sub === "Construction" && (
        <div className="space-y-4">
          {/* Scenario overview cards */}
          <div className="grid grid-cols-5 gap-3">
            {SCENARIOS.map(sc => (
              <div key={sc.key}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition hover:shadow ${scenario === sc.key ? "ring-2 ring-indigo-500" : ""}`}
                onClick={() => setScenario(sc.key)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: SC_COLORS[sc.key] }} />
                  <span className="text-xs font-bold">{sc.label}</span>
                </div>
                <div className="text-lg font-black tabular-nums">{countByScenario[sc.key]}</div>
                <div className="text-[10px] text-neutral-500">lignes de flux</div>
                <div className="text-[10px] text-neutral-400 mt-1">Mult: ×{sc.mult}</div>
              </div>
            ))}
          </div>

          {/* Copy tool */}
          <div className="bg-white rounded-xl border p-4">
            <h4 className="text-sm font-bold mb-3">Copier un scénario</h4>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1">Depuis</label>
                <select value={copyFrom} onChange={e => setCopyFrom(e.target.value)}
                  className="border rounded px-2 py-1.5 text-xs">
                  {SCENARIOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <span className="text-neutral-400 pb-1.5">→</span>
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1">Vers</label>
                <select value={copyTo} onChange={e => setCopyTo(e.target.value)}
                  className="border rounded px-2 py-1.5 text-xs">
                  {SCENARIOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1">Multiplicateur</label>
                <input type="number" step="0.01" value={copyMult} onChange={e => setCopyMult(e.target.value)}
                  className="border rounded px-2 py-1.5 text-xs w-20" />
              </div>
              <button onClick={handleCopy}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition">
                Copier
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">
              Copie toutes les lignes du scénario source vers la destination en appliquant le multiplicateur sur les montants.
              Les lignes existantes du scénario destination seront remplacées.
            </p>
          </div>

          {/* Reset */}
          <div className="bg-white rounded-xl border p-4">
            <h4 className="text-sm font-bold mb-3">Réinitialiser un scénario</h4>
            <div className="flex gap-2 flex-wrap">
              {SCENARIOS.filter(s => s.key !== "base").map(sc => (
                <button key={sc.key} onClick={() => handleReset(sc.key)}
                  className="px-3 py-1.5 border border-rose-200 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50 transition">
                  Supprimer « {sc.label} » ({countByScenario[sc.key]} lignes)
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">
              Supprime toutes les lignes du scénario sélectionné. Le scénario Budget (base) ne peut pas être supprimé.
            </p>
          </div>
        </div>
      )}

      {/* ═══ WHAT-IF ═══ */}
      {sub === "What-If" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold mb-3">Simulation What-If</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Ajustez les flux par section IAS 7 pour simuler l'impact sur la trésorerie.
            </p>

            <div className="flex items-end gap-4 mb-4">
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1">Scénario de base</label>
                <select value={wiBase} onChange={e => setWiBase(e.target.value)}
                  className="border rounded px-2 py-1.5 text-xs">
                  {SCENARIOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { key: "ope", label: "A · Opérationnel", icon: "config" },
                { key: "inv", label: "B · Investissement", icon: "construction" },
                { key: "fin", label: "C · Financement", icon: "bank" },
              ].map(sec => {
                const adj = wiAdjustments.find(a => a.section === sec.key);
                return (
                  <div key={sec.key} className="border rounded-lg p-3">
                    <div className="text-xs font-semibold mb-2 flex items-center gap-1"><Icon name={sec.icon} className="w-3.5 h-3.5" /> {sec.label}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range" min={-50} max={50} step={1}
                        value={adj?.pct || 0}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setWiAdjustments(prev => prev.map(a => a.section === sec.key ? { ...a, pct: val } : a));
                        }}
                        className="flex-1"
                      />
                      <span className={`text-sm font-bold w-14 text-right tabular-nums ${(adj?.pct || 0) > 0 ? "text-emerald-600" : (adj?.pct || 0) < 0 ? "text-rose-600" : "text-neutral-500"}`}>
                        {(adj?.pct || 0) > 0 ? "+" : ""}{adj?.pct || 0}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What-If chart */}
          <div className="bg-white rounded-xl border p-4">
            <h4 className="text-xs font-bold mb-3">Impact de la simulation ({ccySym})</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wiChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmt(v) + " " + ccySym} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="base" name="Base" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="whatif" name="What-If" radius={[2, 2, 0, 0]}>
                  {wiChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.diff >= 0 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Diff table */}
          <div className="bg-white rounded-xl border overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b">
                  <th className="text-left px-3 py-2">Mois</th>
                  <th className="px-3 py-2 text-right">Base</th>
                  <th className="px-3 py-2 text-right">What-If</th>
                  <th className="px-3 py-2 text-right">Écart</th>
                  <th className="px-3 py-2 text-right">Écart %</th>
                </tr>
              </thead>
              <tbody>
                {wiChartData.map((row, i) => {
                  const pct = row.base !== 0 ? ((row.whatif - row.base) / Math.abs(row.base)) * 100 : 0;
                  return (
                    <tr key={i} className="border-b hover:bg-neutral-50">
                      <td className="px-3 py-2 font-medium">{row.month}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(row.base)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(row.whatif)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${row.diff > 0 ? "text-emerald-600" : row.diff < 0 ? "text-rose-600" : ""}`}>
                        {row.diff > 0 ? "+" : ""}{fmt(row.diff)}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${pct > 0 ? "text-emerald-600" : pct < 0 ? "text-rose-600" : ""}`}>
                        {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                {(() => {
                  const totalBase = wiChartData.reduce((a, r) => a + r.base, 0);
                  const totalWi = wiChartData.reduce((a, r) => a + r.whatif, 0);
                  const totalDiff = totalWi - totalBase;
                  const totalPct = totalBase !== 0 ? (totalDiff / Math.abs(totalBase)) * 100 : 0;
                  return (
                    <tr className="bg-neutral-50 font-bold">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(totalBase)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(totalWi)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${totalDiff > 0 ? "text-emerald-600" : totalDiff < 0 ? "text-rose-600" : ""}`}>
                        {totalDiff > 0 ? "+" : ""}{fmt(totalDiff)}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${totalPct > 0 ? "text-emerald-600" : totalPct < 0 ? "text-rose-600" : ""}`}>
                        {totalPct > 0 ? "+" : ""}{totalPct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
