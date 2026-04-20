import type { Config } from 'drizzle-kit';

export default {
  schema: './services/api-gateway/src/models/schema.ts',
  out: './services/api-gateway/drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/api_gateway',
  },
} satisfies Config;