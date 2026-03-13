import { describe, it, expect } from "vitest";
import { predictNext3Months, computeAnomaly, holtWinters, computeBacktestMetrics, predictSeries } from "../predictions";

describe("predictNext3Months()", () => {
  it("returns [0,0,0] for all-zero data", () => {
    expect(predictNext3Months(["0", "0", "0"])).toEqual([0, 0, 0]);
  });

  it("returns [0,0,0] for empty strings", () => {
    expect(predictNext3Months(["", "", ""])).toEqual([0, 0, 0]);
  });

  it("repeats single non-zero value", () => {
    expect(predictNext3Months(["0", "1000", "0"])).toEqual([1000, 1000, 1000]);
  });

  it("returns weighted MA for 2 data points", () => {
    const result = predictNext3Months(["0", "100", "200"]);
    const expected = (100 + 200 * 2) / 3;
    expect(result[0]).toBeCloseTo(expected, 0);
  });

  it("returns positive values for 3+ data points", () => {
    const result = predictNext3Months(["100", "200", "300", "400"]);
    result.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
  });

  it("handles sparse data with zeros", () => {
    const result = predictNext3Months(["0", "0", "0", "100", "0", "200"]);
    result.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
  });
});

describe("computeAnomaly()", () => {
  it("returns empty for fewer than 3 values", () => {
    expect(computeAnomaly(["100", "200"])).toEqual([]);
  });

  it("returns empty for uniform data", () => {
    expect(computeAnomaly(["100", "100", "100", "100"])).toEqual([]);
  });

  it("detects outlier with Z > 2", () => {
    const data = ["100", "105", "98", "102", "99", "500"];
    const anomalies = computeAnomaly(data);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].val).toBe(500);
  });

  it("ignores zeros", () => {
    const data = ["0", "100", "100", "100"];
    const anomalies = computeAnomaly(data);
    expect(anomalies).toEqual([]);
  });
});

describe("holtWinters()", () => {
  it("returns empty for data shorter than 2 seasons", () => {
    const data = Array(20).fill(100);
    expect(holtWinters(data)).toEqual([]);
  });

  it("forecasts 12 periods for sufficient data", () => {
    // 24 months of data with slight upward trend
    const data = Array.from({ length: 24 }, (_, i) => 100 + i * 5 + Math.sin(i) * 10);
    const result = holtWinters(data, 12);
    expect(result.length).toBe(12);
    result.forEach(v => expect(v).toBeGreaterThan(0));
  });

  it("captures seasonal pattern", () => {
    // Strong seasonal pattern: summer high, winter low
    const data: number[] = [];
    for (let y = 0; y < 3; y++) {
      for (let m = 0; m < 12; m++) {
        data.push(100 + 50 * Math.sin((m / 12) * 2 * Math.PI));
      }
    }
    const result = holtWinters(data, 12);
    expect(result.length).toBe(12);
    // Should show variation (not flat)
    const range = Math.max(...result) - Math.min(...result);
    expect(range).toBeGreaterThan(10);
  });
});

describe("predictSeries() — algorithm selection", () => {
  it("returns 12 zeros for empty data", () => {
    expect(predictSeries([])).toEqual(Array(12).fill(0));
  });

  it("repeats single value for 1 data point", () => {
    const result = predictSeries([500]);
    expect(result).toEqual(Array(12).fill(500));
  });

  it("uses linear regression for 3-5 months", () => {
    const result = predictSeries([100, 200, 300, 400, 500]);
    expect(result.length).toBe(12);
    // Should show upward trend
    expect(result[0]).toBeGreaterThan(400);
  });

  it("uses weighted regression for 6-11 months", () => {
    const data = Array.from({ length: 8 }, (_, i) => 100 + i * 20);
    const result = predictSeries(data);
    expect(result.length).toBe(12);
    expect(result[0]).toBeGreaterThan(data[data.length - 1]);
  });

  it("uses Holt for 12-23 months", () => {
    const data = Array.from({ length: 15 }, (_, i) => 1000 + i * 50);
    const result = predictSeries(data);
    expect(result.length).toBe(12);
    result.forEach(v => expect(v).toBeGreaterThan(0));
  });

  it("uses Holt-Winters for 24+ months", () => {
    const data = Array.from({ length: 24 }, (_, i) => 1000 + i * 10);
    const result = predictSeries(data);
    expect(result.length).toBe(12);
    result.forEach(v => expect(v).toBeGreaterThan(0));
  });

  it("custom period count", () => {
    const result = predictSeries([100, 200, 300], 6);
    expect(result.length).toBe(6);
  });
});

describe("computeBacktestMetrics()", () => {
  it("returns zeros for no matching pairs", () => {
    const result = computeBacktestMetrics([], []);
    expect(result).toEqual({ mape: 0, mae: 0, rmse: 0, trackingSignal: 0 });
  });

  it("returns 0 MAPE for perfect predictions", () => {
    const actual = [100, 200, 300];
    const result = computeBacktestMetrics(actual, actual);
    expect(result.mape).toBe(0);
    expect(result.mae).toBe(0);
    expect(result.rmse).toBe(0);
  });

  it("computes correct MAPE", () => {
    const predicted = [110, 190, 310];
    const actual = [100, 200, 300];
    const result = computeBacktestMetrics(predicted, actual);
    // MAPE = mean(|100-110|/100, |200-190|/200, |300-310|/300) * 100
    const expectedMape = ((10 / 100 + 10 / 200 + 10 / 300) / 3) * 100;
    expect(result.mape).toBeCloseTo(expectedMape, 1);
  });

  it("tracking signal within ±4 means no bias", () => {
    const predicted = [105, 195, 305];
    const actual = [100, 200, 300];
    const result = computeBacktestMetrics(predicted, actual);
    expect(Math.abs(result.trackingSignal)).toBeLessThan(4);
  });

  it("skips zero values in actual and predicted", () => {
    const predicted = [100, 0, 300];
    const actual = [100, 200, 0];
    const result = computeBacktestMetrics(predicted, actual);
    // Only first pair is valid (both > 0)
    expect(result.mape).toBe(0); // 100 vs 100 = 0% error
  });
});
