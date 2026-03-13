import { useState } from "react";
import { MONTHS, SCENARIOS, ENTITIES, IAS7, BANKS, sectionTextColor } from "../constants";
import { fmt } from "../lib/helpers";
import type { AppStats } from "../types";
import KpiCard from "./ui/KpiCard";
import BarChart from "./ui/BarChart";

interface Props {
  stats: AppStats;
  scenario: string;
  ccySym: string;
}

const ScoreGauge = ({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) => {
  const color = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-rose-600";
  const ring = score >= 70 ? "stroke-emerald-500" : score >= 40 ? "stroke-amber-500" : "stroke-rose-500";
  const r = size === "lg" ? 36 : 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className={`flex flex-col items-center ${size === "sm" ? "gap-0.5" : "gap-1"}`}>
      <div className="relative">
        <svg width={size === "lg" ? 88 : 48} height={size === "lg" ? 88 : 48} className="-rotate-90">
          <circle cx={size === "lg" ? 44 : 24} cy={size === "lg" ? 44 : 24} r={r} fill="none" stroke="#e5e5e5" strokeWidth={size === "lg" ? 6 : 4} />
          <circle cx={size === "lg" ? 44 : 24} cy={size === "lg" ? 44 : 24} r={r} fill="none" className={ring} strokeWidth={size === "lg" ? 6 : 4}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center ${color} font-black ${size === "lg" ? "text-lg" : "text-xs"}`}>{score}</div>
      </div>
      <div className={`text-primary-500 font-medium ${size === "lg" ? "text-xs" : "text-[10px]"}`}>{label}</div>
    </div>
  );
};

const TABS = [
  { key: "overview",  label: "Vue d'ensemble" },
  { key: "charts",    label: "Graphiques" },
  { key: "table",     label: "Tableau mensuel" },
  { key: "entities",  label: "Entités & Prévisions" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function Dashboard({ stats, scenario, ccySym }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const totalEnc = stats.cons.monthly.reduce((s, m) => s + m.enc, 0);
  const totalDec = stats.cons.monthly.reduce((s, m) => s + m.dec, 0);
  const fluxNet = totalEnc - totalDec;
  const soldeFinal = stats.cons.cum[11] || 0;
  const hs = stats.healthScore;
  const tf = stats.tafire;

  const chargesJour = totalDec / 365;
  const couvertureJours = chargesJour > 0 ? Math.round(soldeFinal / chargesJour) : 0;

  const bankVolumes = BANKS.map(b => {
    const bk = stats.byBank[b];
    return { name: b, vol: bk ? bk.monthly.reduce((s, m) => s + m.enc + m.dec, 0) : 0 };
  }).filter(b => b.vol > 0).sort((a, b) => b.vol - a.vol);
  const totalBankVol = bankVolumes.reduce((s, b) => s + b.vol, 0);

  const barData = MONTHS.map((m, mi) => ({
    label: m,
    enc: stats.cons.monthly[mi].enc,
    dec: stats.cons.monthly[mi].dec,
  }));

  return (
    <div className="p-4 w-full flex flex-col h-[calc(100vh-88px)]">

      {/* ═══ TAB BAR ═══ */}
      <div className="flex gap-1 bg-primary-100 rounded-lg p-1 mb-4 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === t.key
                ? "bg-white text-primary-900 shadow-sm"
                : "text-primary-500 hover:text-primary-900 hover:bg-white/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="flex-1 overflow-y-auto space-y-4">

        {/* ────── VUE D'ENSEMBLE ────── */}
        {activeTab === "overview" && (
          <>
            {/* KPIs principaux */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
              <div className="bg-white rounded-xl border border-primary-200 p-4 flex flex-col items-center justify-center">
                <ScoreGauge score={hs.global} label="Score Santé" />
                <div className="text-[10px] text-primary-400 mt-1">
                  {hs.global >= 70 ? "Bonne santé" : hs.global >= 40 ? "Vigilance requise" : "Situation critique"}
                </div>
              </div>
              <KpiCard label="Total Encaissements" value={totalEnc} color="emerald" ccy={ccySym} />
              <KpiCard label="Total Décaissements" value={totalDec} color="rose" ccy={ccySym} />
              <KpiCard label="Flux Net Annuel" value={fluxNet} color="neutral" ccy={ccySym} />
              <KpiCard label="Solde Consolidé" value={soldeFinal} color="blue" ccy={ccySym} />
              <div className={`rounded-xl p-4 border ${couvertureJours >= 90 ? "bg-emerald-50 border-emerald-200" : couvertureJours >= 30 ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}>
                <div className="text-primary-500 text-xs font-medium mb-1">Couverture Liquidité</div>
                <div className={`text-xl font-black ${couvertureJours >= 90 ? "text-emerald-600" : couvertureJours >= 30 ? "text-amber-600" : "text-rose-600"}`}>
                  {couvertureJours}j
                </div>
                <div className="text-primary-400 text-xs mt-0.5">charges fixes couvertes</div>
              </div>
            </div>

            {/* Scoring + TAFIRE + IAS7 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Scoring 10 dimensions */}
              <div className="bg-white rounded-xl border border-primary-200 p-4">
                <div className="text-sm font-semibold text-primary-900 mb-3">Scoring Santé Financière</div>
                <div className="grid grid-cols-5 gap-2">
                  <ScoreGauge score={hs.liquidite} label="Liquidité" size="sm" />
                  <ScoreGauge score={hs.bfr} label="BFR" size="sm" />
                  <ScoreGauge score={hs.levier} label="Levier" size="sm" />
                  <ScoreGauge score={hs.dscr} label="DSCR" size="sm" />
                  <ScoreGauge score={hs.expositionChange} label="FX" size="sm" />
                  <ScoreGauge score={hs.nivellement} label="Nivellement" size="sm" />
                  <ScoreGauge score={hs.conformite} label="Conformité" size="sm" />
                  <ScoreGauge score={hs.previsionVsRealise} label="Prévisions" size="sm" />
                  <ScoreGauge score={hs.diversificationBancaire} label="Banques" size="sm" />
                  <ScoreGauge score={hs.qualiteTresorerie} label="Qualité" size="sm" />
                </div>
              </div>

              {/* TAFIRE Résumé */}
              <div className="bg-white rounded-xl border border-primary-200 p-4">
                <div className="text-sm font-semibold text-primary-900 mb-3">TAFIRE — Résumé SYSCOHADA</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-primary-100">
                    <span className="text-primary-600">CAFG (Capacité d'Autofinancement)</span>
                    <span className={`font-bold ${tf.partI.cafg >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(tf.partI.cafg)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-primary-100">
                    <span className="text-primary-600">Total Ressources</span>
                    <span className="font-bold text-emerald-600">{fmt(tf.partI.totalRessources)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-primary-100">
                    <span className="text-primary-600">Total Emplois</span>
                    <span className="font-bold text-rose-600">{fmt(tf.partI.totalEmplois)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-primary-200 bg-primary-50 -mx-4 px-4">
                    <span className="font-bold text-primary-900">Variation Fonds de Roulement</span>
                    <span className={`font-black ${tf.partI.variationFR >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(tf.partI.variationFR)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-primary-100">
                    <span className="text-primary-600">Variation BFR Exploitation</span>
                    <span className={`font-bold ${tf.partII.variationBfrExploitation >= 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(tf.partII.variationBfrExploitation)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-primary-900 text-white -mx-4 px-4 rounded-lg">
                    <span className="font-bold">Variation Trésorerie Nette</span>
                    <span className="font-black">{fmt(tf.partII.variationTresorerieNette)}</span>
                  </div>
                </div>
              </div>

              {/* IAS7 par section */}
              <div className="space-y-3">
                {IAS7.map(s => {
                  const total = stats.cons.monthly.reduce((sum, m) => sum + ((m as any)[s.key] || 0), 0);
                  return (
                    <div key={s.key} className="bg-white rounded-xl p-4 border border-primary-200">
                      <div className="text-primary-500 text-xs font-medium mb-1">{s.icon} {s.label}</div>
                      <div className={`text-lg font-bold ${total >= 0 ? sectionTextColor[s.color] : "text-red-600"}`}>{fmt(total)}</div>
                      <div className="text-primary-400 text-xs">{ccySym}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ────── GRAPHIQUES ────── */}
        {activeTab === "charts" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-primary-200 p-4">
              <div className="text-sm font-semibold text-primary-900 mb-3">Encaissements vs Décaissements — {SCENARIOS.find(s => s.key === scenario)?.label}</div>
              <BarChart data={barData} height={280} />
              <div className="flex gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1 text-xs text-primary-500"><div className="w-2.5 h-2.5 rounded bg-emerald-400" /> Encaissements</div>
                <div className="flex items-center gap-1 text-xs text-primary-500"><div className="w-2.5 h-2.5 rounded bg-rose-400" /> Décaissements</div>
              </div>
            </div>

            {/* Diversification Bancaire */}
            <div className="bg-white rounded-xl border border-primary-200 p-4">
              <div className="text-sm font-semibold text-primary-900 mb-3">Répartition Bancaire</div>
              <div className="space-y-2">
                {bankVolumes.slice(0, 6).map(b => {
                  const pct = totalBankVol > 0 ? (b.vol / totalBankVol) * 100 : 0;
                  return (
                    <div key={b.name} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-primary-700 font-medium">{b.name}</span>
                        <span className="text-primary-500">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-primary-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 40 ? "bg-rose-400" : pct > 25 ? "bg-amber-400" : "bg-primary-700"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {bankVolumes.length === 0 && <div className="text-primary-400 text-xs py-4 text-center">Aucun flux bancaire</div>}
              </div>
            </div>
          </div>
        )}

        {/* ────── TABLEAU MENSUEL ────── */}
        {activeTab === "table" && (
          <div className="bg-white rounded-xl border border-primary-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-primary-100 bg-primary-50">
              <span className="text-sm font-semibold text-primary-900">Évolution mensuelle consolidée</span>
              <span className="text-xs text-primary-400 ml-2">— {SCENARIOS.find(s => s.key === scenario)?.label} · {ccySym}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-max w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-primary-50 text-primary-500">
                    <th className="px-3 py-2 text-left sticky left-0 bg-primary-50 font-medium">Indicateur</th>
                    {MONTHS.map(m => <th key={m} className="px-3 py-2 text-right font-medium">{m}</th>)}
                    <th className="px-3 py-2 text-right font-medium bg-primary-100">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "enc", label: "Encaissements", tc: "text-emerald-600" },
                    { key: "dec", label: "Décaissements", tc: "text-rose-600" },
                    { key: "ope", label: "Flux Opérationnels", tc: "text-emerald-700" },
                    { key: "inv", label: "Flux Investissement", tc: "text-blue-700" },
                    { key: "fin", label: "Flux Financement", tc: "text-purple-700" },
                    { key: "bfr", label: "BFR", tc: "text-amber-600" },
                    { key: "cum", label: "Solde cumulatif", tc: "text-primary-900 font-bold" },
                  ].map(({ key, label, tc }) => (
                    <tr key={key} className="border-b border-primary-100 hover:bg-primary-50/50">
                      <td className={`px-3 py-1.5 font-medium ${tc} sticky left-0 bg-white`}>{label}</td>
                      {MONTHS.map((_, mi) => {
                        const v = key === "cum" ? stats.cons.cum[mi] : (stats.cons.monthly[mi] as any)[key] || 0;
                        return <td key={mi} className={`px-3 py-1.5 text-right ${v < 0 ? "text-red-600" : tc}`}>{fmt(v)}</td>;
                      })}
                      <td className="px-3 py-1.5 text-right font-bold bg-primary-100/50">
                        {fmt(key === "cum" ? stats.cons.cum[11] : MONTHS.reduce((s, _, mi) => s + ((stats.cons.monthly[mi] as any)[key] || 0), 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ────── ENTITÉS & PRÉVISIONS ────── */}
        {activeTab === "entities" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Per Entity Cards */}
            <div className="bg-white rounded-xl border border-primary-200 p-4">
              <div className="text-sm font-semibold text-primary-900 mb-3">Position par Entité</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ENTITIES.map(e => {
                  const d = stats.byEntity[e.id];
                  const enc = d.monthly.reduce((s, m) => s + m.enc, 0);
                  const dec = d.monthly.reduce((s, m) => s + m.dec, 0);
                  const net = enc - dec;
                  const bfr = stats.bfrKpi[e.id];
                  return (
                    <div key={e.id} className="rounded-lg border border-primary-200 p-3 hover:border-primary-300 transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-xs font-bold text-primary-900">{e.name}</div>
                          <div className="text-[10px] text-primary-400">{e.country} · {e.ccy}</div>
                        </div>
                        <div className={`text-xs font-black px-1.5 py-0.5 rounded ${net >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {net >= 0 ? "+" : ""}{fmt(net)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <div><span className="text-primary-400">Enc.</span><div className="text-emerald-600 font-semibold">{fmt(enc)}</div></div>
                        <div><span className="text-primary-400">Déc.</span><div className="text-rose-600 font-semibold">{fmt(dec)}</div></div>
                        <div><span className="text-primary-400">BFR Net</span><div className={`font-semibold ${bfr?.bfrNet >= 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(bfr?.bfrNet || 0)}</div></div>
                      </div>
                      <div className="flex h-1.5 mt-2 rounded-full overflow-hidden bg-primary-100">
                        <div className="bg-emerald-400 rounded-l-full" style={{ width: `${enc + dec > 0 ? (enc / (enc + dec)) * 100 : 50}%` }} />
                        <div className="bg-rose-400 rounded-r-full" style={{ width: `${enc + dec > 0 ? (dec / (enc + dec)) * 100 : 50}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prédictions & Alertes */}
            <div className="space-y-3">
              {/* Prédictions M+1/2/3 */}
              <div className="bg-white rounded-xl border border-primary-200 p-4">
                <div className="text-sm font-semibold text-primary-900 mb-3">Prévisions Consolidées M+1 à M+3</div>
                <div className="grid grid-cols-3 gap-3">
                  {["M+1", "M+2", "M+3"].map((label, i) => (
                    <div key={label} className="text-center">
                      <div className="text-xs text-primary-400 mb-1">{label}</div>
                      <div className={`text-sm font-black ${stats.consPred[i] >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {fmt(stats.consPred[i])}
                      </div>
                      <div className="text-[10px] text-primary-400">{ccySym}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BFR Synthèse */}
              <div className="bg-white rounded-xl border border-primary-200 p-4">
                <div className="text-sm font-semibold text-primary-900 mb-3">BFR par Entité (DSO / DPO)</div>
                <div className="space-y-2">
                  {ENTITIES.map(e => {
                    const bfr = stats.bfrKpi[e.id];
                    if (!bfr) return null;
                    const signal = bfr.bfrNet > 0 ? "Besoin" : bfr.bfrNet < 0 ? "Ressource" : "Équilibré";
                    const signalColor = bfr.bfrNet > 0 ? "text-amber-600 bg-amber-50" : bfr.bfrNet < 0 ? "text-emerald-600 bg-emerald-50" : "text-primary-600 bg-primary-50";
                    return (
                      <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-primary-100 last:border-0">
                        <span className="text-primary-700 font-medium w-28">{e.id}</span>
                        <span className="text-primary-500">DSO {bfr.dso}j</span>
                        <span className="text-primary-500">DPO {bfr.dpo}j</span>
                        <span className={`font-bold ${bfr.bfrNet >= 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(bfr.bfrNet)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${signalColor}`}>{signal}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Alerts */}
              {stats.niveauAlerts.length > 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <div className="text-xs font-semibold text-amber-700 mb-2">{stats.niveauAlerts.length} Alerte(s) de nivellement</div>
                  <div className="space-y-1">
                    {stats.niveauAlerts.slice(0, 4).map((a, i) => (
                      <div key={i} className={`text-xs px-2 py-1 rounded flex justify-between ${a.type === "excédent" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
                        <span><b>{a.bank}</b> — {a.month}</span>
                        <span>{fmt(a.ecart)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anomalies détectées */}
              {stats.predRows.some(r => r.anomalies.length > 0) && (
                <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
                  <div className="text-xs font-semibold text-rose-700 mb-2">
                    {stats.predRows.reduce((s, r) => s + r.anomalies.length, 0)} Anomalie(s) détectée(s)
                  </div>
                  <div className="space-y-1">
                    {stats.predRows
                      .filter(r => r.anomalies.length > 0)
                      .slice(0, 3)
                      .map((r, i) => (
                        <div key={i} className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded">
                          <b>{r.type}</b> ({r.entity}) — Z={r.anomalies[0].z} en {MONTHS[r.anomalies[0].mi]}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
