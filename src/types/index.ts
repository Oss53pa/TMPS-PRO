export interface Entity {
  id: string;
  name: string;
  country: string;
  ccy: string;
}

export interface BankAccount {
  id: string;
  name: string;
  entity: string;
  iban?: string;
  swift?: string;
  ccy: string;
  active: boolean;
}

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  defaultFx: number;
  active: boolean;
}

export interface FlowType {
  label: string;
  cat: string;
}

export interface IAS7Section {
  key: string;
  label: string;
  icon: string;
  color: "emerald" | "blue" | "purple";
}

export interface Scenario {
  key: string;
  label: string;
  mult: number;
  color: "slate" | "emerald" | "rose";
}

export interface FlowRow {
  id: string;
  entity: string;
  bank: string;
  section: string;
  type: string;
  cat: string;
  ccy: string;
  label: string;
  amounts: string[];           // Montants prévisionnels (plan)
  amountsReel: string[];       // Montants réalisés (réalité)
  note: string;
  compteComptable?: string;
  scenario: string;            // base | optimiste | pessimiste
  statut: string;              // prevu | engage | realise | valide
  recurrence: string;          // ponctuel | mensuel | trimestriel | annuel
  dateValeur?: string;         // Date de valeur
  dateOperation?: string;      // Date d'opération
  contrepartie?: string;       // Tiers / Counterparty
  reference?: string;          // N° pièce justificative
  probabilite?: number;        // 0-100%
  exercice?: number;           // Année fiscale (ex: 2025, 2026, 2027)
}

export interface MonthlyData {
  enc: number;
  dec: number;
  bfr: number;
  pool: number;
  sections: Record<string, { enc: number; dec: number }>;
}

export interface BankData {
  si: number;
  monthly: { enc: number; dec: number }[];
  cum: number[];
}

export interface BfrKpi {
  dso: number;
  dpo: number;
  creances: number;
  dettes: number;
  bfrNet: number;
}

export interface NiveauAlert {
  bank: string;
  mi: number;
  month: string;
  type: string;
  val: number;
  seuil: number;
  ecart: number;
}

export interface ConsolidatedMonthly {
  enc: number;
  dec: number;
  bfr: number;
  ope: number;
  inv: number;
  fin: number;
}

export interface PredRow extends FlowRow {
  pred: number[];
  anomalies: { mi: number; val: number; z: string }[];
}

// ── TAFIRE (Module 3) ──
export interface TafirePartI {
  cafg: number;
  dividendesDistribues: number;
  cessionsActifs: number;
  augmentationCapitaux: number;
  augmentationDettes: number;
  totalRessources: number;
  acquisitionsImmo: number;
  remboursementCapitaux: number;
  remboursementDettes: number;
  totalEmplois: number;
  variationFR: number;
}

export interface TafirePartII {
  variationActifsCirculants: number;
  variationPassifsCirculants: number;
  variationBfrExploitation: number;
  variationBfrHAO: number;
  variationTresorerieNette: number;
}

export interface TafireData {
  partI: TafirePartI;
  partII: TafirePartII;
  byEntity: Record<string, { partI: TafirePartI; partII: TafirePartII }>;
}

// ── Intraday (Module 4) ──
export interface IntradayPosition {
  id: string;
  entity: string;
  bank: string;
  date: string;
  soldeComptable: number;
  soldeValeur: number;
  soldeDisponible: number;
  source: "manuel" | "import";
  updatedAt: string;
}

export interface FloatConfig {
  typeOperation: string;
  delaiJours: number;
}

// ── Conformité (Module 9) ──
export interface RegulatoryDeclaration {
  id: string;
  entity: string;
  type: string;
  period: string;
  status: "brouillon" | "soumis" | "validé" | "en_retard";
  dueDate: string;
  submittedAt: string;
  content: string;
}

export interface FiscalDeadline {
  id: string;
  entity: string;
  country: string;
  type: string;
  dueDate: string;
  amount: number;
  status: "à_faire" | "en_cours" | "payé" | "en_retard";
}

export interface KycCounterparty {
  id: string;
  name: string;
  country: string;
  type: "client" | "fournisseur" | "banque" | "autre";
  kycStatus: "vérifié" | "en_cours" | "expiré";
  kycExpiry: string;
}

// ── Mobile Money (Module 10) ──
export interface MobileMoneyWallet {
  id: string;
  entity: string;
  operator: string;
  walletNumber: string;
  ccy: string;
  balance: number;
  dailyLimit: number;
  monthlyLimit: number;
}

export interface MobileMoneyTransaction {
  id: string;
  walletId: string;
  type: "cashin" | "cashout" | "paiement" | "collecte";
  amount: number;
  fees: number;
  date: string;
  status: "effectué" | "en_attente" | "échoué";
  reference: string;
  counterparty: string;
}

// ── Gestion de la dette (Module 7.4) ──
export interface CreditFacility {
  id: string;
  entity: string;
  bank: string;
  type: "emprunt_lt" | "ligne_ct" | "credit_bail" | "decouvert" | "obligataire";
  limitAmount: number;
  drawnAmount: number;
  ccy: string;
  rateType: "fixe" | "variable";
  rateValue: number;
  maturityDate: string;
  status: "actif" | "remboursé" | "défaut";
}

export interface DebtSchedule {
  id: string;
  facilityId: string;
  paymentDate: string;
  principal: number;
  interest: number;
  total: number;
  balanceAfter: number;
  status: "à_payer" | "payé" | "en_retard";
}

// ── Nivellement / Transferts inter-comptes ──
export interface SweepTransfer {
  id: string;
  date: string;
  fromBank: string;
  toBank: string;
  amount: number;
  ccy: string;
  motif: "excédent" | "déficit" | "manuel";
  month: string;
  note: string;
  status: "prévu" | "exécuté" | "annulé";
  createdAt: string;
  compteDebit: string;
  compteCredit: string;
}

// ── Scoring santé (Module 11.4) ──
export interface HealthScore {
  global: number;
  liquidite: number;
  bfr: number;
  levier: number;
  dscr: number;
  expositionChange: number;
  nivellement: number;
  conformite: number;
  previsionVsRealise: number;
  diversificationBancaire: number;
  qualiteTresorerie: number;
}

// ── ML Engine Results (CDC V2 — Proph3t) ──
export interface MLPredictions {
  arima: number[];
  sarima: number[];
  lstm: number[];
  ensemble: number[];
}

export interface MonteCarloResult {
  nbSimulations: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  mean: number;
  probPositif: number;
}

export interface IsolationForestResult {
  mois: string;
  monthIndex: number;
  score: number;
  severite: "Critique" | "Modérée" | "Normal";
  fluxNet: number;
}

export interface KMeansCluster {
  id: string;
  nom: string;
  cluster: string;
  clusterLabel: string;
  profil: [number, number, number];
}

export interface RiskScoreResult {
  entite: string;
  nom: string;
  probabiliteRisque: number;
  niveau: "Faible" | "Modéré" | "Élevé" | "Critique";
  couleur: "emerald" | "amber" | "orange" | "red";
}

export interface MLLineResult {
  label: string;
  type: string;
  ensemble_M1: number;
  ensemble_M2: number;
  ensemble_M3: number;
  arima_M1: number;
  sarima_M1: number;
  lstm_M1: number;
  anomalies_zscore: string[];
  iso_forest_max: number;
}

export interface MLResultsData {
  predictions: MLPredictions;
  lineResults: MLLineResult[];
  monteCarlo: MonteCarloResult;
  isolationForest: IsolationForestResult[];
  clusters: KMeansCluster[];
  riskScores: RiskScoreResult[];
  timestamp: number;
}

// ── AppStats enrichi ──
export interface AppStats {
  byEntity: Record<string, { monthly: MonthlyData[] }>;
  byBank: Record<string, BankData>;
  cons: { monthly: ConsolidatedMonthly[]; cum: number[] };
  bfrKpi: Record<string, BfrKpi>;
  predRows: PredRow[];
  consPred: number[];
  niveauAlerts: NiveauAlert[];
  tafire: TafireData;
  healthScore: HealthScore;
}
