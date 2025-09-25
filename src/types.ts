export interface FormSubmission {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ProcessedSubmission {
  normalized: FormSubmission;
  hash: string;
  timestamp: string;
  ip: string;
  userAgent?: string | undefined;
}

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface DedupeRecord {
  hash: string;
  count: number;
  ttl: number;
  firstSeen: string;
  lastSeen: string;
}

export interface RateLimitRecord {
  ip: string;
  count: number;
  ttl: number;
  windowStart: string;
}

export interface Config {
  emailRecipient: string;
  emailSender: string;
  allowedOrigins: string[];
  dedupeTTL: number;
  maxDuplicateCount: number;
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
}

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface CaptchaProvider {
  name: string;
  verify(token: string, secret: string): Promise<boolean>;
}

export interface HmacConfig {
  enabled: boolean;
  secret: string;
  algorithm: string;
  headerName: string;
}
