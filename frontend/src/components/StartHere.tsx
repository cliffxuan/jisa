import { useMemo, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { RiskDial } from "./Learn";
import { PRODUCTS, fmtGBP, fmtMonth } from "../data";
import type { Profile } from "../storage";
import { ageAt, monthTurning } from "../calc/jisa";
import { project } from "../calc/projection";
import { normalizeWeights } from "../calc/returns";

const WIZARD_KEY = "jisa.wizard.v1";

export function wizardDone(): boolean {
  try {
    return localStorage.getItem(WIZARD_KEY) === "done";
  } catch {
    return true; // no storage -> don't nag on every load
  }
}

export function resetWizard(): void {
  try {
    localStorage.removeItem(WIZARD_KEY);
  } catch {
    // ignore
  }
}

function markDone(): void {
  try {
    localStorage.setItem(WIZARD_KEY, "done");
  } catch {
    // ignore
  }
}

const GIFT_OPTIONS = [100, 300, 500, 1000];

const STARTER_MIXES: {
  key: string;
  name: string;
  tagline: string;
  weights: Record<string, number>;
  classic?: boolean;
}[] = [
  {
    key: "steady",
    name: "Steady",
    tagline: "Barely wobbles, grows slowly",
    weights: { "rl-mm": 80, vuag: 20 },
  },
  {
    key: "classic",
    name: "Classic 40/60",
    tagline: "Some calm, some growth — the classic",
    weights: { "rl-mm": 40, vuag: 60 },
    classic: true,
  },
  {
    key: "bold",
    name: "Bold",
    tagline: "Biggest swings, most growing power",
    weights: { "rl-mm": 10, vuag: 90 },
  },
];

function mixRisk(weights: Record<string, number>): number {
  const ids = Object.keys(weights);
  const w = normalizeWeights(weights, ids);
  return Math.round(
    ids.reduce((a, id, i) => a + (PRODUCTS.find((p) => p.id === id)?.riskLevel ?? 1) * w[i], 0),
  );
}

export function StartHere({
  profile,
  updateProfile,
}: {
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
}) {
  const [hidden, setHidden] = useState(wizardDone);
  const [step, setStep] = useState(0);
  const [customGift, setCustomGift] = useState("");
  const [mixKey, setMixKey] = useState<string | null>(null);

  const finish = () => {
    markDone();
    setHidden(true);
  };

  const gift = profile.assumptions.annualGift;
  const dobSet = !!profile.dob;
  const age = dobSet ? ageAt(profile.dob) : null;
  const month18 = dobSet ? monthTurning(profile.dob, 18) : null;

  const reveal = useMemo(() => {
    if (!dobSet) return null;
    const now = new Date();
    const m18 = monthTurning(profile.dob, 18);
    const [y18, mm18] = m18.split("-").map(Number);
    const months = (y18 - now.getFullYear()) * 12 + (mm18 - (now.getMonth() + 1));
    if (months < 1) return null;
    const ids = Object.keys(profile.allocation).filter((id) => profile.allocation[id] > 0);
    if (ids.length === 0) return null;
    const w = normalizeWeights(profile.allocation, ids);
    const mu = ids.reduce(
      (a, id, i) => a + (PRODUCTS.find((p) => p.id === id)?.assumedReturn ?? 0) * w[i],
      0,
    );
    const sigma = ids.reduce(
      (a, id, i) => a + (PRODUCTS.find((p) => p.id === id)?.assumedVol ?? 0) * w[i],
      0,
    );
    const loggedTotal = profile.contributions.reduce((a, c) => a + c.amount, 0);
    const { points } = project({
      start: profile.startingBalance + loggedTotal,
      from: now,
      months,
      annualReturn: mu,
      annualVol: sigma,
      schedule: { monthly: 0, annualGift: gift, giftMonth: profile.assumptions.giftMonth },
    });
    const last = points[points.length - 1];
    return { mid: last.mid, low: last.low, high: last.high, paidIn: last.paidIn };
  }, [profile, gift, dobSet]);

  if (hidden) return null;

  const steps = 4;

  return (
    <section className="mx-auto max-w-6xl px-5 pt-8">
      <div className="rise rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-400/10 to-[#101b16]/60 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-amber-300">
            <Sparkles size={14} />
            New here? · step {step + 1} of {steps}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden gap-1 sm:flex">
              {Array.from({ length: steps }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-6 rounded-full ${
                    i <= step ? "bg-amber-300" : "bg-stone-100/15"
                  }`}
                />
              ))}
            </span>
            <button
              type="button"
              onClick={finish}
              className="text-xs text-stone-500 underline decoration-stone-700 underline-offset-2 transition hover:text-stone-300"
            >
              skip — I'll explore myself
            </button>
          </div>
        </div>

        <div className="mt-5">
          {step === 0 && (
            <div>
              <h2 className="font-display text-xl font-semibold sm:text-2xl">
                When were you born?
              </h2>
              <div className="mt-4 max-w-xs">
                <input
                  type="date"
                  value={profile.dob}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => e.target.value && updateProfile({ dob: e.target.value })}
                  className="field"
                />
              </div>
              {age !== null && month18 && (
                <p className="mt-3 text-sm text-stone-300 tabular">
                  You're {age}. Your JISA unlocks{" "}
                  <strong className="text-amber-200">{fmtMonth(month18)}</strong> — that's{" "}
                  {Math.max(0, 18 - age)} years of growing time.
                </p>
              )}
              <p className="mt-2 text-xs text-stone-500">
                Locked-until-18 sounds annoying, but it's the superpower: nobody can
                interrupt the compounding. Not even you.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-display text-xl font-semibold sm:text-2xl">
                How much gift money lands in a typical year?
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {GIFT_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      updateProfile({ assumptions: { ...profile.assumptions, annualGift: g } });
                      setCustomGift("");
                    }}
                    className={`rounded-full border px-4 py-2.5 text-sm transition ${
                      gift === g && customGift === ""
                        ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                        : "border-stone-100/15 text-stone-300 hover:border-stone-100/30"
                    }`}
                  >
                    {fmtGBP(g)}
                  </button>
                ))}
                <input
                  type="number"
                  min={0}
                  placeholder="or type £…"
                  value={customGift}
                  onChange={(e) => {
                    setCustomGift(e.target.value);
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 0) {
                      updateProfile({ assumptions: { ...profile.assumptions, annualGift: v } });
                    }
                  }}
                  className="field w-32"
                />
              </div>
              <p className="mt-3 text-xs text-stone-500">
                A rough guess is fine — birthdays, Christmas, grandma feeling generous.
                (The legal max is £9,000 a tax year; most people add far less.)
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-xl font-semibold sm:text-2xl">
                Pick a starter mix
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {STARTER_MIXES.map((m) => {
                  const active = mixKey === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setMixKey(m.key);
                        updateProfile({ allocation: { ...m.weights } });
                      }}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-amber-400/60 bg-amber-400/10"
                          : "border-stone-100/15 hover:border-stone-100/35"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-stone-100">{m.name}</span>
                        <RiskDial level={mixRisk(m.weights)} />
                      </div>
                      <p className="mt-1.5 text-xs text-stone-400">{m.tagline}</p>
                      <p className="mt-2 text-[11px] text-stone-500 tabular">
                        {Object.entries(m.weights)
                          .map(
                            ([id, w]) =>
                              `${w}% ${PRODUCTS.find((p) => p.id === id)?.name.split(" ")[0] ?? id}`,
                          )
                          .join(" · ")}
                      </p>
                      {m.classic && (
                        <span className="mt-2 inline-block rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">
                          the classic
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-stone-500">
                Nothing is final — the sliders in Build a Mix change this any time.
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-display text-xl font-semibold sm:text-2xl">
                Here's your first projection
              </h2>
              {reveal ? (
                <>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-300">
                    Gifts of <strong className="tabular">{fmtGBP(gift)}</strong> a year in
                    your mix could become{" "}
                    <strong className="text-2xl text-emerald-300 tabular">
                      ~{fmtGBP(reveal.mid)}
                    </strong>{" "}
                    by your 18th birthday — and you'd only have put in{" "}
                    <strong className="tabular">{fmtGBP(reveal.paidIn)}</strong>.
                  </p>
                  <p className="mt-2 text-xs text-stone-500 tabular">
                    Realistically somewhere between {fmtGBP(reveal.low)} and{" "}
                    {fmtGBP(reveal.high)} — a range, not a promise.
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm text-stone-400">
                  Set your birthday (step 1) and pick a mix (step 3) to see your number.
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href="#projection"
                  onClick={finish}
                  className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-200 transition hover:bg-emerald-400/20"
                >
                  How did you get that number?
                </a>
                <a
                  href="#products"
                  onClick={finish}
                  className="rounded-full border border-stone-100/20 px-4 py-2.5 text-sm text-stone-300 transition hover:border-emerald-400/40"
                >
                  Meet your three funds
                </a>
                <button
                  type="button"
                  onClick={finish}
                  className="rounded-full border border-stone-100/20 px-4 py-2.5 text-sm text-stone-300 transition hover:border-emerald-400/40"
                >
                  Done — explore freely
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-stone-100/10 pt-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`inline-flex items-center gap-1.5 text-xs transition ${
              step === 0 ? "invisible" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <ArrowLeft size={13} /> back
          </button>
          {step < steps - 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 2 && mixKey === null}
              className="rounded-full border border-amber-400/50 bg-amber-400/15 px-5 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-400/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === 2 ? "Show me my number" : "Next"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
