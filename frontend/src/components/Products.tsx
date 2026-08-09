import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Award, ChevronDown, Compass, GraduationCap } from "lucide-react";
import { Card, Pill, Section, SourceLink } from "./Section";
import { RiskDial } from "./Learn";
import { CHART, axisProps, tooltipStyle } from "../chartTheme";
import {
  CORE_PRODUCTS,
  EXTRA_PRODUCTS,
  PLATFORM,
  fmtGBP,
  fmtMonth,
  fmtPct,
  type Product,
} from "../data";
import type { HistoryPayload, Series } from "../useHistory";
import { annualizedStats } from "../calc/returns";

type Lookback = 1 | 3 | 5 | 10 | "max";
const LOOKBACKS: { key: Lookback; label: string }[] = [
  { key: 1, label: "1 year" },
  { key: 3, label: "3 years" },
  { key: 5, label: "5 years" },
  { key: 10, label: "10 years" },
  { key: "max", label: "Max" },
];

export function Products({ history }: { history: HistoryPayload | null }) {
  const [explore, setExplore] = useState(false);
  const [lookback, setLookback] = useState<Lookback>(10);

  return (
    <Section
      id="products"
      eyebrow="02 · The Funds"
      title="Start with three"
      blurb="One way to park, one way to lend, one way to own. Master these and you understand most of investing — the wider menu is there when you're curious."
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-stone-500">
          Growth since:
        </span>
        {LOOKBACKS.map((lb) => (
          <Pill key={lb.label} active={lookback === lb.key} onClick={() => setLookback(lb.key)}>
            {lb.label}
          </Pill>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CORE_PRODUCTS.map((p) => (
          <ProductCard key={p.id} product={p} history={history} lookback={lookback} defaultOpen />
        ))}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setExplore((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-400/20"
        >
          <Compass size={15} />
          {explore ? "Hide" : "Explore"} {EXTRA_PRODUCTS.length} more ways to lend and own
          <ChevronDown size={14} className={`transition ${explore ? "rotate-180" : ""}`} />
        </button>
      </div>

      {explore && (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {EXTRA_PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} history={history} lookback={lookback} />
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-stone-500">
        All available inside the {PLATFORM.name} —{" "}
        <SourceLink href={PLATFORM.chargesUrl}>
          0% account charge, free online dealing
        </SourceLink>
        . Fund managers' own fees (the OCF shown on each card) are already inside
        the prices you see.
      </p>
    </Section>
  );
}

interface YearBar {
  year: string;
  ret: number;
  ytd: boolean;
}

/** Always-visible value on each year bar — phones don't hover. Above the bar
 * for gains, below it for losses; one decimal only when the value is small. */
function BarValueLabel(props: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string;
}) {
  const x = Number(props.x);
  const y = Number(props.y);
  const width = Number(props.width);
  const height = Number(props.height);
  const v = Number(props.value);
  if (!Number.isFinite(x) || !Number.isFinite(v)) return null;
  const pct = v * 100;
  const text =
    Math.abs(pct) >= 9.5 ? String(Math.round(pct)) : Math.abs(pct).toFixed(1);
  const negative = v < 0 && text !== "0.0"; // a rounded-to-zero dip isn't "−0.0"
  return (
    <text
      x={x + width / 2}
      y={negative ? y + height + 9 : y - 3}
      textAnchor="middle"
      fontSize={8.5}
      fill={negative ? "#fb7185" : "#8b9490"}
      className="tabular"
    >
      {negative ? `−${text}` : text}
    </text>
  );
}

/** Calendar-year returns from year-end closes; the current year is YTD. */
function yearlyReturns(series: Series): YearBar[] {
  const lastCloseOfYear = new Map<string, number>();
  series.months.forEach((m, i) => lastCloseOfYear.set(m.slice(0, 4), series.closes[i]));
  const years = [...lastCloseOfYear.keys()].sort();
  const lastYear = years[years.length - 1];
  const out: YearBar[] = [];
  for (let i = 1; i < years.length; i++) {
    // Skip gaps (a missing year would silently span two years).
    if (Number(years[i]) !== Number(years[i - 1]) + 1) continue;
    out.push({
      year: years[i],
      ret: lastCloseOfYear.get(years[i])! / lastCloseOfYear.get(years[i - 1])! - 1,
      ytd: years[i] === lastYear && !series.months[series.months.length - 1].endsWith("-12"),
    });
  }
  return out;
}

/** Total growth over the chosen lookback (clamped to available history). */
function growthSince(
  series: Series,
  lookback: Lookback,
): { pct: number; from: string; clamped: boolean } | null {
  const n = series.months.length;
  if (n < 2) return null;
  let idx = 0;
  let clamped = false;
  if (lookback !== "max") {
    const last = series.months[n - 1];
    const [ly, lm] = last.split("-").map(Number);
    const target = `${ly - lookback}-${String(lm).padStart(2, "0")}`;
    idx = series.months.findIndex((m) => m >= target);
    if (idx <= 0) {
      idx = 0;
      clamped = true;
    }
  }
  if (idx >= n - 1) return null;
  return {
    pct: series.closes[n - 1] / series.closes[idx] - 1,
    from: series.months[idx],
    clamped,
  };
}

function ProductCard({
  product: p,
  history,
  lookback,
  defaultOpen = false,
}: {
  product: Product;
  history: HistoryPayload | null;
  lookback: Lookback;
  defaultOpen?: boolean;
}) {
  const series = history?.series[p.id];
  const failed = history != null && !series && !p.synthetic;

  const bars = useMemo(
    () => (series && !p.synthetic ? yearlyReturns(series) : null),
    [series, p.synthetic],
  );
  const stats = useMemo(() => {
    if (!series || p.synthetic) return null;
    const rets = series.closes.slice(1).map((c, i) => c / series.closes[i] - 1);
    return annualizedStats(rets);
  }, [series, p.synthetic]);
  const growth = useMemo(
    () => (series ? growthSince(series, lookback) : null),
    [series, lookback],
  );
  // Long education panels stay collapsed on phones — the page is a marathon
  // scroll otherwise. `open` is only the initial state, so reading the media
  // query at first render is enough.
  const open =
    defaultOpen &&
    (typeof window === "undefined" || window.matchMedia("(min-width: 640px)").matches);

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold leading-snug text-stone-100">
            {p.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
            <span className="rounded bg-stone-100/10 px-1.5 py-0.5 font-mono uppercase">
              {p.type}
            </span>
            {p.ticker && <span className="font-mono">{p.ticker.replace(/^0P.*/, p.isin)}</span>}
            {p.ocf > 0 ? <span>OCF {p.ocf}%</span> : <span>no fund fee</span>}
          </div>
        </div>
        <RiskDial level={p.riskLevel} />
      </div>

      {p.parentPick && (
        <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
          <Award size={12} /> Classic pick
        </div>
      )}
      {p.riskLevel >= 7 && (
        <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium text-rose-200">
          <AlertTriangle size={12} /> High risk — small doses only
        </div>
      )}

      <p className="mt-3 text-sm leading-relaxed text-stone-300">{p.blurb}</p>

      {bars && bars.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">
            Each year's return, %
          </div>
          <div className="mt-1 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="year"
                  {...axisProps}
                  fontSize={9}
                  tickFormatter={(y: string) => `’${y.slice(2)}`}
                  interval={bars.length > 9 ? 1 : 0}
                />
                <YAxis hide />
                <ReferenceLine y={0} stroke="rgba(242,239,230,0.25)" />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ fill: "rgba(242,239,230,0.05)" }}
                  formatter={(v: number) => [
                    `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`,
                    "return",
                  ]}
                  labelFormatter={(y: string) =>
                    bars.find((b) => b.year === y)?.ytd ? `${y} so far` : y
                  }
                />
                <Bar dataKey="ret" isAnimationActive={false} radius={[2, 2, 0, 0]}>
                  {bars.map((b) => (
                    <Cell
                      key={b.year}
                      fill={b.ret >= 0 ? CHART.portfolio : CHART.bad}
                      opacity={b.ytd ? 0.45 : 0.9}
                    />
                  ))}
                  <LabelList dataKey="ret" content={<BarValueLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {series && stats && (
        <div className="mt-1 flex justify-between text-[11px] text-stone-500 tabular">
          <span>since {fmtMonth(series.months[0])}</span>
          <span>
            {fmtPct(stats.cagr)} /yr · worst dip {fmtPct(stats.maxDrawdown, 0)}
          </span>
        </div>
      )}

      {growth && (
        <div className="mt-3 rounded-xl border border-emerald-100/10 bg-emerald-400/5 px-3 py-2">
          <span className={`text-lg font-semibold tabular ${growth.pct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {growth.pct >= 0 ? "+" : ""}
            {(growth.pct * 100).toFixed(0)}%
          </span>
          <span className="ml-2 text-xs text-stone-400 tabular">
            since {fmtMonth(growth.from)}
            {growth.clamped && " (launch)"} — {fmtGBP(100)} then is{" "}
            {fmtGBP(Math.round(100 * (1 + growth.pct)))} now
            {p.synthetic && " (modelled)"}
          </span>
        </div>
      )}

      {p.synthetic && (
        <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-400/5 px-3 py-2 text-[11px] text-sky-200/80">
          Modelled at {fmtPct(p.assumedReturn, 1)} AER (variable interest, not market
          data).
        </div>
      )}
      {failed && (
        <div className="mt-3 rounded-lg border border-stone-100/10 bg-stone-100/5 px-3 py-2 text-[11px] text-stone-500">
          Live price history unavailable right now — projections fall back to its
          assumed {fmtPct(p.assumedReturn)} yearly return.
        </div>
      )}

      <dl className="mt-4 space-y-2 border-t border-stone-100/10 pt-3 text-xs leading-relaxed">
        <div>
          <dt className="font-semibold text-stone-400">What you'd own</dt>
          <dd className="text-stone-300">{p.whatYouOwn}</dd>
        </div>
        <div>
          <dt className="font-semibold text-emerald-400/90">Good for</dt>
          <dd className="text-stone-300">{p.goodFor}</dd>
        </div>
        <div>
          <dt className="font-semibold text-rose-400/90">Watch out</dt>
          <dd className="text-stone-300">{p.watchOut}</dd>
        </div>
      </dl>

      <details className="group mt-3 rounded-xl border border-emerald-100/10 bg-emerald-400/5" open={open}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-300 [&::-webkit-details-marker]:hidden">
          <GraduationCap size={13} />
          The idea, properly
          <ChevronDown size={12} className="ml-auto transition group-open:rotate-180" />
        </summary>
        <p className="px-3 pb-3 text-xs leading-relaxed text-stone-300">{p.education}</p>
      </details>

      <div className="mt-auto pt-4 text-xs">
        <SourceLink href={p.hlUrl}>
          {p.synthetic ? "HL interest rates" : `Factsheet on HL (${p.shareClass})`}
        </SourceLink>
      </div>
    </Card>
  );
}
