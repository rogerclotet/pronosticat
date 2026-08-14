#!/usr/bin/env bash
set -euo pipefail

# One-shot dump using the prod backup container (same pg_dump version as Postgres 16).
# Run from the compose project directory on the server.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f compose.yaml -f compose.prod.yaml)

mkdir -p "${POSTGRES_BACKUP_DIR:-./backups}"

"${COMPOSE[@]}" run --rm --no-deps --entrypoint sh backup /backup/run.sh
