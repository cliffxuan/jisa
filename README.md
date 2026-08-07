# Grow It — the Junior ISA planner

Live at **[jisa.algoentropy.com](https://jisa.algoentropy.com)**.

A planner built for two young savers putting grandparents' gift money into
[Hargreaves Lansdown Junior ISAs](https://www.hl.co.uk/investment-services/junior-isa):

- **Learn** — what a JISA is, what risk means, why compounding is the slow magic.
- **The funds** — 12 curated HL-JISA-eligible funds/ETFs with plain-English risk
  cards, from a money-market fund (risk 1) to the Nasdaq 100 (risk 7).
- **Build a mix** — per-child weighted portfolios with presets.
- **Look back** — backtest the mix through real monthly history: drawdowns,
  best/worst years, always compared against "just the money-market fund".
- **Look forward** — project to age 18: expected band, or 1,000
  bootstrap-resampled futures with a probability of loss.
- **Your plan** — log actual gifts per child against the £9,000/tax-year
  allowance; actual-vs-expected trajectory to 18. Stored in localStorage only,
  with JSON export/import.

## Stack

FastAPI (`main.py`) proxies+caches Yahoo Finance monthly closes; Vite + React
19 + TypeScript + Tailwind v4 + Recharts SPA does all the maths client-side.
One container serves both.

## Develop

```bash
just install   # npm + uv deps
just dev       # backend :8000 + frontend :5173 (HMR, /api proxied)
just serve     # production-like: build SPA, serve everything on :8000
```

## Deploy

```bash
just deploy    # git push oc main → Dokku builds the Dockerfile
```

See `AGENTS.md` for the full map (data pipeline quirks, conventions, gotchas).

*Educational tool, not financial advice. Past performance is not a guide to
future returns.*
