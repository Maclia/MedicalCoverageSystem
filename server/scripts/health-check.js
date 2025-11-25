#!/usr/bin/env node

/**
 * Medical Coverage System - Health Check Script
 * Validates system health and readiness for deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏥 Medical Coverage System - Health Check\n');

let healthStatus = {
  overall: 'healthy',
  checks: []
};

function addCheck(name, status, message, details = null) {
  healthStatus.checks.push({
    name,
    status, // 'pass', 'fail', 'warn'
    message,
    details,
    timestamp: new Date().toISOString()
  });

  if (status === 'fail') {
    healthStatus.overall = 'unhealthy';
  } else if (status === 'warn' && healthStatus.overall === 'healthy') {
    healthStatus.overall = 'degraded';
  }
}

console.log('📋 Running health checks...\n');

// 1. Environment Configuration Check
try {
  const envPath = path.join(__dirname, '../../.env');
  const envExamplePath = path.join(__dirname, '../../.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      addCheck('Environment Configuration', 'warn', '.env file not found, .env.example exists', 'Copy .env.example to .env and configure values');
    } else {
      addCheck('Environment Configuration', 'fail', 'Neither .env nor .env.example found', 'Create environment configuration files');
    }
  } else {
    addCheck('Environment Configuration', 'pass', 'Environment file exists');
  }
} catch (error) {
  addCheck('Environment Configuration', 'fail', 'Error checking environment', error.message);
}

// 2. Package Dependencies Check
try {
  const packagePath = path.join(__dirname, '../../package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const requiredDeps = ['express', 'pg', 'drizzle-orm', 'zod', 'jsonwebtoken', 'bcrypt'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);

    if (missingDeps.length === 0) {
      addCheck('Package Dependencies', 'pass', 'All required dependencies present');
    } else {
      addCheck('Package Dependencies', 'fail', 'Missing dependencies', missingDeps.join(', '));
    }
  } else {
    addCheck('Package Dependencies', 'fail', 'package.json not found');
  }
} catch (error) {
  addCheck('Package Dependencies', 'fail', 'Error checking dependencies', error.message);
}

// 3. Database Migration Files Check
try {
  const migrationPath = path.join(__dirname, '../database/migrations');
  const requiredMigrations = ['schemes_benefits_schema.sql'];

  if (fs.existsSync(migrationPath)) {
    const migrationFiles = fs.readdirSync(migrationPath);
    const missingMigrations = requiredMigrations.filter(mig => !migrationFiles.includes(mig));

    if (missingMigrations.length === 0) {
      addCheck('Database Migrations', 'pass', 'All required migration files present');
    } else {
      addCheck('Database Migrations', 'fail', 'Missing migration files', missingMigrations.join(', '));
    }
  } else {
    addCheck('Database Migrations', 'fail', 'Migrations directory not found');
  }
} catch (error) {
  addCheck('Database Migrations', 'fail', 'Error checking migrations', error.message);
}

// 4. Docker Configuration Check
try {
  const dockerComposePath = path.join(__dirname, '../../docker-compose.yml');
  const dockerfilePath = path.join(__dirname, '../../Dockerfile');
  const dockerignorePath = path.join(__dirname, '../../.dockerignore');

  const dockerFiles = [
    { path: dockerComposePath, name: 'docker-compose.yml' },
    { path: dockerfilePath, name: 'Dockerfile' },
    { path: dockerignorePath, name: '.dockerignore' }
  ];

  const missingDockerFiles = dockerFiles.filter(file => !fs.existsSync(file.path));

  if (missingDockerFiles.length === 0) {
    addCheck('Docker Configuration', 'pass', 'All Docker configuration files present');
  } else {
    addCheck('Docker Configuration', 'warn', 'Missing Docker files', missingDockerFiles.map(f => f.name).join(', '));
  }
} catch (error) {
  addCheck('Docker Configuration', 'fail', 'Error checking Docker configuration', error.message);
}

// 5. Source Code Structure Check
try {
  const requiredDirectories = [
    'server/src',
    'server/routes',
    'server/services',
    'server/database',
    'client/src',
    'shared'
  ];

  const missingDirs = requiredDirectories.filter(dir => {
    const dirPath = path.join(__dirname, '../..', dir);
    return !fs.existsSync(dirPath);
  });

  if (missingDirs.length === 0) {
    addCheck('Source Code Structure', 'pass', 'All required directories present');
  } else {
    addCheck('Source Code Structure', 'fail', 'Missing directories', missingDirs.join(', '));
  }
} catch (error) {
  addCheck('Source Code Structure', 'fail', 'Error checking source code', error.message);
}

// 6. Schemes & Benefits Module Check
try {
  const schemesModuleFiles = [
    'server/routes/schemes.ts',
    'server/services/enhancedClaimsAdjudication.ts',
    'server/services/providerSchemesFinalIntegration.ts',
    'client/src/pages/SchemesManagement.tsx',
    'client/src/pages/ProviderSchemesManagement.tsx',
    'shared/schema.ts'
  ];

  const missingModuleFiles = schemesModuleFiles.filter(file => {
    const filePath = path.join(__dirname, '../..', file);
    return !fs.existsSync(filePath);
  });

  if (missingModuleFiles.length === 0) {
    addCheck('Schemes & Benefits Module', 'pass', 'All module files present');
  } else {
    addCheck('Schemes & Benefits Module', 'warn', 'Missing module files', missingModuleFiles.join(', '));
  }
} catch (error) {
  addCheck('Schemes & Benefits Module', 'fail', 'Error checking Schemes module', error.message);
}

// 7. TypeScript Configuration Check
try {
  const tsConfigPath = path.join(__dirname, '../../tsconfig.json');
  const tsServerConfigPath = path.join(__dirname, '../../server/tsconfig.json');
  const tsClientConfigPath = path.join(__dirname, '../../client/tsconfig.json');

  const tsConfigs = [
    { path: tsConfigPath, name: 'root tsconfig.json' },
    { path: tsServerConfigPath, name: 'server tsconfig.json' },
    { path: tsClientConfigPath, name: 'client tsconfig.json' }
  ];

  const missingTsConfigs = tsConfigs.filter(config => !fs.existsSync(config.path));

  if (missingTsConfigs.length === 0) {
    addCheck('TypeScript Configuration', 'pass', 'All TypeScript configs present');
  } else {
    addCheck('TypeScript Configuration', 'warn', 'Missing TypeScript configs', missingTsConfigs.map(c => c.name).join(', '));
  }
} catch (error) {
  addCheck('TypeScript Configuration', 'fail', 'Error checking TypeScript config', error.message);
}

// 8. Security Configuration Check
try {
  const envExamplePath = path.join(__dirname, '../../.env.example');
  if (fs.existsSync(envExamplePath)) {
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    const hasJWTSecret = envExample.includes('JWT_SECRET');
    const hasDatabaseConfig = envExample.includes('DATABASE_URL');
    const hasStrongSecretNote = envExample.includes('Change these in production');

    if (hasJWTSecret && hasDatabaseConfig && hasStrongSecretNote) {
      addCheck('Security Configuration', 'pass', 'Security template properly configured');
    } else {
      addCheck('Security Configuration', 'warn', 'Security template may need updates');
    }
  } else {
    addCheck('Security Configuration', 'fail', '.env.example not found for security check');
  }
} catch (error) {
  addCheck('Security Configuration', 'fail', 'Error checking security config', error.message);
}

// Output Results
console.log('\n📊 Health Check Results:');
console.log('========================\n');

healthStatus.checks.forEach(check => {
  const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
  console.log(`${icon} ${check.name}: ${check.message}`);
  if (check.details) {
    console.log(`   Details: ${check.details}`);
  }
  console.log('');
});

// Overall Status
const overallIcon = healthStatus.overall === 'healthy' ? '🟢' : healthStatus.overall === 'degraded' ? '🟡' : '🔴';
console.log(`${overallIcon} Overall Status: ${healthStatus.overall.toUpperCase()}`);

// Deployment Readiness
console.log('\n🚀 Deployment Readiness:');
if (healthStatus.overall === 'healthy') {
  console.log('✅ System is ready for deployment');
  console.log('✅ All critical checks passed');
  console.log('✅ Docker configuration is complete');
  console.log('✅ Database migrations are ready');
} else if (healthStatus.overall === 'degraded') {
  console.log('⚠️ System is mostly ready but has warnings');
  console.log('⚠️ Review warnings before deployment');
  console.log('⚠️ Some features may not work optimally');
} else {
  console.log('❌ System is NOT ready for deployment');
  console.log('❌ Critical issues must be resolved');
  console.log('❌ Fix failures before attempting deployment');
}

// Recommendations
console.log('\n💡 Recommendations:');
if (healthStatus.overall !== 'healthy') {
  console.log('- Review and fix all failed checks');
  console.log('- Ensure environment variables are properly configured');
  console.log('- Verify all required files are present');
  console.log('- Test database migrations before deployment');
} else {
  console.log('- Run: npm install to install dependencies');
  console.log('- Run: npm run build to build for production');
  console.log('- Run: docker-compose up -d to start services');
  console.log('- Monitor logs for any startup issues');
}

console.log('\n🏥 Medical Coverage System Health Check Complete\n');

// Exit with appropriate code
process.exit(healthStatus.overall === 'healthy' ? 0 : healthStatus.overall === 'degraded' ? 1 : 2);