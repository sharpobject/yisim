#!/usr/bin/env bash
set -euo pipefail

credentials_file="${1:-steam_credentials.env}"

if [[ ! -r "$credentials_file" ]]; then
  echo "Missing $credentials_file. Copy steam_credentials.env.example and fill it in." >&2
  exit 1
fi

set -a
source "$credentials_file"
set +a

if [[ -z "${STEAM_USERNAME:-}" || -z "${STEAM_PASSWORD:-}" ]]; then
  echo "STEAM_USERNAME and STEAM_PASSWORD must be set in $credentials_file." >&2
  exit 1
fi

exec xvfb-run -a steam -silent -no-browser -login "$STEAM_USERNAME" "$STEAM_PASSWORD"
