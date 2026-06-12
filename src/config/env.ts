import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional().default('noreply@wellmindly.com'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional().default('gemini-2.5-flash'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:\n', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
