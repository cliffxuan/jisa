import { DATA_AS_OF } from "../data";

export function Footer() {
  return (
    <footer className="border-t border-emerald-100/10 py-12">
      <div className="mx-auto max-w-6xl space-y-6 px-5 text-xs leading-relaxed text-stone-500">
        <div className="rounded-2xl border border-stone-100/10 bg-stone-100/5 p-5">
          <p className="font-semibold text-stone-300">The small print, in plain English</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              This is an educational planning toy built by a parent —{" "}
              <strong>not financial advice</strong>. Decisions are yours (and until
              18, legally the registered contact's).
            </li>
            <li>
              <strong>Past performance doesn't predict the future.</strong> Every
              backtest and every shuffled future here is history wearing a costume.
            </li>
            <li>
              Simplifications we made: accumulation-class prices stand in for total
              returns; mixes are rebalanced monthly for free; fund charges are in the
              prices but platform fees aren't; the £9,000 cap is applied by calendar
              month, not exact day.
            </li>
            <li>
              Prices come from Yahoo Finance, refreshed roughly every 12 hours, and
              occasionally contain glitches we try to scrub. Fund data as of{" "}
              {DATA_AS_OF}. Check the HL factsheets before buying anything.
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href="https://algoentropy.com"
            className="font-mono tracking-[0.25em] text-stone-400 transition hover:text-emerald-300"
          >
            ALGOENTROPY · JISA
          </a>
          <span>
            Built for two future investors, ages 15 and 13 · prices via Yahoo Finance ·
            products via{" "}
            <a
              href="https://www.hl.co.uk/investment-services/junior-isa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 underline decoration-stone-700 underline-offset-2 hover:text-emerald-300"
            >
              HL Junior ISA
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
