#!/bin/sh
set -eu

URL="${CRON_URL:-http://app:3000/api/cron/sync}"
SCHEDULE="${CRON_SCHEDULE:-*/10 * * * *}"
AUTH_FILE=/run/cron-auth-header

umask 077
printf 'Authorization: Bearer %s' "${CRON_SECRET:-}" > "$AUTH_FILE"
printf 'CRON_URL=%s\n' "$URL" > /run/cron.env

cat > /usr/local/bin/pronosticat-sync <<'SCRIPT'
#!/bin/sh
. /run/cron.env
echo "[pronosticat-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ) GET $CRON_URL"
if /usr/bin/curl -fsS -H "$(cat /run/cron-auth-header)" "$CRON_URL"; then
  echo
  echo "[pronosticat-cron] ok"
else
  status=$?
  echo "[pronosticat-cron] failed (exit ${status})" >&2
  exit "$status"
fi
SCRIPT
chmod +x /usr/local/bin/pronosticat-sync

echo "[pronosticat-cron] schedule: ${SCHEDULE}"
# A deploy should not wait up to 10 minutes for the first sync.
/usr/local/bin/pronosticat-sync || true

printf '%s\n' "${SCHEDULE} /usr/local/bin/pronosticat-sync" > /etc/crontabs/root
exec crond -f -d 8
