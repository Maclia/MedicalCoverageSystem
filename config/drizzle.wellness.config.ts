import type { Config } from 'drizzle-kit';

export default {
  schema: './services/wellness-service/src/models/schema.ts',
  out: './services/wellness-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wellness',
  },
} satisfies Config;
