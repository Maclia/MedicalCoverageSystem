import { IModule } from "../../modules/core/registry/IModule";
import { ModuleRegistry } from "../../modules/core/registry/moduleRegistry";
import fraudDetectionRoutes from "../fraudDetectionRoutes";
import { fraudDetectionService } from "../fraudDetectionService";

export class FraudDetectionModule implements IModule {
  name = "fraud-detection";
  version = "1.0.0";
  dependencies = ["core", "claims", "members", "providers"];

  async onLoad(registry: ModuleRegistry): Promise<void> {
    console.log("Loading Fraud Detection Module...");

    // Register routes
    registry.registerRoutes("/fraud", fraudDetectionRoutes);

    // Initialize service
    await fraudDetectionService.initialize();

    console.log("Fraud Detection Module loaded successfully");
  }

  async onUnload(): Promise<void> {
    console.log("Unloading Fraud Detection Module...");

    // Cleanup service
    await fraudDetectionService.cleanup();

    console.log("Fraud Detection Module unloaded");
  }

  async onError(error: Error): Promise<void> {
    console.error("Fraud Detection Module error:", error);

    // Handle module errors
    await fraudDetectionService.handleError(error);
  }

  getHealthStatus(): any {
    return {
      name: this.name,
      version: this.version,
      status: "healthy",
      lastChecked: new Date(),
      metrics: {
        alertsProcessed: 0,
        rulesActive: 0,
        modelsTrained: 0
      }
    };
  }
}
