@echo off
setlocal
title Head Hunters - Synchronize Database Schema

echo ===================================================
echo   Head Hunters - Database Schema Migration
echo ===================================================
echo.

if not exist "%~dp0.env" (
  echo [ERROR] .env file not found in root directory!
  echo Please create a .env file based on .env.example.
  pause
  exit /b 1
)

cd /d "%~dp0backend"

if not exist "node_modules" (
  echo Installing backend dependencies...
  call npm.cmd install
)

echo.
echo Running automated schema migration...
node src/scripts/migrate-schema.js

echo.
pause
