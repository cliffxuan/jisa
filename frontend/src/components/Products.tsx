import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { AlertTriangle, Award, ChevronDown, Compass, GraduationCap } from "lucide-react";
import { Card, Section, SourceLink } from "./Section";
import { RiskDial } from "./Learn";
import { CHART } from "../chartTheme";
import {
  CORE_PRODUCTS,
  EXTRA_PRODUCTS,
  PLATFORM,
  fmtMonth,
  fmtPct,
  type Product,
} from "../data";
import type { HistoryPayload } from "../useHistory";
import { annualizedStats } from "../calc/returns";

export function Products({ history }: { history: HistoryPayload | null }) {
  const [explore, setExplore] = useState(false);

  return (
    <Section
      id="products"
      eyebrow="02 · The Funds"
      title="Start with three"
      blurb="One way to park, one way to lend, one way to own. Master these and you understand most of investing — the wider menu is there when you're curious."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CORE_PRODUCTS.map((p) => (
          <ProductCard key={p.id} product={p} history={history} defaultOpen />
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
            <ProductCard key={p.id} product={p} history={history} />
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

function ProductCard({
  product: p,
  history,
  defaultOpen = false,
}: {
  product: Product;
  history: HistoryPayload | null;
  defaultOpen?: boolean;
}) {
  const series = history?.series[p.id];
  const failed = history != null && !series && !p.synthetic;

  const spark = useMemo(
    () => (p.synthetic ? null : series?.closes.map((c, i) => ({ i, c })) ?? null),
    [series, p.synthetic],
  );
  const stats = useMemo(() => {
    if (!series || p.synthetic) return null;
    const rets = series.closes.slice(1).map((c, i) => c / series.closes[i] - 1);
    return annualizedStats(rets);
  }, [series, p.synthetic]);

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

      {spark && spark.length > 1 && (
        <div className="mt-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Line
                dataKey="c"
                stroke={CHART.portfolio}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
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

      <details className="group mt-3 rounded-xl border border-emerald-100/10 bg-emerald-400/5" open={defaultOpen}>
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
