# Vercel Deployment Guide

## Fixed Deployment Issues

### Issues Resolved:

1. **Root vercel.json**
   - ❌ Used deprecated `@vercel/static-build`
   - ✅ Fixed: Uses proper `buildCommand` and `outputDirectory`
   - ✅ Added proper CORS headers for API routes
   - ✅ Configured serverless functions with proper memory and timeout

2. **Client vercel.json**
   - ❌ Had placeholder URLs: `https://your-backend-url.vercel.app`
   - ✅ Fixed: Removed placeholder, uses Vercel's rewrites

3. **Missing Serverless Configuration**
   - ❌ No API entry point for serverless functions
   - ✅ Fixed: Created `/api/server/index.ts` serverless function entry point

4. **Build Configuration**
   - ❌ Missing Vercel-specific build script
   - ✅ Fixed: Added `build:vercel` script to package.json

## Deployment Steps

### 1. Set Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables and add:

```bash
NODE_ENV=production
DATABASE_URL=your_neon_database_url
SESSION_SECRET=your_random_session_secret

# Optional services
STRIPE_SECRET_KEY=your_stripe_key
EMAIL_SERVICE_API_KEY=your_email_key
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
npm run vercel:deploy

# Or deploy to preview
vercel
```

### 3. Vercel Build Configuration

The root `vercel.json` now properly:
- Builds client with Vite
- Configures API routes to use serverless functions
- Adds CORS headers for API access
- Sets proper memory (1024MB) and timeout (30s) for functions

### 4. API Routes

All API routes are now served through serverless functions at:
```
https://your-app.vercel.app/api/*
```

The client can call APIs using relative paths (e.g., `/api/claims`).

### 5. Frontend Routing

The client uses SPA routing with Wouter. Vercel rewrites handle this correctly:
- All `/api/*` requests go to serverless functions
- All other requests serve the React app

## Troubleshooting

### Issue: "Cannot find module" errors
**Solution**: The `build:vercel` script now bundles the server properly for serverless deployment.

### Issue: API routes return 404
**Solution**: Ensure the `api/server/index.ts` file exists and is properly built.

### Issue: CORS errors
**Solution**: Added CORS headers in `vercel.json` for all `/api/*` routes.

### Issue: Build timeout
**Solution**: Increased `maxDuration` to 30 seconds and memory to 1024MB.

## Local Testing

To test locally before deploying:

```bash
# Build for Vercel
npm run build:vercel

# Test with Vercel dev
npm run vercel:dev
```

## Architecture

```
vercel.json (root)
├── Build Command: npm run build
├── Output Directory: client/dist
├── API Routes: /api/* → api/server/index.ts (serverless)
└── Client Routes: /* → client/dist/* (static files)
```

## Next Steps

1. Push the updated configuration to your repository
2. Deploy to Vercel using `vercel --prod`
3. Set up environment variables in Vercel dashboard
4. Test all API endpoints and frontend routes
5. Configure custom domain (optional)
