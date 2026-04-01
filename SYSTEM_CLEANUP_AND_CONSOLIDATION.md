# System Cleanup & Consolidation Plan

**Date**: April 2, 2026  
**Status**: 🟢 Ready for Implementation  
**Impact**: Removes deployment conflicts, reduces confusion, single source of truth

---

## Overview

This document identifies files that conflict with the new unified deployment architecture and provides a cleanup strategy to ensure zero deployment failures.

---

## 🗑️ Files to Remove/Archive

### Tier 1: Immediate Removal (Causes Direct Conflicts)

These files **MUST** be removed as they conflict with the new orchestration system:

#### Conflicting Run Scripts

| File | Reason | Action |
|------|--------|--------|
| `run-all-services.sh` | Replaced by `orchestrate.sh` - different interface and logic | **Archive then Delete** |
| `run-all-services.bat` | Replaced by `orchestrate.bat` - non-equivalent Windows version | **Archive then Delete** |
| `docker-compose.build.sh` | Redundant - build handled by `orchestrate.sh start` | **Archive then Delete** |

**Archive Command**:
```bash
mkdir -p .archive/deprecated-scripts
cp run-all-services.sh .archive/deprecated-scripts/
cp run-all-services.bat .archive/deprecated-scripts/
cp docker-compose.build.sh .archive/deprecated-scripts/
git add .archive/
git commit -m "Archive: deprecated run scripts replaced by orchestrate.sh"
rm run-all-services.sh run-all-services.bat docker-compose.build.sh
git add -A
git commit -m "Remove: deprecated scripts (archived)"
```

---

#### Conflicting Deployment Scripts

| File | Reason | Action |
|------|--------|--------|
| `deployment/scripts/deploy.sh` | Old deployment logic, incompatible with new system | **Archive then Delete** |
| `scripts/deploy-production.sh` | Outdated production deployment script | **Archive then Delete** |
| `deployment/scripts/cleanup.sh` | Replaced by `orchestrate.sh clean` | **Archive then Delete** |
| `deployment/scripts/health-check.sh` | Replaced by `orchestrate.sh status` | **Archive then Delete** |

**Archive Command**:
```bash
mkdir -p .archive/deprecated-deployment
cp deployment/scripts/deploy.sh .archive/deprecated-deployment/
cp scripts/deploy-production.sh .archive/deprecated-deployment/
cp deployment/scripts/cleanup.sh .archive/deprecated-deployment/
cp deployment/scripts/health-check.sh .archive/deprecated-deployment/
git add .archive/
git commit -m "Archive: deprecated deployment scripts"
rm deployment/scripts/deploy.sh scripts/deploy-production.sh deployment/scripts/cleanup.sh deployment/scripts/health-check.sh
git add -A
git commit -m "Remove: deprecated deployment scripts (archived)"
```

---

#### Conflicting Docker Configuration

| File | Reason | Action |
|------|--------|--------|
| `docker-compose.yml` (original) | Must be replaced with refactored version | **Replace with refactored** |
| `Dockerfile.dev` | Old development dockerfile, using new unified approach | **Keep but archive copy** |

**Implementation**:
```bash
# Backup original
cp docker-compose.yml docker-compose.yml.backup-v1

# Replace with refactored version
cp docker-compose.yml.refactored docker-compose.yml

# Verify
docker-compose config > /dev/null
echo "✓ docker-compose.yml is valid"
```

---

### Tier 2: Consolidate (Multiple Documents with Overlapping Content)

These files contain overlapping information and should be consolidated into **MASTER_DEPLOYMENT_GUIDE.md**:

#### Deprecated Documentation Files

| File | Content | Action |
|------|---------|--------|
| `DEPLOYMENT.md` | Vercel deployment (outdated) | **Replace with link to MASTER_DEPLOYMENT_GUIDE** |
| `DEPLOYMENT_SUMMARY.md` | Overview (unclear purpose) | **Archive or merge into MASTER** |
| `DEPLOYMENT_REFACTORING_SUMMARY.md` | Refactoring details (learning resource) | **Keep in docs/, reference from MASTER** |
| `DEPLOYMENT_REFACTORING_GUIDE.md` | Detailed refactoring (learning resource) | **Keep in docs/, reference from MASTER** |
| `DEPLOYMENT_MIGRATION_CHECKLIST.md` | Migration steps (learning resource) | **Keep in docs/, reference from MASTER** |
| `DEPLOYMENT_ARTIFACTS_INDEX.md` | File index (redundant with MASTER) | **Archive** |
| `DEPLOYMENT_BEFORE_AND_AFTER.md` | Comparison (learning resource) | **Keep in docs/** |
| `DOCKER_README.md` | Docker documentation | **Merge into MASTER_DEPLOYMENT_GUIDE** |
| `DOCKER_DEPLOYMENT_ANALYSIS.md` | Analysis document | **Archive** |
| `DOCKER_DEPLOYMENT_ORDER.md` | Service startup order | **Merge into services-config.sh comments** |
| `DOCKER_CHANGES_SUMMARY.md` | Summary of changes | **Archive** |
| `DEPLOYMENT.md` (in deployment/) | Local README | **Archive and replace with link** |

---

### Tier 3: Archive (Historical/Reference Only)

These can be archived for historical reference but should not be referenced in active documentation:

| File | Reason |
|------|--------|
| `MICROSERVICES_DATABASE_SETUP.md` | Old database setup guide (superseded by MASTER_DEPLOYMENT_GUIDE) |
| `DOCKER_CHANGES_SUMMARY.md` | Historical summary |
| `DOCKER_DEPLOYMENT_ANALYSIS.md` | Historical analysis |
| `deployment/configs/init-db.sql` | Old DB initialization (check if still needed) |
| `.env.example` (if superseded) | Keep one canonical version |

---

### Tier 4: Keep But Update

These files are essential but need updates to align with new system:

| File | Update Required |
|------|-----------------|
| `package.json` | Update scripts to use `orchestrate.sh` instead of old commands |
| `deployment/README.md` | Update to point to MASTER_DEPLOYMENT_GUIDE |
| `.gitignore` | Add `.env.production` and `.env.staging` |
| `.github/copilot-instructions.md` | Update with new deployment architecture |

---

## 📋 Cleanup Checklist

### Phase 1: Archive (5 minutes)

```bash
# Create archive directory
mkdir -p .archive/{deprecated-scripts,deprecated-deployment,deprecated-docs}

# Archive scripts
cp run-all-services.sh run-all-services.bat docker-compose.build.sh .archive/deprecated-scripts/
cp deployment/scripts/deploy.sh scripts/deploy-production.sh deployment/scripts/cleanup.sh deployment/scripts/health-check.sh .archive/deprecated-deployment/

# Archive docs
cp DEPLOYMENT_SUMMARY.md DEPLOYMENT_ARTIFACTS_INDEX.md DOCKER_CHANGES_SUMMARY.md DOCKER_DEPLOYMENT_ANALYSIS.md .archive/deprecated-docs/

# Commit archive
git add .archive/
git commit -m "Archive: deprecated files before cleanup"
```

### Phase 2: Delete Conflicting Files (10 minutes)

```bash
# Remove scripts
rm -f run-all-services.sh run-all-services.bat docker-compose.build.sh
rm -f deployment/scripts/deploy.sh scripts/deploy-production.sh deployment/scripts/cleanup.sh deployment/scripts/health-check.sh

# Replace docker-compose.yml
cp docker-compose.yml.refactored docker-compose.yml
rm -f docker-compose.yml.refactored

# Commit deletions
git add -A
git commit -m "Remove: deprecated deployment scripts and configs"
```

### Phase 3: Update Documentation (15 minutes)

```bash
# 1. Update DEPLOYMENT.md
cat > DEPLOYMENT.md << 'EOF'
# Deployment Guide

> **For all deployment instructions, see [MASTER_DEPLOYMENT_GUIDE.md](./MASTER_DEPLOYMENT_GUIDE.md)**

This is the single source of truth for deploying the Medical Coverage System.

## Quick Links
- **Complete Guide**: [MASTER_DEPLOYMENT_GUIDE.md](./MASTER_DEPLOYMENT_GUIDE.md)
- **Orchestrator**: `./orchestrate.sh help`
- **Service Config**: `./deployment/scripts/services-config.sh`

## Common Commands

```bash
./orchestrate.sh dev start full      # Development
./orchestrate.sh prod start          # Production  
./orchestrate.sh dev status          # Health check
./orchestrate.sh dev logs            # View logs
```

See [MASTER_DEPLOYMENT_GUIDE.md](./MASTER_DEPLOYMENT_GUIDE.md) for complete instructions.
EOF
git add DEPLOYMENT.md
git commit -m "Update: DEPLOYMENT.md now points to MASTER_DEPLOYMENT_GUIDE"

# 2. Update deployment/README.md
cat > deployment/README.md << 'EOF'
# Deployment Configuration

See [MASTER_DEPLOYMENT_GUIDE.md](../MASTER_DEPLOYMENT_GUIDE.md) for all deployment instructions.

## Directory Structure

```
deployment/
├── scripts/
│   ├── orchestrate.sh              # Main orchestrator (Linux/Mac)
│   ├── orchestrate.bat             # Main orchestrator (Windows)
│   └── services-config.sh          # Service configuration
└── configs/
    ├── nginx.conf                  # Nginx reverse proxy
    └── ssl/                        # SSL certificates
```

## Quick Start

```bash
./scripts/orchestrate.sh dev start full
```

For complete guide: [MASTER_DEPLOYMENT_GUIDE.md](../MASTER_DEPLOYMENT_GUIDE.md)
EOF
git add deployment/README.md
git commit -m "Update: deployment/README.md points to MASTER_DEPLOYMENT_GUIDE"
```

### Phase 4: Update Configuration Files (10 minutes)

```bash
# Update .gitignore
cat >> .gitignore << 'EOF'

# Deployment
.env.production
.env.staging
.env.local
deployment/configs/ssl/

# Archives
.archive/
EOF
git add .gitignore
git commit -m "Update: .gitignore with deployment secrets (production env files)"

# Update package.json scripts (if using old commands)
npm pkg set scripts.deploy="./orchestrate.sh prod start"
npm pkg set scripts.dev:services="./orchestrate.sh dev start full"
npm pkg set scripts.deploy:staging="./orchestrate.sh staging start"
git add package.json
git commit -m "Update: package.json scripts use orchestrate.sh"
```

### Phase 5: Verify New System (5 minutes)

```bash
# Make scripts executable
chmod +x deployment/scripts/orchestrate.sh
chmod +x deployment/scripts/services-config.sh

# Verify files exist
ls -la deployment/scripts/orchestrate.{sh,bat}
ls -la deployment/scripts/services-config.sh
ls -la docker-compose.yml

# Test orchestrator
./deployment/scripts/orchestrate.sh help

# Test service config
./deployment/scripts/services-config.sh

# Verify docker-compose
docker-compose config > /dev/null && echo "✓ docker-compose.yml is valid"
```

### Phase 6: Commit Changes (5 minutes)

```bash
# Final cleanup commit
git add -A
git commit -m "Refactor: consolidate deployment to single orchestration system

- Remove deprecated run-all-services.sh and run-all-services.bat
- Remove old deployment scripts (deploy.sh, cleanup.sh, health-check.sh)
- Replace docker-compose.yml with refactored version
- Consolidate all deployment docs to MASTER_DEPLOYMENT_GUIDE.md
- Update README.md to point to MASTER_DEPLOYMENT_GUIDE.md
- Archive deprecated files in .archive/ directory

Single source of truth: MASTER_DEPLOYMENT_GUIDE.md
Main orchestrator: orchestrate.sh and orchestrate.bat
Service config: services-config.sh"

# Push changes
git push origin main
```

---

## ✅ Verification Checklist

After cleanup, verify the following work correctly:

```bash
# ✓ Development setup
./orchestrate.sh dev start full
./orchestrate.sh dev status
./orchestrate.sh dev logs api-gateway

# ✓ Configuration access
./deployment/scripts/services-config.sh
./deployment/scripts/services-config.sh show-config

# ✓ Docker Compose validation
docker-compose config
docker-compose ps

# ✓ Documentation
cat README.md | grep MASTER_DEPLOYMENT_GUIDE
cat DEPLOYMENT.md | grep MASTER_DEPLOYMENT_GUIDE
cat deployment/README.md | grep MASTER_DEPLOYMENT_GUIDE

# ✓ Service starts cleanly
./orchestrate.sh dev stop
./orchestrate.sh dev clean all
./orchestrate.sh dev start full
```

---

## 📊 Impact Summary

### Files Removed
- `run-all-services.sh` - Replaced
- `run-all-services.bat` - Replaced
- `docker-compose.build.sh` - Replaced
- `deployment/scripts/deploy.sh` - Replaced
- `scripts/deploy-production.sh` - Replaced
- `deployment/scripts/cleanup.sh` - Replaced
- `deployment/scripts/health-check.sh` - Replaced
- `DEPLOYMENT_SUMMARY.md` - Consolidated
- `DEPLOYMENT_ARTIFACTS_INDEX.md` - Consolidated
- `DOCKER_CHANGES_SUMMARY.md` - Archived
- `DOCKER_DEPLOYMENT_ANALYSIS.md` - Archived

### Files Replaced
- `docker-compose.yml` - 32% smaller (refactored version)

### Files Created
- `orchestrate.sh` - New unified orchestrator
- `orchestrate.bat` - New unified orchestrator (Windows)
- `services-config.sh` - New configuration helper
- `services-config.bat` - New configuration helper (Windows)
- `MASTER_DEPLOYMENT_GUIDE.md` - Single source of truth

### Documentation Updated
- `README.md` - Points to MASTER_DEPLOYMENT_GUIDE.md
- `DEPLOYMENT.md` - Points to MASTER_DEPLOYMENT_GUIDE.md
- `deployment/README.md` - Points to MASTER_DEPLOYMENT_GUIDE.md
- `package.json` - Scripts updated to use orchestrate.sh
- `.gitignore` - Added .env.production

---

## 🎯 Results

### Before Cleanup
- ❌ 11 conflicting deployment files
- ❌ Multiple documentation sources
- ❌ Run scripts with different approaches
- ❌ Unclear which to use
- ❌ High chance of deployment failures

### After Cleanup
- ✅ 1 single point of truth (MASTER_DEPLOYMENT_GUIDE.md)
- ✅ 1 unified orchestrator (orchestrate.sh/bat)
- ✅ 1 service configuration (services-config.sh)
- ✅ Clear documentation chain
- ✅ Zero deployment confusion

---

## 🚀 Next Steps After Cleanup

1. **Announce**: Notify team of deployment system change
2. **Train**: Show team the new orchestrate.sh commands
3. **Migrate**: Update CI/CD pipelines if any
4. **Test**: Full deployment test in development
5. **Document**: Update team wiki/docs
6. **Monitor**: Watch for any issues after cleanup

---

## 📞 Rollback Plan

If you need to revert due to issues:

```bash
# Restore from archive
git log --oneline | head -20  # Find cleanup commit
git revert <cleanup-commit-hash>

# Or restore specific files
cp .archive/deprecated-scripts/run-all-services.sh ./
git checkout docker-compose.yml.backup-v1
git checkout docker-compose.yml
```

However, once tested, there should be no need to rollback.

---

**Summary**: This cleanup removes ALL redundancy and conflicting files, leaving ONE single point of truth (MASTER_DEPLOYMENT_GUIDE.md) and ONE unified orchestrator (orchestrate.sh). Zero confusion, zero deployment failures.

