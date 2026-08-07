// Historical replay: "what if you'd actually done this N years ago?"

import type { Aligned } from "./returns";
import { portfolioReturns } from "./returns";
import type { ContribSchedule } from "./projection";
import { makeCapTracker, taxYearOfMonth } from "./jisa";

export interface DatedContribution {
  date: string; // "YYYY-MM-DD"
  amount: number;
}

export interface BacktestPoint {
  month: string;
  value: number;
  paidIn: number;
  /** Growth of £1 with no contributions — drawdowns are computed on this so
   * fresh money can't mask a crash. */
  unit: number;
}

export interface RollingWindow {
  from: string;
  to: string;
  ret: number;
}

export interface BacktestResult {
  points: BacktestPoint[];
  finalValue: number;
  totalPaidIn: number;
  maxDrawdown: number;
  /** Peak-to-trough window of the worst drawdown. */
  drawdownWindow: RollingWindow | null;
  best12: RollingWindow | null;
  worst12: RollingWindow | null;
  clampedYears: number[];
}

/** Replay real months. Contributions land at the start of each month (so they
 * ride that month's return), from either a fixed schedule or a log of dated
 * contributions. */
export function backtest(opts: {
  aligned: Aligned;
  weights: Record<string, number>;
  /** First month to simulate, "YYYY-MM" (must exist in aligned.months). */
  startMonth: string;
  lump: number;
  schedule?: ContribSchedule;
  contributions?: DatedContribution[];
  applyCap?: boolean;
}): BacktestResult | null {
  const { aligned, weights, startMonth, lump } = opts;
  const rets = portfolioReturns(aligned, weights);
  const startIdx = aligned.months.findIndex((m) => m >= startMonth);
  if (startIdx === -1 || aligned.months.length - startIdx < 2) return null;

  const byMonth = new Map<string, number>();
  for (const c of opts.contributions ?? []) {
    const month = c.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + c.amount);
  }

  const cap = makeCapTracker();
  const applyCap = opts.applyCap ?? true;
  let value = 0;
  let paidIn = 0;
  let unit = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let ddPeakMonth = aligned.months[startIdx];
  let curPeakMonth = aligned.months[startIdx];
  let ddTroughMonth = aligned.months[startIdx];
  const points: BacktestPoint[] = [];

  const addContrib = (month: string, wanted: number): number => {
    if (wanted <= 0) return 0;
    return applyCap ? cap.add(taxYearOfMonth(month), wanted) : wanted;
  };

  for (let t = startIdx; t < aligned.months.length; t++) {
    const month = aligned.months[t];
    let contrib = 0;
    if (t === startIdx) contrib += addContrib(month, lump);
    if (opts.schedule) {
      const mNum = Number(month.split("-")[1]);
      contrib += addContrib(
        month,
        opts.schedule.monthly +
          (mNum === opts.schedule.giftMonth ? opts.schedule.annualGift : 0),
      );
    }
    contrib += addContrib(month, byMonth.get(month) ?? 0);

    const r = rets[t];
    value = (value + contrib) * (1 + r);
    paidIn += contrib;
    unit *= 1 + r;
    if (unit > peak) {
      peak = unit;
      curPeakMonth = month;
    }
    const dd = unit / peak - 1;
    if (dd < maxDrawdown) {
      maxDrawdown = dd;
      ddTroughMonth = month;
      ddPeakMonth = curPeakMonth;
    }
    points.push({ month, value, paidIn, unit });
  }

  // Best/worst rolling 12 months on the unit index.
  let best12: RollingWindow | null = null;
  let worst12: RollingWindow | null = null;
  for (let i = 12; i < points.length; i++) {
    const ret = points[i].unit / points[i - 12].unit - 1;
    const win = { from: points[i - 12].month, to: points[i].month, ret };
    if (!best12 || ret > best12.ret) best12 = win;
    if (!worst12 || ret < worst12.ret) worst12 = win;
  }

  return {
    points,
    finalValue: value,
    totalPaidIn: paidIn,
    maxDrawdown,
    drawdownWindow:
      maxDrawdown < 0 ? { from: ddPeakMonth, to: ddTroughMonth, ret: maxDrawdown } : null,
    best12,
    worst12,
    clampedYears: cap.clamped(),
  };
}
