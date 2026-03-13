import { p } from "./helpers";

/**
 * Fallback for sparse data (Audit C5 / CDC F1.3)
 * - 0 values → [0,0,0]
 * - 1 value  → repeat last known value
 * - 2 values → moving average
 * - 3+ values → linear regression + seasonal adjustment
 */
export function predictNext3Months(amounts: string[]): number[] {
  const vals = amounts.map(p);
  const nonZero = vals.filter(v => v > 0);

  // Fallback: no data
  if (nonZero.length === 0) return [0, 0, 0];

  // Fallback: single data point → repeat
  if (nonZero.length === 1) return [nonZero[0], nonZero[0], nonZero[0]];

  // Fallback: 2 data points → weighted moving average (recent × 2)
  if (nonZero.length === 2) {
    const ma = (nonZero[0] + nonZero[1] * 2) / 3;
    return [ma, ma, ma];
  }

  // Standard: Linear regression + seasonal factors
  const n = vals.length;
  const sumX = vals.reduce((_, __, i) => _ + i, 0);
  const sumY = vals.reduce((a, v) => a + v, 0);
  const sumXY = vals.reduce((a, v, i) => a + i * v, 0);
  const sumX2 = vals.reduce((a, _, i) => a + i * i, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Seasonal factors by quarter
  const grandAvg = sumY / n || 1;
  const seasonal = [0, 1, 2].map(q => {
    const qVals = vals.filter((_, i) => i % 3 === q && vals[i] > 0);
    return qVals.length ? qVals.reduce((a, v) => a + v, 0) / qVals.length / grandAvg : 1;
  });

  return [0, 1, 2].map(i => {
    const base = intercept + slope * (n + i);
    const sf = seasonal[i % 3] || 1;
    return Math.max(0, base * sf);
  });
}

export function computeAnomaly(amounts: string[]): { mi: number; val: number; z: string }[] {
  const vals = amounts.map(p).filter(v => v > 0);
  if (vals.length < 3) return [];
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
  if (std === 0) return []; // Zero variance → no anomaly possible
  return amounts
    .map((v, i) => {
      const val = p(v);
      if (val === 0) return null;
      const z = Math.abs((val - mean) / std);
      return z > 2 ? { mi: i, val, z: z.toFixed(1) } : null;
    })
    .filter(Boolean) as { mi: number; val: number; z: string }[];
}

/**
 * Holt-Winters Triple Exponential Smoothing (CDC F8)
 * Used when ≥ 24 months of history are available
 */
export function holtWinters(
  data: number[],
  forecastPeriods = 12,
  alpha = 0.3,
  beta = 0.1,
  gamma = 0.4,
  season = 12
): number[] {
  if (data.length < season * 2) return [];

  // Initialize level = average of first season
  let level = data.slice(0, season).reduce((s, v) => s + v, 0) / season;

  // Initialize trend
  const firstSeasonAvg = data.slice(0, season).reduce((s, v) => s + v, 0) / season;
  const secondSeasonAvg = data.slice(season, season * 2).reduce((s, v) => s + v, 0) / season;
  let trend = (secondSeasonAvg - firstSeasonAvg) / season;

  // Initialize seasonal indices
  const seasonals = data.slice(0, season).map(v => level > 0 ? v / level : 1);

  // Run through historical data to refine
  for (let i = season; i < data.length; i++) {
    const val = data[i];
    const prevSeasonal = seasonals[i % season];
    const newLevel = alpha * (val / (prevSeasonal || 1)) + (1 - alpha) * (level + trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
    seasonals[i % season] = gamma * (val / (newLevel || 1)) + (1 - gamma) * prevSeasonal;
    level = newLevel;
    trend = newTrend;
  }

  // Forecast
  const result: number[] = [];
  for (let i = 1; i <= forecastPeriods; i++) {
    const s = seasonals[(data.length + i - 1) % season] || 1;
    result.push(Math.max(0, (level + trend * i) * s));
  }
  return result;
}

/**
 * Predict a full 12-month series from numeric history (CDC F1.3).
 * Selects algorithm based on available history depth:
 *   ≥ 24 months → Holt-Winters (triple exponential smoothing)
 *   12–23 months → Holt (double exponential smoothing)
 *    6–11 months → Weighted linear regression (recent months × 2)
 *    3–5  months → Simple linear regression
 *    < 3  months → Moving average / fallback
 */
export function predictSeries(data: number[], periods = 12): number[] {
  const nonZero = data.filter(v => v !== 0);

  // Fallback: no data
  if (nonZero.length === 0) return Array(periods).fill(0);

  // Fallback: single value → repeat
  if (nonZero.length === 1) return Array(periods).fill(nonZero[0]);

  // Fallback: 2 values → weighted moving average
  if (nonZero.length === 2) {
    const ma = (nonZero[0] + nonZero[1] * 2) / 3;
    return Array(periods).fill(ma);
  }

  // ≥ 24 months → Holt-Winters
  if (data.length >= 24) {
    const hw = holtWinters(data, periods);
    if (hw.length === periods) return hw;
  }

  // 12–23 months → Holt (double exponential smoothing)
  if (data.length >= 12) {
    return holtDouble(data, periods);
  }

  // 6–11 months → Weighted linear regression
  if (data.length >= 6) {
    return weightedLinearRegression(data, periods);
  }

  // 3–5 months → Simple linear regression
  return simpleLinearRegression(data, periods);
}

/** Holt double exponential smoothing (trend, no seasonality) */
function holtDouble(data: number[], periods: number, alpha = 0.3, beta = 0.1): number[] {
  let level = data[0];
  let trend = data.length > 1 ? data[1] - data[0] : 0;

  for (let i = 1; i < data.length; i++) {
    const newLevel = alpha * data[i] + (1 - alpha) * (level + trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
    level = newLevel;
    trend = newTrend;
  }

  return Array.from({ length: periods }, (_, i) =>
    Math.max(0, level + trend * (i + 1))
  );
}

/** Weighted linear regression — recent months weighted ×2 */
function weightedLinearRegression(data: number[], periods: number): number[] {
  const n = data.length;
  const halfPoint = Math.floor(n / 2);
  let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0;

  for (let i = 0; i < n; i++) {
    const w = i >= halfPoint ? 2 : 1;
    sumW += w;
    sumWX += w * i;
    sumWY += w * data[i];
    sumWXY += w * i * data[i];
    sumWX2 += w * i * i;
  }

  const denom = sumW * sumWX2 - sumWX * sumWX;
  const slope = denom !== 0 ? (sumW * sumWXY - sumWX * sumWY) / denom : 0;
  const intercept = (sumWY - slope * sumWX) / sumW;

  return Array.from({ length: periods }, (_, i) =>
    Math.max(0, intercept + slope * (n + i))
  );
}

/** Simple linear regression */
function simpleLinearRegression(data: number[], periods: number): number[] {
  const n = data.length;
  const sumX = data.reduce((_, __, i) => _ + i, 0);
  const sumY = data.reduce((a, v) => a + v, 0);
  const sumXY = data.reduce((a, v, i) => a + i * v, 0);
  const sumX2 = data.reduce((a, _, i) => a + i * i, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  return Array.from({ length: periods }, (_, i) =>
    Math.max(0, intercept + slope * (n + i))
  );
}

/**
 * Backtesting metrics (CDC F7)
 */
export function computeBacktestMetrics(
  predicted: number[],
  actual: number[]
): { mape: number; mae: number; rmse: number; trackingSignal: number } {
  const pairs = predicted
    .map((pred, i) => ({ pred, act: actual[i] }))
    .filter(p => p.act > 0 && p.pred > 0);

  if (pairs.length === 0) return { mape: 0, mae: 0, rmse: 0, trackingSignal: 0 };

  const n = pairs.length;
  const mape = pairs.reduce((s, p) => s + Math.abs(p.act - p.pred) / p.act, 0) / n * 100;
  const mae = pairs.reduce((s, p) => s + Math.abs(p.act - p.pred), 0) / n;
  const rmse = Math.sqrt(pairs.reduce((s, p) => s + (p.act - p.pred) ** 2, 0) / n);
  const sumErrors = pairs.reduce((s, p) => s + (p.act - p.pred), 0);
  const trackingSignal = mae > 0 ? sumErrors / mae : 0;

  return { mape, mae, rmse, trackingSignal };
}
