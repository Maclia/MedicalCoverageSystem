import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./database/fraud-detection",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.FRAUD_DATABASE_URL || "postgresql://user:pass@localhost:5432/medical-coverage-fraud",
  },
  verbose: true,
  strict: true,
});
