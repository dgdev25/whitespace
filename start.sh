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

# ── prerequisites ─────────────────────────────────────────────────────────────
header "1/6  Checking prerequisites"

command -v python3 &>/dev/null || die "python3 not found"
command -v node    &>/dev/null || die "node not found"
command -v npm     &>/dev/null || die "npm not found"
ok "python3 / node / npm present"

# ── .env ──────────────────────────────────────────────────────────────────────
header "2/6  Environment"

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
header "3/6  Python dependencies"

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
header "4/6  Database"

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

# ── LLM runner detection ──────────────────────────────────────────────────────
header "5/6  Seeding database"

detect_runner() {
  # Returns the name of the first available runner, or "none"
  if command -v claude &>/dev/null; then echo "claude_cli"; return; fi
  if [[ -n "${ANTHROPIC_API_KEY:-}"  ]]; then echo "anthropic";  return; fi
  if [[ -n "${GEMINI_API_KEY:-}"     ]]; then echo "gemini";     return; fi
  if [[ -n "${OPENROUTER_API_KEY:-}" ]]; then echo "openrouter"; return; fi
  if command -v codex &>/dev/null; then echo "codex_cli"; return; fi
  echo "none"
}

RUNNER=$(detect_runner)

# Count existing ideas
IDEA_COUNT=$(python3 - <<'PYEOF'
import os, sys
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./whitespace.db")
# Use a synchronous check regardless of driver
db_url = os.environ.get("DATABASE_URL", "")
sync_url = db_url.replace("+aiosqlite", "").replace("+asyncpg", "")
try:
    from sqlalchemy import create_engine, text
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM ideas")).scalar()
    print(count)
except Exception as e:
    print(0)
PYEOF
)

if [[ "$IDEA_COUNT" -gt 0 ]]; then
  ok "Database already has $IDEA_COUNT idea(s) — skipping seed"
elif [[ "$RUNNER" == "none" ]]; then
  warn "No LLM runner detected — inserting fixture ideas"
  python3 - <<'PYEOF'
import os, uuid, json
from datetime import datetime, timezone

db_url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./whitespace.db")
sync_url = db_url.replace("+aiosqlite", "").replace("+asyncpg", "")

from sqlalchemy import create_engine, text
engine = create_engine(sync_url)

FIXTURE_IDEAS = [
  {
    "id": str(uuid.uuid4()),
    "title": "Adaptive Curriculum Engine for Code Learning",
    "description": "A tutoring system that constructs personalised coding exercises by analysing a learner's error patterns in real time, using contrastive self-supervised learning to map conceptual gaps.",
    "why_novel": "Existing coding tutors serve static exercise banks. This approach derives exercises algorithmically from the learner's own mistakes, making the curriculum a function of the individual rather than a fixed sequence.",
    "who_builds": "EdTech startup with an ML engineer who has worked on adaptive learning or recommendation systems.",
    "who_buys": "Bootcamps, corporate L&D teams, and self-directed learners on platforms like Coursera or Udemy.",
    "novelty_score": 0.82,
    "feasibility_score": 0.74,
    "badge": "novel",
    "is_featured": True,
    "featured_date": datetime.now(timezone.utc).date().isoformat(),
    "paper_ids": json.dumps(["2401.00001", "2401.00002"]),
  },
  {
    "id": str(uuid.uuid4()),
    "title": "Federated Annotation Markets for Medical Imaging",
    "description": "A marketplace where radiologists earn micro-payments for labelling medical images, with a federated learning layer that trains a shared model without moving patient data off-site.",
    "why_novel": "Current labelling pipelines centralise sensitive data. Federated markets keep images on hospital servers while still producing a high-quality shared model — removing the legal and ethical barrier to multi-institution collaboration.",
    "who_builds": "Health-tech founders with ML and HIPAA compliance experience, ideally with an existing radiology network.",
    "who_buys": "Hospital systems, medical device companies, and radiology AI vendors who need large labelled datasets without cross-institution data sharing.",
    "novelty_score": 0.78,
    "feasibility_score": 0.61,
    "badge": "feasible",
    "is_featured": False,
    "featured_date": None,
    "paper_ids": json.dumps(["2401.00003"]),
  },
  {
    "id": str(uuid.uuid4()),
    "title": "Speculative Code Review via Diffusion Models",
    "description": "A development tool that uses latent diffusion to hallucinate plausible future bug reports for a code change before it is merged, letting teams triage likely defects at review time.",
    "why_novel": "Static analysers find known patterns; this generates novel hypothetical failure modes by sampling from a distribution conditioned on the diff, extending reviewer attention beyond rule-based heuristics.",
    "who_builds": "A developer-tools company or open-source maintainer with experience in code LLMs and CI/CD integrations.",
    "who_buys": "Engineering organisations where the cost of a production bug outweighs the review overhead — fintech, health-tech, critical infrastructure.",
    "novelty_score": 0.91,
    "feasibility_score": 0.52,
    "badge": "speculative",
    "is_featured": False,
    "featured_date": None,
    "paper_ids": json.dumps(["2401.00004", "2401.00005"]),
  },
  {
    "id": str(uuid.uuid4()),
    "title": "Context-Aware Accessibility Rewrites for Mobile UI",
    "description": "An SDK that intercepts UI renders and rewrites tap targets, contrast ratios, and label text in real time based on ambient sensor data — dim light, shaking motion, or gloved hands.",
    "why_novel": "Accessibility tools today are configured statically per disability category. Sensor-driven dynamic adaptation responds to situational impairment, which affects all users periodically but is ignored by current toolkits.",
    "who_builds": "Mobile platform engineers or an accessibility-focused startup with iOS/Android SDK experience.",
    "who_buys": "Large consumer app companies (banking, retail, travel) with global audiences and regulatory exposure to accessibility lawsuits.",
    "novelty_score": 0.69,
    "feasibility_score": 0.81,
    "badge": "emerging",
    "is_featured": False,
    "featured_date": None,
    "paper_ids": json.dumps(["2401.00006"]),
  },
]

is_pg = sync_url.startswith("postgresql")
if is_pg:
    insert_sql = """INSERT INTO ideas
      (id, title, description, why_novel, who_builds, who_buys,
       novelty_score, feasibility_score, badge, is_featured,
       featured_date, paper_ids, created_at)
    VALUES (:id, :title, :description, :why_novel, :who_builds, :who_buys,
            :novelty_score, :feasibility_score, :badge, :is_featured,
            :featured_date, :paper_ids, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING"""
else:
    insert_sql = """INSERT OR IGNORE INTO ideas
      (id, title, description, why_novel, who_builds, who_buys,
       novelty_score, feasibility_score, badge, is_featured,
       featured_date, paper_ids, created_at)
    VALUES (:id, :title, :description, :why_novel, :who_builds, :who_buys,
            :novelty_score, :feasibility_score, :badge, :is_featured,
            :featured_date, :paper_ids, CURRENT_TIMESTAMP)"""

with engine.begin() as conn:
    for idea in FIXTURE_IDEAS:
        conn.execute(text(insert_sql), idea)

print(f"Inserted {len(FIXTURE_IDEAS)} fixture ideas")
PYEOF
  ok "Fixture ideas inserted"
else
  info "LLM runner: $RUNNER — running pipeline to generate real ideas…"
  info "(This fetches arXiv papers and calls your LLM — allow 2–5 minutes)"
  python3 -c "
from worker.db import SessionLocal
from worker.orchestrator import run_daily_pipeline
with SessionLocal() as s:
    run_daily_pipeline(s)
print('Pipeline complete')
"
  ok "Pipeline run complete"
fi

cd "$SCRIPT_DIR"

# ── start servers ─────────────────────────────────────────────────────────────
header "6/6  Starting servers"

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
