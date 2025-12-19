import { defineConfig } from "drizzle-kit";

if (!process.env.PROVIDERS_DATABASE_URL) {
  throw new Error("PROVIDERS_DATABASE_URL is required for Providers service database");
}

export default defineConfig({
  out: "./migrations/providers",
  schema: "./shared/schemas/providers.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.PROVIDERS_DATABASE_URL,
  },
});