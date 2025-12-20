import { defineConfig } from "drizzle-kit";

if (!process.env.FINANCE_DATABASE_URL) {
  throw new Error("FINANCE_DATABASE_URL is required for Finance service database");
}

export default defineConfig({
  out: "./services/finance-service/migrations/finance",
  schema: "./shared/schemas/finance.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.FINANCE_DATABASE_URL,
  },
});
