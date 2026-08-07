import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Section, Stat } from "./Section";
import { CHART, axisProps, tooltipStyle } from "../chartTheme";
import { PRODUCT_BY_ID, PRODUCTS, fmtGBP, fmtMonth, fmtPct } from "../data";
import type { HistoryPayload } from "../useHistory";
import type { Profile } from "../storage";
import { alignSeries } from "../calc/returns";
import { backtest } from "../calc/backtest";

const MM_ID = "rl-mm";

export function Backtest({
  history,
  active,
}: {
  history: HistoryPayload | null;
  active: Profile;
}) {
  const [lump, setLump] = useState(1000);
  const [monthly, setMonthly] = useState(50);
  const [gift, setGift] = useState(500);
  const [giftMonth, setGiftMonth] = useState(12);
  const [startOffset, setStartOffset] = useState(0); // months from earliest

  const selectedIds = PRODUCTS.filter((p) => (active.allocation[p.id] ?? 0) > 0).map(
    (p) => p.id,
  );

  // Align the portfolio *and* the money-market fund on one shared window so
  // the comparison line runs over identical months.
  const aligned = useMemo(() => {
    if (!history || selectedIds.length === 0) return null;
    const ids = selectedIds.includes(MM_ID) ? selectedIds : [...selectedIds, MM_ID];
    return alignSeries(history, ids);
  }, [history, selectedIds.join(",")]);

  const limiting = useMemo(() => {
    if (!history || !aligned) return null;
    let worst: { id: string; from: string } | null = null;
    for (const id of aligned.ids) {
      const from = history.series[id].months[0];
      if (!worst || from > worst.from) worst = { id, from };
    }
    return worst && worst.from > (history.series[MM_ID]?.months[0] ?? "")
      ? worst
      : null;
  }, [history, aligned]);

  const maxOffset = aligned ? Math.max(0, aligned.months.length - 13) : 0;
  const offset = Math.min(startOffset, maxOffset);
  const startMonth = aligned?.months[offset];

  const schedule = { monthly, annualGift: gift, giftMonth };
  const result = useMemo(() => {
    if (!aligned || !startMonth) return null;
    return backtest({
      aligned,
      weights: active.allocation,
      startMonth,
      lump,
      schedule,
    });
  }, [aligned, active.allocation, startMonth, lump, monthly, gift, giftMonth]);

  const mmResult = useMemo(() => {
    if (!aligned || !startMonth || !aligned.ids.includes(MM_ID)) return null;
    return backtest({
      aligned,
      weights: { [MM_ID]: 100 },
      startMonth,
      lump,
      schedule,
    });
  }, [aligned, startMonth, lump, monthly, gift, giftMonth]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.points.map((pt, i) => ({
      month: pt.month,
      value: Math.round(pt.value),
      paidIn: Math.round(pt.paidIn),
      cash: mmResult ? Math.round(mmResult.points[i]?.value ?? 0) : undefined,
    }));
  }, [result, mmResult]);

  const dd = result?.drawdownWindow ?? null;
  const years = result ? (result.points.length / 12).toFixed(1) : "0";

  return (
    <Section
      id="backtest"
      eyebrow="04 · Look Back"
      title="Rewind history with your mix"
      blurb={`What if ${active.name} had started this exact portfolio years ago? Real monthly prices, real crashes, real recoveries — nothing simulated.`}
    >
      {!result || !aligned ? (
        <Card>
          <p className="py-8 text-center text-sm text-stone-500">
            {history
              ? "Pick at least one fund in Build a Mix to run a backtest."
              : "Loading price history…"}
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="block text-xs text-stone-400">
                Start with
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={lump}
                  onChange={(e) => setLump(Math.max(0, Number(e.target.value)))}
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
              <label className="block text-xs text-stone-400">
                Start: {startMonth ? fmtMonth(startMonth) : "—"}
                <input
                  type="range"
                  min={0}
                  max={maxOffset}
                  value={offset}
                  onChange={(e) => setStartOffset(Number(e.target.value))}
                  className="mt-3 w-full"
                />
              </label>
            </div>
            {limiting && (
              <p className="mt-3 text-[11px] text-stone-500">
                Window starts {fmtMonth(aligned.months[0])} — limited by{" "}
                {PRODUCT_BY_ID.get(limiting.id)?.name} (no data before then).
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
                  <YAxis
                    {...axisProps}
                    width={64}
                    tickFormatter={(v: number) => fmtGBP(v)}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number, name: string) => [
                      fmtGBP(v),
                      name === "value"
                        ? `${active.name}'s mix`
                        : name === "cash"
                          ? "100% money market"
                          : "Paid in",
                    ]}
                    labelFormatter={(m: string) => fmtMonth(m)}
                  />
                  {dd && (
                    <ReferenceArea
                      x1={dd.from}
                      x2={dd.to}
                      fill={CHART.bad}
                      fillOpacity={0.07}
                      strokeOpacity={0}
                    />
                  )}
                  <Area
                    dataKey="value"
                    stroke={CHART.portfolio}
                    strokeWidth={2}
                    fill="rgba(52,211,153,0.12)"
                    isAnimationActive={false}
                  />
                  {mmResult && (
                    <Line
                      dataKey="cash"
                      stroke={CHART.cash}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    dataKey="paidIn"
                    stroke={CHART.paidIn}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-stone-500">
              <LegendDot color={CHART.portfolio} label={`${active.name}'s mix`} />
              <LegendDot color={CHART.cash} label="100% money market" />
              <LegendDot color={CHART.paidIn} label="Money paid in" />
              {dd && <LegendDot color={CHART.bad} label="Worst stretch" />}
            </div>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <Stat
                label={`After ${years} years`}
                value={fmtGBP(result.finalValue)}
                accent="text-emerald-300"
                sub={`${fmtGBP(result.totalPaidIn)} paid in`}
              />
            </Card>
            <Card>
              <Stat
                label="Worst stretch"
                value={fmtPct(result.maxDrawdown, 0)}
                accent="text-rose-300"
                sub={
                  dd
                    ? `${fmtMonth(dd.from)} → ${fmtMonth(dd.to)}`
                    : "no drawdown in window"
                }
              />
            </Card>
            <Card>
              <Stat
                label="Best 12 months"
                value={result.best12 ? `+${fmtPct(result.best12.ret, 0)}` : "—"}
                accent="text-emerald-300"
                sub={result.best12 ? `to ${fmtMonth(result.best12.to)}` : undefined}
              />
            </Card>
            <Card>
              <Stat
                label="Worst 12 months"
                value={result.worst12 ? fmtPct(result.worst12.ret, 0) : "—"}
                accent="text-rose-300"
                sub={result.worst12 ? `to ${fmtMonth(result.worst12.to)}` : undefined}
              />
            </Card>
          </div>

          {mmResult && (
            <Card>
              <p className="text-sm leading-relaxed text-stone-300">
                {result.maxDrawdown < -0.005 ? (
                  <>
                    At the worst point your mix was{" "}
                    <strong className="text-rose-300">
                      {fmtPct(result.maxDrawdown, 0)}
                    </strong>{" "}
                    below its peak — that's the moment that tests whether you'd hold
                    on.{" "}
                  </>
                ) : null}
                The all-money-market version never really dipped, but it finished at{" "}
                <strong className="text-sky-300">{fmtGBP(mmResult.finalValue)}</strong>{" "}
                versus your mix's{" "}
                <strong className="text-emerald-300">{fmtGBP(result.finalValue)}</strong>
                . {result.finalValue > mmResult.finalValue
                  ? "Riding out the bumps got paid this time — though history doesn't owe you a repeat."
                  : "This time the calm option actually won — it happens, especially over short windows."}
              </p>
            </Card>
          )}
        </div>
      )}
    </Section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
