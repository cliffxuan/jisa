import raw from "./products.json";

export interface Product {
  id: string;
  name: string;
  shareClass: string;
  ticker: string;
  isin: string;
  type: "etf" | "fund";
  assetClass: string;
  riskLevel: number;
  ocf: number;
  assumedReturn: number;
  assumedVol: number;
  parentPick?: boolean;
  historyFrom?: string;
  blurb: string;
  whatYouOwn: string;
  goodFor: string;
  watchOut: string;
  hlUrl: string;
}

export const PRODUCTS = raw.products as Product[];
export const JISA_LIMIT: number = raw.jisaAnnualLimit;
export const DATA_AS_OF: string = raw.asOf;

export const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export const RISK_LABELS: Record<number, string> = {
  1: "Barely moves",
  2: "Very calm",
  3: "Gentle waves",
  4: "Some swell",
  5: "Proper waves",
  6: "Rough seas",
  7: "Storm rider",
};

const gbp0 = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const gbp2 = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtGBP(v: number, dp: 0 | 2 = 0): string {
  return (dp === 0 ? gbp0 : gbp2).format(v);
}

export function fmtPct(v: number, dp = 1): string {
  return `${(v * 100).toFixed(dp)}%`;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2021-03" -> "Mar 2021" (string-split — no timezone traps) */
export function fmtMonth(m: string): string {
  const [y, mo] = m.split("-");
  return `${MONTH_NAMES[Number(mo) - 1]} ${y}`;
}

/** "2021-03-14" -> "14 Mar 2021" */
export function fmtDate(d: string): string {
  const [y, mo, day] = d.split("-");
  return `${Number(day)} ${MONTH_NAMES[Number(mo) - 1]} ${y}`;
}
