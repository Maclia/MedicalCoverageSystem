import { defineConfig } from "drizzle-kit";

if (!process.env.HOSPITAL_DB_URL) {
  throw new Error("HOSPITAL_DB_URL is required for Claims service database");
}

export default defineConfig({
  out: "./services/hospital-service/migrations/claims",
  schema: "./shared/schemas/claims.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.HOSPITAL_DB_URL,
  },
});