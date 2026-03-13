import { useState, useMemo } from "react";
import { MONTHS, ENTITIES, BANKS } from "../constants";
import { p, fmt } from "../lib/helpers";
import type { FlowRow, AppStats, NiveauAlert } from "../types";
import Icon from "./ui/Icon";

interface Props {
  rows: FlowRow[];
  stats: AppStats;
  ccySym: string;
}

const TABS = ["Dashboard", "Paramétrage"] as const;

type AlertRule = {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  threshold: number;
  unit: string;
  description: string;
};

const DEFAULT_RULES: AlertRule[] = [
  { id: "solde_negatif", label: "Solde négatif", icon: "alert", enabled: true, threshold: 0, unit: "XOF", description: "Alerte quand un compte bancaire passe en négatif" },
  { id: "seuil_min", label: "Seuil minimum", icon: "warning", enabled: true, threshold: 5000000, unit: "XOF", description: "Alerte quand le solde est inférieur au seuil de sécurité" },
  { id: "seuil_max", label: "Seuil maximum", icon: "trendUp", enabled: true, threshold: 500000000, unit: "XOF", description: "Alerte quand le solde dépasse le plafond (trésorerie oisive)" },
  { id: "ecart_plan", label: "Écart Plan vs Réel > 30%", icon: "target", enabled: true, threshold: 30, unit: "%", description: "Alerte quand l'écart entre prévisionnel et réalisé dépasse le seuil" },
  { id: "concentration", label: "Concentration bancaire", icon: "bank", enabled: true, threshold: 60, unit: "%", description: "Alerte quand plus de X% de la trésorerie est concentrée sur une seule banque" },
  { id: "fx_exposure", label: "Exposition de change", icon: "currency", enabled: true, threshold: 20, unit: "%", description: "Alerte quand l'exposition à une devise dépasse le seuil" },
  { id: "bfr_degrade", label: "BFR dégradé", icon: "droplet", enabled: true, threshold: 90, unit: "jours", description: "Alerte quand le cycle BFR (DSO - DPO) dépasse le seuil en jours" },
];

type AlertSeverity = "critical" | "warning" | "info";

interface GeneratedAlert {
  id: string;
  rule: string;
  ruleLabel: string;
  icon: string;
  severity: AlertSeverity;
  message: string;
  entity?: string;
  bank?: string;
  month?: string;
  value: number;
  threshold: number;
}

export default function AlertesTab({ rows, stats, ccySym }: Props) {
  const [sub, setSub] = useState<(typeof TABS)[number]>("Dashboard");
  const [rules, setRules] = useState<AlertRule[]>(DEFAULT_RULES);
  const [filterSeverity, setFilterSeverity] = useState<"all" | AlertSeverity>("all");

  // ── Generate alerts from data ──
  const alerts = useMemo(() => {
    const result: GeneratedAlert[] = [];
    let alertId = 0;

    // 1. Nivellement alerts from stats
    const rSoldeNeg = rules.find(r => r.id === "solde_negatif");
    const rSeuilMin = rules.find(r => r.id === "seuil_min");
    const rSeuilMax = rules.find(r => r.id === "seuil_max");

    stats.niveauAlerts.forEach((a: NiveauAlert) => {
      if (a.type === "min" && rSeuilMin?.enabled) {
        result.push({
          id: `alert-${alertId++}`,
          rule: "seuil_min",
          ruleLabel: "Seuil minimum",
          icon: "warning",
          severity: a.ecart < -10000000 ? "critical" : "warning",
          message: `${a.bank} passe sous le seuil min en ${a.month} : ${fmt(a.val)} (seuil: ${fmt(a.seuil)})`,
          bank: a.bank,
          month: a.month,
          value: a.val,
          threshold: a.seuil,
        });
      }
      if (a.type === "max" && rSeuilMax?.enabled) {
        result.push({
          id: `alert-${alertId++}`,
          rule: "seuil_max",
          ruleLabel: "Seuil maximum",
          icon: "trendUp",
          severity: "info",
          message: `${a.bank} dépasse le plafond en ${a.month} : ${fmt(a.val)} (plafond: ${fmt(a.seuil)})`,
          bank: a.bank,
          month: a.month,
          value: a.val,
          threshold: a.seuil,
        });
      }
    });

    // 2. Negative balance alerts
    if (rSoldeNeg?.enabled) {
      Object.entries(stats.byBank).forEach(([bank, data]) => {
        data.cum.forEach((val, mi) => {
          if (val < 0) {
            result.push({
              id: `alert-${alertId++}`,
              rule: "solde_negatif",
              ruleLabel: "Solde négatif",
              icon: "alert",
              severity: "critical",
              message: `${bank} en solde négatif en ${MONTHS[mi]} : ${fmt(val)} ${ccySym}`,
              bank,
              month: MONTHS[mi],
              value: val,
              threshold: 0,
            });
          }
        });
      });
    }

    // 3. Écart Plan vs Réel
    const rEcart = rules.find(r => r.id === "ecart_plan");
    if (rEcart?.enabled) {
      rows.forEach(row => {
        row.amounts.forEach((planStr, mi) => {
          const plan = p(planStr);
          const reel = p(row.amountsReel?.[mi]);
          if (plan !== 0 && reel !== 0) {
            const ecartPct = Math.abs((reel - plan) / plan) * 100;
            if (ecartPct > rEcart.threshold) {
              result.push({
                id: `alert-${alertId++}`,
                rule: "ecart_plan",
                ruleLabel: "Écart Plan vs Réel",
                icon: "target",
                severity: ecartPct > 50 ? "critical" : "warning",
                message: `${row.label || row.type} (${row.entity}) en ${MONTHS[mi]} : écart de ${ecartPct.toFixed(0)}% (plan: ${fmt(plan)}, réel: ${fmt(reel)})`,
                entity: row.entity,
                month: MONTHS[mi],
                value: ecartPct,
                threshold: rEcart.threshold,
              });
            }
          }
        });
      });
    }

    // 4. Concentration bancaire
    const rConc = rules.find(r => r.id === "concentration");
    if (rConc?.enabled) {
      const totalByBank: Record<string, number> = {};
      let grandTotal = 0;
      Object.entries(stats.byBank).forEach(([bank, data]) => {
        const lastCum = data.cum[data.cum.length - 1] || 0;
        const abs = Math.abs(lastCum);
        totalByBank[bank] = abs;
        grandTotal += abs;
      });
      if (grandTotal > 0) {
        Object.entries(totalByBank).forEach(([bank, val]) => {
          const pct = (val / grandTotal) * 100;
          if (pct > rConc.threshold) {
            result.push({
              id: `alert-${alertId++}`,
              rule: "concentration",
              ruleLabel: "Concentration bancaire",
              icon: "bank",
              severity: pct > 80 ? "critical" : "warning",
              message: `${bank} concentre ${pct.toFixed(0)}% de la trésorerie totale (seuil: ${rConc.threshold}%)`,
              bank,
              value: pct,
              threshold: rConc.threshold,
            });
          }
        });
      }
    }

    // 5. FX exposure
    const rFx = rules.find(r => r.id === "fx_exposure");
    if (rFx?.enabled) {
      const ccyTotals: Record<string, number> = {};
      let total = 0;
      rows.forEach(row => {
        const ccy = row.ccy || "XOF";
        const sum = row.amounts.reduce((a, v) => a + Math.abs(p(v)), 0);
        ccyTotals[ccy] = (ccyTotals[ccy] || 0) + sum;
        total += sum;
      });
      if (total > 0) {
        Object.entries(ccyTotals).forEach(([ccy, val]) => {
          if (ccy === "XOF") return;
          const pct = (val / total) * 100;
          if (pct > rFx.threshold) {
            result.push({
              id: `alert-${alertId++}`,
              rule: "fx_exposure",
              ruleLabel: "Exposition de change",
              icon: "currency",
              severity: "warning",
              message: `Exposition ${ccy} = ${pct.toFixed(1)}% des flux totaux (seuil: ${rFx.threshold}%)`,
              value: pct,
              threshold: rFx.threshold,
            });
          }
        });
      }
    }

    return result;
  }, [rows, stats, rules, ccySym]);

  const filtered = filterSeverity === "all" ? alerts : alerts.filter(a => a.severity === filterSeverity);

  const countBySeverity = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 };
    alerts.forEach(a => c[a.severity]++);
    return c;
  }, [alerts]);

  const severityStyle = (s: AlertSeverity) => {
    if (s === "critical") return "bg-rose-50 border-rose-200 text-rose-800";
    if (s === "warning") return "bg-amber-50 border-amber-200 text-amber-800";
    return "bg-blue-50 border-blue-200 text-blue-800";
  };

  const severityBadge = (s: AlertSeverity) => {
    if (s === "critical") return "bg-rose-100 text-rose-700";
    if (s === "warning") return "bg-amber-100 text-amber-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="p-4 space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setSub(t)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${sub === t ? "border-rose-600 text-rose-700" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>
            {t}
            {t === "Dashboard" && alerts.length > 0 && (
              <span className="ml-1.5 bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ DASHBOARD ═══ */}
      {sub === "Dashboard" && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border p-4">
              <div className="text-2xl font-black">{alerts.length}</div>
              <div className="text-xs text-neutral-500">Alertes totales</div>
            </div>
            <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
              <div className="text-2xl font-black text-rose-700">{countBySeverity.critical}</div>
              <div className="text-xs text-rose-600">Critiques</div>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="text-2xl font-black text-amber-700">{countBySeverity.warning}</div>
              <div className="text-xs text-amber-600">Avertissements</div>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="text-2xl font-black text-blue-700">{countBySeverity.info}</div>
              <div className="text-xs text-blue-600">Informations</div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Filtrer :</span>
            {(["all", "critical", "warning", "info"] as const).map(s => (
              <button key={s} onClick={() => setFilterSeverity(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${filterSeverity === s
                  ? s === "critical" ? "bg-rose-600 text-white"
                    : s === "warning" ? "bg-amber-500 text-white"
                      : s === "info" ? "bg-blue-600 text-white"
                        : "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}>
                {s === "all" ? "Toutes" : s === "critical" ? "Critiques" : s === "warning" ? "Avertissements" : "Info"}
              </button>
            ))}
          </div>

          {/* Alerts list */}
          {filtered.length === 0 ? (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-8 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm font-semibold text-emerald-700">Aucune alerte</div>
              <div className="text-xs text-emerald-600 mt-1">Tous les indicateurs sont dans les seuils normaux.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(alert => (
                <div key={alert.id} className={`rounded-lg border p-3 ${severityStyle(alert.severity)}`}>
                  <div className="flex items-start gap-3">
                    <Icon name={alert.icon} className="w-3.5 h-3.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${severityBadge(alert.severity)}`}>
                          {alert.severity === "critical" ? "CRITIQUE" : alert.severity === "warning" ? "ATTENTION" : "INFO"}
                        </span>
                        <span className="text-[10px] font-medium opacity-75">{alert.ruleLabel}</span>
                        {alert.bank && <span className="text-[10px] opacity-60">· {alert.bank}</span>}
                        {alert.entity && <span className="text-[10px] opacity-60">· {alert.entity}</span>}
                        {alert.month && <span className="text-[10px] opacity-60">· {alert.month}</span>}
                      </div>
                      <div className="text-xs font-medium">{alert.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alerts by rule breakdown */}
          <div className="bg-white rounded-xl border p-4">
            <h4 className="text-xs font-bold mb-3">Répartition par type de règle</h4>
            <div className="space-y-2">
              {rules.filter(r => r.enabled).map(rule => {
                const count = alerts.filter(a => a.rule === rule.id).length;
                return (
                  <div key={rule.id} className="flex items-center gap-3">
                    <Icon name={rule.icon} className="w-3.5 h-3.5" />
                    <span className="text-xs flex-1">{rule.label}</span>
                    <span className={`text-xs font-bold tabular-nums ${count > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {count}
                    </span>
                    <div className="w-24 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${count > 0 ? "bg-rose-500" : "bg-emerald-500"}`}
                        style={{ width: `${alerts.length > 0 ? Math.min((count / alerts.length) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PARAMÉTRAGE ═══ */}
      {sub === "Paramétrage" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold mb-4">Configuration des règles d'alerte</h3>
            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div key={rule.id} className={`border rounded-lg p-4 transition ${rule.enabled ? "bg-white" : "bg-neutral-50 opacity-60"}`}>
                  <div className="flex items-center gap-3">
                    <Icon name={rule.icon} className="w-3.5 h-3.5" />
                    <div className="flex-1">
                      <div className="text-xs font-bold">{rule.label}</div>
                      <div className="text-[10px] text-neutral-500">{rule.description}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-neutral-500">Seuil :</label>
                        <input
                          type="number"
                          value={rule.threshold}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setRules(prev => prev.map((r, i) => i === idx ? { ...r, threshold: val } : r));
                          }}
                          className="border rounded px-2 py-1 text-xs w-28 text-right tabular-nums"
                          disabled={!rule.enabled}
                        />
                        <span className="text-[10px] text-neutral-500">{rule.unit}</span>
                      </div>
                      <button
                        onClick={() => setRules(prev => prev.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r))}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition ${rule.enabled ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-500"}`}>
                        {rule.enabled ? "Actif" : "Inactif"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-amber-700 mb-1">Note</div>
            <div className="text-xs text-amber-600">
              Les seuils de nivellement (min/max par banque) sont configurés dans l'onglet Nivellement → Seuils & Paramétrage.
              Les alertes ci-dessus sont des règles transversales qui s'appliquent à l'ensemble des données.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
