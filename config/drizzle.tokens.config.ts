import { defineConfig } from "drizzle-kit";

if (!process.env.TOKENS_DATABASE_URL) {
  throw new Error("TOKENS_DATABASE_URL is required for Tokens service database");
}

export default defineConfig({
  out: "./migrations/tokens",
  schema: "./shared/schemas/tokens.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.TOKENS_DATABASE_URL,
  },
});
