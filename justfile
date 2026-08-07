# Grow It — the Junior ISA planner. Common tasks.
# Run `just` to list recipes.

set shell := ["bash", "-uc"]

port := "8000"

# List available recipes
default:
    @just --list

# Install all dependencies (frontend npm + backend uv)
install:
    cd frontend && npm install
    uv sync

# Frontend dev server with HMR (proxies /api -> backend on :{{port}})
frontend:
    cd frontend && npm run dev

# Backend dev server with autoreload (serves /api/history; SPA if dist exists)
backend:
    uv run uvicorn main:app --reload --port {{port}}

# Full local dev: backend + frontend together (Ctrl-C stops both)
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    trap 'kill 0' EXIT
    uv run uvicorn main:app --reload --port {{port}} &
    cd frontend && npm run dev
    wait

# Build the frontend into frontend/dist
build:
    cd frontend && npm run build

# Type-check the frontend (no emit)
typecheck:
    cd frontend && npx tsc -b

# Production-like: build the SPA, then serve SPA + API from one uvicorn on :{{port}}
serve: build
    uv run uvicorn main:app --port {{port}}

# Mirror the canonical data file into the frontend source tree
sync-data:
    cp data/products.json frontend/src/products.json
    @echo "synced data/products.json -> frontend/src/products.json"

# Peek at the live history endpoint locally (backend must be running)
history:
    curl -s http://localhost:{{port}}/api/history | python3 -m json.tool | head -40

# Deploy to the Dokku host (builds in-container, no local build needed)
deploy:
    git push oc main
