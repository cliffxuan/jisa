// Pure return-series maths. No React in here.

import type { HistoryPayload } from "../useHistory";

export interface Aligned {
  /** Product ids, in the order of the columns of `returns`. */
  ids: string[];
  /** Months for each return row — returns[t] covers months[t] (vs the prior
   * shared month). */
  months: string[];
  /** returns[t][i] = simple monthly return of product i in month t. */
  returns: number[][];
}

/** Align products on the intersection of their available months and compute
 * monthly returns. Products missing from the payload are silently dropped —
 * check `ids` to see what survived. Returns null if fewer than 2 shared
 * months exist. */
export function alignSeries(payload: HistoryPayload, ids: string[]): Aligned | null {
  const present = ids.filter((id) => payload.series[id]?.months.length);
  if (present.length === 0) return null;

  const monthSets = present.map((id) => new Set(payload.series[id].months));
  let months = [...monthSets[0]];
  for (let i = 1; i < monthSets.length; i++) {
    months = months.filter((m) => monthSets[i].has(m));
  }
  months.sort();
  if (months.length < 2) return null;

  const closesByMonth = present.map((id) => {
    const s = payload.series[id];
    const map = new Map<string, number>();
    s.months.forEach((m, i) => map.set(m, s.closes[i]));
    return map;
  });

  const retMonths: string[] = [];
  const returns: number[][] = [];
  for (let t = 1; t < months.length; t++) {
    retMonths.push(months[t]);
    returns.push(
      closesByMonth.map((map) => map.get(months[t])! / map.get(months[t - 1])! - 1),
    );
  }
  return { ids: present, months: retMonths, returns };
}

/** Normalize a weight record over the given ids (0 if all-zero). */
export function normalizeWeights(weights: Record<string, number>, ids: string[]): number[] {
  const raw = ids.map((id) => Math.max(0, weights[id] ?? 0));
  const total = raw.reduce((a, b) => a + b, 0);
  return total > 0 ? raw.map((w) => w / total) : raw;
}

/** Portfolio monthly returns = Σ wᵢ·rᵢ (monthly rebalanced). */
export function portfolioReturns(aligned: Aligned, weights: Record<string, number>): number[] {
  const w = normalizeWeights(weights, aligned.ids);
  return aligned.returns.map((row) => row.reduce((acc, r, i) => acc + r * w[i], 0));
}

export interface SeriesStats {
  cagr: number;
  vol: number;
  maxDrawdown: number;
  months: number;
}

export function annualizedStats(rets: number[]): SeriesStats | null {
  const n = rets.length;
  if (n < 2) return null;
  let index = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let sum = 0;
  for (const r of rets) {
    index *= 1 + r;
    peak = Math.max(peak, index);
    maxDrawdown = Math.min(maxDrawdown, index / peak - 1);
    sum += r;
  }
  const mean = sum / n;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (n - 1);
  return {
    cagr: Math.pow(index, 12 / n) - 1,
    vol: Math.sqrt(variance) * Math.sqrt(12),
    maxDrawdown,
    months: n,
  };
}
