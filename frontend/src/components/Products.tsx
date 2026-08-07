import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { AlertTriangle, Award } from "lucide-react";
import { Card, Pill, Section, SourceLink } from "./Section";
import { RiskDial } from "./Learn";
import { CHART } from "../chartTheme";
import { PRODUCTS, fmtMonth, fmtPct, type Product } from "../data";
import type { HistoryPayload } from "../useHistory";
import { annualizedStats } from "../calc/returns";

type Filter = "all" | "steady" | "balanced" | "adventurous";

const FILTERS: { key: Filter; label: string; match: (p: Product) => boolean }[] = [
  { key: "all", label: "All 12", match: () => true },
  { key: "steady", label: "Steady (risk 1–3)", match: (p) => p.riskLevel <= 3 },
  { key: "balanced", label: "Ready-made mixes", match: (p) => p.assetClass === "multi-asset" },
  { key: "adventurous", label: "Shares (risk 5–7)", match: (p) => p.riskLevel >= 5 },
];

export function Products({ history }: { history: HistoryPayload | null }) {
  const [filter, setFilter] = useState<Filter>("all");
  const match = FILTERS.find((f) => f.key === filter)!.match;

  return (
    <Section
      id="products"
      eyebrow="02 · The Funds"
      title="Twelve ways to own a slice of the world"
      blurb="All of them are available inside a Hargreaves Lansdown Junior ISA. Two carry a 'parent's pick' badge — the rest exist so you can argue with the parent."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Pill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Pill>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PRODUCTS.filter(match).map((p) => (
          <ProductCard key={p.id} product={p} history={history} />
        ))}
      </div>
    </Section>
  );
}

function ProductCard({
  product: p,
  history,
}: {
  product: Product;
  history: HistoryPayload | null;
}) {
  const series = history?.series[p.id];
  const failed = history != null && !series;

  const spark = useMemo(
    () => series?.closes.map((c, i) => ({ i, c })) ?? null,
    [series],
  );
  const stats = useMemo(() => {
    if (!series) return null;
    const rets = series.closes.slice(1).map((c, i) => c / series.closes[i] - 1);
    return annualizedStats(rets);
  }, [series]);

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
            <span className="font-mono">{p.ticker.replace(/^0P.*/, p.isin)}</span>
            <span>OCF {p.ocf}%</span>
          </div>
        </div>
        <RiskDial level={p.riskLevel} />
      </div>

      {p.parentPick && (
        <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
          <Award size={12} /> Parent's pick
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

      <div className="mt-auto pt-4 text-xs">
        <SourceLink href={p.hlUrl}>Factsheet on HL ({p.shareClass})</SourceLink>
      </div>
    </Card>
  );
}
