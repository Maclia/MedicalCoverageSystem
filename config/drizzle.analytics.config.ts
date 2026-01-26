import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for Analytics service database");
}

export default defineConfig({
  out: "./database/analytics",
  schema: "./shared/schemas/analytics.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
