import { useEffect, useState } from "react";
import { PRODUCTS } from "./data";

export interface Series {
  ticker: string;
  currency: string;
  months: string[];
  closes: number[];
}

export interface HistoryPayload {
  updated: number;
  products: string[];
  series: Record<string, Series>;
  errors: Record<string, string>;
}

/** Synthetic products (HL cash) have no market data; give them a modelled
 * constant-rate series spanning the same months as the real ones, so every
 * calc (align, backtest, Monte Carlo) treats them uniformly. */
function addSyntheticSeries(payload: HistoryPayload): HistoryPayload {
  const all = Object.values(payload.series);
  if (all.length === 0) return payload;
  const first = all.reduce((a, s) => (s.months[0] < a ? s.months[0] : a), "9999-99");
  const last = all.reduce((a, s) => {
    const m = s.months[s.months.length - 1];
    return m > a ? m : a;
  }, "0000-00");

  const months: string[] = [];
  let [y, m] = first.split("-").map(Number);
  while (true) {
    const label = `${y}-${String(m).padStart(2, "0")}`;
    months.push(label);
    if (label >= last) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  const series = { ...payload.series };
  for (const p of PRODUCTS) {
    if (!p.synthetic || series[p.id]) continue;
    const monthlyRate = Math.pow(1 + p.assumedReturn, 1 / 12);
    series[p.id] = {
      ticker: "",
      currency: "GBP",
      months,
      closes: months.map((_, i) => +Math.pow(monthlyRate, i).toFixed(6)),
    };
  }
  return { ...payload, series };
}

/** One fetch per page load — the server caches Yahoo data for ~12h anyway. */
export function useHistory(): { data: HistoryPayload | null; err: string | null } {
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/history")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: HistoryPayload) => {
        if (alive) setData(addSyntheticSeries(d));
      })
      .catch((e: Error) => {
        if (alive) setErr(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { data, err };
}
