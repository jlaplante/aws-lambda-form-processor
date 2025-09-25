import Ajv from 'ajv';
import { FormSubmission, ValidationError } from './types';

const ajv = new Ajv({ allErrors: true });

// JSON Schema for form validation
const formSubmissionSchema = {
  type: 'object',
  properties: {
    // Allow any string properties
    name: { type: 'string', maxLength: 100 },
    email: { type: 'string', format: 'email', maxLength: 254 },
    message: { type: 'string', maxLength: 5000 },
    phone: { type: 'string', maxLength: 20 },
    company: { type: 'string', maxLength: 100 },
    subject: { type: 'string', maxLength: 200 },
    // Allow additional fields
    additionalProperties: { type: 'string', maxLength: 1000 }
  },
  required: [],
  additionalProperties: true,
  maxProperties: 20, // Limit total number of fields
  minProperties: 1
};

const validateFormSubmission = ajv.compile(formSubmissionSchema);

export function validateSubmission(data: unknown): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (!validateFormSubmission(data)) {
    if (validateFormSubmission.errors) {
      for (const error of validateFormSubmission.errors) {
        errors.push({
          field: error.instancePath || error.schemaPath || 'root',
          message: error.message || 'Invalid value'
        });
      }
    }
  }

  // Additional custom validation
  if (typeof data === 'object' && data !== null) {
    const submission = data as FormSubmission;
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /document\./i,
      /window\./i
    ];
    
    for (const [key, value] of Object.entries(submission)) {
      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            errors.push({
              field: key,
              message: 'Suspicious content detected'
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function normalizeSubmission(data: FormSubmission): FormSubmission {
  const normalized: FormSubmission = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Normalize field names (lowercase, trim)
    const normalizedKey = key.toLowerCase().trim();
    
    // Normalize values
    if (typeof value === 'string') {
      normalized[normalizedKey] = value.trim();
    } else if (value !== null && value !== undefined) {
      normalized[normalizedKey] = value;
    }
  }
  
  return normalized;
}

export function generateSubmissionHash(normalized: FormSubmission): string {
  const crypto = require('node:crypto');
  
  // Create a deterministic hash by sorting keys and stringifying
  const sortedEntries = Object.entries(normalized)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`);
  
  const content = sortedEntries.join('|');
  return crypto.createHash('sha256').update(content).digest('hex');
}
