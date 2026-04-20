import type { Config } from 'drizzle-kit';

export default {
  schema: './services/hospital-service/src/models/schema.ts',
  out: './services/hospital-service/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_hospital',
  },
} satisfies Config;