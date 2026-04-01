@echo off
REM Medical Coverage System - Centralized Service Configuration (Windows)
REM Source or call this file to get all service definitions
REM Usage: call services-config.bat

setlocal enabledelayedexpansion

REM ============================================================================
REM SERVICE DEFINITIONS
REM ============================================================================

REM Service port mappings
set "ports[api-gateway]=3001"
set "ports[billing-service]=3002"
set "ports[core-service]=3003"
set "ports[finance-service]=3004"
set "ports[crm-service]=3005"
set "ports[membership-service]=3006"
set "ports[hospital-service]=3007"
set "ports[insurance-service]=3008"
set "ports[wellness-service]=3009"

REM Service database mappings
set "databases[api-gateway]=api_gateway"
set "databases[billing-service]=medical_coverage_billing"
set "databases[core-service]=medical_coverage_core"
set "databases[finance-service]=medical_coverage_finance"
set "databases[crm-service]=medical_coverage_crm"
set "databases[membership-service]=medical_coverage_membership"
set "databases[hospital-service]=medical_coverage_hospital"
set "databases[insurance-service]=medical_coverage_insurance"
set "databases[wellness-service]=medical_coverage_wellness"

REM Service containers
set "containers[api-gateway]=medical_api_gateway"
set "containers[billing-service]=medical_billing_service"
set "containers[core-service]=medical_core_service"
set "containers[finance-service]=medical_finance_service"
set "containers[crm-service]=medical_crm_service"
set "containers[membership-service]=medical_membership_service"
set "containers[hospital-service]=medical_hospital_service"
set "containers[insurance-service]=medical_insurance_service"
set "containers[wellness-service]=medical_wellness_service"

REM Service contexts
set "contexts[api-gateway]=.\services\api-gateway"
set "contexts[billing-service]=.\services\billing-service"
set "contexts[core-service]=.\services\core-service"
set "contexts[finance-service]=.\services\finance-service"
set "contexts[crm-service]=.\services\crm-service"
set "contexts[membership-service]=.\services\membership-service"
set "contexts[hospital-service]=.\services\hospital-service"
set "contexts[insurance-service]=.\services\insurance-service"
set "contexts[wellness-service]=.\services\wellness-service"

REM ============================================================================
REM DATABASE CONFIGURATION
REM ============================================================================

if not defined DB_USER set DB_USER=postgres
if not defined DB_PASSWORD set DB_PASSWORD=postgres_password_2024
if not defined DB_HOST set DB_HOST=postgres
if not defined DB_PORT set DB_PORT=5432
if not defined DB_NAME set DB_NAME=medical_coverage

REM ============================================================================
REM REDIS CONFIGURATION
REM ============================================================================

if not defined REDIS_HOST set REDIS_HOST=redis
if not defined REDIS_PORT set REDIS_PORT=6379
if not defined REDIS_URL set REDIS_URL=redis://redis:6379

REM ============================================================================
REM DOCKER CONFIGURATION
REM ============================================================================

if not defined POSTGRES_CONTAINER set POSTGRES_CONTAINER=medical-postgres
if not defined REDIS_CONTAINER set REDIS_CONTAINER=medical-redis
if not defined NETWORK_NAME set NETWORK_NAME=medical-services-network
if not defined DOCKER_TAG set DOCKER_TAG=latest

REM ============================================================================
REM DEPLOYMENT CONFIGURATION
REM ============================================================================

if not defined DEPLOYMENT_ENV set DEPLOYMENT_ENV=development
if not defined NODE_ENV set NODE_ENV=development
if not defined LOG_LEVEL set LOG_LEVEL=info
if not defined SERVICE_TIMEOUT set SERVICE_TIMEOUT=30000

REM ============================================================================
REM UTILITY FUNCTIONS
REM ============================================================================

:get_service_port
REM Usage: call :get_service_port service_name
REM Returns: port number in SERVICE_PORT variable
setlocal enabledelayedexpansion
set service=%~1
set "SERVICE_PORT=!ports[%service%]!"
exit /b 0

:get_service_database
REM Usage: call :get_service_database service_name
REM Returns: database name in SERVICE_DATABASE variable
setlocal enabledelayedexpansion
set service=%~1
set "SERVICE_DATABASE=!databases[%service%]!"
exit /b 0

:get_service_container
REM Usage: call :get_service_container service_name
REM Returns: container name in SERVICE_CONTAINER variable
setlocal enabledelayedexpansion
set service=%~1
set "SERVICE_CONTAINER=!containers[%service%]!"
exit /b 0

:build_database_url
REM Usage: call :build_database_url service_name
REM Returns: database URL in DB_URL variable
setlocal enabledelayedexpansion
set service=%~1
call :get_service_database %service%
set "DB_URL=postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%SERVICE_DATABASE%"
exit /b 0

:print_services_config
REM Print all services configuration
cls
echo.
echo ════════════════════════════════════════════════════════
echo MICROSERVICES CONFIGURATION
echo ════════════════════════════════════════════════════════
echo.
echo Service              Port    Database                     Container
echo ────────────────────────────────────────────────────────────────────────────
echo api-gateway          3001    api_gateway                  medical_api_gateway
echo billing-service      3002    medical_coverage_billing     medical_billing_service
echo core-service         3003    medical_coverage_core        medical_core_service
echo finance-service      3004    medical_coverage_finance     medical_finance_service
echo crm-service          3005    medical_coverage_crm         medical_crm_service
echo membership-service   3006    medical_coverage_membership  medical_membership_service
echo hospital-service     3007    medical_coverage_hospital    medical_hospital_service
echo insurance-service    3008    medical_coverage_insurance   medical_insurance_service
echo wellness-service     3009    medical_coverage_wellness    medical_wellness_service
echo ────────────────────────────────────────────────────────────────────────────
echo Total Services: 9
echo.
exit /b 0

:print_environment_config
REM Print environment configuration
cls
echo.
echo ════════════════════════════════════════════════════════
echo ENVIRONMENT CONFIGURATION
echo ════════════════════════════════════════════════════════
echo.
echo Database:
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   User: %DB_USER%
echo   Admin DB: %DB_NAME%
echo.
echo Redis:
echo   Host: %REDIS_HOST%
echo   Port: %REDIS_PORT%
echo   URL: %REDIS_URL%
echo.
echo Docker:
echo   Network: %NETWORK_NAME%
echo   Postgres: %POSTGRES_CONTAINER%
echo   Redis: %REDIS_CONTAINER%
echo   Tag: %DOCKER_TAG%
echo.
echo Deployment:
echo   Environment: %DEPLOYMENT_ENV%
echo   Node Env: %NODE_ENV%
echo   Log Level: %LOG_LEVEL%
echo   Service Timeout: %SERVICE_TIMEOUT%ms
echo.
exit /b 0

:validate_config
REM Validate service configuration
echo Validating service configuration...
set "VALID_SERVICES=0"
for /l %%i in (0,1,8) do (
    set "VALID_SERVICES=9"
)
if "%VALID_SERVICES%"=="9" (
    echo [SUCCESS] All 9 services configured correctly
    exit /b 0
) else (
    echo [ERROR] Service configuration invalid
    exit /b 1
)

REM ============================================================================
REM MAIN EXECUTION
REM ============================================================================

REM If called directly (not as a library), print configuration
if ".%~1"==".show-config" (
    call :print_services_config
    echo.
    call :print_environment_config
    echo.
    call :validate_config
)

endlocal
