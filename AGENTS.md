# Grow It — the Junior ISA planner (jisa.algoentropy.com)

A teen-friendly single-page app for two kids (born ~2010 and ~2012) saving
grandparents' gift money into Hargreaves Lansdown Junior ISAs. It teaches the
basics (JISA rules, risk, compounding), presents 12 curated HL-JISA-eligible
funds/ETFs, and lets each child build a weighted mix, **backtest** it against
real monthly history, **project** it to age 18 (deterministic band + bootstrap
Monte Carlo), and **log real contributions** against the £9,000/tax-year cap.

Sibling of `~/dev/spacex` (spacex.algoentropy.com) — same stack, same layout,
same deploy pattern. When in doubt, do what spacex does.

## Stack & layout

- **Backend**: FastAPI in a single `main.py`; deps are `fastapi` +
  `uvicorn[standard]` only. Outbound HTTP via stdlib `urllib.request` — no
  extra Python deps.
- **Frontend**: `frontend/` — Vite 7 + React 19 + TypeScript (strict) +
  Tailwind v4 (`@tailwindcss/vite`) + Recharts 2 + lucide-react. SPA, no
  router; in-page anchor sections wired through `App.tsx` and the `ITEMS`
  array in `components/Nav.tsx`.
- **Calculations all live in `frontend/src/calc/`** (returns, jisa tax-year
  rules, projection, montecarlo, backtest) as pure React-free modules. The
  backend only fetches/normalizes/caches prices. Keep it that way.
- **Profiles** (per-child name, dob, allocation, contribution log) live in
  localStorage under `jisa.profiles.v1` (`src/storage.ts`), with JSON
  export/import. No accounts, no server-side storage.

## The one easy mistake

`data/products.json` is the canonical product list (tickers, risk levels,
teen-friendly copy, HL links). It is **mirrored** to
`frontend/src/products.json` and imported at build time. After editing, run
`just sync-data` — the two files must stay identical. The backend reads the
canonical one at startup; the frontend bundles the mirror.

## API

- `GET /api/history` → `{updated, products: [ids], series: {id: {ticker,
  currency: "GBP", months: ["YYYY-MM", ...], closes: [...]}}, errors: {id:
  reason}}`. Parallel arrays, month-aligned. Partial upstream failure never
  500s — failed ids land in `errors` and the frontend degrades per-product.
- `GET /healthz` → `{"status": "ok"}`.

Data pipeline notes (all in `main.py`):
- Yahoo chart API (`range=max&interval=1mo`) sometimes returns sub-monthly
  bars — they're collapsed to last-bar-per-month. The current partial month is
  dropped.
- LSE quirks: `meta.currency == "GBp"` means pence (÷100). Series can also
  flip pence/pounds **mid-series** (FWRG does) — `_repair_unit_glitches`
  rescales, anchored on the most recent bars. Lone 100%-and-back spikes are
  scrubbed by `_despike` (CNX1 2011-03 was one). Known-bad early segments are
  trimmed via an optional `historyFrom` field in products.json (CNX1 pre
  2010-09 is junk).
- Yahoo 429s anonymous urllib user agents — keep the identifying `UA` header.
- Cache: per-ticker in-memory, 12 h TTL, serves stale on failure with a 5 min
  retry backoff.
- OEIC funds use Yahoo `0P…` tickers (e.g. Royal London MMF =
  `0P0000Z8P7.L`); resolve them by ISIN via
  `https://query1.finance.yahoo.com/v1/finance/search?q=<ISIN>`.

## Tasks (`just`)

`install`, `dev` (backend :8000 + Vite :5173 with `/api` proxy), `backend`,
`frontend`, `build`, `typecheck`, `serve` (production-like single process),
`sync-data`, `history` (curl the endpoint), `deploy`.

## Deploy

Dokku on `nuoya.co.uk`, app `jisa`, domain `jisa.algoentropy.com` (TLS via
dokku-letsencrypt, configured on the host, not in this repo). Remote `oc` =
`dokku@nuoya.co.uk:jisa`; `just deploy` = `git push oc main`, which builds the
Dockerfile in-container. If a GitHub mirror is added later, beware the spacex
two-remote gotcha (divergent root commits — cherry-pick to mirror, don't
force-push).

## Conventions

- Sections are `components/<Name>.tsx` exporting a named function, composed
  from the `Section`/`Card`/`Stat`/`Pill` primitives in `Section.tsx`. Adding
  a section = new file + wire into `App.tsx` + add to Nav `ITEMS`.
- Chart colors/tooltip/axis styles come from `src/chartTheme.ts` — don't
  invent new ones per chart. Emerald = the mix, sky = money-market
  comparison, stone dashed = money paid in, amber = the age-18 moment, rose =
  drawdowns/warnings.
- Dark-only, Fraunces display font + Instrument Sans body (Google Fonts in
  `index.html`), tabular figures via `.tabular`.
- Tone of copy: written *to the teenager*, plain English, honest about risk
  (see the Footer's "small print"). Every product card links its HL
  factsheet; anything simulated or assumed is labelled as such.
- Simplifications are deliberate and documented in the Footer: acc-class
  price return ≈ total return, monthly free rebalancing, platform fees
  excluded, cap applied by calendar month.
