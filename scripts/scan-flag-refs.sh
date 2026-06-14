#!/usr/bin/env bash
# Scan a git repository for FlagForge flag key references and push them to FlagForge.
#
# Required environment variables:
#   FLAGFORGE_API       Base URL of FlagForge server (e.g. https://flags.example.com)
#   FLAGFORGE_PROJECT_ID  Project UUID from dashboard Settings
#   FLAGFORGE_MGMT_KEY  Management API key (mgmt_...) from Settings → CI / Management Keys
#
# Optional:
#   FLAGFORGE_BRANCH    Branch name (default: current git branch or "main")
#   FLAGFORGE_REPO      Repo identifier (default: git remote origin URL)
#   SCAN_PATH           Directory to scan (default: .)
#   RG_EXTRA_ARGS       Extra args passed to ripgrep (e.g. '--glob !node_modules')

set -euo pipefail

: "${FLAGFORGE_API:?Set FLAGFORGE_API (e.g. https://flags.example.com)}"
: "${FLAGFORGE_PROJECT_ID:?Set FLAGFORGE_PROJECT_ID}"
: "${FLAGFORGE_MGMT_KEY:?Set FLAGFORGE_MGMT_KEY (mgmt_... key from dashboard)}"

SCAN_PATH="${SCAN_PATH:-.}"
BRANCH="${FLAGFORGE_BRANCH:-$(git -C "$SCAN_PATH" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)}"
REPO="${FLAGFORGE_REPO:-$(git -C "$SCAN_PATH" config --get remote.origin.url 2>/dev/null || echo local)}"
COMMIT_SHA="${FLAGFORGE_COMMIT_SHA:-$(git -C "$SCAN_PATH" rev-parse HEAD 2>/dev/null || echo unknown)}"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

API="${FLAGFORGE_API%/}"
AUTH_HEADER="Authorization: ${FLAGFORGE_MGMT_KEY}"

echo "Fetching flags from FlagForge..."
FLAGS=$(curl -sf "$API/api/v1/projects/$FLAGFORGE_PROJECT_ID/flags" \
  -H "$AUTH_HEADER" | jq -r '.[].key')

if [ -z "$FLAGS" ]; then
  echo "No flags found in project."
  exit 0
fi

scan_flag() {
  local flag_key="$1"
  local refs_json

  refs_json=$(rg --json "$flag_key" "$SCAN_PATH" \
    ${RG_EXTRA_ARGS:-} \
    --glob '!node_modules' --glob '!.git' --glob '!target' --glob '!dist' --glob '!.next' \
    2>/dev/null | jq -s --arg repo "$REPO" --arg sha "$COMMIT_SHA" \
    '[.[] | select(.type=="match") | {
      repo: $repo,
      commit_sha: $sha,
      file_path: .data.path.text,
      line_number: .data.line_number,
      snippet: (.data.lines.text | gsub("\n"; ""))
    }]' || echo '[]')

  local count
  count=$(echo "$refs_json" | jq 'length')
  encoded_key=$(jq -rn --arg k "$flag_key" '$k|@uri')

  curl -sf -X POST \
    "$API/api/v1/projects/$FLAGFORGE_PROJECT_ID/flags/$encoded_key/code-refs" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{\"branch\":\"$BRANCH\",\"refs\":$refs_json}" >/dev/null

  echo "  $flag_key → $count reference(s)"
}

echo "Scanning branch=$BRANCH repo=$REPO commit=$COMMIT_SHA"
while IFS= read -r flag_key; do
  [ -n "$flag_key" ] || continue
  scan_flag "$flag_key"
done <<< "$FLAGS"

echo "Done."
