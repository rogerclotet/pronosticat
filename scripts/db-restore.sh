#!/usr/bin/env bash
set -euo pipefail

# Restore a custom-format dump produced by scripts/backup/run.sh.
# Stops the app first so pg_restore can drop objects cleanly.
#
#   DB_RESTORE_CONFIRM=yes ./scripts/db-restore.sh backups/pronosticat-YYYYMMDDTHHMMSSZ.dump

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${POSTGRES_BACKUP_DIR:-./backups}"
COMPOSE=(docker compose -f compose.yaml -f compose.prod.yaml)

if [ "${1:-}" = "" ] || [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  echo "Usage: DB_RESTORE_CONFIRM=yes $0 <dump-file>"
  echo
  echo "Available dumps in ${BACKUP_DIR}:"
  ls -1t "${BACKUP_DIR}"/pronosticat-*.dump 2>/dev/null || echo "(none)"
  exit 1
fi

if [ "${DB_RESTORE_CONFIRM:-}" != "yes" ]; then
  echo "Refusing to restore. Set DB_RESTORE_CONFIRM=yes to proceed." >&2
  exit 1
fi

dump="$1"
if [ ! -f "$dump" ]; then
  if [ -f "${BACKUP_DIR}/$(basename "$dump")" ]; then
    dump="${BACKUP_DIR}/$(basename "$dump")"
  else
    echo "Dump not found: $dump" >&2
    exit 1
  fi
fi

dump_abs="$(cd "$(dirname "$dump")" && pwd)/$(basename "$dump")"
backup_abs="$(cd "$BACKUP_DIR" && pwd)"
case "$dump_abs" in
  "$backup_abs"/*) ;;
  *)
    echo "Dump must live under ${BACKUP_DIR} so the db container can read it." >&2
    exit 1
    ;;
esac

container_path="/backups/$(basename "$dump")"

echo "Stopping app and backup sidecar..."
"${COMPOSE[@]}" stop app backup

restore_ok=0
if "${COMPOSE[@]}" exec -T db sh -c \
  'pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$1"' \
  restore "$container_path"; then
  restore_ok=1
fi

echo "Starting app and backup sidecar..."
if ! "${COMPOSE[@]}" up -d --wait --wait-timeout 120 app backup; then
  echo "Warning: stack did not become healthy after restore." >&2
fi

if [ "$restore_ok" -ne 1 ]; then
  echo "Restore failed. The app was started again; check logs before serving traffic." >&2
  exit 1
fi

echo "Restore complete: $(basename "$dump")"
