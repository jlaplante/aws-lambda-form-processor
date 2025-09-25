import { Config } from './types';

export function getConfig(): Config {
  const requiredEnvVars = [
    'EMAIL_RECIPIENT',
    'EMAIL_SENDER',
    'ALLOWED_ORIGINS',
    'DEDUPE_TTL',
    'MAX_DUPLICATE_COUNT'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    emailRecipient: process.env.EMAIL_RECIPIENT!,
    emailSender: process.env.EMAIL_SENDER!,
    allowedOrigins: process.env.ALLOWED_ORIGINS!.split(',').map(origin => origin.trim()),
    dedupeTTL: parseInt(process.env.DEDUPE_TTL!, 10),
    maxDuplicateCount: parseInt(process.env.MAX_DUPLICATE_COUNT!, 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '3600', 10), // 1 hour default
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10) // 10 requests per hour default
  };
}
