@echo off
REM Script to run Docker for each independent service in the MedicalCoverageSystem
REM Updated to ensure successful system startup with databases and networking

set SERVICES_DIR=.\services
set CLIENT_DIR=.\client
set SERVER_DIR=.\server

REM Database configuration
set POSTGRES_CONTAINER=medical-postgres
set REDIS_CONTAINER=medical-redis
set NETWORK_NAME=medical-network

REM Service databases
set DATABASES=medical-coverage-api-gateway medical-coverage-billing medical-coverage-core medical-coverage-crm medical-coverage-finance medical-coverage-hospital medical-coverage-insurance medical-coverage-membership medical-coverage-wellness

REM Function to check if container is running
:is_container_running
docker ps --filter "name=%~1" --filter "status=running" | findstr /C:"%~1" >nul 2>&1
goto :eof

REM Function to wait for container to be healthy
:wait_for_container
set container=%~1
set max_attempts=30
set attempt=1

echo Waiting for %container% to be ready...
:wait_loop
if %attempt% gtr %max_attempts% (
    echo Failed to wait for %container%
    goto :eof
)
docker exec %container% pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo %container% is ready!
    goto :eof
)
echo Attempt %attempt%/%max_attempts%: %container% not ready yet...
timeout /t 2 /nobreak >nul
set /a attempt+=1
goto wait_loop

REM Start PostgreSQL container
call :is_container_running %POSTGRES_CONTAINER%
if %errorlevel% neq 0 (
    echo Starting PostgreSQL container...
    docker run -d --name %POSTGRES_CONTAINER% -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
    if %errorlevel% neq 0 (
        echo Failed to start PostgreSQL
        exit /b 1
    )
) else (
    echo PostgreSQL container already running
)

REM Start Redis container
call :is_container_running %REDIS_CONTAINER%
if %errorlevel% neq 0 (
    echo Starting Redis container...
    docker run -d --name %REDIS_CONTAINER% -p 6379:6379 redis:7
    if %errorlevel% neq 0 (
        echo Failed to start Redis
        exit /b 1
    )
) else (
    echo Redis container already running
)

REM Wait for PostgreSQL to be ready
call :wait_for_container %POSTGRES_CONTAINER%
if %errorlevel% neq 0 (
    echo PostgreSQL failed to start properly
    exit /b 1
)

REM Create databases
echo Creating databases...
for %%d in (%DATABASES%) do (
    echo Creating database: %%d
    docker exec %POSTGRES_CONTAINER% psql -U postgres -c "CREATE DATABASE %%d;" 2>nul || echo Database %%d may already exist
)

REM Create Docker network
echo Creating Docker network: %NETWORK_NAME%
docker network create %NETWORK_NAME% 2>nul || echo Network %NETWORK_NAME% may already exist

REM Function to run docker-compose if exists, else build and run Dockerfile
:run_service
set service_path=%~1
for %%i in ("%service_path%") do set service_name=%%~ni

if exist "%service_path%\docker-compose.yml" (
    echo Running docker-compose for %service_name%
    cd /d "%service_path%"
    docker-compose up -d
    cd /d "%~dp0"
) else (
    if exist "%service_path%\Dockerfile" (
        echo Building and running Docker for %service_name%
        docker build -t "medical-%service_name%" "%service_path%"
        if %errorlevel% neq 0 (
            echo Failed to build %service_name%
            set failed_services=%failed_services% %service_name%
            goto :eof
        )
        REM Set service-specific environment variables
        if "%service_name%"=="api-gateway" (
            set ENV_VARS=-e API_GATEWAY_DATABASE_URL=postgresql://postgres:postgres@%POSTGRES_CONTAINER%:5432/medical-coverage-api-gateway
        ) else if "%service_name%"=="billing-service" (
            set ENV_VARS=-e BILLING_DATABASE_URL=postgresql://postgres:postgres@%POSTGRES_CONTAINER%:5432/medical-coverage-billing
        ) else if "%service_name%"=="core-service" (
            set ENV_VARS=-e CORE_DATABASE_URL=postgresql://postgres:postgres@%POSTGRES_CONTAINER%:5432/medical-coverage-core
        ) else if "%service_name%"=="crm-service" (
            set ENV_VARS=-e CRM_DATABASE_URL=postgresql://postgres:postgres@%POSTGRES_CONTAINER%:5432/medical-coverage-crm
        ) else if "%service_name%"=="finance-service" (
            set ENV_VARS=-e FINANCE_DATABASE_URL=postgresql://postgres:postgres@%POSTGRES_CONTAINER%:5432/medical-coverage-finance
        ) else if "%service_name%"=="hospital-service" (
            set ENV_VARS=-e HOSPITAL_DATABASE_URL=postgresql://postgres:postgres@%POSTGRES_CONTAINER%:5432/medical-coverage-hospital
        ) else if "%service_name%"=="insurance-service" (
            set ENV_VARS=-e INSURANCE_DATABASE_URL=postgresql://postgres:postgres@%POSTGRES_CONTAINER%:5432/medical-coverage-insurance
        ) else if "%service_name%"=="membership-service" (
            set ENV_VARS=-e MEMBERSHIP_DATABASE_URL=postgresql://postgres:postgres@%POSTGRES_CONTAINER%:5432/medical-coverage-membership
        ) else if "%service_name%"=="wellness-service" (
            set ENV_VARS=-e WELLNESS_DATABASE_URL=postgresql://postgres:postgres@%POSTGRES_CONTAINER%:5432/medical-coverage-wellness
        ) else (
            set ENV_VARS=
        )

        docker run -d --name "medical-%service_name%" --network %NETWORK_NAME% -e POSTGRES_HOST=%POSTGRES_CONTAINER% -e REDIS_HOST=%REDIS_CONTAINER% %ENV_VARS% "medical-%service_name%"
        if %errorlevel% neq 0 (
            echo Failed to run %service_name%
            set failed_services=%failed_services% %service_name%
            goto :eof
        )
    ) else (
        echo No Docker setup found for %service_name%
        set failed_services=%failed_services% %service_name%
    )
)
goto :eof

REM Run client
if exist "%CLIENT_DIR%\Dockerfile" (
    echo Building and running Docker for client
    docker build -t medical-client "%CLIENT_DIR%"
    if %errorlevel% equ 0 (
        docker run -d --name medical-client --network %NETWORK_NAME% -p 5173:5173 medical-client
    ) else (
        echo Failed to build client
    )
)

REM Run server
if exist "%SERVER_DIR%\Dockerfile" (
    echo Building and running Docker for server
    docker build -t medical-server "%SERVER_DIR%"
    if %errorlevel% equ 0 (
        docker run -d --name medical-server --network %NETWORK_NAME% -p 5000:5000 medical-server
    ) else (
        echo Failed to build server
    )
)

REM Run each service
set failed_services=
for /d %%d in ("%SERVICES_DIR%\*") do (
    call :run_service "%%d"
)

REM Summary
if "%failed_services%"=="" (
    echo All services started successfully!
    echo API Gateway should be available at http://localhost:5000
    echo Client should be available at http://localhost:5173
) else (
    echo Some services failed to start: %failed_services%
    exit /b 1
)

pause
