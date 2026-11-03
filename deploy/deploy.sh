#!/usr/bin/env bash
# Deploy / reload Paddock Parking PMS on this server.
# Does not restart or modify other PM2 processes.
set -euo pipefail

APP_ROOT="/var/www/paddock-pms"
BRANCH="${BRANCH:-main}"

cd "${APP_ROOT}"

echo "[paddock-pms] fetching ${BRANCH}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"

if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@9
fi

echo "[paddock-pms] install + build"
cd "${APP_ROOT}"
pnpm install --frozen-lockfile
pnpm --filter @paddockparking/api build
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-/api}" pnpm --filter @paddockparking/web build

echo "[paddock-pms] reload PM2 (paddock apps only)"
mkdir -p "${APP_ROOT}/logs"
cd "${APP_ROOT}"
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save

echo "[paddock-pms] health checks"
ok=0
for _ in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:4040/health" >/dev/null; then
    ok=1
    break
  fi
  sleep 2
done
[[ "$ok" -eq 1 ]] || (echo "API health failed" && exit 1)
curl -fsS "http://127.0.0.1:4040/health"
echo
curl -fsS -o /dev/null -w "web:%{http_code}\n" "http://127.0.0.1:3040/" || true

echo "[paddock-pms] deploy complete"
pm2 list | grep paddock || true
