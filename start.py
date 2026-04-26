#!/usr/bin/env python3
"""Cross-platform startup script for Whitespace v2 (Linux / macOS / Windows)."""

import os
import platform
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import NoReturn

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND = SCRIPT_DIR / "backend"
FRONTEND = SCRIPT_DIR / "frontend"

IS_WIN = platform.system() == "Windows"

VENV = BACKEND / ".venv"
BIN = VENV / ("Scripts" if IS_WIN else "bin")
PYTHON = BIN / ("python.exe" if IS_WIN else "python")
PIP = BIN / ("pip.exe" if IS_WIN else "pip")
ALEMBIC = BIN / ("alembic.exe" if IS_WIN else "alembic")
UVICORN = BIN / ("uvicorn.exe" if IS_WIN else "uvicorn")

BACKEND_PORT = 18730
FRONTEND_PORT = 18731

_procs: list[subprocess.Popen] = []


# ── helpers ───────────────────────────────────────────────────────────────────

def ok(msg: str) -> None:     print(f"  ✓  {msg}", flush=True)
def info(msg: str) -> None:   print(f"  →  {msg}", flush=True)
def warn(msg: str) -> None:   print(f"  ⚠  {msg}", file=sys.stderr, flush=True)
def header(msg: str) -> None: print(f"\n{msg}", flush=True)


def die(msg: str) -> NoReturn:
    print(f"  ✗  {msg}", file=sys.stderr, flush=True)
    sys.exit(1)


def _npm_cmd() -> list[str]:
    """Return the correct npm invocation for the current platform."""
    import shutil
    path = shutil.which("npm")
    if path is None:
        die("npm not found — install Node.js from https://nodejs.org")
    if IS_WIN and path.lower().endswith((".cmd", ".bat")):
        return ["cmd", "/c", path]
    return [path]


def kill_port(port: int) -> None:
    """Kill any process listening on the given port, cross-platform."""
    if IS_WIN:
        result = subprocess.run(
            ["netstat", "-ano", "-p", "TCP"],
            capture_output=True, text=True,
        )
        for line in result.stdout.splitlines():
            if f":{port} " in line and "LISTENING" in line:
                pid = line.split()[-1]
                subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
    else:
        result = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}"],
            capture_output=True, text=True,
        )
        for pid in result.stdout.strip().splitlines():
            subprocess.run(["kill", pid.strip()], capture_output=True)


def port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) != 0


def load_dotenv(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def cleanup(*_) -> None:
    print("\n  →  Shutting down…", flush=True)
    for p in _procs:
        try:
            p.terminate()
        except Exception:
            pass
    sys.exit(0)


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    header("Whitespace v2 — startup")

    # 0. Stop existing services
    header("0/5  Stopping existing services")
    for port in (BACKEND_PORT, FRONTEND_PORT):
        kill_port(port)
        ok(f"Port {port} cleared")

    # 1. Prerequisites
    header("1/5  Checking prerequisites")
    py_check = ["python", "--version"] if IS_WIN else ["python3", "--version"]
    if subprocess.run(py_check, capture_output=True).returncode != 0:
        die("python3 not found — install from https://python.org")
    if subprocess.run(["node", "--version"], capture_output=True).returncode != 0:
        die("node not found — install from https://nodejs.org")
    if subprocess.run(_npm_cmd() + ["--version"], capture_output=True).returncode != 0:
        die("npm not found — install from https://nodejs.org")
    ok("python / node / npm present")

    # 2. .env
    header("2/5  Environment")
    env_file = BACKEND / ".env"
    if not env_file.exists():
        env_file.write_text(
            "# Whitespace v2 — development environment\n"
            "# Switch DATABASE_URL to a postgres:// URL for production.\n"
            "DATABASE_URL=sqlite+aiosqlite:///./whitespace.db\n"
            "\n"
            "# LLM runner (first available wins):\n"
            "#   claude CLI  — install from https://claude.ai/code  (no key needed)\n"
            "#   Anthropic   — set ANTHROPIC_API_KEY\n"
            "#   Gemini      — set GEMINI_API_KEY\n"
            "#   OpenRouter  — set OPENROUTER_API_KEY\n"
            "# ANTHROPIC_API_KEY=\n"
            "# GEMINI_API_KEY=\n"
            "# OPENROUTER_API_KEY=\n"
            "\n"
            "PIPELINE_MODE=full\n"
            "WORKER_SCHEDULE_HOUR=2\n"
            "WORKER_SCHEDULE_MINUTE=0\n"
            "ARXIV_ORGS=DeepMind,Anthropic,OpenAI\n"
            "ARXIV_CATEGORIES=cs.AI,cs.LG,cs.CL,cs.MA,cs.SE,cs.HC,eess.SP\n"
            "IDEAS_PER_RUN=8\n",
            encoding="utf-8",
        )
        warn(f"Created {env_file} — edit it to add API keys")
    else:
        ok(".env found")

    dotenv = load_dotenv(env_file)
    for k, v in dotenv.items():
        os.environ.setdefault(k, v)

    # 3. Python deps
    header("3/5  Python dependencies")
    if not VENV.exists():
        info("Creating virtual environment…")
        py_bin = "python" if IS_WIN else "python3"
        subprocess.run([py_bin, "-m", "venv", str(VENV)], check=True)

    info("Installing / verifying backend packages…")
    subprocess.run([str(PIP), "install", "--quiet", "--upgrade", "pip"], check=True)
    subprocess.run([str(PIP), "install", "--quiet", "-e", f"{BACKEND}[dev]"], check=True)
    ok("Backend packages ready")

    if not (FRONTEND / "node_modules").exists():
        info("Installing frontend npm packages…")
        subprocess.run([*_npm_cmd(), "--prefix", str(FRONTEND), "install", "--silent"], check=True)
        ok("npm packages installed")
    else:
        ok("node_modules present")

    # 4. Database migrations
    header("4/5  Database")
    db_url = os.environ.get("DATABASE_URL", "sqlite:///./whitespace.db")
    alembic_url = db_url.replace("+aiosqlite", "").replace("+asyncpg", "")
    migration_env = {**os.environ, "DATABASE_URL": alembic_url}
    subprocess.run(
        [str(ALEMBIC), "upgrade", "head"],
        cwd=str(BACKEND),
        env=migration_env,
        check=True,
    )
    ok("Schema up to date")

    # 5. Start servers
    header("5/5  Starting servers")

    backend_env = {**os.environ}
    info(f"Starting backend on http://localhost:{BACKEND_PORT} …")
    backend = subprocess.Popen(
        [str(UVICORN), "app.main:app",
         "--port", str(BACKEND_PORT), "--reload", "--log-level", "warning"],
        cwd=str(BACKEND),
        env=backend_env,
    )
    _procs.append(backend)
    time.sleep(2)

    try:
        urllib.request.urlopen(
            f"http://localhost:{BACKEND_PORT}/api/system/health", timeout=3
        )
        ok("Backend API running")
    except Exception:
        warn("Backend may still be starting — check output above")

    info(f"Starting frontend on http://localhost:{FRONTEND_PORT} …")
    frontend = subprocess.Popen(
        [*_npm_cmd(), "run", "dev", "--", "--port", str(FRONTEND_PORT)],
        cwd=str(FRONTEND),
    )
    _procs.append(frontend)
    time.sleep(2)

    print(f"""
────────────────────────────────────────────
  Whitespace v2 is running

  UI   →  http://localhost:{FRONTEND_PORT}
  API  →  http://localhost:{BACKEND_PORT}/docs

  Press Ctrl-C to stop all servers
────────────────────────────────────────────""", flush=True)

    while True:
        for p in _procs:
            if p.poll() is not None:
                warn(f"Server process (pid {p.pid}) exited unexpectedly")
                cleanup()
        time.sleep(1)


if __name__ == "__main__":
    main()
