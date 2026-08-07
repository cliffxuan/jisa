// UK tax-year plumbing for the £9,000/year JISA contribution limit.
// The tax year runs 6 April – 5 April.

import { JISA_LIMIT } from "../data";

/** Tax year a full date belongs to, as its starting calendar year. */
export function taxYearOfDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return m > 4 || (m === 4 && d >= 6) ? y : y - 1;
}

/** Tax year a "YYYY-MM" month belongs to (April counts as the new year —
 * a days-level approximation acceptable for monthly simulations). */
export function taxYearOfMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return m >= 4 ? y : y - 1;
}

export function taxYearLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** Whole years old at a given date. */
export function ageAt(dob: string, at: Date = new Date()): number {
  const [y, m, d] = dob.split("-").map(Number);
  let age = at.getFullYear() - y;
  if (at.getMonth() + 1 < m || (at.getMonth() + 1 === m && at.getDate() < d)) age -= 1;
  return age;
}

/** "YYYY-MM" of the month someone turns a given age. */
export function monthTurning(dob: string, age: number): string {
  const [y, m] = dob.split("-").map(Number);
  return `${y + age}-${String(m).padStart(2, "0")}`;
}

/** Tracks per-tax-year contributions and clamps anything over the JISA cap.
 * Feed it contributions in chronological order. */
export function makeCapTracker(limit: number = JISA_LIMIT) {
  const byYear = new Map<number, number>();
  const clampedYears = new Set<number>();
  return {
    /** Returns the amount actually allowed in (0..amount). */
    add(taxYear: number, amount: number): number {
      const used = byYear.get(taxYear) ?? 0;
      const allowed = Math.max(0, Math.min(amount, limit - used));
      byYear.set(taxYear, used + allowed);
      if (allowed < amount) clampedYears.add(taxYear);
      return allowed;
    },
    used(taxYear: number): number {
      return byYear.get(taxYear) ?? 0;
    },
    clamped(): number[] {
      return [...clampedYears].sort((a, b) => a - b);
    },
  };
}

/** Sequence of "YYYY-MM" strings, `count` months long, starting the month
 * after `from`. */
export function futureMonths(from: Date, count: number): string[] {
  const out: string[] = [];
  let y = from.getFullYear();
  let m = from.getMonth() + 1; // 1-based current month
  for (let i = 0; i < count; i++) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}
