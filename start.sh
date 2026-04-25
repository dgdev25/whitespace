#!/usr/bin/env bash
set -euo pipefail

# ── colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC}  $*"; }
info() { echo -e "${BLUE}→${NC}  $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
die()  { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }
header() { echo -e "\n${BOLD}$*${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"
FRONTEND="$SCRIPT_DIR/frontend"

# ── cleanup on exit ───────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  info "Shutting down…"
  for pid in "${PIDS[@]+"${PIDS[@]}"}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

# ─────────────────────────────────────────────────────────────────────────────
header "Whitespace v2 — startup"
# ─────────────────────────────────────────────────────────────────────────────

# ── stop existing services ────────────────────────────────────────────────────
header "0/5  Stopping existing services"

for port in 18730 18731; do
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    ok "Stopped existing process on port $port"
  else
    ok "Port $port is free"
  fi
done

# ── prerequisites ─────────────────────────────────────────────────────────────
header "1/5  Checking prerequisites"

command -v python3 &>/dev/null || die "python3 not found"
command -v node    &>/dev/null || die "node not found"
command -v npm     &>/dev/null || die "npm not found"
ok "python3 / node / npm present"

# ── .env ──────────────────────────────────────────────────────────────────────
header "2/5  Environment"

ENV_FILE="$BACKEND/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  warn ".env not found — creating $ENV_FILE with SQLite defaults"
  cat > "$ENV_FILE" <<'EOF'
# Whitespace v2 — development environment
# Switch DATABASE_URL to a postgres:// URL for production.
DATABASE_URL=sqlite+aiosqlite:///./whitespace.db

# LLM runner (first available wins):
#   claude CLI  — install from https://claude.ai/code  (no key needed)
#   Anthropic   — set ANTHROPIC_API_KEY
#   Gemini      — set GEMINI_API_KEY
#   OpenRouter  — set OPENROUTER_API_KEY
# ANTHROPIC_API_KEY=
# GEMINI_API_KEY=
# OPENROUTER_API_KEY=

# Pipeline mode: "full" uses a real LLM; "stub" inserts fixture data.
PIPELINE_MODE=full

# Worker schedule (daily at 02:00 by default)
WORKER_SCHEDULE_HOUR=2
WORKER_SCHEDULE_MINUTE=0

# AI lab orgs to source papers from (used with arXiv all: field search)
ARXIV_ORGS=DeepMind,Anthropic,OpenAI
# arXiv categories to filter within (combined with org search)
ARXIV_CATEGORIES=cs.AI,cs.LG,cs.CL,cs.MA
IDEAS_PER_RUN=8
EOF
  ok "Created $ENV_FILE — edit it to add API keys"
else
  ok ".env found"
fi

# Source the .env so we can inspect its values in bash
set -o allexport
# shellcheck source=/dev/null
source "$ENV_FILE"
set +o allexport

# ── Python deps ───────────────────────────────────────────────────────────────
header "3/5  Python dependencies"

VENV="$BACKEND/.venv"
if [[ ! -d "$VENV" ]]; then
  info "Creating virtualenv…"
  python3 -m venv "$VENV"
fi

# shellcheck source=/dev/null
source "$VENV/bin/activate"

info "Installing / verifying backend packages…"
pip install --quiet --upgrade pip
pip install --quiet -e "$BACKEND[dev]"
ok "Backend packages ready"

# ── npm deps ──────────────────────────────────────────────────────────────────
if [[ ! -d "$FRONTEND/node_modules" ]]; then
  info "Installing frontend npm packages…"
  npm --prefix "$FRONTEND" install --silent
  ok "npm packages installed"
else
  ok "node_modules present"
fi

# ── database migrations ───────────────────────────────────────────────────────
header "4/5  Database"

cd "$BACKEND"

# Alembic needs a synchronous driver — strip async prefixes from the URL.
# e.g. sqlite+aiosqlite → sqlite, postgresql+asyncpg → postgresql+psycopg
DB_URL="${DATABASE_URL:-sqlite:///./whitespace.db}"
ALEMBIC_URL="${DB_URL/+aiosqlite/}"
ALEMBIC_URL="${ALEMBIC_URL/+asyncpg/}"

if [[ "$ALEMBIC_URL" == postgresql* || "$ALEMBIC_URL" == sqlite* ]]; then
  info "Running Alembic migrations…"
  DATABASE_URL="$ALEMBIC_URL" alembic upgrade head
else
  warn "Unrecognised DATABASE_URL scheme — skipping Alembic"
fi
ok "Schema up to date"

cd "$SCRIPT_DIR"

# ── start servers ─────────────────────────────────────────────────────────────
header "5/5  Starting servers"

# Backend API
info "Starting backend on http://localhost:18730 …"
(cd "$BACKEND" && source "$VENV/bin/activate" && \
  uvicorn app.main:app --port 18730 --reload --log-level warning 2>&1 \
  | sed 's/^/  [api] /') &
PIDS+=($!)

sleep 1  # give uvicorn a moment to bind the port

# Verify API is up
if curl -sf http://localhost:18730/api/system/health &>/dev/null; then
  ok "Backend API running"
else
  warn "Backend may still be starting (check logs above)"
fi

# Frontend dev server
info "Starting frontend on http://localhost:18731 …"
(cd "$FRONTEND" && npm run dev -- --port 18731 2>&1 \
  | sed 's/^/  [ui] /') &
PIDS+=($!)

sleep 2

echo ""
echo -e "${BOLD}────────────────────────────────────────────${NC}"
echo -e "  ${GREEN}Whitespace v2 is running${NC}"
echo ""
echo -e "  UI   →  ${BOLD}http://localhost:18731${NC}"
echo -e "  API  →  ${BOLD}http://localhost:18730/docs${NC}"
echo ""
echo -e "  Press ${BOLD}Ctrl-C${NC} to stop all servers"
echo -e "${BOLD}────────────────────────────────────────────${NC}"

# Block until Ctrl-C
wait
