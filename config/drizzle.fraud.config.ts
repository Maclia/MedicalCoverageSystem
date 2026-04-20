import type { Config } from 'drizzle-kit';

export default {
  schema: './services/fraud-detection-service/src/models/schema.ts',
  out: './services/fraud-detection-service/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_fraud_detection',
  },
} satisfies Config;
