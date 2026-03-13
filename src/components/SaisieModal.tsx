import { useState } from "react";
import { ENTITIES, BANKS, CURRENCIES, MONTHS, FLOW_TYPES, PLAN_COMPTABLE, SCENARIOS, type CompteComptable } from "../constants";
import { p, fmt, newRow } from "../lib/helpers";
import type { FlowRow } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  formData: FlowRow;
  updateForm: (f: string, v: string) => void;
  updateFormAmt: (mi: number, v: string) => void;
  updateFormAmtReel: (mi: number, v: string) => void;
  fillAllMonths: (v: string) => void;
  fillAllMonthsReel: (v: string) => void;
  submitForm: () => void;
  setFormData: (fn: (d: FlowRow) => FlowRow) => void;
  planComptable?: CompteComptable[];
}

const STATUTS = [
  { key: "prevu", label: "Prévu" },
  { key: "engage", label: "Engagé" },
  { key: "realise", label: "Réalisé" },
  { key: "valide", label: "Validé" },
];

const RECURRENCES = [
  { key: "ponctuel", label: "Ponctuel" },
  { key: "mensuel", label: "Mensuel" },
  { key: "trimestriel", label: "Trimestriel" },
  { key: "annuel", label: "Annuel" },
];

const SECTIONS = [
  { key: "ope", label: "Opérationnel" },
  { key: "inv", label: "Investissement" },
  { key: "fin", label: "Financement" },
];

const SENS = [
  { cat: "enc", label: "Encaissement (entrée)" },
  { cat: "dec", label: "Décaissement (sortie)" },
  { cat: "bfr", label: "Variation BFR" },
  { cat: "pool", label: "Cash Pooling" },
];

const catColor: Record<string, { btn: string; total: string }> = {
  enc:  { btn: "bg-emerald-600 hover:bg-emerald-700", total: "text-emerald-600" },
  dec:  { btn: "bg-rose-600 hover:bg-rose-700",       total: "text-rose-600" },
  bfr:  { btn: "bg-amber-500 hover:bg-amber-600",     total: "text-amber-600" },
  pool: { btn: "bg-purple-600 hover:bg-purple-700",    total: "text-purple-600" },
};

const TABS = [
  { key: "general",  label: "Général" },
  { key: "plan",     label: "Montants Plan" },
  { key: "reel",     label: "Montants Réel" },
  { key: "synthese", label: "Synthèse" },
];
type TabKey = typeof TABS[number]["key"];

export default function SaisieModal({ open, onClose, formData, updateForm, updateFormAmt, updateFormAmtReel, fillAllMonths, fillAllMonthsReel, submitForm, setFormData, planComptable: pcProp }: Props) {
  const pc = pcProp || PLAN_COMPTABLE;
  const [quickFill, setQuickFill] = useState("");
  const [quickFillReel, setQuickFillReel] = useState("");
  const [tab, setTab] = useState<TabKey>("general");
  if (!open) return null;

  const allSectionTypes = FLOW_TYPES[formData.section] || [];
  // Filtrer les types par sens (enc/dec/bfr/pool) pour n'afficher que les types pertinents
  const filteredTypes = allSectionTypes.filter(t => t.cat === formData.cat);
  const availableTypes = filteredTypes.length > 0 ? filteredTypes : allSectionTypes;
  const typeLabel = formData.cat === "enc" ? "Classe de revenus" : formData.cat === "dec" ? "Classe de dépenses" : formData.cat === "bfr" ? "Type de variation BFR" : "Type de mouvement";
  const style = catColor[formData.cat] || catColor.enc;
  const totalPlan = formData.amounts.reduce((s, v) => s + p(v), 0);
  const reelArr = formData.amountsReel || Array(12).fill("");
  const totalReel = reelArr.reduce((s: number, v: string) => s + p(v), 0);
  const ecart = totalReel - totalPlan;

  const handleSubmit = () => { submitForm(); onClose(); };

  const sel = "bg-white border border-neutral-300 rounded px-3 py-2 w-full text-xs text-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none appearance-none";
  const inp = "bg-white border border-neutral-300 rounded px-3 py-2 w-full text-xs text-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none";
  const lbl = "text-[11px] text-neutral-500 mb-1 block font-medium";

  const tabIdx = TABS.findIndex(t => t.key === tab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setTab(TABS[tabIdx + 1].key); };
  const goPrev = () => { if (tabIdx > 0) setTab(TABS[tabIdx - 1].key); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-[900px] max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-sm font-bold text-neutral-900">Nouveau flux de trésorerie</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">×</button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-neutral-200 px-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition ${
                tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── GÉNÉRAL ── */}
          {tab === "general" && (
            <div className="space-y-4">
              {/* Tiers + Sens + Classification */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={lbl}>Tiers (client / fournisseur)</label>
                  <input value={formData.contrepartie || ""} onChange={e => updateForm("contrepartie", e.target.value)} className={inp} placeholder="Ex: SODECI, Orange CI, Bolloré…" />
                </div>
                <div>
                  <label className={lbl}>Sens du flux</label>
                  <select value={formData.cat} onChange={e => {
                    const newCat = e.target.value;
                    const types = (FLOW_TYPES[formData.section] || []).filter(t => t.cat === newCat);
                    setFormData(d => ({ ...d, cat: newCat, type: types[0]?.label || d.type }));
                  }} className={sel}>
                    {SENS.map(s => <option key={s.cat} value={s.cat}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>{typeLabel}</label>
                  <select value={formData.type} onChange={e => updateForm("type", e.target.value)} className={sel}>
                    {availableTypes.map(t => <option key={t.label}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Entité + Banque + Section + Devise */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={lbl}>Entité</label>
                  <select value={formData.entity} onChange={e => updateForm("entity", e.target.value)} className={sel}>
                    {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Banque</label>
                  <select value={formData.bank} onChange={e => updateForm("bank", e.target.value)} className={sel}>
                    {BANKS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Section</label>
                  <select value={formData.section} onChange={e => {
                    const sec = e.target.value;
                    const types = (FLOW_TYPES[sec] || []).filter(t => t.cat === formData.cat);
                    setFormData(d => ({ ...d, section: sec, type: types[0]?.label || FLOW_TYPES[sec]?.[0]?.label || d.type }));
                  }} className={sel}>
                    {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Devise</label>
                  <select value={formData.ccy} onChange={e => updateForm("ccy", e.target.value)} className={sel}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Scénario + Statut + Compte + Récurrence + Probabilité */}
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <label className={lbl}>Scénario</label>
                  <select value={formData.scenario || "base"} onChange={e => setFormData(d => ({ ...d, scenario: e.target.value }))} className={sel}>
                    {SCENARIOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Statut</label>
                  <select value={formData.statut || "prevu"} onChange={e => updateForm("statut", e.target.value)} className={sel}>
                    {STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Compte SYSCOHADA</label>
                  <select value={formData.compteComptable || ""} onChange={e => updateForm("compteComptable", e.target.value)} className={sel}>
                    <option value="">— Aucun —</option>
                    {pc.map(c => <option key={c.numero} value={c.numero}>{c.numero} — {c.libelle}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Récurrence</label>
                  <select value={formData.recurrence || "ponctuel"} onChange={e => updateForm("recurrence", e.target.value)} className={sel}>
                    {RECURRENCES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Probabilité (%)</label>
                  <input type="number" min={0} max={100} value={formData.probabilite ?? 100}
                    onChange={e => setFormData(d => ({ ...d, probabilite: Number(e.target.value) }))}
                    className={inp} />
                </div>
              </div>

              {/* Libellé + Réf + Dates + Proba */}
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2">
                  <label className={lbl}>Libellé</label>
                  <input value={formData.label} onChange={e => updateForm("label", e.target.value)} className={inp} placeholder="Ex: Loyer bureau Abidjan Q1" />
                </div>
                <div>
                  <label className={lbl}>Référence</label>
                  <input value={formData.reference || ""} onChange={e => updateForm("reference", e.target.value)} className={inp} placeholder="FAC-2026-001" />
                </div>
                <div>
                  <label className={lbl}>Date opération</label>
                  <input type="date" value={formData.dateOperation || ""} onChange={e => updateForm("dateOperation", e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Date valeur</label>
                  <input type="date" value={formData.dateValeur || ""} onChange={e => updateForm("dateValeur", e.target.value)} className={inp} />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className={lbl}>Note</label>
                <textarea value={formData.note} onChange={e => updateForm("note", e.target.value)} rows={2}
                  className="bg-white border border-neutral-300 rounded px-3 py-2 w-full text-xs text-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none resize-none"
                  placeholder="Commentaire optionnel…" />
              </div>
            </div>
          )}

          {/* ── MONTANTS PLAN ── */}
          {tab === "plan" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500">Montants prévisionnels en <strong>{formData.ccy}</strong></div>
                <div className="flex items-center gap-2">
                  <input type="text" value={quickFill} onChange={e => setQuickFill(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") fillAllMonths(quickFill); }}
                    placeholder="Montant…" className="border border-neutral-300 rounded px-2 py-1.5 w-24 text-right text-xs outline-none focus:border-blue-500" />
                  <button onClick={() => fillAllMonths(quickFill)}
                    className="bg-neutral-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-neutral-700 transition">
                    Appliquer ×12
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {MONTHS.map((m, mi) => (
                  <div key={mi}>
                    <label className="text-[10px] text-neutral-400 text-center block mb-1 font-medium">{m}</label>
                    <input type="text" value={formData.amounts[mi]} onChange={e => updateFormAmt(mi, e.target.value)}
                      className="border border-neutral-300 rounded px-2 py-2 w-full text-right text-sm font-mono text-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                      placeholder="0" />
                  </div>
                ))}
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 flex items-center justify-between border border-neutral-200">
                <span className="text-xs text-neutral-500">Total annuel plan</span>
                <span className={`text-lg font-black ${style.total}`}>
                  {formData.cat === "dec" ? "−" : "+"}{fmt(totalPlan)} {formData.ccy}
                </span>
              </div>
            </div>
          )}

          {/* ── MONTANTS RÉEL ── */}
          {tab === "reel" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500">Montants réalisés en <strong>{formData.ccy}</strong></div>
                <div className="flex items-center gap-2">
                  <input type="text" value={quickFillReel} onChange={e => setQuickFillReel(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") fillAllMonthsReel(quickFillReel); }}
                    placeholder="Montant…" className="border border-neutral-300 rounded px-2 py-1.5 w-24 text-right text-xs outline-none focus:border-blue-500" />
                  <button onClick={() => fillAllMonthsReel(quickFillReel)}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition">
                    Appliquer ×12
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {MONTHS.map((m, mi) => (
                  <div key={mi}>
                    <label className="text-[10px] text-blue-400 text-center block mb-1 font-medium">{m}</label>
                    <input type="text" value={reelArr[mi]} onChange={e => updateFormAmtReel(mi, e.target.value)}
                      className="border border-blue-200 rounded px-2 py-2 w-full text-right text-sm font-mono text-blue-800 bg-blue-50/30 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                      placeholder="0" />
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between border border-blue-200">
                <span className="text-xs text-blue-500">Total annuel réalisé</span>
                <span className="text-lg font-black text-blue-700">
                  {formData.cat === "dec" ? "−" : "+"}{fmt(totalReel)} {formData.ccy}
                </span>
              </div>
            </div>
          )}

          {/* ── SYNTHÈSE ── */}
          {tab === "synthese" && (
            <div className="space-y-4">
              {/* Recap */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <div className="text-neutral-400 mb-1">Identification</div>
                  <div className="space-y-0.5 text-neutral-700">
                    <div><span className="text-neutral-400">Sens :</span> {SENS.find(s => s.cat === formData.cat)?.label}</div>
                    <div><span className="text-neutral-400">Section :</span> {SECTIONS.find(s => s.key === formData.section)?.label}</div>
                    <div><span className="text-neutral-400">Scénario :</span> {SCENARIOS.find(s => s.key === formData.scenario)?.label || "Budget"}</div>
                    <div><span className="text-neutral-400">Statut :</span> {STATUTS.find(s => s.key === formData.statut)?.label || "Prévu"}</div>
                  </div>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <div className="text-neutral-400 mb-1">Organisation</div>
                  <div className="space-y-0.5 text-neutral-700">
                    <div><span className="text-neutral-400">Entité :</span> {ENTITIES.find(e => e.id === formData.entity)?.name}</div>
                    <div><span className="text-neutral-400">Banque :</span> {formData.bank}</div>
                    <div><span className="text-neutral-400">Devise :</span> {formData.ccy}</div>
                    <div><span className="text-neutral-400">Type :</span> {formData.type}</div>
                  </div>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <div className="text-neutral-400 mb-1">Détails</div>
                  <div className="space-y-0.5 text-neutral-700">
                    {formData.label && <div><span className="text-neutral-400">Libellé :</span> {formData.label}</div>}
                    {formData.contrepartie && <div><span className="text-neutral-400">Tiers :</span> {formData.contrepartie}</div>}
                    {formData.compteComptable && <div><span className="text-neutral-400">Compte :</span> {formData.compteComptable}</div>}
                    {formData.reference && <div><span className="text-neutral-400">Réf :</span> {formData.reference}</div>}
                    {(formData.probabilite ?? 100) < 100 && <div><span className="text-neutral-400">Probabilité :</span> {formData.probabilite}%</div>}
                    {formData.recurrence !== "ponctuel" && <div><span className="text-neutral-400">Récurrence :</span> {RECURRENCES.find(r => r.key === formData.recurrence)?.label}</div>}
                  </div>
                </div>
              </div>

              {/* Plan vs Réel table */}
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-3 py-2 text-left text-neutral-500 font-medium w-16"></th>
                      {MONTHS.map(m => <th key={m} className="px-1.5 py-2 text-right text-neutral-400 font-medium">{m}</th>)}
                      <th className="px-3 py-2 text-right text-neutral-700 font-bold bg-neutral-100">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100">
                      <td className="px-3 py-2 font-medium text-neutral-600">Plan</td>
                      {MONTHS.map((_, mi) => (
                        <td key={mi} className={`px-1.5 py-2 text-right font-mono ${p(formData.amounts[mi]) > 0 ? "text-neutral-700" : "text-neutral-300"}`}>
                          {p(formData.amounts[mi]) > 0 ? fmt(p(formData.amounts[mi])) : "—"}
                        </td>
                      ))}
                      <td className={`px-3 py-2 text-right font-bold bg-neutral-50 ${style.total}`}>{fmt(totalPlan)}</td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="px-3 py-2 font-medium text-blue-600">Réel</td>
                      {MONTHS.map((_, mi) => (
                        <td key={mi} className={`px-1.5 py-2 text-right font-mono ${p(reelArr[mi]) > 0 ? "text-blue-600" : "text-neutral-300"}`}>
                          {p(reelArr[mi]) > 0 ? fmt(p(reelArr[mi])) : "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-bold bg-neutral-50 text-blue-700">{totalReel > 0 ? fmt(totalReel) : "—"}</td>
                    </tr>
                    {totalReel > 0 && (
                      <tr className="border-b border-neutral-100">
                        <td className="px-3 py-2 font-medium text-neutral-500">Écart</td>
                        {MONTHS.map((_, mi) => {
                          const pV = p(formData.amounts[mi]), rV = p(reelArr[mi]), d = rV - pV;
                          return (
                            <td key={mi} className={`px-1.5 py-2 text-right font-mono font-medium ${d > 0 ? "text-emerald-600" : d < 0 ? "text-rose-600" : "text-neutral-300"}`}>
                              {pV > 0 || rV > 0 ? (d > 0 ? "+" : "") + fmt(d) : "—"}
                            </td>
                          );
                        })}
                        <td className={`px-3 py-2 text-right font-bold bg-neutral-50 ${ecart > 0 ? "text-emerald-600" : ecart < 0 ? "text-rose-600" : ""}`}>
                          {ecart !== 0 ? (ecart > 0 ? "+" : "") + fmt(ecart) : "—"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 text-center">
                  <div className="text-[10px] text-neutral-400 font-medium uppercase">Plan</div>
                  <div className={`text-xl font-black mt-1 ${style.total}`}>{formData.cat === "dec" ? "−" : "+"}{fmt(totalPlan)}</div>
                  <div className="text-[10px] text-neutral-400">{formData.ccy}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
                  <div className="text-[10px] text-blue-400 font-medium uppercase">Réalisé</div>
                  <div className="text-xl font-black mt-1 text-blue-700">{totalReel > 0 ? (formData.cat === "dec" ? "−" : "+") + fmt(totalReel) : "—"}</div>
                  <div className="text-[10px] text-blue-400">{formData.ccy}</div>
                </div>
                <div className={`rounded-lg p-4 border text-center ${ecart >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                  <div className={`text-[10px] font-medium uppercase ${ecart >= 0 ? "text-emerald-400" : "text-rose-400"}`}>Écart</div>
                  <div className={`text-xl font-black mt-1 ${ecart >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {totalReel > 0 ? (ecart >= 0 ? "+" : "") + fmt(ecart) : "—"}
                  </div>
                  <div className={`text-[10px] ${ecart >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {totalPlan > 0 && totalReel > 0 ? Math.round((totalReel / totalPlan) * 100) + "%" : ""}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between rounded-b-xl">
          <div className={`text-base font-black ${style.total}`}>
            {formData.cat === "dec" ? "−" : "+"}{fmt(totalPlan)} {formData.ccy}
            {totalReel > 0 && <span className="text-xs text-blue-600 font-bold ml-3">Réel: {fmt(totalReel)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setFormData(() => newRow()); setQuickFill(""); setQuickFillReel(""); setTab("general"); }}
              className="px-3 py-2 text-xs text-neutral-400 hover:text-neutral-600 transition">Vider</button>
            <button onClick={onClose}
              className="px-3 py-2 text-xs text-neutral-500 hover:text-neutral-700 transition">Annuler</button>
            {tabIdx > 0 && (
              <button onClick={goPrev}
                className="border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 px-4 py-2 rounded text-xs font-medium transition">
                ← Précédent
              </button>
            )}
            {tabIdx < TABS.length - 1 ? (
              <button onClick={goNext}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded text-xs font-medium transition">
                Suivant →
              </button>
            ) : (
              <button onClick={handleSubmit}
                className={`${style.btn} text-white px-5 py-2 rounded text-xs font-bold transition`}>
                Enregistrer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
