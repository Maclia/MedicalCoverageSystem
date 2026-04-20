import type { Config } from 'drizzle-kit';

export default {
  schema: './services/claims-service/src/models/schema.ts',
  out: './services/claims-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/claims',
  },
} satisfies Config;
