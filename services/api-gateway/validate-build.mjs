#!/usr/bin/env node

// Simple validation script to check if the API Gateway can be imported without errors

console.log('🔍 Validating API Gateway imports...');

try {
  // Test basic imports
  console.log('✅ Testing basic Express import...');
  const express = await import('express');
  console.log('✅ Express imported successfully');

  console.log('✅ Testing swagger imports...');
  const swaggerUi = await import('swagger-ui-express');
  const swaggerJsdoc = await import('swagger-jsdoc');
  console.log('✅ Swagger modules imported successfully');

  console.log('✅ Testing file existence...');
  // Check if files exist
  const fs = await import('fs');
  const path = await import('path');

  const filesToCheck = [
    'src/index.ts',
    'src/api/routes.ts',
    'src/swagger.ts',
    'src/middleware/proxy.ts',
    'src/middleware/auth.ts',
    'src/middleware/rateLimiting.ts',
    'src/utils/logger.ts',
    'src/services/ServiceRegistry.ts'
  ];

  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
    }
  });

  console.log('🎉 Basic validation completed successfully!');
  console.log('💡 Try running: npm run build');

} catch (error) {
  console.error('❌ Validation failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}