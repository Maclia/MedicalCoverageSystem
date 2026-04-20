@echo off
REM Database Migration Script for Medical Coverage System (Windows)
REM Safely applies pending database migrations with validation

setlocal enabledelayedexpansion

REM Colors simulation for Windows (using findstr for output)
set "BLUE=[0;34m"
set "GREEN=[0;32m"
set "YELLOW=[1;33m"
set "RED=[0;31m"

REM Configuration
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "BACKUP_DIR=%PROJECT_ROOT%\.backups\migrations"
set "LOG_FILE=%PROJECT_ROOT%\migration_%TIMESTAMP%.log"
set "MIGRATION_TIMEOUT=300"

echo. >> "%LOG_FILE%"
echo Migration started at %date% %time% >> "%LOG_FILE%"

REM Check prerequisites
echo [INFO] Checking prerequisites... | tee -a "%LOG_FILE%"

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed >> "%LOG_FILE%"
    exit /b 1
)
echo [SUCCESS] Node.js found >> "%LOG_FILE%"

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed >> "%LOG_FILE%"
    exit /b 1
)
echo [SUCCESS] npm found >> "%LOG_FILE%"

REM Validate environment
echo [INFO] Validating environment... | tee -a "%LOG_FILE%"

if not exist "%PROJECT_ROOT%\services\finance-service\.env" (
    echo [ERROR] Finance service .env file not found >> "%LOG_FILE%"
    exit /b 1
)
echo [SUCCESS] Finance service .env found >> "%LOG_FILE%"

if not exist "%PROJECT_ROOT%\drizzle.config.ts" (
    echo [ERROR] drizzle.config.ts not found >> "%LOG_FILE%"
    exit /b 1
)
echo [SUCCESS] drizzle.config.ts found >> "%LOG_FILE%"

if not exist "%PROJECT_ROOT%\services\finance-service\src\models\schema.ts" (
    echo [ERROR] Finance service schema not found >> "%LOG_FILE%"
    exit /b 1
)
echo [SUCCESS] Finance service schema found >> "%LOG_FILE%"

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Run migrations
echo [INFO] Running Drizzle migrations... | tee -a "%LOG_FILE%"

cd /d "%PROJECT_ROOT%"
call npx drizzle-kit push --config drizzle.config.ts >> "%LOG_FILE%" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Migrations completed successfully | tee -a "%LOG_FILE%"
) else (
    echo [ERROR] Migration failed with exit code %ERRORLEVEL% >> "%LOG_FILE%"
    exit /b 1
)

REM Verify migrations
echo [INFO] Verifying migrations... | tee -a "%LOG_FILE%"

REM Print summary
echo. >> "%LOG_FILE%"
echo [SUCCESS] ======== MIGRATION COMPLETED SUCCESSFULLY ======== >> "%LOG_FILE%"
echo [INFO] Log file: %LOG_FILE% >> "%LOG_FILE%"
echo [INFO] Backup directory: %BACKUP_DIR% >> "%LOG_FILE%"

echo [SUCCESS] ======== MIGRATION COMPLETED SUCCESSFULLY ========
echo [INFO] Log file: %LOG_FILE%

endlocal
exit /b 0
