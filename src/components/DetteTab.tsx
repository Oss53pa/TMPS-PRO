import { useState, useMemo, useEffect } from "react";
import { ENTITIES, BANKS, MONTHS } from "../constants";
import { fmt, uid } from "../lib/helpers";
import { local } from "../lib/storage";
import Icon from "./ui/Icon";
import type { CreditFacility, DebtSchedule } from "../types";

interface Props {
  ccySym: string;
}

const TABS = ["Tableau de Bord", "Amortissements", "Covenants", "Nouvelle Facilité"] as const;

const TYPE_LABELS: Record<string, string> = {
  emprunt_lt: "Emprunt LT", ligne_ct: "Ligne CT", credit_bail: "Crédit-bail",
  decouvert: "Découvert", obligataire: "Obligataire",
};

export default function DetteTab({ ccySym }: Props) {
  const [sub, setSub] = useState<(typeof TABS)[number]>("Tableau de Bord");
  const [facilities, setFacilities] = useState<CreditFacility[]>([]);
  const [schedules, setSchedules] = useState<DebtSchedule[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    entity: ENTITIES[0].id, bank: BANKS[0], type: "emprunt_lt" as CreditFacility["type"],
    limitAmount: "", drawnAmount: "", ccy: "XOF", rateType: "fixe" as "fixe" | "variable",
    rateValue: "", maturityDate: "", status: "actif" as CreditFacility["status"],
  });

  // Load from localStorage
  useEffect(() => {
    const f = local.load<CreditFacility[]>("facilities");
    if (f) setFacilities(f);
    const s = local.load<DebtSchedule[]>("schedules");
    if (s) setSchedules(s);
  }, []);

  // Save
  useEffect(() => {
    local.save("facilities", facilities);
    local.save("schedules", schedules);
  }, [facilities, schedules]);

  // KPIs
  const kpis = useMemo(() => {
    const active = facilities.filter(f => f.status === "actif");
    const totalDrawn = active.reduce((s, f) => s + f.drawnAmount, 0);
    const totalLimit = active.reduce((s, f) => s + f.limitAmount, 0);
    const totalAvail = totalLimit - totalDrawn;
    const utilPct = totalLimit > 0 ? (totalDrawn / totalLimit) * 100 : 0;
    const cmpc = totalDrawn > 0
      ? active.reduce((s, f) => s + f.drawnAmount * f.rateValue, 0) / totalDrawn
      : 0;
    return { totalDrawn, totalLimit, totalAvail, utilPct, cmpc, count: active.length };
  }, [facilities]);

  // Generate amortization schedule
  const generateSchedule = (fac: CreditFacility) => {
    const months = Math.max(1, Math.round(
      (new Date(fac.maturityDate).getTime() - Date.now()) / (30.44 * 24 * 3600 * 1000)
    ));
    const principal = fac.drawnAmount;
    const monthlyRate = fac.rateValue / 100 / 12;
    const monthlyPayment = monthlyRate > 0
      ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
      : principal / months;

    let balance = principal;
    const newSchedules: DebtSchedule[] = [];
    const startDate = new Date();

    for (let i = 0; i < months && balance > 0; i++) {
      const interest = balance * monthlyRate;
      const cap = Math.min(balance, monthlyPayment - interest);
      balance -= cap;
      const payDate = new Date(startDate);
      payDate.setMonth(payDate.getMonth() + i + 1);

      newSchedules.push({
        id: uid(),
        facilityId: fac.id,
        paymentDate: payDate.toISOString().split("T")[0],
        principal: Math.round(cap),
        interest: Math.round(interest),
        total: Math.round(cap + interest),
        balanceAfter: Math.round(Math.max(0, balance)),
        status: "à_payer",
      });
    }

    setSchedules(prev => [...prev.filter(s => s.facilityId !== fac.id), ...newSchedules]);
  };

  const addFacility = () => {
    const newFac: CreditFacility = {
      id: uid(),
      entity: form.entity, bank: form.bank, type: form.type,
      limitAmount: parseFloat(form.limitAmount) || 0,
      drawnAmount: parseFloat(form.drawnAmount) || 0,
      ccy: form.ccy, rateType: form.rateType,
      rateValue: parseFloat(form.rateValue) || 0,
      maturityDate: form.maturityDate, status: form.status,
    };
    setFacilities(prev => [...prev, newFac]);
    generateSchedule(newFac);
    setForm({ ...form, limitAmount: "", drawnAmount: "", rateValue: "", maturityDate: "" });
    setSub("Tableau de Bord");
  };

  const facSchedules = selectedFacility ? schedules.filter(s => s.facilityId === selectedFacility) : [];
  const selectedFac = facilities.find(f => f.id === selectedFacility);

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setSub(t)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${sub === t ? "border-blue-600 text-blue-700" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ═══ TABLEAU DE BORD ═══ */}
      {sub === "Tableau de Bord" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border p-4">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Encours total</div>
              <div className="text-lg font-black tabular-nums">{fmt(kpis.totalDrawn)}</div>
              <div className="text-[10px] text-neutral-400">{ccySym}</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Disponible</div>
              <div className="text-lg font-black text-emerald-600 tabular-nums">{fmt(kpis.totalAvail)}</div>
              <div className="text-[10px] text-neutral-400">{ccySym}</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Taux utilisation</div>
              <div className={`text-lg font-black tabular-nums ${kpis.utilPct > 80 ? "text-rose-600" : kpis.utilPct > 60 ? "text-amber-600" : "text-emerald-600"}`}>
                {kpis.utilPct.toFixed(1)}%
              </div>
              <div className="w-full h-1.5 bg-neutral-100 rounded-full mt-1">
                <div className={`h-full rounded-full ${kpis.utilPct > 80 ? "bg-rose-500" : kpis.utilPct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, kpis.utilPct)}%` }} />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">CMPC-Dette</div>
              <div className="text-lg font-black tabular-nums">{kpis.cmpc.toFixed(2)}%</div>
              <div className="text-[10px] text-neutral-400">Coût moyen pondéré</div>
            </div>
          </div>

          {facilities.length === 0 ? (
            <div className="bg-neutral-50 rounded-xl border p-8 text-center">
              <div className="mb-2"><Icon name="bank" className="w-8 h-8 text-primary-300" /></div>
              <div className="text-sm font-semibold text-neutral-500">Aucune facilité de crédit</div>
              <div className="text-xs text-neutral-400 mt-1">Ajoutez une facilité via l'onglet "Nouvelle Facilité"</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b">
                    <th className="text-left px-3 py-2 font-semibold">Entité</th>
                    <th className="text-left px-3 py-2 font-semibold">Banque</th>
                    <th className="text-left px-3 py-2 font-semibold">Type</th>
                    <th className="text-right px-3 py-2 font-semibold">Autorisé</th>
                    <th className="text-right px-3 py-2 font-semibold">Tiré</th>
                    <th className="text-right px-3 py-2 font-semibold">Disponible</th>
                    <th className="text-right px-3 py-2 font-semibold">Taux</th>
                    <th className="text-left px-3 py-2 font-semibold">Échéance</th>
                    <th className="text-left px-3 py-2 font-semibold">Statut</th>
                    <th className="px-3 py-2 font-semibold">Util.</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map(f => {
                    const util = f.limitAmount > 0 ? (f.drawnAmount / f.limitAmount) * 100 : 0;
                    return (
                      <tr key={f.id} className="border-b hover:bg-neutral-50">
                        <td className="px-3 py-2">{f.entity}</td>
                        <td className="px-3 py-2">{f.bank}</td>
                        <td className="px-3 py-2"><span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{TYPE_LABELS[f.type] || f.type}</span></td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(f.limitAmount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(f.drawnAmount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{fmt(f.limitAmount - f.drawnAmount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{f.rateValue}% {f.rateType === "variable" ? "(var)" : ""}</td>
                        <td className="px-3 py-2">{f.maturityDate}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${f.status === "actif" ? "bg-emerald-100 text-emerald-700" : f.status === "défaut" ? "bg-rose-100 text-rose-700" : "bg-neutral-100 text-neutral-500"}`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="w-16 h-1.5 bg-neutral-100 rounded-full">
                            <div className={`h-full rounded-full ${util > 80 ? "bg-rose-500" : util > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(100, util)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ AMORTISSEMENTS ═══ */}
      {sub === "Amortissements" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-neutral-500">Facilité :</label>
            <select value={selectedFacility || ""} onChange={e => setSelectedFacility(e.target.value || null)}
              className="border rounded px-2 py-1.5 text-xs flex-1 max-w-md">
              <option value="">— Sélectionner —</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.entity} · {f.bank} · {TYPE_LABELS[f.type]} · {fmt(f.limitAmount)} {f.ccy}</option>
              ))}
            </select>
          </div>

          {selectedFac && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border p-3">
                <div className="text-[10px] text-neutral-500">Capital total</div>
                <div className="text-sm font-bold tabular-nums">{fmt(selectedFac.drawnAmount)}</div>
              </div>
              <div className="bg-white rounded-xl border p-3">
                <div className="text-[10px] text-neutral-500">Total intérêts</div>
                <div className="text-sm font-bold tabular-nums text-amber-600">{fmt(facSchedules.reduce((s, sc) => s + sc.interest, 0))}</div>
              </div>
              <div className="bg-white rounded-xl border p-3">
                <div className="text-[10px] text-neutral-500">Total remboursé</div>
                <div className="text-sm font-bold tabular-nums text-emerald-600">{fmt(facSchedules.filter(s => s.status === "payé").reduce((a, s) => a + s.total, 0))}</div>
              </div>
              <div className="bg-white rounded-xl border p-3">
                <div className="text-[10px] text-neutral-500">Restant dû</div>
                <div className="text-sm font-bold tabular-nums text-rose-600">{fmt(facSchedules.length > 0 ? facSchedules[facSchedules.length - 1].balanceAfter : 0)}</div>
              </div>
            </div>
          )}

          {facSchedules.length > 0 ? (
            <div className="bg-white rounded-xl border overflow-auto max-h-[500px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-neutral-50 border-b">
                    <th className="text-left px-3 py-2 font-semibold">#</th>
                    <th className="text-left px-3 py-2 font-semibold">Date</th>
                    <th className="text-right px-3 py-2 font-semibold">Capital</th>
                    <th className="text-right px-3 py-2 font-semibold">Intérêts</th>
                    <th className="text-right px-3 py-2 font-semibold">Total</th>
                    <th className="text-right px-3 py-2 font-semibold">Solde restant</th>
                    <th className="text-left px-3 py-2 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {facSchedules.map((s, i) => (
                    <tr key={s.id} className="border-b hover:bg-neutral-50">
                      <td className="px-3 py-2 text-neutral-400">{i + 1}</td>
                      <td className="px-3 py-2">{s.paymentDate}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(s.principal)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-600">{fmt(s.interest)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(s.total)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(s.balanceAfter)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => setSchedules(prev => prev.map(sc => sc.id === s.id ? { ...sc, status: sc.status === "payé" ? "à_payer" : "payé" } : sc))}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${s.status === "payé" ? "bg-emerald-100 text-emerald-700" : s.status === "en_retard" ? "bg-rose-100 text-rose-700" : "bg-neutral-100 text-neutral-500"}`}>
                          {s.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-neutral-50 rounded-xl border p-8 text-center text-xs text-neutral-400">
              {selectedFacility ? "Aucun échéancier pour cette facilité" : "Sélectionnez une facilité de crédit"}
            </div>
          )}
        </div>
      )}

      {/* ═══ COVENANTS ═══ */}
      {sub === "Covenants" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "DSCR", value: kpis.totalDrawn > 0 ? (kpis.totalLimit / kpis.totalDrawn) : 2.0, target: 1.2, unit: "x", desc: "Debt Service Coverage Ratio" },
              { label: "Leverage", value: kpis.totalDrawn > 0 ? kpis.totalDrawn / Math.max(1, kpis.totalLimit - kpis.totalDrawn) : 0, target: 3.5, unit: "x", desc: "Dette nette / EBITDA proxy" },
              { label: "Gearing", value: kpis.totalDrawn > 0 ? kpis.totalDrawn / Math.max(1, kpis.totalLimit) : 0, target: 1.0, unit: "x", desc: "Dette / Capitaux propres proxy" },
            ].map(cov => {
              const ok = cov.label === "DSCR" ? cov.value >= cov.target : cov.value <= cov.target;
              const warning = cov.label === "DSCR"
                ? cov.value >= cov.target * 0.9 && cov.value < cov.target
                : cov.value <= cov.target * 1.1 && cov.value > cov.target;
              const statusColor = ok ? "emerald" : warning ? "amber" : "rose";
              const statusLabel = ok ? "OK" : warning ? "Warning" : "Breach";

              return (
                <div key={cov.label} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-bold">{cov.label}</div>
                      <div className="text-[10px] text-neutral-400">{cov.desc}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-${statusColor}-100 text-${statusColor}-700`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className={`text-2xl font-black tabular-nums text-${statusColor}-600`}>
                      {cov.value.toFixed(2)}{cov.unit}
                    </div>
                    <div className="text-xs text-neutral-400 pb-1">
                      cible: {cov.label === "DSCR" ? ">" : "<"} {cov.target}{cov.unit}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full rounded-full bg-${statusColor}-500 transition-all`}
                      style={{ width: `${Math.min(100, (cov.value / (cov.target * 2)) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
            Les covenants sont calculés à partir des données de dette saisies. Pour des ratios précis, importez les données du Grand Livre (onglet Grand Livre).
          </div>
        </div>
      )}

      {/* ═══ NOUVELLE FACILITÉ ═══ */}
      {sub === "Nouvelle Facilité" && (
        <div className="bg-white rounded-xl border p-4 max-w-2xl">
          <h3 className="text-sm font-bold mb-4">Ajouter une facilité de crédit</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Entité</label>
              <select value={form.entity} onChange={e => setForm({ ...form, entity: e.target.value })}
                className="border rounded px-2 py-1.5 text-xs w-full">
                {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Banque</label>
              <select value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })}
                className="border rounded px-2 py-1.5 text-xs w-full">
                {BANKS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
                className="border rounded px-2 py-1.5 text-xs w-full">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Devise</label>
              <select value={form.ccy} onChange={e => setForm({ ...form, ccy: e.target.value })}
                className="border rounded px-2 py-1.5 text-xs w-full">
                {["XOF", "EUR", "USD", "XAF"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Montant autorisé</label>
              <input type="number" value={form.limitAmount} onChange={e => setForm({ ...form, limitAmount: e.target.value })}
                className="border rounded px-2 py-1.5 text-xs w-full" placeholder="500 000 000" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Montant tiré</label>
              <input type="number" value={form.drawnAmount} onChange={e => setForm({ ...form, drawnAmount: e.target.value })}
                className="border rounded px-2 py-1.5 text-xs w-full" placeholder="300 000 000" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Taux (%)</label>
              <div className="flex gap-2">
                <input type="number" step="0.01" value={form.rateValue} onChange={e => setForm({ ...form, rateValue: e.target.value })}
                  className="border rounded px-2 py-1.5 text-xs flex-1" placeholder="6.50" />
                <select value={form.rateType} onChange={e => setForm({ ...form, rateType: e.target.value as any })}
                  className="border rounded px-2 py-1.5 text-xs w-20">
                  <option value="fixe">Fixe</option>
                  <option value="variable">Var.</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Date d'échéance</label>
              <input type="date" value={form.maturityDate} onChange={e => setForm({ ...form, maturityDate: e.target.value })}
                className="border rounded px-2 py-1.5 text-xs w-full" />
            </div>
          </div>
          <button onClick={addFacility}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition w-full"
            disabled={!form.limitAmount || !form.maturityDate}>
            Ajouter et générer l'échéancier
          </button>
        </div>
      )}
    </div>
  );
}
