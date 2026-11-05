@echo off
echo ==============================================================================
echo Government Document Evidence Intelligence & Briefing Management System
echo ==============================================================================
echo [1/3] Verifying and Seeding Database...
python backend\app\db\seed.py

echo [2/3] Starting FastAPI Backend on port 8000...
start cmd /k "title Gov Evidence Backend && cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [3/3] Starting React Vite Frontend on port 5173...
start cmd /k "title Gov Evidence Frontend && cd frontend && npm run dev"

echo System services launched!
echo Backend Docs: http://localhost:8000/api/docs
echo Frontend Portal: http://localhost:5173
