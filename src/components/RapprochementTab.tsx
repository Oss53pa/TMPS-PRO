import { useState, useMemo, useEffect } from "react";
import { ENTITIES, BANKS, MONTHS } from "../constants";
import { p, fmt, uid } from "../lib/helpers";
import { local } from "../lib/storage";
import type { FlowRow } from "../types";

interface BankStatement {
  id: string;
  date: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  matched: boolean;
  matchedFlowId?: string;
}

interface Props {
  rows: FlowRow[];
  ccySym: string;
}

const TABS = ["Rapprochement", "Import Relevé", "État"] as const;

export default function RapprochementTab({ rows, ccySym }: Props) {
  const [sub, setSub] = useState<(typeof TABS)[number]>("Rapprochement");
  const [entity, setEntity] = useState(ENTITIES[0].id);
  const [bank, setBank] = useState(BANKS[0]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [soldeBancaire, setSoldeBancaire] = useState("");

  // Import state
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<BankStatement[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Load
  useEffect(() => {
    const saved = local.load<BankStatement[]>("reconciliation");
    if (saved) setStatements(saved);
  }, []);

  // Save
  useEffect(() => {
    local.save("reconciliation", statements);
  }, [statements]);

  // Filtered flows for selected entity/bank/month
  const matchedFlows = useMemo(() => {
    return rows.filter(r => r.entity === entity && r.bank === bank && p(r.amounts[month]) !== 0);
  }, [rows, entity, bank, month]);

  const soldeComptable = useMemo(() => {
    return matchedFlows.reduce((s, r) => {
      const amt = p(r.amounts[month]);
      return s + (r.cat === "enc" ? amt : r.cat === "dec" ? -amt : 0);
    }, 0);
  }, [matchedFlows, month]);

  const soldeBancaireNum = p(soldeBancaire);

  const ecart = soldeComptable - soldeBancaireNum;
  const nbRapproches = statements.filter(s => s.matched).length;
  const nbEnAttente = statements.filter(s => !s.matched).length;

  // Auto-match algorithm
  const autoMatch = () => {
    setStatements(prev => {
      const updated = [...prev];
      const usedFlowIds = new Set(updated.filter(s => s.matched).map(s => s.matchedFlowId));

      updated.forEach(stmt => {
        if (stmt.matched) return;
        const stmtAmount = stmt.credit - stmt.debit;

        const match = matchedFlows.find(f => {
          if (usedFlowIds.has(f.id)) return false;
          const flowAmt = p(f.amounts[month]) * (f.cat === "enc" ? 1 : -1);
          return Math.abs(Math.abs(flowAmt) - Math.abs(stmtAmount)) < 1;
        });

        if (match) {
          stmt.matched = true;
          stmt.matchedFlowId = match.id;
          usedFlowIds.add(match.id);
        }
      });

      return updated;
    });
  };

  // Add manual statement
  const addStatement = () => {
    setStatements(prev => [...prev, {
      id: uid(), date: new Date().toISOString().split("T")[0],
      libelle: "", debit: 0, credit: 0, solde: 0, matched: false,
    }]);
  };

  // Import CSV
  const parseImport = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return;
    const preview: BankStatement[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";").map(c => c.trim());
      if (cols.length < 4) continue;
      preview.push({
        id: uid(), date: cols[0], libelle: cols[1],
        debit: parseFloat(cols[2]?.replace(/\s/g, "").replace(",", ".")) || 0,
        credit: parseFloat(cols[3]?.replace(/\s/g, "").replace(",", ".")) || 0,
        solde: cols.length > 4 ? (parseFloat(cols[4]?.replace(/\s/g, "").replace(",", ".")) || 0) : 0,
        matched: false,
      });
    }
    setImportPreview(preview);
  };

  const confirmImport = () => {
    setStatements(prev => [...prev, ...importPreview]);
    setImportPreview([]);
    setImportText("");
    setSub("Rapprochement");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setSub(t)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${sub === t ? "border-teal-600 text-teal-700" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ═══ RAPPROCHEMENT ═══ */}
      {sub === "Rapprochement" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Entité</label>
              <select value={entity} onChange={e => setEntity(e.target.value)} className="border rounded px-2 py-1.5 text-xs">
                {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Banque</label>
              <select value={bank} onChange={e => setBank(e.target.value)} className="border rounded px-2 py-1.5 text-xs">
                {BANKS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Mois</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border rounded px-2 py-1.5 text-xs">
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Solde relevé bancaire</label>
              <input type="text" value={soldeBancaire} onChange={e => setSoldeBancaire(e.target.value)}
                className="border rounded px-2 py-1.5 text-xs w-32" placeholder="0" />
            </div>
            <button onClick={autoMatch}
              className="mt-4 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition">
              Rapprochement auto
            </button>
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* LEFT: Comptable */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-2 bg-blue-50 border-b text-xs font-semibold text-blue-700">
                Solde Comptable (GL) — {fmt(soldeComptable)} {ccySym}
              </div>
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b">
                      <th className="text-left px-2 py-1.5 font-medium">Type</th>
                      <th className="text-right px-2 py-1.5 font-medium">Montant</th>
                      <th className="px-2 py-1.5 w-6">✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedFlows.map(f => {
                      const amt = p(f.amounts[month]);
                      const isMatched = statements.some(s => s.matchedFlowId === f.id);
                      return (
                        <tr key={f.id} className={`border-b ${isMatched ? "bg-emerald-50" : ""}`}>
                          <td className="px-2 py-1.5 truncate max-w-[200px]">{f.label || f.type}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums font-semibold ${f.cat === "enc" ? "text-emerald-600" : "text-rose-600"}`}>
                            {f.cat === "dec" ? "-" : ""}{fmt(amt)}
                          </td>
                          <td className="px-2 py-1.5 text-center">{isMatched ? "✓" : ""}</td>
                        </tr>
                      );
                    })}
                    {matchedFlows.length === 0 && (
                      <tr><td colSpan={3} className="px-2 py-4 text-center text-neutral-400 italic">Aucun flux pour cette sélection</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: Relevé Bancaire */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-2 bg-amber-50 border-b text-xs font-semibold text-amber-700 flex items-center justify-between">
                <span>Relevé Bancaire — {fmt(soldeBancaireNum)} {ccySym}</span>
                <button onClick={addStatement} className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded hover:bg-amber-700 transition">
                  + Ligne
                </button>
              </div>
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b">
                      <th className="text-left px-2 py-1.5 font-medium">Date</th>
                      <th className="text-left px-2 py-1.5 font-medium">Libellé</th>
                      <th className="text-right px-2 py-1.5 font-medium">Débit</th>
                      <th className="text-right px-2 py-1.5 font-medium">Crédit</th>
                      <th className="px-2 py-1.5 w-6">✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.map(s => (
                      <tr key={s.id} className={`border-b ${s.matched ? "bg-emerald-50" : ""}`}>
                        <td className="px-2 py-1">
                          <input type="date" value={s.date} onChange={e => setStatements(prev => prev.map(st => st.id === s.id ? { ...st, date: e.target.value } : st))}
                            className="border-0 bg-transparent text-xs w-24" />
                        </td>
                        <td className="px-2 py-1">
                          <input type="text" value={s.libelle} onChange={e => setStatements(prev => prev.map(st => st.id === s.id ? { ...st, libelle: e.target.value } : st))}
                            className="border-0 bg-transparent text-xs w-full" placeholder="Libellé" />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" value={s.debit || ""} onChange={e => setStatements(prev => prev.map(st => st.id === s.id ? { ...st, debit: parseFloat(e.target.value) || 0 } : st))}
                            className="border-0 bg-transparent text-xs w-20 text-right text-rose-600" />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" value={s.credit || ""} onChange={e => setStatements(prev => prev.map(st => st.id === s.id ? { ...st, credit: parseFloat(e.target.value) || 0 } : st))}
                            className="border-0 bg-transparent text-xs w-20 text-right text-emerald-600" />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <input type="checkbox" checked={s.matched} onChange={e => setStatements(prev => prev.map(st => st.id === s.id ? { ...st, matched: e.target.checked } : st))} />
                        </td>
                      </tr>
                    ))}
                    {statements.length === 0 && (
                      <tr><td colSpan={5} className="px-2 py-4 text-center text-neutral-400 italic">Aucune ligne de relevé</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className={`rounded-xl border p-4 ${Math.abs(ecart) < 1 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="grid grid-cols-5 gap-4 text-xs">
              <div>
                <div className="text-[10px] text-neutral-500">Solde comptable</div>
                <div className="font-bold tabular-nums">{fmt(soldeComptable)}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-500">Solde relevé</div>
                <div className="font-bold tabular-nums">{fmt(soldeBancaireNum)}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-500">Écart</div>
                <div className={`font-bold tabular-nums ${Math.abs(ecart) < 1 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(ecart)}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-500">Rapprochés</div>
                <div className="font-bold text-emerald-600">{nbRapproches}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-500">En attente</div>
                <div className="font-bold text-amber-600">{nbEnAttente}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ IMPORT RELEVÉ ═══ */}
      {sub === "Import Relevé" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold mb-3">Importer un relevé bancaire</h3>
            <div className="bg-neutral-50 rounded-lg p-3 mb-3">
              <div className="text-[10px] font-mono text-neutral-400">Format : Date;Libellé;Débit;Crédit;Solde</div>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = ev => { const t = ev.target?.result as string; if (t) parseImport(t); };
                  reader.readAsText(file, "utf-8");
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragOver ? "border-teal-500 bg-teal-50" : "border-neutral-300 hover:border-neutral-400"}`}>
              <div className="text-2xl mb-1 text-neutral-300">📄</div>
              <div className="text-xs text-neutral-500">Glissez-déposez un relevé CSV</div>
            </div>
          </div>

          {importPreview.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs font-semibold mb-2">Aperçu : {importPreview.length} lignes</div>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b">
                      <th className="text-left px-2 py-1">Date</th>
                      <th className="text-left px-2 py-1">Libellé</th>
                      <th className="text-right px-2 py-1">Débit</th>
                      <th className="text-right px-2 py-1">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 10).map(s => (
                      <tr key={s.id} className="border-b">
                        <td className="px-2 py-1">{s.date}</td>
                        <td className="px-2 py-1 truncate max-w-[200px]">{s.libelle}</td>
                        <td className="px-2 py-1 text-right text-rose-600">{s.debit ? fmt(s.debit) : "—"}</td>
                        <td className="px-2 py-1 text-right text-emerald-600">{s.credit ? fmt(s.credit) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={confirmImport} className="mt-3 w-full px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition">
                Confirmer l'import ({importPreview.length} lignes)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ ÉTAT DE RAPPROCHEMENT ═══ */}
      {sub === "État" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border p-6">
            <div className="text-center mb-4">
              <div className="text-sm font-bold">ÉTAT DE RAPPROCHEMENT BANCAIRE</div>
              <div className="text-xs text-neutral-500">
                {ENTITIES.find(e => e.id === entity)?.name} — {bank} — {MONTHS[month]} 2026
              </div>
              <div className="text-[10px] text-neutral-400">Date : {new Date().toLocaleDateString("fr-FR")}</div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span>Solde comptable (Grand Livre)</span>
                <span className="font-bold tabular-nums">{fmt(soldeComptable)} {ccySym}</span>
              </div>
              <div className="flex justify-between py-1 border-b text-emerald-600">
                <span>+ Encaissements non comptabilisés</span>
                <span className="font-bold tabular-nums">{fmt(statements.filter(s => !s.matched && s.credit > 0).reduce((a, s) => a + s.credit, 0))}</span>
              </div>
              <div className="flex justify-between py-1 border-b text-rose-600">
                <span>- Décaissements non comptabilisés</span>
                <span className="font-bold tabular-nums">{fmt(statements.filter(s => !s.matched && s.debit > 0).reduce((a, s) => a + s.debit, 0))}</span>
              </div>
              <div className="flex justify-between py-1 border-b font-bold">
                <span>= Solde comptable ajusté</span>
                <span className="tabular-nums">{fmt(soldeComptable + statements.filter(s => !s.matched).reduce((a, s) => a + s.credit - s.debit, 0))}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Solde relevé bancaire</span>
                <span className="font-bold tabular-nums">{fmt(soldeBancaireNum)}</span>
              </div>
              <div className={`flex justify-between py-2 text-sm font-bold ${Math.abs(ecart) < 1 ? "text-emerald-600" : "text-rose-600"}`}>
                <span>Écart résiduel</span>
                <span className="tabular-nums">{fmt(ecart)} {ccySym}</span>
              </div>
            </div>

            <div className={`mt-4 text-center py-2 rounded-lg ${Math.abs(ecart) < 1 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              <span className="text-xs font-bold">
                {Math.abs(ecart) < 1 ? "✓ Rapproché" : "En cours de rapprochement"}
              </span>
            </div>
          </div>

          {/* Unreconciled items */}
          {nbEnAttente > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs font-bold mb-2">Éléments non rapprochés ({nbEnAttente})</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b">
                    <th className="text-left px-2 py-1">Date</th>
                    <th className="text-left px-2 py-1">Libellé</th>
                    <th className="text-right px-2 py-1">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {statements.filter(s => !s.matched).map(s => (
                    <tr key={s.id} className="border-b">
                      <td className="px-2 py-1">{s.date}</td>
                      <td className="px-2 py-1">{s.libelle}</td>
                      <td className={`px-2 py-1 text-right tabular-nums ${s.credit > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {s.credit > 0 ? fmt(s.credit) : `-${fmt(s.debit)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
