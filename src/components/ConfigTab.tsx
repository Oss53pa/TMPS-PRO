import { useState } from "react";
import { SCENARIOS, SUPABASE_URL, SUPABASE_KEY, ALL_TYPES, MM_OPERATORS, BCEAO_DECLARATION_TYPES, PLAN_COMPTABLE, CURRENCIES, type CompteComptable } from "../constants";
import type { AppStats, FlowRow, Entity, BankAccount, CurrencyConfig } from "../types";
import Icon from "./ui/Icon";

interface Props {
  stats: AppStats;
  rows: FlowRow[];
  scenario: string;
  reportCcy: string;
  entities: Entity[];
  addEntity: (e: Entity) => void;
  updateEntity: (id: string, data: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  banks: BankAccount[];
  addBank: (b: BankAccount) => void;
  updateBank: (id: string, data: Partial<BankAccount>) => void;
  deleteBank: (id: string) => void;
  currencies: CurrencyConfig[];
  addCurrency: (c: CurrencyConfig) => void;
  updateCurrency: (code: string, data: Partial<CurrencyConfig>) => void;
  deleteCurrency: (code: string) => void;
  planComptable: CompteComptable[];
  addCompte: (c: CompteComptable) => void;
  deleteCompte: (numero: string) => void;
  importPlanComptable: (comptes: CompteComptable[]) => void;
  resetPlanComptable: () => void;
}

const NATURE_COLORS: Record<string, string> = {
  actif: "bg-blue-100 text-blue-700",
  passif: "bg-purple-100 text-purple-700",
  charge: "bg-rose-100 text-rose-700",
  produit: "bg-emerald-100 text-emerald-700",
  tresorerie: "bg-amber-100 text-amber-700",
};

const CLASSE_COLORS: Record<number, string> = {
  1: "border-l-purple-500",
  2: "border-l-blue-500",
  3: "border-l-cyan-500",
  4: "border-l-orange-500",
  5: "border-l-amber-500",
  6: "border-l-rose-500",
  7: "border-l-emerald-500",
  8: "border-l-neutral-500",
};

export default function ConfigTab({
  stats, rows, scenario, reportCcy,
  entities, addEntity, updateEntity, deleteEntity,
  banks, addBank, updateBank, deleteBank,
  currencies, addCurrency, updateCurrency, deleteCurrency,
  planComptable, addCompte, deleteCompte, importPlanComptable, resetPlanComptable,
}: Props) {
  const [configTab, setConfigTab] = useState<string>("systeme");
  const [pcSearch, setPcSearch] = useState("");
  const [pcClasseFilter, setPcClasseFilter] = useState<number | null>(null);
  const [pcNatureFilter, setPcNatureFilter] = useState<string>("ALL");
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
  const [pcImportMsg, setPcImportMsg] = useState("");
  const [showAddCompte, setShowAddCompte] = useState(false);
  const [newCompte, setNewCompte] = useState({ numero: "", libelle: "", classe: 1, nature: "actif" as CompteComptable["nature"] });

  // ── Entity form ──
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [entityForm, setEntityForm] = useState({ id: "", name: "", country: "", ccy: "XOF" });
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);

  // ── Bank form ──
  const [showBankForm, setShowBankForm] = useState(false);
  const [editBankId, setEditBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({ id: "", name: "", entity: "ALL", iban: "", swift: "", ccy: "XOF", active: true });

  // ── Currency form ──
  const [showCurrencyForm, setShowCurrencyForm] = useState(false);
  const [editCurrencyCode, setEditCurrencyCode] = useState<string | null>(null);
  const [currencyForm, setCurrencyForm] = useState({ code: "", name: "", symbol: "", defaultFx: 1, active: true });

  const toggleClasse = (c: number) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  };

  const modules = [
    { name: "Referentiel & Parametrage", status: "actif", desc: `${entities.length} entites, ${banks.length} banques, ${currencies.length} devises, ${ALL_TYPES.length} types de flux` },
    { name: "Saisie & Import CSV", status: "actif", desc: `${rows.length} lignes saisies, import CSV/XLSX` },
    { name: "TAFIRE SYSCOHADA", status: "actif", desc: "Partie I (Ressources/Emplois), Partie II (BFR), Reconciliation IAS 7" },
    { name: "Position Intraday J+0", status: "actif", desc: "3 soldes bancaires, float africain, cut-off times" },
    { name: "BFR & Liquidite OHADA", status: "actif", desc: "DSO/DPO par entite, BFR consolide, couverture liquidite" },
    { name: "Scenarios & Sensibilite", status: "actif", desc: `${SCENARIOS.length} scenarios (Budget, DF, Optimiste, Pessimiste, Crise)` },
    { name: "Nivellement & Cash Pooling", status: "actif", desc: `${banks.length} banques, seuils min/max, alertes automatiques` },
    { name: "Risque de Change", status: "actif", desc: `${currencies.length} devises, exposition nette, parite CFA` },
    { name: "Conformite Reglementaire", status: "actif", desc: `BCEAO (${BCEAO_DECLARATION_TYPES.length} types), echeances fiscales, registre KYC` },
    { name: "Mobile Money", status: "actif", desc: `${MM_OPERATORS.length} operateurs (Wave, MTN, Orange, M-Pesa...)` },
    { name: "Proph3t (IA)", status: "actif", desc: "Regression + saisonnalite, Z-score anomalies, analyse LLM expert" },
    { name: "Workflow & Audit", status: "partiel", desc: "Confirmation suppression, localStorage auto-save, piste d'audit (V2)" },
    { name: "Reporting & Exports", status: "actif", desc: "CSV export, dashboard CFO, scoring sante 10 dimensions" },
  ];

  // Plan comptable filtered
  const filteredPC = planComptable.filter(c => {
    if (pcClasseFilter !== null && c.classe !== pcClasseFilter) return false;
    if (pcNatureFilter !== "ALL" && c.nature !== pcNatureFilter) return false;
    if (pcSearch.trim()) {
      const q = pcSearch.toLowerCase();
      return c.numero.includes(q) || c.libelle.toLowerCase().includes(q);
    }
    return true;
  });

  const classeGroups = new Map<number, CompteComptable[]>();
  filteredPC.forEach(c => {
    if (!classeGroups.has(c.classe)) classeGroups.set(c.classe, []);
    classeGroups.get(c.classe)!.push(c);
  });

  // ── Entity handlers ──
  const openEntityForm = (entity?: Entity) => {
    if (entity) {
      setEditEntityId(entity.id);
      setEntityForm({ id: entity.id, name: entity.name, country: entity.country, ccy: entity.ccy });
    } else {
      setEditEntityId(null);
      setEntityForm({ id: "", name: "", country: "", ccy: "XOF" });
    }
    setShowEntityForm(true);
  };

  const saveEntity = () => {
    if (!entityForm.id.trim() || !entityForm.name.trim()) return;
    if (editEntityId) {
      updateEntity(editEntityId, { name: entityForm.name, country: entityForm.country, ccy: entityForm.ccy });
    } else {
      if (entities.find(e => e.id === entityForm.id)) return;
      addEntity({ ...entityForm });
    }
    setShowEntityForm(false);
    setEditEntityId(null);
  };

  const confirmDeleteEntity = (id: string) => {
    setDeleteConfirm({ type: "entity", id });
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "entity") deleteEntity(deleteConfirm.id);
    if (deleteConfirm.type === "bank") deleteBank(deleteConfirm.id);
    if (deleteConfirm.type === "currency") deleteCurrency(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // ── Bank handlers ──
  const openBankForm = (bank?: BankAccount) => {
    if (bank) {
      setEditBankId(bank.id);
      setBankForm({ id: bank.id, name: bank.name, entity: bank.entity, iban: bank.iban || "", swift: bank.swift || "", ccy: bank.ccy, active: bank.active });
    } else {
      setEditBankId(null);
      setBankForm({ id: `bank_${Date.now()}`, name: "", entity: "ALL", iban: "", swift: "", ccy: "XOF", active: true });
    }
    setShowBankForm(true);
  };

  const saveBank = () => {
    if (!bankForm.name.trim()) return;
    if (editBankId) {
      updateBank(editBankId, { name: bankForm.name, entity: bankForm.entity, iban: bankForm.iban, swift: bankForm.swift, ccy: bankForm.ccy, active: bankForm.active });
    } else {
      addBank({ ...bankForm });
    }
    setShowBankForm(false);
    setEditBankId(null);
  };

  // ── Currency handlers ──
  const openCurrencyForm = (currency?: CurrencyConfig) => {
    if (currency) {
      setEditCurrencyCode(currency.code);
      setCurrencyForm({ code: currency.code, name: currency.name, symbol: currency.symbol, defaultFx: currency.defaultFx, active: currency.active });
    } else {
      setEditCurrencyCode(null);
      setCurrencyForm({ code: "", name: "", symbol: "", defaultFx: 1, active: true });
    }
    setShowCurrencyForm(true);
  };

  const saveCurrency = () => {
    if (!currencyForm.code.trim()) return;
    if (editCurrencyCode) {
      updateCurrency(editCurrencyCode, { name: currencyForm.name, symbol: currencyForm.symbol, defaultFx: currencyForm.defaultFx, active: currencyForm.active });
    } else {
      if (currencies.find(c => c.code === currencyForm.code)) return;
      addCurrency({ ...currencyForm });
    }
    setShowCurrencyForm(false);
    setEditCurrencyCode(null);
  };

  const SUB_TABS = [
    { key: "systeme", label: "Systeme", icon: "clipboard" },
    { key: "entites", label: "Entites / Pays", icon: "building" },
    { key: "banques", label: "Comptes Bancaires", icon: "bank" },
    { key: "devises", label: "Devises", icon: "currency" },
    { key: "modules", label: "Modules", icon: "cube" },
    { key: "plancomptable", label: "Plan Comptable", icon: "bookOpen" },
    { key: "supabase", label: "Base de donnees", icon: "archive" },
    { key: "geo", label: "Zones geographiques", icon: "globe" },
  ];

  return (
    <div className="p-4 space-y-4 w-full">

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 overflow-x-auto">
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setConfigTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              configTab === t.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
            }`}>
            <Icon name={t.icon} className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ SYSTEME ═══ */}
      {configTab === "systeme" && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-sm font-semibold text-neutral-900 mb-3">TMS Pro Africa — Informations Systeme</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              ["Version", "v2.0 — Mars 2026"],
              ["Editeur", "Atlas Studio"],
              ["Referentiel", "SYSCOHADA revise 2017"],
              ["Norme flux", "TAFIRE + IAS 7"],
              ["Entites actives", entities.length],
              ["Lignes de flux", rows.length],
              ["Types de flux", ALL_TYPES.length],
              ["Banques", banks.length],
              ["Devises", currencies.length],
              ["Operateurs MM", MM_OPERATORS.length],
              ["Scenario actif", SCENARIOS.find(s => s.key === scenario)?.label],
              ["Devise reporting", reportCcy],
              ["Alertes niv.", stats.niveauAlerts.length],
              ["Anomalies IA", stats.predRows.reduce((s, r) => s + r.anomalies.length, 0)],
              ["Score sante", `${stats.healthScore.global}/100`],
              ["Persistance", "localStorage + Supabase"],
            ].map(([k, v]) => (
              <div key={k as string} className="bg-neutral-50 rounded-lg p-3">
                <div className="text-neutral-400 text-[10px] font-medium">{k}</div>
                <div className="text-neutral-900 font-bold text-sm mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ENTITES / PAYS ═══ */}
      {configTab === "entites" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-bold text-neutral-900">Gestion des Entites / Pays</div>
                <div className="text-xs text-neutral-500">{entities.length} entite(s) configuree(s)</div>
              </div>
              <button onClick={() => openEntityForm()}
                className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5">
                + Nouvelle entite
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500">
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-left font-medium">Nom</th>
                    <th className="px-3 py-2 text-left font-medium">Pays</th>
                    <th className="px-3 py-2 text-left font-medium">Devise</th>
                    <th className="px-3 py-2 text-left font-medium">Lignes flux</th>
                    <th className="px-3 py-2 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map(e => (
                    <tr key={e.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition">
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold bg-neutral-100 px-2 py-0.5 rounded text-neutral-900">{e.id}</span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-neutral-900">{e.name}</td>
                      <td className="px-3 py-2.5 text-neutral-600">{e.country}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{e.ccy}</span>
                      </td>
                      <td className="px-3 py-2.5 text-neutral-500">{rows.filter(r => r.entity === e.id).length}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEntityForm(e)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-[10px] font-semibold transition">
                            Modifier
                          </button>
                          <button onClick={() => confirmDeleteEntity(e.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-semibold transition">
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Entity Form Modal */}
          {showEntityForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowEntityForm(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="text-sm font-bold text-neutral-900 mb-4">
                  {editEntityId ? "Modifier l'entite" : "Nouvelle entite"}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Code (identifiant unique)</label>
                    <input value={entityForm.id} onChange={e => setEntityForm(f => ({ ...f, id: e.target.value.toUpperCase() }))}
                      disabled={!!editEntityId}
                      className={`w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none ${editEntityId ? "opacity-50" : ""}`}
                      placeholder="ex: CI, SN, CM..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Nom de l'entite</label>
                    <input value={entityForm.name} onChange={e => setEntityForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none"
                      placeholder="ex: Cosmos Angre CI" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Pays</label>
                    <input value={entityForm.country} onChange={e => setEntityForm(f => ({ ...f, country: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none"
                      placeholder="ex: Cote d'Ivoire" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Devise locale</label>
                    <select value={entityForm.ccy} onChange={e => setEntityForm(f => ({ ...f, ccy: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none">
                      {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={saveEntity}
                    className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition">
                    {editEntityId ? "Enregistrer" : "Creer"}
                  </button>
                  <button onClick={() => setShowEntityForm(false)}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg text-xs font-semibold transition">
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPTES BANCAIRES ═══ */}
      {configTab === "banques" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-bold text-neutral-900">Gestion des Comptes Bancaires</div>
                <div className="text-xs text-neutral-500">{banks.length} compte(s) configure(s) — {banks.filter(b => b.active).length} actif(s)</div>
              </div>
              <button onClick={() => openBankForm()}
                className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5">
                + Nouveau compte
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500">
                    <th className="px-3 py-2 text-left font-medium">Banque</th>
                    <th className="px-3 py-2 text-left font-medium">Entite</th>
                    <th className="px-3 py-2 text-left font-medium">IBAN</th>
                    <th className="px-3 py-2 text-left font-medium">SWIFT</th>
                    <th className="px-3 py-2 text-left font-medium">Devise</th>
                    <th className="px-3 py-2 text-center font-medium">Statut</th>
                    <th className="px-3 py-2 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {banks.map(b => (
                    <tr key={b.id} className={`border-b border-neutral-100 hover:bg-neutral-50 transition ${!b.active ? "opacity-50" : ""}`}>
                      <td className="px-3 py-2.5 font-semibold text-neutral-900">{b.name}</td>
                      <td className="px-3 py-2.5 text-neutral-600">
                        {b.entity === "ALL" ? <span className="text-neutral-400">Toutes</span> : entities.find(e => e.id === b.entity)?.name || b.entity}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-neutral-500 text-[10px]">{b.iban || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-neutral-500 text-[10px]">{b.swift || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{b.ccy}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${b.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                          {b.active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openBankForm(b)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-[10px] font-semibold transition">
                            Modifier
                          </button>
                          <button onClick={() => setDeleteConfirm({ type: "bank", id: b.id })}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-semibold transition">
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank Form Modal */}
          {showBankForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowBankForm(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                <div className="text-sm font-bold text-neutral-900 mb-4">
                  {editBankId ? "Modifier le compte bancaire" : "Nouveau compte bancaire"}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Nom de la banque</label>
                    <input value={bankForm.name} onChange={e => setBankForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none"
                      placeholder="ex: SGBCI, ECOBANK..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Entite rattachee</label>
                    <select value={bankForm.entity} onChange={e => setBankForm(f => ({ ...f, entity: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none">
                      <option value="ALL">Toutes les entites</option>
                      {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Devise</label>
                    <select value={bankForm.ccy} onChange={e => setBankForm(f => ({ ...f, ccy: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none">
                      {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">IBAN</label>
                    <input value={bankForm.iban} onChange={e => setBankForm(f => ({ ...f, iban: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none"
                      placeholder="Optionnel" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">SWIFT/BIC</label>
                    <input value={bankForm.swift} onChange={e => setBankForm(f => ({ ...f, swift: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none"
                      placeholder="Optionnel" />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" checked={bankForm.active} onChange={e => setBankForm(f => ({ ...f, active: e.target.checked }))}
                      className="rounded border-neutral-300" />
                    <span className="text-xs text-neutral-700">Compte actif</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={saveBank}
                    className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition">
                    {editBankId ? "Enregistrer" : "Creer"}
                  </button>
                  <button onClick={() => setShowBankForm(false)}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg text-xs font-semibold transition">
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ DEVISES ═══ */}
      {configTab === "devises" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-bold text-neutral-900">Gestion des Devises</div>
                <div className="text-xs text-neutral-500">{currencies.length} devise(s) configuree(s) — {currencies.filter(c => c.active).length} active(s)</div>
              </div>
              <button onClick={() => openCurrencyForm()}
                className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5">
                + Nouvelle devise
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500">
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-left font-medium">Nom</th>
                    <th className="px-3 py-2 text-left font-medium">Symbole</th>
                    <th className="px-3 py-2 text-right font-medium">Taux vs XOF</th>
                    <th className="px-3 py-2 text-center font-medium">Statut</th>
                    <th className="px-3 py-2 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map(c => (
                    <tr key={c.code} className={`border-b border-neutral-100 hover:bg-neutral-50 transition ${!c.active ? "opacity-50" : ""}`}>
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{c.code}</span>
                      </td>
                      <td className="px-3 py-2.5 text-neutral-900">{c.name}</td>
                      <td className="px-3 py-2.5 text-neutral-600">{c.symbol}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-neutral-700">
                        {c.code === "XOF" ? <span className="text-neutral-400">Base</span> : c.defaultFx.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                          {c.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openCurrencyForm(c)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded text-[10px] font-semibold transition">
                            Modifier
                          </button>
                          <button onClick={() => setDeleteConfirm({ type: "currency", id: c.code })}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 rounded text-[10px] font-semibold transition">
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Currency Form Modal */}
          {showCurrencyForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCurrencyForm(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="text-sm font-bold text-neutral-900 mb-4">
                  {editCurrencyCode ? "Modifier la devise" : "Nouvelle devise"}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Code ISO (3 lettres)</label>
                    <input value={currencyForm.code} onChange={e => setCurrencyForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      disabled={!!editCurrencyCode}
                      maxLength={3}
                      className={`w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none font-mono ${editCurrencyCode ? "opacity-50" : ""}`}
                      placeholder="ex: XOF, EUR, USD..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Nom complet</label>
                    <input value={currencyForm.name} onChange={e => setCurrencyForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none"
                      placeholder="ex: Franc CFA BCEAO" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Symbole</label>
                    <input value={currencyForm.symbol} onChange={e => setCurrencyForm(f => ({ ...f, symbol: e.target.value }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none"
                      placeholder="ex: FCFA, EUR, $" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Taux de change vs XOF (1 unite = X XOF)</label>
                    <input type="number" step="0.01" value={currencyForm.defaultFx}
                      onChange={e => setCurrencyForm(f => ({ ...f, defaultFx: parseFloat(e.target.value) || 0 }))}
                      className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-neutral-400 outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={currencyForm.active} onChange={e => setCurrencyForm(f => ({ ...f, active: e.target.checked }))}
                      className="rounded border-neutral-300" />
                    <span className="text-xs text-neutral-700">Devise active</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={saveCurrency}
                    className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition">
                    {editCurrencyCode ? "Enregistrer" : "Creer"}
                  </button>
                  <button onClick={() => setShowCurrencyForm(false)}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg text-xs font-semibold transition">
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODULES ═══ */}
      {configTab === "modules" && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-sm font-semibold text-neutral-900 mb-3">Modules CDC — 13/13 implementes</div>
          <div className="space-y-1">
            {modules.map((m, i) => (
              <div key={i} className="flex items-center gap-3 text-xs py-2 border-b border-neutral-100 last:border-0">
                <div className="w-5 text-center text-neutral-400 font-mono">{i + 1}</div>
                <div className={`w-2 h-2 rounded-full ${m.status === "actif" ? "bg-emerald-500" : "bg-amber-400"}`} />
                <div className="font-semibold text-neutral-900 w-56">{m.name}</div>
                <div className="text-neutral-500 flex-1">{m.desc}</div>
                <div className={`text-[10px] px-2 py-0.5 rounded font-semibold ${m.status === "actif" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {m.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PLAN COMPTABLE SYSCOHADA ═══ */}
      {configTab === "plancomptable" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-bold text-neutral-900">Plan Comptable {planComptable.length === PLAN_COMPTABLE.length ? "SYSCOHADA revise 2017" : "personnalise"}</div>
                <div className="text-xs text-neutral-500">{planComptable.length} comptes{planComptable.length !== PLAN_COMPTABLE.length && " · Plan importe"}</div>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { nature: "actif", label: "Actif", count: planComptable.filter(c => c.nature === "actif").length },
                  { nature: "passif", label: "Passif", count: planComptable.filter(c => c.nature === "passif").length },
                  { nature: "tresorerie", label: "Tresorerie", count: planComptable.filter(c => c.nature === "tresorerie").length },
                  { nature: "charge", label: "Charges", count: planComptable.filter(c => c.nature === "charge").length },
                  { nature: "produit", label: "Produits", count: planComptable.filter(c => c.nature === "produit").length },
                ].map(n => (
                  <span key={n.nature} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${NATURE_COLORS[n.nature]}`}>
                    {n.label} ({n.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Import / Export / Add / Reset */}
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-neutral-100">
              <label className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-primary-900 text-white cursor-pointer hover:bg-primary-800 transition">
                Importer CSV
                <input type="file" accept=".csv,.txt" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const text = ev.target?.result as string;
                    if (!text) return;
                    const lines = text.split(/\r?\n/).filter(l => l.trim());
                    if (lines.length < 2) { setPcImportMsg("Fichier vide."); return; }
                    const CLASSE_LABELS: Record<number, string> = { 1: "Ressources durables", 2: "Actif immobilise", 3: "Stocks", 4: "Tiers", 5: "Tresorerie", 6: "Charges des activites ordinaires", 7: "Produits des activites ordinaires", 8: "Comptes HAO" };
                    const imported: CompteComptable[] = [];
                    let skipped = 0;
                    for (let i = 1; i < lines.length; i++) {
                      const cols = lines[i].split(";").map(c => c.trim().replace(/^"|"$/g, ""));
                      if (cols.length < 2) { skipped++; continue; }
                      const numero = cols[0];
                      const libelle = cols[1];
                      if (!numero || !libelle) { skipped++; continue; }
                      const classe = parseInt(numero[0]) || 0;
                      if (classe < 1 || classe > 8) { skipped++; continue; }
                      let nature: CompteComptable["nature"] = "actif";
                      const natCol = cols[2]?.toLowerCase();
                      if (natCol && ["actif","passif","charge","produit","tresorerie"].includes(natCol)) {
                        nature = natCol as CompteComptable["nature"];
                      } else {
                        if (classe === 1 || classe === 4) nature = "passif";
                        else if (classe === 2 || classe === 3) nature = "actif";
                        else if (classe === 5) nature = "tresorerie";
                        else if (classe === 6) nature = "charge";
                        else if (classe === 7 || classe === 8) nature = "produit";
                      }
                      imported.push({ numero, libelle, classe, classeLabel: CLASSE_LABELS[classe] || `Classe ${classe}`, nature });
                    }
                    if (imported.length > 0) {
                      importPlanComptable(imported);
                      setPcImportMsg(`${imported.length} comptes importes.${skipped > 0 ? ` ${skipped} ignores.` : ""}`);
                    } else {
                      setPcImportMsg("Aucun compte valide. Format: Numero;Libelle;Nature (nature optionnelle)");
                    }
                    setTimeout(() => setPcImportMsg(""), 6000);
                  };
                  reader.readAsText(file, "utf-8");
                  e.target.value = "";
                }} />
              </label>
              <button onClick={() => {
                const header = "Numero;Libelle;Nature";
                const lines = planComptable.map(c => `${c.numero};${c.libelle};${c.nature}`);
                const blob = new Blob(["\uFEFF" + header + "\n" + lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8;" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "plan_comptable_export.csv";
                a.click();
              }} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition">
                Exporter CSV
              </button>
              <button onClick={() => setShowAddCompte(v => !v)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition">
                + Ajouter un compte
              </button>
              <button onClick={() => { resetPlanComptable(); setPcImportMsg("Plan SYSCOHADA par defaut restaure."); setTimeout(() => setPcImportMsg(""), 4000); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition">
                Reinitialiser SYSCOHADA
              </button>
              {pcImportMsg && (
                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">{pcImportMsg}</span>
              )}
            </div>

            {/* Add compte form */}
            {showAddCompte && (
              <div className="flex flex-wrap gap-2 items-end mb-3 pb-3 border-b border-neutral-100">
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-0.5">N° compte</label>
                  <input value={newCompte.numero} onChange={e => setNewCompte(v => ({ ...v, numero: e.target.value }))}
                    placeholder="512" className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs w-20 font-mono" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] text-neutral-500 block mb-0.5">Libelle</label>
                  <input value={newCompte.libelle} onChange={e => setNewCompte(v => ({ ...v, libelle: e.target.value }))}
                    placeholder="Banques, comptes courants" className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs w-full" />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 block mb-0.5">Nature</label>
                  <select value={newCompte.nature} onChange={e => setNewCompte(v => ({ ...v, nature: e.target.value as CompteComptable["nature"] }))}
                    className="bg-white border border-neutral-200 rounded px-2 py-1 text-xs">
                    <option value="actif">Actif</option>
                    <option value="passif">Passif</option>
                    <option value="tresorerie">Tresorerie</option>
                    <option value="charge">Charge</option>
                    <option value="produit">Produit</option>
                  </select>
                </div>
                <button onClick={() => {
                  if (!newCompte.numero || !newCompte.libelle) return;
                  const cl = parseInt(newCompte.numero[0]) || 1;
                  const CLASSE_LABELS: Record<number, string> = { 1: "Ressources durables", 2: "Actif immobilise", 3: "Stocks", 4: "Tiers", 5: "Tresorerie", 6: "Charges des activites ordinaires", 7: "Produits des activites ordinaires", 8: "Comptes HAO" };
                  addCompte({ numero: newCompte.numero, libelle: newCompte.libelle, classe: cl, classeLabel: CLASSE_LABELS[cl] || `Classe ${cl}`, nature: newCompte.nature });
                  setNewCompte({ numero: "", libelle: "", classe: 1, nature: "actif" });
                }} className="px-3 py-1 rounded text-[11px] font-semibold bg-primary-900 text-white hover:bg-primary-800 transition">
                  Ajouter
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <input value={pcSearch} onChange={e => setPcSearch(e.target.value)}
                placeholder="Rechercher un compte (n° ou libelle)..."
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-900 w-64 focus:border-neutral-400 outline-none" />
              <select value={pcClasseFilter ?? ""} onChange={e => setPcClasseFilter(e.target.value ? Number(e.target.value) : null)}
                className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
                <option value="">Toutes classes</option>
                <option value="1">Classe 1 — Ressources durables</option>
                <option value="2">Classe 2 — Actif immobilise</option>
                <option value="3">Classe 3 — Stocks</option>
                <option value="4">Classe 4 — Tiers</option>
                <option value="5">Classe 5 — Tresorerie</option>
                <option value="6">Classe 6 — Charges</option>
                <option value="7">Classe 7 — Produits</option>
                <option value="8">Classe 8 — Comptes HAO</option>
              </select>
              <select value={pcNatureFilter} onChange={e => setPcNatureFilter(e.target.value)}
                className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900">
                <option value="ALL">Toutes natures</option>
                <option value="actif">Actif</option>
                <option value="passif">Passif</option>
                <option value="tresorerie">Tresorerie</option>
                <option value="charge">Charges</option>
                <option value="produit">Produits</option>
              </select>
              <div className="ml-auto flex gap-1">
                <button onClick={() => setExpandedClasses(new Set([1,2,3,4,5,6,7,8]))}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-2 py-1 rounded text-[10px] font-medium transition">
                  Tout deplier
                </button>
                <button onClick={() => setExpandedClasses(new Set())}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-2 py-1 rounded text-[10px] font-medium transition">
                  Tout replier
                </button>
              </div>
              <span className="text-xs text-neutral-400">{filteredPC.length} comptes</span>
            </div>
          </div>

          {Array.from(classeGroups.entries()).sort((a, b) => a[0] - b[0]).map(([classe, comptes]) => {
            const isExpanded = expandedClasses.has(classe);
            const classeLabel = comptes[0]?.classeLabel || "";
            return (
              <div key={classe} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <button onClick={() => toggleClasse(classe)}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition border-l-4 ${CLASSE_COLORS[classe] || "border-l-neutral-300"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs transition-transform inline-block ${isExpanded ? "rotate-90" : ""}`}>&#9654;</span>
                    <span className="text-xl font-black text-neutral-300">{classe}</span>
                    <div className="text-left">
                      <div className="text-xs font-bold text-neutral-900">Classe {classe} — {classeLabel}</div>
                      <div className="text-[10px] text-neutral-400">{comptes.length} compte{comptes.length > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from(new Set(comptes.map(c => c.nature))).map(n => (
                      <span key={n} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${NATURE_COLORS[n]}`}>{n}</span>
                    ))}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-neutral-100">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 text-neutral-400">
                          <th className="px-4 py-1.5 text-left font-medium w-24">N° Compte</th>
                          <th className="px-4 py-1.5 text-left font-medium">Libelle</th>
                          <th className="px-4 py-1.5 text-center font-medium w-28">Nature</th>
                          <th className="px-4 py-1.5 text-center font-medium w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {comptes.map(c => (
                          <tr key={c.numero} className="border-b border-neutral-50 hover:bg-blue-50/30 transition group">
                            <td className="px-4 py-2">
                              <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">{c.numero}</span>
                            </td>
                            <td className={`px-4 py-2 text-neutral-700 ${c.numero.length <= 2 ? "font-semibold" : ""}`}>
                              {c.numero.length > 2 && <span className="text-neutral-300 mr-2">&#9492;</span>}
                              {c.libelle}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${NATURE_COLORS[c.nature]}`}>
                                {c.nature}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button onClick={() => deleteCompte(c.numero)}
                                className="text-neutral-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition text-xs" title="Supprimer">
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ SUPABASE ═══ */}
      {configTab === "supabase" && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-sm font-semibold text-neutral-900 mb-3">Connexion Supabase (Cloud)</div>
          <div className="space-y-3 text-xs text-neutral-600">
            <div className="bg-neutral-50 rounded-lg p-3 font-mono text-neutral-900 text-[11px]">
              <div>URL : {SUPABASE_URL}</div>
              <div>Key : {SUPABASE_KEY.substring(0, 20)}...</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-xs">
              Les donnees sont automatiquement sauvegardees en local (localStorage). La connexion Supabase est optionnelle pour la persistance cloud multi-utilisateurs.
            </div>
            <div className="bg-neutral-900 rounded-lg p-3 font-mono text-emerald-400 text-[11px] whitespace-pre overflow-x-auto">{`-- Schema PostgreSQL complet (16 tables)
-- Voir CDC.md section 5.4 pour le schema detaille

create table tms_rows (
  id text primary key,
  entity text, bank text, section text,
  type text, cat text, ccy text,
  label text, amounts text, note text
);

create table tms_config (
  id text primary key,
  fx text, siMap text, minMap text,
  maxMap text, dso text, dpo text
);

-- + 14 tables additionnelles :
-- organizations, entities, entity_hierarchy,
-- bank_accounts, mm_wallets, currencies, fx_rates,
-- flow_categories, forecast_versions, forecast_lines,
-- forecast_amounts, bfr_parameters, credit_facilities,
-- debt_schedules, hedge_contracts, pooling_rules,
-- regulatory_decl, kyc_counterparties, audit_log,
-- user_profiles, notifications`}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ZONES GEOGRAPHIQUES ═══ */}
      {configTab === "geo" && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-sm font-semibold text-neutral-900 mb-3">Perimetre Geographique & Reglementaire</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500">
                  <th className="px-3 py-2 text-left font-medium">Zone</th>
                  <th className="px-3 py-2 text-left font-medium">Pays</th>
                  <th className="px-3 py-2 text-left font-medium">Banque Centrale</th>
                  <th className="px-3 py-2 text-left font-medium">Devise</th>
                  <th className="px-3 py-2 text-left font-medium">Plan Comptable</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["UEMOA", "CI, SN, ML, BF, TG, BJ", "BCEAO", "XOF", "SYSCOHADA"],
                  ["CEMAC", "CM, GA, CG, CF, TD", "BEAC", "XAF", "SYSCOHADA"],
                  ["CEDEAO hors UEMOA", "GH, NG", "BCN", "GHS, NGN", "Plans locaux"],
                  ["Maghreb", "MA, TN, DZ", "BAM, BCT, BA", "MAD, TND, DZD", "Plans locaux"],
                  ["Afrique de l'Est", "KE, TZ, UG, RW", "BCN", "KES, TZS", "Plans locaux"],
                  ["Holding", "FR, BE, LU, AE", "BCE, CBUAE", "EUR, USD", "IFRS"],
                ].map(([zone, pays, bc, dev, plan]) => (
                  <tr key={zone} className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-semibold text-neutral-900">{zone}</td>
                    <td className="px-3 py-2 text-neutral-600">{pays}</td>
                    <td className="px-3 py-2 text-neutral-600">{bc}</td>
                    <td className="px-3 py-2 font-mono text-neutral-700">{dev}</td>
                    <td className="px-3 py-2 text-neutral-600">{plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRM MODAL ═══ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-rose-600 text-xl">!</span>
              </div>
              <div className="text-sm font-bold text-neutral-900">Confirmer la suppression</div>
              <div className="text-xs text-neutral-500 mt-1">
                {deleteConfirm.type === "entity" && `L'entite "${entities.find(e => e.id === deleteConfirm.id)?.name}" sera supprimee. Les lignes de flux associees ne seront pas supprimees.`}
                {deleteConfirm.type === "bank" && `Le compte bancaire "${banks.find(b => b.id === deleteConfirm.id)?.name}" sera supprime.`}
                {deleteConfirm.type === "currency" && `La devise "${deleteConfirm.id}" sera supprimee.`}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={executeDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition">
                Supprimer
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-4 py-2.5 rounded-lg text-xs font-semibold transition">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
