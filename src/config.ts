import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  STAKEKIT_API_KEY: z
    .string({ required_error: 'STAKEKIT_API_KEY is required' })
    .min(1, 'STAKEKIT_API_KEY cannot be empty'),
  STAKEKIT_BASE_URL: z
    .string()
    .url()
    .default('https://api.stakek.it/v2'),
  STAKEKIT_FALLBACK_URL: z
    .string()
    .url()
    .default('https://api.yield.xyz/v1'),
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),
  REQUEST_TIMEOUT_MS: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => Number.isFinite(value) && value > 0, {
      message: 'REQUEST_TIMEOUT_MS must be a positive integer'
    })
    .optional()
}).transform((env) => ({
  ...env,
  REQUEST_TIMEOUT_MS: env.REQUEST_TIMEOUT_MS ?? 20_000
}));

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const formatted = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${formatted}`);
}

export const appConfig = result.data;

export type AppConfig = typeof appConfig;

export const getAuthHeaders = () => ({
  'X-API-KEY': appConfig.STAKEKIT_API_KEY
});
