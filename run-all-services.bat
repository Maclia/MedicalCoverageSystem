@echo off
REM Script to run Docker for each independent service in the MedicalCoverageSystem

set SERVICES_DIR=.\services
set CLIENT_DIR=.\client
set SERVER_DIR=.\server

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
        docker run -d --name "medical-%service_name%" "medical-%service_name%"
    ) else (
        echo No Docker setup found for %service_name%
    )
)
goto :eof

REM Run client
if exist "%CLIENT_DIR%\Dockerfile" (
    echo Building and running Docker for client
    docker build -t medical-client "%CLIENT_DIR%"
    docker run -d --name medical-client -p 5173:5173 medical-client
)

REM Run server
if exist "%SERVER_DIR%\Dockerfile" (
    echo Building and running Docker for server
    docker build -t medical-server "%SERVER_DIR%"
    docker run -d --name medical-server -p 5000:5000 medical-server
)

REM Run each service
for /d %%d in ("%SERVICES_DIR%\*") do (
    call :run_service "%%d"
)

echo All services started.
pause