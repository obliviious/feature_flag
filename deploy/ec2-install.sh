#!/usr/bin/env bash
# Download the latest flagforge-server binary from GitHub Releases into the repo root
# and restart the backend. Run on EC2 (no Rust required).
#
# Usage (from repo root):
#   ./deploy/ec2-install.sh
#
# Download only (no restart):
#   SKIP_RESTART=1 ./deploy/ec2-install.sh
#
# Private repo: export GITHUB_TOKEN="ghp_..."

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${INSTALL_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
GITHUB_REPO="${GITHUB_REPO:-obliviious/feature_flag}"
RELEASE_TAG="${RELEASE_TAG:-latest-build}"
BINARY_NAME="flagforge-server"
LOG_FILE="${LOG_FILE:-flagforge.log}"
PID_FILE="${PID_FILE:-flagforge-server.pid}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/health}"

cd "$INSTALL_DIR"

AUTH_HEADER=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

echo "Downloading ${BINARY_NAME} from ${GITHUB_REPO} (${RELEASE_TAG})..."
echo "Install directory: ${INSTALL_DIR}"

curl -fsSL "${AUTH_HEADER[@]}" \
  -o "${BINARY_NAME}" \
  "https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${BINARY_NAME}"

curl -fsSL "${AUTH_HEADER[@]}" \
  -o "${BINARY_NAME}.sha256" \
  "https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${BINARY_NAME}.sha256"

sha256sum -c "${BINARY_NAME}.sha256"
chmod +x "${BINARY_NAME}"

echo ""
echo "Installed: ${INSTALL_DIR}/${BINARY_NAME}"

if [[ "${SKIP_RESTART:-0}" == "1" ]]; then
  echo "SKIP_RESTART=1 — not starting server."
  exit 0
fi

# Ensure .env exists in the run directory (dotenv loads from CWD)
if [[ ! -f "${INSTALL_DIR}/.env" ]]; then
  if [[ -f "${INSTALL_DIR}/apps/server/.env" ]]; then
    echo "No .env in repo root — copying apps/server/.env → .env"
    cp "${INSTALL_DIR}/apps/server/.env" "${INSTALL_DIR}/.env"
  else
    echo "Error: .env not found. Create ${INSTALL_DIR}/.env (see .env.example)" >&2
    exit 1
  fi
fi

echo ""
echo "Restarting ${BINARY_NAME}..."

if [[ -f "${PID_FILE}" ]]; then
  old_pid="$(cat "${PID_FILE}")"
  if kill -0 "${old_pid}" 2>/dev/null; then
    kill "${old_pid}" 2>/dev/null || true
    sleep 1
  fi
fi

pkill -f "./${BINARY_NAME}" 2>/dev/null || pkill -f "${BINARY_NAME}" 2>/dev/null || true
sleep 1

nohup "./${BINARY_NAME}" > "${LOG_FILE}" 2>&1 &
echo $! > "${PID_FILE}"

echo "Started PID $(cat "${PID_FILE}")"
echo "Log: ${INSTALL_DIR}/${LOG_FILE}"

sleep 2

if curl -sf "${HEALTH_URL}" > /dev/null; then
  echo "Health check OK: ${HEALTH_URL}"
else
  echo "Warning: health check failed — last lines of ${LOG_FILE}:"
  tail -30 "${LOG_FILE}" || true
  exit 1
fi
