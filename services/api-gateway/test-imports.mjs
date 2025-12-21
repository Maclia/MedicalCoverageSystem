// Simple import test
import express from 'express';
import { swaggerUi, specs } from './swagger.js';
import { serviceProxies, dynamicProxyMiddleware } from './middleware/proxy.js';
import { authenticateToken, optionalAuth } from './middleware/auth.js';
import { standardRateLimit, authRateLimit, userRateLimit } from './middleware/rateLimiting.js';
import { createSuccessResponse, createErrorResponse } from './middleware/responseStandardization.js';
import { createLogger } from './utils/logger.js';
import { serviceRegistry } from './services/ServiceRegistry.js';

console.log('All imports successful!');