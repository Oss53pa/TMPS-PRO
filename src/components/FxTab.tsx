import { CURRENCIES } from "../constants";
import { p, fmt } from "../lib/helpers";
import type { FlowRow } from "../types";

interface Props {
  fx: Record<string, number>;
  setFx: (fn: (f: Record<string, number>) => Record<string, number>) => void;
  rows: FlowRow[];
}

export default function FxTab({ fx, setFx, rows }: Props) {
  return (
    <div className="p-4 space-y-4 w-full">
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <div className="text-sm font-semibold text-neutral-950 mb-3">Taux de change vs XOF (1 devise = X XOF)</div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {CURRENCIES.filter(c => c !== "XOF").map(c => (
            <div key={c} className="bg-neutral-50 rounded-lg p-3">
              <div className="text-xs font-bold text-neutral-900 mb-1">{c}</div>
              <input type="text" value={fx[c] || ""} onChange={e => setFx(f => ({ ...f, [c]: parseFloat(e.target.value) || 0 }))}
                className="bg-white border border-neutral-300 rounded-lg px-2 py-1 w-full text-right text-xs text-neutral-900" />
              <div className="text-neutral-400 text-[10px] mt-1">1 {c} = {fx[c] || 0} XOF</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 text-sm font-semibold text-neutral-900">Exposition par devise</div>
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-neutral-50 text-neutral-500">
            <th className="py-2 px-3 text-left font-medium">Devise</th>
            <th className="py-2 px-3 text-right font-medium">Enc. devise</th>
            <th className="py-2 px-3 text-right font-medium">Déc. devise</th>
            <th className="py-2 px-3 text-right font-medium">Enc. XOF</th>
            <th className="py-2 px-3 text-right font-medium">Déc. XOF</th>
            <th className="py-2 px-3 text-right font-medium">Exposition nette</th>
          </tr></thead>
          <tbody>
            {CURRENCIES.map(c => {
              const enc = rows.filter(r => (r.ccy || "XOF") === c && r.cat === "enc").reduce((s, r) => s + r.amounts.reduce((a: number, v: string) => a + p(v), 0), 0);
              const dec = rows.filter(r => (r.ccy || "XOF") === c && r.cat === "dec").reduce((s, r) => s + r.amounts.reduce((a: number, v: string) => a + p(v), 0), 0);
              if (enc === 0 && dec === 0) return null;
              return (
                <tr key={c} className="border-b border-neutral-100">
                  <td className="py-2 px-3 font-bold text-neutral-900">{c}</td>
                  <td className="py-2 px-3 text-right text-emerald-600">{fmt(enc)}</td>
                  <td className="py-2 px-3 text-right text-rose-600">{fmt(dec)}</td>
                  <td className="py-2 px-3 text-right text-emerald-700">{fmt(enc * (fx[c] || 1))}</td>
                  <td className="py-2 px-3 text-right text-rose-700">{fmt(dec * (fx[c] || 1))}</td>
                  <td className={`py-2 px-3 text-right font-bold ${(enc - dec) * (fx[c] || 1) >= 0 ? "text-neutral-900" : "text-red-600"}`}>{fmt((enc - dec) * (fx[c] || 1))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
