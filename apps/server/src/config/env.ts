import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
});

const parsed = schema.parse(process.env);

if (parsed.NODE_ENV === 'production' && (!parsed.JWT_SECRET || parsed.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET (>= 32 chars) is required in production');
}

export const env = {
  ...parsed,
  // Dev-only fallback so local setup works without config. Never used in production (see check above).
  JWT_SECRET: parsed.JWT_SECRET ?? 'dev-only-insecure-secret-change-me-please-0123456789',
  isProd: parsed.NODE_ENV === 'production',
  clientOrigins: parsed.CLIENT_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
