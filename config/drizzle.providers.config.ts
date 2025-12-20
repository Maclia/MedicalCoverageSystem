import { defineConfig } from "drizzle-kit";

if (!process.env.HOSPITAL_DB_URL) {
  throw new Error("HOSPITAL_DB_URL is required for Providers service database");
}

export default defineConfig({
  out: "./services/hospital-service/migrations/providers",
  schema: "./shared/schemas/providers.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.HOSPITAL_DB_URL,
  },
});