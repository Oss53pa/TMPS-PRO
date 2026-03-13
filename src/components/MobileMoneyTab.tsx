import { useState } from "react";
import type { MobileMoneyWallet, MobileMoneyTransaction } from "../types";
import { ENTITIES, MM_OPERATORS } from "../constants";
import { fmt, uid, p } from "../lib/helpers";

type SubTab = "overview" | "wallets" | "transactions" | "collecte";

interface Props {
  wallets: MobileMoneyWallet[];
  transactions: MobileMoneyTransaction[];
  addWallet: (w: Omit<MobileMoneyWallet, "id">) => void;
  updateWallet: (id: string, field: string, value: any) => void;
  deleteWallet: (id: string) => void;
  addTransaction: (t: Omit<MobileMoneyTransaction, "id">) => void;
  ccySym: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

function typeBadge(type: MobileMoneyTransaction["type"]) {
  const map: Record<MobileMoneyTransaction["type"], string> = {
    cashin:   "bg-emerald-100 text-emerald-700",
    cashout:  "bg-blue-100 text-blue-700",
    paiement: "bg-neutral-100 text-neutral-700",
    collecte: "bg-amber-100 text-amber-700",
  };
  const labels: Record<MobileMoneyTransaction["type"], string> = {
    cashin:   "Cash-in",
    cashout:  "Cash-out",
    paiement: "Paiement",
    collecte: "Collecte",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[type]}`}>
      {labels[type]}
    </span>
  );
}

function statusBadge(status: MobileMoneyTransaction["status"]) {
  const map: Record<MobileMoneyTransaction["status"], string> = {
    effectué:   "bg-emerald-100 text-emerald-700",
    en_attente: "bg-amber-100 text-amber-700",
    échoué:     "bg-rose-100 text-rose-700",
  };
  const labels: Record<MobileMoneyTransaction["status"], string> = {
    effectué:   "Effectué",
    en_attente: "En attente",
    échoué:     "Échoué",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function usageBarColor(pct: number) {
  if (pct > 90) return "bg-rose-500";
  if (pct > 70) return "bg-amber-400";
  return "bg-emerald-500";
}

function operatorLabel(id: string) {
  return MM_OPERATORS.find(o => o.id === id)?.name ?? id;
}

// ── Sub-tab: Overview ──────────────────────────────────────────────────────

function OverviewTab({
  wallets,
  transactions,
  ccySym,
}: {
  wallets: MobileMoneyWallet[];
  transactions: MobileMoneyTransaction[];
  ccySym: string;
}) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  const monthTxns = transactions.filter(t => t.date.startsWith(currentMonth));
  const monthVolume = monthTxns.reduce((s, t) => s + t.amount, 0);
  const cumulFees = transactions.reduce((s, t) => s + t.fees, 0);

  // Distribution by operator
  const byOp: Record<string, number> = {};
  for (const w of wallets) {
    byOp[w.operator] = (byOp[w.operator] ?? 0) + w.balance;
  }
  const maxOpBalance = Math.max(...Object.values(byOp), 1);

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Nombre wallets</div>
          <div className="text-2xl font-bold text-neutral-900">{wallets.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Solde total MM</div>
          <div className="text-2xl font-bold text-emerald-600">{fmt(totalBalance)}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">{ccySym}</div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Volume du mois</div>
          <div className="text-2xl font-bold text-neutral-900">{fmt(monthVolume)}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">{monthTxns.length} transactions</div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Frais cumulés</div>
          <div className="text-2xl font-bold text-rose-600">{fmt(cumulFees)}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">{ccySym}</div>
        </div>
      </div>

      {/* Distribution by operator */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <div className="text-sm font-semibold text-neutral-900 mb-4">Répartition des soldes par opérateur</div>
        {Object.keys(byOp).length === 0 ? (
          <div className="text-xs text-neutral-400 text-center py-6">Aucun wallet enregistré</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(byOp)
              .sort((a, b) => b[1] - a[1])
              .map(([opId, bal]) => {
                const pct = Math.round((bal / maxOpBalance) * 100);
                const opName = operatorLabel(opId);
                return (
                  <div key={opId}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-neutral-700">{opName}</span>
                      <span className="text-xs text-neutral-500">{fmt(bal)} {ccySym}</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-neutral-700 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-tab: Wallets ───────────────────────────────────────────────────────

const CURRENCIES_MM = ["XOF", "XAF", "EUR", "USD", "GHS", "KES", "NGN"];

function WalletsTab({
  wallets,
  transactions,
  addWallet,
  updateWallet,
  deleteWallet,
  ccySym,
}: {
  wallets: MobileMoneyWallet[];
  transactions: MobileMoneyTransaction[];
  addWallet: (w: Omit<MobileMoneyWallet, "id">) => void;
  updateWallet: (id: string, field: string, value: any) => void;
  deleteWallet: (id: string) => void;
  ccySym: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<MobileMoneyWallet, "id">>({
    entity: ENTITIES[0].id,
    operator: MM_OPERATORS[0].id,
    walletNumber: "",
    ccy: "XOF",
    balance: 0,
    dailyLimit: 0,
    monthlyLimit: 0,
  });

  function monthUsage(walletId: string): number {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return transactions
      .filter(t => t.walletId === walletId && t.date.startsWith(month))
      .reduce((s, t) => s + t.amount, 0);
  }

  function handleAdd() {
    if (!form.walletNumber.trim()) return;
    addWallet(form);
    setForm({
      entity: ENTITIES[0].id,
      operator: MM_OPERATORS[0].id,
      walletNumber: "",
      ccy: "XOF",
      balance: 0,
      dailyLimit: 0,
      monthlyLimit: 0,
    });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
          <span className="text-sm font-semibold text-neutral-900">Wallets Mobile Money ({wallets.length})</span>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-neutral-700 transition-colors"
          >
            + Ajouter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500">
                <th className="py-2 px-3 text-left font-medium">Entité</th>
                <th className="py-2 px-3 text-left font-medium">Opérateur</th>
                <th className="py-2 px-3 text-left font-medium">N° Wallet</th>
                <th className="py-2 px-3 text-left font-medium">Devise</th>
                <th className="py-2 px-3 text-right font-medium">Solde</th>
                <th className="py-2 px-3 text-right font-medium">Plafond Jour</th>
                <th className="py-2 px-3 text-right font-medium">Plafond Mois</th>
                <th className="py-2 px-3 text-center font-medium">Utilisation</th>
                <th className="py-2 px-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wallets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-400">
                    Aucun wallet — cliquez sur « Ajouter »
                  </td>
                </tr>
              ) : (
                wallets.map(w => {
                  const used = monthUsage(w.id);
                  const pct = w.monthlyLimit > 0 ? Math.min(100, Math.round((used / w.monthlyLimit) * 100)) : 0;
                  const barColor = usageBarColor(pct);
                  const entityName = ENTITIES.find(e => e.id === w.entity)?.name ?? w.entity;
                  return (
                    <tr key={w.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-2 px-3 font-medium text-neutral-800">{entityName}</td>
                      <td className="py-2 px-3 text-neutral-700">{operatorLabel(w.operator)}</td>
                      <td className="py-2 px-3 font-mono text-neutral-700">{w.walletNumber}</td>
                      <td className="py-2 px-3 text-neutral-600">{w.ccy}</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">{fmt(w.balance)}</td>
                      <td className="py-2 px-3 text-right text-neutral-600">{w.dailyLimit > 0 ? fmt(w.dailyLimit) : "—"}</td>
                      <td className="py-2 px-3 text-right text-neutral-600">{w.monthlyLimit > 0 ? fmt(w.monthlyLimit) : "—"}</td>
                      <td className="py-2 px-3">
                        {w.monthlyLimit > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[10px] font-medium ${pct > 90 ? "text-rose-600" : pct > 70 ? "text-amber-600" : "text-emerald-600"}`}>
                              {pct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => deleteWallet(w.id)}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-medium"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-sm font-semibold text-neutral-900 mb-3">Nouveau wallet</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Entité</label>
              <select
                value={form.entity}
                onChange={e => setForm(f => ({ ...f, entity: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
              >
                {ENTITIES.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Opérateur</label>
              <select
                value={form.operator}
                onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
              >
                {MM_OPERATORS.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">N° Wallet</label>
              <input
                type="text"
                placeholder="+225 07 00 00 00 00"
                value={form.walletNumber}
                onChange={e => setForm(f => ({ ...f, walletNumber: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Devise</label>
              <select
                value={form.ccy}
                onChange={e => setForm(f => ({ ...f, ccy: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
              >
                {CURRENCIES_MM.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Solde initial</label>
              <input
                type="number"
                value={form.balance || ""}
                onChange={e => setForm(f => ({ ...f, balance: p(e.target.value) }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Plafond journalier</label>
              <input
                type="number"
                value={form.dailyLimit || ""}
                onChange={e => setForm(f => ({ ...f, dailyLimit: p(e.target.value) }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Plafond mensuel</label>
              <input
                type="number"
                value={form.monthlyLimit || ""}
                onChange={e => setForm(f => ({ ...f, monthlyLimit: p(e.target.value) }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                className="w-full bg-neutral-900 text-white text-xs rounded-lg px-3 py-1.5 font-medium hover:bg-neutral-700 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-tab: Transactions ─────────────────────────────────────────────────

function TransactionsTab({
  wallets,
  transactions,
  addTransaction,
  ccySym,
}: {
  wallets: MobileMoneyWallet[];
  transactions: MobileMoneyTransaction[];
  addTransaction: (t: Omit<MobileMoneyTransaction, "id">) => void;
  ccySym: string;
}) {
  const [showForm, setShowForm] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Omit<MobileMoneyTransaction, "id">>({
    walletId: wallets[0]?.id ?? "",
    type: "cashin",
    amount: 0,
    fees: 0,
    date: today,
    status: "effectué",
    reference: "",
    counterparty: "",
  });

  function walletLabel(id: string) {
    const w = wallets.find(x => x.id === id);
    if (!w) return `#${id}`;
    return `${operatorLabel(w.operator)} — ${w.walletNumber}`;
  }

  function autoFees(amount: number, walletId: string): number {
    const w = wallets.find(x => x.id === walletId);
    if (!w) return 0;
    const op = MM_OPERATORS.find(o => o.id === w.operator);
    if (!op) return 0;
    return Math.round(amount * (op.feePct / 100) + op.feeFixed);
  }

  function handleAmountChange(val: string) {
    const amt = p(val);
    const fees = autoFees(amt, form.walletId);
    setForm(f => ({ ...f, amount: amt, fees }));
  }

  function handleWalletChange(id: string) {
    const fees = autoFees(form.amount, id);
    setForm(f => ({ ...f, walletId: id, fees }));
  }

  function handleAdd() {
    if (!form.walletId || form.amount <= 0) return;
    addTransaction(form);
    setForm({
      walletId: wallets[0]?.id ?? "",
      type: "cashin",
      amount: 0,
      fees: 0,
      date: today,
      status: "effectué",
      reference: "",
      counterparty: "",
    });
    setShowForm(false);
  }

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
          <span className="text-sm font-semibold text-neutral-900">Transactions ({transactions.length})</span>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-neutral-700 transition-colors"
          >
            + Ajouter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500">
                <th className="py-2 px-3 text-left font-medium">Date</th>
                <th className="py-2 px-3 text-left font-medium">Wallet</th>
                <th className="py-2 px-3 text-left font-medium">Type</th>
                <th className="py-2 px-3 text-right font-medium">Montant</th>
                <th className="py-2 px-3 text-right font-medium">Frais</th>
                <th className="py-2 px-3 text-center font-medium">Statut</th>
                <th className="py-2 px-3 text-left font-medium">Contrepartie</th>
                <th className="py-2 px-3 text-left font-medium">Référence</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    Aucune transaction enregistrée
                  </td>
                </tr>
              ) : (
                sorted.map(t => (
                  <tr key={t.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="py-2 px-3 text-neutral-600">{t.date}</td>
                    <td className="py-2 px-3 text-neutral-700 font-medium">{walletLabel(t.walletId)}</td>
                    <td className="py-2 px-3">{typeBadge(t.type)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-neutral-900">{fmt(t.amount)}</td>
                    <td className="py-2 px-3 text-right text-rose-600">{t.fees > 0 ? fmt(t.fees) : "—"}</td>
                    <td className="py-2 px-3 text-center">{statusBadge(t.status)}</td>
                    <td className="py-2 px-3 text-neutral-600">{t.counterparty || "—"}</td>
                    <td className="py-2 px-3 font-mono text-neutral-500">{t.reference || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="text-sm font-semibold text-neutral-900 mb-3">Nouvelle transaction</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Wallet</label>
              <select
                value={form.walletId}
                onChange={e => handleWalletChange(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{walletLabel(w.id)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as MobileMoneyTransaction["type"] }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
              >
                <option value="cashin">Cash-in</option>
                <option value="cashout">Cash-out</option>
                <option value="paiement">Paiement</option>
                <option value="collecte">Collecte</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Montant</label>
              <input
                type="number"
                value={form.amount || ""}
                onChange={e => handleAmountChange(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Frais</label>
              <input
                type="number"
                value={form.fees || ""}
                onChange={e => setForm(f => ({ ...f, fees: p(e.target.value) }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Statut</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as MobileMoneyTransaction["status"] }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
              >
                <option value="effectué">Effectué</option>
                <option value="en_attente">En attente</option>
                <option value="échoué">Échoué</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Contrepartie</label>
              <input
                type="text"
                value={form.counterparty}
                onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-1">Référence</label>
              <input
                type="text"
                value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAdd}
              className="bg-neutral-900 text-white text-xs rounded-lg px-4 py-1.5 font-medium hover:bg-neutral-700 transition-colors"
            >
              Enregistrer
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-neutral-100 text-neutral-700 text-xs rounded-lg px-4 py-1.5 font-medium hover:bg-neutral-200 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-tab: Collecte ──────────────────────────────────────────────────────

function CollecteTab({
  wallets,
  transactions,
  ccySym,
}: {
  wallets: MobileMoneyWallet[];
  transactions: MobileMoneyTransaction[];
  ccySym: string;
}) {
  // Compute collection stats by operator
  type CollecteRow = {
    operator: string;
    count: number;
    total: number;
    fees: number;
    success: number;
  };

  const stats: Record<string, CollecteRow> = {};

  for (const op of MM_OPERATORS) {
    stats[op.id] = { operator: op.id, count: 0, total: 0, fees: 0, success: 0 };
  }

  for (const t of transactions.filter(x => x.type === "collecte")) {
    const w = wallets.find(x => x.id === t.walletId);
    if (!w) continue;
    const row = stats[w.operator];
    if (!row) continue;
    row.count++;
    row.total += t.amount;
    row.fees += t.fees;
    if (t.status === "effectué") row.success++;
  }

  const rows = Object.values(stats).filter(r => r.count > 0);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      {/* Summary table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 text-sm font-semibold text-neutral-900">
          Taux de collecte par canal
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-xs">
            Aucune transaction de collecte enregistrée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500">
                  <th className="py-2 px-3 text-left font-medium">Canal / Opérateur</th>
                  <th className="py-2 px-3 text-right font-medium">Nb opérations</th>
                  <th className="py-2 px-3 text-right font-medium">Volume collecté</th>
                  <th className="py-2 px-3 text-right font-medium">Frais</th>
                  <th className="py-2 px-3 text-right font-medium">Taux succès</th>
                  <th className="py-2 px-3 text-right font-medium">Part du total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const rate = r.count > 0 ? Math.round((r.success / r.count) * 100) : 0;
                  const share = grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0;
                  return (
                    <tr key={r.operator} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-2 px-3 font-medium text-neutral-800">{operatorLabel(r.operator)}</td>
                      <td className="py-2 px-3 text-right text-neutral-700">{r.count}</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">{fmt(r.total)}</td>
                      <td className="py-2 px-3 text-right text-rose-600">{fmt(r.fees)}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-semibold ${rate >= 90 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-rose-600"}`}>
                          {rate}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-1.5 bg-neutral-600 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-neutral-500">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50 font-semibold text-neutral-800">
                  <td className="py-2 px-3">Total</td>
                  <td className="py-2 px-3 text-right">{rows.reduce((s, r) => s + r.count, 0)}</td>
                  <td className="py-2 px-3 text-right text-emerald-700">{fmt(grandTotal)}</td>
                  <td className="py-2 px-3 text-right text-rose-600">{fmt(rows.reduce((s, r) => s + r.fees, 0))}</td>
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Roadmap */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <div className="text-sm font-semibold text-neutral-900 mb-3">Feuille de route — Intégrations API</div>
        <div className="space-y-3">
          {[
            {
              name: "Wave",
              status: "En cours",
              statusCls: "bg-amber-100 text-amber-700",
              desc: "Intégration via Wave Business API (webhook de collecte temps réel). Disponible CI & SN.",
            },
            {
              name: "MTN MoMo",
              status: "Planifié",
              statusCls: "bg-neutral-100 text-neutral-600",
              desc: "API MTN Mobile Money — collections & disbursements. Couverture CI, CM, GH, BJ. Mise en prod T3 2026.",
            },
            {
              name: "Orange Money",
              status: "Planifié",
              statusCls: "bg-neutral-100 text-neutral-600",
              desc: "Partenariat Orange Business Services. Prise en charge multi-pays UEMOA + CEMAC. Calendrier à confirmer.",
            },
            {
              name: "CinetPay",
              status: "Disponible",
              statusCls: "bg-emerald-100 text-emerald-700",
              desc: "Agrégateur de paiements CI/SN/CM/ML — API REST documentée. Réconciliation automatique possible.",
            },
            {
              name: "M-Pesa",
              status: "Planifié",
              statusCls: "bg-neutral-100 text-neutral-600",
              desc: "Daraja API (Safaricom) pour KE & TZ. Nécessite un compte Mpesa Business. Développement T4 2026.",
            },
          ].map(item => (
            <div key={item.name} className="flex gap-3 p-3 bg-neutral-50 rounded-lg">
              <div className="min-w-[90px]">
                <div className="text-xs font-bold text-neutral-900 mb-1">{item.name}</div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.statusCls}`}>
                  {item.status}
                </span>
              </div>
              <div className="text-xs text-neutral-600 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Note réglementaire</div>
          <div className="text-xs text-neutral-600">
            Toute activité de collecte Mobile Money au sein de l'UEMOA est soumise à l'instruction BCEAO n°008-05-2015
            relative aux émetteurs de monnaie électronique. Les flux de collecte sont intégrés au reporting de change
            mensuel (Module 9 — Conformité).
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function MobileMoneyTab({
  wallets,
  transactions,
  addWallet,
  updateWallet,
  deleteWallet,
  addTransaction,
  ccySym,
}: Props) {
  const [sub, setSub] = useState<SubTab>("overview");

  const tabs: { key: SubTab; label: string }[] = [
    { key: "overview",     label: "Vue d'ensemble" },
    { key: "wallets",      label: "Wallets" },
    { key: "transactions", label: "Transactions" },
    { key: "collecte",     label: "Collecte" },
  ];

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sub === t.key
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {sub === "overview" && (
        <OverviewTab wallets={wallets} transactions={transactions} ccySym={ccySym} />
      )}
      {sub === "wallets" && (
        <WalletsTab
          wallets={wallets}
          transactions={transactions}
          addWallet={addWallet}
          updateWallet={updateWallet}
          deleteWallet={deleteWallet}
          ccySym={ccySym}
        />
      )}
      {sub === "transactions" && (
        <TransactionsTab
          wallets={wallets}
          transactions={transactions}
          addTransaction={addTransaction}
          ccySym={ccySym}
        />
      )}
      {sub === "collecte" && (
        <CollecteTab wallets={wallets} transactions={transactions} ccySym={ccySym} />
      )}
    </div>
  );
}
