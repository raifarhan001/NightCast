@echo off
echo ===================================================
echo   Starting Nightcast Platform Locally
echo ===================================================

echo Starting FastAPI Backend on http://localhost:8001 ...
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0backend\venv\Scripts\python.exe"
) else (
    set "PY_EXE=%~dp0venv\Scripts\python.exe"
)

start "Nightcast Backend (FastAPI)" cmd /k "cd /d %~dp0backend && "%PY_EXE%" -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload --reload-dir . --reload-include *.py --reload-exclude venv --reload-exclude .venv --reload-exclude *.db"

echo Starting Next.js Frontend on http://localhost:3000 ...
start "Nightcast Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting up!
echo - Frontend:  http://localhost:3000
echo - Backend:   http://localhost:8001
echo - API Docs:  http://localhost:8001/docs
echo ===================================================
