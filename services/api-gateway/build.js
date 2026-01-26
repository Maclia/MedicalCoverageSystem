#!/usr/bin/env node

// Build validation script for API Gateway

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building API Gateway...\n');

try {
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // Check TypeScript compilation
  console.log('🔍 Checking TypeScript compilation...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });

  // Build the project
  console.log('🏗️ Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('✅ Build completed successfully!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check if all dependencies are installed: npm install');
  console.log('2. Check for TypeScript errors: npx tsc --noEmit');
  console.log('3. Check for missing files or incorrect imports');
  console.log('4. Verify package.json and tsconfig.json are correct');

  process.exit(1);
}