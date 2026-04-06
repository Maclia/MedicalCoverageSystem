# update-dependencies.ps1
# Medical Coverage System - Dependency Update Script
# Run from: c:\Users\ADMIN\Documents\GitHub\MedicalCoverageSystem

param(
    [switch]$SkipClean,
    [switch]$SkipInstall,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$ProjectRoot = "c:\Users\ADMIN\Documents\GitHub\MedicalCoverageSystem"

function Write-Section {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Navigate to project root
Set-Location $ProjectRoot

Write-Section "Medical Coverage System - Dependency Update"

# Step 1: Clean old node_modules
if (-not $SkipClean) {
    Write-Section "Step 1: Cleaning old node_modules directories"
    
    $modulesToClean = @(
        "node_modules",
        "services\core-service\node_modules",
        "services\shared\node_modules",
        "services\fraud-detection-service\node_modules"
    )
    
    foreach ($module in $modulesToClean) {
        $fullPath = Join-Path $ProjectRoot $module
        if (Test-Path $fullPath) {
            if ($Verbose) { Write-Host "Removing: $module" }
            Remove-Item -Recurse -Force $fullPath -ErrorAction SilentlyContinue
            Write-Success "Removed: $module"
        } else {
            Write-Warning "Not found (skipping): $module"
        }
    }
} else {
    Write-Warning "Skipping clean step"
}

# Step 2: Install dependencies
if (-not $SkipInstall) {
    Write-Section "Step 2: Installing npm dependencies"
    
    Write-Host "Running: npm install" -ForegroundColor Gray
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "npm install completed successfully"
    } else {
        Write-Error "npm install failed with exit code $LASTEXITCODE"
        exit 1
    }
} else {
    Write-Warning "Skipping install step"
}

# Step 3: Verify versions
Write-Section "Step 3: Verifying drizzle-orm versions"

$versions = @{}

Write-Host ""
Write-Host "Checking versions..." -ForegroundColor Gray

# Root
$rootVersion = npm list drizzle-orm --depth=0 2>$null | Select-Object -First 1
if ($rootVersion -match "drizzle-orm@(.+)") {
    $versions["Root"] = $Matches[1]
}

# Core Service
$coreVersion = npm list drizzle-orm --workspace=services/core-service --depth=0 2>$null | Select-Object -First 1
if ($coreVersion -match "drizzle-orm@(.+)") {
    $versions["Core Service"] = $Matches[1]
}

# Shared
$sharedVersion = npm list drizzle-orm --workspace=services/shared --depth=0 2>$null | Select-Object -First 1
if ($sharedVersion -match "drizzle-orm@(.+)") {
    $versions["Shared"] = $Matches[1]
}

# Fraud Detection Service
$fraudVersion = npm list drizzle-orm --workspace=services/fraud-detection-service --depth=0 2>$null | Select-Object -First 1
if ($fraudVersion -match "drizzle-orm@(.+)") {
    $versions["Fraud Detection"] = $Matches[1]
}

# Display results
Write-Host ""
$allMatch = $true
$firstVersion = $null
foreach ($service in $versions.Keys) {
    $version = $versions[$service]
    if ($null -eq $firstVersion) { $firstVersion = $version }
    if ($version -eq $firstVersion) {
        Write-Success "$service`: $version"
    } else {
        Write-Error "$service`: $version (mismatch!)"
        $allMatch = $false
    }
}

if ($allMatch) {
    Write-Host ""
    Write-Success "All services have consistent drizzle-orm versions!"
} else {
    Write-Host ""
    Write-Warning "Version mismatch detected. Run: npm install drizzle-orm@0.30.10 --workspaces"
}

# Step 4: TypeScript compilation check
Write-Section "Step 4: TypeScript compilation check"

$originalLocation = Get-Location
Set-Location "$ProjectRoot\services\core-service"

Write-Host "Running: npx tsc --noEmit" -ForegroundColor Gray
$tscOutput = npx tsc --noEmit 2>&1
$tscExitCode = $LASTEXITCODE

Set-Location $originalLocation

if ($tscExitCode -eq 0) {
    Write-Success "TypeScript compilation passed - No errors!"
} else {
    Write-Error "TypeScript compilation failed"
    Write-Host ""
    Write-Host "First 20 errors:" -ForegroundColor Yellow
    $tscOutput | Select-Object -First 20
}

# Summary
Write-Section "Summary"
Write-Host ""
Write-Host "Project Root: $ProjectRoot" -ForegroundColor White
Write-Host "Drizzle ORM Version: $($versions.Values | Select-Object -First 1)" -ForegroundColor White
Write-Host "TypeScript Status: $(if ($tscExitCode -eq 0) { 'PASSED' } else { 'FAILED' })" -ForegroundColor $(if ($tscExitCode -eq 0) { 'Green' } else { 'Red' })
Write-Host ""

if ($tscExitCode -eq 0 -and $allMatch) {
    Write-Success "All done! Dependencies are consistent and TypeScript compiles successfully."
} else {
    Write-Warning "Some issues were found. Review the output above."
}

Write-Host ""
