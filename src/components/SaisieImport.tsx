import { ENTITIES, BANKS, CURRENCIES, MONTHS } from "../constants";
import { p, fmt } from "../lib/helpers";
import type { FlowRow } from "../types";
import Icon from "./ui/Icon";

interface Props {
  rows: FlowRow[];
  confirmDelete: (id: string) => void;
  importMsg: string;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileImport: (f: File) => void;
  downloadTemplate: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  csvPreview?: FlowRow[] | null;
  confirmCsvImport?: () => void;
  cancelCsvPreview?: () => void;
}

export default function SaisieImport(props: Props) {
  const {
    rows, confirmDelete, importMsg, dragOver, setDragOver,
    handleDrop, handleFileImport, downloadTemplate, fileInputRef,
  } = props;

  return (
    <div className="p-4 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ═══ IMPORT CSV ═══ */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 bg-emerald-50">
            <div className="text-sm font-semibold text-emerald-700">Import CSV</div>
            <div className="text-xs text-neutral-500">Importez vos flux depuis un fichier CSV (séparateur ;)</div>
          </div>
          <div className="p-4 space-y-3">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver ? "border-neutral-500 bg-neutral-100" : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"}`}
            >
              <div className="mb-2 text-neutral-300 flex justify-center"><Icon name="import" className="w-8 h-8" /></div>
              <div className="text-xs text-neutral-500">
                Glissez-déposez un fichier CSV ici<br />
                ou <span className="text-neutral-900 underline font-medium">cliquez pour parcourir</span>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileImport(f); e.target.value = ""; }} />
            </div>

            {importMsg && (
              <div className={`text-xs px-3 py-2 rounded-lg ${importMsg.includes("✓") ? "bg-emerald-50 text-emerald-700" : importMsg.includes("Aperçu") ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                {importMsg}
              </div>
            )}

            {/* C4: CSV Preview before import */}
            {props.csvPreview && props.csvPreview.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                <div className="text-xs font-semibold text-amber-700">Aperçu — {props.csvPreview.length} ligne(s) prêtes à importer</div>
                <div className="max-h-40 overflow-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-amber-600">
                        <th className="text-left px-1">Entité</th>
                        <th className="text-left px-1">Type</th>
                        <th className="text-left px-1">Cat</th>
                        <th className="text-right px-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {props.csvPreview.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t border-amber-100">
                          <td className="px-1 py-0.5">{row.entity}</td>
                          <td className="px-1 py-0.5 truncate max-w-[120px]">{row.type}</td>
                          <td className="px-1 py-0.5">{row.cat}</td>
                          <td className="px-1 py-0.5 text-right tabular-nums">{fmt(row.amounts.reduce((s, v) => s + p(v), 0))}</td>
                        </tr>
                      ))}
                      {props.csvPreview.length > 20 && (
                        <tr><td colSpan={4} className="px-1 py-0.5 text-amber-500 italic">... et {props.csvPreview.length - 20} autres lignes</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button onClick={props.confirmCsvImport}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                    Confirmer l'import
                  </button>
                  <button onClick={props.cancelCsvPreview}
                    className="px-3 py-1.5 border border-neutral-300 text-neutral-600 rounded-lg text-xs font-semibold hover:bg-neutral-50 transition">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
              <div className="text-xs text-neutral-500 font-medium">Format attendu :</div>
              <div className="text-[10px] font-mono text-neutral-400 bg-white rounded p-2 overflow-x-auto whitespace-nowrap border border-neutral-200">
                Entité;Banque;Type;Catégorie;Devise;Libellé;Jan;Fév;Mar;...;Déc;Note
              </div>
              <button onClick={downloadTemplate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold w-full transition">
                Télécharger le modèle CSV
              </button>
            </div>

            <div className="bg-neutral-50 rounded-lg p-3 space-y-1">
              <div className="text-xs font-semibold text-neutral-700 mb-1">Conseils</div>
              <div className="text-xs text-neutral-400">Séparateur : point-virgule (;) · Encodage : UTF-8</div>
              <div className="text-xs text-neutral-400">Catégories : enc (encaissement), dec (décaissement), bfr, pool</div>
              <div className="text-xs text-neutral-400">Entités : {ENTITIES.map(e => e.id).join(", ")}</div>
              <div className="text-xs text-neutral-400">Devises : {CURRENCIES.join(", ")}</div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-xs">
              Pour saisir un flux manuellement, utilisez l'onglet <strong>Journal</strong> et cliquez sur <strong>« + Nouveau flux »</strong>.
            </div>
          </div>
        </div>

        {/* ═══ DERNIÈRES SAISIES ═══ */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-100 text-sm font-semibold text-neutral-700">
            Dernières saisies ({rows.length} total)
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {rows.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Aucune ligne saisie</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-500 sticky top-0">
                    <th className="px-2 py-1.5 text-left font-medium">Sens</th>
                    <th className="px-2 py-1.5 text-left font-medium">Entité</th>
                    <th className="px-2 py-1.5 text-left font-medium">Libellé</th>
                    <th className="px-2 py-1.5 text-right font-medium">Total</th>
                    <th className="px-2 py-1.5 w-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(-30).reverse().map(row => (
                    <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          row.cat === "enc" ? "bg-emerald-100 text-emerald-700" :
                          row.cat === "dec" ? "bg-rose-100 text-rose-700" :
                          row.cat === "bfr" ? "bg-amber-100 text-amber-700" :
                          "bg-purple-100 text-purple-700"
                        }`}>
                          {row.cat === "enc" ? "↑ Entrée" : row.cat === "dec" ? "↓ Sortie" : row.cat === "bfr" ? "↔ BFR" : "⇄ Pool"}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-neutral-700 font-medium">{row.entity}</td>
                      <td className="px-2 py-1 text-neutral-500 truncate max-w-[200px]">{row.label || row.type}</td>
                      <td className={`px-2 py-1 text-right font-bold ${row.cat === "enc" ? "text-emerald-600" : "text-rose-600"}`}>
                        {row.cat === "dec" ? "−" : "+"}{fmt(row.amounts.reduce((s, v) => s + p(v), 0))} {row.ccy}
                      </td>
                      <td className="px-1 py-1">
                        <button onClick={() => confirmDelete(row.id)} className="text-neutral-300 hover:text-red-500 font-bold transition">x</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
