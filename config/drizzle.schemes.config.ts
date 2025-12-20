import { defineConfig } from "drizzle-kit";

if (!process.env.INSURANCE_DB_URL) {
  throw new Error("INSURANCE_DB_URL is required for Schemes service database");
}

export default defineConfig({
  out: "./services/insurance-service/migrations/schemes",
  schema: "./shared/schemas/schemes.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.INSURANCE_DB_URL,
  },
});
