import type { Config } from 'drizzle-kit';

export default {
  schema: './services/hospital-service/src/models/schema.ts',
  out: './services/hospital-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hospital',
  },
} satisfies Config;
