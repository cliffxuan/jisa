import { useMemo, useRef, useState } from "react";
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
import { Download, Plus, Trash2, Upload } from "lucide-react";
import { Card, Section, Stat } from "./Section";
import { CHART, axisProps, tooltipStyle } from "../chartTheme";
import { JISA_LIMIT, PRODUCTS, fmtDate, fmtGBP, fmtMonth } from "../data";
import type { HistoryPayload } from "../useHistory";
import {
  exportStore,
  newId,
  parseImport,
  type Profile,
  type Store,
} from "../storage";
import { alignSeries } from "../calc/returns";
import { backtest } from "../calc/backtest";
import { project } from "../calc/projection";
import { ageAt, monthTurning, taxYearLabel, taxYearOfDate } from "../calc/jisa";

export function Plan({
  history,
  store,
  setStore,
  profile,
  updateProfile,
}: {
  history: HistoryPayload | null;
  store: Store;
  setStore: (s: Store) => void;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    note: "",
  });

  const nowIso = new Date().toISOString().slice(0, 10);
  const currentTaxYear = taxYearOfDate(nowIso);
  const byTaxYear = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of profile.contributions) {
      const ty = taxYearOfDate(c.date);
      map.set(ty, (map.get(ty) ?? 0) + c.amount);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [profile.contributions]);
  const usedThisYear = byTaxYear.find(([y]) => y === currentTaxYear)?.[1] ?? 0;

  const addContribution = () => {
    const amount = Number(draft.amount);
    if (!draft.date || !Number.isFinite(amount) || amount <= 0) return;
    const next = [
      ...profile.contributions,
      { id: newId("c"), date: draft.date, amount, note: draft.note.trim() },
    ].sort((a, b) => a.date.localeCompare(b.date));
    updateProfile({ contributions: next });
    setDraft({ ...draft, amount: "", note: "" });
  };

  const removeContribution = (cid: string) => {
    updateProfile({
      contributions: profile.contributions.filter((c) => c.id !== cid),
    });
  };

  const onImport = (file: File) => {
    file
      .text()
      .then((text) => {
        setStore(parseImport(text));
        setImportErr(null);
      })
      .catch((e: Error) => setImportErr(e.message));
  };

  // Actual trajectory: replay logged contributions through real prices at the
  // saved mix, then extend the middle expected path out to 18.
  const trajectory = useMemo(() => {
    const selectedIds = PRODUCTS.filter((p) => (profile.allocation[p.id] ?? 0) > 0).map(
      (p) => p.id,
    );
    if (!history || selectedIds.length === 0 || profile.contributions.length === 0) {
      return null;
    }
    const aligned = alignSeries(history, selectedIds);
    if (!aligned) return null;
    const firstMonth = profile.contributions[0].date.slice(0, 7);
    const startMonth = aligned.months.find((m) => m >= firstMonth);
    if (!startMonth) return null;
    const actual = backtest({
      aligned,
      weights: profile.allocation,
      startMonth,
      lump: profile.startingBalance,
      contributions: profile.contributions,
    });
    if (!actual) return null;

    const lastActual = actual.points[actual.points.length - 1];
    const monthsTo18 = (() => {
      const m18 = monthTurning(profile.dob, 18);
      const [y, m] = lastActual.month.split("-").map(Number);
      const [y18, mm18] = m18.split("-").map(Number);
      return Math.max(0, (y18 - y) * 12 + (mm18 - m));
    })();
    const future =
      monthsTo18 > 0
        ? project({
            start: lastActual.value,
            from: new Date(`${lastActual.month}-15`),
            months: monthsTo18,
            annualReturn: PRODUCTS.filter((p) => (profile.allocation[p.id] ?? 0) > 0).reduce(
              (a, p, _, arr) => {
                const total = arr.reduce((x, q) => x + (profile.allocation[q.id] ?? 0), 0);
                return a + p.assumedReturn * ((profile.allocation[p.id] ?? 0) / total);
              },
              0,
            ),
            annualVol: 0,
            schedule: {
              monthly: profile.assumptions.monthly,
              annualGift: profile.assumptions.annualGift,
              giftMonth: profile.assumptions.giftMonth,
            },
            usedThisTaxYear: usedThisYear,
          })
        : null;

    const rows: {
      month: string;
      actual?: number;
      paidIn?: number;
      expected?: number;
    }[] = actual.points.map((pt) => ({
      month: pt.month,
      actual: Math.round(pt.value),
      paidIn: Math.round(pt.paidIn),
    }));
    if (future) {
      rows[rows.length - 1].expected = Math.round(lastActual.value);
      for (const pt of future.points) {
        rows.push({ month: pt.month, expected: Math.round(pt.mid) });
      }
    }
    return { rows, actual };
  }, [history, profile, usedThisYear]);

  const month18 = monthTurning(profile.dob, 18);

  return (
    <Section
      id="plan"
      eyebrow="06 · Your Plan"
      title="Log the real money"
      blurb="Every birthday tenner from grandma, recorded here. Saved only in this browser — it's your private ledger. Export a backup now and then; nothing leaves your device."
    >
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => exportStore(store)}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-100/15 px-3 py-1.5 text-xs text-stone-300 transition hover:border-emerald-400/40"
        >
          <Download size={13} /> Export backup
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-100/15 px-3 py-1.5 text-xs text-stone-300 transition hover:border-emerald-400/40"
        >
          <Upload size={13} /> Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
      </div>
      {importErr && (
        <p className="mb-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
          Import failed: {importErr}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-semibold text-stone-200">About you</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs text-stone-400">
                Name
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateProfile({ name: e.target.value })}
                  className="field mt-1"
                />
              </label>
              <label className="block text-xs text-stone-400">
                Date of birth
                <input
                  type="date"
                  value={profile.dob}
                  onChange={(e) => e.target.value && updateProfile({ dob: e.target.value })}
                  className="field mt-1"
                />
              </label>
              <label className="col-span-2 block text-xs text-stone-400">
                Balance before the first logged gift (£)
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={profile.startingBalance}
                  onChange={(e) =>
                    updateProfile({
                      startingBalance: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="field mt-1"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-stone-500 tabular">
              {ageAt(profile.dob)} years old · JISA unlocks {fmtMonth(month18)}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-stone-200">
              This tax year ({taxYearLabel(currentTaxYear)})
            </h3>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-100/10">
              <div
                className={`h-full rounded-full ${
                  usedThisYear >= JISA_LIMIT ? "bg-rose-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, (usedThisYear / JISA_LIMIT) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-stone-400 tabular">
              {fmtGBP(usedThisYear)} used · {fmtGBP(Math.max(0, JISA_LIMIT - usedThisYear))}{" "}
              of allowance left
            </p>
            {byTaxYear.length > 0 && (
              <div className="mt-4 space-y-1 border-t border-stone-100/10 pt-3 text-xs text-stone-400 tabular">
                {byTaxYear.map(([y, amt]) => (
                  <div key={y} className="flex justify-between">
                    <span>{taxYearLabel(y)}</span>
                    <span className={amt > JISA_LIMIT ? "text-rose-300" : undefined}>
                      {fmtGBP(amt)}
                      {amt > JISA_LIMIT && " — over the cap!"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-stone-200">Log a gift</h3>
            <div className="mt-3 grid grid-cols-[1fr_90px] gap-2">
              <input
                type="date"
                value={draft.date}
                max={nowIso}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="field"
              />
              <input
                type="number"
                placeholder="£"
                min={0}
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                className="field"
              />
              <input
                type="text"
                placeholder="note — e.g. birthday, grandma"
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                className="field"
              />
              <button
                type="button"
                onClick={addContribution}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-400/50 bg-emerald-400/10 text-xs text-emerald-200 transition hover:bg-emerald-400/20"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {profile.contributions.length > 0 ? (
              <ul className="mt-4 max-h-56 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
                {[...profile.contributions].reverse().map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-stone-100/5 px-3 py-1.5 text-xs"
                  >
                    <span className="text-stone-400 tabular">{fmtDate(c.date)}</span>
                    <span className="flex-1 truncate text-stone-500">{c.note}</span>
                    <span className="font-medium text-amber-200 tabular">
                      {fmtGBP(c.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeContribution(c.id)}
                      className="-m-2 p-2 text-stone-600 transition hover:text-rose-300"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-stone-500">
                Nothing logged yet — add the first gift above.
              </p>
            )}
          </Card>
        </div>

        <Card>
          <h3 className="text-sm font-semibold text-stone-200">
            {profile.name ? `${profile.name}'s` : "Your"} road to 18
          </h3>
          {trajectory ? (
            <>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={trajectory.rows}
                    margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      {...axisProps}
                      ticks={trajectory.rows
                        .filter((d) => d.month.endsWith("-01"))
                        .map((d) => d.month)}
                      tickFormatter={(m: string) => m.slice(0, 4)}
                      minTickGap={24}
                    />
                    <YAxis {...axisProps} width={64} tickFormatter={(v: number) => fmtGBP(v)} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => [
                        fmtGBP(v),
                        name === "actual"
                          ? "Actual value"
                          : name === "expected"
                            ? "Expected from here"
                            : "Paid in",
                      ]}
                      labelFormatter={(m: string) => fmtMonth(m)}
                    />
                    <Area
                      dataKey="actual"
                      stroke={CHART.portfolio}
                      strokeWidth={2}
                      fill="rgba(52,211,153,0.12)"
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="expected"
                      stroke={CHART.portfolio}
                      strokeWidth={1.5}
                      strokeDasharray="3 4"
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
                    <ReferenceLine
                      x={month18}
                      stroke={CHART.marker}
                      strokeDasharray="4 3"
                      label={{ value: "18", fill: CHART.marker, fontSize: 11, position: "top" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Stat
                  label="Value if invested since day one"
                  value={fmtGBP(trajectory.actual.finalValue)}
                  accent="text-emerald-300"
                  sub={`${fmtGBP(trajectory.actual.totalPaidIn)} paid in`}
                />
                <Stat
                  label="Solid line vs dashed"
                  value="real · then expected"
                  sub="replayed through real prices, extended at assumed growth"
                />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-stone-500">
                The solid line replays your logged gifts through the mix's real price
                history (as if invested on the day). The dashed line carries on at the
                mix's assumed growth with the assumptions from Look Forward.
              </p>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-stone-500">
              {profile.contributions.length === 0
                ? "Log at least one gift (and pick a mix) to draw the road to 18."
                : "Waiting for price history…"}
            </p>
          )}
        </Card>
      </div>
    </Section>
  );
}
