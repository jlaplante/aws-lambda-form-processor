import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getConfig } from './config';
import { validateSubmission, normalizeSubmission, generateSubmissionHash } from './validation';
import { checkDuplicate } from './dedupe';
import { checkRateLimit } from './rate-limit';
import { generateEmailTemplate, sendEmail } from './email';
import { createCorsResponse, handleOptionsRequest, isOriginAllowed } from './cors';
import { ProcessedSubmission, FormSubmission } from './types';

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const config = getConfig();

    // Handle CORS preflight
    const optionsResponse = handleOptionsRequest(event, config);
    if (optionsResponse) {
      return optionsResponse;
    }

    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return createCorsResponse(405, { 
        error: 'Method not allowed',
        message: 'Only POST requests are allowed'
      }, config, event);
    }

    // Validate origin
    const origin = event.headers.Origin || event.headers.origin;
    if (!isOriginAllowed(origin, config)) {
      console.warn('Request from disallowed origin:', origin);
      return createCorsResponse(403, { 
        error: 'Forbidden',
        message: 'Origin not allowed'
      }, config, event);
    }

    // Parse request body
    let submissionData: FormSubmission;
    try {
      submissionData = JSON.parse(event.body || '{}');
    } catch (error) {
      return createCorsResponse(400, { 
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON'
      }, config, event);
    }

    // Validate submission data
    const validation = validateSubmission(submissionData);
    if (!validation.valid) {
      console.warn('Validation failed:', validation.errors);
      return createCorsResponse(400, { 
        error: 'Validation failed',
        message: 'Invalid form data',
        details: validation.errors
      }, config, event);
    }

    // Normalize submission
    const normalized = normalizeSubmission(submissionData);
    const hash = generateSubmissionHash(normalized);

    // Check for duplicates
    const duplicateCheck = await checkDuplicate(hash, config);
    if (duplicateCheck.shouldBlock) {
      console.warn('Submission blocked due to excessive duplicates:', { hash, count: duplicateCheck.count });
      return createCorsResponse(429, { 
        error: 'Too many requests',
        message: 'This submission has been received too many times',
        retryAfter: config.dedupeTTL
      }, config, event);
    }

    // Check rate limit
    const clientIP = event.requestContext.identity.sourceIp;
    const rateLimitCheck = await checkRateLimit(clientIP, config);
    if (!rateLimitCheck.allowed) {
      console.warn('Rate limit exceeded for IP:', clientIP);
      return createCorsResponse(429, { 
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP',
        retryAfter: Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)
      }, config, event);
    }

    // Create processed submission
    const processedSubmission: ProcessedSubmission = {
      normalized,
      hash,
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent: event.headers['User-Agent'] || event.headers['user-agent']
    };

    // Generate and send email
    const emailTemplate = generateEmailTemplate(processedSubmission, config);
    await sendEmail(emailTemplate, config);

    // Log successful processing
    console.log('Form submission processed successfully:', {
      hash,
      ip: clientIP,
      duplicateCount: duplicateCheck.count,
      rateLimitRemaining: rateLimitCheck.remaining
    });

    // Return success response
    return createCorsResponse(200, { 
      success: true,
      message: 'Form submitted successfully',
      submissionId: hash.substring(0, 8) // Return first 8 chars of hash as ID
    }, config, event);

  } catch (error) {
    console.error('Error processing form submission:', error);
    
    // Return generic error response (don't expose internal details)
    return createCorsResponse(500, { 
      error: 'Internal server error',
      message: 'An error occurred while processing your submission'
    }, getConfig(), event);
  }
}
