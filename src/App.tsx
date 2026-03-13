import { useState } from "react";
import { useAppState } from "./hooks/useAppState";
import { SCENARIOS, CURRENCIES, scenarioBgActive } from "./constants";
import { exportConsolideXLSX, exportTafireXLSX, exportTafirePDF, exportConsolidePDF } from "./lib/exports";
import Dashboard from "./components/Dashboard";
import SaisieImport from "./components/SaisieImport";
import JournalTab from "./components/JournalTab";
import FlowsGrid from "./components/FlowsGrid";
import TafireTab from "./components/TafireTab";
import IntradayTab from "./components/IntradayTab";
import BfrTab from "./components/BfrTab";
import NivellementTab from "./components/NivellementTab";
import RollingTab from "./components/RollingTab";
import Prophet3tDrawer from "./components/PredictTab";
import FxTab from "./components/FxTab";
import ConformiteTab from "./components/ConformiteTab";
import MobileMoneyTab from "./components/MobileMoneyTab";
import ConfigTab from "./components/ConfigTab";
import PlanVsReelTab from "./components/PlanVsReelTab";
import ScenariosTab from "./components/ScenariosTab";
import AlertesTab from "./components/AlertesTab";
import DetteTab from "./components/DetteTab";
import RapprochementTab from "./components/RapprochementTab";
import GrandLivreTab from "./components/GrandLivreTab";
import HomePage from "./components/HomePage";
import ConfirmDialog from "./components/ui/ConfirmDialog";

// Monochrome SVG icon paths (heroicons outline)
const IC: Record<string, string> = {
  dashboard:     "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  journal:       "M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
  saisie:        "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3",
  grandlivre:    "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-.75c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  planvsreel:    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  scenarios:     "M8 7h12M8 12h12M8 17h12M3.5 7h.01M3.5 12h.01M3.5 17h.01",
  alertes:       "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  flows:         "M9 5l7 7-7 7",
  tafire:        "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  rolling:       "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  rapprochement: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  intraday:      "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  bfr:           "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  nivellement:   "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  dette:         "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
  fx:            "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  mobilemoney:   "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3",
  conformite:    "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  predict:       "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
  config:        "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  home:          "M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
};

function NavIcon({ name }: { name: string }) {
  const d = IC[name];
  if (!d) return <span className="w-4 h-4" />;
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const SECTIONS = [
  { title: "GÉNÉRAL", items: [
    { key: "dashboard",   label: "Dashboard" },
    { key: "journal",     label: "Journal" },
    { key: "saisie",      label: "Import CSV" },
    { key: "grandlivre",  label: "Grand Livre" },
  ]},
  { title: "PILOTAGE", items: [
    { key: "planvsreel",  label: "Plan vs Réalité" },
    { key: "scenarios",   label: "Scénarios" },
    { key: "alertes",     label: "Alertes" },
  ]},
  { title: "ÉTATS FINANCIERS", items: [
    { key: "flows",       label: "Flux de Trésorerie" },
    { key: "tafire",      label: "TAFIRE" },
    { key: "rolling",     label: "Rolling Forecast" },
    { key: "rapprochement", label: "Rapprochement" },
  ]},
  { title: "TRÉSORERIE", items: [
    { key: "intraday",    label: "Position J+0" },
    { key: "bfr",         label: "BFR & Liquidité" },
    { key: "nivellement", label: "Nivellement" },
    { key: "dette",       label: "Gestion Dette" },
    { key: "fx",          label: "Devises & Change" },
  ]},
  { title: "AFRIQUE", items: [
    { key: "mobilemoney", label: "Mobile Money" },
    { key: "conformite",  label: "Conformité BCEAO" },
  ]},
  { title: "SYSTÈME", items: [
    { key: "config",      label: "Configuration" },
  ]},
];

export default function App() {
  const state = useAppState();
  const ccySym = state.reportCcy;
  const [collapsed, setCollapsed] = useState(false);
  const [prophet3tOpen, setProphet3tOpen] = useState(false);

  // ═══ HOME PAGE (full-screen, no sidebar) ═══
  if (state.tab === "home") {
    return (
      <div className="min-h-screen bg-primary-50 text-primary-900 font-sans">
        {/* Top bar minimale */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-primary-200 bg-white">
          <div className="text-[10px] font-bold tracking-widest text-primary-400 uppercase">
            Exercice {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-4">
            {state.stats.niveauAlerts.length > 0 && (
              <span className="relative">
                <NavIcon name="alertes" />
                <span className="absolute -top-1 -right-2 bg-error text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {state.stats.niveauAlerts.length}
                </span>
              </span>
            )}
            <span className="text-xs font-medium text-primary-600">admin</span>
            <button
              onClick={() => state.setTab("dashboard")}
              className="px-3 py-1.5 rounded-lg bg-primary-950 text-white text-[11px] font-bold hover:bg-primary-800 transition flex items-center gap-1"
            >
              Accéder <span>→</span>
            </button>
          </div>
        </header>
        <HomePage
          stats={state.stats}
          rows={state.rows}
          ccySym={ccySym}
          entitiesCount={state.customEntities.length}
          banksCount={state.customBanks.length}
          onNavigate={state.setTab}
        />
        {/* DELETE CONFIRM */}
        {state.pendingDeleteId !== null && (
          <ConfirmDialog
            message="Cette ligne de flux sera définitivement supprimée. Cette action est irréversible."
            onConfirm={() => state.delRow(state.pendingDeleteId!)}
            onCancel={state.cancelDelete}
          />
        )}

        {/* Proph3t floating button */}
        <button onClick={() => setProphet3tOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary-900 text-white shadow-lg hover:bg-primary-800 transition-all hover:scale-105 flex items-center justify-center z-40"
          title="Proph3t — IA Prédictive">
          <NavIcon name="predict" />
        </button>

        {/* Proph3t drawer */}
        <Prophet3tDrawer
          open={prophet3tOpen}
          onClose={() => setProphet3tOpen(false)}
          stats={state.stats}
          aiMsg={state.aiMsg}
          aiLoading={state.aiLoading}
          runAI={state.runAI}
          mlResults={state.mlResults}
          mlLoading={state.mlLoading}
          runML={state.runML}
          rowCount={state.rows.length}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 text-primary-900 font-sans text-xs flex">

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`${collapsed ? "w-14" : "w-56"} flex-shrink-0 bg-primary-950 text-white flex flex-col transition-all duration-200 h-screen sticky top-0`}>

        {/* Logo — click to go home */}
        <button onClick={() => state.setTab("home")} className="w-full px-3 py-4 border-b border-primary-800 text-left hover:bg-white/5 transition">
          {collapsed ? (
            <div className="text-center text-lg font-black">T</div>
          ) : (
            <>
              <div className="text-sm font-bold text-white">TMS Pro Africa</div>
              <div className="text-[10px] text-primary-500 mt-0.5">Atlas Studio · {new Date().getFullYear()}</div>
            </>
          )}
        </button>

        {/* Health Score */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-primary-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-primary-400 uppercase tracking-wider">Santé</span>
              <span className={`text-xs font-black ${state.stats.healthScore.global >= 70 ? "text-emerald-400" : state.stats.healthScore.global >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                {state.stats.healthScore.global}/100
              </span>
            </div>
            <div className="w-full h-1.5 bg-primary-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${state.stats.healthScore.global >= 70 ? "bg-emerald-500" : state.stats.healthScore.global >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${state.stats.healthScore.global}%` }}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-1">
          {SECTIONS.map(section => (
            <div key={section.title}>
              {!collapsed && (
                <div className="px-3 pt-3 pb-1 text-[9px] font-bold tracking-widest text-primary-600 uppercase">
                  {section.title}
                </div>
              )}
              {section.items.map(item => (
                <button
                  key={item.key}
                  onClick={() => state.setTab(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all ${
                    state.tab === item.key
                      ? "bg-white/10 text-white border-l-2 border-white"
                      : "text-primary-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <NavIcon name={item.key} />
                  {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Home button */}
        <button
          onClick={() => state.setTab("home")}
          className="px-3 py-2.5 border-t border-primary-800 text-primary-400 hover:text-white hover:bg-white/5 transition text-xs flex items-center gap-2 justify-center"
          title="Retour à l'accueil"
        >
          <NavIcon name="home" />
          {!collapsed && <span className="font-medium">Accueil</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="px-3 py-2.5 border-t border-primary-800 text-primary-500 hover:text-white transition text-xs flex items-center gap-2 justify-center"
        >
          {collapsed ? "»" : "« Réduire"}
        </button>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* TOPBAR */}
        <header className="bg-white border-b border-primary-200 px-4 py-2 flex items-center justify-between flex-wrap gap-2 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold text-primary-900 flex items-center gap-2">
              <NavIcon name={state.tab} />
              {SECTIONS.flatMap(s => s.items).find(t => t.key === state.tab)?.label}
            </div>
            {state.stats.niveauAlerts.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {state.stats.niveauAlerts.length} alerte{state.stats.niveauAlerts.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-0.5 bg-primary-100 rounded-lg p-0.5">
              {SCENARIOS.map(s => (
                <button key={s.key} onClick={() => state.setScenario(s.key)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${state.scenario === s.key ? scenarioBgActive[s.color] : "text-primary-500 hover:text-primary-900"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <select value={state.exercice} onChange={e => state.setExercice(Number(e.target.value))}
              className="bg-white border border-primary-300 rounded-lg px-2 py-1 text-xs text-primary-900 font-semibold">
              {[state.exercice - 1, state.exercice, state.exercice + 1].map(y => (
                <option key={y} value={y}>{y === new Date().getFullYear() ? `${y} (N)` : y === new Date().getFullYear() - 1 ? `${y} (N-1)` : `${y} (N+1)`}</option>
              ))}
            </select>
            <select value={state.reportCcy} onChange={e => state.setReportCcy(e.target.value)}
              className="bg-white border border-primary-300 rounded-lg px-2 py-1 text-xs text-primary-900">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={state.saveAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${state.sbStatus === "saving" ? "bg-amber-100 text-amber-700" : state.sbStatus === "ok" ? "bg-emerald-100 text-emerald-700" : state.sbStatus === "error" ? "bg-red-100 text-red-700" : "bg-primary-100 text-primary-600 hover:bg-primary-200"}`}>
              {state.sbStatus === "saving" ? "Saving…" : state.sbStatus === "ok" ? "Saved" : state.sbStatus === "error" ? "Error" : "Sauvegarder"}
            </button>
            <button onClick={state.exportCSV} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-900 hover:bg-primary-800 text-white transition">
              CSV
            </button>
            <button onClick={() => exportConsolideXLSX(state.exerciceRows, state.stats, state.reportCcy, state.exercice)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition">
              Excel
            </button>
            <button onClick={() => exportConsolidePDF(state.stats, state.reportCcy, state.exercice)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white transition">
              PDF
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1">
          {state.tab === "dashboard" && <Dashboard stats={state.stats} scenario={state.scenario} ccySym={ccySym} />}

          {state.tab === "saisie" && (
            <SaisieImport
              rows={state.rows} confirmDelete={state.confirmDelete}
              importMsg={state.importMsg} dragOver={state.dragOver} setDragOver={state.setDragOver}
              handleDrop={state.handleDrop} handleFileImport={state.handleFileImport}
              downloadTemplate={state.downloadTemplate} fileInputRef={state.fileInputRef}
              csvPreview={state.csvPreview} confirmCsvImport={state.confirmCsvImport} cancelCsvPreview={state.cancelCsvPreview}
            />
          )}

          {state.tab === "journal" && (
            <JournalTab
              rows={state.rows}
              confirmDelete={state.confirmDelete}
              upd={state.upd}
              updAmtReel={state.updAmtReel}
              formData={state.formData}
              updateForm={state.updateForm}
              updateFormAmt={state.updateFormAmt}
              updateFormAmtReel={state.updateFormAmtReel}
              fillAllMonths={state.fillAllMonths}
              fillAllMonthsReel={state.fillAllMonthsReel}
              submitForm={state.submitForm}
              setFormData={state.setFormData}
              planComptable={state.customPlanComptable}
            />
          )}

          {state.tab === "planvsreel" && (
            <PlanVsReelTab
              rows={state.rows}
              stats={state.stats}
              ccySym={ccySym}
              upd={state.upd}
              updAmtReel={state.updAmtReel}
            />
          )}

          {state.tab === "scenarios" && (
            <ScenariosTab
              rows={state.rows}
              setRows={state.setRows}
              scenario={state.scenario}
              setScenario={state.setScenario}
              ccySym={ccySym}
              fx={state.fx}
              reportCcy={state.reportCcy}
            />
          )}

          {state.tab === "alertes" && (
            <AlertesTab
              rows={state.rows}
              stats={state.stats}
              ccySym={ccySym}
            />
          )}

          {state.tab === "flows" && (
            <FlowsGrid
              filtered={state.filtered} filterEntity={state.filterEntity} setFilterEntity={state.setFilterEntity}
              filterSec={state.filterSec} setFilterSec={state.setFilterSec} addRow={state.addRow}
              confirmDelete={state.confirmDelete} upd={state.upd} updAmt={state.updAmt}
              scMult={state.scMult} fx={state.fx} reportCcy={state.reportCcy} rows={state.rows}
            />
          )}

          {state.tab === "tafire" && <TafireTab stats={state.stats} />}

          {state.tab === "intraday" && (
            <IntradayTab
              intradayPositions={state.intradayPositions}
              addPosition={state.addIntradayPosition}
              updatePosition={state.updateIntradayPosition}
              deletePosition={state.deleteIntradayPosition}
              stats={state.stats}
              ccySym={ccySym}
            />
          )}

          {state.tab === "bfr" && (
            <BfrTab stats={state.stats} dso={state.dso} dpo={state.dpo} setDso={state.setDso} setDpo={state.setDpo} />
          )}

          {state.tab === "nivellement" && (
            <NivellementTab stats={state.stats} siMap={state.siMap} setSiMap={state.setSiMap}
              minMap={state.minMap} setMinMap={state.setMinMap} maxMap={state.maxMap} setMaxMap={state.setMaxMap}
              ccySym={ccySym}
              sweepTransfers={state.sweepTransfers}
              addSweepTransfer={state.addSweepTransfer}
              updateSweepTransfer={state.updateSweepTransfer}
              deleteSweepTransfer={state.deleteSweepTransfer}
              planComptable={state.customPlanComptable}
            />
          )}

          {state.tab === "rolling" && (
            <RollingTab stats={state.stats} scenario={state.scenario} horizon={state.horizon} setHorizon={state.setHorizon} />
          )}

          {state.tab === "fx" && <FxTab fx={state.fx} setFx={state.setFx} rows={state.rows} />}

          {state.tab === "conformite" && (
            <ConformiteTab
              declarations={state.declarations}
              fiscalDeadlines={state.fiscalDeadlines}
              kycCounterparties={state.kycCounterparties}
              addDeclaration={state.addDeclaration}
              updateDeclaration={state.updateDeclaration}
              addDeadline={state.addFiscalDeadline}
              updateDeadline={state.updateFiscalDeadline}
              addKyc={state.addKycCounterparty}
              updateKyc={state.updateKycCounterparty}
            />
          )}

          {state.tab === "mobilemoney" && (
            <MobileMoneyTab
              wallets={state.mmWallets}
              transactions={state.mmTransactions}
              addWallet={state.addMmWallet}
              updateWallet={state.updateMmWallet}
              deleteWallet={state.deleteMmWallet}
              addTransaction={state.addMmTransaction}
              ccySym={ccySym}
            />
          )}

          {state.tab === "dette" && (
            <DetteTab ccySym={ccySym} />
          )}

          {state.tab === "rapprochement" && (
            <RapprochementTab rows={state.rows} ccySym={ccySym} />
          )}

          {state.tab === "grandlivre" && (
            <GrandLivreTab rows={state.rows} setRows={state.setRows} ccySym={ccySym} stats={state.stats} planComptable={state.customPlanComptable} />
          )}

          {state.tab === "config" && (
            <ConfigTab
              stats={state.stats} rows={state.rows} scenario={state.scenario} reportCcy={state.reportCcy}
              entities={state.customEntities} addEntity={state.addEntity} updateEntity={state.updateEntity} deleteEntity={state.deleteEntity}
              banks={state.customBanks} addBank={state.addBank} updateBank={state.updateBank} deleteBank={state.deleteBank}
              currencies={state.customCurrencies} addCurrency={state.addCurrency} updateCurrency={state.updateCurrency} deleteCurrency={state.deleteCurrency}
              planComptable={state.customPlanComptable} addCompte={state.addCompte} deleteCompte={state.deleteCompte} importPlanComptable={state.importPlanComptable} resetPlanComptable={state.resetPlanComptable}
            />
          )}
        </main>

        {/* FOOTER */}
        <footer className="text-center text-xs text-primary-400 py-2.5 border-t border-primary-200 bg-white">
          Atlas Studio · TMS Pro Africa v2.0 · TAFIRE · SYSCOHADA · OHADA
        </footer>
      </div>

      {/* DELETE CONFIRM */}
      {state.pendingDeleteId !== null && (
        <ConfirmDialog
          message="Cette ligne de flux sera définitivement supprimée. Cette action est irréversible."
          onConfirm={() => state.delRow(state.pendingDeleteId!)}
          onCancel={state.cancelDelete}
        />
      )}

      {/* Proph3t floating button */}
      <button onClick={() => setProphet3tOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary-900 text-white shadow-lg hover:bg-primary-800 transition-all hover:scale-105 flex items-center justify-center z-40"
        title="Proph3t — IA Prédictive">
        <NavIcon name="predict" />
      </button>

      {/* Proph3t drawer */}
      <Prophet3tDrawer
        open={prophet3tOpen}
        onClose={() => setProphet3tOpen(false)}
        stats={state.stats}
        aiMsg={state.aiMsg}
        aiLoading={state.aiLoading}
        runAI={state.runAI}
        mlResults={state.mlResults}
        mlLoading={state.mlLoading}
        runML={state.runML}
        rowCount={state.rows.length}
      />
    </div>
  );
}
