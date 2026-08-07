import { useEffect, useState } from "react";

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
        if (alive) setData(d);
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
