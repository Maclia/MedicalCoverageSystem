import { defineConfig } from "drizzle-kit";

if (!process.env.CORE_DB_URL) {
  throw new Error("CORE_DB_URL is required for Core service database");
}

export default defineConfig({
  out: "./services/core-service/migrations/core",
  schema: "./shared/schemas/core.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CORE_DB_URL,
  },
});