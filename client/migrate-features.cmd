@echo off
echo ==================================================
echo  MEDICAL COVERAGE SYSTEM - AUTO FEATURE MIGRATION
echo ==================================================
echo.

set FEATURES=claims claims-management companies providers premiums finance crm schemes wellness risk-assessment dependents cards periods regions admin

for %%f in (%FEATURES%) do (
  echo Migrating feature: %%f
  
  rem Create subdirectories if they don't exist
  if not exist src\features\%%f\components mkdir src\features\%%f\components
  if not exist src\features\%%f\hooks mkdir src\features\%%f\hooks
  if not exist src\features\%%f\types mkdir src\features\%%f\types

  rem Move components if exists
  if exist src\components\%%f (
    move src\components\%%f\* src\features\%%f\components\ >nul 2>&1
    rmdir src\components\%%f >nul 2>&1
  )

  rem Try alternate naming conventions
  if exist src\components\%%~nf (
    move src\components\%%~nf\* src\features\%%f\components\ >nul 2>&1
    rmdir src\components\%%~nf >nul 2>&1
  )

  rem Move page if exists
  set PAGE_NAME=%%f
  call :uppercase PAGE_NAME
  if exist src\pages\!PAGE_NAME!.tsx (
    move src\pages\!PAGE_NAME!.tsx src\features\%%f\Page.tsx >nul 2>&1
  )

  echo ✓ Completed %%f
  echo.
)

echo ==================================================
echo MIGRATION COMPLETED
echo ==================================================
echo.
echo All features have been moved to /src/features/
echo Next steps:
echo 1. Create index.ts barrel files for each feature
echo 2. Update imports in router and components
echo 3. Remove old empty directories
echo.

goto :end

:uppercase
setlocal enabledelayedexpansion
set "s=!%~1!"
set "result="
:loop
if not defined s goto :finish
set "c=!s:~0,1!"
if "!c!" geq "a" if "!c!" leq "z" set "c=!c!ABCDEFGHIJKLMNOPQRSTUVWXYZ!"
set "result=!result!!c:~0,1!"
set "s=!s:~1!"
goto :loop
:finish
endlocal & set "%~1=%result%"
goto :eof

:end
pause