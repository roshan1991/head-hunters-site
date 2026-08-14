@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Head Hunters - Production Build ^& Packager
echo ===================================================
echo.

:: Clean previous build output
echo [1/5] Cleaning previous deployment artifacts...
if exist "cpanel_deploy" (
    echo Removing existing cpanel_deploy folder...
    rmdir /s /q "cpanel_deploy"
)
if exist "cpanel_deploy.zip" (
    echo Removing existing cpanel_deploy.zip...
    del /q "cpanel_deploy.zip"
)
echo.

:: Build Vite React Frontend
echo [2/5] Building Vite React Frontend...
cd frontend
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm.cmd install
)
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed with error code %errorlevel%!
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..
echo [OK] Frontend built successfully.
echo.

:: Build Express Backend
echo [3/5] Building Express TypeScript Backend...
cd backend
if not exist "node_modules\" (
    echo Installing backend dependencies...
    call npm.cmd install
)
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed with error code %errorlevel%!
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..
echo [OK] Backend built successfully.
echo.

:: Package into cpanel_deploy structure
echo [4/5] Assembling production deployment package...
mkdir "cpanel_deploy" 2>nul
mkdir "cpanel_deploy\public" 2>nul
mkdir "cpanel_deploy\src\db" 2>nul

:: Copy compiled backend dist
xcopy /E /I /Y "backend\dist\*" "cpanel_deploy\" >nul
copy /Y "backend\package.json" "cpanel_deploy\package.json" >nul

:: Copy Drizzle ORM migrations and schema
if exist "backend\drizzle" (
    xcopy /E /I /Y "backend\drizzle" "cpanel_deploy\drizzle" >nul
)
if exist "backend\drizzle.config.ts" (
    copy /Y "backend\drizzle.config.ts" "cpanel_deploy\drizzle.config.ts" >nul
)
if exist "backend\src\db\schema.ts" (
    copy /Y "backend\src\db\schema.ts" "cpanel_deploy\src\db\schema.ts" >nul
)

:: Copy compiled frontend dist into public folder
xcopy /E /I /Y "frontend\dist\*" "cpanel_deploy\public\" >nul

:: Copy environment file
if exist ".env.production" (
    echo Using .env.production for deployment...
    copy /Y ".env.production" "cpanel_deploy\.env" >nul
) else if exist ".env" (
    echo Using .env for deployment...
    copy /Y ".env" "cpanel_deploy\.env" >nul
)

echo [OK] Application packaged into 'cpanel_deploy'.
echo.

:: Create deployment archive
echo [5/5] Creating cpanel_deploy.zip archive...
tar -a -c -f cpanel_deploy.zip -C cpanel_deploy .
if %errorlevel% equ 0 (
    echo [OK] Created 'cpanel_deploy.zip' successfully.
) else (
    echo [WARNING] Could not create zip archive automatically. You can manually zip the 'cpanel_deploy' folder.
)

echo.
echo ===================================================
echo   Production Build Complete!
echo ===================================================
echo.
echo 1. Folder output:   ./cpanel_deploy
echo 2. Archive output:  ./cpanel_deploy.zip
echo.
echo Deployment Instructions (cPanel / Node.js App):
echo   - Upload and extract 'cpanel_deploy.zip' to your cPanel app root.
echo   - In cPanel "Setup Node.js App":
echo       * Application startup file: index.js
echo       * Node.js Version: 20.x or 22.x
echo       * Click 'Run NPM Install' in cPanel
echo       * Click 'Start / Restart App'
echo.
pause
