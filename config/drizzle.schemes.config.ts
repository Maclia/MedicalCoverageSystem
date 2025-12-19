import { defineConfig } from "drizzle-kit";

if (!process.env.SCHEMES_DATABASE_URL) {
  throw new Error("SCHEMES_DATABASE_URL is required for Schemes service database");
}

export default defineConfig({
  out: "./migrations/schemes",
  schema: "./shared/schemas/schemes.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SCHEMES_DATABASE_URL,
  },
});
