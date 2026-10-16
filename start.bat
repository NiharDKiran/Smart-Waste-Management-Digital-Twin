@echo off
title EcoTwin Launcher
echo ========================================================
echo   EcoTwin: Smart Waste Management Digital Twin
echo ========================================================
echo.

echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "EcoTwin Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Launching Vite React Frontend on http://localhost:5173 ...
start "EcoTwin Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   Both services are now running!
echo   - Frontend UI:  http://localhost:5173
echo   - Backend Docs: http://localhost:8000/docs
echo   - Health Check: http://localhost:8000/api/health
echo ========================================================
