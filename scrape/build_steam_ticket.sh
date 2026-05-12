#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
gcc -Wall -Wextra -O2 "$SCRIPT_DIR/steam_ticket.c" -ldl -o "$SCRIPT_DIR/steam_ticket"
