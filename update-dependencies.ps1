# update-dependencies.ps1
# Medical Coverage System - Dependency Update Script
# Improved version with full monorepo support, auto-discovery and CI compatibility

param(
    [switch]$SkipClean,
    [switch]$SkipInstall,
    [switch]$CiMode,
    [switch]$NoVerify,
    [switch]$Verbose,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Auto-detect project root (works on any machine)
$ProjectRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    $ProjectRoot = $PSScriptRoot
}

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
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

function Write-Info {
    param([string]$Message)
    if ($Verbose) {
        Write-Host "[INFO] $Message" -ForegroundColor Gray
    }
}

function Invoke-SafeCommand {
    param([string]$Command, [string]$ErrorMessage)
    
    Write-Info "Executing: $Command"
    
    if ($DryRun) {
        Write-Success "[DRY RUN] Would execute: $Command"
        return 0
    }
    
    & cmd /c $Command
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -ne 0) {
        Write-Error "$ErrorMessage (exit code: $exitCode)"
        exit $exitCode
    }
    
    return $exitCode
}

# -----------------------------------------------------------------------------
# Initialization
# -----------------------------------------------------------------------------
Set-Location $ProjectRoot

Write-Section "Medical Coverage System - Dependency Update"
Write-Host "Project Root: $ProjectRoot"
if ($CiMode) {
    Write-Host "Mode: CI"
} else {
    Write-Host "Mode: Development"
}
Write-Host ""

# -----------------------------------------------------------------------------
# Step 1: Clean dependencies
# -----------------------------------------------------------------------------
if (-not $SkipClean) {
    Write-Section "Step 1: Cleaning old dependencies"
    
    # Auto-discover ALL node_modules directories
    $nodeModules = Get-ChildItem -Path $ProjectRoot -Recurse -Directory -Filter "node_modules" -Depth 3 |
                   Where-Object { $_.FullName -notmatch 'node_modules[\\/]' } |
                   Select-Object -ExpandProperty FullName
    
    Write-Host "Found $($nodeModules.Count) node_modules directories"
    
    foreach ($dir in $nodeModules) {
        $relativePath = $dir.Substring($ProjectRoot.Length + 1)
        Write-Info "Removing: $relativePath"
        
        if (-not $DryRun) {
            Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
        }
        
        Write-Success "Removed: $relativePath"
    }
    
    # Clean package locks and cache
    if (Test-Path "package-lock.json") {
        Remove-Item "package-lock.json" -ErrorAction SilentlyContinue
        Write-Success "Removed package-lock.json"
    }
    
    Invoke-SafeCommand "npm cache clean --force" "Failed to clean npm cache"
}
else {
    Write-Warning "Skipping clean step"
}

# -----------------------------------------------------------------------------
# Step 2: Install dependencies
# -----------------------------------------------------------------------------
if (-not $SkipInstall) {
    Write-Section "Step 2: Installing dependencies"
    
    if ($CiMode) {
        Write-Host "Running: npm ci (CI Mode)" -ForegroundColor Gray
        Invoke-SafeCommand "npm ci" "npm ci failed"
    }
    else {
        Write-Host "Running: npm install" -ForegroundColor Gray
        Invoke-SafeCommand "npm install" "npm install failed"
    }
    
    Write-Success "Dependencies installed successfully"
    
    # Deduplicate dependencies
    Write-Host "Running: npm dedupe" -ForegroundColor Gray
    Invoke-SafeCommand "npm dedupe" "npm dedupe failed"
    Write-Success "Dependencies deduplicated"
}
else {
    Write-Warning "Skipping install step"
}

# -----------------------------------------------------------------------------
# Step 3: Version consistency verification
# -----------------------------------------------------------------------------
if (-not $NoVerify) {
    Write-Section "Step 3: Verifying library versions"
    
    $packagesToCheck = @("drizzle-orm", "typescript", "react", "@types/node")
    $allConsistent = $true
    
    # Get all workspaces from package.json
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $workspaces = $packageJson.workspaces
    
    foreach ($package in $packagesToCheck) {
        Write-Host "`nChecking $package versions..." -ForegroundColor Gray
        
        $versions = @{}
        
        # Check root
        $rootVersion = npm list $package --depth=0 2>$null | Select-Object -First 1
        if ($rootVersion -match "$package@(.+)") {
            $versions["Root"] = $Matches[1]
        }
        
        # Check all workspaces
        foreach ($workspace in $workspaces) {
            $wsVersion = npm list $package --workspace=$workspace --depth=0 2>$null | Select-Object -First 1
            if ($wsVersion -match "$package@(.+)") {
                $versions[$workspace] = $Matches[1]
            }
        }
        
        # Display results
        $firstVersion = $versions.Values | Select-Object -First 1
        $packageConsistent = $true
        
        foreach ($name in $versions.Keys) {
            $version = $versions[$name]
            if ($version -eq $firstVersion) {
                Write-Success "  $name`: $version"
            }
            else {
                Write-Error "  $name`: $version (MISMATCH expected $firstVersion)"
                $packageConsistent = $false
                $allConsistent = $false
            }
        }
        
        if ($packageConsistent) {
            Write-Success "$package is consistent across all workspaces"
        }
        else {
            Write-Warning "$package has version mismatches!"
        }
    }
}

# -----------------------------------------------------------------------------
# Step 4: TypeScript compilation check
# -----------------------------------------------------------------------------
if (-not $NoVerify) {
    Write-Section "Step 4: TypeScript compilation check"
    
    Write-Host "Running full TypeScript check..." -ForegroundColor Gray
    $tscExitCode = Invoke-SafeCommand "npx tsc --noEmit" "TypeScript compilation failed"
    
    if ($tscExitCode -eq 0) {
        Write-Success "TypeScript compilation passed - No errors!"
    }
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
Write-Section "Summary"
Write-Host ""
Write-Host "Project Root: $ProjectRoot" -ForegroundColor White
if ($CiMode) {
    Write-Host "Mode:         CI" -ForegroundColor White
} else {
    Write-Host "Mode:         Development" -ForegroundColor White
}
if ($allConsistent -and $tscExitCode -eq 0) {
    Write-Host "Status:       ✅ PASSED" -ForegroundColor Green
} else {
    Write-Host "Status:       ⚠️  WARNINGS" -ForegroundColor Yellow
}
Write-Host ""

if ($allConsistent -and $tscExitCode -eq 0) {
    Write-Success "All done! Dependencies are consistent and TypeScript compiles successfully."
    exit 0
}
else {
    Write-Warning "Some issues were found. Review the output above."
    exit 1
}