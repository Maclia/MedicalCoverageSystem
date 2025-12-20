import { defineConfig } from "drizzle-kit";

if (!process.env.CRM_DATABASE_URL) {
  throw new Error("CRM_DATABASE_URL is required for CRM service database");
}

export default defineConfig({
  out: "./migrations/crm",
  schema: "./shared/schemas/crm.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CRM_DATABASE_URL,
  },
});