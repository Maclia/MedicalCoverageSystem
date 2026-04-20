import type { Config } from 'drizzle-kit';

export default {
  schema: './services/crm-service/src/models/schema.ts',
  out: './services/crm-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_crm',
  },
} satisfies Config;
