import { useState, useMemo, useEffect } from "react";
import { ENTITIES, BANKS, MONTHS, PLAN_COMPTABLE, type CompteComptable } from "../constants";
import { p, fmt, uid } from "../lib/helpers";
import { predictSeries, computeBacktestMetrics } from "../lib/predictions";
import { local } from "../lib/storage";
import type { FlowRow, AppStats } from "../types";
import Icon from "./ui/Icon";

/* ── Types locaux ── */
interface GLEntry {
  id: string;
  date: string;
  journal: string;
  compte: string;            // Compte unique (SYSCOHADA)
  description: string;       // Description / intitulé du compte
  analyticCode: string;      // Code analytique
  numeroPiece: string;
  libelle: string;           // Libellé écriture
  debit: number;             // Mouvement débit
  credit: number;            // Mouvement crédit
  solde: number;             // Solde
  entity: string;
  imported: boolean;
  // Legacy compat (mapped from compte)
  compteDebit: string;
  compteCredit: string;
}

interface ImportReport {
  totalLines: number;
  inserted: number;
  rejected: number;
  dupes: number;
  errors: { line: number; piece: string; motif: string }[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  fileHash: string;
}

interface LTFOverride {
  month: number;       // 0-11
  predicted: number;
  override: number;
  justification: string;
}

/* ── Validation helpers (CDC 4.4) ── */
const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$/;
const VALID_COMPTES = new Set(PLAN_COMPTABLE.map(c => c.numero));

function isValidCompte(c: string): boolean {
  if (!c || c.length < 2) return false;
  // Check exact match or prefix match (e.g. "521100" matches "512" prefix)
  return VALID_COMPTES.has(c) || [...VALID_COMPTES].some(v => c.startsWith(v));
}

async function computeFileHash(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "hash-unavailable";
  }
}

interface Props {
  rows: FlowRow[];
  setRows: (fn: (prev: FlowRow[]) => FlowRow[]) => void;
  ccySym: string;
  stats: AppStats;
  planComptable?: CompteComptable[];
}

type SubTab = "journal" | "import" | "classe5" | "ltf" | "backtest";

const SUB_TABS: { key: SubTab; label: string; icon: string }[] = [
  { key: "journal",  label: "Journal d'Import",   icon: "journal" },
  { key: "import",   label: "Importer GL",        icon: "export" },
  { key: "classe5",  label: "GL Classe 5",        icon: "bank" },
  { key: "ltf",      label: "LTF Prévision",      icon: "sparkles" },
  { key: "backtest", label: "Backtesting",         icon: "chart" },
];

/* Classe 5 — Comptes financiers (SYSCOHADA) */
const CLASSE5_PREFIXES = ["50", "51", "52", "53", "54", "55", "56", "57", "58", "59"];
const isClasse5 = (c: string) => CLASSE5_PREFIXES.some(px => c.startsWith(px));

const LS_KEY = "grandlivre_entries";
function loadEntries(): GLEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function saveEntries(e: GLEntry[]) { localStorage.setItem(LS_KEY, JSON.stringify(e)); }

export default function GrandLivreTab({ rows, setRows, ccySym, stats, planComptable: pcProp }: Props) {
  const _pc = pcProp || PLAN_COMPTABLE;
  const VALID_COMPTES_SET = useMemo(() => new Set(_pc.map(c => c.numero)), [_pc]);
  const [sub, setSub] = useState<SubTab>("journal");
  const [entries, setEntries] = useState<GLEntry[]>(loadEntries);
  const [importMsg, setImportMsg] = useState("");
  const [csvPreview, setCsvPreview] = useState<GLEntry[] | null>(null);
  const [filterEntity, setFilterEntity] = useState("ALL");
  const [filterCompte, setFilterCompte] = useState("");
  const [ltfOverrides, setLtfOverrides] = useState<LTFOverride[]>([]);

  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  const persist = (next: GLEntry[]) => { setEntries(next); saveEntries(next); };

  // Persist LTF overrides
  useEffect(() => {
    if (ltfOverrides.length > 0) local.save("ltf_overrides", ltfOverrides);
  }, [ltfOverrides]);
  useEffect(() => {
    const saved = local.load<LTFOverride[]>("ltf_overrides");
    if (saved) setLtfOverrides(saved);
  }, []);

  /* ── Import CSV GL — CDC 4.4 validation renforcée ── */
  const handleGLImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setImportMsg("Fichier vide ou invalide"); return; }

      const fileHash = await computeFileHash(text);
      const parsed: GLEntry[] = [];
      const existingPieces = new Set(entries.map(e => `${e.numeroPiece}|${e.compte}`));
      const errors: ImportReport["errors"] = [];
      let dupes = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      // Detect column format from header
      const header = lines[0].split(";").map(h => h.trim().toLowerCase());
      const isNewFormat = header.some(h => h.includes("analytic") || h === "compte" || h.includes("description"));

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(";").map(c => c.trim());

        let date: string, journal: string, piece: string, compte: string,
            description: string, analyticCode: string, libelle: string,
            debitStr: string, creditStr: string, soldeStr: string, entity: string;

        if (isNewFormat) {
          // Format réel GL: DATE;Code Journal;Compte;Description;Analytic code;N° de pièce;Libellé écriture;Mouvement débit;Mouvement crédit;Solde
          if (cols.length < 8) {
            errors.push({ line: i + 1, piece: "", motif: "Nombre de colonnes insuffisant (<8)" });
            continue;
          }
          [date, journal, compte, description, analyticCode, piece, libelle, debitStr, creditStr] = cols;
          soldeStr = cols[9] || "0";
          entity = cols[10] || "CI";
        } else {
          // Legacy format: Date;Journal;NumPiece;CompteDebit;CompteCredit;Libelle;Debit;Credit;Entite
          if (cols.length < 8) {
            errors.push({ line: i + 1, piece: "", motif: "Nombre de colonnes insuffisant (<8)" });
            continue;
          }
          date = cols[0]; journal = cols[1]; piece = cols[2];
          compte = cols[3] || cols[4]; // Use whichever account is populated
          description = ""; analyticCode = "";
          libelle = cols[5]; debitStr = cols[6]; creditStr = cols[7];
          soldeStr = "0"; entity = cols[8] || "CI";
        }

        // Validation: N° pièce obligatoire
        if (!piece || !piece.trim()) {
          errors.push({ line: i + 1, piece: "(vide)", motif: "Numéro de pièce manquant" });
          continue;
        }

        // Validation: doublon pièce + compte (même pièce peut avoir plusieurs lignes sur comptes différents)
        const dupeKey = `${piece}|${compte}`;
        if (existingPieces.has(dupeKey)) {
          errors.push({ line: i + 1, piece, motif: `Pièce ${piece} / Compte ${compte} déjà enregistré` });
          dupes++;
          continue;
        }

        // Validation: format de date
        if (date && !DATE_REGEX.test(date)) {
          errors.push({ line: i + 1, piece, motif: `Format date invalide: "${date}"` });
          continue;
        }

        // Validation: montants
        const debitVal = p(debitStr);
        const creditVal = p(creditStr);
        const soldeVal = p(soldeStr);
        if (debitVal < 0) {
          errors.push({ line: i + 1, piece, motif: `Débit négatif: ${debitStr}` });
          continue;
        }
        if (creditVal < 0) {
          errors.push({ line: i + 1, piece, motif: `Crédit négatif: ${creditStr}` });
          continue;
        }

        // Validation: compte SYSCOHADA (warning, non bloquant)
        if (compte && !isValidCompte(compte)) {
          errors.push({ line: i + 1, piece, motif: `Compte non reconnu: ${compte} (importé quand même)` });
        }

        totalDebit += debitVal;
        totalCredit += creditVal;

        parsed.push({
          id: uid(), date, journal, compte: compte || "",
          description: description || "", analyticCode: analyticCode || "",
          numeroPiece: piece, libelle,
          debit: debitVal, credit: creditVal, solde: soldeVal,
          // Map to legacy fields for Classe 5 compatibility
          compteDebit: debitVal > 0 ? compte : "",
          compteCredit: creditVal > 0 ? compte : "",
          entity, imported: true,
        });

        // Track piece+compte to prevent intra-file duplicates
        existingPieces.add(dupeKey);
      }

      const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
      const report: ImportReport = {
        totalLines: lines.length - 1, inserted: parsed.length,
        rejected: errors.filter(e => !e.motif.includes("importé quand même")).length,
        dupes, errors, totalDebit, totalCredit, balanced, fileHash,
      };
      setImportReport(report);

      if (parsed.length === 0) {
        setImportMsg(dupes > 0
          ? `Toutes les écritures existent déjà (${dupes} doublon(s))`
          : "Aucune écriture valide trouvée");
        return;
      }

      setCsvPreview(parsed);
      setImportMsg(
        `Aperçu : ${parsed.length} prête(s) / ${report.rejected} rejetée(s) / ${dupes} doublon(s)` +
        (!balanced ? ` — ⚠ DÉSÉQUILIBRE: D=${fmt(totalDebit)} ≠ C=${fmt(totalCredit)}` : " — ✓ Équilibré")
      );
    };
    reader.readAsText(file, "UTF-8");
  };

  const confirmImport = () => {
    if (!csvPreview) return;
    const next = [...entries, ...csvPreview];
    persist(next);
    setImportMsg(`✓ ${csvPreview.length} écriture(s) importée(s)`);
    setCsvPreview(null);
  };

  const deleteEntry = (id: string) => {
    persist(entries.filter(e => e.id !== id));
  };

  const [syncMsg, setSyncMsg] = useState("");

  /** Synchronise GL entries → FlowRow lines for the whole app */
  const syncToFlows = () => {
    if (entries.length === 0) { setSyncMsg("Aucune ecriture a synchroniser."); return; }

    // Parse month from date (DD/MM/YYYY or YYYY-MM-DD)
    const getMonth = (d: string): number => {
      if (!d) return 0;
      if (d.includes("/")) { const parts = d.split("/"); return parseInt(parts[1]) - 1; }
      if (d.includes("-")) { const parts = d.split("-"); return parseInt(parts[1]) - 1; }
      return 0;
    };

    // Determine category from account classe
    const getCat = (compte: string): "enc" | "dec" => {
      const c1 = parseInt(compte[0]);
      if (c1 === 7) return "enc"; // Produits
      return "dec"; // Charges & others default to dec
    };

    // Determine IAS7 section from account classe
    const getSection = (compte: string): "ope" | "inv" | "fin" => {
      const c2 = compte.substring(0, 2);
      // Classe 2 (immo) → investissement
      if (compte[0] === "2") return "inv";
      // Classe 16/17 (emprunts/dettes financières) → financement
      if (c2 === "16" || c2 === "17" || c2 === "15") return "fin";
      // Classe 5 (trésorerie) → opérationnel
      return "ope";
    };

    // Group by: entity + account + determine enc/dec
    // Aggregate monthly amounts
    const groups: Record<string, {
      entity: string; compte: string; libelle: string;
      section: "ope" | "inv" | "fin"; cat: "enc" | "dec";
      amounts: number[];
    }> = {};

    // Only sync Classe 6 (charges) and 7 (produits) — these are the P&L flows
    // Classe 5 movements are treasury (already captured by bank balances)
    entries.forEach(e => {
      const cpt = e.compte || e.compteDebit || e.compteCredit;
      if (!cpt) return;
      const c1 = parseInt(cpt[0]);
      // Only process P&L accounts (6=charges, 7=produits) and investment (2) / financing (16-17)
      if (c1 !== 6 && c1 !== 7 && c1 !== 2) return;

      const cat = getCat(cpt);
      const key = `${e.entity}|${cpt}|${cat}`;
      if (!groups[key]) {
        groups[key] = {
          entity: e.entity || "CI",
          compte: cpt,
          libelle: e.description || e.libelle || `Compte ${cpt}`,
          section: getSection(cpt),
          cat,
          amounts: Array(12).fill(0),
        };
      }
      const mi = getMonth(e.date);
      if (mi >= 0 && mi < 12) {
        // For enc (produits): use credit; for dec (charges): use debit
        groups[key].amounts[mi] += cat === "enc" ? e.credit : e.debit;
      }
    });

    const grouped = Object.values(groups).filter(g => g.amounts.some(a => a > 0));
    if (grouped.length === 0) {
      setSyncMsg("Aucun flux P&L (classes 6/7) trouve dans le GL.");
      setTimeout(() => setSyncMsg(""), 5000);
      return;
    }

    // Remove previously synced rows (marked by compteComptable starting with "GL:")
    const existingNonGL = rows.filter(r => !r.compteComptable?.startsWith("GL:"));

    // Create new FlowRows
    const newFlowRows: FlowRow[] = grouped.map(g => ({
      id: uid(),
      entity: g.entity,
      bank: BANKS[0] || "SGBCI",
      section: g.section,
      type: g.cat === "enc" ? "Autres produits opérationnels" : "Fournisseurs & prestataires",
      cat: g.cat,
      ccy: "XOF",
      label: g.libelle,
      amounts: g.amounts.map(a => a > 0 ? a.toString() : ""),
      amountsReel: g.amounts.map(a => a > 0 ? a.toString() : ""), // GL = réalisé
      note: "Synchronise depuis Grand Livre",
      compteComptable: `GL:${g.compte}`,
      scenario: "base",
      statut: "realise",
      recurrence: "ponctuel",
      probabilite: 100,
    }));

    setRows(() => [...existingNonGL, ...newFlowRows]);
    setSyncMsg(`${newFlowRows.length} ligne(s) de flux creees depuis ${entries.length} ecritures GL.`);
    setTimeout(() => setSyncMsg(""), 8000);
  };

  /* ── Classe 5 filtered ── */
  const classe5Entries = useMemo(() =>
    entries.filter(e =>
      isClasse5(e.compte || e.compteDebit || e.compteCredit) &&
      (filterEntity === "ALL" || e.entity === filterEntity) &&
      (!filterCompte || (e.compte || e.compteDebit || e.compteCredit).includes(filterCompte))
    ),
  [entries, filterEntity, filterCompte]);

  /* ── Classe 5 balance by compte ── */
  const classe5Balances = useMemo(() => {
    const map: Record<string, { debit: number; credit: number; solde: number; description: string }> = {};
    classe5Entries.forEach(e => {
      const cpt = e.compte || e.compteDebit || e.compteCredit;
      if (!cpt || !isClasse5(cpt)) return;
      if (!map[cpt]) map[cpt] = { debit: 0, credit: 0, solde: 0, description: e.description || "" };
      map[cpt].debit += e.debit;
      map[cpt].credit += e.credit;
      map[cpt].solde += e.debit - e.credit;
      if (!map[cpt].description && e.description) map[cpt].description = e.description;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [classe5Entries]);

  /* ── LTF Data ── */
  const ltfData = useMemo(() => {
    const monthlyActual = Array(12).fill(0);
    rows.forEach(r => {
      r.amountsReel.forEach((v, mi) => {
        monthlyActual[mi] += (r.cat === "enc" ? 1 : -1) * p(v);
      });
    });
    const predicted = predictSeries(monthlyActual);
    return { monthlyActual, predicted };
  }, [rows]);

  /* ── Backtest Metrics ── */
  const backtestMetrics = useMemo(() => {
    const actual = ltfData.monthlyActual.filter(v => v !== 0);
    if (actual.length < 3) return null;
    const trainSize = Math.max(3, Math.floor(actual.length * 0.7));
    const train = actual.slice(0, trainSize);
    const test = actual.slice(trainSize);
    if (test.length === 0) return null;
    const pred = predictSeries(train).slice(0, test.length);
    return computeBacktestMetrics(pred, test);
  }, [ltfData]);

  /* ── Download GL Template ── */
  const downloadTemplate = () => {
    const header = "DATE;Code Journal;Compte;Description;Analytic code;N° de pièce;Libellé écriture;Mouvement débit;Mouvement crédit;Solde";
    const samples = [
      "15/01/2026;BQ;521000;Banques locales;ANG-CI;GL001;Encaissement loyer Angré;1500000;0;1500000",
      "15/01/2026;BQ;411000;Clients;ANG-CI;GL001;Encaissement loyer Angré;0;1500000;-1500000",
      "20/01/2026;OD;601000;Achats de matières;MAINT;GL002;Achat fournitures maintenance;0;350000;-350000",
      "20/01/2026;OD;521000;Banques locales;MAINT;GL002;Achat fournitures maintenance;350000;0;350000",
    ];
    const blob = new Blob(["\uFEFF" + header + "\n" + samples.join("\n") + "\n"], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "template_grandlivre.csv"; a.click();
  };

  return (
    <div className="p-4 w-full space-y-3">
      {/* Sub-tab nav */}
      <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5 w-fit">
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${sub === t.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"}`}>
            <Icon name={t.icon} className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ JOURNAL D'IMPORT ═══ */}
      {sub === "journal" && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-800">Journal des écritures importées</div>
              <div className="text-xs text-neutral-500">{entries.length} écriture(s) au total</div>
            </div>
            <div className="flex items-center gap-2">
              <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
                className="border border-neutral-300 rounded-lg px-2 py-1 text-xs">
                <option value="ALL">Toutes entités</option>
                {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.id} — {e.name}</option>)}
              </select>
            </div>
          </div>
          <div className="max-h-[500px] overflow-auto">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Aucune écriture importée. Utilisez l'onglet "Importer GL".</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500 sticky top-0">
                    <th className="px-2 py-1.5 text-left font-medium">Date</th>
                    <th className="px-2 py-1.5 text-left font-medium">Journal</th>
                    <th className="px-2 py-1.5 text-left font-medium">Compte</th>
                    <th className="px-2 py-1.5 text-left font-medium">Description</th>
                    <th className="px-2 py-1.5 text-left font-medium">Analytique</th>
                    <th className="px-2 py-1.5 text-left font-medium">N° Pièce</th>
                    <th className="px-2 py-1.5 text-left font-medium">Libellé</th>
                    <th className="px-2 py-1.5 text-right font-medium">Mvt Débit</th>
                    <th className="px-2 py-1.5 text-right font-medium">Mvt Crédit</th>
                    <th className="px-2 py-1.5 text-right font-medium">Solde</th>
                    <th className="px-2 py-1.5 w-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries
                    .filter(e => filterEntity === "ALL" || e.entity === filterEntity)
                    .slice(-100).reverse().map(e => (
                    <tr key={e.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-2 py-1 text-neutral-600">{e.date}</td>
                      <td className="px-2 py-1 font-medium">{e.journal}</td>
                      <td className="px-2 py-1 font-mono text-neutral-800">{e.compte}</td>
                      <td className="px-2 py-1 text-neutral-500 truncate max-w-[120px]">{e.description}</td>
                      <td className="px-2 py-1 text-neutral-400 font-mono text-[10px]">{e.analyticCode}</td>
                      <td className="px-2 py-1 font-mono text-neutral-500">{e.numeroPiece}</td>
                      <td className="px-2 py-1 text-neutral-600 truncate max-w-[200px]">{e.libelle}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-emerald-600 font-medium">{e.debit > 0 ? fmt(e.debit) : "—"}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-rose-600 font-medium">{e.credit > 0 ? fmt(e.credit) : "—"}</td>
                      <td className={`px-2 py-1 text-right tabular-nums font-medium ${(e.solde || 0) >= 0 ? "text-neutral-700" : "text-rose-600"}`}>{e.solde ? fmt(e.solde) : "—"}</td>
                      <td className="px-1 py-1">
                        <button onClick={() => deleteEntry(e.id)} className="text-neutral-300 hover:text-red-500 font-bold transition">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ IMPORTER GL ═══ */}
      {sub === "import" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-blue-50">
              <div className="text-sm font-semibold text-blue-700">Import Grand Livre</div>
              <div className="text-xs text-neutral-500">Importez les écritures comptables depuis votre logiciel</div>
            </div>
            <div className="p-4 space-y-3">
              <div
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file"; input.accept = ".csv,.txt";
                  input.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) handleGLImport(f); };
                  input.click();
                }}
                className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all border-neutral-300 hover:border-blue-400 hover:bg-blue-50"
              >
                <div className="mb-2 text-neutral-300"><Icon name="journal" className="w-8 h-8" /></div>
                <div className="text-xs text-neutral-500">
                  Cliquez pour importer un fichier Grand Livre CSV<br />
                  <span className="text-neutral-900 underline font-medium">Dédoublonnage automatique par N° de pièce</span>
                </div>
              </div>

              {importMsg && (
                <div className={`text-xs px-3 py-2 rounded-lg ${importMsg.includes("✓") ? "bg-emerald-50 text-emerald-700" : importMsg.includes("Aperçu") ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                  {importMsg}
                </div>
              )}

              {csvPreview && csvPreview.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-semibold text-amber-700">Aperçu — {csvPreview.length} écriture(s)</div>
                  <div className="max-h-40 overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-amber-600">
                          <th className="text-left px-1">Date</th>
                          <th className="text-left px-1">Compte</th>
                          <th className="text-left px-1">Pièce</th>
                          <th className="text-left px-1">Libellé</th>
                          <th className="text-right px-1">Débit</th>
                          <th className="text-right px-1">Crédit</th>
                          <th className="text-right px-1">Solde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(0, 15).map((e, i) => (
                          <tr key={i} className="border-t border-amber-100">
                            <td className="px-1 py-0.5">{e.date}</td>
                            <td className="px-1 py-0.5 font-mono">{e.compte}</td>
                            <td className="px-1 py-0.5 font-mono">{e.numeroPiece}</td>
                            <td className="px-1 py-0.5 truncate max-w-[150px]">{e.libelle}</td>
                            <td className="px-1 py-0.5 text-right tabular-nums">{e.debit > 0 ? fmt(e.debit) : ""}</td>
                            <td className="px-1 py-0.5 text-right tabular-nums">{e.credit > 0 ? fmt(e.credit) : ""}</td>
                            <td className="px-1 py-0.5 text-right tabular-nums">{e.solde ? fmt(e.solde) : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={confirmImport}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                      Confirmer l'import
                    </button>
                    <button onClick={() => { setCsvPreview(null); setImportMsg(""); }}
                      className="px-3 py-1.5 border border-neutral-300 text-neutral-600 rounded-lg text-xs font-semibold hover:bg-neutral-50 transition">
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                <div className="text-xs text-neutral-500 font-medium">Format CSV attendu :</div>
                <div className="text-[10px] font-mono text-neutral-400 bg-white rounded p-2 overflow-x-auto whitespace-nowrap border border-neutral-200">
                  DATE;Code Journal;Compte;Description;Analytic code;N° de pièce;Libellé écriture;Mouvement débit;Mouvement crédit;Solde
                </div>
                <button onClick={downloadTemplate}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold w-full transition">
                  Télécharger le modèle CSV
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-xs space-y-1">
                <div className="font-semibold">Contrôles à l'import (CDC 4.4)</div>
                <div>N° pièce unique · Format date · Montants ≥ 0 · Équilibre D=C · Comptes SYSCOHADA · Hash SHA-256</div>
              </div>

              {/* Rapport d'import détaillé */}
              {importReport && importReport.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-2">
                  <div className="font-semibold text-amber-700">
                    Rapport d'import — {importReport.inserted} OK / {importReport.rejected} rejetée(s) / {importReport.dupes} doublon(s)
                  </div>
                  <div className="max-h-32 overflow-auto">
                    {importReport.errors.slice(0, 30).map((err, i) => (
                      <div key={i} className="text-amber-600 py-0.5 border-b border-amber-100">
                        L.{err.line} {err.piece ? `[${err.piece}]` : ""} — {err.motif}
                      </div>
                    ))}
                    {importReport.errors.length > 30 && (
                      <div className="text-amber-500 italic mt-1">...et {importReport.errors.length - 30} autres</div>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-500">
                    Hash fichier : {importReport.fileHash.slice(0, 16)}...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats rapide */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="text-sm font-semibold text-neutral-800 mb-3">Statistiques GL</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-neutral-900">{entries.length}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Écritures totales</div>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-blue-600">{new Set(entries.map(e => e.journal)).size}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Journaux distincts</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-black text-emerald-600">{fmt(entries.reduce((s, e) => s + e.debit, 0))}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Total Débits</div>
                </div>
                <div className="bg-rose-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-black text-rose-600">{fmt(entries.reduce((s, e) => s + e.credit, 0))}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Total Crédits</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="text-sm font-semibold text-neutral-800 mb-2">Par journal</div>
              {(() => {
                const journals: Record<string, { n: number; d: number; c: number }> = {};
                entries.forEach(e => {
                  if (!journals[e.journal]) journals[e.journal] = { n: 0, d: 0, c: 0 };
                  journals[e.journal].n++;
                  journals[e.journal].d += e.debit;
                  journals[e.journal].c += e.credit;
                });
                return Object.entries(journals).length === 0 ? (
                  <div className="text-xs text-neutral-400 italic">Aucune donnée</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-neutral-500">
                        <th className="text-left py-1">Journal</th>
                        <th className="text-right py-1">Écritures</th>
                        <th className="text-right py-1">Débits</th>
                        <th className="text-right py-1">Crédits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(journals).map(([j, v]) => (
                        <tr key={j} className="border-t border-neutral-100">
                          <td className="py-1 font-medium">{j}</td>
                          <td className="py-1 text-right">{v.n}</td>
                          <td className="py-1 text-right text-emerald-600">{fmt(v.d)}</td>
                          <td className="py-1 text-right text-rose-600">{fmt(v.c)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══ GL CLASSE 5 ═══ */}
      {sub === "classe5" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold text-neutral-800">Grand Livre Trésorerie — Classe 5</div>
                <div className="text-xs text-neutral-500">Comptes financiers SYSCOHADA (50x–59x)</div>
              </div>
              <div className="flex items-center gap-2">
                <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
                  className="border border-neutral-300 rounded-lg px-2 py-1 text-xs">
                  <option value="ALL">Toutes entités</option>
                  {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
                </select>
                <input value={filterCompte} onChange={e => setFilterCompte(e.target.value)}
                  placeholder="Filtrer compte..."
                  className="border border-neutral-300 rounded-lg px-2 py-1 text-xs w-32" />
              </div>
            </div>

            {/* Balances par compte */}
            {classe5Balances.length > 0 && (
              <div className="px-4 py-3 border-b border-neutral-100 bg-blue-50">
                <div className="text-xs font-semibold text-blue-700 mb-2">Balance des comptes Classe 5</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {classe5Balances.map(([compte, bal]) => (
                    <div key={compte} className="bg-white rounded-lg p-2 border border-blue-100">
                      <div className="font-mono text-xs font-bold text-neutral-800">{compte}</div>
                      {bal.description && <div className="text-[10px] text-neutral-500 truncate">{bal.description}</div>}
                      <div className={`text-sm font-black ${bal.solde >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {bal.solde >= 0 ? "+" : ""}{fmt(bal.solde)} {ccySym}
                      </div>
                      <div className="text-[10px] text-neutral-400">D: {fmt(bal.debit)} | C: {fmt(bal.credit)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Écritures classe 5 */}
            <div className="max-h-[400px] overflow-auto">
              {classe5Entries.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400 italic">
                  Aucune écriture Classe 5 trouvée. Importez un Grand Livre contenant des comptes 50x à 59x.
                </div>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 sticky top-0">
                      <th className="px-2 py-1.5 text-left font-medium">Date</th>
                      <th className="px-2 py-1.5 text-left font-medium">Compte</th>
                      <th className="px-2 py-1.5 text-left font-medium">Description</th>
                      <th className="px-2 py-1.5 text-left font-medium">Pièce</th>
                      <th className="px-2 py-1.5 text-left font-medium">Libellé</th>
                      <th className="px-2 py-1.5 text-right font-medium">Mvt Débit</th>
                      <th className="px-2 py-1.5 text-right font-medium">Mvt Crédit</th>
                      <th className="px-2 py-1.5 text-right font-medium">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classe5Entries.slice(-80).reverse().map(e => (
                      <tr key={e.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="px-2 py-1">{e.date}</td>
                        <td className="px-2 py-1 font-mono text-neutral-800">{e.compte}</td>
                        <td className="px-2 py-1 text-neutral-500 truncate max-w-[120px]">{e.description}</td>
                        <td className="px-2 py-1 font-mono text-neutral-500">{e.numeroPiece}</td>
                        <td className="px-2 py-1 text-neutral-600 truncate max-w-[200px]">{e.libelle}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-emerald-600">{e.debit > 0 ? fmt(e.debit) : "—"}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-rose-600">{e.credit > 0 ? fmt(e.credit) : "—"}</td>
                        <td className={`px-2 py-1 text-right tabular-nums font-medium ${(e.solde || 0) >= 0 ? "text-neutral-700" : "text-rose-600"}`}>{e.solde ? fmt(e.solde) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LTF PRÉVISION ═══ */}
      {sub === "ltf" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="text-sm font-semibold text-neutral-800 mb-1">LTF — Last Thinking Forecast</div>
            <div className="text-xs text-neutral-500 mb-4">
              Prévision IA basée sur l'historique réel. Vous pouvez surcharger chaque mois avec justification obligatoire.
            </div>

            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500">
                  <th className="px-2 py-1.5 text-left font-medium">Mois</th>
                  <th className="px-2 py-1.5 text-right font-medium">Réalisé</th>
                  <th className="px-2 py-1.5 text-right font-medium">IA Prédit</th>
                  <th className="px-2 py-1.5 text-right font-medium">Override LTF</th>
                  <th className="px-2 py-1.5 text-left font-medium">Justification</th>
                  <th className="px-2 py-1.5 text-right font-medium">Final</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((m, mi) => {
                  const actual = ltfData.monthlyActual[mi];
                  const predicted = ltfData.predicted[mi] || 0;
                  const override = ltfOverrides.find(o => o.month === mi);
                  const final_ = override ? override.override : predicted;

                  return (
                    <tr key={mi} className="border-b border-neutral-100">
                      <td className="px-2 py-1.5 font-medium">{m}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{actual !== 0 ? fmt(actual) : "—"}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-blue-600">{fmt(predicted)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="text"
                          value={override?.override?.toString() || ""}
                          placeholder="—"
                          onChange={(e) => {
                            const val = p(e.target.value);
                            setLtfOverrides(prev => {
                              const existing = prev.findIndex(o => o.month === mi);
                              if (existing >= 0) {
                                const next = [...prev];
                                next[existing] = { ...next[existing], override: val };
                                return next;
                              }
                              return [...prev, { month: mi, predicted, override: val, justification: "" }];
                            });
                          }}
                          className="w-24 text-right border border-neutral-300 rounded px-1 py-0.5 text-xs tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {override !== undefined && (
                          <input
                            type="text"
                            value={override?.justification || ""}
                            placeholder="Justification obligatoire..."
                            onChange={(e) => {
                              setLtfOverrides(prev => prev.map(o =>
                                o.month === mi ? { ...o, justification: e.target.value } : o
                              ));
                            }}
                            className={`w-full border rounded px-1 py-0.5 text-xs ${override && !override.justification ? "border-rose-300 bg-rose-50" : "border-neutral-300"}`}
                          />
                        )}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums font-bold ${final_ >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {fmt(final_)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50 font-bold">
                  <td className="px-2 py-2">TOTAL</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(ltfData.monthlyActual.reduce((s, v) => s + v, 0))}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-blue-600">{fmt(ltfData.predicted.reduce((s, v) => s + v, 0))}</td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {fmt(MONTHS.reduce((s, _, mi) => {
                      const override = ltfOverrides.find(o => o.month === mi);
                      return s + (override ? override.override : (ltfData.predicted[mi] || 0));
                    }, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>

            {ltfOverrides.some(o => !o.justification) && (
              <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-700 text-xs">
                Attention : Toute surcharge LTF nécessite une justification obligatoire.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ BACKTESTING ═══ */}
      {sub === "backtest" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="text-sm font-semibold text-neutral-800 mb-1">Backtesting — Qualité des prévisions</div>
            <div className="text-xs text-neutral-500 mb-4">
              Évaluation de la précision du modèle de prévision sur données historiques (train 70% / test 30%).
            </div>

            {backtestMetrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-blue-600 font-medium uppercase">MAPE</div>
                    <div className={`text-2xl font-black ${backtestMetrics.mape < 15 ? "text-emerald-600" : backtestMetrics.mape < 30 ? "text-amber-600" : "text-rose-600"}`}>
                      {backtestMetrics.mape.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      {backtestMetrics.mape < 15 ? "Excellent" : backtestMetrics.mape < 30 ? "Acceptable" : "À améliorer"}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-purple-600 font-medium uppercase">MAE</div>
                    <div className="text-lg font-black text-purple-600">{fmt(backtestMetrics.mae)}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Erreur moyenne abs.</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-amber-600 font-medium uppercase">RMSE</div>
                    <div className="text-lg font-black text-amber-600">{fmt(backtestMetrics.rmse)}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Root Mean Sq. Error</div>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-3 text-center">
                    <div className="text-[10px] text-neutral-600 font-medium uppercase">Tracking Signal</div>
                    <div className={`text-2xl font-black ${Math.abs(backtestMetrics.trackingSignal) < 4 ? "text-emerald-600" : "text-rose-600"}`}>
                      {backtestMetrics.trackingSignal.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      {Math.abs(backtestMetrics.trackingSignal) < 4 ? "Pas de biais" : "Biais détecté"}
                    </div>
                  </div>
                </div>

                {/* Guide d'interprétation */}
                <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-semibold text-neutral-700">Guide d'interprétation</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-neutral-500">
                    <div><strong>MAPE &lt; 15%</strong> — Prévisions de haute qualité</div>
                    <div><strong>MAPE 15-30%</strong> — Prévisions acceptables</div>
                    <div><strong>MAPE &gt; 30%</strong> — Modèle à recalibrer</div>
                    <div><strong>|TS| &lt; 4</strong> — Pas de biais systématique</div>
                    <div><strong>MAE</strong> — Amplitude moyenne des erreurs en {ccySym}</div>
                    <div><strong>RMSE</strong> — Pénalise davantage les grosses erreurs</div>
                  </div>
                </div>

                {/* Comparatif mensuel */}
                <div>
                  <div className="text-xs font-semibold text-neutral-700 mb-2">Comparatif Prédit vs Réalisé</div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-500">
                        <th className="px-2 py-1.5 text-left font-medium">Mois</th>
                        <th className="px-2 py-1.5 text-right font-medium">Réalisé</th>
                        <th className="px-2 py-1.5 text-right font-medium">Prédit</th>
                        <th className="px-2 py-1.5 text-right font-medium">Écart</th>
                        <th className="px-2 py-1.5 text-right font-medium">Écart %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONTHS.map((m, mi) => {
                        const actual = ltfData.monthlyActual[mi];
                        const pred = ltfData.predicted[mi] || 0;
                        const ecart = pred - actual;
                        const ecartPct = actual !== 0 ? (ecart / Math.abs(actual)) * 100 : 0;
                        if (actual === 0 && pred === 0) return null;
                        return (
                          <tr key={mi} className="border-b border-neutral-100">
                            <td className="px-2 py-1.5 font-medium">{m}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{fmt(actual)}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-blue-600">{fmt(pred)}</td>
                            <td className={`px-2 py-1.5 text-right tabular-nums ${ecart >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {ecart >= 0 ? "+" : ""}{fmt(ecart)}
                            </td>
                            <td className={`px-2 py-1.5 text-right tabular-nums ${Math.abs(ecartPct) < 15 ? "text-emerald-600" : Math.abs(ecartPct) < 30 ? "text-amber-600" : "text-rose-600"}`}>
                              {ecartPct >= 0 ? "+" : ""}{ecartPct.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                <div className="mb-2"><Icon name="chart" className="w-8 h-8" /></div>
                <div className="text-sm font-semibold text-amber-700">Données insuffisantes</div>
                <div className="text-xs text-amber-600 mt-1">
                  Le backtesting nécessite au moins 3 mois de données réalisées.<br />
                  Renseignez les montants réels dans le Journal pour activer cette fonctionnalité.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
