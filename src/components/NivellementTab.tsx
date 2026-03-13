import { useState } from "react";
import { BANKS, MONTHS, PLAN_COMPTABLE, type CompteComptable } from "../constants";
import { p, fmt } from "../lib/helpers";
import type { AppStats, SweepTransfer } from "../types";
import Icon from "./ui/Icon";

interface Props {
  stats: AppStats;
  siMap: Record<string, string>;
  setSiMap: (fn: (s: Record<string, string>) => Record<string, string>) => void;
  minMap: Record<string, string>;
  setMinMap: (fn: (s: Record<string, string>) => Record<string, string>) => void;
  maxMap: Record<string, string>;
  setMaxMap: (fn: (s: Record<string, string>) => Record<string, string>) => void;
  ccySym: string;
  sweepTransfers: SweepTransfer[];
  addSweepTransfer: (t: Omit<SweepTransfer, 'id'>) => void;
  updateSweepTransfer: (id: string, field: string, value: any) => void;
  deleteSweepTransfer: (id: string) => void;
  planComptable?: CompteComptable[];
}

const STATUS_STYLES: Record<string, string> = {
  "prévu": "bg-blue-100 text-blue-700",
  "exécuté": "bg-emerald-100 text-emerald-700",
  "annulé": "bg-neutral-100 text-neutral-500 line-through",
};

const MOTIF_STYLES: Record<string, string> = {
  "excédent": "bg-amber-100 text-amber-700",
  "déficit": "bg-rose-100 text-rose-700",
  "manuel": "bg-indigo-100 text-indigo-700",
};

const SUB_TABS = [
  { key: "seuils", label: "Seuils & Paramétrage", icon: "config" },
  { key: "alertes", label: "Alertes", icon: "warning" },
  { key: "journal", label: "Journal des Transferts", icon: "journal" },
  { key: "matrice", label: "Matrice Soldes vs Seuils", icon: "chart" },
] as const;

type SubTab = typeof SUB_TABS[number]["key"];

export default function NivellementTab(props: Props) {
  const { stats, siMap, setSiMap, minMap, setMinMap, maxMap, setMaxMap, ccySym,
    sweepTransfers, addSweepTransfer, updateSweepTransfer, deleteSweepTransfer, planComptable: pcProp } = props;

  const COMPTES_TRESORERIE = (pcProp || PLAN_COMPTABLE).filter(c => c.classe === 5);

  const [subTab, setSubTab] = useState<SubTab>("seuils");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    fromBank: BANKS[0],
    toBank: BANKS[1],
    amount: "",
    motif: "manuel" as SweepTransfer["motif"],
    month: MONTHS[new Date().getMonth()],
    note: "",
    compteDebit: "512",
    compteCredit: "512",
  });
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterBank, setFilterBank] = useState("ALL");

  const handleSubmit = () => {
    if (!form.amount || p(form.amount) <= 0) return;
    if (form.fromBank === form.toBank) return;
    addSweepTransfer({
      date: form.date,
      fromBank: form.fromBank,
      toBank: form.toBank,
      amount: p(form.amount),
      ccy: ccySym,
      motif: form.motif,
      month: form.month,
      note: form.note,
      status: "prévu",
      createdAt: new Date().toISOString(),
      compteDebit: form.compteDebit,
      compteCredit: form.compteCredit,
    });
    setForm(f => ({ ...f, amount: "", note: "" }));
    setShowForm(false);
  };

  const handleAlertTransfer = (alert: typeof stats.niveauAlerts[0]) => {
    const targetBank = alert.type === "excédent"
      ? BANKS.find(b => b !== alert.bank && p(minMap[b]) > 0 && stats.byBank[b].cum[alert.mi] < p(minMap[b])) || BANKS.find(b => b !== alert.bank) || BANKS[0]
      : BANKS.find(b => b !== alert.bank && p(maxMap[b]) > 0 && stats.byBank[b].cum[alert.mi] > p(maxMap[b])) || BANKS.find(b => b !== alert.bank) || BANKS[0];

    setForm({
      date: new Date().toISOString().slice(0, 10),
      fromBank: alert.type === "excédent" ? alert.bank : targetBank,
      toBank: alert.type === "excédent" ? targetBank : alert.bank,
      amount: Math.abs(alert.ecart).toString(),
      motif: alert.type as SweepTransfer["motif"],
      month: alert.month,
      note: `Nivellement ${alert.type} — ${alert.bank} ${alert.month}`,
      compteDebit: "512",
      compteCredit: "512",
    });
    setSubTab("journal");
    setShowForm(true);
  };

  const filteredTransfers = sweepTransfers
    .filter(t => filterStatus === "ALL" || t.status === filterStatus)
    .filter(t => filterBank === "ALL" || t.fromBank === filterBank || t.toBank === filterBank)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalPrevu = sweepTransfers.filter(t => t.status === "prévu").reduce((s, t) => s + t.amount, 0);
  const totalExecute = sweepTransfers.filter(t => t.status === "exécuté").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-4 space-y-4 w-full">
      {/* ═══ ONGLETS ═══ */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="flex border-b border-neutral-200">
          {SUB_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 ${
                subTab === t.key
                  ? "border-neutral-900 text-neutral-900 bg-neutral-50"
                  : "border-transparent text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50/50"
              }`}
            >
              <Icon name={t.icon} className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.key === "alertes" && stats.niveauAlerts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">
                  {stats.niveauAlerts.length}
                </span>
              )}
              {t.key === "journal" && sweepTransfers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700">
                  {sweepTransfers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ CONTENU ONGLET: SEUILS ═══ */}
        {subTab === "seuils" && (
          <div className="p-4">
            <div className="text-sm font-semibold text-neutral-950 mb-3">Seuils de nivellement par banque ({ccySym})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-neutral-500 border-b border-neutral-200">
                  <th className="py-2 text-left font-medium">Banque</th>
                  <th className="py-2 text-right font-medium">Solde initial</th>
                  <th className="py-2 text-right text-rose-600 font-medium">Seuil Min</th>
                  <th className="py-2 text-right text-amber-600 font-medium">Seuil Max</th>
                  <th className="py-2 text-right font-medium">Solde final proj.</th>
                  <th className="py-2 text-center font-medium">Statut</th>
                </tr></thead>
                <tbody>
                  {BANKS.map(b => {
                    const d = stats.byBank[b];
                    const fin = d.cum[11];
                    const minV = p(minMap[b]); const maxV = p(maxMap[b]);
                    const st = maxV > 0 && fin > maxV ? "Excédent" : minV > 0 && fin < minV ? "Déficit" : "OK";
                    const stCls = st === "Excédent" ? "text-amber-600 bg-amber-50" : st === "Déficit" ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50";
                    return (
                      <tr key={b} className="border-b border-neutral-100">
                        <td className="py-2 font-semibold text-neutral-900">{b}</td>
                        <td className="py-2 text-right">
                          <input type="text" value={siMap[b]} onChange={e => setSiMap(s => ({ ...s, [b]: e.target.value }))}
                            className="bg-white border border-neutral-300 rounded-lg px-2 py-1 w-28 text-right text-xs text-neutral-900" />
                        </td>
                        <td className="py-2 text-right">
                          <input type="text" value={minMap[b]} onChange={e => setMinMap(s => ({ ...s, [b]: e.target.value }))}
                            className="bg-white border border-rose-200 rounded-lg px-2 py-1 w-28 text-right text-xs text-neutral-900" />
                        </td>
                        <td className="py-2 text-right">
                          <input type="text" value={maxMap[b]} onChange={e => setMaxMap(s => ({ ...s, [b]: e.target.value }))}
                            className="bg-white border border-amber-200 rounded-lg px-2 py-1 w-28 text-right text-xs text-neutral-900" />
                        </td>
                        <td className={`py-2 text-right font-bold ${fin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(fin)}</td>
                        <td className="py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${stCls}`}>{st}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ CONTENU ONGLET: ALERTES ═══ */}
        {subTab === "alertes" && (
          <div>
            {stats.niveauAlerts.length === 0
              ? <div className="p-6 text-center text-neutral-400 text-xs">Aucune alerte — définissez des seuils min/max dans l'onglet Seuils</div>
              : (
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-neutral-50 text-neutral-500">
                    <th className="px-3 py-2 text-left font-medium">Mois</th>
                    <th className="px-3 py-2 text-left font-medium">Banque</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-right font-medium">Solde</th>
                    <th className="px-3 py-2 text-right font-medium">Seuil</th>
                    <th className="px-3 py-2 text-right font-medium">Écart</th>
                    <th className="px-3 py-2 text-left font-medium">Action suggérée</th>
                    <th className="px-3 py-2 text-center font-medium">Transférer</th>
                  </tr></thead>
                  <tbody>
                    {stats.niveauAlerts.map((a, i) => (
                      <tr key={i} className={`border-b border-neutral-100 ${a.type === "excédent" ? "bg-amber-50/50" : "bg-rose-50/50"}`}>
                        <td className="px-3 py-2 font-semibold text-neutral-900">{a.month}</td>
                        <td className="px-3 py-2 text-neutral-700">{a.bank}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${a.type === "excédent" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                            {a.type === "excédent" ? "Excédent" : "Déficit"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-700">{fmt(a.val)}</td>
                        <td className="px-3 py-2 text-right text-neutral-400">{fmt(a.seuil)}</td>
                        <td className={`px-3 py-2 text-right font-bold ${a.type === "excédent" ? "text-amber-600" : "text-rose-600"}`}>{fmt(a.ecart)}</td>
                        <td className="px-3 py-2 text-neutral-500">
                          {a.type === "excédent" ? `Virer ${fmt(a.ecart)} ${ccySym}` : `Abonder de ${fmt(a.ecart)} ${ccySym}`}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleAlertTransfer(a)}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                          >
                            Créer virement
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {/* ═══ CONTENU ONGLET: JOURNAL DES TRANSFERTS ═══ */}
        {subTab === "journal" && (
          <div>
            {/* Barre d'outils */}
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-neutral-400">{sweepTransfers.length} transfert(s)</span>
                {totalPrevu > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                    Prévu: {fmt(totalPrevu)} {ccySym}
                  </span>
                )}
                {totalExecute > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                    Exécuté: {fmt(totalExecute)} {ccySym}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select value={filterBank} onChange={e => setFilterBank(e.target.value)}
                  className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-[10px] text-neutral-700">
                  <option value="ALL">Toutes banques</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-[10px] text-neutral-700">
                  <option value="ALL">Tous statuts</option>
                  <option value="prévu">Prévu</option>
                  <option value="exécuté">Exécuté</option>
                  <option value="annulé">Annulé</option>
                </select>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition"
                >
                  + Nouveau transfert
                </button>
              </div>
            </div>

            {/* Formulaire */}
            {showForm && (
              <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100 space-y-2">
                {/* Ligne 1 : infos principales */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Banque débiteur</label>
                    <select value={form.fromBank} onChange={e => setForm(f => ({ ...f, fromBank: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Banque créditeur</label>
                    <select value={form.toBank} onChange={e => setForm(f => ({ ...f, toBank: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
                      {BANKS.filter(b => b !== form.fromBank).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Montant ({ccySym})</label>
                    <input type="text" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0" className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 text-right" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Motif</label>
                    <select value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value as SweepTransfer["motif"] }))}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
                      <option value="manuel">Manuel</option>
                      <option value="excédent">Excédent</option>
                      <option value="déficit">Déficit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Mois réf.</label>
                    <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Note</label>
                    <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="Optionnel" className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900" />
                  </div>
                </div>
                {/* Ligne 2 : comptes comptables SYSCOHADA */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Compte débit SYSCOHADA</label>
                    <select value={form.compteDebit} onChange={e => setForm(f => ({ ...f, compteDebit: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
                      {COMPTES_TRESORERIE.map(c => (
                        <option key={c.numero} value={c.numero}>{c.numero} — {c.libelle}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Compte crédit SYSCOHADA</label>
                    <select value={form.compteCredit} onChange={e => setForm(f => ({ ...f, compteCredit: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
                      {COMPTES_TRESORERIE.map(c => (
                        <option key={c.numero} value={c.numero}>{c.numero} — {c.libelle}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-[10px] text-neutral-400 col-span-1 flex items-end pb-1.5">
                    585 = Virements de fonds (passage)
                  </div>
                  <div className="col-span-2 flex gap-1 items-end">
                    <button onClick={handleSubmit}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition">
                      Enregistrer
                    </button>
                    <button onClick={() => setShowForm(false)}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition">
                      Annuler
                    </button>
                  </div>
                </div>
                {form.fromBank === form.toBank && (
                  <div className="text-[10px] text-rose-600 font-medium">Le compte débiteur et créditeur doivent être différents.</div>
                )}
              </div>
            )}

            {/* Liste des transferts */}
            {filteredTransfers.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 text-xs">
                Aucun transfert enregistré — utilisez les boutons "Créer virement" depuis les alertes ou ajoutez manuellement.
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead><tr className="bg-neutral-50 text-neutral-500">
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Cpt Débit</th>
                  <th className="px-3 py-2 text-left font-medium">Débit</th>
                  <th className="px-3 py-2 text-center font-medium"></th>
                  <th className="px-3 py-2 text-left font-medium">Crédit</th>
                  <th className="px-3 py-2 text-left font-medium">Cpt Crédit</th>
                  <th className="px-3 py-2 text-right font-medium">Montant</th>
                  <th className="px-3 py-2 text-center font-medium">Motif</th>
                  <th className="px-3 py-2 text-center font-medium">Mois</th>
                  <th className="px-3 py-2 text-center font-medium">Statut</th>
                  <th className="px-3 py-2 text-left font-medium">Note</th>
                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredTransfers.map(t => (
                    <tr key={t.id} className={`border-b border-neutral-100 hover:bg-neutral-50/50 ${t.status === "annulé" ? "opacity-50" : ""}`}>
                      <td className="px-3 py-2 text-neutral-700 font-medium">{t.date}</td>
                      <td className="px-3 py-2 text-neutral-500 font-mono text-[10px]">{t.compteDebit || "512"}</td>
                      <td className="px-3 py-2 font-semibold text-rose-700">{t.fromBank}</td>
                      <td className="px-3 py-2 text-center text-neutral-400">→</td>
                      <td className="px-3 py-2 font-semibold text-emerald-700">{t.toBank}</td>
                      <td className="px-3 py-2 text-neutral-500 font-mono text-[10px]">{t.compteCredit || "512"}</td>
                      <td className="px-3 py-2 text-right font-bold text-neutral-900">{fmt(t.amount)} {t.ccy}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${MOTIF_STYLES[t.motif] || ""}`}>
                          {t.motif}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-neutral-600">{t.month}</td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={t.status}
                          onChange={e => updateSweepTransfer(t.id, "status", e.target.value)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border-0 cursor-pointer ${STATUS_STYLES[t.status] || ""}`}
                        >
                          <option value="prévu">Prévu</option>
                          <option value="exécuté">Exécuté</option>
                          <option value="annulé">Annulé</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-neutral-500 max-w-[180px] truncate" title={t.note}>{t.note || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => deleteSweepTransfer(t.id)}
                          className="text-neutral-400 hover:text-rose-600 transition text-sm"
                          title="Supprimer"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-neutral-50 font-semibold text-xs">
                    <td colSpan={6} className="px-3 py-2 text-right text-neutral-600">
                      Total ({filteredTransfers.filter(t => t.status !== "annulé").length} actif{filteredTransfers.filter(t => t.status !== "annulé").length > 1 ? "s" : ""})
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-neutral-900">
                      {fmt(filteredTransfers.filter(t => t.status !== "annulé").reduce((s, t) => s + t.amount, 0))} {ccySym}
                    </td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* ═══ CONTENU ONGLET: MATRICE ═══ */}
        {subTab === "matrice" && (
          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-xs border-collapse">
              <thead><tr className="bg-neutral-50 text-neutral-500">
                <th className="px-3 py-2 text-left sticky left-0 bg-neutral-50 font-medium">Banque</th>
                <th className="px-3 py-2 text-right text-rose-600 font-medium">Min</th>
                <th className="px-3 py-2 text-right text-amber-600 font-medium">Max</th>
                {MONTHS.map(m => <th key={m} className="px-3 py-2 text-right font-medium">{m}</th>)}
              </tr></thead>
              <tbody>
                {BANKS.map(b => {
                  const d = stats.byBank[b]; const minV = p(minMap[b]); const maxV = p(maxMap[b]);
                  return (
                    <tr key={b} className="border-b border-neutral-100">
                      <td className="px-3 py-2 font-semibold text-neutral-900 sticky left-0 bg-white">{b}</td>
                      <td className="px-3 py-2 text-right text-rose-600">{minV > 0 ? fmt(minV) : "—"}</td>
                      <td className="px-3 py-2 text-right text-amber-600">{maxV > 0 ? fmt(maxV) : "—"}</td>
                      {d.cum.map((v, mi) => {
                        const under = minV > 0 && v < minV; const over = maxV > 0 && v > maxV;
                        return (
                          <td key={mi} className={`px-3 py-2 text-right font-medium ${under ? "bg-rose-50 text-rose-600" : over ? "bg-amber-50 text-amber-600" : v >= 0 ? "text-neutral-700" : "text-red-600"}`}>
                            {fmt(v)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
