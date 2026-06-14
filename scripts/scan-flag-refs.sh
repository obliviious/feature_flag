#!/usr/bin/env bash
# Scan a git repository for FlagForge flag key references and push them to FlagForge.
#
# Required (env vars or .env file in the current directory):
#   FLAGFORGE_API       Base URL of FlagForge server (e.g. https://flags.example.com)
#   FLAGFORGE_PROJECT_ID  Project UUID from dashboard Settings
#   FLAGFORGE_MGMT_KEY  Management API key (mgmt_...) from Settings → CI / Management Keys
#
# Optional:
#   FLAGFORGE_ENV_FILE  Path to .env file (default: ./.env)
#   FLAGFORGE_API_URL   Alias for FLAGFORGE_API (common in .env / GitHub secrets)
#   FLAGFORGE_BRANCH    Branch name (default: current git branch or "main")
#   FLAGFORGE_REPO      Repo identifier (default: git remote origin URL)
#   SCAN_PATH           Directory to scan (default: .)
#   SCAN_MODE           strict (default) or broad — strict matches SDK/API usage only
#   RG_EXTRA_ARGS       Extra args passed to ripgrep
#
# Example .env:
#   FLAGFORGE_API=https://flags.example.com
#   FLAGFORGE_PROJECT_ID=550e8400-e29b-41d4-a716-446655440000
#   FLAGFORGE_MGMT_KEY=mgmt_...

set -euo pipefail

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}" # strip inline comments
    line="${line#"${line%%[![:space:]]*}"}" # trim leading whitespace
    [[ -z "$line" ]] && continue
    line="${line#export }"

    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
      val="${val#"${val%%[![:space:]]*}"}"
      val="${val%"${val##*[![:space:]]}"}"
      if [[ "$val" == \"*\" && "$val" == *\" ]]; then
        val="${val:1:${#val}-2}"
      elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
        val="${val:1:${#val}-2}"
      fi
      if [[ -z "${!key:-}" ]]; then
        export "$key=$val"
      fi
    fi
  done < "$file"
}

escape_regex() {
  local input="$1"
  printf '%s' "$input" | sed 's/[][\\^$.*+?{}()|]/\\&/g'
}

# Match FlagForge SDK / evaluator usage with a quoted flag key (not bare substrings).
build_strict_pattern() {
  local flag_key="$1"
  local escaped
  escaped="$(escape_regex "$flag_key")"
  local q='["'\''"]'

  cat <<EOF
use(?:Boolean|String|Number)?Flag\\s*\\([\\s\\S]{0,160}?${q}${escaped}${q}|useFlag\\s*\\([\\s\\S]{0,160}?${q}${escaped}${q}|(?:evaluate|getBooleanValue|getStringValue|getNumberValue|getJsonValue)\\s*\\(\\s*${q}${escaped}${q}|evaluator\\.evaluate\\s*\\(\\s*${q}${escaped}${q}|flagKey\\s*:\\s*${q}${escaped}${q}
EOF
}

ENV_FILE="${FLAGFORGE_ENV_FILE:-.env}"
load_env_file "$ENV_FILE"

FLAGFORGE_API="${FLAGFORGE_API:-${FLAGFORGE_API_URL:-}}"

: "${FLAGFORGE_API:?Set FLAGFORGE_API (e.g. https://flags.example.com)}"
: "${FLAGFORGE_PROJECT_ID:?Set FLAGFORGE_PROJECT_ID}"
: "${FLAGFORGE_MGMT_KEY:?Set FLAGFORGE_MGMT_KEY (mgmt_... key from dashboard)}"

SCAN_PATH="${SCAN_PATH:-.}"
SCAN_MODE="${SCAN_MODE:-strict}"
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

if [[ "$SCAN_MODE" != "strict" && "$SCAN_MODE" != "broad" ]]; then
  echo "error: SCAN_MODE must be 'strict' (default) or 'broad'" >&2
  exit 1
fi

# Default ripgrep scope: source files only, skip locks/generated/vendor paths.
RG_GLOBS=(
  --glob '*.ts'
  --glob '*.tsx'
  --glob '*.js'
  --glob '*.jsx'
  --glob '*.mjs'
  --glob '*.cjs'
  --glob '*.py'
  --glob '*.go'
  --glob '*.rs'
  --glob '!node_modules'
  --glob '!.git'
  --glob '!target'
  --glob '!dist'
  --glob '!.next'
  --glob '!package-lock.json'
  --glob '!yarn.lock'
  --glob '!pnpm-lock.yaml'
  --glob '!**/scan-flag-refs.sh'
)

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
  local pattern
  local rg_args=()

  if [[ "$SCAN_MODE" == "strict" ]]; then
    pattern="$(build_strict_pattern "$flag_key")"
    rg_args=(--multiline -P -e "$pattern")
  else
    echo "  warning: SCAN_MODE=broad uses substring matching and may produce false positives" >&2
    rg_args=(-F "$flag_key")
  fi

  # shellcheck disable=SC2206
  refs_json=$(rg --json "${rg_args[@]}" "$SCAN_PATH" \
    "${RG_GLOBS[@]}" \
    ${RG_EXTRA_ARGS:-} \
    2>/dev/null | jq -s --arg repo "$REPO" --arg sha "$COMMIT_SHA" \
    '[.[] | select(.type=="match") | {
      repo: $repo,
      commit_sha: $sha,
      file_path: .data.path.text,
      line_number: .data.line_number,
      snippet: (.data.lines.text | gsub("\n"; ""))
    }] | unique_by(.file_path + ":" + (.line_number|tostring))' || echo '[]')

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

echo "Scanning branch=$BRANCH repo=$REPO commit=$COMMIT_SHA mode=$SCAN_MODE"
while IFS= read -r flag_key; do
  [ -n "$flag_key" ] || continue
  scan_flag "$flag_key"
done <<< "$FLAGS"

echo "Done."
