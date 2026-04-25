#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
source backend/.venv/bin/activate
cd backend
python -m worker.main
