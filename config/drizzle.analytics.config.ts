import { defineConfig } from "drizzle-kit";

if (!process.env.ANALYTICS_DATABASE_URL) {
  throw new Error("ANALYTICS_DATABASE_URL is required for Analytics service database");
}

export default defineConfig({
  out: "./migrations/analytics",
  schema: "./shared/schemas/analytics.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.ANALYTICS_DATABASE_URL,
  },
});
