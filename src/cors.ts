import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Config } from './types';

export function createCorsResponse(
  statusCode: number,
  body: any,
  config: Config,
  event: APIGatewayProxyEvent
): APIGatewayProxyResult {
  const origin = event.headers.Origin || event.headers.origin;
  const allowedOrigin = isOriginAllowed(origin, config) ? origin! : config.allowedOrigins[0];

  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Max-Age': '600',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

export function isOriginAllowed(origin: string | undefined, config: Config): boolean {
  if (!origin) return false;
  
  return config.allowedOrigins.some(allowedOrigin => {
    // Support wildcard subdomains
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.substring(2);
      return origin.endsWith(domain);
    }
    
    // Exact match
    return origin === allowedOrigin;
  });
}

export function handleOptionsRequest(event: APIGatewayProxyEvent, config: Config): APIGatewayProxyResult | null {
  if (event.httpMethod === 'OPTIONS') {
    return createCorsResponse(200, { message: 'OK' }, config, event);
  }
  return null;
}
