const ITEMS = [
  { id: "learn", label: "Learn" },
  { id: "products", label: "The Funds" },
  { id: "builder", label: "Build a Mix" },
  { id: "backtest", label: "Look Back" },
  { id: "projection", label: "Look Forward" },
  { id: "plan", label: "Your Plan" },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-emerald-100/10 bg-[#0a1210]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto px-5 py-3 scrollbar-thin">
        <a
          href="#top"
          className="shrink-0 font-mono text-xs font-semibold tracking-[0.25em] text-emerald-300"
        >
          GROW·IT
        </a>
        <div className="flex shrink-0 gap-1">
          {ITEMS.map((it) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              className="rounded-full px-3 py-1.5 text-xs text-stone-400 transition hover:bg-emerald-100/10 hover:text-stone-100"
            >
              {it.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
