import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Section } from "./Section";
import { CHART, axisProps, tooltipStyle } from "../chartTheme";
import { RISK_LABELS, fmtGBP } from "../data";

export function Learn() {
  return (
    <Section
      id="learn"
      eyebrow="01 · Learn"
      title="Three ideas before you touch a slider"
      blurb="Everything else on this page is these three ideas wearing different hats."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h3 className="font-display text-lg font-semibold text-emerald-300">
            What's a JISA, really?
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-300">
            A Junior ISA is a wrapper, not an investment — a tax-proof box that an
            adult opens for you. What matters is what you put <em>inside</em> the
            box: cash-like funds, share funds, bond funds, or a mix.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stone-400">
            The box's rules: up to £9,000 goes in per tax year, nothing comes out
            until you're 18, and the taxman never touches it. Grandparents' gift
            money is a classic thing to feed it with.
          </p>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-semibold text-emerald-300">
            Risk is the price of growth
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-300">
            "Risk" here means <em>how much the value bounces around</em>, not
            whether someone runs off with your money. More bounce is the fee the
            market charges for higher long-run growth.
          </p>
          <div className="mt-4 space-y-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
              <div key={lvl} className="flex items-center gap-2 text-xs">
                <RiskDial level={lvl} />
                <span className="text-stone-400">{RISK_LABELS[lvl]}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-stone-400">
            A risk-1 fund barely moves. A risk-7 fund has halved before — and
            people who held on were (eventually) glad they did. Time is what makes
            risk survivable, and you have years of it.
          </p>
        </Card>

        <CompoundingDemo />
      </div>
    </Section>
  );
}

export function RiskDial({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5" title={`Risk ${level} of 7 — ${RISK_LABELS[level]}`}>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={i}
          className="h-3 w-1.5 rounded-sm"
          style={{
            background:
              i <= level
                ? i <= 3
                  ? "#7dd3fc"
                  : i <= 5
                    ? "#34d399"
                    : "#fb7185"
                : "rgba(242,239,230,0.12)",
          }}
        />
      ))}
    </span>
  );
}

function CompoundingDemo() {
  const [monthly, setMonthly] = useState(50);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(10);

  const data = useMemo(() => {
    const r = Math.pow(1 + rate / 100, 1 / 12) - 1;
    let value = 0;
    const out = [];
    for (let m = 0; m <= years * 12; m++) {
      if (m > 0) value = value * (1 + r) + monthly;
      out.push({
        year: +(m / 12).toFixed(2),
        paidIn: monthly * m,
        value: Math.round(value),
      });
    }
    return out;
  }, [monthly, rate, years]);

  const last = data[data.length - 1];
  const grown = last.value - last.paidIn;

  return (
    <Card>
      <h3 className="font-display text-lg font-semibold text-emerald-300">
        Compounding, the slow magic
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-stone-300">
        Growth earns growth. Watch the gap open between what you put in and what
        it becomes:
      </p>
      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="year" {...axisProps} tickFormatter={(v: number) => `${v}y`} />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number, name: string) => [
                fmtGBP(v),
                name === "value" ? "Value" : "Paid in",
              ]}
              labelFormatter={(v: number) => `Year ${v}`}
            />
            <Area
              dataKey="value"
              stroke={CHART.portfolio}
              fill="rgba(52,211,153,0.15)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area
              dataKey="paidIn"
              stroke={CHART.paidIn}
              strokeDasharray="4 3"
              fill="transparent"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-3 text-xs text-stone-400">
        <label className="block">
          <span className="flex justify-between">
            <span>{fmtGBP(monthly)} a month</span>
            <span>{years} years at {rate}%</span>
          </span>
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <div className="flex gap-3">
          <label className="block flex-1">
            growth %/yr
            <input
              type="range"
              min={1}
              max={10}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="block flex-1">
            years
            <input
              type="range"
              min={3}
              max={30}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
        </div>
      </div>
      <p className="mt-3 text-sm text-stone-300">
        You'd put in <strong className="tabular">{fmtGBP(last.paidIn)}</strong>; growth
        adds <strong className="tabular text-emerald-300">{fmtGBP(grown)}</strong>.
      </p>
    </Card>
  );
}
