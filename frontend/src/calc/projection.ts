// Deterministic "expected path" projection with a ±1σ band.

import { futureMonths, makeCapTracker, taxYearOfMonth } from "./jisa";

export interface ContribSchedule {
  /** Regular contribution every month, £. */
  monthly: number;
  /** One-off gift each year, £ (think birthday money). */
  annualGift: number;
  /** Calendar month the gift lands, 1–12. */
  giftMonth: number;
}

export interface ProjectionPoint {
  month: string;
  low: number;
  mid: number;
  high: number;
  paidIn: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  clampedYears: number[];
}

/** Iterate Bₜ = Bₜ₋₁(1+r) + contribₜ for three annual-rate scenarios
 * (μ−σ, μ, μ+σ). Contributions are clamped to the JISA cap per tax year
 * (the schedule is rate-independent, so one cap tracker serves all three
 * scenarios). */
export function project(opts: {
  start: number;
  from: Date;
  months: number;
  annualReturn: number;
  annualVol: number;
  schedule: ContribSchedule;
  /** Already contributed in the current tax year (from the child's log). */
  usedThisTaxYear?: number;
}): ProjectionResult {
  const { start, from, months, annualReturn, annualVol, schedule } = opts;
  const monthly = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;
  const rates = [
    monthly(annualReturn - annualVol),
    monthly(annualReturn),
    monthly(annualReturn + annualVol),
  ];

  const labels = futureMonths(from, months);
  const cap = makeCapTracker();
  if (opts.usedThisTaxYear) {
    const nowMonth = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
    cap.add(taxYearOfMonth(nowMonth), opts.usedThisTaxYear);
  }

  const balances = [start, start, start];
  let paidIn = start;
  const points: ProjectionPoint[] = [];
  for (const month of labels) {
    const mNum = Number(month.split("-")[1]);
    const wanted = schedule.monthly + (mNum === schedule.giftMonth ? schedule.annualGift : 0);
    const contrib = wanted > 0 ? cap.add(taxYearOfMonth(month), wanted) : 0;
    for (let s = 0; s < 3; s++) {
      balances[s] = balances[s] * (1 + rates[s]) + contrib;
    }
    paidIn += contrib;
    points.push({
      month,
      low: balances[0],
      mid: balances[1],
      high: balances[2],
      paidIn,
    });
  }
  return { points, clampedYears: cap.clamped() };
}
