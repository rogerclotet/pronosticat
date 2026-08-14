#!/bin/sh
set -eu

echo "[backup] sidecar starting (interval=${BACKUP_INTERVAL_SECONDS:-86400}s)"

# Postgres can report healthy before it accepts dump connections on a cold start.
attempt=1
until sh /backup/run.sh; do
  if [ "$attempt" -ge 5 ]; then
    echo "[backup] initial dump failed after ${attempt} attempts; retrying on the interval" >&2
    break
  fi
  attempt=$((attempt + 1))
  sleep 5
done

while true; do
  sleep "${BACKUP_INTERVAL_SECONDS:-86400}"
  sh /backup/run.sh || echo "[backup] dump failed; will retry after the interval" >&2
done
