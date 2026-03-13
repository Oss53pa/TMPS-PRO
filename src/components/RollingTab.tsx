import { useMemo } from "react";
import { MONTHS, SCENARIOS, IAS7, HORIZONS } from "../constants";
import { fmt } from "../lib/helpers";
import type { AppStats } from "../types";

interface Props {
  stats: AppStats;
  scenario: string;
  horizon: string;
  setHorizon: (h: string) => void;
}

/* ── Helper: generate daily forecast from monthly data ── */
interface DailyRow {
  date: Date;
  label: string;          // dd/MM
  enc: number;
  dec: number;
  ope: number;
  inv: number;
  fin: number;
  bfr: number;
  net: number;
  cum: number;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function buildDailyForecast(stats: AppStats, days: number): DailyRow[] {
  const today = new Date();
  const year = today.getFullYear();
  const rows: DailyRow[] = [];
  let cum = 0;

  // Get cumulative position up to yesterday
  const currentMonth = today.getMonth();
  if (currentMonth > 0) {
    cum = stats.cons.cum[currentMonth - 1];
  }
  // Prorate current month up to today
  const dimCurrent = daysInMonth(year, currentMonth);
  const dayOfMonth = today.getDate();
  const mData = stats.cons.monthly[currentMonth];
  if (mData) {
    const dailyEnc = mData.enc / dimCurrent;
    const dailyDec = mData.dec / dimCurrent;
    cum += (dailyEnc - dailyDec) * (dayOfMonth - 1);
  }

  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const mi = date.getMonth();
    const dim = daysInMonth(date.getFullYear(), mi);
    const m = mi < 12 ? stats.cons.monthly[mi] : undefined;

    const enc = m ? m.enc / dim : 0;
    const dec = m ? m.dec / dim : 0;
    const ope = m ? m.ope / dim : 0;
    const inv = m ? m.inv / dim : 0;
    const fin = m ? m.fin / dim : 0;
    const bfr = m ? m.bfr / dim : 0;
    const net = enc - dec;
    cum += net;

    rows.push({
      date,
      label: `${String(date.getDate()).padStart(2, "0")}/${String(mi + 1).padStart(2, "0")}`,
      enc, dec, ope, inv, fin, bfr, net, cum,
    });
  }
  return rows;
}

function horizonDays(h: string): number {
  if (h === "J+7") return 7;
  if (h === "J+30") return 30;
  if (h === "J+90") return 90;
  return 0;
}

export default function RollingTab({ stats, scenario, horizon, setHorizon }: Props) {
  const dailyRows = useMemo(() => {
    const d = horizonDays(horizon);
    return d > 0 ? buildDailyForecast(stats, d) : [];
  }, [stats, horizon]);

  // Weekly aggregation for J+90
  const weeklyRows = useMemo(() => {
    if (horizon !== "J+90") return [];
    const weeks: { label: string; enc: number; dec: number; net: number; cum: number }[] = [];
    for (let i = 0; i < dailyRows.length; i += 7) {
      const chunk = dailyRows.slice(i, i + 7);
      const enc = chunk.reduce((s, r) => s + r.enc, 0);
      const dec = chunk.reduce((s, r) => s + r.dec, 0);
      const lastCum = chunk[chunk.length - 1].cum;
      weeks.push({
        label: `S${Math.floor(i / 7) + 1} (${chunk[0].label}–${chunk[chunk.length - 1].label})`,
        enc, dec, net: enc - dec, cum: lastCum,
      });
    }
    return weeks;
  }, [dailyRows, horizon]);

  // Summary KPIs for non-annual views
  const kpis = useMemo(() => {
    if (dailyRows.length === 0) return null;
    const totalEnc = dailyRows.reduce((s, r) => s + r.enc, 0);
    const totalDec = dailyRows.reduce((s, r) => s + r.dec, 0);
    const minCum = Math.min(...dailyRows.map(r => r.cum));
    const lastCum = dailyRows[dailyRows.length - 1].cum;
    const daysNeg = dailyRows.filter(r => r.cum < 0).length;
    return { totalEnc, totalDec, net: totalEnc - totalDec, minCum, lastCum, daysNeg };
  }, [dailyRows]);

  return (
    <div className="p-4 space-y-4 w-full">
      <div className="flex gap-2 mb-2">
        {HORIZONS.map(h => (
          <button key={h} onClick={() => setHorizon(h)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${horizon === h ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
            {h}
          </button>
        ))}
      </div>

      {/* ═══ ANNUEL ═══ */}
      {horizon === "Annuel" && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
            <span className="text-sm font-semibold text-neutral-900">Vision annuelle</span>
            <span className="text-xs text-neutral-400 ml-2">— {SCENARIOS.find(s => s.key === scenario)?.label}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-xs border-collapse">
              <thead><tr className="bg-neutral-50 text-neutral-500">
                <th className="px-3 py-2 text-left sticky left-0 bg-neutral-50 font-medium">Section</th>
                {MONTHS.map(m => <th key={m} className="px-3 py-2 text-right font-medium">{m}</th>)}
                <th className="px-3 py-2 text-right bg-neutral-100 font-medium">Total</th>
              </tr></thead>
              <tbody>
                {[
                  ...IAS7.map(s => ({ label: s.icon + " " + s.label, key: s.key, tc: "text-neutral-700" })),
                  { label: "BFR", key: "bfr", tc: "text-amber-600" },
                  { label: "Solde cumulatif", key: "cum", tc: "text-neutral-900 font-bold" },
                ].map(({ label, key, tc }) => (
                  <tr key={key} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                    <td className={`px-3 py-2 font-medium ${tc} sticky left-0 bg-white`}>{label}</td>
                    {MONTHS.map((_, mi) => {
                      const v = key === "cum" ? stats.cons.cum[mi] : ((stats.cons.monthly[mi] as any)[key] || 0);
                      return <td key={mi} className={`px-3 py-2 text-right ${v < 0 ? "text-red-600" : tc}`}>{fmt(v)}</td>;
                    })}
                    <td className="px-3 py-2 text-right font-bold bg-neutral-100/50">
                      {fmt(key === "cum" ? stats.cons.cum[11] : MONTHS.reduce((s, _, mi) => s + ((stats.cons.monthly[mi] as any)[key] || 0), 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ J+7 / J+30 (daily view) ═══ */}
      {(horizon === "J+7" || horizon === "J+30") && kpis && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Encaissements</div>
              <div className="text-lg font-black text-emerald-600">{fmt(kpis.totalEnc)}</div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Décaissements</div>
              <div className="text-lg font-black text-rose-600">{fmt(kpis.totalDec)}</div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Flux net</div>
              <div className={`text-lg font-black ${kpis.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(kpis.net)}</div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Solde min.</div>
              <div className={`text-lg font-black ${kpis.minCum >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(kpis.minCum)}</div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Jours négatifs</div>
              <div className={`text-lg font-black ${kpis.daysNeg === 0 ? "text-emerald-600" : "text-rose-600"}`}>{kpis.daysNeg}</div>
            </div>
          </div>

          {/* Daily Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
              <span className="text-sm font-semibold text-neutral-900">Prévisionnel glissant {horizon}</span>
              <span className="text-xs text-neutral-400 ml-2">— Ventilation journalière depuis les données mensuelles</span>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500 sticky top-0">
                    <th className="px-3 py-2 text-left font-medium sticky left-0 bg-neutral-50">Date</th>
                    <th className="px-3 py-2 text-right font-medium">Enc.</th>
                    <th className="px-3 py-2 text-right font-medium">Déc.</th>
                    <th className="px-3 py-2 text-right font-medium">Net</th>
                    <th className="px-3 py-2 text-right font-medium">Cumulé</th>
                    <th className="px-3 py-2 text-center font-medium w-32">Tendance</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((r, i) => {
                    const isWeekend = r.date.getDay() === 0 || r.date.getDay() === 6;
                    return (
                      <tr key={i} className={`border-b border-neutral-100 ${isWeekend ? "bg-neutral-50/50" : "hover:bg-neutral-50/50"}`}>
                        <td className={`px-3 py-1.5 font-medium sticky left-0 ${isWeekend ? "bg-neutral-50/50 text-neutral-400" : "bg-white text-neutral-700"}`}>
                          {r.label} {isWeekend && <span className="w-1.5 h-1.5 rounded-full bg-primary-400 inline-block" />}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600">{fmt(r.enc)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-rose-600">{fmt(r.dec)}</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${r.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {r.net >= 0 ? "+" : ""}{fmt(r.net)}
                        </td>
                        <td className={`px-3 py-1.5 text-right tabular-nums font-bold ${r.cum >= 0 ? "text-neutral-900" : "text-rose-600"}`}>
                          {fmt(r.cum)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {/* Mini bar */}
                          <div className="flex items-center gap-1 justify-center">
                            <div className="w-16 h-2 bg-neutral-100 rounded-full overflow-hidden">
                              {r.cum >= 0 ? (
                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(100, (r.cum / (kpis!.lastCum || 1)) * 50 + 50)}%` }} />
                              ) : (
                                <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.min(100, Math.abs(r.cum / (kpis!.minCum || 1)) * 50)}%` }} />
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ J+90 (weekly aggregation) ═══ */}
      {horizon === "J+90" && kpis && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Encaissements 90j</div>
              <div className="text-lg font-black text-emerald-600">{fmt(kpis.totalEnc)}</div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Décaissements 90j</div>
              <div className="text-lg font-black text-rose-600">{fmt(kpis.totalDec)}</div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Flux net 90j</div>
              <div className={`text-lg font-black ${kpis.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(kpis.net)}</div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Solde min.</div>
              <div className={`text-lg font-black ${kpis.minCum >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(kpis.minCum)}</div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-3 text-center">
              <div className="text-[10px] text-neutral-500 uppercase font-medium">Jours négatifs</div>
              <div className={`text-lg font-black ${kpis.daysNeg === 0 ? "text-emerald-600" : "text-rose-600"}`}>{kpis.daysNeg} / 90</div>
            </div>
          </div>

          {/* Weekly Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
              <span className="text-sm font-semibold text-neutral-900">Prévisionnel glissant J+90</span>
              <span className="text-xs text-neutral-400 ml-2">— Agrégation hebdomadaire</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500">
                    <th className="px-3 py-2 text-left font-medium">Semaine</th>
                    <th className="px-3 py-2 text-right font-medium">Encaissements</th>
                    <th className="px-3 py-2 text-right font-medium">Décaissements</th>
                    <th className="px-3 py-2 text-right font-medium">Flux net</th>
                    <th className="px-3 py-2 text-right font-medium">Solde cumulé</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyRows.map((w, i) => (
                    <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                      <td className="px-3 py-2 font-medium text-neutral-700">{w.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{fmt(w.enc)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-600">{fmt(w.dec)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${w.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {w.net >= 0 ? "+" : ""}{fmt(w.net)}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-bold ${w.cum >= 0 ? "text-neutral-900" : "text-rose-600"}`}>
                        {fmt(w.cum)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily detail expandable */}
          <details className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <summary className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 cursor-pointer text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition">
              Détail journalier ({dailyRows.length} jours)
            </summary>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500 sticky top-0">
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-right font-medium">Enc.</th>
                    <th className="px-3 py-2 text-right font-medium">Déc.</th>
                    <th className="px-3 py-2 text-right font-medium">Net</th>
                    <th className="px-3 py-2 text-right font-medium">Cumulé</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((r, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      <td className="px-3 py-1 text-neutral-700">{r.label}</td>
                      <td className="px-3 py-1 text-right tabular-nums text-emerald-600">{fmt(r.enc)}</td>
                      <td className="px-3 py-1 text-right tabular-nums text-rose-600">{fmt(r.dec)}</td>
                      <td className={`px-3 py-1 text-right tabular-nums ${r.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(r.net)}</td>
                      <td className={`px-3 py-1 text-right tabular-nums font-bold ${r.cum >= 0 ? "text-neutral-900" : "text-rose-600"}`}>{fmt(r.cum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
