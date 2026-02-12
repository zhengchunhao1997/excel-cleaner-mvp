#!/usr/bin/env bash
set -euo pipefail

API_BASE="${VITE_API_BASE:-http://8.138.35.89}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/release/artifacts"

mkdir -p "$OUT_DIR"

cd "$ROOT_DIR/server"
npm run build

cd "$ROOT_DIR/extension"
VITE_API_BASE="$API_BASE" npm run build

cd "$ROOT_DIR"

tar -czf "$OUT_DIR/server.tar.gz" \
  -C server \
  dist package.json package-lock.json run.sh .env.production.example sql

tar -czf "$OUT_DIR/frontend.tar.gz" \
  -C extension \
  dist .env.production.example

ls -lh "$OUT_DIR"
