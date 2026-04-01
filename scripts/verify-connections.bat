@echo off
REM Service Connectivity Verification Script - Windows Version
REM Checks all UI -> API -> Database connections

setlocal enabledelayedexpansion

set "PASSED=0"
set "FAILED=0"

echo.
echo ================================================================================
echo   Service Connectivity Verification
echo   Medical Coverage System - Microservices Architecture
echo ================================================================================
echo.

REM Function to check service
setlocal enabledelayedexpansion
call :check_service "Frontend (localhost:3000)" "localhost" "3000" "/"
call :check_service "API Gateway (localhost:3001)" "localhost" "3001" "/health"
call :check_service "Core Service (localhost:3003)" "localhost" "3003" "/health"
call :check_service "Billing Service (localhost:3002)" "localhost" "3002" "/health"
call :check_service "CRM Service (localhost:3005)" "localhost" "3005" "/health"
call :check_service "Insurance Service (localhost:3008)" "localhost" "3008" "/health"
call :check_service "Hospital Service (localhost:3007)" "localhost" "3007" "/health"
call :check_service "Finance Service (localhost:3004)" "localhost" "3004" "/health"
call :check_service "Membership Service (localhost:3006)" "localhost" "3006" "/health"
call :check_service "Wellness Service (localhost:3009)" "localhost" "3009" "/health"

echo.
echo ================================================================================
echo   Summary
echo ================================================================================
if !FAILED! equ 0 (
  echo All connectivity checks passed!
  exit /b 0
) else (
  echo Some connectivity checks failed. Please review errors above.
  echo.
  echo Troubleshooting Tips:
  echo 1. Ensure all services are running: docker-compose ps
  echo 2. Check service logs: docker-compose logs [service-name]
  echo 3. Verify environment variables loaded correctly
  echo 4. Verify port availability: netstat -ano ^| findstr :3000-3009
  exit /b 1
)

endlocal
exit /b 0

REM Subroutine to check service
:check_service
setlocal
set "service_name=%~1"
set "host=%~2"
set "port=%~3"
set "path=%~4"

echo Checking %service_name%...
for /f "tokens=*" %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://%host%:%port%%path%' -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop; if ($response.StatusCode -eq 200) { Write-Host 'OK' } else { Write-Host 'FAILED' } } catch { Write-Host 'FAILED' }" 2^>nul') do set "result=%%A"

if "!result!"=="OK" (
  echo [OK] %service_name%
  set /a PASSED+=1
) else (
  echo [FAILED] %service_name%
  set /a FAILED+=1
)

endlocal & set "PASSED=%PASSED%" & set "FAILED=%FAILED%"
goto :eof
