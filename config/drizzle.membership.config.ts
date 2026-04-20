import type { Config } from 'drizzle-kit';

export default {
  schema: './services/membership-service/src/models/schema.ts',
  out: './services/membership-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/membership',
  },
} satisfies Config;
