# TypeScript Node Types Resolution Guide

## Issue
TypeScript error: "Cannot find type definition file for 'node'"

**Root Cause:** Dependencies for `services/api-gateway` have not been installed yet.

**Status:** ✅ `@types/node` is already configured in `package.json` - just needs installation

---

## Solution: Install Dependencies

### Option 1: Using Command Prompt (Recommended for Windows)

1. **Open Command Prompt (Not PowerShell)**
   - Press `Win + R`
   - Type: `cmd`
   - Press Enter

2. **Navigate to api-gateway service**
   ```cmd
   cd C:\Users\ADMIN\Documents\GitHub\MedicalCoverageSystem\services\api-gateway
   ```

3. **Install dependencies**
   ```cmd
   npm install
   ```

4. **Verify installation**
   ```cmd
   npm run build:check
   ```

### Option 2: Fix PowerShell Execution Policy (If Preferred)

1. **Open PowerShell as Administrator**
   - Press `Win + X` → Select "Windows PowerShell (Admin)"

2. **Allow script execution**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Navigate to api-gateway**
   ```powershell
   cd 'C:\Users\ADMIN\Documents\GitHub\MedicalCoverageSystem\services\api-gateway'
   ```

4. **Install dependencies**
   ```powershell
   npm install
   ```

### Option 3: Install All Services at Once (Root Directory)

From the root `MedicalCoverageSystem` directory:

```cmd
npm install
```

This will install dependencies for all services if configured in root package.json.

---

## Configuration Details

### Current Setup
- **API Gateway package.json:** Includes `"@types/node": "^20.16.11"` in devDependencies
- **tsconfig.json:** Configured with `"types": ["node"]` and `"typeRoots": ["./node_modules/@types"]`
- **Status:** Ready to install, just needs `npm install` command

### After Installation
```
services/api-gateway/
├── node_modules/          ← Will be created here
│   └── @types/
│       └── node/          ← The missing type definitions
├── src/
├── dist/                  ← After running npm run build
├── package.json
└── tsconfig.json
```

---

## Verification Steps

After installation, verify that the error is resolved:

### Step 1: Check node_modules
```cmd
dir services\api-gateway\node_modules\@types\node
```
Should show directory listing with node type definitions.

### Step 2: Run TypeScript Check
```cmd
cd services\api-gateway
npm run build:check
```
Expected output: No errors, TypeScript validation passes

### Step 3: Full Build (Optional)
```cmd
npm run build
```
Should complete successfully with "Build completed successfully" message

---

## Installation Timeline

Typical npm install duration:
- api-gateway service alone: ~30-60 seconds
- All services: ~3-5 minutes (depending on internet speed)

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `npm: command not found` | Node.js not installed - download from nodejs.org |
| PowerShell execution policy error | Use Command Prompt (cmd) instead or set execution policy |
| Slow installation | Check internet connection, can take several minutes |
| Permission denied | On Windows, try Command Prompt instead of PowerShell |
| package-lock.json conflicts | Delete `package-lock.json` and retry |

---

## Next Steps After Installation

1. ✅ Run `npm install` in api-gateway service
2. ✅ Verify TypeScript errors are resolved
3. ✅ Test build: `npm run build:check`
4. ✅ Proceed with SERVICE_CONNECTIVITY_IMPLEMENTATION_PLAN.md phases

---

## Quick Command Reference

```cmd
# Navigate to api-gateway
cd services\api-gateway

# Install dependencies
npm install

# Verify TypeScript setup
npm run build:check

# Build the service
npm run build

# Start development
npm run dev

# Back to root
cd ..\..
```

---

*Last Updated: April 2, 2026*
