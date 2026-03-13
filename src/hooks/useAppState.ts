import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BANKS, ENTITIES, SCENARIOS, DEFAULT_FX, CURRENCIES, MONTHS, ALL_TYPES, FLOW_TYPES, IAS7, FLOAT_DELAYS, PLAN_COMPTABLE, type CompteComptable } from "../constants";
import { p, uid, newRow } from "../lib/helpers";
import { computeStats } from "../lib/stats";
import { local, sb } from "../lib/storage";
import type { FlowRow, IntradayPosition, RegulatoryDeclaration, FiscalDeadline, KycCounterparty, MobileMoneyWallet, MobileMoneyTransaction, SweepTransfer, Entity, BankAccount, CurrencyConfig, MLResultsData } from "../types";
import { runFullMLEngine } from "../lib/mlEngine";

export function useAppState() {
  const [tab, setTab] = useState("home");
  const [rows, setRows] = useState<FlowRow[]>([]);
  const [fx, setFx] = useState<Record<string, number>>({ ...DEFAULT_FX });
  const [scenario, setScenario] = useState("base");
  const [horizon, setHorizon] = useState("Annuel");
  const [siMap, setSiMap] = useState<Record<string, string>>(Object.fromEntries(BANKS.map(b => [b, ""])));
  const [minMap, setMinMap] = useState<Record<string, string>>(Object.fromEntries(BANKS.map(b => [b, ""])));
  const [maxMap, setMaxMap] = useState<Record<string, string>>(Object.fromEntries(BANKS.map(b => [b, ""])));
  const [dso, setDso] = useState<Record<string, string>>(Object.fromEntries(ENTITIES.map(e => [e.id, "45"])));
  const [dpo, setDpo] = useState<Record<string, string>>(Object.fromEntries(ENTITIES.map(e => [e.id, "60"])));
  const [filterEntity, setFilterEntity] = useState("ALL");
  const [filterSec, setFilterSec] = useState("ALL");
  const [sbStatus, setSbStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [reportCcy, setReportCcy] = useState("XOF");
  const [exercice, setExercice] = useState(new Date().getFullYear());
  const [aiMsg, setAiMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mlResults, setMlResults] = useState<MLResultsData | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FlowRow>(newRow());
  const [importMsg, setImportMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  // ── Module 4: Intraday ──
  const [intradayPositions, setIntradayPositions] = useState<IntradayPosition[]>([]);

  // ── Module 9: Conformité ──
  const [declarations, setDeclarations] = useState<RegulatoryDeclaration[]>([]);
  const [fiscalDeadlines, setFiscalDeadlines] = useState<FiscalDeadline[]>([]);
  const [kycCounterparties, setKycCounterparties] = useState<KycCounterparty[]>([]);

  // ── Module 10: Mobile Money ──
  const [mmWallets, setMmWallets] = useState<MobileMoneyWallet[]>([]);
  const [mmTransactions, setMmTransactions] = useState<MobileMoneyTransaction[]>([]);

  // ── Nivellement: Transferts inter-comptes ──
  const [sweepTransfers, setSweepTransfers] = useState<SweepTransfer[]>([]);

  // ── Référentiel dynamique ──
  const [customEntities, setCustomEntities] = useState<Entity[]>([...ENTITIES]);
  const [customBanks, setCustomBanks] = useState<BankAccount[]>(
    BANKS.map((b, i) => ({ id: `bank_${i}`, name: b, entity: "ALL", iban: "", swift: "", ccy: "XOF", active: true }))
  );
  const [customCurrencies, setCustomCurrencies] = useState<CurrencyConfig[]>(
    CURRENCIES.map(c => ({ code: c, name: c, symbol: c, defaultFx: DEFAULT_FX[c] || 1, active: true }))
  );

  // ── Plan Comptable personnalisable ──
  const [customPlanComptable, setCustomPlanComptable] = useState<CompteComptable[]>([...PLAN_COMPTABLE]);

  // ── Load on mount ──
  useEffect(() => {
    const savedRows = local.load<FlowRow[]>("rows");
    const savedConfig = local.load<any>("config");
    if (savedRows && savedRows.length) setRows(savedRows.map(r => ({
      ...r,
      amountsReel: r.amountsReel || Array(12).fill(""),
      scenario: r.scenario || "base",
      statut: r.statut || "prevu",
      recurrence: r.recurrence || "ponctuel",
      probabilite: r.probabilite ?? 100,
      exercice: r.exercice ?? new Date().getFullYear(),
    })));
    if (savedConfig) {
      if (savedConfig.fx) setFx(savedConfig.fx);
      if (savedConfig.siMap) setSiMap(savedConfig.siMap);
      if (savedConfig.minMap) setMinMap(savedConfig.minMap);
      if (savedConfig.maxMap) setMaxMap(savedConfig.maxMap);
      if (savedConfig.dso) setDso(savedConfig.dso);
      if (savedConfig.dpo) setDpo(savedConfig.dpo);
    }
    // Load new modules
    const savedIntraday = local.load<IntradayPosition[]>("intraday");
    if (savedIntraday) setIntradayPositions(savedIntraday);
    const savedDecl = local.load<RegulatoryDeclaration[]>("declarations");
    if (savedDecl) setDeclarations(savedDecl);
    const savedFiscal = local.load<FiscalDeadline[]>("fiscal");
    if (savedFiscal) setFiscalDeadlines(savedFiscal);
    const savedKyc = local.load<KycCounterparty[]>("kyc");
    if (savedKyc) setKycCounterparties(savedKyc);
    const savedWallets = local.load<MobileMoneyWallet[]>("wallets");
    if (savedWallets) setMmWallets(savedWallets);
    const savedTx = local.load<MobileMoneyTransaction[]>("mmtx");
    if (savedTx) setMmTransactions(savedTx);
    const savedSweeps = local.load<SweepTransfer[]>("sweeps");
    if (savedSweeps) setSweepTransfers(savedSweeps);
    const savedEntities = local.load<Entity[]>("entities");
    if (savedEntities && savedEntities.length) setCustomEntities(savedEntities);
    const savedBanks = local.load<BankAccount[]>("banks");
    if (savedBanks && savedBanks.length) setCustomBanks(savedBanks);
    const savedCurrencies = local.load<CurrencyConfig[]>("currencies");
    if (savedCurrencies && savedCurrencies.length) setCustomCurrencies(savedCurrencies);
    const savedPC = local.load<CompteComptable[]>("planComptable");
    if (savedPC && savedPC.length) setCustomPlanComptable(savedPC);

    // Supabase fallback
    sb.select("tms_rows").then(data => {
      if (data && data.length) setRows(data.map((r: any) => ({
        ...r,
        amounts: JSON.parse(r.amounts || "[]"),
        amountsReel: r.amountsReel ? JSON.parse(r.amountsReel) : Array(12).fill(""),
        scenario: r.scenario || "base",
        statut: r.statut || "prevu",
        recurrence: r.recurrence || "ponctuel",
        probabilite: r.probabilite ?? 100,
      })));
    });
    sb.select("tms_config").then(data => {
      if (data && data.length) {
        const cfg = data[0];
        if (cfg.fx) setFx(JSON.parse(cfg.fx));
        if (cfg.siMap) setSiMap(JSON.parse(cfg.siMap));
        if (cfg.minMap) setMinMap(JSON.parse(cfg.minMap));
        if (cfg.maxMap) setMaxMap(JSON.parse(cfg.maxMap));
        if (cfg.dso) setDso(JSON.parse(cfg.dso));
        if (cfg.dpo) setDpo(JSON.parse(cfg.dpo));
      }
    });
    loaded.current = true;
  }, []);

  // ── Auto-save to localStorage (debounced) ──
  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => {
      local.save("rows", rows);
      local.save("config", { fx, siMap, minMap, maxMap, dso, dpo });
      local.save("intraday", intradayPositions);
      local.save("declarations", declarations);
      local.save("fiscal", fiscalDeadlines);
      local.save("kyc", kycCounterparties);
      local.save("wallets", mmWallets);
      local.save("mmtx", mmTransactions);
      local.save("sweeps", sweepTransfers);
      local.save("entities", customEntities);
      local.save("banks", customBanks);
      local.save("currencies", customCurrencies);
      local.save("planComptable", customPlanComptable);
    }, 500);
    return () => clearTimeout(timer);
  }, [rows, fx, siMap, minMap, maxMap, dso, dpo, intradayPositions, declarations, fiscalDeadlines, kycCounterparties, mmWallets, mmTransactions, sweepTransfers, customEntities, customBanks, customCurrencies]);

  // ── Supabase save (manual) ──
  const saveAll = useCallback(async () => {
    setSbStatus("saving");
    try {
      await sb.upsert("tms_rows", rows.map(r => ({ ...r, amounts: JSON.stringify(r.amounts) })));
      await sb.upsert("tms_config", [{
        id: "main", fx: JSON.stringify(fx), siMap: JSON.stringify(siMap),
        minMap: JSON.stringify(minMap), maxMap: JSON.stringify(maxMap),
        dso: JSON.stringify(dso), dpo: JSON.stringify(dpo),
      }]);
      setSbStatus("ok");
    } catch {
      setSbStatus("error");
    }
    setTimeout(() => setSbStatus("idle"), 2500);
  }, [rows, fx, siMap, minMap, maxMap, dso, dpo]);

  // ── Row CRUD ──
  const addRow = () => setRows(r => [...r, newRow()]);
  const delRow = (id: string) => {
    setRows(r => r.filter(x => x.id !== id));
    sb.delete("tms_rows", id);
    setPendingDeleteId(null);
  };
  const confirmDelete = (id: string) => setPendingDeleteId(id);
  const cancelDelete = () => setPendingDeleteId(null);
  const upd = (id: string, f: string, v: string) => setRows(r => r.map(x => x.id === id ? { ...x, [f]: v } : x));
  const updAmt = (id: string, mi: number, v: string) =>
    setRows(r => r.map(x => x.id === id ? { ...x, amounts: x.amounts.map((a, i) => i === mi ? v : a) } : x));
  const updAmtReel = (id: string, mi: number, v: string) =>
    setRows(r => r.map(x => x.id === id ? { ...x, amountsReel: (x.amountsReel || Array(12).fill("")).map((a, i) => i === mi ? v : a) } : x));

  const scMult = SCENARIOS.find(s => s.key === scenario)?.mult || 1;

  // ── Rows for current exercice ──
  const exerciceRows = useMemo(() =>
    rows.filter(r => (r.exercice ?? new Date().getFullYear()) === exercice),
    [rows, exercice]
  );

  // ── Stats (computed on current exercice rows) ──
  const stats = useMemo(() =>
    computeStats({ rows: exerciceRows, fx, siMap, minMap, maxMap, dso, dpo, scMult, reportCcy }),
    [exerciceRows, fx, siMap, minMap, maxMap, dso, dpo, scMult, reportCcy]
  );

  // ── Form ──
  const submitForm = () => {
    setRows(r => [...r, { ...formData, id: uid() }]);
    setFormData(newRow());
    setShowForm(false);
  };
  const updateForm = (f: string, v: string) => {
    setFormData(d => ({ ...d, [f]: v }));
    if (f === "type") {
      const found = ALL_TYPES.find(t => t.label === v);
      if (found) setFormData(d => ({ ...d, cat: found.cat, section: found.sec }));
    }
  };
  const updateFormAmt = (mi: number, v: string) => {
    setFormData(d => ({ ...d, amounts: d.amounts.map((a, i) => i === mi ? v : a) }));
  };
  const updateFormAmtReel = (mi: number, v: string) => {
    setFormData(d => ({ ...d, amountsReel: (d.amountsReel || Array(12).fill("")).map((a, i) => i === mi ? v : a) }));
  };
  const fillAllMonths = (val: string) => {
    if (val) setFormData(d => ({ ...d, amounts: Array(12).fill(val) }));
  };
  const fillAllMonthsReel = (val: string) => {
    if (val) setFormData(d => ({ ...d, amountsReel: Array(12).fill(val) }));
  };

  // ── CSV Import (CDC C4 — Validation renforcée) ──
  const [csvPreview, setCsvPreview] = useState<FlowRow[] | null>(null);

  const parseCSVImport = (text: string, confirmImport = false) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { setImportMsg("Fichier vide ou invalide."); return; }
    const header = lines[0].split(";").map(h => h.trim().toLowerCase());
    const entityIdx = header.findIndex(h => h.includes("entit"));
    const bankIdx = header.findIndex(h => h.includes("banque"));
    const typeIdx = header.findIndex(h => h.includes("type"));
    const catIdx = header.findIndex(h => h.includes("cat"));
    const ccyIdx = header.findIndex(h => h.includes("devise") || h.includes("ccy"));
    const labelIdx = header.findIndex(h => h.includes("libell") || h.includes("label"));
    const noteIdx = header.findIndex(h => h.includes("note"));
    const compteIdx = header.findIndex(h => h.includes("compte"));
    const probaIdx = header.findIndex(h => h.includes("probab"));
    const statutIdx = header.findIndex(h => h.includes("statut"));
    const monthIdxs = MONTHS.map(m => header.findIndex(h => h === m.toLowerCase()));
    const imported: FlowRow[] = [];
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";").map(c => c.trim());
      if (cols.length < 3) { skipped++; errors.push(`Ligne ${i + 1}: colonnes insuffisantes`); continue; }

      const typeVal = typeIdx >= 0 ? cols[typeIdx] : "";
      const found = ALL_TYPES.find(t => t.label === typeVal);
      const entity = entityIdx >= 0 ? cols[entityIdx] : ENTITIES[0].id;
      const validEntity = ENTITIES.find(e => e.id === entity || e.name === entity);
      const bank = bankIdx >= 0 ? cols[bankIdx] : BANKS[0];
      const validBank = BANKS.includes(bank) ? bank : BANKS[0];
      const amounts = monthIdxs.map(mi => mi >= 0 && mi < cols.length ? cols[mi] : "");

      // C4: Validate amounts are numeric
      const invalidAmounts = amounts.filter(a => a !== "" && isNaN(parseFloat(a.replace(/\s/g, "").replace(",", "."))));
      if (invalidAmounts.length > 0) {
        skipped++;
        errors.push(`Ligne ${i + 1}: montants non numériques`);
        continue;
      }

      // C4: Validate entity exists
      if (entityIdx >= 0 && !validEntity) {
        errors.push(`Ligne ${i + 1}: entité "${entity}" inconnue → défaut ${ENTITIES[0].id}`);
      }

      // C4: Validate category
      const catVal = catIdx >= 0 ? cols[catIdx] : (found?.cat || "enc");
      if (!["enc", "dec", "bfr", "pool"].includes(catVal)) {
        skipped++;
        errors.push(`Ligne ${i + 1}: catégorie "${catVal}" invalide`);
        continue;
      }

      // Parse probability
      const probaVal = probaIdx >= 0 ? parseFloat(cols[probaIdx]) : 100;
      const statut = statutIdx >= 0 ? cols[statutIdx] : "prevu";

      imported.push({
        id: uid(),
        entity: validEntity ? validEntity.id : ENTITIES[0].id,
        bank: validBank,
        section: found?.sec || "ope",
        type: found?.label || FLOW_TYPES.ope[0].label,
        cat: catVal,
        ccy: ccyIdx >= 0 ? cols[ccyIdx] : "XOF",
        label: labelIdx >= 0 ? cols[labelIdx] : "",
        amounts,
        amountsReel: Array(12).fill(""),
        note: noteIdx >= 0 ? cols[noteIdx] : "",
        compteComptable: compteIdx >= 0 ? cols[compteIdx] : "",
        scenario: "base",
        statut: ["prevu", "engage", "realise", "valide"].includes(statut) ? statut : "prevu",
        recurrence: "ponctuel",
        probabilite: isNaN(probaVal) ? 100 : Math.min(100, Math.max(0, probaVal)),
        exercice,
      });
    }

    // C4: Preview mode — show first 20 rows before confirmation
    if (!confirmImport && imported.length > 0) {
      setCsvPreview(imported);
      setImportMsg(`Aperçu : ${imported.length} ligne(s) prêtes.${skipped > 0 ? ` ${skipped} rejetée(s).` : ""}${errors.length > 0 ? ` Erreurs: ${errors.slice(0, 3).join("; ")}` : ""}`);
      return;
    }

    if (imported.length > 0) {
      // C4: Check for duplicates against existing rows
      const existingLabels = new Set(rows.map(r => `${r.entity}_${r.type}_${r.label}`));
      const dupes = imported.filter(r => existingLabels.has(`${r.entity}_${r.type}_${r.label}`));

      setRows(r => [...r, ...imported]);
      setCsvPreview(null);
      const dupeMsg = dupes.length > 0 ? ` (${dupes.length} potentiel(s) doublon(s))` : "";
      setImportMsg(`✓ ${imported.length} ligne(s) importée(s)${dupeMsg}.${skipped > 0 ? ` ${skipped} rejetée(s).` : ""}`);
    } else {
      setImportMsg("Aucune ligne valide. Vérifiez le format.");
    }
    setTimeout(() => setImportMsg(""), 8000);
  };

  const confirmCsvImport = () => {
    if (csvPreview) {
      setRows(r => [...r, ...csvPreview]);
      setImportMsg(`✓ ${csvPreview.length} ligne(s) importée(s).`);
      setCsvPreview(null);
      setTimeout(() => setImportMsg(""), 5000);
    }
  };

  const cancelCsvPreview = () => {
    setCsvPreview(null);
    setImportMsg("");
  };

  const handleFileImport = (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "txt") {
      setImportMsg("Format non supporté. Utilisez un fichier .csv");
      setTimeout(() => setImportMsg(""), 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      if (text) parseCSVImport(text);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileImport(file);
  };

  const downloadTemplate = () => {
    const header = ["Entité", "Banque", "Type", "Catégorie", "Devise", "Libellé", ...MONTHS, "Note"].join(";");
    const example = ["CI", "SGBCI", "Loyers & revenus locatifs", "enc", "XOF", "Loyer bureau A", ...Array(12).fill("5000000"), ""].join(";");
    const blob = new Blob(["\uFEFF" + header + "\n" + example + "\n"], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modele_import_TMS.csv";
    a.click();
  };

  // ── ML Engine (CDC V2 — 7 algorithmes) ──
  const runML = useCallback(() => {
    if (rows.length === 0) return;
    setMlLoading(true);

    // Use setTimeout to not block UI (CDC: Monte Carlo async)
    setTimeout(() => {
      try {
        const monthlyEnc = stats.cons.monthly.map(m => m.enc);
        const monthlyDec = stats.cons.monthly.map(m => m.dec);

        const lineData = rows.map(r => ({
          label: r.label || r.type,
          type: r.type,
          cat: r.cat,
          amounts: r.amounts.map(v => parseFloat((v || "0").toString().replace(/\s/g, "").replace(",", ".")) || 0),
        }));

        const entityData = customEntities.map(e => {
          const entRows = rows.filter(r => r.entity === e.id);
          const encAnnuel = entRows.filter(r => r.cat === "enc")
            .reduce((s, r) => s + r.amounts.reduce((a, v) => a + (parseFloat(v) || 0), 0), 0);
          const decAnnuel = entRows.filter(r => r.cat === "dec")
            .reduce((s, r) => s + r.amounts.reduce((a, v) => a + (parseFloat(v) || 0), 0), 0);
          const bfr = stats.bfrKpi[e.id];
          return {
            id: e.id,
            nom: e.name,
            encAnnuel,
            decAnnuel,
            bfrNet: bfr?.bfrNet || 0,
            dso: bfr?.dso || 45,
            soldeFinal: stats.cons.cum[11] || 0,
          };
        });

        const results = runFullMLEngine({
          monthlyEnc,
          monthlyDec,
          monthNames: MONTHS,
          lineData,
          entities: entityData,
        });

        setMlResults(results);
      } catch (e) {
        console.error("ML Engine error:", e);
      }
      setMlLoading(false);
    }, 10);
  }, [rows, stats, customEntities]);

  // ── AI Analysis (CDC V2 — 13 dimensions + 10 axes prompt) ──
  const runAI = useCallback(async () => {
    if (rows.length < 3) {
      setAiMsg("ℹ️ Saisissez au moins 3 mois de données pour activer Proph3t");
      return;
    }
    setAiLoading(true);
    setAiMsg("");

    const totalEnc = stats.cons.monthly.reduce((s, m) => s + m.enc, 0);
    const totalDec = stats.cons.monthly.reduce((s, m) => s + m.dec, 0);

    // ── Dimension 1: Contexte général ──
    const contexte = {
      scenario,
      devise_reporting: reportCcy,
      annee: new Date().getFullYear(),
      date_analyse: new Date().toISOString().slice(0, 10),
      nb_entites: customEntities.length,
      nb_banques: BANKS.length,
      nb_lignes_flux: rows.length,
    };

    // ── Dimension 2: Flux encaissements & décaissements ──
    const bySection = MONTHS.reduce((acc, _, mi) => {
      acc.ope.enc += stats.cons.monthly[mi].enc; acc.ope.dec += stats.cons.monthly[mi].dec;
      acc.inv.enc += Math.max(0, stats.cons.monthly[mi].inv); acc.inv.dec += Math.abs(Math.min(0, stats.cons.monthly[mi].inv));
      acc.fin.enc += Math.max(0, stats.cons.monthly[mi].fin); acc.fin.dec += Math.abs(Math.min(0, stats.cons.monthly[mi].fin));
      return acc;
    }, { ope: { enc: 0, dec: 0 }, inv: { enc: 0, dec: 0 }, fin: { enc: 0, dec: 0 } });

    const flux = {
      total_enc_annuel: totalEnc,
      total_dec_annuel: totalDec,
      flux_net_annuel: totalEnc - totalDec,
      solde_initial_consolide: stats.cons.cum[0] - (stats.cons.monthly[0].enc - stats.cons.monthly[0].dec),
      solde_final_consolide: stats.cons.cum[11],
      detail_mensuel: MONTHS.map((m, mi) => ({
        mois: m, enc: stats.cons.monthly[mi].enc, dec: stats.cons.monthly[mi].dec,
        net: stats.cons.monthly[mi].enc - stats.cons.monthly[mi].dec, cumul: stats.cons.cum[mi],
      })),
      by_section_ias7: {
        ope: { enc: bySection.ope.enc, dec: bySection.ope.dec, net: bySection.ope.enc - bySection.ope.dec },
        inv: { enc: bySection.inv.enc, dec: bySection.inv.dec, net: bySection.inv.enc - bySection.inv.dec },
        fin: { enc: bySection.fin.enc, dec: bySection.fin.dec, net: bySection.fin.enc - bySection.fin.dec },
      },
    };

    // ── Dimension 3: Health Score ──
    const health_score = {
      score_global: stats.healthScore.global,
      dimensions: {
        liquidite: { score: stats.healthScore.liquidite },
        bfr: { score: stats.healthScore.bfr },
        levier: { score: stats.healthScore.levier },
        couverture_dette: { score: stats.healthScore.dscr },
        exposition_change: { score: stats.healthScore.expositionChange },
        nivellement: { score: stats.healthScore.nivellement, alertes_actives: stats.niveauAlerts.length },
        conformite: { score: stats.healthScore.conformite },
        forecast_precision: { score: stats.healthScore.previsionVsRealise },
        concentration_bancaire: { score: stats.healthScore.diversificationBancaire },
        qualite_tresorerie: { score: stats.healthScore.qualiteTresorerie },
      },
    };

    // ── Dimension 4: TAFIRE SYSCOHADA ──
    const tafire = { partie_I: stats.tafire.partI, partie_II: stats.tafire.partII };

    // ── Dimension 5: BFR par entité ──
    const bfr_par_entite = Object.fromEntries(customEntities.map(e => {
      const kpi = stats.bfrKpi[e.id];
      return [e.id, kpi ? {
        dso: kpi.dso, dpo: kpi.dpo, creances: kpi.creances, dettes: kpi.dettes,
        bfr_net: kpi.bfrNet,
        signal: kpi.bfrNet > 0 ? "Besoin financement" : "Ressource",
      } : null];
    }));

    // ── Dimension 6: Résultats ML ──
    const ml_predictions = mlResults ? {
      forecast_consolide: {
        M1: { arima: mlResults.predictions.arima[0], sarima: mlResults.predictions.sarima[0], lstm: mlResults.predictions.lstm[0], ensemble: mlResults.predictions.ensemble[0] },
        M2: { arima: mlResults.predictions.arima[1], sarima: mlResults.predictions.sarima[1], lstm: mlResults.predictions.lstm[1], ensemble: mlResults.predictions.ensemble[1] },
        M3: { arima: mlResults.predictions.arima[2], sarima: mlResults.predictions.sarima[2], lstm: mlResults.predictions.lstm[2], ensemble: mlResults.predictions.ensemble[2] },
      },
      par_ligne: mlResults.lineResults.slice(0, 20).map(l => ({
        label: l.label, ensemble_M1: l.ensemble_M1,
        anomalies_zscore: l.anomalies_zscore, iso_forest_max: l.iso_forest_max,
      })),
    } : { forecast_consolide: null, par_ligne: [] };

    // ── Dimension 7: Monte Carlo ──
    const monte_carlo = mlResults ? {
      nb_simulations: mlResults.monteCarlo.nbSimulations,
      p5: mlResults.monteCarlo.p5, p25: mlResults.monteCarlo.p25, p50: mlResults.monteCarlo.p50,
      p75: mlResults.monteCarlo.p75, p95: mlResults.monteCarlo.p95,
      mean: mlResults.monteCarlo.mean, prob_solde_positif: mlResults.monteCarlo.probPositif,
    } : null;

    // ── Dimension 8: K-Means Clustering ──
    const clustering = mlResults ? {
      methode: "K-Means k=" + Math.min(3, customEntities.length) + " · 100 itérations",
      features_utilisees: ["enc_annuel_M_FCFA", "dec_annuel_M_FCFA", "bfr_net_M_FCFA"],
      clusters: mlResults.clusters,
    } : null;

    // ── Dimension 9: Scoring de risque ──
    const risk_scores = mlResults ? mlResults.riskScores : [];

    // ── Dimension 10: Anomalies ──
    const anomalies = {
      isolation_forest_consolide: mlResults ? mlResults.isolationForest.filter(f => f.severite !== "Normal") : [],
      zscore_par_ligne: stats.predRows.flatMap(r =>
        r.anomalies.map(a => ({ ligne: r.label || r.type, mois: MONTHS[a.mi], z_score: a.z, valeur: a.val }))
      ),
    };

    // ── Dimension 11: Exposition FX ──
    const fxMap: Record<string, { enc: number; dec: number }> = {};
    rows.forEach(r => {
      const ccy = r.ccy || "XOF";
      if (!fxMap[ccy]) fxMap[ccy] = { enc: 0, dec: 0 };
      const vol = r.amounts.reduce((a, v) => a + (parseFloat(v) || 0), 0);
      if (r.cat === "enc") fxMap[ccy].enc += vol;
      else if (r.cat === "dec") fxMap[ccy].dec += vol;
    });
    const exposition_fx = Object.entries(fxMap).map(([devise, v]) => ({
      devise, enc_annuel: v.enc, dec_annuel: v.dec, exposition_nette: v.enc - v.dec,
    }));

    // ── Dimension 12: Concentration bancaire ──
    const bankTotals: Record<string, number> = {};
    rows.forEach(r => {
      const vol = r.amounts.reduce((a, v) => a + Math.abs(parseFloat(v) || 0), 0);
      bankTotals[r.bank] = (bankTotals[r.bank] || 0) + vol;
    });
    const totalBankVol = Object.values(bankTotals).reduce((s, v) => s + v, 0) || 1;
    const concentration_bancaire = Object.entries(bankTotals)
      .map(([banque, vol]) => ({
        banque, solde_final: vol,
        part_pct: Math.round((vol / totalBankVol) * 1000) / 10,
        alerte_concentration: (vol / totalBankVol) > 0.35,
      }))
      .sort((a, b) => b.solde_final - a.solde_final);

    // ── Dimension 13: Entités ──
    const entites = customEntities.map(e => {
      const rs = mlResults?.riskScores.find(r => r.entite === e.id);
      const cl = mlResults?.clusters.find(c => c.id === e.id);
      const kpi = stats.bfrKpi[e.id];
      const entRows = rows.filter(r => r.entity === e.id);
      const encAnn = entRows.filter(r => r.cat === "enc").reduce((s, r) => s + r.amounts.reduce((a, v) => a + (parseFloat(v) || 0), 0), 0);
      const decAnn = entRows.filter(r => r.cat === "dec").reduce((s, r) => s + r.amounts.reduce((a, v) => a + (parseFloat(v) || 0), 0), 0);
      return {
        id: e.id, nom: e.name, pays: e.country, devise: e.ccy,
        enc_annuel: encAnn, dec_annuel: decAnn,
        bfr_net: kpi?.bfrNet || 0,
        risk_score: rs?.probabiliteRisque || 0,
        cluster: cl?.cluster || "",
      };
    });

    const payload = {
      contexte, flux, health_score, tafire, bfr_par_entite,
      ml_predictions, monte_carlo, clustering, risk_scores,
      anomalies, exposition_fx, concentration_bancaire, entites,
    };

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          system: `Tu es Proph3t — moteur d'intelligence prédictive de TMS Pro Africa,
expert de niveau CFO en trésorerie d'entreprise africaine.

Tu maîtrises parfaitement :
• SYSCOHADA révisé 2017 et le TAFIRE (Tableau de Financement des Ressources et Emplois) — état de flux spécifique OHADA
• Droit des affaires OHADA — Actes Uniformes, CCJA
• Réglementation des changes BCEAO (zone UEMOA) et BEAC (zone CEMAC)
• Instruments financiers africains : Mobile Money (Wave, MTN MoMo, Orange Money, CinetPay), marchés obligataires UMOA/COSUMAF
• Devises africaines : XOF, XAF, NGN (marché parallèle), GHS, MAD, KES, TZS, ZAR et leurs spécificités de convertibilité
• Fiscalité multi-pays UEMOA/CEMAC : IS, TVA, patente, CNPS, retenues à la source sur dividendes (avec conventions fiscales)
• Algorithmes ML que tu utilises : ARIMA(1,1,1), SARIMA (période 12), LSTM simplifié, Ensemble (25/35/40%), Isolation Forest (50 arbres), K-Means (k=3), Monte Carlo (10 000 simulations gaussiennes), Régression Logistique (5 features, poids calibrés)
• Benchmarks sectoriels africains : DSO moyen immobilier commercial CI = 45j, SN = 40j, CM = 50j ; DPO moyen = 60j

Analyse les données complètes fournies et produis un rapport structuré OBLIGATOIREMENT en ces 10 sections, dans cet ordre :

1. 🏥 DIAGNOSTIC 360°
   - 3 forces chiffrées (avec montants réels)
   - 3 risques critiques classés par priorité
   - 1 verdict global avec score synthétique /100

2. 📊 ANALYSE TAFIRE SYSCOHADA
   - Commentaire Partie I : CAFG, variation du Fonds de Roulement
   - Commentaire Partie II : variation BFR, trésorerie nette
   - Recommandations de présentation pour les commissaires aux comptes

3. ⚡ BFR & LIQUIDITÉ
   - Analyse DSO/DPO par entité vs benchmarks sectoriels africains
   - Identification des entités à risque de tension (DSO > benchmark)
   - Recommandations concrètes : relance, escompte, affacturage

4. 🔮 PRÉVISION M+1 / M+2 / M+3
   - Interprétation des résultats Ensemble (ARIMA+SARIMA+LSTM)
   - Facteurs explicatifs de la tendance détectée
   - Intervalle de confiance qualitatif (fiabilité de la prévision)

5. 🎲 SIMULATION MONTE CARLO
   - Interprétation des percentiles P5/P25/P50/P75/P95
   - Probabilité de solde positif en fin d'exercice
   - Recommandations selon le profil de risque (probabilité < 70% → alerte)

6. 🧬 CLUSTERING & SEGMENTATION
   - Profil de chaque cluster K-Means identifié
   - Recommandations différenciées par groupe d'entités
   - Opportunités de synergies ou de cash pooling intra-cluster

7. ⚠️ SCORING DE RISQUE ENTITÉS
   - Classement des entités du plus risqué au moins risqué
   - Pour chaque entité à risque élevé/critique : cause principale + action corrective datée
   - Plan de surveillance renforcée pour les 30 prochains jours

8. 🔍 ANOMALIES DÉTECTÉES
   - Interprétation Isolation Forest : causes probables des mois anormaux
   - Interprétation Z-score : lignes de flux à vérifier en priorité
   - Distinction anomalie saisonnière / erreur de saisie / choc réel

9. 💱 EXPOSITION AU RISQUE DE CHANGE
   - Analyse de l'exposition nette par devise
   - Focus sur devises non convertibles (NGN, GHS) si présentes
   - Recommandations de couverture adaptées à la zone UEMOA/CEMAC
   - Estimation de l'impact d'une dévaluation de 10% sur le solde consolidé

10. 🚀 PLAN D'ACTION 30 JOURS
    - 5 actions prioritaires exactement, numérotées
    - Chaque action doit être : chiffrée, datée, responsable nommé (DAF/Trésorier/DG)
    - Classées par impact décroissant sur la position de trésorerie

Contraintes de format :
• Sois précis et chiffré — utilise les montants réels des données
• Réponds EXCLUSIVEMENT en français
• Format : titre emoji + paragraphe(s) concis par section
• Longueur cible : 800 à 1200 mots au total
• Ne pas inventer de données non présentes dans le contexte
• Si une dimension manque de données : le signaler brièvement et passer à la suivante`,
          messages: [{ role: "user", content: `Données TMS Pro Africa :\n${JSON.stringify(payload, null, 2)}` }],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (res.status >= 500) setAiMsg("❌ Serveur Claude indisponible — réessayez dans quelques instants");
        else setAiMsg(`❌ Erreur Proph3t : ${res.status} — ${errData?.error?.message || res.statusText}`);
        setAiLoading(false);
        return;
      }
      const data = await res.json();
      const text = data.content?.[0]?.text;
      if (!text) {
        setAiMsg("⚠️ Proph3t n'a pas pu générer d'analyse sur ces données");
      } else {
        setAiMsg(text);
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        setAiMsg("⏱ Proph3t n'a pas répondu dans le délai imparti (60s)");
      } else {
        setAiMsg("❌ Erreur réseau — vérifiez votre connexion");
      }
    }
    setAiLoading(false);
  }, [stats, scenario, reportCcy, rows, customEntities, mlResults, mmWallets, mmTransactions, kycCounterparties, fiscalDeadlines, declarations]);

  // ── Export CSV ──
  const exportCSV = () => {
    const lines = [["Entité", "Banque", "Section", "Type", "Catégorie", "Devise", ...MONTHS, "Total", "Note"].join(";")];
    rows.forEach(r => {
      const tot = r.amounts.reduce((s, v) => s + p(v), 0);
      lines.push([r.entity, r.bank, r.section, r.type, r.cat, r.ccy || "XOF", ...r.amounts.map(p), tot, r.note].join(";"));
    });
    lines.push("", "CONSOLIDÉ");
    lines.push(["Mois", "Encaissements", "Décaissements", "Flux OPE", "Flux INV", "Flux FIN", "BFR", "Solde cum."].join(";"));
    MONTHS.forEach((_, mi) => {
      const m = stats.cons.monthly[mi];
      lines.push([MONTHS[mi], m.enc, m.dec, m.ope, m.inv, m.fin, m.bfr, stats.cons.cum[mi]].join(";"));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "TMS_Export_2026.csv";
    a.click();
  };

  // ── Intraday CRUD ──
  const addIntradayPosition = (pos: Omit<IntradayPosition, 'id'>) => {
    setIntradayPositions(prev => [...prev, { ...pos, id: uid() }]);
  };
  const updateIntradayPosition = (id: string, field: string, value: any) => {
    setIntradayPositions(prev => prev.map(p => p.id === id ? { ...p, [field]: value, updatedAt: new Date().toISOString() } : p));
  };
  const deleteIntradayPosition = (id: string) => {
    setIntradayPositions(prev => prev.filter(p => p.id !== id));
  };

  // ── Conformité CRUD ──
  const addDeclaration = (d: Omit<RegulatoryDeclaration, 'id'>) => {
    setDeclarations(prev => [...prev, { ...d, id: uid() }]);
  };
  const updateDeclaration = (id: string, field: string, value: any) => {
    setDeclarations(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };
  const addFiscalDeadline = (d: Omit<FiscalDeadline, 'id'>) => {
    setFiscalDeadlines(prev => [...prev, { ...d, id: uid() }]);
  };
  const updateFiscalDeadline = (id: string, field: string, value: any) => {
    setFiscalDeadlines(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };
  const addKycCounterparty = (k: Omit<KycCounterparty, 'id'>) => {
    setKycCounterparties(prev => [...prev, { ...k, id: uid() }]);
  };
  const updateKycCounterparty = (id: string, field: string, value: any) => {
    setKycCounterparties(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k));
  };

  // ── Mobile Money CRUD ──
  const addMmWallet = (w: Omit<MobileMoneyWallet, 'id'>) => {
    setMmWallets(prev => [...prev, { ...w, id: uid() }]);
  };
  const updateMmWallet = (id: string, field: string, value: any) => {
    setMmWallets(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
  };
  const deleteMmWallet = (id: string) => {
    setMmWallets(prev => prev.filter(w => w.id !== id));
  };
  const addMmTransaction = (t: Omit<MobileMoneyTransaction, 'id'>) => {
    setMmTransactions(prev => [...prev, { ...t, id: uid() }]);
  };

  // ── Sweep Transfers CRUD ──
  const addSweepTransfer = (t: Omit<SweepTransfer, 'id'>) => {
    setSweepTransfers(prev => [...prev, { ...t, id: uid() }]);
  };
  const updateSweepTransfer = (id: string, field: string, value: any) => {
    setSweepTransfers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const deleteSweepTransfer = (id: string) => {
    setSweepTransfers(prev => prev.filter(t => t.id !== id));
  };

  // ── Référentiel CRUD ──
  const addEntity = (e: Entity) => setCustomEntities(prev => [...prev, e]);
  const updateEntity = (id: string, data: Partial<Entity>) => setCustomEntities(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  const deleteEntity = (id: string) => setCustomEntities(prev => prev.filter(e => e.id !== id));

  const addBank = (b: BankAccount) => setCustomBanks(prev => [...prev, b]);
  const updateBank = (id: string, data: Partial<BankAccount>) => setCustomBanks(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  const deleteBank = (id: string) => setCustomBanks(prev => prev.filter(b => b.id !== id));

  const addCurrency = (c: CurrencyConfig) => setCustomCurrencies(prev => [...prev, c]);
  const updateCurrency = (code: string, data: Partial<CurrencyConfig>) => setCustomCurrencies(prev => prev.map(c => c.code === code ? { ...c, ...data } : c));
  const deleteCurrency = (code: string) => setCustomCurrencies(prev => prev.filter(c => c.code !== code));

  // ── Plan Comptable CRUD ──
  const addCompte = (c: CompteComptable) => setCustomPlanComptable(prev => [...prev, c]);
  const deleteCompte = (numero: string) => setCustomPlanComptable(prev => prev.filter(c => c.numero !== numero));
  const importPlanComptable = (comptes: CompteComptable[]) => setCustomPlanComptable(comptes);
  const resetPlanComptable = () => setCustomPlanComptable([...PLAN_COMPTABLE]);

  // ── Filtered rows ──
  const filtered = exerciceRows.filter(r =>
    (filterEntity === "ALL" || r.entity === filterEntity) &&
    (filterSec === "ALL" || r.section === filterSec)
  );

  return {
    tab, setTab, rows, setRows, exerciceRows, fx, setFx, scenario, setScenario,
    exercice, setExercice,
    horizon, setHorizon, siMap, setSiMap, minMap, setMinMap, maxMap, setMaxMap,
    dso, setDso, dpo, setDpo, filterEntity, setFilterEntity, filterSec, setFilterSec,
    sbStatus, reportCcy, setReportCcy, aiMsg, aiLoading,
    showForm, setShowForm, formData, setFormData, importMsg, dragOver, setDragOver,
    pendingDeleteId, confirmDelete, cancelDelete, fileInputRef,
    stats, scMult, filtered,
    addRow, delRow, upd, updAmt, updAmtReel,
    submitForm, updateForm, updateFormAmt, updateFormAmtReel, fillAllMonths, fillAllMonthsReel,
    handleFileImport, handleDrop, downloadTemplate,
    csvPreview, confirmCsvImport, cancelCsvPreview,
    saveAll, runAI, runML, exportCSV,
    mlResults, mlLoading,
    // Module 4: Intraday
    intradayPositions, addIntradayPosition, updateIntradayPosition, deleteIntradayPosition,
    // Module 9: Conformité
    declarations, addDeclaration, updateDeclaration,
    fiscalDeadlines, addFiscalDeadline, updateFiscalDeadline,
    kycCounterparties, addKycCounterparty, updateKycCounterparty,
    // Module 10: Mobile Money
    mmWallets, addMmWallet, updateMmWallet, deleteMmWallet,
    mmTransactions, addMmTransaction,
    // Nivellement: Transferts
    sweepTransfers, addSweepTransfer, updateSweepTransfer, deleteSweepTransfer,
    // Référentiel dynamique
    customEntities, addEntity, updateEntity, deleteEntity,
    customBanks, addBank, updateBank, deleteBank,
    customCurrencies, addCurrency, updateCurrency, deleteCurrency,
    // Plan Comptable
    customPlanComptable, addCompte, deleteCompte, importPlanComptable, resetPlanComptable,
  };
}
