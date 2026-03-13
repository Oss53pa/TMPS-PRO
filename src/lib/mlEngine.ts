/**
 * Proph3t ML Engine — 7 Algorithmes embarqués (CDC V2)
 * ARIMA(1,1,1) · SARIMA · LSTM simplifié · Ensemble
 * Isolation Forest · K-Means · Monte Carlo · Risk Scoring
 */

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

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
  profil: [number, number, number]; // enc, dec, bfr in M FCFA
}

export interface RiskScore {
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

export interface MLResults {
  predictions: MLPredictions;
  lineResults: MLLineResult[];
  monteCarlo: MonteCarloResult;
  isolationForest: IsolationForestResult[];
  clusters: KMeansCluster[];
  riskScores: RiskScore[];
  timestamp: number;
}

// ══════════════════════════════════════════════════════════════
// 1. ARIMA(1,1,1) — Séries temporelles
// ══════════════════════════════════════════════════════════════

function arimaPredict(series: number[], horizon: number): number[] {
  if (series.length < 4) {
    const last = series[series.length - 1] || 0;
    return Array(horizon).fill(last);
  }

  // Différenciation d'ordre 1
  const diff: number[] = [];
  for (let i = 1; i < series.length; i++) {
    diff.push(series[i] - series[i - 1]);
  }

  // AR(1): φ = Σ(diff[t] × diff[t-1]) / Σ(diff[t-1]²)
  let numAR = 0, denAR = 0;
  for (let t = 1; t < diff.length; t++) {
    numAR += diff[t] * diff[t - 1];
    denAR += diff[t - 1] ** 2;
  }
  const phi = denAR !== 0 ? numAR / denAR : 0;

  // Residuals
  const resid: number[] = [diff[0]];
  for (let t = 1; t < diff.length; t++) {
    resid.push(diff[t] - phi * diff[t - 1]);
  }

  // MA(1): θ = Σ(resid[t] × resid[t-1]) / Σ(resid[t-1]²)
  let numMA = 0, denMA = 0;
  for (let t = 1; t < resid.length; t++) {
    numMA += resid[t] * resid[t - 1];
    denMA += resid[t - 1] ** 2;
  }
  const theta = denMA !== 0 ? numMA / denMA : 0;

  // Forecast
  const predictions: number[] = [];
  let lastVal = series[series.length - 1];
  let lastDiff = diff[diff.length - 1];
  let lastResid = resid[resid.length - 1];

  for (let h = 0; h < horizon; h++) {
    const diffPred = phi * lastDiff + theta * lastResid;
    const yPred = Math.max(0, lastVal + diffPred);
    predictions.push(yPred);
    lastResid = 0; // MA term decays after step 1
    lastDiff = diffPred;
    lastVal = yPred;
  }

  return predictions;
}

// ══════════════════════════════════════════════════════════════
// 2. SARIMA — ARIMA + Saisonnalité (période S=12)
// ══════════════════════════════════════════════════════════════

function sarimaPredict(series: number[], horizon: number): number[] {
  if (series.length < 6) {
    return arimaPredict(series, horizon);
  }

  const n = series.length;
  const S = Math.min(12, n);

  // Compute seasonal factors
  const grandAvg = series.reduce((s, v) => s + v, 0) / n || 1;
  const sf: number[] = Array(S).fill(1);

  for (let m = 0; m < S; m++) {
    const vals: number[] = [];
    for (let i = m; i < n; i += S) {
      if (series[i] > 0) vals.push(series[i]);
    }
    sf[m] = vals.length > 0
      ? (vals.reduce((s, v) => s + v, 0) / vals.length) / grandAvg
      : 1;
  }

  // Deseasonalize
  const deseason = series.map((v, i) => {
    const factor = sf[i % S] || 1;
    return factor > 0 ? v / factor : v;
  });

  // Apply ARIMA on deseasonalized
  const arimaPred = arimaPredict(deseason, horizon);

  // Reseasonalize
  return arimaPred.map((v, i) => Math.max(0, v * (sf[(n + i) % S] || 1)));
}

// ══════════════════════════════════════════════════════════════
// 3. LSTM Simplifié — Deep Learning Récurrent
// ══════════════════════════════════════════════════════════════

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, x))));
}

function lstmPredict(series: number[], horizon: number): number[] {
  if (series.length < 6) {
    return arimaPredict(series, horizon);
  }

  // Min-max normalization
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const norm = series.map(v => (v - min) / range);

  const seqLen = 4;
  const epochs = 50;
  const lr = 0.01;

  // Initialize weights
  let wf = 0.5, wi = 0.5, wo = 0.5, wc = 0.5;

  // Training
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = seqLen; i < norm.length; i++) {
      const window = norm.slice(i - seqLen, i);
      const h = window.reduce((s, v) => s + v, 0) / seqLen;
      const target = norm[i];

      const f = sigmoid(wf * h);
      const inp = sigmoid(wi * h);
      const o = sigmoid(wo * h);
      const c = Math.tanh(wc * h);

      const cellState = f * 0.5 + inp * c; // Simplified cell
      const hidden = o * Math.tanh(cellState);
      const error = target - hidden;

      // Simple gradient update
      wf += lr * error * h;
      wi += lr * error * h;
      wo += lr * error * h;
      wc += lr * error * h;
    }
  }

  // Forecast
  const predictions: number[] = [];
  const buffer = [...norm];

  for (let i = 0; i < horizon; i++) {
    const window = buffer.slice(buffer.length - seqLen);
    const h = window.reduce((s, v) => s + v, 0) / seqLen;

    const f = sigmoid(wf * h);
    const inp = sigmoid(wi * h);
    const o = sigmoid(wo * h);
    const c = Math.tanh(wc * h);

    const cellState = f * 0.5 + inp * c;
    const hidden = o * Math.tanh(cellState);

    buffer.push(hidden);
    // Denormalize
    predictions.push(Math.max(0, hidden * range + min));
  }

  return predictions;
}

// ══════════════════════════════════════════════════════════════
// 4. Ensemble — Combinaison Pondérée (25/35/40%)
// ══════════════════════════════════════════════════════════════

function ensemblePredict(arima: number[], sarima: number[], lstm: number[]): number[] {
  const horizon = Math.max(arima.length, sarima.length, lstm.length);
  return Array.from({ length: horizon }, (_, i) =>
    Math.max(0,
      0.25 * (arima[i] || 0) +
      0.35 * (sarima[i] || 0) +
      0.40 * (lstm[i] || 0)
    )
  );
}

// ══════════════════════════════════════════════════════════════
// 5. Monte Carlo — 10 000 Simulations
// ══════════════════════════════════════════════════════════════

function boxMuller(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}

export function runMonteCarlo(
  monthlyEnc: number[],
  monthlyDec: number[],
  nbSimulations = 10000
): MonteCarloResult {
  const results: number[] = [];

  for (let sim = 0; sim < nbSimulations; sim++) {
    let cumul = 0;
    for (let m = 0; m < 12; m++) {
      const mu = (monthlyEnc[m] || 0) - (monthlyDec[m] || 0);
      const sigma = ((monthlyEnc[m] || 0) + (monthlyDec[m] || 0)) * 0.08;
      const z = boxMuller();
      cumul += mu + sigma * z;
    }
    results.push(cumul);
  }

  results.sort((a, b) => a - b);

  const percentile = (p: number) => results[Math.floor(p / 100 * results.length)] || 0;
  const mean = results.reduce((s, v) => s + v, 0) / results.length;
  const positiveCount = results.filter(v => v > 0).length;

  return {
    nbSimulations,
    p5: percentile(5),
    p25: percentile(25),
    p50: percentile(50),
    p75: percentile(75),
    p95: percentile(95),
    mean,
    probPositif: (positiveCount / results.length) * 100,
  };
}

// ══════════════════════════════════════════════════════════════
// 6. Isolation Forest — Détection d'Anomalies (50 arbres)
// ══════════════════════════════════════════════════════════════

function isolationForestScores(values: number[]): number[] {
  const n = values.length;
  if (n < 3) return values.map(() => 0.5);

  const nTrees = 50;
  const subSampleSize = Math.min(n, 16);

  // c(n) normalization factor
  const harmonic = (k: number) => 2 * (Math.log(k - 1) + 0.5772156649) - (2 * (k - 1)) / k;
  const cn = n > 2 ? harmonic(subSampleSize) : 1;

  const avgPathLengths = values.map(() => 0);

  for (let t = 0; t < nTrees; t++) {
    // Subsample indices
    const indices: number[] = [];
    const available = [...Array(n).keys()];
    for (let i = 0; i < subSampleSize && available.length > 0; i++) {
      const pick = Math.floor(Math.random() * available.length);
      indices.push(available[pick]);
      available.splice(pick, 1);
    }
    const subset = indices.map(i => values[i]);
    const subMin = Math.min(...subset);
    const subMax = Math.max(...subset);

    // For each point, compute isolation path length
    for (let pi = 0; pi < n; pi++) {
      const val = values[pi];
      let depth = 0;
      let lo = subMin;
      let hi = subMax;
      let remaining = subSampleSize;

      while (remaining > 1 && lo < hi) {
        const split = lo + Math.random() * (hi - lo);
        depth++;
        if (val < split) {
          hi = split;
          remaining = Math.ceil(remaining / 2);
        } else {
          lo = split;
          remaining = Math.floor(remaining / 2);
        }
        if (depth > 20) break; // Safety limit
      }

      avgPathLengths[pi] += depth;
    }
  }

  // Compute scores
  return avgPathLengths.map(totalPath => {
    const avgPath = totalPath / nTrees;
    return Math.pow(2, -(avgPath / cn));
  });
}

export function runIsolationForest(
  monthlyFluxNet: number[],
  monthNames: string[]
): IsolationForestResult[] {
  const scores = isolationForestScores(monthlyFluxNet);

  return scores.map((score, i) => ({
    mois: monthNames[i] || `M${i + 1}`,
    monthIndex: i,
    score: Math.round(score * 100) / 100,
    severite: score > 0.70 ? "Critique" as const : score > 0.55 ? "Modérée" as const : "Normal" as const,
    fluxNet: monthlyFluxNet[i],
  }));
}

// ══════════════════════════════════════════════════════════════
// 7. K-Means Clustering — Segmentation des Entités
// ══════════════════════════════════════════════════════════════

interface EntityFeatures {
  id: string;
  nom: string;
  features: [number, number, number]; // enc, dec, bfr in M FCFA
}

export function runKMeans(
  entities: EntityFeatures[],
  maxK = 3
): KMeansCluster[] {
  if (entities.length === 0) return [];

  const k = Math.min(maxK, entities.length);
  const labels = ["A", "B", "C", "D"];

  // Initialize centroids with first k points
  let centroids = entities.slice(0, k).map(e => [...e.features] as [number, number, number]);

  let assignments: number[] = Array(entities.length).fill(0);

  for (let iter = 0; iter < 100; iter++) {
    // Assignment step
    const newAssignments = entities.map(e => {
      let minDist = Infinity;
      let best = 0;
      for (let c = 0; c < k; c++) {
        const dist = Math.sqrt(
          (e.features[0] - centroids[c][0]) ** 2 +
          (e.features[1] - centroids[c][1]) ** 2 +
          (e.features[2] - centroids[c][2]) ** 2
        );
        if (dist < minDist) { minDist = dist; best = c; }
      }
      return best;
    });

    // Check convergence
    if (newAssignments.every((a, i) => a === assignments[i])) break;
    assignments = newAssignments;

    // Update step
    for (let c = 0; c < k; c++) {
      const members = entities.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        centroids[c] = [
          members.reduce((s, m) => s + m.features[0], 0) / members.length,
          members.reduce((s, m) => s + m.features[1], 0) / members.length,
          members.reduce((s, m) => s + m.features[2], 0) / members.length,
        ];
      }
    }
  }

  return entities.map((e, i) => ({
    id: e.id,
    nom: e.nom,
    cluster: labels[assignments[i]] || "A",
    clusterLabel: String.fromCharCode(65 + assignments[i]),
    profil: [
      Math.round(e.features[0]),
      Math.round(e.features[1]),
      Math.round(e.features[2]),
    ] as [number, number, number],
  }));
}

// ══════════════════════════════════════════════════════════════
// 8. Régression Logistique — Scoring de Risque
// ══════════════════════════════════════════════════════════════

interface EntityRiskInput {
  id: string;
  nom: string;
  soldeFinal: number;
  decAnnuel: number;
  dso: number;
  bfrNet: number;
  nbEntites: number;
}

export function runRiskScoring(entities: EntityRiskInput[]): RiskScore[] {
  // Weights calibrated on synthetic African real estate data
  const w = [-0.08, 0.05, 0.12, 0.09, 0.15];
  const b = -1.20;

  return entities.map(e => {
    // Feature engineering
    const dailyDec = e.decAnnuel / 365 || 1;
    const liquidite = (e.soldeFinal / dailyDec) / 30; // normalized by 30 days
    const dsoEcart = (e.dso - 45) / 15; // deviation from 45-day benchmark
    const levier = (e.bfrNet / (e.decAnnuel || 1)) * 10 / 3;
    const concentration = 1 / (e.nbEntites || 1);
    const volatilite = 0.15; // calibrated hypothesis

    const features = [liquidite, dsoEcart, levier, concentration, volatilite];
    const z = b + features.reduce((s, f, i) => s + w[i] * f, 0);
    const prob = sigmoid(z) * 100;

    let niveau: RiskScore["niveau"];
    let couleur: RiskScore["couleur"];
    if (prob < 20) { niveau = "Faible"; couleur = "emerald"; }
    else if (prob < 50) { niveau = "Modéré"; couleur = "amber"; }
    else if (prob < 75) { niveau = "Élevé"; couleur = "orange"; }
    else { niveau = "Critique"; couleur = "red"; }

    return {
      entite: e.id,
      nom: e.nom,
      probabiliteRisque: Math.round(prob * 10) / 10,
      niveau,
      couleur,
    };
  }).sort((a, b) => b.probabiliteRisque - a.probabiliteRisque);
}

// ══════════════════════════════════════════════════════════════
// MAIN: Run full ML engine
// ══════════════════════════════════════════════════════════════

interface MLInput {
  /** Monthly consolidated enc/dec arrays (12 values) */
  monthlyEnc: number[];
  monthlyDec: number[];
  monthNames: string[];
  /** Per-line flow data for individual predictions */
  lineData: Array<{
    label: string;
    type: string;
    cat: string;
    amounts: number[];
  }>;
  /** Entity data for clustering and risk scoring */
  entities: Array<{
    id: string;
    nom: string;
    encAnnuel: number;
    decAnnuel: number;
    bfrNet: number;
    dso: number;
    soldeFinal: number;
  }>;
}

export function runFullMLEngine(input: MLInput): MLResults {
  const { monthlyEnc, monthlyDec, monthNames, lineData, entities } = input;

  // Consolidated flux net series
  const fluxNet = monthlyEnc.map((enc, i) => enc - (monthlyDec[i] || 0));
  const cumSeries = fluxNet.reduce<number[]>((acc, v) => {
    acc.push((acc[acc.length - 1] || 0) + v);
    return acc;
  }, []);

  // 1-4. Forecasting: ARIMA → SARIMA → LSTM → Ensemble (3 months)
  const horizon = 3;
  const arimaResult = arimaPredict(cumSeries, horizon);
  const sarimaResult = sarimaPredict(cumSeries, horizon);
  const lstmResult = lstmPredict(cumSeries, horizon);
  const ensembleResult = ensemblePredict(arimaResult, sarimaResult, lstmResult);

  // Per-line predictions
  const lineResults: MLLineResult[] = lineData.map(line => {
    const vals = line.amounts.filter(v => v > 0);
    if (vals.length < 4) {
      const last = vals[vals.length - 1] || 0;
      return {
        label: line.label || line.type,
        type: line.type,
        ensemble_M1: last, ensemble_M2: last, ensemble_M3: last,
        arima_M1: last, sarima_M1: last, lstm_M1: last,
        anomalies_zscore: [],
        iso_forest_max: 0.5,
      };
    }

    const la = arimaPredict(line.amounts, horizon);
    const ls = sarimaPredict(line.amounts, horizon);
    const ll = lstmPredict(line.amounts, horizon);
    const le = ensemblePredict(la, ls, ll);

    // Z-score anomalies for this line
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    const anomalies: string[] = [];
    if (std > 0) {
      line.amounts.forEach((v, i) => {
        if (v > 0) {
          const z = Math.abs((v - mean) / std);
          if (z > 2) anomalies.push(`${monthNames[i]} Z=${z.toFixed(1)}`);
        }
      });
    }

    // Isolation Forest max score for this line
    const lineIF = isolationForestScores(line.amounts.filter(v => v > 0));
    const ifMax = lineIF.length > 0 ? Math.max(...lineIF) : 0.5;

    return {
      label: line.label || line.type,
      type: line.type,
      ensemble_M1: le[0], ensemble_M2: le[1], ensemble_M3: le[2],
      arima_M1: la[0], sarima_M1: ls[0], lstm_M1: ll[0],
      anomalies_zscore: anomalies,
      iso_forest_max: Math.round(ifMax * 100) / 100,
    };
  });

  // 5. Monte Carlo
  const monteCarlo = runMonteCarlo(monthlyEnc, monthlyDec);

  // 6. Isolation Forest on consolidated monthly flux
  const isolationForest = runIsolationForest(fluxNet, monthNames);

  // 7. K-Means Clustering
  const kmeanInput: EntityFeatures[] = entities.map(e => ({
    id: e.id,
    nom: e.nom,
    features: [
      Math.round(e.encAnnuel / 1000000),
      Math.round(e.decAnnuel / 1000000),
      Math.round(e.bfrNet / 1000000),
    ],
  }));
  const clusters = runKMeans(kmeanInput);

  // 8. Risk Scoring
  const riskScores = runRiskScoring(entities.map(e => ({
    id: e.id,
    nom: e.nom,
    soldeFinal: e.soldeFinal,
    decAnnuel: e.decAnnuel,
    dso: e.dso,
    bfrNet: e.bfrNet,
    nbEntites: entities.length,
  })));

  return {
    predictions: {
      arima: arimaResult,
      sarima: sarimaResult,
      lstm: lstmResult,
      ensemble: ensembleResult,
    },
    lineResults,
    monteCarlo,
    isolationForest,
    clusters,
    riskScores,
    timestamp: Date.now(),
  };
}
