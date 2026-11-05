#!/usr/bin/env bash
set -e

echo "=============================================================================="
echo "Government Document Evidence Intelligence & Briefing Management System"
echo "=============================================================================="

echo "[1/3] Verifying and Seeding Database..."
python backend/app/db/seed.py

echo "[2/3] Starting FastAPI Backend on port 8000..."
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "[3/3] Starting React Vite Frontend on port 5173..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID | Frontend PID: $FRONTEND_PID"
echo "Frontend UI: http://localhost:5173"
echo "Backend API Docs: http://localhost:8000/api/docs"

wait
