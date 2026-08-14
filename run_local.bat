@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Head Hunters - Starting Local Development
echo ===================================================
echo.

:: Check for environment file
if not exist ".env" (
    if exist ".env.example" (
        echo [NOTICE] .env not found. Creating .env from .env.example...
        copy /Y ".env.example" ".env" >nul
        echo [OK] Created .env file.
    ) else (
        echo [WARNING] No .env or .env.example found!
    )
)

:: Check Backend dependencies
echo [1/4] Checking Backend dependencies...
cd backend
if not exist "node_modules\" (
    echo Installing backend packages (npm install)...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERROR] Backend npm install failed!
        cd ..
        pause
        exit /b %errorlevel%
    )
)
cd ..
echo [OK] Backend dependencies ready.
echo.

:: Check Frontend dependencies
echo [2/4] Checking Frontend dependencies...
cd frontend
if not exist "node_modules\" (
    echo Installing frontend packages (npm install)...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERROR] Frontend npm install failed!
        cd ..
        pause
        exit /b %errorlevel%
    )
)
cd ..
echo [OK] Frontend dependencies ready.
echo.

:: Start Express Backend Server
echo [3/4] Launching Express Backend Server (Port 3001)...
start "Head Hunters - Backend (Port 3001)" cmd /k "cd backend && npm.cmd run dev"

:: Start Vite Frontend Server
echo [4/4] Launching Vite Frontend Server (Port 3000)...
start "Head Hunters - Frontend (Port 3000)" cmd /k "cd frontend && npm.cmd run dev"

echo.
echo ===================================================
echo   Development Environment Running!
echo ===================================================
echo.
echo   * Frontend Web App:     http://localhost:3000
echo   * Admin Dashboard:      http://localhost:3000/admin
echo   * Backend API:          http://localhost:3001/api/settings
echo.
echo Keep the backend and frontend terminal windows open.
echo To stop the servers, close their respective terminal windows.
echo.
pause
