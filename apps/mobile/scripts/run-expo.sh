#!/usr/bin/env bash
#
# Launch the EventFlow mobile app (Expo) for local dev / the iOS+Android device pass.
#
# What it does:
#   1. Builds the workspace packages the app imports (ui-tokens, sdk-public,
#      sdk-account, api-contracts) so Metro can resolve their dist/ — this repo
#      consumes them from dist, not source. Skip with --skip-build once built.
#   2. Detects this machine's LAN IP and checks the API (:3000) is reachable, so a
#      physical phone can actually load data. The app derives the API host from the
#      Expo LAN host automatically (see shared/config/env.ts) — no .env needed on
#      the same Wi-Fi.
#   3. Starts Expo. Default = LAN dev server + QR (Expo Go on a LAN phone).
#
# Usage:
#   apps/mobile/scripts/run-expo.sh                # LAN QR for Expo Go (same Wi-Fi)
#   apps/mobile/scripts/run-expo.sh --ios          # open the iOS simulator
#   apps/mobile/scripts/run-expo.sh --android      # open the Android emulator/device
#   apps/mobile/scripts/run-expo.sh --tunnel       # phone NOT on same Wi-Fi (needs EXPO_PUBLIC_API_URL)
#   apps/mobile/scripts/run-expo.sh --clear        # clear the Metro cache
#   apps/mobile/scripts/run-expo.sh --skip-build   # skip the package build step
# (any extra flags are passed straight through to `expo start`.)
#
# Optional env overrides:
#   EXPO_PUBLIC_API_URL   API origin the phone should hit (WITHOUT the /api/v1 suffix).
#                         REQUIRED with --tunnel; otherwise auto-derived from the LAN IP.
#   EXPO_PUBLIC_WEB_URL   public web origin for the paid "Tickets on web" hand-off.
#   API_PORT              API port to probe / derive (default 3000).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
API_PORT="${API_PORT:-3000}"

SKIP_BUILD=0
TUNNEL=0
EXPO_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --tunnel)     TUNNEL=1; EXPO_ARGS+=("--tunnel") ;;
    *)            EXPO_ARGS+=("$arg") ;;
  esac
done

# ── 1. Build the workspace packages the app imports (dist/). ──────────────────
if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "→ Building workspace packages (ui-tokens, sdk-public, sdk-account, api-contracts)…"
  npm --prefix "$ROOT" run build:packages
else
  echo "→ Skipping package build (--skip-build)."
fi

# ── 2. LAN IP + API reachability hint. ───────────────────────────────────────
detect_lan_ip() {
  if [[ "$(uname)" == "Darwin" ]]; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
  else
    hostname -I 2>/dev/null | awk '{print $1}'
  fi
}

if [[ "$TUNNEL" -eq 1 ]]; then
  if [[ -z "${EXPO_PUBLIC_API_URL:-}" ]]; then
    echo "⚠ --tunnel: set EXPO_PUBLIC_API_URL to a phone-reachable API origin —"
    echo "  the LAN IP is NOT reachable over an Expo tunnel."
  fi
else
  LAN_IP="$(detect_lan_ip)"
  if [[ -n "${EXPO_PUBLIC_API_URL:-}" ]]; then
    API_URL="$EXPO_PUBLIC_API_URL"
  elif [[ -n "$LAN_IP" ]]; then
    API_URL="http://$LAN_IP:$API_PORT"
  else
    API_URL="http://localhost:$API_PORT"
  fi
  echo "→ API origin the phone will use: $API_URL"
  # Up-check via loopback — self-connecting to your own LAN IP can be flaky, and
  # the API returns 404 on '/' (routes live under /api/v1), so ANY HTTP response
  # (incl. 404) means it's up. We probe localhost, not the LAN IP.
  if curl -s -o /dev/null -m 5 "http://127.0.0.1:$API_PORT"; then
    echo "  ✓ API is up on port $API_PORT."
  else
    echo "  ⚠ Nothing answering on port $API_PORT yet. If data doesn't load, start the"
    echo "    API from the repo root ('npm run dev' / 'docker compose up'). Harmless if"
    echo "    it's still starting."
  fi
fi

# ── 3. Start Expo from the mobile workspace. ─────────────────────────────────
echo "→ Starting Expo… (expo start ${EXPO_ARGS[*]:-})"
cd "$ROOT/apps/mobile"
# Bash 3.2-safe empty-array expansion (macOS /bin/bash + `set -u`).
exec npx expo start ${EXPO_ARGS[@]+"${EXPO_ARGS[@]}"}
