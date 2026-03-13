import { useState, useMemo } from "react";
import { MONTHS, ENTITIES, BANKS } from "../constants";
import { p, fmt } from "../lib/helpers";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, Area, ComposedChart } from "recharts";
import type { FlowRow, AppStats } from "../types";
import Icon from "./ui/Icon";

interface Props {
  rows: FlowRow[];
  stats: AppStats;
  ccySym: string;
  upd: (id: string, f: string, v: string) => void;
  updAmtReel: (id: string, mi: number, v: string) => void;
}

const SUB_TABS = [
  { key: "ecarts", label: "Tableau des Écarts", icon: "chart" },
  { key: "courbe", label: "Courbe Plan vs Réalisé", icon: "trendUp" },
  { key: "waterfall", label: "Waterfall", icon: "trendDown" },
  { key: "comments", label: "Commentaires & Tags", icon: "chat" },
] as const;
type SubTab = typeof SUB_TABS[number]["key"];

const TAGS = ["Retard de paiement", "Contrat modifié", "Dépense exceptionnelle", "Erreur de prévision", "Événement externe"];
const CAT_LABELS: Record<string, string> = { enc: "Encaissement", dec: "Décaissement", bfr: "BFR", pool: "Pooling" };

function ecartPct(prevu: number, reel: number): number {
  if (prevu === 0) return reel === 0 ? 0 : 100;
  return ((reel - prevu) / Math.abs(prevu)) * 100;
}

function ecartStatut(pct: number): { label: string; cls: string } {
  const abs = Math.abs(pct);
  if (abs <= 15) return { label: "OK", cls: "bg-emerald-100 text-emerald-700" };
  if (abs <= 30) return { label: "Attention", cls: "bg-amber-100 text-amber-700" };
  return { label: "Alerte", cls: "bg-rose-100 text-rose-700" };
}

export default function PlanVsReelTab({ rows, stats, ccySym, upd, updAmtReel }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("ecarts");
  const [filterEntity, setFilterEntity] = useState("ALL");
  const [filterBank, setFilterBank] = useState("ALL");
  const [filterCat, setFilterCat] = useState("ALL");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [wfMonth, setWfMonth] = useState(new Date().getMonth());

  // Rows that have any reel data
  const rowsWithReel = useMemo(() => {
    return rows.filter(r => {
      const hasReel = (r.amountsReel || []).some(v => p(v) !== 0);
      const hasPrevu = r.amounts.some(v => p(v) !== 0);
      return hasReel || hasPrevu;
    }).filter(r =>
      (filterEntity === "ALL" || r.entity === filterEntity) &&
      (filterBank === "ALL" || r.bank === filterBank) &&
      (filterCat === "ALL" || r.cat === filterCat)
    );
  }, [rows, filterEntity, filterBank, filterCat]);

  // Compute réalisé cumulative
  const reelCum = useMemo(() => {
    const monthly = MONTHS.map((_, mi) => {
      const enc = rows.filter(r => r.cat === "enc").reduce((s, r) => s + p((r.amountsReel || [])[mi]), 0);
      const dec = rows.filter(r => r.cat === "dec").reduce((s, r) => s + p((r.amountsReel || [])[mi]), 0);
      return enc - dec;
    });
    let cum = BANKS.reduce((s, b) => s + (stats.byBank[b]?.si || 0), 0);
    return monthly.map(net => { cum += net; return cum; });
  }, [rows, stats]);

  // Has any reel data at all?
  const hasReelData = rows.some(r => (r.amountsReel || []).some(v => p(v) !== 0));

  // Chart data
  const chartData = MONTHS.map((m, mi) => ({
    name: m,
    plan: Math.round(stats.cons.cum[mi]),
    reel: Math.round(reelCum[mi]),
    optimiste: Math.round(stats.cons.cum[mi] * 1.15),
    pessimiste: Math.round(stats.cons.cum[mi] * 0.80),
  }));

  // Point of divergence
  const divergenceMonth = chartData.findIndex((d, i) =>
    hasReelData && (d.reel > d.optimiste || d.reel < d.pessimiste)
  );

  // Ecart global
  const totalPrevu = rows.reduce((s, r) => {
    const sign = r.cat === "dec" ? -1 : r.cat === "enc" ? 1 : 0;
    return s + sign * r.amounts.reduce((a, v) => a + p(v), 0);
  }, 0);
  const totalReel = rows.reduce((s, r) => {
    const sign = r.cat === "dec" ? -1 : r.cat === "enc" ? 1 : 0;
    return s + sign * (r.amountsReel || []).reduce((a, v) => a + p(v), 0);
  }, 0);

  // Waterfall data for selected month
  const wfData = useMemo(() => {
    const cats = ["enc", "dec", "bfr", "pool"];
    const items: { name: string; prevu: number; reel: number; delta: number }[] = [];
    cats.forEach(cat => {
      const prevu = rows.filter(r => r.cat === cat).reduce((s, r) => s + p(r.amounts[wfMonth]), 0);
      const reel = rows.filter(r => r.cat === cat).reduce((s, r) => s + p((r.amountsReel || [])[wfMonth]), 0);
      items.push({ name: CAT_LABELS[cat] || cat, prevu, reel, delta: reel - prevu });
    });
    return items;
  }, [rows, wfMonth]);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 space-y-4 w-full">
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {/* Sub-tabs */}
        <div className="flex border-b border-neutral-200">
          {SUB_TABS.map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 ${
                subTab === t.key ? "border-neutral-900 text-neutral-900 bg-neutral-50" : "border-transparent text-neutral-400 hover:text-neutral-700"
              }`}>
              <Icon name={t.icon} className="w-3.5 h-3.5" /><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ═══ ÉCARTS ═══ */}
        {subTab === "ecarts" && (
          <div>
            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-3 p-4">
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                <div className="text-[10px] text-neutral-400 uppercase font-medium">Total Prévu</div>
                <div className="text-lg font-black text-neutral-900">{fmt(Math.abs(totalPrevu))}</div>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                <div className="text-[10px] text-neutral-400 uppercase font-medium">Total Réalisé</div>
                <div className={`text-lg font-black ${hasReelData ? "text-indigo-700" : "text-neutral-300"}`}>{hasReelData ? fmt(Math.abs(totalReel)) : "—"}</div>
              </div>
              <div className={`rounded-lg p-3 border ${Math.abs(totalReel - totalPrevu) > 0 ? (totalReel >= totalPrevu ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200") : "bg-neutral-50 border-neutral-100"}`}>
                <div className="text-[10px] text-neutral-400 uppercase font-medium">Écart Net</div>
                <div className={`text-lg font-black ${totalReel >= totalPrevu ? "text-emerald-700" : "text-rose-700"}`}>{hasReelData ? fmt(totalReel - totalPrevu) : "—"}</div>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                <div className="text-[10px] text-neutral-400 uppercase font-medium">Lignes avec écart</div>
                <div className="text-lg font-black text-amber-700">{rowsWithReel.filter(r => {
                  const tp = r.amounts.reduce((s, v) => s + p(v), 0);
                  const tr = (r.amountsReel || []).reduce((s, v) => s + p(v), 0);
                  return tp > 0 && Math.abs(ecartPct(tp, tr)) > 15;
                }).length}</div>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 pb-3 flex gap-2 flex-wrap">
              <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
                className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-[10px]">
                <option value="ALL">Toutes entités</option>
                {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select value={filterBank} onChange={e => setFilterBank(e.target.value)}
                className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-[10px]">
                <option value="ALL">Toutes banques</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-[10px]">
                <option value="ALL">Toutes catégories</option>
                <option value="enc">Encaissements</option>
                <option value="dec">Décaissements</option>
                <option value="bfr">BFR</option>
                <option value="pool">Pooling</option>
              </select>
              <span className="text-[10px] text-neutral-400 ml-auto pt-1">{rowsWithReel.length} ligne(s)</span>
            </div>

            {/* Table */}
            {rowsWithReel.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-xs">
                Aucune donnée de réalisé saisie. Saisissez les montants réalisés dans le Journal ou importez un relevé bancaire.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-neutral-50 text-neutral-500">
                    <th className="px-2 py-2 w-6"></th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Entité</th>
                    <th className="px-3 py-2 text-left font-medium">Banque</th>
                    <th className="px-3 py-2 text-right font-medium">Prévu</th>
                    <th className="px-3 py-2 text-right font-medium">Réalisé</th>
                    <th className="px-3 py-2 text-right font-medium">Écart</th>
                    <th className="px-3 py-2 text-right font-medium">%</th>
                    <th className="px-3 py-2 text-center font-medium">Statut</th>
                  </tr></thead>
                  <tbody>
                    {rowsWithReel.map(row => {
                      const tp = row.amounts.reduce((s, v) => s + p(v), 0);
                      const tr = (row.amountsReel || []).reduce((s, v) => s + p(v), 0);
                      const ecart = tr - tp;
                      const pctVal = ecartPct(tp, tr);
                      const statut = ecartStatut(pctVal);
                      const expanded = expandedRows.has(row.id);
                      return (
                        <>
                          <tr key={row.id} onClick={() => toggleExpand(row.id)}
                            className="border-b border-neutral-100 hover:bg-neutral-50/50 cursor-pointer group">
                            <td className="px-2 py-2 text-center">
                              <span className={`text-neutral-400 text-[10px] inline-block transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
                            </td>
                            <td className="px-3 py-2 text-neutral-700 font-medium">{row.type}</td>
                            <td className="px-3 py-2 text-neutral-600">{row.entity}</td>
                            <td className="px-3 py-2 text-neutral-600">{row.bank}</td>
                            <td className="px-3 py-2 text-right text-neutral-700">{fmt(tp)}</td>
                            <td className={`px-3 py-2 text-right font-semibold ${tr > 0 ? "text-indigo-700" : "text-neutral-300"}`}>{tr > 0 ? fmt(tr) : "—"}</td>
                            <td className={`px-3 py-2 text-right font-bold ${ecart >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{tr > 0 ? fmt(ecart) : "—"}</td>
                            <td className={`px-3 py-2 text-right font-bold ${ecart >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{tr > 0 ? `${pctVal >= 0 ? "+" : ""}${pctVal.toFixed(1)}%` : "—"}</td>
                            <td className="px-3 py-2 text-center">
                              {tr > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statut.cls}`}>{statut.label}</span>}
                            </td>
                          </tr>
                          {expanded && (
                            <tr key={`${row.id}-detail`} className="bg-neutral-50 border-b border-neutral-200">
                              <td colSpan={9} className="px-4 py-3">
                                <div className="grid grid-cols-12 gap-1 mb-2">
                                  {MONTHS.map((m, mi) => {
                                    const pv = p(row.amounts[mi]);
                                    const rv = p((row.amountsReel || [])[mi]);
                                    const ec = rv - pv;
                                    return (
                                      <div key={mi} className="text-center">
                                        <div className="text-[9px] text-neutral-400 font-medium mb-1">{m}</div>
                                        <div className="text-[10px] text-neutral-600">{pv > 0 ? fmt(pv) : "—"}</div>
                                        <input type="text" value={(row.amountsReel || [])[mi] || ""}
                                          onChange={e => updAmtReel(row.id, mi, e.target.value)}
                                          placeholder="Réel"
                                          className="w-full bg-white border border-indigo-200 rounded px-1 py-0.5 text-[10px] text-right text-indigo-700 mt-0.5" />
                                        {rv > 0 && (
                                          <div className={`text-[9px] font-bold mt-0.5 ${ec >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {ec >= 0 ? "+" : ""}{fmt(ec)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="text-[10px] text-neutral-400">
                                  Note : {row.note || "—"} | Libellé : {row.label || "—"}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ COURBE ═══ */}
        {subTab === "courbe" && (
          <div className="p-4 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                <div className="text-[10px] text-neutral-400 uppercase font-medium">Écart Global</div>
                <div className={`text-lg font-black ${totalReel - totalPrevu >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {hasReelData ? fmt(totalReel - totalPrevu) : "—"} {ccySym}
                </div>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                <div className="text-[10px] text-neutral-400 uppercase font-medium">Mois Critique</div>
                <div className="text-lg font-black text-rose-700">
                  {stats.cons.cum.findIndex(v => v < 0) >= 0 ? MONTHS[stats.cons.cum.findIndex(v => v < 0)] : "Aucun"}
                </div>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                <div className="text-[10px] text-neutral-400 uppercase font-medium">Point de Divergence</div>
                <div className="text-lg font-black text-amber-700">
                  {divergenceMonth >= 0 ? MONTHS[divergenceMonth] : "—"}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-lg border border-neutral-100 p-4">
              <div className="text-sm font-semibold text-neutral-900 mb-4">Solde Cumulatif — Plan vs Réalisé vs Bande Scénarios</div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => fmt(v) + " " + ccySym} contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area dataKey="optimiste" fill="#d1fae5" stroke="none" fillOpacity={0.3} name="Bande optimiste" />
                  <Area dataKey="pessimiste" fill="#fecdd3" stroke="none" fillOpacity={0.3} name="Bande pessimiste" />
                  <Line type="monotone" dataKey="plan" stroke="#64748b" strokeWidth={2} strokeDasharray="8 4" dot={false} name="Budget (plan)" />
                  <Line type="monotone" dataKey="reel" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} name="Réalisé" />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
              {!hasReelData && (
                <div className="text-center text-neutral-400 text-xs mt-2">
                  Aucune donnée réalisée — la courbe Réalisé sera à 0 jusqu'à la saisie des montants réels.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ WATERFALL ═══ */}
        {subTab === "waterfall" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-neutral-900">Waterfall Budget → Réalisé</span>
              <select value={wfMonth} onChange={e => setWfMonth(Number(e.target.value))}
                className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs">
                {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
              </select>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wfData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} />
                <Tooltip formatter={(v: number) => fmt(v) + " " + ccySym} contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="prevu" fill="#94a3b8" name="Prévu" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reel" name="Réalisé" radius={[4, 4, 0, 0]}>
                  {wfData.map((entry, i) => (
                    <Cell key={i} fill={entry.delta >= 0 ? "#10b981" : "#f43f5e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Detail table */}
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-neutral-50 text-neutral-500">
                <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                <th className="px-3 py-2 text-right font-medium">Prévu</th>
                <th className="px-3 py-2 text-right font-medium">Réalisé</th>
                <th className="px-3 py-2 text-right font-medium">Écart</th>
                <th className="px-3 py-2 text-right font-medium">%</th>
                <th className="px-3 py-2 text-center font-medium">Impact</th>
              </tr></thead>
              <tbody>
                {wfData.map(d => {
                  const pctV = d.prevu > 0 ? ((d.reel - d.prevu) / d.prevu * 100) : 0;
                  return (
                    <tr key={d.name} className="border-b border-neutral-100">
                      <td className="px-3 py-2 font-semibold text-neutral-900">{d.name}</td>
                      <td className="px-3 py-2 text-right text-neutral-600">{fmt(d.prevu)}</td>
                      <td className="px-3 py-2 text-right text-indigo-700 font-semibold">{d.reel > 0 ? fmt(d.reel) : "—"}</td>
                      <td className={`px-3 py-2 text-right font-bold ${d.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{d.reel > 0 ? fmt(d.delta) : "—"}</td>
                      <td className={`px-3 py-2 text-right ${d.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{d.reel > 0 ? `${pctV >= 0 ? "+" : ""}${pctV.toFixed(1)}%` : "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {d.delta > 0 ? <span className="text-emerald-600 font-bold">↑ Surperf.</span> :
                         d.delta < 0 ? <span className="text-rose-600 font-bold">↓ Sous-perf.</span> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ COMMENTAIRES ═══ */}
        {subTab === "comments" && (
          <div className="p-4">
            <div className="text-sm font-semibold text-neutral-900 mb-3">Lignes avec écart significatif (&gt; 15%)</div>
            {(() => {
              const alertRows = rows.filter(r => {
                const tp = r.amounts.reduce((s, v) => s + p(v), 0);
                const tr = (r.amountsReel || []).reduce((s, v) => s + p(v), 0);
                return tp > 0 && tr > 0 && Math.abs(ecartPct(tp, tr)) > 15;
              });
              if (alertRows.length === 0) return (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  Aucun écart significatif détecté. Saisissez des données réalisées pour voir les écarts.
                </div>
              );
              return (
                <div className="space-y-3">
                  {alertRows.map(row => {
                    const tp = row.amounts.reduce((s, v) => s + p(v), 0);
                    const tr = (row.amountsReel || []).reduce((s, v) => s + p(v), 0);
                    const pctVal = ecartPct(tp, tr);
                    const statut = ecartStatut(pctVal);
                    return (
                      <div key={row.id} className={`rounded-lg border p-3 ${Math.abs(pctVal) > 30 ? "bg-rose-50/50 border-rose-200" : "bg-amber-50/50 border-amber-200"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statut.cls}`}>{statut.label}</span>
                            <span className="text-xs font-bold text-neutral-900">{row.type}</span>
                            <span className="text-[10px] text-neutral-400">{row.entity} · {row.bank}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-neutral-500">Prévu: {fmt(tp)}</span>
                            <span className="text-indigo-700 font-bold">Réalisé: {fmt(tr)}</span>
                            <span className={`font-black ${pctVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {pctVal >= 0 ? "+" : ""}{pctVal.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <select
                            value={row.note?.startsWith("[") ? row.note.split("]")[0].slice(1) : ""}
                            onChange={e => {
                              const tag = e.target.value;
                              const comment = row.note?.includes("]") ? row.note.split("]").slice(1).join("]").trim() : (row.note || "");
                              upd(row.id, "note", tag ? `[${tag}] ${comment}` : comment);
                            }}
                            className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-[10px] w-44"
                          >
                            <option value="">— Tag —</option>
                            {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <input
                            value={row.note?.includes("]") ? row.note.split("]").slice(1).join("]").trim() : (row.note || "")}
                            onChange={e => {
                              const tag = row.note?.startsWith("[") ? row.note.split("]")[0] + "] " : "";
                              upd(row.id, "note", tag + e.target.value);
                            }}
                            placeholder="Commentaire sur l'écart…"
                            className="flex-1 bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
