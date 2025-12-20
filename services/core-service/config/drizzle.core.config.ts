import { defineConfig } from "drizzle-kit";

if (!process.env.CORE_DATABASE_URL) {
  throw new Error("CORE_DATABASE_URL is required for Core service database");
}

export default defineConfig({
  out: "./migrations/core",
  schema: "./shared/schemas/core.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CORE_DATABASE_URL,
  },
});