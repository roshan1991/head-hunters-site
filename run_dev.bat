@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Starting Head Hunters Dev Environment
echo ==========================================
echo.

echo [1/3] Checking and freeing ports...

REM Free port 5000 (Backend)
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :5000 ^| findstr LISTENING') do (
    echo Port 5000 is occupied by PID %%a. Killing it...
    taskkill /F /PID %%a >nul 2>&1
)

REM Free port 5173 (Frontend - Vite Default)
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :5173 ^| findstr LISTENING') do (
    echo Port 5173 is occupied by PID %%a. Killing it...
    taskkill /F /PID %%a >nul 2>&1
)

echo Ports are ready.
echo.

echo [2/3] Starting Backend (Port 5000)...
start "Backend Server" cmd /c "cd server && node index.js"

echo [3/3] Starting Frontend (Port 5173)...
start "Frontend Server" cmd /k "cd client && npm run dev"

echo.
echo ==========================================
echo Services are starting in separate windows!
echo - Backend API will be on http://localhost:5000
echo - Frontend App will be on http://localhost:5173
echo ==========================================
echo.
pause
