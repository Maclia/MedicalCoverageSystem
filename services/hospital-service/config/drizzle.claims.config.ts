import { defineConfig } from "drizzle-kit";

if (!process.env.CLAIMS_DATABASE_URL) {
  throw new Error("CLAIMS_DATABASE_URL is required for Claims service database");
}

export default defineConfig({
  out: "./migrations/claims",
  schema: "./shared/schemas/claims.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CLAIMS_DATABASE_URL,
  },
});