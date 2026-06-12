#!/usr/bin/env bash
# Download the latest flagforge-server binary from GitHub Releases and install it.
# Run on EC2 (no Rust required). Redis + .env stay on the host.
#
# Usage:
#   export GITHUB_REPO="your-user/feature_flag"   # required
#   export INSTALL_DIR="$HOME/flagforge"          # optional
#   ./deploy/ec2-install.sh
#
# Private repo: export GITHUB_TOKEN="ghp_..."

set -euo pipefail

GITHUB_REPO="${GITHUB_REPO:?Set GITHUB_REPO e.g. your-user/feature_flag}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/flagforge}"
RELEASE_TAG="${RELEASE_TAG:-latest-build}"
BINARY_NAME="flagforge-server"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

AUTH_HEADER=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

echo "Downloading ${BINARY_NAME} from ${GITHUB_REPO} (${RELEASE_TAG})..."

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
echo "Run (set env first — copy apps/server/.env or export vars):"
echo "  cd ${INSTALL_DIR}"
echo "  ./${BINARY_NAME}"
echo ""
echo "Or restart if already running:"
echo "  pkill -f flagforge-server || true"
echo "  nohup ./${BINARY_NAME} > flagforge.log 2>&1 &"
