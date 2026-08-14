#!/usr/bin/env bash
set -euo pipefail

# Deploy the commit CI just tested over SSH using a private key and a pinned
# host key. Password auth is intentionally not supported.

require() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "$name is not set" >&2
    exit 1
  fi
}

require SSH_USERNAME
require SSH_PROJECT_DIRECTORY

SSH_HOST="${SSH_HOST:-${SSH_IP:-}}"
if [ -z "$SSH_HOST" ]; then
  echo "SSH_HOST or SSH_IP is not set" >&2
  exit 1
fi

APP_PORT="${APP_PORT:-${PORT:-}}"
if [ -z "$APP_PORT" ]; then
  echo "APP_PORT or PORT is not set" >&2
  exit 1
fi

SSH_PORT="${SSH_PORT:-22}"
DEPLOY_SHA="${DEPLOY_SHA:-}"

if [ -z "${SSH_PRIVATE_KEY:-}" ] && [ -z "${SSH_PRIVATE_KEY_FILE:-}" ]; then
  echo "SSH_PRIVATE_KEY or SSH_PRIVATE_KEY_FILE is required" >&2
  exit 1
fi

if [ -z "${SSH_KNOWN_HOSTS:-}" ] && [ -z "${SSH_KNOWN_HOSTS_FILE:-}" ]; then
  echo "SSH_KNOWN_HOSTS or SSH_KNOWN_HOSTS_FILE is required" >&2
  exit 1
fi

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT
umask 077

if [ -n "${SSH_PRIVATE_KEY:-}" ]; then
  printf '%s\n' "$SSH_PRIVATE_KEY" | tr -d '\r' >"$tmp/id"
else
  tr -d '\r' <"$SSH_PRIVATE_KEY_FILE" >"$tmp/id"
fi
chmod 600 "$tmp/id"

if [ -n "${SSH_KNOWN_HOSTS:-}" ]; then
  printf '%s\n' "$SSH_KNOWN_HOSTS" | tr -d '\r' >"$tmp/known_hosts"
else
  tr -d '\r' <"$SSH_KNOWN_HOSTS_FILE" >"$tmp/known_hosts"
fi
chmod 644 "$tmp/known_hosts"

if [ ! -s "$tmp/id" ]; then
  echo "SSH private key is empty" >&2
  exit 1
fi
if [ ! -s "$tmp/known_hosts" ]; then
  echo "SSH known_hosts is empty" >&2
  exit 1
fi

quote() {
  printf '%q' "$1"
}

remote_cmd="PROJECT_DIR=$(quote "$SSH_PROJECT_DIRECTORY") APP_PORT=$(quote "$APP_PORT") DEPLOY_SHA=$(quote "$DEPLOY_SHA") sh -s"

ssh \
  -i "$tmp/id" \
  -p "$SSH_PORT" \
  -o IdentitiesOnly=yes \
  -o UserKnownHostsFile="$tmp/known_hosts" \
  -o GlobalKnownHostsFile=/dev/null \
  -o StrictHostKeyChecking=yes \
  -o BatchMode=yes \
  -o ConnectTimeout=15 \
  "${SSH_USERNAME}@${SSH_HOST}" \
  "$remote_cmd" <<'REMOTE'
set -eu

cd "$PROJECT_DIR"

git fetch --prune origin
if [ -n "$DEPLOY_SHA" ]; then
  git fetch origin "$DEPLOY_SHA"
  git checkout --force -B main "$DEPLOY_SHA"
  git reset --hard "$DEPLOY_SHA"
else
  git checkout --force main
  git reset --hard origin/main
fi

echo "Deploying $(git rev-parse HEAD) to $PROJECT_DIR"

# Clean up before building too: if disk is already near full, the cleanup at
# the end of a previous deploy never gets a chance to run because the build
# itself fails first. These are safe pre-build (they never touch images or
# cache still in use).
docker container prune -f || true
docker image prune -f || true
docker builder prune -f --filter "until=24h" || true

export APP_PORT
docker compose -f compose.yaml -f compose.prod.yaml up -d --build --remove-orphans --wait --wait-timeout 180 app backup cron

# Old app/migrate/cron images are no longer referenced by any container at
# this point, so -a (not just dangling) is safe here.
docker image prune -af
docker builder prune -f --filter "until=24h" || true
docker volume prune -f || true
REMOTE
