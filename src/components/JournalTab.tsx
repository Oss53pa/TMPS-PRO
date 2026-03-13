import { useState, useMemo } from "react";
import { ENTITIES, BANKS, MONTHS, type CompteComptable } from "../constants";
import { p, fmt, newRow } from "../lib/helpers";
import type { FlowRow } from "../types";
import SaisieModal from "./SaisieModal";
import Icon from "./ui/Icon";

interface Props {
  rows: FlowRow[];
  confirmDelete: (id: string) => void;
  upd: (id: string, f: string, v: string) => void;
  updAmtReel: (id: string, mi: number, v: string) => void;
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

type SortKey = "entity" | "bank" | "section" | "type" | "cat" | "total" | "label";
type SortDir = "asc" | "desc";

const CAT_LABELS: Record<string, string> = {
  enc: "↑ Encaissement",
  dec: "↓ Décaissement",
  bfr: "↔ Variation BFR",
  pool: "⇄ Cash Pooling",
};

const CAT_COLORS: Record<string, string> = {
  enc: "bg-emerald-100 text-emerald-700",
  dec: "bg-rose-100 text-rose-700",
  bfr: "bg-amber-100 text-amber-700",
  pool: "bg-purple-100 text-purple-700",
};

const SECTION_LABELS: Record<string, string> = {
  ope: "Opérationnel",
  inv: "Investissement",
  fin: "Financement",
};

const SECTION_ICONS: Record<string, string> = {
  ope: "config",
  inv: "construction",
  fin: "bank",
};

export default function JournalTab({ rows, confirmDelete, upd, updAmtReel, formData, updateForm, updateFormAmt, updateFormAmtReel, fillAllMonths, fillAllMonthsReel, submitForm, setFormData, planComptable }: Props) {
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState("ALL");
  const [filterCat, setFilterCat] = useState("ALL");
  const [filterSection, setFilterSection] = useState("ALL");
  const [filterBank, setFilterBank] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("entity");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const pageSize = 50;

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let result = [...rows];
    if (filterEntity !== "ALL") result = result.filter(r => r.entity === filterEntity);
    if (filterCat !== "ALL") result = result.filter(r => r.cat === filterCat);
    if (filterSection !== "ALL") result = result.filter(r => r.section === filterSection);
    if (filterBank !== "ALL") result = result.filter(r => r.bank === filterBank);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.label.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) ||
        r.entity.toLowerCase().includes(q) || r.bank.toLowerCase().includes(q) || r.note.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortKey === "total") {
        va = a.amounts.reduce((s, v) => s + p(v), 0);
        vb = b.amounts.reduce((s, v) => s + p(v), 0);
      } else { va = (a as any)[sortKey] || ""; vb = (b as any)[sortKey] || ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [rows, filterEntity, filterCat, filterSection, filterBank, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const totalEnc = filtered.filter(r => r.cat === "enc").reduce((s, r) => s + r.amounts.reduce((a, v) => a + p(v), 0), 0);
  const totalDec = filtered.filter(r => r.cat === "dec").reduce((s, r) => s + r.amounts.reduce((a, v) => a + p(v), 0), 0);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="text-[10px] ml-0.5 text-neutral-300">
      {sortKey === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  return (
    <div className="p-4 w-full space-y-4">

      {/* ── KPI BAR ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-neutral-200 p-3">
          <div className="text-[10px] text-neutral-400 font-medium uppercase">Total lignes</div>
          <div className="text-xl font-black text-neutral-900">{filtered.length}</div>
          <div className="text-[10px] text-neutral-400">sur {rows.length} enregistrées</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3">
          <div className="text-[10px] text-emerald-600 font-medium uppercase">↑ Encaissements</div>
          <div className="text-xl font-black text-emerald-700">+{fmt(totalEnc)}</div>
          <div className="text-[10px] text-emerald-500">{filtered.filter(r => r.cat === "enc").length} lignes</div>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-3">
          <div className="text-[10px] text-rose-600 font-medium uppercase">↓ Décaissements</div>
          <div className="text-xl font-black text-rose-700">−{fmt(totalDec)}</div>
          <div className="text-[10px] text-rose-500">{filtered.filter(r => r.cat === "dec").length} lignes</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
          <div className="text-[10px] text-amber-600 font-medium uppercase">↔ BFR</div>
          <div className="text-xl font-black text-amber-700">
            {fmt(filtered.filter(r => r.cat === "bfr").reduce((s, r) => s + r.amounts.reduce((a, v) => a + p(v), 0), 0))}
          </div>
          <div className="text-[10px] text-amber-500">{filtered.filter(r => r.cat === "bfr").length} lignes</div>
        </div>
        <div className={`rounded-xl border p-3 ${totalEnc - totalDec >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
          <div className="text-[10px] text-neutral-500 font-medium uppercase">Solde net</div>
          <div className={`text-xl font-black ${totalEnc - totalDec >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {totalEnc - totalDec >= 0 ? "+" : "−"}{fmt(Math.abs(totalEnc - totalDec))}
          </div>
          <div className="text-[10px] text-neutral-400">Enc. − Déc.</div>
        </div>
      </div>

      {/* ── FILTERS + ADD BUTTON ── */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => { setFormData(() => newRow()); setShowModal(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
            + Nouveau flux
          </button>
          <div className="w-px h-6 bg-neutral-200" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Rechercher…"
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-900 w-52 focus:border-neutral-400 outline-none" />
          <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(0); }}
            className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
            <option value="ALL">Tous les sens</option>
            <option value="enc">↑ Encaissements</option>
            <option value="dec">↓ Décaissements</option>
            <option value="bfr">↔ BFR</option>
            <option value="pool">⇄ Cash Pooling</option>
          </select>
          <select value={filterSection} onChange={e => { setFilterSection(e.target.value); setPage(0); }}
            className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
            <option value="ALL">Toutes sections</option>
            <option value="ope">Opérationnel</option>
            <option value="inv">Investissement</option>
            <option value="fin">Financement</option>
          </select>
          <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(0); }}
            className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
            <option value="ALL">Toutes entités</option>
            {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={filterBank} onChange={e => { setFilterBank(e.target.value); setPage(0); }}
            className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
            <option value="ALL">Toutes banques</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <span className="text-xs text-neutral-400 ml-auto">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500">
                <th className="px-2 py-2 w-8"></th>
                <th className="px-3 py-2 text-left font-medium w-8">#</th>
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-neutral-900" onClick={() => toggleSort("cat")}>Sens <SortIcon col="cat" /></th>
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-neutral-900" onClick={() => toggleSort("section")}>Section <SortIcon col="section" /></th>
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-neutral-900" onClick={() => toggleSort("entity")}>Entité <SortIcon col="entity" /></th>
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-neutral-900" onClick={() => toggleSort("bank")}>Banque <SortIcon col="bank" /></th>
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-neutral-900" onClick={() => toggleSort("type")}>Type de flux <SortIcon col="type" /></th>
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-neutral-900" onClick={() => toggleSort("label")}>Libellé <SortIcon col="label" /></th>
                <th className="px-3 py-2 text-center font-medium">CCY</th>
                <th className="px-3 py-2 text-right font-medium bg-neutral-100 cursor-pointer hover:text-neutral-900" onClick={() => toggleSort("total")}>Total <SortIcon col="total" /></th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-neutral-400">
                    <div className="mb-2 text-neutral-200 flex justify-center"><Icon name="journal" className="w-8 h-8" /></div>
                    <div className="italic">{rows.length === 0 ? "Aucune transaction. Cliquez sur « + Nouveau flux » pour commencer." : "Aucun résultat pour ces filtres."}</div>
                  </td>
                </tr>
              ) : paged.map((row, idx) => {
                const total = row.amounts.reduce((s, v) => s + p(v), 0);
                const rowNum = page * pageSize + idx + 1;
                const expanded = expandedRows.has(row.id);
                return (
                  <>
                    <tr key={row.id} className={`border-b border-neutral-100 hover:bg-neutral-50/50 group cursor-pointer ${expanded ? "bg-neutral-50" : ""}`}
                      onClick={() => toggleExpand(row.id)}>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-neutral-400 text-xs transition-transform inline-block ${expanded ? "rotate-90" : ""}`}>▶</span>
                      </td>
                      <td className="px-3 py-2 text-neutral-300 font-mono">{rowNum}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${CAT_COLORS[row.cat] || "bg-neutral-100 text-neutral-600"}`}>
                          {CAT_LABELS[row.cat] || row.cat}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        <span className="inline-flex items-center gap-1">{SECTION_ICONS[row.section] && <Icon name={SECTION_ICONS[row.section]} className="w-3.5 h-3.5" />} {SECTION_LABELS[row.section] || row.section}</span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-neutral-900">{ENTITIES.find(e => e.id === row.entity)?.name || row.entity}</td>
                      <td className="px-3 py-2 text-neutral-600">{row.bank}</td>
                      <td className="px-3 py-2 text-neutral-700">{row.type}</td>
                      <td className="px-3 py-2 text-neutral-500 max-w-[200px] truncate" title={row.label}>{row.label || "—"}</td>
                      <td className="px-3 py-2 text-center font-mono text-neutral-500">{row.ccy || "XOF"}</td>
                      <td className={`px-3 py-2 text-right font-bold bg-neutral-50 ${
                        row.cat === "enc" ? "text-emerald-600" : row.cat === "dec" ? "text-rose-600" : row.cat === "bfr" ? "text-amber-600" : "text-purple-600"
                      }`}>
                        {row.cat === "dec" ? "−" : "+"}{fmt(total)}
                      </td>
                      <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => confirmDelete(row.id)}
                          className="text-neutral-300 hover:text-red-500 font-bold transition opacity-0 group-hover:opacity-100">×</button>
                      </td>
                    </tr>
                    {/* ── EXPANDED DETAIL ── */}
                    {expanded && (() => {
                      const reelArr = row.amountsReel || Array(12).fill("");
                      const totalReel = reelArr.reduce((s: number, v: string) => s + p(v), 0);
                      const hasReel = reelArr.some((v: string) => p(v) > 0);
                      return (
                      <tr key={`${row.id}-detail`} className="bg-neutral-50 border-b border-neutral-200">
                        <td colSpan={11} className="px-4 py-3">
                          {/* Metadata badges */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                              Scénario : {row.scenario === "optimiste" ? "Optimiste" : row.scenario === "pessimiste" ? "Pessimiste" : "Base"}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              row.statut === "realise" ? "bg-emerald-50 text-emerald-600" :
                              row.statut === "engage" ? "bg-amber-50 text-amber-600" :
                              row.statut === "valide" ? "bg-blue-50 text-blue-600" :
                              "bg-neutral-100 text-neutral-500"
                            }`}>
                              Statut : {row.statut === "realise" ? "Réalisé" : row.statut === "engage" ? "Engagé" : row.statut === "valide" ? "Validé" : "Prévu"}
                            </span>
                            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-medium">
                              {row.recurrence === "mensuel" ? "Récurrent mensuel" : row.recurrence === "trimestriel" ? "Récurrent trimestriel" : row.recurrence === "annuel" ? "Récurrent annuel" : "Ponctuel"}
                            </span>
                            {row.probabilite != null && row.probabilite < 100 && (
                              <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                                Probabilité : {row.probabilite}%
                              </span>
                            )}
                            {row.contrepartie && (
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-medium">
                                Tiers : {row.contrepartie}
                              </span>
                            )}
                            {row.reference && (
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-medium">
                                Réf : {row.reference}
                              </span>
                            )}
                            {row.compteComptable && (
                              <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                                Compte : {row.compteComptable}
                              </span>
                            )}
                          </div>

                          {/* Plan vs Réalité table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-neutral-400">
                                  <th className="text-left py-1 pr-3 font-medium w-20"></th>
                                  {MONTHS.map(m => <th key={m} className="text-right px-1 py-1 font-medium w-16">{m}</th>)}
                                  <th className="text-right px-2 py-1 font-bold bg-neutral-100 rounded w-20">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Prévisionnel */}
                                <tr>
                                  <td className="py-1 pr-3 font-semibold text-neutral-500">Plan</td>
                                  {MONTHS.map((_, mi) => (
                                    <td key={mi} className={`text-right px-1 py-1 ${p(row.amounts[mi]) > 0 ? (row.cat === "enc" ? "text-emerald-600" : row.cat === "dec" ? "text-rose-600" : "text-neutral-900") : "text-neutral-300"}`}>
                                      {p(row.amounts[mi]) > 0 ? fmt(p(row.amounts[mi])) : "—"}
                                    </td>
                                  ))}
                                  <td className={`text-right px-2 py-1 font-bold bg-neutral-100 ${row.cat === "enc" ? "text-emerald-600" : row.cat === "dec" ? "text-rose-600" : "text-neutral-900"}`}>
                                    {fmt(total)}
                                  </td>
                                </tr>
                                {/* Réalisé */}
                                <tr>
                                  <td className="py-1 pr-3 font-semibold text-neutral-500">Réel</td>
                                  {MONTHS.map((_, mi) => (
                                    <td key={mi} className="text-right px-1 py-1" onClick={e => e.stopPropagation()}>
                                      <input type="text" value={reelArr[mi]} onChange={e => updAmtReel(row.id, mi, e.target.value)}
                                        className="w-full bg-transparent border-b border-dashed border-neutral-300 text-right text-xs text-neutral-700 outline-none focus:border-blue-400 py-0.5"
                                        placeholder="—" />
                                    </td>
                                  ))}
                                  <td className="text-right px-2 py-1 font-bold bg-neutral-100 text-blue-700">
                                    {totalReel > 0 ? fmt(totalReel) : "—"}
                                  </td>
                                </tr>
                                {/* Écart */}
                                {hasReel && (
                                  <tr className="border-t border-neutral-200">
                                    <td className="py-1 pr-3 font-semibold text-neutral-500">Écart</td>
                                    {MONTHS.map((_, mi) => {
                                      const plan = p(row.amounts[mi]);
                                      const reel = p(reelArr[mi]);
                                      const ecart = reel - plan;
                                      return (
                                        <td key={mi} className={`text-right px-1 py-1 font-semibold ${ecart > 0 ? "text-emerald-600" : ecart < 0 ? "text-rose-600" : "text-neutral-300"}`}>
                                          {reel > 0 || plan > 0 ? (ecart > 0 ? "+" : "") + fmt(ecart) : "—"}
                                        </td>
                                      );
                                    })}
                                    <td className={`text-right px-2 py-1 font-bold bg-neutral-100 ${totalReel - total > 0 ? "text-emerald-600" : totalReel - total < 0 ? "text-rose-600" : "text-neutral-400"}`}>
                                      {(totalReel - total > 0 ? "+" : "")}{fmt(totalReel - total)}
                                    </td>
                                  </tr>
                                )}
                                {/* % exécution */}
                                {hasReel && (
                                  <tr>
                                    <td className="py-1 pr-3 font-semibold text-neutral-400 text-[10px]">% Exec</td>
                                    {MONTHS.map((_, mi) => {
                                      const plan = p(row.amounts[mi]);
                                      const reel = p(reelArr[mi]);
                                      const pct = plan > 0 ? Math.round((reel / plan) * 100) : reel > 0 ? 999 : 0;
                                      return (
                                        <td key={mi} className={`text-right px-1 py-0.5 text-[10px] font-medium ${
                                          pct >= 90 && pct <= 110 ? "text-emerald-500" : pct > 0 ? "text-amber-500" : "text-neutral-300"
                                        }`}>
                                          {plan > 0 || reel > 0 ? pct + "%" : ""}
                                        </td>
                                      );
                                    })}
                                    <td className={`text-right px-2 py-0.5 text-[10px] font-bold bg-neutral-100 ${
                                      total > 0 && Math.round((totalReel / total) * 100) >= 90 ? "text-emerald-600" : "text-amber-600"
                                    }`}>
                                      {total > 0 ? Math.round((totalReel / total) * 100) + "%" : "—"}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center gap-4 text-xs mt-2 pt-2 border-t border-neutral-200">
                            {row.note && <div className="flex items-center gap-1.5"><span className="text-neutral-400">Note :</span><span className="text-neutral-600">{row.note}</span></div>}
                            {row.dateValeur && <div className="flex items-center gap-1.5"><span className="text-neutral-400">Date valeur :</span><span className="text-neutral-600">{row.dateValeur}</span></div>}
                            <div className="flex items-center gap-1.5"><span className="text-neutral-400">Moy/mois :</span><span className="text-neutral-600">{fmt(total / 12)} {row.ccy || "XOF"}</span></div>
                          </div>
                        </td>
                      </tr>
                      );
                    })()}
                  </>
                );
              })}
            </tbody>
            {paged.length > 0 && (
              <tfoot>
                <tr className="bg-neutral-100 font-semibold border-t-2 border-neutral-200">
                  <td colSpan={9} className="px-3 py-2 text-xs text-neutral-500 uppercase">Total filtré</td>
                  <td className={`px-3 py-2 text-right bg-neutral-200 font-bold ${totalEnc - totalDec >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {fmt(totalEnc - totalDec)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 bg-neutral-50">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-white border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 transition">
              ← Précédent
            </button>
            <span className="text-xs text-neutral-500">Page {page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-white border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 transition">
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL SAISIE ── */}
      <SaisieModal
        open={showModal}
        onClose={() => setShowModal(false)}
        formData={formData}
        updateForm={updateForm}
        updateFormAmt={updateFormAmt}
        updateFormAmtReel={updateFormAmtReel}
        fillAllMonths={fillAllMonths}
        fillAllMonthsReel={fillAllMonthsReel}
        submitForm={submitForm}
        setFormData={setFormData}
        planComptable={planComptable}
      />
    </div>
  );
}
