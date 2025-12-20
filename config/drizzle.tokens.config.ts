import { defineConfig } from "drizzle-kit";

if (!process.env.CORE_DB_URL) {
  throw new Error("CORE_DB_URL is required for Tokens service database");
}

export default defineConfig({
  out: "./services/core-service/migrations/tokens",
  schema: "./shared/schemas/tokens.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CORE_DB_URL,
  },
});
