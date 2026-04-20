import type { Config } from 'drizzle-kit';

export default {
  schema: './services/core-service/src/models/schema.ts',
  out: './services/core-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core',
  },
} satisfies Config;
