import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { backgroundScheduler } from "./backgroundScheduler";
import { setupApiDocs } from "./api-docs";
import { getConfig } from "./config/system-config";

const config = getConfig();
const app = express();

// Enhanced middleware with configuration
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

app.use((req, res, next) => {
  const clientId = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute window

  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const clientData = rateLimitMap.get(clientId)!;

  if (now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  clientData.count++;

  if (clientData.count > config.integration.maxConcurrentRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Max ${config.integration.maxConcurrentRequests} requests per minute.`,
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }

  next();
});

// Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "...";
      }

      if (config.integration.logging.enabled) {
        const logLevel = duration > 5000 ? 'WARN' : res.statusCode >= 400 ? 'WARN' : 'INFO';
        log(`[${logLevel}] ${logLine}`);
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Setup API documentation
  setupApiDocs(app);

  // Enhanced error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = config.integration.logging.level === 'debug' ? err.message : "Internal Server Error";

    // Log error if logging is enabled
    if (config.integration.logging.enabled) {
      console.error(`[${status}] ${err.name}: ${err.message}`);
      if (err.stack) {
        console.error(err.stack);
      }
    }

    res.status(status).json({
      success: false,
      error: message,
      ...(config.integration.logging.level === 'debug' && { details: err.stack, timestamp: new Date().toISOString() })
    });
    throw err;
  });

  // Enhanced server configuration
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    log(`Received ${signal}, starting graceful shutdown...`);

    server.close((err) => {
      if (err) {
        log(`Error during shutdown: ${err.message}`);
        process.exit(1);
      } else {
        log('Graceful shutdown completed');
        process.exit(0);
      }
    });
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => {
    log('Received SIGUSR2, reloading configuration...');
    // Could reload config here in future
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    log(`Uncaught Exception: ${err.message}`);
    log(err.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${reason}`);
    log(promise);
    process.exit(1);
  });

  // Enhanced server startup with configuration
  server.listen({
    port: config.api.port,
    host: config.api.baseUrl.includes('localhost') ? "127.0.0.1" : "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`🚀 Medical Coverage System serving on port ${config.api.port}`);
    log(`📡 API: ${config.api.baseUrl}`);
    log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`🛡️ Security: Enhanced with rate limiting and security headers`);
    log(`🔗 Integration: All modules enabled and monitored`);
  });
})();