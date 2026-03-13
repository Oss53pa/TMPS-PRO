import { useState } from "react";
import { ENTITIES, BANKS, FLOAT_DELAYS } from "../constants";
import { fmt, uid, p } from "../lib/helpers";
import type { IntradayPosition, AppStats } from "../types";

interface Props {
  intradayPositions: IntradayPosition[];
  addPosition: (pos: Omit<IntradayPosition, "id">) => void;
  updatePosition: (id: string, field: string, value: any) => void;
  deletePosition: (id: string) => void;
  stats: AppStats;
  ccySym: string;
}

function statusDot(updatedAt: string): { cls: string; label: string } {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const hours = diff / 3_600_000;
  if (hours < 24) return { cls: "bg-emerald-500", label: "Mis à jour aujourd'hui" };
  if (hours < 48) return { cls: "bg-amber-400", label: "Mis à jour il y a >24h" };
  return { cls: "bg-red-500", label: "Mis à jour il y a >48h" };
}

export default function IntradayTab({
  intradayPositions,
  addPosition,
  updatePosition,
  deletePosition,
  ccySym,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [entity, setEntity] = useState(ENTITIES[0].id);
  const [bank, setBank] = useState(BANKS[0]);
  const [comptable, setComptable] = useState("");
  const [valeur, setValeur] = useState("");
  const [disponible, setDisponible] = useState("");

  function handleAdd() {
    addPosition({
      entity,
      bank,
      date: today,
      soldeComptable: p(comptable),
      soldeValeur: p(valeur),
      soldeDisponible: p(disponible),
      source: "manuel",
      updatedAt: new Date().toISOString(),
    });
    setComptable("");
    setValeur("");
    setDisponible("");
  }

  const totalDisponible = intradayPositions.reduce(
    (acc, pos) => acc + pos.soldeDisponible,
    0
  );

  const soldeColor = (v: number) =>
    v > 0 ? "text-emerald-600" : v < 0 ? "text-red-600" : "text-neutral-500";

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            Position de Trésorerie J+0
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Date du jour :{" "}
            <span className="font-medium text-neutral-700">
              {new Intl.DateTimeFormat("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }).format(new Date())}
            </span>
          </p>
        </div>
        <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
          {intradayPositions.length} position{intradayPositions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Quick entry form */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <div className="text-xs font-semibold text-neutral-700 mb-3">
          Saisie rapide
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">
              Entité
            </label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 min-w-[140px]"
            >
              {ENTITIES.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">
              Banque
            </label>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 min-w-[130px]"
            >
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">
              Solde comptable ({ccySym})
            </label>
            <input
              type="text"
              value={comptable}
              onChange={(e) => setComptable(e.target.value)}
              placeholder="0"
              className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 w-32 text-right text-xs text-neutral-900"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">
              Solde valeur ({ccySym})
            </label>
            <input
              type="text"
              value={valeur}
              onChange={(e) => setValeur(e.target.value)}
              placeholder="0"
              className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 w-32 text-right text-xs text-neutral-900"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">
              Solde disponible ({ccySym})
            </label>
            <input
              type="text"
              value={disponible}
              onChange={(e) => setDisponible(e.target.value)}
              placeholder="0"
              className="bg-white border border-neutral-300 rounded-lg px-2 py-1.5 w-32 text-right text-xs text-neutral-900"
            />
          </div>

          <button
            onClick={handleAdd}
            className="bg-neutral-900 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 text-xs font-semibold text-neutral-900">
          Positions du jour
        </div>

        {intradayPositions.length === 0 ? (
          <div className="p-10 text-center text-neutral-400 text-xs">
            Aucune position saisie. Saisissez les soldes du jour.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500">
                  <th className="px-3 py-2 text-left font-medium">Statut</th>
                  <th className="px-3 py-2 text-left font-medium">Entité</th>
                  <th className="px-3 py-2 text-left font-medium">Banque</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Solde Comptable
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Solde Valeur
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Solde Disponible
                  </th>
                  <th className="px-3 py-2 text-center font-medium">Source</th>
                  <th className="px-3 py-2 text-center font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {intradayPositions.map((pos) => {
                  const dot = statusDot(pos.updatedAt);
                  const entityName =
                    ENTITIES.find((e) => e.id === pos.entity)?.name ??
                    pos.entity;
                  return (
                    <tr
                      key={pos.id}
                      className="border-b border-neutral-100 hover:bg-neutral-50/60 transition-colors"
                    >
                      {/* Status dot */}
                      <td className="px-3 py-2 text-center">
                        <span
                          title={dot.label}
                          className={`inline-block w-2.5 h-2.5 rounded-full ${dot.cls}`}
                        />
                      </td>

                      {/* Entité */}
                      <td className="px-3 py-2 font-medium text-neutral-800">
                        {entityName}
                      </td>

                      {/* Banque */}
                      <td className="px-3 py-2 text-neutral-700">{pos.bank}</td>

                      {/* Date */}
                      <td className="px-3 py-2 text-neutral-500">
                        {new Intl.DateTimeFormat("fr-FR").format(
                          new Date(pos.date)
                        )}
                      </td>

                      {/* Solde comptable — inline editable */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          defaultValue={pos.soldeComptable}
                          onBlur={(e) =>
                            updatePosition(
                              pos.id,
                              "soldeComptable",
                              p(e.target.value)
                            )
                          }
                          className={`bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-500 w-28 text-right font-medium ${soldeColor(
                            pos.soldeComptable
                          )}`}
                        />
                      </td>

                      {/* Solde valeur — inline editable */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          defaultValue={pos.soldeValeur}
                          onBlur={(e) =>
                            updatePosition(
                              pos.id,
                              "soldeValeur",
                              p(e.target.value)
                            )
                          }
                          className={`bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-500 w-28 text-right font-medium ${soldeColor(
                            pos.soldeValeur
                          )}`}
                        />
                      </td>

                      {/* Solde disponible — inline editable */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          defaultValue={pos.soldeDisponible}
                          onBlur={(e) =>
                            updatePosition(
                              pos.id,
                              "soldeDisponible",
                              p(e.target.value)
                            )
                          }
                          className={`bg-transparent border-b border-dashed border-neutral-300 focus:outline-none focus:border-neutral-500 w-28 text-right font-bold ${soldeColor(
                            pos.soldeDisponible
                          )}`}
                        />
                      </td>

                      {/* Source */}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            pos.source === "import"
                              ? "bg-neutral-100 text-neutral-600"
                              : "bg-neutral-800 text-white"
                          }`}
                        >
                          {pos.source === "import" ? "Import" : "Manuel"}
                        </span>
                      </td>

                      {/* Delete */}
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => deletePosition(pos.id)}
                          title="Supprimer"
                          className="text-neutral-300 hover:text-red-500 transition-colors font-bold text-base leading-none"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Position consolidée KPI */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
          Position consolidée — Solde disponible agrégé
        </div>
        <div className="flex items-end gap-3">
          <span
            className={`text-4xl font-bold tabular-nums ${soldeColor(
              totalDisponible
            )}`}
          >
            {fmt(totalDisponible)}
          </span>
          <span className="text-lg font-semibold text-neutral-400 mb-1">
            {ccySym}
          </span>
        </div>
        <p className="text-[10px] text-neutral-400 mt-2">
          Somme des soldes disponibles de toutes les positions saisies —
          devise de reporting
        </p>
        {intradayPositions.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="text-[10px] text-neutral-500 mb-1 font-medium">
                Solde comptable total
              </div>
              <div
                className={`text-sm font-bold ${soldeColor(
                  intradayPositions.reduce(
                    (a, x) => a + x.soldeComptable,
                    0
                  )
                )}`}
              >
                {fmt(
                  intradayPositions.reduce((a, x) => a + x.soldeComptable, 0)
                )}{" "}
                {ccySym}
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="text-[10px] text-neutral-500 mb-1 font-medium">
                Solde valeur total
              </div>
              <div
                className={`text-sm font-bold ${soldeColor(
                  intradayPositions.reduce((a, x) => a + x.soldeValeur, 0)
                )}`}
              >
                {fmt(
                  intradayPositions.reduce((a, x) => a + x.soldeValeur, 0)
                )}{" "}
                {ccySym}
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="text-[10px] text-neutral-500 mb-1 font-medium">
                Nb de banques
              </div>
              <div className="text-sm font-bold text-neutral-800">
                {new Set(intradayPositions.map((x) => x.bank)).size}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Float bancaire */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 text-xs font-semibold text-neutral-900">
          Float bancaire africain — délais de valeur
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-neutral-500">
              <th className="px-4 py-2 text-left font-medium">
                Type d'opération
              </th>
              <th className="px-4 py-2 text-center font-medium">
                Délai (jours)
              </th>
              <th className="px-4 py-2 text-left font-medium">Indicateur</th>
            </tr>
          </thead>
          <tbody>
            {FLOAT_DELAYS.map((fd, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="px-4 py-2 text-neutral-800 font-medium">
                  {fd.typeOperation}
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      fd.delaiJours === 0
                        ? "bg-emerald-100 text-emerald-700"
                        : fd.delaiJours <= 1
                        ? "bg-neutral-100 text-neutral-600"
                        : fd.delaiJours <= 2
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    J+{fd.delaiJours}
                  </span>
                </td>
                <td className="px-4 py-2 text-neutral-400">
                  {fd.delaiJours === 0
                    ? "Disponible immédiatement"
                    : fd.delaiJours === 1
                    ? "Disponible le lendemain"
                    : `Disponible en ${fd.delaiJours} jours ouvrés`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
