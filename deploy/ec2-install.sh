#!/usr/bin/env bash
# Download the latest flagforge-server binary from GitHub Releases into the repo root.
# Run on EC2 (no Rust required). Redis + .env stay in the same directory.
#
# Usage (from repo root):
#   ./deploy/ec2-install.sh
#
# Private repo: export GITHUB_TOKEN="ghp_..."

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${INSTALL_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
GITHUB_REPO="${GITHUB_REPO:-obliviious/feature_flag}"
RELEASE_TAG="${RELEASE_TAG:-latest-build}"
BINARY_NAME="flagforge-server"

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
echo ""
echo "Ensure .env exists in ${INSTALL_DIR} (see .env.example), then:"
echo "  cd ${INSTALL_DIR}"
echo "  ./${BINARY_NAME}"
echo ""
echo "Or restart:"
echo "  cd ${INSTALL_DIR}"
echo "  pkill -f flagforge-server || true"
echo "  nohup ./${BINARY_NAME} > flagforge.log 2>&1 &"
