#!/bin/sh
set -eu

# Custom-format dump (compressed, pg_restore-friendly) into /backups.
# Used by the prod sidecar and by scripts/db-backup.sh.

BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
KEEP_MIN="${BACKUP_KEEP_MIN:-3}"
PREFIX="${BACKUP_PREFIX:-pronosticat}"

mkdir -p "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="${BACKUP_DIR}/${PREFIX}-${stamp}.dump"
tmp="${file}.tmp"

echo "[backup] dumping ${PGDATABASE:-postgres} to ${file}"

pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$tmp"

pg_restore --list "$tmp" >/dev/null
mv "$tmp" "$file"

echo "[backup] wrote $(wc -c <"$file") bytes"

now="$(date -u +%s)"
keep_seconds=$((KEEP_DAYS * 86400))
index=0

# Newest first: never delete the first KEEP_MIN; delete the rest if older than KEEP_DAYS.
ls -1t "${BACKUP_DIR}/${PREFIX}-"*.dump 2>/dev/null | while IFS= read -r dump; do
  index=$((index + 1))
  if [ "$index" -le "$KEEP_MIN" ]; then
    continue
  fi
  mtime="$(stat -c %Y "$dump")"
  age=$((now - mtime))
  if [ "$age" -gt "$keep_seconds" ]; then
    echo "[backup] removing expired $dump"
    rm -f "$dump"
  fi
done

echo "[backup] done"
