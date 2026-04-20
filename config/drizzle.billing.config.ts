import type { Config } from 'drizzle-kit';

export default {
  schema: './services/billing-service/src/models/schema.ts',
  out: './services/billing-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/billing',
  },
} satisfies Config;
