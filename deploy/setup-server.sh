#!/usr/bin/env bash
# One-time server bootstrap for Paddock Parking PMS.
# Safe: creates isolated dirs/ports; does not modify other PM2 apps or nginx sites.
set -euo pipefail

APP_ROOT="/var/www/paddock-pms"
REPO_URL="${REPO_URL:-https://github.com/Davidmolo/Paddock_Parking.git}"
BRANCH="${BRANCH:-main}"

echo "[paddock-pms] bootstrap → ${APP_ROOT}"

sudo mkdir -p "${APP_ROOT}" "${APP_ROOT}/logs"
sudo chown -R "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "${APP_ROOT}"

if [[ ! -d "${APP_ROOT}/.git" ]]; then
  git clone --branch "${BRANCH}" --single-branch "${REPO_URL}" "${APP_ROOT}"
else
  echo "[paddock-pms] repo already present"
fi

mkdir -p "${APP_ROOT}/apps/api" "${APP_ROOT}/apps/web" "${APP_ROOT}/logs" "${APP_ROOT}/deploy"

# Nginx template (not enabled until domain is set)
if [[ -f "${APP_ROOT}/deploy/nginx.paddock-pms.conf" ]]; then
  sudo cp "${APP_ROOT}/deploy/nginx.paddock-pms.conf" /etc/nginx/sites-available/paddock-pms
  echo "[paddock-pms] nginx site installed to sites-available (not enabled — domain pending)"
fi

# Env templates if missing
if [[ ! -f "${APP_ROOT}/apps/api/.env" ]]; then
  cat > "${APP_ROOT}/apps/api/.env" <<'EOF'
PORT=4040
NODE_ENV=production
CORS_ORIGIN=https://pms.paddockparking.com
EOF
  echo "[paddock-pms] wrote apps/api/.env template"
fi

if [[ ! -f "${APP_ROOT}/apps/web/.env.production" ]]; then
  cat > "${APP_ROOT}/apps/web/.env.production" <<'EOF'
NEXT_PUBLIC_API_URL=/api
EOF
fi

echo "[paddock-pms] bootstrap done"
echo "Next: enable nginx for pms.paddockparking.com, then CI deploy or deploy/deploy.sh"
