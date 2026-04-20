import type { Config } from 'drizzle-kit';

export default {
  schema: './services/api-gateway/src/models/schema.ts',
  out: './services/api-gateway/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/api_gateway',
  },
} satisfies Config;
