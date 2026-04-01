@echo off
REM Install Dependencies for All Services - Windows Batch Script
REM This script installs npm dependencies for all microservices and the client

setlocal enabledelayedexpansion

echo.
echo ================================================================================
echo   Installing Dependencies for All Services
echo   Medical Coverage System - Microservices Architecture
echo ================================================================================
echo.

set "FAILED_COUNT=0"
set "PASSED_COUNT=0"

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not installed or not in PATH
  echo Please install Node.js from https://nodejs.org/
  exit /b 1
)

echo Detected npm version:
npm --version
echo.

REM Install root dependencies
echo [INFO] Installing root dependencies...
call npm install
if errorlevel 1 (
  echo [ERROR] Root dependencies installation failed
  set /a FAILED_COUNT+=1
) else (
  echo [SUCCESS] Root dependencies installed
  set /a PASSED_COUNT+=1
)
echo.

REM Install client dependencies
echo [INFO] Installing client dependencies...
cd client
call npm install
if errorlevel 1 (
  echo [ERROR] Client dependencies installation failed
  set /a FAILED_COUNT+=1
  cd ..
) else (
  echo [SUCCESS] Client dependencies installed
  set /a PASSED_COUNT+=1
  cd ..
)
echo.

REM Install service dependencies
echo [INFO] Installing microservice dependencies...
echo ================================================================================

for %%S in (api-gateway billing-service core-service crm-service finance-service hospital-service insurance-service membership-service wellness-service) do (
  echo [INFO] Installing %%S...
  cd services\%%S
  call npm install
  if errorlevel 1 (
    echo [ERROR] %%S dependencies installation failed
    set /a FAILED_COUNT+=1
    cd ..\..
  ) else (
    echo [SUCCESS] %%S dependencies installed
    set /a PASSED_COUNT+=1
    cd ..\..
  )
)

echo.
echo ================================================================================
echo   Installation Summary
echo ================================================================================
echo.
echo Passed: !PASSED_COUNT!
echo Failed: !FAILED_COUNT!
echo.

if !FAILED_COUNT! gtr 0 (
  echo [ERROR] Some installations failed
  echo.
  echo Troubleshooting:
  echo   1. Check internet connection
  echo   2. Verify npm is installed: npm --version
  echo   3. Clear npm cache: npm cache clean --force
  echo   4. Try installing individual service:
  echo      cd services\service-name ^&^& npm install
  echo.
  exit /b 1
) else (
  echo [SUCCESS] All dependencies installed successfully!
  echo.
  echo Next Steps:
  echo   1. Verify TypeScript setup: npm run check
  echo   2. Create environment file: copy .env.services.template .env
  echo   3. Update .env with your configuration
  echo   4. Run verification: scripts\verify-connections.bat
  echo.
  exit /b 0
)
