from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="JISA · Junior ISA planner")

ROOT = Path(__file__).parent
PRODUCTS: list[dict] = json.loads((ROOT / "data" / "products.json").read_text())[
    "products"
]

YF_CHART_URL = (
    "https://query1.finance.yahoo.com/v8/finance/chart/"
    "{ticker}?range=max&interval=1mo"
)
# Yahoo 429s anonymous urllib UAs — identify ourselves like a browser.
UA = "Mozilla/5.0 (jisa.algoentropy.com planner; cliff.xuan@gresearch.co.uk)"
CACHE_TTL = 12 * 3600.0  # monthly closes change at most daily
RETRY_BACKOFF = 300.0  # after a failed fetch, wait before hitting Yahoo again

# ticker -> {"ts": float, "data": dict | None, "err": str | None}
_hist_cache: dict[str, dict] = {}


def _http_json(url: str, *, timeout: int = 10) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def _repair_unit_glitches(closes: list[float]) -> list[float]:
    """Yahoo LSE series occasionally flip between pence and pounds mid-series;
    a genuine ±99% month never happens for these funds, so treat any 100x jump
    as a unit flip. Anchor on the most recent bars (meta.currency describes how
    the ticker quotes *now*) and rescale earlier segments to match."""
    if not closes:
        return []
    out = [0.0] * len(closes)
    out[-1] = closes[-1]
    scale = 1.0
    for i in range(len(closes) - 2, -1, -1):
        candidate = closes[i] * scale
        nxt = out[i + 1]
        if nxt > 0 and candidate / nxt > 50:
            scale /= 100.0
        elif nxt > 0 and 0 < candidate / nxt < 0.02:
            scale *= 100.0
        out[i] = closes[i] * scale
    return out


def _despike(closes: list[float]) -> list[float]:
    """Remove lone bad prints: a bar that jumps ≥35% from its neighbours and
    fully reverts the next month is vendor junk, not a market move (a genuine
    crash doesn't unwind next month). Replace with the neighbours' geometric
    mean."""
    out = list(closes)
    for i in range(1, len(out) - 1):
        prev, cur, nxt = out[i - 1], out[i], out[i + 1]
        if prev <= 0 or nxt <= 0:
            continue
        r1, r2 = cur / prev, cur / nxt
        if (r1 > 1.35 and r2 > 1.35) or (r1 < 0.74 and r2 < 0.74):
            out[i] = round((prev * nxt) ** 0.5, 4)
    return out


def _fetch_monthly(ticker: str, history_from: str | None = None) -> dict:
    res = _http_json(YF_CHART_URL.format(ticker=ticker))
    result = (res.get("chart") or {}).get("result")
    if not result:
        err = ((res.get("chart") or {}).get("error") or {}).get("description")
        raise ValueError(err or "no chart result")
    r = result[0]
    meta = r.get("meta") or {}
    timestamps = r.get("timestamp") or []
    indicators = r.get("indicators") or {}
    adj = (indicators.get("adjclose") or [{}])[0].get("adjclose")
    quote = (indicators.get("quote") or [{}])[0].get("close")
    closes_raw = adj or quote or []

    # Yahoo sometimes returns sub-monthly bars even with interval=1mo;
    # collapse to one bar per calendar month, keeping the last.
    by_month: dict[str, float] = {}
    for ts, close in zip(timestamps, closes_raw):
        if close is None:
            continue
        by_month[time.strftime("%Y-%m", time.gmtime(ts))] = float(close)
    by_month.pop(time.strftime("%Y-%m", time.gmtime()), None)  # partial month

    months = sorted(by_month)
    closes = [by_month[m] for m in months]
    if meta.get("currency") == "GBp":
        closes = [c / 100.0 for c in closes]
    closes = [round(c, 4) for c in _repair_unit_glitches(closes)]
    closes = _despike(closes)
    # The inception-month bar is often a partial month at a sparse-trading
    # price (FWRG's first bar implies a fake +20% month) — drop it.
    months, closes = months[1:], closes[1:]
    if history_from:  # trim known-bad early segments (see products.json)
        keep = [i for i, m in enumerate(months) if m >= history_from]
        months = [months[i] for i in keep]
        closes = [closes[i] for i in keep]
    return {"ticker": ticker, "currency": "GBP", "months": months, "closes": closes}


@app.get("/api/history")
def history() -> JSONResponse:
    now = time.time()
    series: dict[str, dict] = {}
    errors: dict[str, str] = {}
    for product in PRODUCTS:
        pid, ticker = product["id"], product["ticker"]
        entry = _hist_cache.get(ticker)
        if entry is None or now - entry["ts"] > CACHE_TTL:
            try:
                entry = {
                    "ts": now,
                    "data": _fetch_monthly(ticker, product.get("historyFrom")),
                    "err": None,
                }
            except Exception as exc:  # noqa: BLE001 — serve stale over a 500
                stale = entry["data"] if entry else None
                entry = {
                    "ts": now - CACHE_TTL + RETRY_BACKOFF,
                    "data": stale,
                    "err": str(exc) or exc.__class__.__name__,
                }
            _hist_cache[ticker] = entry
        if entry["data"] is not None:
            series[pid] = entry["data"]
        else:
            errors[pid] = entry["err"] or "no data"
    return JSONResponse(
        {
            "updated": int(now),
            "products": [p["id"] for p in PRODUCTS],
            "series": series,
            "errors": errors,
        }
    )


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


DIST = ROOT / "frontend" / "dist"
if DIST.is_dir():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="spa")
