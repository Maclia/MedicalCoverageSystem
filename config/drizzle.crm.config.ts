import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for CRM service database");
}

export default defineConfig({
  out: "./services/crm-service/migrations/crm",
  schema: "./shared/schemas/crm.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});