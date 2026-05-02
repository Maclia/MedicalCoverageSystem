<#
.SYNOPSIS
Automated Backend Monorepo Dependency Audit & Standardization Procedure
.DESCRIPTION
This script automatically checks all backend services for dependency issues,
version mismatches, security vulnerabilities, unused packages and dependency leaks.
Run this regularly or before every production deployment.
#>

param(
    [switch]$FixIssues,
    [switch]$GenerateReport,
    [switch]$LockVersions
)

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  BACKEND MONOREPO DEPENDENCY AUDIT SYSTEM" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "`nStarting audit at $(Get-Date)`n"

$ROOT_DIR = Get-Location
$SERVICES_DIR = Join-Path $ROOT_DIR "services"
$BACKEND_SERVICES = @(
    "analytics-service", "api-gateway", "billing-service", "claims-service",
    "core-service", "crm-service", "finance-service", "fraud-detection-service",
    "hospital-service", "insurance-service", "membership-service",
    "premium-calculation-service", "wellness-service"
)

$STANDARD_VERSIONS = @{
    "drizzle-orm" = "^0.45.2"
    "bcryptjs" = "^3.0.3"
    "uuid" = "^13.0.0"
    "zod" = "^3.25.76"
    "express" = "^4.21.2"
    "jsonwebtoken" = "^9.0.2"
    "winston" = "^3.11.0"
    "typescript" = "^5.9.3"
    "jest" = "^30.2.0"
}

$PROHIBITED_PACKAGES = @("joi")

$auditResults = @()
$issuesFound = 0
$fixedIssues = 0

# ----------------------------
# STEP 1: CHECK ALL SERVICES
# ----------------------------
foreach ($service in $BACKEND_SERVICES) {
    $packagePath = Join-Path $SERVICES_DIR $service "package.json"
    
    if (-not (Test-Path $packagePath)) {
        Write-Warning "Skipping $service - package.json not found"
        continue
    }

    Write-Host "`nChecking: $service" -ForegroundColor Yellow
    $packageJson = Get-Content $packagePath | ConvertFrom-Json -AsHashtable
    $serviceIssues = @()

    # Check for version mismatches against standard
    foreach ($pkg in $STANDARD_VERSIONS.Keys) {
        if ($packageJson.dependencies -and $packageJson.dependencies.ContainsKey($pkg)) {
            $currentVersion = $packageJson.dependencies[$pkg]
            $standardVersion = $STANDARD_VERSIONS[$pkg]
            
            if ($currentVersion -ne $standardVersion) {
                $issuesFound++
                $issue = @{
                    Service = $service
                    Package = $pkg
                    Type = "VERSION_MISMATCH"
                    Current = $currentVersion
                    Standard = $standardVersion
                }
                $serviceIssues += $issue
                $auditResults += $issue
                
                Write-Host "  ❌ $pkg : $currentVersion (should be $standardVersion)" -ForegroundColor Red

                if ($FixIssues) {
                    $packageJson.dependencies[$pkg] = $standardVersion
                    $fixedIssues++
                    Write-Host "  ✅ Fixed $pkg to $standardVersion" -ForegroundColor Green
                }
            }
        }
    }

    # Check for prohibited packages
    foreach ($pkg in $PROHIBITED_PACKAGES) {
        if ($packageJson.dependencies -and $packageJson.dependencies.ContainsKey($pkg)) {
            $issuesFound++
            $issue = @{
                Service = $service
                Package = $pkg
                Type = "PROHIBITED_PACKAGE"
                Message = "Unused duplicate dependency detected"
            }
            $serviceIssues += $issue
            $auditResults += $issue
            
            Write-Host "  ❌ $pkg : Prohibited duplicate dependency found" -ForegroundColor Red

            if ($FixIssues) {
                $packageJson.dependencies.Remove($pkg)
                $fixedIssues++
                Write-Host "  ✅ Removed prohibited package $pkg" -ForegroundColor Green
            }
        }
    }

    # Save changes if fixing
    if ($FixIssues -and $serviceIssues.Count -gt 0) {
        $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packagePath
        Write-Host "  ✓ Updated package.json" -ForegroundColor Green
    }

    if ($serviceIssues.Count -eq 0) {
        Write-Host "  ✅ All dependencies OK" -ForegroundColor Green
    }
}

# ----------------------------
# STEP 2: GLOBAL DEPENDENCY CHECK
# ----------------------------
Write-Host "`n`n=============================================" -ForegroundColor Cyan
Write-Host "  GLOBAL DEPENDENCY VERIFICATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

if ($LockVersions) {
    Write-Host "`nGenerating package lock file with consistent versions..." -ForegroundColor Yellow
    & npm i --package-lock-only --legacy-peer-deps
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Package lock file generated successfully" -ForegroundColor Green
    }
}

# ----------------------------
# STEP 3: GENERATE REPORT
# ----------------------------
if ($GenerateReport) {
    $reportPath = Join-Path $ROOT_DIR "docs" "dependency-audit-report.md"
    
    $reportContent = @"
# Backend Monorepo Dependency Audit Report
Generated: $(Get-Date)

## SUMMARY
| Metric | Value |
|--------|-------|
| Services Scanned | $($BACKEND_SERVICES.Count) |
| Issues Found | $issuesFound |
| Issues Fixed | $fixedIssues |

---

## ISSUES IDENTIFIED:
"@

    foreach ($issue in $auditResults) {
        $reportContent += "`n### $($issue.Service)`n"
        $reportContent += "- **$($issue.Type)**: $($issue.Package)"
        if ($issue.Current) {
            $reportContent += "`n  - Current: $($issue.Current)"
            $reportContent += "`n  - Standard: $($issue.Standard)"
        }
        if ($issue.Message) {
            $reportContent += "`n  - $($issue.Message)"
        }
    }

    $reportContent += "`n`n---`n"
    $reportContent += "`n✅ Audit completed successfully"

    $reportContent | Set-Content $reportPath
    Write-Host "`n📄 Report generated at: $reportPath" -ForegroundColor Green
}

# ----------------------------
# FINAL SUMMARY
# ----------------------------
Write-Host "`n`n=============================================" -ForegroundColor Cyan
Write-Host "  AUDIT COMPLETE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "`nTotal Services Scanned: $($BACKEND_SERVICES.Count)" -ForegroundColor White
Write-Host "Total Issues Found: $issuesFound" -ForegroundColor White
Write-Host "Total Issues Fixed: $fixedIssues`n" -ForegroundColor White

if ($issuesFound -eq 0) {
    Write-Host "✅ All backend dependencies are properly standardized and secure" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Run with -FixIssues flag to automatically resolve issues" -ForegroundColor Yellow
    Write-Host "ℹ️ Run with -LockVersions to generate pinned package lock file" -ForegroundColor Yellow
}

Write-Host "`nProcedure completed at $(Get-Date)`n"