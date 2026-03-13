import { useState } from "react";
import type { RegulatoryDeclaration, FiscalDeadline, KycCounterparty } from "../types";
import { fmt, uid } from "../lib/helpers";
import { ENTITIES, BCEAO_DECLARATION_TYPES, FISCAL_TEMPLATES } from "../constants";

// ── Types ────────────────────────────────────────────────────────────────────

type SubTab = "Dashboard" | "Déclarations BCEAO" | "Échéances Fiscales" | "Registre KYC";

interface Props {
  declarations: RegulatoryDeclaration[];
  fiscalDeadlines: FiscalDeadline[];
  kycCounterparties: KycCounterparty[];
  addDeclaration: (d: Omit<RegulatoryDeclaration, "id">) => void;
  updateDeclaration: (id: string, field: string, value: any) => void;
  addDeadline: (d: Omit<FiscalDeadline, "id">) => void;
  updateDeadline: (id: string, field: string, value: any) => void;
  addKyc: (k: Omit<KycCounterparty, "id">) => void;
  updateKyc: (id: string, field: string, value: any) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

const daysDiff = (dateStr: string): number => {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
};

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

// ── Badge maps ────────────────────────────────────────────────────────────────

const DECL_BADGE: Record<RegulatoryDeclaration["status"], string> = {
  brouillon: "bg-neutral-100 text-neutral-600",
  soumis:    "bg-blue-100 text-blue-700",
  validé:    "bg-emerald-100 text-emerald-700",
  en_retard: "bg-rose-100 text-rose-700",
};
const DECL_LABEL: Record<RegulatoryDeclaration["status"], string> = {
  brouillon: "Brouillon",
  soumis:    "Soumis",
  validé:    "Validé",
  en_retard: "En retard",
};

const FISCAL_BADGE: Record<FiscalDeadline["status"], string> = {
  à_faire:  "bg-neutral-100 text-neutral-600",
  en_cours: "bg-amber-100 text-amber-700",
  payé:     "bg-emerald-100 text-emerald-700",
  en_retard:"bg-rose-100 text-rose-700",
};
const FISCAL_LABEL: Record<FiscalDeadline["status"], string> = {
  à_faire:  "À faire",
  en_cours: "En cours",
  payé:     "Payé",
  en_retard:"En retard",
};

const KYC_BADGE: Record<KycCounterparty["kycStatus"], string> = {
  vérifié: "bg-emerald-100 text-emerald-700",
  en_cours:"bg-amber-100 text-amber-700",
  expiré:  "bg-rose-100 text-rose-700",
};
const KYC_LABEL: Record<KycCounterparty["kycStatus"], string> = {
  vérifié: "Vérifié",
  en_cours:"En cours",
  expiré:  "Expiré",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ cls, label }: { cls: string; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "emerald" | "amber" | "rose" | "neutral";
}) {
  const accentCls =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "amber"
      ? "text-amber-600"
      : accent === "rose"
      ? "text-rose-600"
      : "text-neutral-900";
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col gap-1">
      <span className="text-xs text-neutral-500 font-medium">{label}</span>
      <span className={`text-2xl font-bold ${accentCls}`}>{value}</span>
      {sub && <span className="text-xs text-neutral-400">{sub}</span>}
    </div>
  );
}

// ── Dashboard sub-tab ─────────────────────────────────────────────────────────

function DashboardTab({
  declarations,
  fiscalDeadlines,
  kycCounterparties,
}: Pick<Props, "declarations" | "fiscalDeadlines" | "kycCounterparties">) {
  const today0 = today();

  // Déclarations à jour = validé ou soumis
  const declOk = declarations.filter(
    (d) => d.status === "validé" || d.status === "soumis"
  ).length;
  const declTotal = declarations.length;

  // Déclarations en retard
  const declLate = declarations.filter((d) => d.status === "en_retard").length;

  // Échéances fiscales dues dans < 30 jours (non payées)
  const fiscalSoon = fiscalDeadlines.filter((f) => {
    if (f.status === "payé") return false;
    const diff = daysDiff(f.dueDate);
    return diff >= 0 && diff < 30;
  }).length;

  // KYC expirés
  const kycExpired = kycCounterparties.filter(
    (k) => k.kycStatus === "expiré"
  ).length;

  // Fiscal en retard
  const fiscalLate = fiscalDeadlines.filter(
    (f) => f.status === "en_retard"
  ).length;

  // Score conformité heuristique
  const penaltyDecl = declTotal > 0 ? (declLate / declTotal) * 30 : 0;
  const penaltyKyc =
    kycCounterparties.length > 0
      ? (kycExpired / kycCounterparties.length) * 30
      : 0;
  const penaltyFiscal =
    fiscalDeadlines.length > 0
      ? (fiscalLate / fiscalDeadlines.length) * 40
      : 0;
  const score = Math.max(0, Math.round(100 - penaltyDecl - penaltyKyc - penaltyFiscal));

  const hasAlert = declLate > 0 || fiscalLate > 0 || kycExpired > 0;

  return (
    <div className="space-y-4">
      {hasAlert && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-start gap-2 ${
            declLate > 0 || fiscalLate > 0
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}
        >
          <span className="mt-0.5 shrink-0">&#9888;</span>
          <span>
            {[
              declLate > 0 &&
                `${declLate} déclaration${declLate > 1 ? "s" : ""} BCEAO en retard`,
              fiscalLate > 0 &&
                `${fiscalLate} échéance${fiscalLate > 1 ? "s" : ""} fiscale${fiscalLate > 1 ? "s" : ""} en retard`,
              kycExpired > 0 &&
                `${kycExpired} contrepartie${kycExpired > 1 ? "s" : ""} KYC expirée${kycExpired > 1 ? "s" : ""}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Score conformité"
          value={`${score} %`}
          sub="Heuristique global"
          accent={score >= 80 ? "emerald" : score >= 60 ? "amber" : "rose"}
        />
        <KpiCard
          label="Déclarations à jour"
          value={`${declOk} / ${declTotal}`}
          sub="validé ou soumis"
          accent={declLate > 0 ? "rose" : "emerald"}
        />
        <KpiCard
          label="Échéances < 30 j"
          value={fiscalSoon}
          sub="non encore payées"
          accent={fiscalSoon > 0 ? "amber" : "emerald"}
        />
        <KpiCard
          label="KYC expirés"
          value={kycExpired}
          sub={`sur ${kycCounterparties.length} contreparties`}
          accent={kycExpired > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* Upcoming deadlines table */}
      {fiscalDeadlines.filter((f) => f.status !== "payé").length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 text-xs font-semibold text-neutral-700">
            Prochaines échéances fiscales
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-left">
                <th className="py-2 px-3 font-medium">Entité</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium">Échéance</th>
                <th className="py-2 px-3 font-medium text-right">Montant</th>
                <th className="py-2 px-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {fiscalDeadlines
                .filter((f) => f.status !== "payé")
                .sort(
                  (a, b) =>
                    new Date(a.dueDate).getTime() -
                    new Date(b.dueDate).getTime()
                )
                .slice(0, 8)
                .map((f) => {
                  const diff = daysDiff(f.dueDate);
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="py-2 px-3 text-neutral-800">{f.entity}</td>
                      <td className="py-2 px-3 text-neutral-600">{f.type}</td>
                      <td
                        className={`py-2 px-3 font-medium ${
                          diff < 0
                            ? "text-rose-600"
                            : diff < 7
                            ? "text-amber-600"
                            : "text-neutral-700"
                        }`}
                      >
                        {fmtDate(f.dueDate)}{" "}
                        {diff < 0
                          ? `(${Math.abs(diff)}j retard)`
                          : diff === 0
                          ? "(aujourd'hui)"
                          : `(J-${diff})`}
                      </td>
                      <td className="py-2 px-3 text-right text-neutral-700">
                        {f.amount > 0 ? fmt(f.amount) : "—"}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          cls={FISCAL_BADGE[f.status]}
                          label={FISCAL_LABEL[f.status]}
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Déclarations BCEAO sub-tab ────────────────────────────────────────────────

function DeclarationsTab({
  declarations,
  addDeclaration,
  updateDeclaration,
}: Pick<Props, "declarations" | "addDeclaration" | "updateDeclaration">) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    entity: string;
    type: string;
    period: string;
    dueDate: string;
  }>({
    entity: ENTITIES[0].id,
    type: BCEAO_DECLARATION_TYPES[0].key,
    period: "",
    dueDate: "",
  });

  const handleGenerate = () => {
    const typeObj = BCEAO_DECLARATION_TYPES.find((t) => t.key === form.type);
    addDeclaration({
      entity: form.entity,
      type: typeObj?.label ?? form.type,
      period: form.period,
      dueDate: form.dueDate,
      status: "brouillon",
      submittedAt: "",
      content: "",
    });
    setShowForm(false);
    setForm({
      entity: ENTITIES[0].id,
      type: BCEAO_DECLARATION_TYPES[0].key,
      period: "",
      dueDate: "",
    });
  };

  const STATUS_OPTIONS: RegulatoryDeclaration["status"][] = [
    "brouillon",
    "soumis",
    "validé",
    "en_retard",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
          Déclarations réglementaires BCEAO / COBAC
        </span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-neutral-900 hover:bg-neutral-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + Nouvelle déclaration
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Entité</label>
            <select
              value={form.entity}
              onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
            >
              {ENTITIES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
            >
              {BCEAO_DECLARATION_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Période</label>
            <input
              type="text"
              placeholder="ex: Mars 2026"
              value={form.period}
              onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Échéance</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
            />
          </div>
          <div className="col-span-2 md:col-span-4 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={!form.period || !form.dueDate}
              className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 transition-colors"
            >
              Générer
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-neutral-500 text-left">
              <th className="py-2 px-3 font-medium">Entité</th>
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Période</th>
              <th className="py-2 px-3 font-medium">Échéance</th>
              <th className="py-2 px-3 font-medium">Statut</th>
              <th className="py-2 px-3 font-medium">Soumis le</th>
              <th className="py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {declarations.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-neutral-400 italic"
                >
                  Aucune déclaration enregistrée
                </td>
              </tr>
            )}
            {declarations.map((d) => {
              const diff = d.dueDate ? daysDiff(d.dueDate) : null;
              return (
                <tr
                  key={d.id}
                  className="border-b border-neutral-100 hover:bg-neutral-50"
                >
                  <td className="py-2 px-3 text-neutral-700">{d.entity}</td>
                  <td className="py-2 px-3 text-neutral-600">{d.type}</td>
                  <td className="py-2 px-3 text-neutral-600">{d.period || "—"}</td>
                  <td
                    className={`py-2 px-3 font-medium ${
                      diff !== null && diff < 0
                        ? "text-rose-600"
                        : diff !== null && diff < 7
                        ? "text-amber-600"
                        : "text-neutral-700"
                    }`}
                  >
                    {fmtDate(d.dueDate)}
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={d.status}
                      onChange={(e) =>
                        updateDeclaration(d.id, "status", e.target.value)
                      }
                      className="border-0 bg-transparent text-xs cursor-pointer focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {DECL_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <Badge
                      cls={DECL_BADGE[d.status]}
                      label={DECL_LABEL[d.status]}
                    />
                  </td>
                  <td className="py-2 px-3 text-neutral-500">
                    {d.submittedAt ? fmtDate(d.submittedAt) : "—"}
                  </td>
                  <td className="py-2 px-3">
                    {d.status === "brouillon" && (
                      <button
                        onClick={() => {
                          updateDeclaration(d.id, "status", "soumis");
                          updateDeclaration(
                            d.id,
                            "submittedAt",
                            today()
                          );
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Soumettre
                      </button>
                    )}
                    {d.status === "soumis" && (
                      <button
                        onClick={() =>
                          updateDeclaration(d.id, "status", "validé")
                        }
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Valider
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Échéances Fiscales sub-tab ────────────────────────────────────────────────

function FiscalTab({
  fiscalDeadlines,
  addDeadline,
  updateDeadline,
}: Pick<Props, "fiscalDeadlines" | "addDeadline" | "updateDeadline">) {
  const STATUS_OPTIONS: FiscalDeadline["status"][] = [
    "à_faire",
    "en_cours",
    "payé",
    "en_retard",
  ];

  const handleAutoGenerate = () => {
    const year = new Date().getFullYear();
    FISCAL_TEMPLATES.forEach((tpl) => {
      const entity = ENTITIES.find((e) => e.country.includes(tpl.country) || e.id === tpl.country);
      tpl.months.forEach((month) => {
        // Due date = last day of the month following the period
        const dueMonth = month === 12 ? 1 : month + 1;
        const dueYear = month === 12 ? year + 1 : year;
        const dueDate = new Date(dueYear, dueMonth - 1 + 1, 0)
          .toISOString()
          .slice(0, 10);
        addDeadline({
          entity: entity?.name ?? tpl.country,
          country: tpl.country,
          type: tpl.type,
          dueDate,
          amount: 0,
          status: "à_faire",
        });
      });
    });
  };

  const sorted = [...fiscalDeadlines].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
          Calendrier des obligations fiscales
        </span>
        <button
          onClick={handleAutoGenerate}
          className="bg-neutral-900 hover:bg-neutral-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Auto-générer depuis modèles
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-neutral-500 text-left">
              <th className="py-2 px-3 font-medium">Entité</th>
              <th className="py-2 px-3 font-medium">Pays</th>
              <th className="py-2 px-3 font-medium">Type d'obligation</th>
              <th className="py-2 px-3 font-medium">Échéance</th>
              <th className="py-2 px-3 font-medium text-right">Montant (XOF)</th>
              <th className="py-2 px-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-neutral-400 italic"
                >
                  Aucune échéance enregistrée — utilisez «&nbsp;Auto-générer&nbsp;»
                </td>
              </tr>
            )}
            {sorted.map((f) => {
              const diff = f.dueDate ? daysDiff(f.dueDate) : null;
              const overdue = diff !== null && diff < 0 && f.status !== "payé";
              return (
                <tr
                  key={f.id}
                  className={`border-b border-neutral-100 hover:bg-neutral-50 ${
                    overdue ? "bg-rose-50" : ""
                  }`}
                >
                  <td className="py-2 px-3 text-neutral-800">{f.entity}</td>
                  <td className="py-2 px-3 text-neutral-500">{f.country}</td>
                  <td className="py-2 px-3 text-neutral-600">{f.type}</td>
                  <td
                    className={`py-2 px-3 font-medium ${
                      overdue
                        ? "text-rose-600"
                        : diff !== null && diff < 7 && f.status !== "payé"
                        ? "text-amber-600"
                        : "text-neutral-700"
                    }`}
                  >
                    {fmtDate(f.dueDate)}
                    {diff !== null && f.status !== "payé" && (
                      <span className="ml-1 text-neutral-400">
                        {diff < 0
                          ? `(J+${Math.abs(diff)})`
                          : diff === 0
                          ? "(auj.)"
                          : `(J-${diff})`}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      value={f.amount || ""}
                      onChange={(e) =>
                        updateDeadline(
                          f.id,
                          "amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0"
                      className="w-24 text-right border border-neutral-200 rounded-md px-1.5 py-0.5 text-xs text-neutral-900 bg-transparent focus:outline-none focus:border-neutral-400"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={f.status}
                      onChange={(e) =>
                        updateDeadline(
                          f.id,
                          "status",
                          e.target.value as FiscalDeadline["status"]
                        )
                      }
                      className="border border-neutral-200 rounded-md px-1.5 py-0.5 text-xs bg-white text-neutral-800 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {FISCAL_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <span className="ml-1.5">
                      <Badge
                        cls={FISCAL_BADGE[f.status]}
                        label={FISCAL_LABEL[f.status]}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(["à_faire", "en_cours", "payé", "en_retard"] as FiscalDeadline["status"][]).map(
            (s) => {
              const rows = sorted.filter((f) => f.status === s);
              const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
              return (
                <div
                  key={s}
                  className="bg-white rounded-xl border border-neutral-200 p-3 flex flex-col gap-1"
                >
                  <Badge cls={FISCAL_BADGE[s]} label={FISCAL_LABEL[s]} />
                  <span className="text-lg font-bold text-neutral-900 mt-1">
                    {rows.length}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {total > 0 ? `${fmt(total)} XOF` : "montants non saisis"}
                  </span>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

// ── Registre KYC sub-tab ──────────────────────────────────────────────────────

const KYC_TYPES: KycCounterparty["type"][] = [
  "client",
  "fournisseur",
  "banque",
  "autre",
];

function KycTab({
  kycCounterparties,
  addKyc,
  updateKyc,
}: Pick<Props, "kycCounterparties" | "addKyc" | "updateKyc">) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    country: string;
    type: KycCounterparty["type"];
    kycStatus: KycCounterparty["kycStatus"];
    kycExpiry: string;
  }>({
    name: "",
    country: "",
    type: "client",
    kycStatus: "en_cours",
    kycExpiry: "",
  });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addKyc({ ...form });
    setForm({
      name: "",
      country: "",
      type: "client",
      kycStatus: "en_cours",
      kycExpiry: "",
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
          Registre KYC des contreparties
        </span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-neutral-900 hover:bg-neutral-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + Ajouter contrepartie
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Nom / Raison sociale
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Société ABC"
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Pays</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) =>
                setForm((f) => ({ ...f, country: e.target.value }))
              }
              placeholder="Ex: CI"
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as KycCounterparty["type"],
                }))
              }
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
            >
              {KYC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Statut KYC
            </label>
            <select
              value={form.kycStatus}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kycStatus: e.target.value as KycCounterparty["kycStatus"],
                }))
              }
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
            >
              <option value="en_cours">En cours</option>
              <option value="vérifié">Vérifié</option>
              <option value="expiré">Expiré</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Date d'expiration KYC
            </label>
            <input
              type="date"
              value={form.kycExpiry}
              onChange={(e) =>
                setForm((f) => ({ ...f, kycExpiry: e.target.value }))
              }
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs text-neutral-900 bg-white"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.name.trim()}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-neutral-500 text-left">
              <th className="py-2 px-3 font-medium">Nom</th>
              <th className="py-2 px-3 font-medium">Pays</th>
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Statut KYC</th>
              <th className="py-2 px-3 font-medium">Expiration</th>
              <th className="py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {kycCounterparties.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-neutral-400 italic"
                >
                  Aucune contrepartie enregistrée
                </td>
              </tr>
            )}
            {kycCounterparties.map((k) => {
              const diff = k.kycExpiry ? daysDiff(k.kycExpiry) : null;
              const expiringSoon =
                diff !== null && diff >= 0 && diff < 30 && k.kycStatus !== "expiré";
              return (
                <tr
                  key={k.id}
                  className="border-b border-neutral-100 hover:bg-neutral-50"
                >
                  <td className="py-2 px-3 font-medium text-neutral-900">
                    {k.name}
                  </td>
                  <td className="py-2 px-3 text-neutral-500">{k.country || "—"}</td>
                  <td className="py-2 px-3 text-neutral-600 capitalize">{k.type}</td>
                  <td className="py-2 px-3">
                    <select
                      value={k.kycStatus}
                      onChange={(e) =>
                        updateKyc(
                          k.id,
                          "kycStatus",
                          e.target.value as KycCounterparty["kycStatus"]
                        )
                      }
                      className="border border-neutral-200 rounded-md px-1.5 py-0.5 text-xs bg-white text-neutral-800 focus:outline-none mr-1.5"
                    >
                      <option value="vérifié">Vérifié</option>
                      <option value="en_cours">En cours</option>
                      <option value="expiré">Expiré</option>
                    </select>
                    <Badge
                      cls={KYC_BADGE[k.kycStatus]}
                      label={KYC_LABEL[k.kycStatus]}
                    />
                  </td>
                  <td
                    className={`py-2 px-3 font-medium ${
                      k.kycStatus === "expiré"
                        ? "text-rose-600"
                        : expiringSoon
                        ? "text-amber-600"
                        : "text-neutral-700"
                    }`}
                  >
                    {fmtDate(k.kycExpiry)}
                    {expiringSoon && (
                      <span className="ml-1 text-amber-500">(J-{diff})</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={k.kycExpiry || ""}
                        onChange={(e) =>
                          updateKyc(k.id, "kycExpiry", e.target.value)
                        }
                        className="border border-neutral-200 rounded-md px-1.5 py-0.5 text-xs bg-white text-neutral-700 focus:outline-none"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary by status */}
      {kycCounterparties.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(["vérifié", "en_cours", "expiré"] as KycCounterparty["kycStatus"][]).map(
            (s) => {
              const count = kycCounterparties.filter(
                (k) => k.kycStatus === s
              ).length;
              return (
                <div
                  key={s}
                  className="bg-white rounded-xl border border-neutral-200 p-3 flex flex-col gap-1"
                >
                  <Badge cls={KYC_BADGE[s]} label={KYC_LABEL[s]} />
                  <span className="text-2xl font-bold text-neutral-900 mt-1">
                    {count}
                  </span>
                  <span className="text-xs text-neutral-500">contrepartie{count !== 1 ? "s" : ""}</span>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const SUB_TABS: SubTab[] = [
  "Dashboard",
  "Déclarations BCEAO",
  "Échéances Fiscales",
  "Registre KYC",
];

export default function ConformiteTab({
  declarations,
  fiscalDeadlines,
  kycCounterparties,
  addDeclaration,
  updateDeclaration,
  addDeadline,
  updateDeadline,
  addKyc,
  updateKyc,
}: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>("Dashboard");

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-neutral-900">
            Module 9 — Conformité Réglementaire
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Déclarations BCEAO / COBAC · Obligations fiscales · Registre KYC
          </p>
        </div>
      </div>

      {/* Sub-tab nav */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 w-fit">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "Dashboard" && (
        <DashboardTab
          declarations={declarations}
          fiscalDeadlines={fiscalDeadlines}
          kycCounterparties={kycCounterparties}
        />
      )}
      {activeTab === "Déclarations BCEAO" && (
        <DeclarationsTab
          declarations={declarations}
          addDeclaration={addDeclaration}
          updateDeclaration={updateDeclaration}
        />
      )}
      {activeTab === "Échéances Fiscales" && (
        <FiscalTab
          fiscalDeadlines={fiscalDeadlines}
          addDeadline={addDeadline}
          updateDeadline={updateDeadline}
        />
      )}
      {activeTab === "Registre KYC" && (
        <KycTab
          kycCounterparties={kycCounterparties}
          addKyc={addKyc}
          updateKyc={updateKyc}
        />
      )}
    </div>
  );
}
