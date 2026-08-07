import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

interface Props {
  id: string;
  eyebrow: string;
  title: string;
  blurb?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ id, eyebrow, title, blurb, children, className = "" }: Props) {
  return (
    <section id={id} className={`scroll-mt-20 py-16 sm:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-10">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-400/80">
            {eyebrow}
          </div>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {blurb && <p className="mt-3 max-w-2xl text-stone-400">{blurb}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-emerald-100/10 bg-gradient-to-b from-[#101b16]/90 to-[#0a1210]/90 p-6 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent = "text-stone-100",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-xs uppercase tracking-wider text-stone-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular sm:text-3xl ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </div>
  );
}

export function SourceLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-emerald-400 underline decoration-emerald-700/50 underline-offset-2 transition hover:text-emerald-300 ${className}`}
    >
      {children}
      <ExternalLink size={11} />
    </a>
  );
}

/** Pill-style toggle button used for presets, filters and mode switches. */
export function Pill({
  active,
  onClick,
  children,
  tone = "emerald",
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: "emerald" | "amber";
}) {
  const activeCls =
    tone === "emerald"
      ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200"
      : "border-amber-400/60 bg-amber-400/15 text-amber-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? activeCls
          : "border-stone-100/15 text-stone-400 hover:border-stone-100/30 hover:text-stone-200"
      }`}
    >
      {children}
    </button>
  );
}
