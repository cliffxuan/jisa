// Monte Carlo by joint bootstrap: replay randomly-shuffled real months.
// Sampling the *portfolio's* historical monthly returns keeps every
// cross-asset correlation intact — a sampled month moves all holdings
// together, exactly as it did in history.

import type { ContribSchedule } from "./projection";
import { futureMonths, makeCapTracker, taxYearOfMonth } from "./jisa";

/** Deterministic small PRNG so a given seed always draws the same futures. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FanPoint {
  month: string;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  paidIn: number;
}

export interface MonteCarloResult {
  fan: FanPoint[];
  /** Probability the final balance is below the total paid in. */
  pLoss: number;
  paths: number;
  poolMonths: number;
}

export const MIN_POOL_MONTHS = 36;

export function monteCarlo(opts: {
  start: number;
  from: Date;
  months: number;
  /** Historical portfolio monthly returns to bootstrap from. */
  pool: number[];
  schedule: ContribSchedule;
  usedThisTaxYear?: number;
  paths?: number;
  seed?: number;
}): MonteCarloResult | null {
  const { start, from, months, pool, schedule } = opts;
  if (pool.length < MIN_POOL_MONTHS) return null;
  const paths = opts.paths ?? 1000;
  const rand = mulberry32(opts.seed ?? 42);

  const labels = futureMonths(from, months);

  // Contributions are path-independent: precompute the capped schedule once.
  const cap = makeCapTracker();
  if (opts.usedThisTaxYear) {
    const nowMonth = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
    cap.add(taxYearOfMonth(nowMonth), opts.usedThisTaxYear);
  }
  const contribs = labels.map((month) => {
    const mNum = Number(month.split("-")[1]);
    const wanted = schedule.monthly + (mNum === schedule.giftMonth ? schedule.annualGift : 0);
    return wanted > 0 ? cap.add(taxYearOfMonth(month), wanted) : 0;
  });

  const balances = new Float64Array(paths).fill(start);
  let paidIn = start;
  const fan: FanPoint[] = [];
  const scratch = new Float64Array(paths);

  const pct = (sorted: Float64Array, q: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

  for (let t = 0; t < labels.length; t++) {
    const contrib = contribs[t];
    for (let p = 0; p < paths; p++) {
      const r = pool[Math.floor(rand() * pool.length)];
      balances[p] = balances[p] * (1 + r) + contrib;
    }
    paidIn += contrib;
    scratch.set(balances);
    scratch.sort();
    fan.push({
      month: labels[t],
      p5: pct(scratch, 0.05),
      p25: pct(scratch, 0.25),
      p50: pct(scratch, 0.5),
      p75: pct(scratch, 0.75),
      p95: pct(scratch, 0.95),
      paidIn,
    });
  }

  let losers = 0;
  for (let p = 0; p < paths; p++) if (balances[p] < paidIn) losers += 1;

  return { fan, pLoss: losers / paths, paths, poolMonths: pool.length };
}
