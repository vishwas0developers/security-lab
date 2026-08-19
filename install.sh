#!/usr/bin/env bash
# ==============================================================================
# Security Platform - Linux/macOS first-time bootstrap installer
# ==============================================================================
# Gets the CLI built and (optionally) linked, checks/reports on all
# prerequisites from the PRD (Node.js, npm, git, Docker), and writes the
# global runtime config. Mirrors install.bat's behavior and messages so the
# two installers stay functionally equivalent.
#
# Usage:
#   ./install.sh                run from inside a cloned repo
#   curl -fsSL <repo>/raw/main/install.sh | bash        bootstrap-clone mode
#
# Env vars:
#   SECURITY_PLATFORM_ROOT   install location when bootstrap-cloning (default: ~/.security-lab)
#   SECURITY_PLATFORM_REPO   git URL to clone when running via curl | bash
#   CI=true                  suppress the final "press enter" prompt
#
# Exit codes:
#   0  success (installation usable; see summary for any manual actions)
#   1  a required prerequisite is missing or a required step failed
#   2  this script was not run in a supported way (wrong OS / can't locate repo)
# ==============================================================================

set -uo pipefail

WARNING_COUNT=0
NODE_OK=0
NPM_OK=0
GIT_OK=0
DOCKER_OK=0
DOCKER_RUNNING=0
COMPOSE_OK=0
BUILD_OK=0
LINK_OK=0

log()  { printf '[%s] %s\n' "$1" "$2"; }
info() { log INFO "$1"; }
warn() { log WARNING "$1"; WARNING_COUNT=$((WARNING_COUNT + 1)); }
err()  { log ERROR "$1"; }
ok()   { log SUCCESS "$1"; }

fail() {
    echo
    echo "============================================================"
    echo "  INSTALLATION FAILED"
    echo "============================================================"
    err "See the messages above for details. Fix the reported issue and re-run install.sh."
    exit "${1:-1}"
}

# Surface the exact command and line number that failed instead of letting
# 'set -e'-style failures exit silently. We use explicit checks (not `set -e`)
# throughout so every failure path can print a targeted [ERROR] message first;
# this trap is a safety net for anything unexpected that still slips through.
on_err() {
    local exit_code=$?
    err "install.sh failed unexpectedly (exit code ${exit_code}) at line ${BASH_LINENO[0]}: ${BASH_COMMAND}"
    exit "${exit_code}"
}
trap on_err ERR

echo "============================================================"
echo "  Security Platform Installer (Linux/macOS)"
echo "============================================================"
echo

# --------------------------------------------------------------------- OS check
UNAME_S="$(uname -s 2>/dev/null || echo unknown)"
case "$UNAME_S" in
    Linux|Darwin)
        ;;
    MINGW*|MSYS*|CYGWIN*)
        err "This looks like a Windows Git-Bash/MSYS environment ($UNAME_S)."
        err "Use install.bat instead: install.bat"
        exit 2
        ;;
    *)
        err "Unsupported or undetected OS: $UNAME_S. This script supports Linux and macOS."
        exit 2
        ;;
esac
ok "Detected OS: $UNAME_S"

# ------------------------------------------------------- locate the repository root
# Prefer the directory this script actually lives in (the normal `git clone`
# + `./install.sh` flow). If that's not resolvable to a real file on disk
# (e.g. `curl ... | bash`), fall back to a bootstrap-clone.
SCRIPT_PATH=""
if [ -n "${BASH_SOURCE:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
fi

if [ -n "$SCRIPT_PATH" ] && [ -f "$SCRIPT_PATH/package.json" ]; then
    REPO_ROOT="$SCRIPT_PATH"
    ok "Repository root located: $REPO_ROOT"
else
    info "Running without a local repository checkout (e.g. piped via curl | bash)."
    if ! command -v git >/dev/null 2>&1; then
        err "git is required to bootstrap-clone the platform but was not found on PATH."
        err "Install git and re-run, or clone the repository yourself and run ./install.sh from inside it."
        exit 1
    fi
    GIT_OK=1

    REPO_URL="${SECURITY_PLATFORM_REPO:-}"
    if [ -z "$REPO_URL" ]; then
        err "SECURITY_PLATFORM_REPO is not set, and no local repository was found next to this script."
        err "Set it to the platform's git URL, e.g.:"
        err "  SECURITY_PLATFORM_REPO=https://github.com/<org>/security-platform.git curl -fsSL <repo>/raw/main/install.sh | bash"
        err "Or clone the repository manually and run ./install.sh from inside it."
        exit 1
    fi

    REPO_ROOT="${SECURITY_PLATFORM_ROOT:-$HOME/.security-lab}"
    if [ -d "$REPO_ROOT/.git" ]; then
        info "Existing installation found at $REPO_ROOT -- updating instead of re-cloning."
        if ! git -C "$REPO_ROOT" pull --ff-only; then
            err "git pull failed in $REPO_ROOT. Resolve manually (check for local changes) and re-run."
            exit 1
        fi
    else
        info "Cloning $REPO_URL into $REPO_ROOT..."
        mkdir -p "$(dirname "$REPO_ROOT")"
        if ! git clone "$REPO_URL" "$REPO_ROOT"; then
            err "git clone failed. Check the URL and your network connection."
            exit 1
        fi
    fi
    ok "Repository ready at $REPO_ROOT"

    # Re-exec the real installer from inside the now-local checkout so every
    # relative path below (package.json, docker/, scripts/) resolves correctly.
    exec "$REPO_ROOT/install.sh" "$@"
fi

cd "$REPO_ROOT" || fail 2

# ------------------------------------------------------------------- Node.js
info "Checking for Node.js..."
if ! command -v node >/dev/null 2>&1; then
    err "Node.js was not found on PATH."
    err "Install Node.js 18 LTS or later (https://nodejs.org/, or your package manager / nvm) and re-run install.sh."
    fail 1
fi
NODE_VERSION="$(node --version 2>/dev/null || true)"
if [ -z "$NODE_VERSION" ]; then
    err "Found 'node' on PATH but 'node --version' produced no output. The Node.js install may be corrupt."
    fail 1
fi
NODE_MAJOR="${NODE_VERSION#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
if ! [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    err "Node.js $NODE_VERSION was found, but version 18 or later is required."
    fail 1
fi
ok "Node.js $NODE_VERSION found."
NODE_OK=1

# ----------------------------------------------------------------------- npm
info "Checking for npm..."
if ! command -v npm >/dev/null 2>&1; then
    err "npm was not found on PATH. It normally ships with Node.js."
    err "Reinstall Node.js (this also installs npm) and re-run install.sh."
    fail 1
fi
NPM_VERSION="$(npm --version 2>/dev/null || true)"
if [ -z "$NPM_VERSION" ]; then
    err "Found 'npm' on PATH but 'npm --version' produced no output."
    fail 1
fi
ok "npm v$NPM_VERSION found."
NPM_OK=1

# ----------------------------------------------------------------------- git
if [ "$GIT_OK" != "1" ]; then
    if command -v git >/dev/null 2>&1; then
        ok "git found."
        GIT_OK=1
    else
        warn "git was not found on PATH. Updating the platform later (git pull) will not work until git is installed."
    fi
fi

# -------------------------------------------------------------------- Docker
info "Checking for Docker..."
if ! command -v docker >/dev/null 2>&1; then
    warn "Docker was not found on PATH. Strix, ZAP, Nuclei, and MobSF run as Docker containers and will be unavailable until Docker is installed: https://docs.docker.com/get-docker/"
else
    DOCKER_OK=1
    ok "Docker CLI found."

    if docker info >/dev/null 2>&1; then
        ok "Docker daemon is running."
        DOCKER_RUNNING=1
    else
        warn "Docker CLI is installed but the Docker daemon is not responding."
        if [ "$UNAME_S" = "Darwin" ] && [ -d "/Applications/Docker.app" ]; then
            info "Attempting to start Docker Desktop..."
            open -a Docker >/dev/null 2>&1 || true
            info "Waiting for the Docker daemon to become ready (up to 90 seconds)..."
            tries=0
            while [ "$tries" -lt 18 ]; do
                sleep 5
                tries=$((tries + 1))
                if docker info >/dev/null 2>&1; then
                    ok "Docker is now running."
                    DOCKER_RUNNING=1
                    break
                fi
            done
            if [ "$DOCKER_RUNNING" != "1" ]; then
                warn "Docker Desktop did not become ready within 90 seconds. Start it manually and re-run install.sh, or run 'security doctor' later."
            fi
        elif command -v systemctl >/dev/null 2>&1; then
            warn "Start the Docker service and re-run install.sh, e.g.: sudo systemctl start docker"
        else
            warn "Start Docker manually and re-run install.sh, or run 'security doctor' later to re-check."
        fi
    fi

    if [ "$DOCKER_RUNNING" = "1" ]; then
        info "Checking Docker Compose..."
        if docker compose version >/dev/null 2>&1; then
            ok "Docker Compose (v2 plugin) found."
            COMPOSE_OK=1
        elif command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
            ok "Docker Compose (standalone) found."
            COMPOSE_OK=1
        else
            warn "Docker is running but Docker Compose is not available. Install/upgrade to a Docker version that includes Compose v2."
        fi
    fi
fi

echo
info "Prerequisite checks complete. Continuing with installation..."
echo

# ------------------------------------------------------- create runtime folders
# Idempotent: 'mkdir -p' never fails or duplicates anything that already exists.
for dir in config policies profiles schemas projects reports evidence findings logs; do
    if [ -d "$REPO_ROOT/$dir" ]; then
        info "$REPO_ROOT/$dir already exists, skipping."
    else
        if mkdir -p "$REPO_ROOT/$dir"; then
            ok "Created $REPO_ROOT/$dir"
        else
            err "Failed to create directory: $REPO_ROOT/$dir"
            fail 1
        fi
    fi
done

# ------------------------------------------------------------ npm install/build
info "Installing npm dependencies (npm install)..."
if ! npm install; then
    err "'npm install' failed. See the npm output above for details."
    fail 1
fi
ok "Dependencies installed."

info "Building the CLI (npm run build)..."
if ! npm run build; then
    err "'npm run build' failed. See the TypeScript output above for details."
    fail 1
fi
ok "Build succeeded."
BUILD_OK=1

# --------------------------------------------------------------------- npm link
# Non-fatal: if this fails (commonly a permissions issue on the global npm
# directory), the CLI still works via 'node dist/cli/index.js'.
info "Linking the 'security' command globally (npm link)..."
if npm link >/dev/null 2>&1; then
    if command -v security >/dev/null 2>&1; then
        ok "'security' command linked and on PATH."
        LINK_OK=1
    else
        warn "'npm link' reported success but 'security' is still not on PATH. You may need to open a new shell, or your npm global bin dir may not be on PATH."
    fi
else
    warn "'npm link' failed (often a permissions issue on the global npm directory). Try: sudo npm link"
    warn "Or run the CLI directly: node \"$REPO_ROOT/dist/cli/index.js\" --help"
fi

# ------------------------------------------------------- global runtime config
info "Writing global runtime configuration..."
CONFIG_PATH="$REPO_ROOT/config/runtime.yaml"
if [ -f "$CONFIG_PATH" ]; then
    info "$CONFIG_PATH already exists -- leaving it unchanged (idempotent)."
else
    platform_tag="linux"
    [ "$UNAME_S" = "Darwin" ] && platform_tag="macos"
    if cat > "$CONFIG_PATH" <<EOF
# Generated by install.sh
# Safe to edit by hand; re-running the installer will not overwrite this file.
schemaVersion: 1
platformRoot: "$REPO_ROOT"
installedAt: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
platform: $platform_tag
EOF
    then
        ok "Wrote $CONFIG_PATH"
    else
        warn "Failed to write $CONFIG_PATH. You can create it manually later; this does not block CLI usage."
    fi
fi

# ==================================================================== summary
echo
echo "============================================================"
echo "  INSTALLATION SUMMARY"
echo "============================================================"
[ "$NODE_OK" = "1" ]   && echo "  [OK]      Node.js"               || echo "  [FAILED]  Node.js"
[ "$NPM_OK" = "1" ]    && echo "  [OK]      npm"                   || echo "  [FAILED]  npm"
[ "$GIT_OK" = "1" ]    && echo "  [OK]      git"                   || echo "  [SKIPPED] git (optional)"
if [ "$DOCKER_OK" = "1" ]; then
    if [ "$DOCKER_RUNNING" = "1" ]; then
        echo "  [OK]      Docker (running)"
    else
        echo "  [SKIPPED] Docker (installed, not running)"
    fi
else
    echo "  [SKIPPED] Docker (not installed)"
fi
[ "$COMPOSE_OK" = "1" ] && echo "  [OK]      Docker Compose" || echo "  [SKIPPED] Docker Compose"
[ "$BUILD_OK" = "1" ]   && echo "  [OK]      CLI build"     || echo "  [FAILED]  CLI build"
[ "$LINK_OK" = "1" ]    && echo "  [OK]      'security' command on PATH" || echo "  [SKIPPED] 'security' command on PATH"
echo

echo "  Remaining manual actions:"
has_manual_actions=0
if [ "$DOCKER_OK" != "1" ]; then
    echo "    - Install Docker: https://docs.docker.com/get-docker/"
    has_manual_actions=1
fi
if [ "$DOCKER_OK" = "1" ] && [ "$DOCKER_RUNNING" != "1" ]; then
    echo "    - Start Docker, then run: security doctor"
    has_manual_actions=1
fi
if [ "$GIT_OK" != "1" ]; then
    echo "    - Install git if you want 'security update' to work"
    has_manual_actions=1
fi
if [ "$LINK_OK" != "1" ]; then
    echo "    - 'security' is not linked globally; use: node \"$REPO_ROOT/dist/cli/index.js\""
    has_manual_actions=1
fi
[ "$has_manual_actions" = "0" ] && echo "    (none)"
echo

if [ "$BUILD_OK" = "1" ]; then
    echo "============================================================"
    echo "  INSTALLATION COMPLETE"
    echo "============================================================"
    echo "  Next steps:"
    echo "    cd /path/to/your-project"
    echo "    security setup"
    echo "    security scan --full"
    EXIT_CODE=0
else
    err "The CLI build did not complete successfully."
    EXIT_CODE=1
fi

echo
if [ "$WARNING_COUNT" -gt 0 ]; then
    log WARNING "Completed with $WARNING_COUNT warning(s). See above."
fi

if [ "${CI:-}" != "true" ] && [ -t 0 ]; then
    read -r -p "Press Enter to close..." _ || true
fi

trap - ERR
exit "$EXIT_CODE"
