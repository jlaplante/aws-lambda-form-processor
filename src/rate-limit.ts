import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { RateLimitRecord, Config } from './types';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export async function checkRateLimit(
  ip: string,
  config: Config
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const now = Date.now();
    const windowStart = Math.floor(now / (config.rateLimitWindow * 1000)) * (config.rateLimitWindow * 1000);
    const windowEnd = windowStart + (config.rateLimitWindow * 1000);
    
    const result = await docClient.send(new GetCommand({
      TableName: process.env.RATE_LIMIT_TABLE_NAME,
      Key: { ip }
    }));

    if (!result.Item) {
      // First request from this IP in this window
      await docClient.send(new PutCommand({
        TableName: process.env.RATE_LIMIT_TABLE_NAME,
        Item: {
          ip,
          count: 1,
          ttl: Math.floor(windowEnd / 1000),
          windowStart: new Date(windowStart).toISOString()
        } as RateLimitRecord
      }));

      return {
        allowed: true,
        remaining: config.rateLimitMaxRequests - 1,
        resetTime: windowEnd
      };
    }

    const record = result.Item as RateLimitRecord;
    const recordWindowStart = new Date(record.windowStart).getTime();
    
    // Check if we're in a new window
    if (windowStart > recordWindowStart) {
      // New window, reset count
      await docClient.send(new PutCommand({
        TableName: process.env.RATE_LIMIT_TABLE_NAME,
        Item: {
          ip,
          count: 1,
          ttl: Math.floor(windowEnd / 1000),
          windowStart: new Date(windowStart).toISOString()
        } as RateLimitRecord
      }));

      return {
        allowed: true,
        remaining: config.rateLimitMaxRequests - 1,
        resetTime: windowEnd
      };
    }

    // Same window, check if limit exceeded
    const newCount = record.count + 1;
    const allowed = newCount <= config.rateLimitMaxRequests;

    if (allowed) {
      // Update count
      await docClient.send(new UpdateCommand({
        TableName: process.env.RATE_LIMIT_TABLE_NAME,
        Key: { ip },
        UpdateExpression: 'SET #count = :count',
        ExpressionAttributeNames: {
          '#count': 'count'
        },
        ExpressionAttributeValues: {
          ':count': newCount
        }
      }));
    }

    return {
      allowed,
      remaining: Math.max(0, config.rateLimitMaxRequests - newCount),
      resetTime: windowEnd
    };

  } catch (error) {
    console.error('Error checking rate limit:', error);
    // If there's an error with DynamoDB, allow the request to proceed
    // This prevents DynamoDB issues from blocking legitimate users
    return {
      allowed: true,
      remaining: config.rateLimitMaxRequests,
      resetTime: Date.now() + (config.rateLimitWindow * 1000)
    };
  }
}
