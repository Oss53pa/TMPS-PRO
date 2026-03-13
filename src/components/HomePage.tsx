import { useMemo } from "react";
import type { FlowRow } from "../types";

interface HomeStats {
  healthScore: { global: number };
  cons: {
    monthly: { enc: number; dec: number }[];
    cum: number[];
  };
  niveauAlerts: any[];
}

interface HomePageProps {
  stats: HomeStats;
  rows: FlowRow[];
  ccySym: string;
  entitiesCount: number;
  banksCount: number;
  onNavigate: (tab: string) => void;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1).replace(".", ",");
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",");
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0);
  return n.toFixed(0);
}

function suffix(n: number): string {
  if (Math.abs(n) >= 1e9) return "Mrd";
  if (Math.abs(n) >= 1e6) return "M";
  if (Math.abs(n) >= 1e3) return "K";
  return "";
}

export default function HomePage({ stats, rows, ccySym, entitiesCount, banksCount, onNavigate }: HomePageProps) {
  const totalEnc = useMemo(() => stats.cons.monthly.reduce((s, m) => s + m.enc, 0), [stats]);
  const totalDec = useMemo(() => stats.cons.monthly.reduce((s, m) => s + m.dec, 0), [stats]);
  const fluxNet = totalEnc - totalDec;
  const soldeFinal = stats.cons.cum[11] || 0;
  const health = stats.healthScore.global;
  const alertCount = stats.niveauAlerts.length;

  const comptesUniques = useMemo(() => {
    const set = new Set(rows.map(r => r.compteComptable).filter(Boolean));
    return set.size;
  }, [rows]);

  const navButtons = [
    { key: "dashboard", label: "Dashboard", icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>) },
    { key: "journal",   label: "Journal",   icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
    { key: "flows",     label: "Flux",      icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>) },
    { key: "predict",   label: "Proph3t",   icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2m-9-11h2m18 0h2m-3.636-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414m0-12.728l1.414 1.414m11.314 11.314l1.414 1.414" /></svg>) },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-primary-50 px-4 py-12">

      {/* Title */}
      <h1 className="font-display text-6xl md:text-7xl text-primary-900 mb-4 select-none">
        TMS Pro Africa
      </h1>

      {/* Subtitle */}
      <p className="text-base md:text-lg text-primary-500 font-normal max-w-lg text-center leading-relaxed">
        La prévision de trésorerie, pilotée de bout en bout.
      </p>
      <p className="text-sm text-primary-400 font-light mt-1 mb-10">
        Votre trésorerie entre. Votre trésorerie sort. Maîtrisée.
      </p>

      {/* Big KPIs */}
      <div className="flex items-center gap-0 mb-10">
        {/* Encaissements */}
        <div className="text-center px-8 md:px-12">
          <div className="text-[11px] font-normal tracking-widest text-primary-500 uppercase mb-2">
            Encaissements
          </div>
          <div className="text-4xl md:text-5xl font-normal text-primary-900 tabular-nums">
            {fmt(totalEnc)}
            <span className="text-lg font-light text-primary-400 ml-1">{suffix(totalEnc)}</span>
          </div>
          <div className="text-xs text-primary-400 font-light mt-1">{ccySym}</div>
        </div>

        {/* Separator */}
        <div className="w-px h-16 bg-primary-200" />

        {/* Décaissements */}
        <div className="text-center px-8 md:px-12">
          <div className="text-[11px] font-normal tracking-widest text-primary-500 uppercase mb-2">
            Décaissements
          </div>
          <div className="text-4xl md:text-5xl font-normal text-primary-900 tabular-nums">
            {fmt(totalDec)}
            <span className="text-lg font-light text-primary-400 ml-1">{suffix(totalDec)}</span>
          </div>
          <div className="text-xs text-primary-400 font-light mt-1">{ccySym}</div>
        </div>

        {/* Separator */}
        <div className="w-px h-16 bg-primary-200" />

        {/* Flux Net */}
        <div className="text-center px-8 md:px-12">
          <div className="text-[11px] font-normal tracking-widest text-primary-500 uppercase mb-2">
            Flux Net
          </div>
          <div className={`text-4xl md:text-5xl font-normal tabular-nums ${fluxNet >= 0 ? "text-success" : "text-error"}`}>
            {fluxNet >= 0 ? "+" : ""}{fmt(fluxNet)}
            <span className="text-lg font-light ml-1">{suffix(fluxNet)}</span>
          </div>
          <div className="text-xs text-primary-400 font-light mt-1">{ccySym}</div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="flex flex-wrap items-stretch justify-center bg-primary-100 rounded-2xl border border-primary-200 shadow-sm overflow-hidden mb-10 max-w-3xl w-full">
        {[
          { value: entitiesCount, label: "Entités", sub: "actives" },
          { value: banksCount, label: "Banques", sub: "connectées" },
          { value: rows.length, label: "Lignes", sub: "de flux" },
          { value: comptesUniques, label: "Comptes", sub: "dans le plan" },
          { value: `${health}%`, label: "Santé", sub: alertCount > 0 ? `${alertCount} alerte${alertCount > 1 ? "s" : ""}` : "OK", highlight: health < 50 },
          { value: soldeFinal >= 0 ? "+" : "-", label: "Solde", sub: `${fmt(Math.abs(soldeFinal))} ${suffix(Math.abs(soldeFinal))} ${ccySym}` },
        ].map((card, i) => (
          <div key={i} className="flex-1 min-w-[100px] text-center py-5 px-3 border-r border-primary-200 last:border-r-0">
            <div className={`text-2xl md:text-3xl font-normal tabular-nums ${card.highlight ? "text-error" : "text-primary-900"}`}>
              {card.value}
            </div>
            <div className="text-xs font-medium text-primary-900 mt-1">{card.label}</div>
            <div className="text-[10px] text-primary-400 font-light">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex flex-wrap gap-3 justify-center mb-10">
        {navButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => onNavigate(btn.key)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary-200 bg-white text-primary-700 text-sm font-normal hover:bg-primary-900 hover:text-white hover:border-primary-900 transition-all shadow-sm"
          >
            <span>{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-primary-400 mt-10">
        Powered by Atlas Studio
      </p>
    </div>
  );
}
