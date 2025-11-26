/**
 * Enhanced Server with Module System
 * Medical Coverage System with modular architecture
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { backgroundScheduler } from "./backgroundScheduler";
import { setupApiDocs } from "./api-docs";
import { createModuleLoader, createModuleHealthReport } from "./modules/index.js";

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Initialize and start the application
 */
async function startApplication() {
  try {
    console.log('🚀 Starting Medical Coverage System with Modular Architecture...\n');

    // Create module loader
    const moduleLoader = createModuleLoader(app, {
      autoInitialize: true,
      autoActivate: true,
      silentMode: false
    });

    // Load all modules
    await moduleLoader.loadAllModules();

    // Display system overview
    const systemOverview = moduleLoader.getSystemOverview();
    console.log('\n📊 System Overview:');
    console.log(`   Total Modules: ${systemOverview.totalModules}`);
    console.log(`   Enabled Modules: ${systemOverview.enabledModules}`);
    console.log(`   Active Modules: ${systemOverview.activeModules}`);
    console.log(`   Load Order: ${systemOverview.loadOrder.join(' → ')}`);

    // Register existing routes
    const server = await registerRoutes(app);

    // Setup API documentation
    setupApiDocs(app);

    // Add module system routes
    setupModuleSystemRoutes(app, moduleLoader);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Application Error:', err);
      res.status(status).json({
        message,
        timestamp: new Date().toISOString(),
        path: _req.path
      });
      throw err;
    });

    // Setup Vite or static serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🎉 Medical Coverage System serving on port ${port}`);
      log(`📚 API Documentation: http://localhost:${port}/api-docs`);
      log(`🔧 Module System: http://localhost:${port}/api/modules/health`);

      // Perform initial health check
      performInitialHealthCheck(moduleLoader);
    });

    // Graceful shutdown
    setupGracefulShutdown(moduleLoader);

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * Setup module system routes
 */
function setupModuleSystemRoutes(app: express.Express, moduleLoader: any) {
  // Module system health check
  app.get("/api/modules/health", async (req: Request, res: Response) => {
    try {
      const healthReport = await createModuleHealthReport();
      res.json(healthReport);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Health check failed'
      });
    }
  });

  // System overview
  app.get("/api/modules", (req: Request, res: Response) => {
    try {
      const overview = moduleLoader.getSystemOverview();
      res.json({ success: true, data: overview });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get module overview'
      });
    }
  });

  // Module information
  app.get("/api/modules/:name", (req: Request, res: Response) => {
    try {
      const moduleInfo = moduleLoader.getModuleInfo(req.params.name);
      if (!moduleInfo) {
        return res.status(404).json({ error: 'Module not found' });
      }
      res.json({ success: true, data: moduleInfo });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get module info'
      });
    }
  });

  // Module metrics
  app.get("/api/modules/metrics", async (req: Request, res: Response) => {
    try {
      const metrics = await moduleLoader.getSystemMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get module metrics'
      });
    }
  });

  // Toggle module (for admin use)
  app.post("/api/modules/:name/toggle", async (req: Request, res: Response) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }

      await moduleLoader.toggleModule(req.params.name, enabled);
      res.json({
        success: true,
        message: `Module ${req.params.name} ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to toggle module'
      });
    }
  });

  // Reload module (for admin use)
  app.post("/api/modules/:name/reload", async (req: Request, res: Response) => {
    try {
      await moduleLoader.reloadModule(req.params.name);
      res.json({
        success: true,
        message: `Module ${req.params.name} reloaded`
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to reload module'
      });
    }
  });
}

/**
 * Perform initial health check
 */
async function performInitialHealthCheck(moduleLoader: any) {
  try {
    setTimeout(async () => {
      console.log('\n🔍 Performing initial health check...');
      const healthReport = await createModuleHealthReport();

      console.log(`Health Score: ${healthReport.summary.healthScore}/100`);
      console.log(`System Status: ${healthReport.summary.systemStatus}`);

      if (healthReport.recommendations.length > 0) {
        console.log('\n⚠️  Recommendations:');
        healthReport.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }

      console.log('\n✅ Initial health check completed');
    }, 5000); // Wait 5 seconds for all services to initialize
  } catch (error) {
    console.error('❌ Initial health check failed:', error);
  }
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown(moduleLoader: any) {
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    try {
      // Stop accepting new requests
      // Deactivate all modules
      console.log('🔄 Deactivating modules...');
      const systemOverview = moduleLoader.getSystemOverview();

      for (const moduleName of systemOverview.loadOrder.reverse()) {
        try {
          await moduleLoader.toggleModule(moduleName, false);
          console.log(`✅ ${moduleName} deactivated`);
        } catch (error) {
          console.error(`❌ Failed to deactivate ${moduleName}:`, error);
        }
      }

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Graceful shutdown failed:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
}

// Start the application
startApplication();

export default startApplication;