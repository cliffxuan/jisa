import type { ReactNode } from "react";
import { Sprout, Lock, PiggyBank, Sparkles } from "lucide-react";
import type { Profile } from "../storage";
import { ageAt } from "../calc/jisa";
import { JISA_LIMIT, fmtGBP } from "../data";

export function Hero({ profiles }: { profiles: Profile[] }) {
  return (
    <header className="graph-bg relative overflow-hidden border-b border-emerald-100/10">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-20 sm:pb-24 sm:pt-28">
        <div className="rise flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-emerald-400/80">
          <Sprout size={14} />
          jisa.algoentropy.com
        </div>
        <h1
          className="font-display rise mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl"
          style={{ animationDelay: "0.08s" }}
        >
          Grow it<span className="text-emerald-400">.</span>
        </h1>
        <p
          className="rise mt-5 max-w-2xl text-lg text-stone-300 sm:text-xl"
          style={{ animationDelay: "0.16s" }}
        >
          Birthday money can sit in a drawer, or it can spend the next few years
          quietly working for you. This is your planner for a{" "}
          <strong className="text-stone-100">Junior ISA</strong> — pick real funds,
          rewind history to see how they behaved, and fast-forward to 18.
        </p>

        <div
          className="rise mt-10 grid gap-4 sm:grid-cols-3"
          style={{ animationDelay: "0.24s" }}
        >
          <RuleCard
            icon={<Lock size={16} className="text-amber-300" />}
            title="Locked until 18"
            body="Nobody can raid it — not even you. At 18 it becomes your adult ISA."
          />
          <RuleCard
            icon={<PiggyBank size={16} className="text-emerald-300" />}
            title={`${fmtGBP(JISA_LIMIT)} a tax year`}
            body="The most anyone can add each tax year (6 April to 5 April)."
          />
          <RuleCard
            icon={<Sparkles size={16} className="text-sky-300" />}
            title="0% tax, forever"
            body="No tax on growth, dividends or withdrawals. Ever. That's the superpower."
          />
        </div>

        {profiles.length > 0 && (
          <div
            className="rise mt-8 flex flex-wrap gap-2"
            style={{ animationDelay: "0.32s" }}
          >
            {profiles.map((p) => {
              const age = ageAt(p.dob);
              return (
                <a
                  key={p.id}
                  href="#plan"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-100/15 bg-emerald-400/5 px-4 py-2 text-sm text-stone-200 transition hover:border-emerald-400/40"
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-stone-500 tabular">
                    {age} · {Math.max(0, 18 - age)} yrs to 18
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

function RuleCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100/10 bg-[#0a1210]/70 p-5 backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-100">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-stone-400">{body}</p>
    </div>
  );
}
