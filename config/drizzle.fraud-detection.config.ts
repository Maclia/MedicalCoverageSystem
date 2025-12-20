import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export default defineConfig({
  schema: "./shared/schemas/fraud-detection.ts",
  out: "./database/fraud-detection",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.HOSPITAL_DB_URL,
  },
  verbose: true,
  strict: true,
});
