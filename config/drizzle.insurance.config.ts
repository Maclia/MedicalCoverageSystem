import type { Config } from 'drizzle-kit';

export default {
  schema: './services/insurance-service/src/models/schema.ts',
  out: './services/insurance-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insurance',
  },
} satisfies Config;
