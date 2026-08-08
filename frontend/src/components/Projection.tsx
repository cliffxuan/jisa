import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dices } from "lucide-react";
import { Card, Pill, Section, Stat } from "./Section";
import { CHART, axisProps, tooltipStyle } from "../chartTheme";
import { PRODUCTS, fmtGBP, fmtMonth, fmtPct } from "../data";
import type { HistoryPayload } from "../useHistory";
import type { Profile } from "../storage";
import { alignSeries, normalizeWeights, annualizedStats, portfolioReturns } from "../calc/returns";
import { project } from "../calc/projection";
import { MIN_POOL_MONTHS, monteCarlo } from "../calc/montecarlo";
import { ageAt, monthTurning, taxYearLabel, taxYearOfDate } from "../calc/jisa";

type Mode = "expected" | "futures";

function monthsBetween(fromDate: Date, toMonth: string): number {
  const [ty, tm] = toMonth.split("-").map(Number);
  return (ty - fromDate.getFullYear()) * 12 + (tm - (fromDate.getMonth() + 1));
}

export function Projection({
  history,
  profile,
}: {
  history: HistoryPayload | null;
  profile: Profile;
}) {
  const now = new Date();
  const loggedTotal = profile.contributions.reduce((a, c) => a + c.amount, 0);
  const [balance, setBalance] = useState(() =>
    Math.round(profile.startingBalance + loggedTotal),
  );
  const [monthly, setMonthly] = useState(profile.assumptions.monthly);
  const [gift, setGift] = useState(profile.assumptions.annualGift);
  const [giftMonth, setGiftMonth] = useState(profile.assumptions.giftMonth);
  const [horizon, setHorizon] = useState<18 | 25>(18);
  const [mode, setMode] = useState<Mode>("expected");
  const [seed, setSeed] = useState(42);

  const selectedIds = PRODUCTS.filter((p) => (profile.allocation[p.id] ?? 0) > 0).map(
    (p) => p.id,
  );

  const months = Math.max(12, monthsBetween(now, monthTurning(profile.dob, horizon)));
  const month18 = monthTurning(profile.dob, 18);
  const age = ageAt(profile.dob);

  // Expected return blends the products' stated long-run assumptions; the
  // band width comes from the mix's real historical volatility when we have
  // enough of it.
  const { mu, sigma, pool } = useMemo(() => {
    const w = normalizeWeights(profile.allocation, selectedIds);
    const mu = selectedIds.reduce(
      (a, id, i) => a + PRODUCTS.find((p) => p.id === id)!.assumedReturn * w[i],
      0,
    );
    let sigma = selectedIds.reduce(
      (a, id, i) => a + PRODUCTS.find((p) => p.id === id)!.assumedVol * w[i],
      0,
    );
    let pool: number[] = [];
    if (history && selectedIds.length > 0) {
      const aligned = alignSeries(history, selectedIds);
      if (aligned && aligned.ids.length === selectedIds.length) {
        pool = portfolioReturns(aligned, profile.allocation);
        const stats = annualizedStats(pool);
        if (stats && stats.months >= 24) sigma = stats.vol;
      }
    }
    return { mu, sigma, pool };
  }, [history, profile.allocation, selectedIds.join(",")]);

  const usedThisTaxYear = useMemo(() => {
    const nowIso = now.toISOString().slice(0, 10);
    const ty = taxYearOfDate(nowIso);
    return profile.contributions
      .filter((c) => taxYearOfDate(c.date) === ty)
      .reduce((a, c) => a + c.amount, 0);
  }, [profile.contributions]);

  const schedule = { monthly, annualGift: gift, giftMonth };
  const projected = useMemo(
    () =>
      project({
        start: balance,
        from: now,
        months,
        annualReturn: mu,
        annualVol: sigma,
        schedule,
        usedThisTaxYear,
      }),
    [balance, months, mu, sigma, monthly, gift, giftMonth, usedThisTaxYear],
  );

  const mc = useMemo(
    () =>
      mode === "futures"
        ? monteCarlo({
            start: balance,
            from: now,
            months,
            pool,
            schedule,
            usedThisTaxYear,
            seed,
          })
        : null,
    [mode, balance, months, pool, monthly, gift, giftMonth, usedThisTaxYear, seed],
  );

  interface Row {
    month: string;
    outer: [number, number];
    inner?: [number, number];
    mid: number;
    paidIn: number;
  }
  const chartData = useMemo((): Row[] => {
    if (mode === "futures" && mc) {
      return mc.fan.map((pt) => ({
        month: pt.month,
        outer: [Math.round(pt.p5), Math.round(pt.p95)] as [number, number],
        inner: [Math.round(pt.p25), Math.round(pt.p75)] as [number, number],
        mid: Math.round(pt.p50),
        paidIn: Math.round(pt.paidIn),
      }));
    }
    return projected.points.map((pt) => ({
      month: pt.month,
      outer: [Math.round(pt.low), Math.round(pt.high)] as [number, number],
      inner: undefined,
      mid: Math.round(pt.mid),
      paidIn: Math.round(pt.paidIn),
    }));
  }, [mode, mc, projected]);

  const final = chartData[chartData.length - 1];
  const clamped = projected.clampedYears;

  if (selectedIds.length === 0) {
    return (
      <Section
        id="projection"
        eyebrow="05 · Look Forward"
        title={`Fast-forward to ${horizon}`}
      >
        <Card>
          <p className="py-8 text-center text-sm text-stone-500">
            Pick at least one fund in Build a Mix to project it forward.
          </p>
        </Card>
      </Section>
    );
  }

  return (
    <Section
      id="projection"
      eyebrow="05 · Look Forward"
      title={`Fast-forward to ${horizon}`}
      blurb={`You're ${age}. The amber line marks 18 — the moment the JISA unlocks and becomes yours as an adult ISA. Nobody knows the future, so we show a range, not a promise.`}
    >
      <div className="space-y-5">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs text-stone-400">
              Balance today
              <input
                type="number"
                min={0}
                step={100}
                value={balance}
                onChange={(e) => setBalance(Math.max(0, Number(e.target.value)))}
                className="field mt-1"
              />
            </label>
            <label className="block text-xs text-stone-400">
              Add monthly
              <input
                type="number"
                min={0}
                step={10}
                value={monthly}
                onChange={(e) => setMonthly(Math.max(0, Number(e.target.value)))}
                className="field mt-1"
              />
            </label>
            <label className="block text-xs text-stone-400">
              Yearly gift
              <input
                type="number"
                min={0}
                step={100}
                value={gift}
                onChange={(e) => setGift(Math.max(0, Number(e.target.value)))}
                className="field mt-1"
              />
            </label>
            <label className="block text-xs text-stone-400">
              Gift lands in
              <select
                value={giftMonth}
                onChange={(e) => setGiftMonth(Number(e.target.value))}
                className="field mt-1"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {fmtMonth(`2000-${String(i + 1).padStart(2, "0")}`).split(" ")[0]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Pill active={mode === "expected"} onClick={() => setMode("expected")}>
              Expected path
            </Pill>
            <Pill active={mode === "futures"} onClick={() => setMode("futures")}>
              1,000 futures
            </Pill>
            <span className="mx-2 h-4 w-px bg-stone-100/15" />
            <Pill active={horizon === 18} onClick={() => setHorizon(18)} tone="amber">
              To 18
            </Pill>
            <Pill active={horizon === 25} onClick={() => setHorizon(25)} tone="amber">
              Keep going to 25
            </Pill>
            {mode === "futures" && mc && (
              <button
                type="button"
                onClick={() => setSeed((s) => s + 1)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-stone-100/15 px-3 py-1.5 text-xs text-stone-300 transition hover:border-emerald-400/40"
              >
                <Dices size={13} /> Re-roll the futures
              </button>
            )}
          </div>
          {mode === "futures" && !mc && (
            <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              Not enough shared history for this mix ({pool.length} months —{" "}
              {MIN_POOL_MONTHS} needed). The youngest fund limits the pool; drop it or
              use the Expected path.
            </p>
          )}
          {clamped.length > 0 && (
            <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              Heads up: these contributions would break the £9,000 JISA cap in{" "}
              {clamped.map(taxYearLabel).join(", ")} — the extra is ignored above the
              limit.
            </p>
          )}
        </Card>

        <Card>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="month"
                  {...axisProps}
                  ticks={chartData.filter((d) => d.month.endsWith("-01")).map((d) => d.month)}
                  tickFormatter={(m: string) => m.slice(0, 4)}
                  minTickGap={24}
                />
                <YAxis {...axisProps} width={64} tickFormatter={(v: number) => fmtGBP(v)} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number | [number, number], name: string) => {
                    if (Array.isArray(v)) {
                      return [
                        `${fmtGBP(v[0])} – ${fmtGBP(v[1])}`,
                        name === "outer"
                          ? mode === "futures"
                            ? "90% of futures"
                            : "±1σ range"
                          : "middle half",
                      ];
                    }
                    return [fmtGBP(v), name === "mid" ? "Middle path" : "Paid in"];
                  }}
                  labelFormatter={(m: string) => fmtMonth(m)}
                />
                <Area
                  dataKey="outer"
                  stroke="none"
                  fill={CHART.fanOuter}
                  isAnimationActive={false}
                />
                {mode === "futures" && (
                  <Area
                    dataKey="inner"
                    stroke="none"
                    fill={CHART.fanInner}
                    isAnimationActive={false}
                  />
                )}
                <Line
                  dataKey="mid"
                  stroke={CHART.portfolio}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="paidIn"
                  stroke={CHART.paidIn}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
                {horizon === 25 && (
                  <ReferenceLine
                    x={month18}
                    stroke={CHART.marker}
                    strokeDasharray="4 3"
                    label={{ value: "18", fill: CHART.marker, fontSize: 11, position: "top" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <Stat
              label={`Middle path at ${horizon}`}
              value={final ? fmtGBP(final.mid) : "—"}
              accent="text-emerald-300"
              sub={`assuming ${fmtPct(mu)}/yr on average`}
            />
          </Card>
          <Card>
            <Stat
              label="Total paid in"
              value={final ? fmtGBP(final.paidIn) : "—"}
              sub="including today's balance"
            />
          </Card>
          <Card>
            <Stat
              label="Range"
              value={final ? `${fmtGBP(final.outer[0])}–${fmtGBP(final.outer[1])}` : "—"}
              sub={mode === "futures" ? "90% of simulated futures" : "±1σ growth band"}
            />
          </Card>
          <Card>
            <Stat
              label="Chance of losing"
              value={mc ? fmtPct(mc.pLoss, 0) : mode === "futures" ? "—" : "n/a"}
              accent={mc && mc.pLoss > 0.2 ? "text-rose-300" : "text-stone-100"}
              sub={
                mc
                  ? `futures ending below what you paid in`
                  : "switch to 1,000 futures"
              }
            />
          </Card>
        </div>

        {mode === "futures" && mc && (
          <Card>
            <p className="text-sm leading-relaxed text-stone-300">
              How this works: we take your mix's{" "}
              <strong className="tabular">{mc.poolMonths}</strong> real months of
              history, shuffle them, and replay them{" "}
              <strong className="tabular">1,000</strong> different ways. Each grey-green
              ribbon is where most of those futures land — the darker band holds the
              middle half. History on shuffle isn't prophecy, but it's more honest
              than a single straight line.
            </p>
          </Card>
        )}
      </div>
    </Section>
  );
}
