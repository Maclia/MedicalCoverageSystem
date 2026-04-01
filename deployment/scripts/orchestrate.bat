@echo off
REM Medical Coverage System - Multi-environment deployment orchestrator (Windows)
REM Unified script to manage containers, databases, and services
REM Supports: dev, staging, production environments

setlocal enabledelayedexpansion

REM ============================================================================
REM CONFIGURATION
REM ============================================================================

set ENVIRONMENT=%1
if "!ENVIRONMENT!"=="" set ENVIRONMENT=development
set COMMAND=%2
if "!COMMAND!"=="" set COMMAND=start

set POSTGRES_CONTAINER=medical-postgres
set REDIS_CONTAINER=medical-redis
set NETWORK_NAME=medical-services-network

REM Load from .env file if exists
if exist ".env.!ENVIRONMENT!" (
    for /f "delims== tokens=1,2" %%A in (.env.!ENVIRONMENT!) do (
        if not "%%A"=="" if not "%%A:~0,1%"=="#" (
            set "%%A=%%B"
        )
    )
)

REM Default values
if not defined DB_USER set DB_USER=postgres
if not defined DB_PASSWORD set DB_PASSWORD=postgres_password_2024
if not defined DB_PORT set DB_PORT=5432
if not defined REDIS_PORT set REDIS_PORT=6379

REM ============================================================================
REM UTILITY FUNCTIONS
REM ============================================================================

:is_container_running
docker ps --filter "name=%1" --filter "status=running" | findstr /C:"%1" >nul 2>&1
exit /b %errorlevel%

:container_exists
docker ps -a --filter "name=%1" | findstr /C:"%1" >nul 2>&1
exit /b %errorlevel%

:wait_for_postgres
setlocal enabledelayedexpansion
set max_attempts=30
set attempt=1
echo Waiting for PostgreSQL...
:postgres_wait_loop
if !attempt! gtr !max_attempts! (
    echo [ERROR] Timeout waiting for PostgreSQL
    exit /b 1
)
docker exec %POSTGRES_CONTAINER% pg_isready -U %DB_USER% >nul 2>&1
if !errorlevel! equ 0 (
    echo [SUCCESS] PostgreSQL is ready
    exit /b 0
)
echo   Attempt !attempt!/%max_attempts%: PostgreSQL not ready yet...
timeout /t 2 /nobreak >nul
set /a attempt+=1
goto postgres_wait_loop

:wait_for_redis
setlocal enabledelayedexpansion
set max_attempts=30
set attempt=1
echo Waiting for Redis...
:redis_wait_loop
if !attempt! gtr !max_attempts! (
    echo [ERROR] Timeout waiting for Redis
    exit /b 1
)
docker exec %REDIS_CONTAINER% redis-cli ping | findstr /C:"PONG" >nul 2>&1
if !errorlevel! equ 0 (
    echo [SUCCESS] Redis is ready
    exit /b 0
)
echo   Attempt !attempt!/%max_attempts%: Redis not ready yet...
timeout /t 2 /nobreak >nul
set /a attempt+=1
goto redis_wait_loop

REM ============================================================================
REM CONTAINER MANAGEMENT
REM ============================================================================

:start_postgres
cls
echo.
echo ════════════════════════════════════════
echo Starting PostgreSQL
echo ════════════════════════════════════════
echo.

call :is_container_running %POSTGRES_CONTAINER%
if %errorlevel% equ 0 (
    echo [WARNING] PostgreSQL already running
    exit /b 0
)

call :container_exists %POSTGRES_CONTAINER%
if %errorlevel% equ 0 (
    echo [INFO] Starting existing PostgreSQL container
    docker start %POSTGRES_CONTAINER%
) else (
    echo [INFO] Creating new PostgreSQL container
    docker run -d ^
        --name %POSTGRES_CONTAINER% ^
        -e POSTGRES_USER=%DB_USER% ^
        -e POSTGRES_PASSWORD=%DB_PASSWORD% ^
        -p %DB_PORT%:5432 ^
        -v postgres_data:/var/lib/postgresql/data ^
        --network %NETWORK_NAME% ^
        postgres:15-alpine
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create PostgreSQL container
        exit /b 1
    )
)

call :wait_for_postgres
exit /b %errorlevel%

:start_redis
echo.
echo ════════════════════════════════════════
echo Starting Redis
echo ════════════════════════════════════════
echo.

call :is_container_running %REDIS_CONTAINER%
if %errorlevel% equ 0 (
    echo [WARNING] Redis already running
    exit /b 0
)

call :container_exists %REDIS_CONTAINER%
if %errorlevel% equ 0 (
    echo [INFO] Starting existing Redis container
    docker start %REDIS_CONTAINER%
) else (
    echo [INFO] Creating new Redis container
    docker run -d ^
        --name %REDIS_CONTAINER% ^
        -p %REDIS_PORT%:6379 ^
        -v redis_data:/data ^
        --network %NETWORK_NAME% ^
        redis:7-alpine
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create Redis container
        exit /b 1
    )
)

call :wait_for_redis
exit /b %errorlevel%

:create_network
echo.
echo ════════════════════════════════════════
echo Setting up Docker network
echo ════════════════════════════════════════
echo.

docker network create %NETWORK_NAME% >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Network may already exist
)
echo [SUCCESS] Network setup complete
exit /b 0

REM ============================================================================
REM DATABASE SETUP
REM ============================================================================

:setup_databases
echo.
echo ════════════════════════════════════════
echo Creating service databases
echo ════════════════════════════════════════
echo.

setlocal enabledelayedexpansion

REM Service database mapping - name:port as key:value
set databases[0]=api_gateway
set databases[1]=medical_coverage_billing
set databases[2]=medical_coverage_core
set databases[3]=medical_coverage_finance
set databases[4]=medical_coverage_crm
set databases[5]=medical_coverage_membership
set databases[6]=medical_coverage_hospital
set databases[7]=medical_coverage_insurance
set databases[8]=medical_coverage_wellness

for /l %%i in (0,1,8) do (
    set db_name=!databases[%%i]!
    echo [INFO] Creating database: !db_name!
    docker exec %POSTGRES_CONTAINER% psql -U %DB_USER% -c "CREATE DATABASE !db_name!;" >nul 2>&1
    if !errorlevel! neq 0 (
        echo [WARNING] Database !db_name! may already exist
    )
)

echo [SUCCESS] Databases setup complete
exit /b 0

REM ============================================================================
REM DOCKER COMPOSE MANAGEMENT
REM ============================================================================

:start_services
echo.
echo ════════════════════════════════════════
echo Starting services with Docker Compose
echo ════════════════════════════════════════
echo.

if not exist "docker-compose.yml" (
    echo [ERROR] docker-compose.yml not found
    exit /b 1
)

docker-compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services
    exit /b 1
)
echo [SUCCESS] Services started
exit /b 0

:stop_services
echo.
echo ════════════════════════════════════════
echo Stopping services
echo ════════════════════════════════════════
echo.

docker-compose down
echo [SUCCESS] Services stopped
exit /b 0

:check_health
echo.
echo ════════════════════════════════════════
echo Checking system health
echo ════════════════════════════════════════
echo.

setlocal enabledelayedexpansion
set healthy=0
set total=8

set services[0]=api-gateway
set services[1]=billing-service
set services[2]=core-service
set services[3]=finance-service
set services[4]=crm-service
set services[5]=membership-service
set services[6]=hospital-service
set services[7]=insurance-service
set services[8]=wellness-service

for /l %%i in (0,1,8) do (
    set service=!services[%%i]!
    docker ps | findstr /C:"medical_!service:-=_!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] !service! is running
        set /a healthy+=1
    ) else (
        echo [WARNING] !service! is not running
    )
)

echo.
echo [INFO] Health Status: !healthy! services running

if %healthy% equ 9 exit /b 0
exit /b 1

:show_help
cls
echo.
echo ════════════════════════════════════════
echo Medical Coverage System - Deployment Orchestrator
echo ════════════════════════════════════════
echo.
echo Usage:
echo   %0 [ENVIRONMENT] [COMMAND] [OPTION]
echo.
echo Environments:
echo   dev, development     Development environment
echo   staging             Staging environment
echo   prod, production    Production environment
echo.
echo Commands:
echo   start [full]        Start services (full=with DB setup)
echo   stop                Stop all services
echo   status              Show health status
echo   logs SERVICE        Show service logs
echo   clean [OPTION]      Cleanup resources
echo                       - containers: Remove containers
echo                       - images: Remove images and containers
echo                       - all: Full cleanup
echo   help                Show this help
echo.
echo Examples:
echo   %0 dev start              - Start development
echo   %0 dev start full         - Start with database setup
echo   %0 prod status            - Check production health
echo   %0 dev logs core-service  - View core-service logs
echo   %0 dev clean all          - Full cleanup
echo.
exit /b 0

REM ============================================================================
REM MAIN EXECUTION
REM ============================================================================

if "%COMMAND%"=="start" (
    call :create_network
    if %errorlevel% neq 0 exit /b 1
    
    call :start_postgres
    if %errorlevel% neq 0 exit /b 1
    
    call :start_redis
    if %errorlevel% neq 0 exit /b 1
    
    if "%3"=="full" (
        call :setup_databases
        if %errorlevel% neq 0 exit /b 1
    )
    
    call :start_services
    if %errorlevel% neq 0 exit /b 1
    
    call :check_health
    exit /b %errorlevel%

) else if "%COMMAND%"=="stop" (
    call :stop_services
    exit /b %errorlevel%

) else if "%COMMAND%"=="status" (
    call :check_health
    exit /b %errorlevel%

) else if "%COMMAND%"=="logs" (
    if "%3"=="" (
        docker-compose logs -f
    ) else (
        docker-compose logs -f %3
    )
    exit /b %errorlevel%

) else if "%COMMAND%"=="clean" (
    if "%3"=="" set clean_option=containers
    if "%3"=="containers" (
        docker-compose down -v
    ) else if "%3"=="images" (
        docker-compose down -v --rmi all
    ) else if "%3"=="all" (
        docker-compose down -v --rmi all
    )
    exit /b %errorlevel%

) else if "%COMMAND%"=="help" (
    call :show_help
    exit /b 0

) else (
    echo [ERROR] Unknown command: %COMMAND%
    call :show_help
    exit /b 1
)

endlocal
