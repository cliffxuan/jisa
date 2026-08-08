import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronDown, Scale } from "lucide-react";
import { Card, Pill, Section, SourceLink, Stat } from "./Section";
import { RiskDial } from "./Learn";
import { DONUT_COLORS, tooltipStyle } from "../chartTheme";
import { PLATFORM, PRODUCTS, fmtMonth, fmtPct } from "../data";
import type { HistoryPayload } from "../useHistory";
import type { Profile } from "../storage";
import { alignSeries, annualizedStats, normalizeWeights, portfolioReturns } from "../calc/returns";

const PRESETS: { label: string; weights: Record<string, number> }[] = [
  { label: "Parent's two", weights: { "rl-mm": 40, vuag: 60 } },
  { label: "Play it safe", weights: { "hl-cash": 10, "rl-mm": 70, vuag: 20 } },
  { label: "Balanced", weights: { ls80: 40, vwrp: 30, vags: 20, "rl-mm": 10 } },
  { label: "Adventurous", weights: { vwrp: 50, vuag: 30, vfeg: 10, cnx1: 10 } },
];

export function Builder({
  history,
  profile,
  updateProfile,
}: {
  history: HistoryPayload | null;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const allocation = profile.allocation;
  const total = Object.values(allocation).reduce((a, b) => a + (b || 0), 0);
  const selectedIds = PRODUCTS.filter((p) => (allocation[p.id] ?? 0) > 0).map((p) => p.id);

  // Keep the default interface simple: the core trio plus anything already in
  // the mix; the rest live behind the expander.
  const visible = PRODUCTS.filter(
    (p) => showAll || p.core || (allocation[p.id] ?? 0) > 0,
  );
  const hiddenCount = PRODUCTS.length - visible.length;

  const setWeight = (pid: string, w: number) => {
    const next = { ...allocation };
    if (w <= 0) delete next[pid];
    else next[pid] = w;
    updateProfile({ allocation: next });
  };

  const normalize = () => {
    if (total <= 0) return;
    const entries = Object.entries(allocation).filter(([, w]) => w > 0);
    const scaled = entries.map(([id, w]) => [id, Math.round((w / total) * 100)] as const);
    const drift = 100 - scaled.reduce((a, [, w]) => a + w, 0);
    const next = Object.fromEntries(scaled) as Record<string, number>;
    if (drift !== 0 && scaled.length > 0) next[scaled[0][0]] += drift;
    updateProfile({ allocation: next });
  };

  const stats = useMemo(() => {
    if (!history || selectedIds.length === 0) return null;
    const aligned = alignSeries(history, selectedIds);
    if (!aligned) return null;
    const s = annualizedStats(portfolioReturns(aligned, allocation));
    return s ? { ...s, from: aligned.months[0], covered: aligned.ids } : null;
  }, [history, allocation, selectedIds.join(",")]);

  const weightedOver = (f: (p: (typeof PRODUCTS)[number]) => number): number => {
    const w = normalizeWeights(allocation, selectedIds);
    return selectedIds.reduce(
      (acc, id, i) => acc + f(PRODUCTS.find((p) => p.id === id)!) * w[i],
      0,
    );
  };

  const donutData = selectedIds.map((id) => ({
    name: PRODUCTS.find((p) => p.id === id)!.name,
    value: allocation[id],
    color: DONUT_COLORS[PRODUCTS.findIndex((p) => p.id === id) % DONUT_COLORS.length],
  }));

  return (
    <Section
      id="builder"
      eyebrow="03 · Build a Mix"
      title="Slide until it feels like you"
      blurb="A portfolio is just percentages that sum to 100. Steadier funds calm the ride; share funds do the growing. This is your mix — it saves itself in this browser."
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-stone-500">Presets:</span>
        {PRESETS.map((pr) => (
          <Pill key={pr.label} onClick={() => updateProfile({ allocation: { ...pr.weights } })}>
            {pr.label}
          </Pill>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="space-y-3">
            {visible.map((p) => {
              const w = allocation[p.id] ?? 0;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[220px_1fr_auto]"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <RiskDial level={p.riskLevel} />
                    <span className={w > 0 ? "text-stone-100" : "text-stone-500"}>{p.name}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={w}
                    onChange={(e) => setWeight(p.id, Number(e.target.value))}
                    className="col-span-2 w-full sm:col-span-1"
                  />
                  <div
                    className={`hidden w-12 text-right text-sm tabular sm:block ${
                      w > 0 ? "text-emerald-300" : "text-stone-600"
                    }`}
                  >
                    {w}%
                  </div>
                </div>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-stone-100/15 px-3 py-1.5 text-xs text-stone-400 transition hover:border-emerald-400/40 hover:text-emerald-200"
            >
              <ChevronDown size={13} /> Add from {hiddenCount} more funds
            </button>
          )}
          {showAll && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-stone-100/15 px-3 py-1.5 text-xs text-stone-400 transition hover:border-emerald-400/40"
            >
              <ChevronDown size={13} className="rotate-180" /> Show fewer
            </button>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-stone-100/10 pt-4">
            <div
              className={`text-sm tabular ${total === 100 ? "text-emerald-300" : "text-amber-300"}`}
            >
              Total: {total}%{" "}
              {total !== 100 && total > 0 && (
                <span className="text-stone-500">(calcs re-scale it to 100%)</span>
              )}
            </div>
            {total !== 100 && total > 0 && (
              <button
                type="button"
                onClick={normalize}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200 transition hover:bg-emerald-400/20"
              >
                <Scale size={12} /> Normalize to 100%
              </button>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            {donutData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {donutData.map((d) => (
                        <Cell key={d.name} fill={d.color} stroke="#0a1210" />
                      ))}
                    </Pie>
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => [`${v}%`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-stone-500">
                Slide something above zero to see your mix.
              </p>
            )}
          </Card>

          <Card>
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Fund fees"
                value={selectedIds.length ? fmtPct(weightedOver((p) => p.ocf) / 100, 2) : "—"}
                sub="weighted OCF, already in prices"
              />
              <Stat
                label="Risk score"
                value={selectedIds.length ? weightedOver((p) => p.riskLevel).toFixed(1) : "—"}
                sub="1 calm → 7 wild"
              />
              <Stat
                label="Grew at"
                value={stats ? `${fmtPct(stats.cagr)}/yr` : "—"}
                accent="text-emerald-300"
                sub={stats ? `real data since ${fmtMonth(stats.from)}` : "needs live data"}
              />
              <Stat
                label="Worst dip"
                value={stats ? fmtPct(stats.maxDrawdown, 0) : "—"}
                accent="text-rose-300"
                sub="peak to trough"
              />
            </div>
            <p className="mt-4 border-t border-stone-100/10 pt-3 text-[11px] leading-relaxed text-stone-500">
              Platform cost: the {PLATFORM.name} has a{" "}
              <strong className="text-stone-300">0% account charge</strong> and free
              online dealing —{" "}
              <SourceLink href={PLATFORM.chargesUrl}>HL's charges page</SourceLink>. The
              only running cost of this mix is the fund fee above.
            </p>
            {stats && stats.covered.length < selectedIds.length && (
              <p className="mt-3 text-[11px] text-stone-500">
                Some picks have no live history and are excluded from these numbers.
              </p>
            )}
          </Card>
        </div>
      </div>
    </Section>
  );
}
