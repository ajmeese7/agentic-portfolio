#!/bin/bash
# Production deploy script for agentic-portfolio.
#
# Sources NVM, pins the Node version from .nvmrc, installs deps, builds, then
# hands the running process off to PM2 via ecosystem.config.js.
#
# Designed to be invoked by a systemd oneshot unit, but works standalone too.
#
# Env flags:
#   AGENTIC_PORTFOLIO_DEV_MODE=true   skip git reset (preserve local changes)
#   AGENTIC_PORTFOLIO_SKIP_RESET=true same as above
#   --no-reset                        CLI flag equivalent

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

DEV_MODE="${AGENTIC_PORTFOLIO_DEV_MODE:-false}"
SKIP_RESET="${AGENTIC_PORTFOLIO_SKIP_RESET:-false}"

if [ "$DEV_MODE" = "true" ] || [ "$SKIP_RESET" = "true" ] || [ "${1:-}" = "--no-reset" ]; then
	echo "Skipping git reset to preserve local changes..."
else
	echo "Fetching latest code from repo..."
	git fetch --all
	git reset --hard origin/master
fi

# Source NVM and activate the Node version pinned in .nvmrc.
# Required because systemd does not source ~/.bashrc, so PATH won't include the
# nvm-managed node binaries without this.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
	echo "ERROR: NVM not found at $NVM_DIR. Install NVM or set NVM_DIR." >&2
	exit 1
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

# Install the version from .nvmrc if it isn't already present, then activate it.
nvm install
nvm use

# pnpm is required (we ship pnpm patches; npm/yarn break the avatar build).
if ! command -v pnpm >/dev/null 2>&1; then
	echo "Installing pnpm into the active Node version..."
	npm install -g pnpm
fi

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building production bundle..."
NODE_ENV=production pnpm build

mkdir -p "$REPO_ROOT/logs"
chmod 755 "$REPO_ROOT/logs"

if ! command -v pm2 >/dev/null 2>&1; then
	echo "Installing PM2 into the active Node version..."
	npm install -g pm2
fi

# Clean slate so a stale process doesn't linger on a stale build.
pm2 delete agentic-portfolio --silent 2>/dev/null || true
pm2 update --silent || true

pm2 start "$REPO_ROOT/ecosystem.config.js" --silent
pm2 save --force --silent

if pm2 status agentic-portfolio | grep -q "online"; then
	echo "agentic-portfolio started successfully"
else
	echo "ERROR: agentic-portfolio failed to start. Check PM2 logs." >&2
	exit 1
fi
