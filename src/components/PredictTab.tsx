import { MONTHS } from "../constants";
import { fmt } from "../lib/helpers";
import type { AppStats, MLResultsData } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  stats: AppStats;
  aiMsg: string;
  aiLoading: boolean;
  runAI: () => void;
  mlResults: MLResultsData | null;
  mlLoading: boolean;
  runML: () => void;
  rowCount: number;
}

export default function Prophet3tModal({ open, onClose, stats, aiMsg, aiLoading, runAI, mlResults, mlLoading, runML, rowCount }: Props) {
  if (!open) return null;

  const mlDisabled = rowCount === 0 || mlLoading;
  const aiDisabled = aiLoading || rowCount < 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-primary-200 w-full max-w-3xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-primary-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <div>
              <div className="text-sm font-bold text-primary-900">Proph3t</div>
              <div className="text-[10px] text-primary-500">Intelligence predictive · 7 algorithmes ML · {rowCount} flux</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              stats.healthScore.global >= 70 ? "bg-emerald-100 text-emerald-700" :
              stats.healthScore.global >= 40 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
            }`}>
              Score {stats.healthScore.global}/100
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-primary-100 flex items-center justify-center text-primary-400 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 py-3 border-b border-primary-100 flex-shrink-0">
          <button onClick={runML} disabled={mlDisabled}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mlDisabled
                ? "bg-primary-100 text-primary-400 cursor-not-allowed"
                : "bg-primary-900 text-white hover:bg-primary-800"
            }`}>
            {mlLoading ? (
              <><span className="w-3 h-3 border-2 border-primary-400 border-t-white rounded-full animate-spin" /> Calcul ML…</>
            ) : "Moteur ML Local"}
          </button>
          <button onClick={runAI} disabled={aiDisabled}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              aiDisabled
                ? "bg-primary-100 text-primary-400 cursor-not-allowed"
                : "bg-primary-900 text-white hover:bg-primary-800"
            }`}>
            {aiLoading ? (
              <><span className="w-3 h-3 border-2 border-primary-400 border-t-white rounded-full animate-spin" /> Analyse…</>
            ) : "Diagnostic Proph3t"}
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Empty state */}
          {!mlResults && !aiMsg && !aiLoading && (
            <div className="text-center py-12">
              <svg className="w-8 h-8 mx-auto text-primary-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p className="text-xs text-primary-500 max-w-sm mx-auto leading-relaxed">
                {rowCount < 3
                  ? "Saisissez au moins 3 lignes de flux pour activer Proph3t."
                  : "Lancez le Moteur ML puis le Diagnostic pour obtenir l'analyse complete en 10 axes."}
              </p>
            </div>
          )}

          {/* Loading AI */}
          {aiLoading && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-900 rounded-full animate-spin mx-auto mb-3" />
              <div className="text-xs text-primary-500">Analyse en cours…</div>
            </div>
          )}

          {/* ML Results */}
          {mlResults && (
            <div className="grid grid-cols-2 gap-3">

              {/* Ensemble Predictions */}
              <div className="rounded-xl border border-primary-200 overflow-hidden">
                <div className="px-3 py-2 bg-primary-50 border-b border-primary-100 text-[11px] font-semibold text-primary-900">
                  Previsions Ensemble
                </div>
                <table className="w-full text-[11px]">
                  <thead><tr className="text-primary-400">
                    <th className="text-left px-3 py-1.5 font-medium">Modele</th>
                    <th className="text-right px-2 py-1.5 font-medium">M+1</th>
                    <th className="text-right px-2 py-1.5 font-medium">M+2</th>
                    <th className="text-right px-2 py-1.5 font-medium">M+3</th>
                  </tr></thead>
                  <tbody>
                    {(["ARIMA", "SARIMA", "LSTM"] as const).map(name => {
                      const vals = mlResults.predictions[name.toLowerCase() as "arima" | "sarima" | "lstm"];
                      return (
                        <tr key={name} className="border-t border-primary-50">
                          <td className="px-3 py-1 text-primary-500">{name}</td>
                          <td className="text-right px-2 py-1 text-primary-600">{fmt(vals[0] || 0)}</td>
                          <td className="text-right px-2 py-1 text-primary-600">{fmt(vals[1] || 0)}</td>
                          <td className="text-right px-2 py-1 text-primary-600">{fmt(vals[2] || 0)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-primary-200 bg-primary-50">
                      <td className="px-3 py-1.5 font-bold text-primary-900">Ensemble</td>
                      <td className="text-right px-2 py-1.5 font-bold text-primary-900">{fmt(mlResults.predictions.ensemble[0] || 0)}</td>
                      <td className="text-right px-2 py-1.5 font-bold text-primary-900">{fmt(mlResults.predictions.ensemble[1] || 0)}</td>
                      <td className="text-right px-2 py-1.5 font-bold text-primary-900">{fmt(mlResults.predictions.ensemble[2] || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Monte Carlo */}
              <div className="rounded-xl border border-primary-200 overflow-hidden">
                <div className="px-3 py-2 bg-primary-50 border-b border-primary-100 text-[11px] font-semibold text-primary-900">
                  Monte Carlo · {(mlResults.monteCarlo.nbSimulations / 1000).toFixed(0)}k sim.
                </div>
                <div className="px-3 py-2 space-y-1">
                  {([
                    ["P5", mlResults.monteCarlo.p5],
                    ["P25", mlResults.monteCarlo.p25],
                    ["P50", mlResults.monteCarlo.p50],
                    ["P75", mlResults.monteCarlo.p75],
                    ["P95", mlResults.monteCarlo.p95],
                  ] as [string, number][]).map(([label, val]) => (
                    <div key={label} className="flex justify-between text-[11px]">
                      <span className="text-primary-400">{label}</span>
                      <span className={`font-medium ${val >= 0 ? "text-primary-700" : "text-rose-600"}`}>{fmt(val)}</span>
                    </div>
                  ))}
                  <div className="pt-1.5 mt-1.5 border-t border-primary-100 flex justify-between items-center text-[11px]">
                    <span className="text-primary-500">P(positif)</span>
                    <span className={`font-bold ${
                      mlResults.monteCarlo.probPositif > 70 ? "text-emerald-600" :
                      mlResults.monteCarlo.probPositif > 50 ? "text-amber-600" : "text-rose-600"
                    }`}>{mlResults.monteCarlo.probPositif.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-primary-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      mlResults.monteCarlo.probPositif > 70 ? "bg-emerald-500" :
                      mlResults.monteCarlo.probPositif > 50 ? "bg-amber-500" : "bg-rose-500"
                    }`} style={{ width: `${Math.min(100, mlResults.monteCarlo.probPositif)}%` }} />
                  </div>
                </div>
              </div>

              {/* Risk Scoring */}
              <div className="rounded-xl border border-primary-200 overflow-hidden">
                <div className="px-3 py-2 bg-primary-50 border-b border-primary-100 text-[11px] font-semibold text-primary-900">
                  Scoring de risque
                </div>
                <div className="px-3 py-2 space-y-2">
                  {mlResults.riskScores.map(rs => {
                    const bar = rs.couleur === "emerald" ? "bg-emerald-500" :
                      rs.couleur === "amber" ? "bg-amber-500" :
                      rs.couleur === "orange" ? "bg-orange-500" : "bg-rose-500";
                    const txt = rs.couleur === "emerald" ? "text-emerald-600" :
                      rs.couleur === "amber" ? "text-amber-600" :
                      rs.couleur === "orange" ? "text-orange-600" : "text-rose-600";
                    return (
                      <div key={rs.entite}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-primary-600 truncate mr-2">{rs.nom}</span>
                          <span className={`font-semibold flex-shrink-0 ${txt}`}>{rs.probabiliteRisque.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1 bg-primary-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, rs.probabiliteRisque)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* K-Means */}
              <div className="rounded-xl border border-primary-200 overflow-hidden">
                <div className="px-3 py-2 bg-primary-50 border-b border-primary-100 text-[11px] font-semibold text-primary-900">
                  Clustering K-Means
                </div>
                <table className="w-full text-[11px]">
                  <thead><tr className="text-primary-400">
                    <th className="text-left px-3 py-1.5 font-medium">Entite</th>
                    <th className="text-center px-2 py-1.5 font-medium">Groupe</th>
                    <th className="text-right px-3 py-1.5 font-medium">BFR M</th>
                  </tr></thead>
                  <tbody>
                    {mlResults.clusters.map(c => (
                      <tr key={c.id} className="border-t border-primary-50">
                        <td className="px-3 py-1 text-primary-600 truncate max-w-[120px]">{c.nom}</td>
                        <td className="text-center px-2 py-1 text-primary-400">{c.clusterLabel}</td>
                        <td className={`text-right px-3 py-1 font-medium ${c.profil[2] >= 0 ? "text-primary-700" : "text-rose-600"}`}>
                          {fmt(c.profil[2])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Isolation Forest — full width */}
              <div className="col-span-2 rounded-xl border border-primary-200 overflow-hidden">
                <div className="px-3 py-2 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-primary-900">Isolation Forest · Anomalies mensuelles</span>
                  <span className="text-[9px] text-primary-400">&gt;0.70 critique · 0.55–0.70 moderee · &lt;0.55 normal</span>
                </div>
                <div className="p-3 grid grid-cols-12 gap-1.5">
                  {mlResults.isolationForest.map((item, i) => {
                    const cls = item.score > 0.70
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : item.score > 0.55
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-primary-50 border-primary-200 text-primary-500";
                    return (
                      <div key={i} className={`rounded-lg border p-1 text-center ${cls}`}>
                        <div className="text-[8px] font-semibold">{MONTHS[i]}</div>
                        <div className="text-xs font-bold">{item.score.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* AI Response */}
          {aiMsg && !aiLoading && (
            <div className="rounded-xl border border-primary-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-primary-50 border-b border-primary-100 text-xs font-semibold text-primary-900">
                Diagnostic · 10 axes
              </div>
              <div className="p-4 text-xs text-primary-700 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                {aiMsg}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
