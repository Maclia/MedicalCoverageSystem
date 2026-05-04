# update-dependencies.ps1
# Medical Coverage System - Dependency Update Script
# Improved version with Node 20 check, Puppeteer skip, and robust cleanup

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
    param(
        [scriptblock]$ScriptBlock,
        [string]$ErrorMessage
    )
    
    Write-Info "Executing: $($ScriptBlock.ToString())"
    
    if ($DryRun) {
        Write-Success "[DRY RUN] Would execute: $($ScriptBlock.ToString())"
        return 0
    }
    
    try {
        & $ScriptBlock
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            throw "$ErrorMessage (exit code: $exitCode)"
        }
        return $exitCode
    }
    catch {
        Write-Error $_.Exception.Message
        exit 1
    }
}

function Remove-ItemWithRetry {
    param(
        [string]$Path,
        [int]$MaxRetries = 3,
        [int]$DelayMs = 500
    )
    
    if (-not (Test-Path $Path)) {
        return
    }
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            Remove-Item -Recurse -Force $Path -ErrorAction Stop
            Write-Success "Removed: $Path"
            return
        }
        catch {
            if ($i -eq $MaxRetries) {
                Write-Error "Failed to remove $Path after $MaxRetries attempts: $_"
                # Don't exit - continue with script
            }
            else {
                Write-Info "Retry $i/$MaxRetries for $Path after $DelayMs ms"
                Start-Sleep -Milliseconds $DelayMs
            }
        }
    }
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

# Check Node.js version
$nodeVersion = node --version 2>$null
if ($nodeVersion -match 'v(\d+)\.') {
    $majorVersion = [int]$Matches[1]
    if ($majorVersion -ne 20) {
        Write-Warning "Node.js version $nodeVersion detected. This project is designed for Node 20.x."
        Write-Warning "You may encounter issues. Install Node 20 and use 'nvm use 20' if possible."
    }
    else {
        Write-Success "Node.js version $nodeVersion (20.x) - OK"
    }
}
else {
    Write-Warning "Unable to determine Node.js version. Make sure Node is installed."
}

# Force Puppeteer to skip Chrome download (avoids download failures)
$env:PUPPETEER_SKIP_DOWNLOAD = "true"
Write-Info "PUPPETEER_SKIP_DOWNLOAD set to true"

# -----------------------------------------------------------------------------
# Step 1: Clean dependencies
# -----------------------------------------------------------------------------
if (-not $SkipClean) {
    Write-Section "Step 1: Cleaning old dependencies"
    
    # Auto-discover ALL node_modules directories
    $nodeModules = Get-ChildItem -Path $ProjectRoot -Recurse -Directory -Filter "node_modules" -Depth 3 -ErrorAction SilentlyContinue |
                   Where-Object { $_.FullName -notmatch 'node_modules[\\/]' } |
                   Select-Object -ExpandProperty FullName
    
    Write-Host "Found $($nodeModules.Count) node_modules directories"
    
    foreach ($dir in $nodeModules) {
        $relativePath = $dir.Substring($ProjectRoot.Length + 1)
        Write-Info "Removing: $relativePath"
        Remove-ItemWithRetry -Path $dir -MaxRetries 5 -DelayMs 500
    }
    
    # Clean package locks and cache
    if (Test-Path "package-lock.json") {
        Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
        Write-Success "Removed package-lock.json"
    }
    
    # Manually delete npm cache folder to avoid ENOTEMPTY errors
    $npmCachePath = Join-Path $env:LOCALAPPDATA "npm-cache\_cacache"
    if (Test-Path $npmCachePath) {
        Write-Host "Manually clearing npm cache folder..." -ForegroundColor Gray
        Remove-ItemWithRetry -Path $npmCachePath -MaxRetries 3 -DelayMs 200
        Write-Success "Cleared npm cache folder"
    }
    
    Invoke-SafeCommand -ScriptBlock { npm cache verify } -ErrorMessage "Failed to verify npm cache"
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
        Invoke-SafeCommand -ScriptBlock { npm ci } -ErrorMessage "npm ci failed"
    }
    else {
        Write-Host "Running: npm update with legacy peer dependencies" -ForegroundColor Gray
        Invoke-SafeCommand -ScriptBlock { npm update --legacy-peer-deps } -ErrorMessage "npm update failed"
    }
    
    Write-Success "Dependencies updated successfully"
    
    # Deduplicate dependencies
    Write-Host "Running: npm dedupe" -ForegroundColor Gray
    Invoke-SafeCommand -ScriptBlock { npm dedupe } -ErrorMessage "npm dedupe failed"
    Write-Success "Dependencies deduplicated"
}
else {
    Write-Warning "Skipping install step"
}

# -----------------------------------------------------------------------------
# Step 3: Version consistency verification
# -----------------------------------------------------------------------------
$allConsistent = $true
$tscExitCode = 0

if (-not $NoVerify) {
    Write-Section "Step 3: Verifying library versions"
    
    $packagesToCheck = @("drizzle-orm", "typescript", "react", "@types/node")
    
    # Get all workspaces from package.json
    try {
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        $workspaces = $packageJson.workspaces
        if (-not $workspaces) {
            Write-Warning "No workspaces defined in package.json"
            $workspaces = @()
        }
    }
    catch {
        Write-Warning "Could not parse package.json workspaces"
        $workspaces = @()
    }
    
    foreach ($package in $packagesToCheck) {
        Write-Host "`nChecking $package versions..." -ForegroundColor Gray
        
        $versions = @{}
        
        # Check root
        $rootList = npm list $package --depth=0 2>$null
        if ($rootList -match "$package@(\S+)") {
            $versions["Root"] = $Matches[1]
        }
        
        # Check workspaces
        foreach ($workspace in $workspaces) {
            $wsList = npm list $package --workspace=$workspace --depth=0 2>$null
            if ($wsList -match "$package@(\S+)") {
                $versions[$workspace] = $Matches[1]
            }
        }
        
        $firstVersion = $versions.Values | Select-Object -First 1
        $packageConsistent = $true
        
        if (-not $firstVersion) {
            Write-Warning "  Package $package not found in any workspace"
            continue
        }
        
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
    $tscExitCode = 0
    Invoke-SafeCommand -ScriptBlock { npx tsc --noEmit } -ErrorMessage "TypeScript compilation failed" -ErrorAction SilentlyContinue
    $tscExitCode = $LASTEXITCODE
    
    if ($tscExitCode -eq 0) {
        Write-Success "TypeScript compilation passed - No errors!"
    }
    else {
        Write-Error "TypeScript compilation failed with exit code $tscExitCode"
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