import { z } from 'zod';

const ConfigSchema = z.object({
  port: z.number().default(3000),
  jwtSecret: z.string().min(1),
  redisUrl: z.string().url().optional(),
  corsOrigin: z.string().default('*'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse({
    port: parseInt(process.env.PORT || '3000', 10),
    jwtSecret: process.env.JWT_SECRET || 'test-secret-key-for-development',
    redisUrl: process.env.REDIS_URL,
    corsOrigin: process.env.CORS_ORIGIN || '*',
    nodeEnv: process.env.NODE_ENV || 'development',
  });
}
