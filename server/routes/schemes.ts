import { Router } from 'express';

const router = Router();

// Schemes & Benefits Management Routes
// TODO: Implement schemes and benefits management endpoints

export function registerSchemesRoutes(app: any) {
  // Register schemes routes on the app
  app.use("/api/schemes", router);
}
