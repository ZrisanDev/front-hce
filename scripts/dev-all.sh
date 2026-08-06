#!/usr/bin/env bash
# Dev launcher for the HCE Multi-Zones monorepo.
# Starts the shell (3000) and the four zones in parallel:
#   shell=3000  productos=3001  compras=3002  ventas=3003  kardex=3004
# Ctrl-C stops every process (trapped via wait).
set -euo pipefail

echo "[dev-all] shell=3000 productos=3001 compras=3002 ventas=3003 kardex=3004"

bun --cwd apps/shell dev &
bun --cwd apps/mf-productos dev &
bun --cwd apps/mf-compras dev &
bun --cwd apps/mf-ventas dev &
bun --cwd apps/mf-kardex dev &

trap 'echo "[dev-all] stopping all zones..."; kill 0' INT TERM
wait
