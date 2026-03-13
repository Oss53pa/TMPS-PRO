import { ENTITIES } from "../constants";
import { fmt } from "../lib/helpers";
import type { AppStats } from "../types";

interface Props {
  stats: AppStats;
  dso: Record<string, string>;
  dpo: Record<string, string>;
  setDso: (fn: (d: Record<string, string>) => Record<string, string>) => void;
  setDpo: (fn: (d: Record<string, string>) => Record<string, string>) => void;
}

export default function BfrTab({ stats, dso, dpo, setDso, setDpo }: Props) {
  return (
    <div className="p-4 space-y-4 w-full">
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <div className="text-sm font-semibold text-neutral-950 mb-3">Paramètres BFR par entité</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {ENTITIES.map(e => (
            <div key={e.id} className="bg-neutral-50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-neutral-900">{e.name}</div>
              <div>
                <label className="text-[10px] text-neutral-500 font-medium">DSO (jours clients)</label>
                <input type="number" value={dso[e.id]} onChange={ev => setDso(d => ({ ...d, [e.id]: ev.target.value }))}
                  className="bg-white border border-neutral-300 rounded-lg px-2 py-1 w-full text-xs text-neutral-900 mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-neutral-500 font-medium">DPO (jours fournisseurs)</label>
                <input type="number" value={dpo[e.id]} onChange={ev => setDpo(d => ({ ...d, [e.id]: ev.target.value }))}
                  className="bg-white border border-neutral-300 rounded-lg px-2 py-1 w-full text-xs text-neutral-900 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 text-sm font-semibold text-neutral-900">Analyse BFR par entité</div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-neutral-500">
              <th className="px-3 py-2 text-left font-medium">Entité</th>
              <th className="px-3 py-2 text-right font-medium">DSO</th>
              <th className="px-3 py-2 text-right font-medium">DPO</th>
              <th className="px-3 py-2 text-right text-blue-600 font-medium">Créances</th>
              <th className="px-3 py-2 text-right text-purple-600 font-medium">Dettes</th>
              <th className="px-3 py-2 text-right text-neutral-900 font-medium">BFR Net</th>
              <th className="px-3 py-2 text-center font-medium">Signal</th>
            </tr>
          </thead>
          <tbody>
            {ENTITIES.map(e => {
              const b = stats.bfrKpi[e.id];
              const signal = b.bfrNet > 0 ? "Besoin financement" : b.bfrNet < -10000000 ? "Ressource" : "Équilibré";
              const signalCls = b.bfrNet > 0 ? "text-red-600 bg-red-50" : b.bfrNet < -10000000 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50";
              return (
                <tr key={e.id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                  <td className="px-3 py-2 font-semibold text-neutral-900">{e.name}<br /><span className="text-neutral-400 font-normal">{e.country}</span></td>
                  <td className="px-3 py-2 text-right text-neutral-700">{b.dso} j</td>
                  <td className="px-3 py-2 text-right text-neutral-700">{b.dpo} j</td>
                  <td className="px-3 py-2 text-right text-blue-600">{fmt(b.creances)}</td>
                  <td className="px-3 py-2 text-right text-purple-600">{fmt(b.dettes)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${b.bfrNet >= 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(b.bfrNet)}</td>
                  <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${signalCls}`}>{signal}</span></td>
                </tr>
              );
            })}
            <tr className="bg-neutral-50 font-bold">
              <td className="px-3 py-2 text-neutral-900">CONSOLIDÉ</td>
              <td colSpan={2}></td>
              <td className="px-3 py-2 text-right text-blue-600">{fmt(ENTITIES.reduce((s, e) => s + stats.bfrKpi[e.id].creances, 0))}</td>
              <td className="px-3 py-2 text-right text-purple-600">{fmt(ENTITIES.reduce((s, e) => s + stats.bfrKpi[e.id].dettes, 0))}</td>
              <td className="px-3 py-2 text-right text-neutral-900">{fmt(ENTITIES.reduce((s, e) => s + stats.bfrKpi[e.id].bfrNet, 0))}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
