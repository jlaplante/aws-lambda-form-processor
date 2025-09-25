import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DedupeRecord, Config } from './types';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export async function checkDuplicate(
  hash: string,
  config: Config
): Promise<{ isDuplicate: boolean; count: number; shouldBlock: boolean }> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: process.env.DEDUPE_TABLE_NAME,
      Key: { hash }
    }));

    if (!result.Item) {
      // First time seeing this submission
      await docClient.send(new PutCommand({
        TableName: process.env.DEDUPE_TABLE_NAME,
        Item: {
          hash,
          count: 1,
          ttl: Math.floor(Date.now() / 1000) + config.dedupeTTL,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        } as DedupeRecord
      }));

      return {
        isDuplicate: false,
        count: 1,
        shouldBlock: false
      };
    }

    const record = result.Item as DedupeRecord;
    const newCount = record.count + 1;
    const shouldBlock = newCount > config.maxDuplicateCount;

    // Update the record with new count and timestamp
    await docClient.send(new UpdateCommand({
      TableName: process.env.DEDUPE_TABLE_NAME,
      Key: { hash },
      UpdateExpression: 'SET #count = :count, lastSeen = :lastSeen, ttl = :ttl',
      ExpressionAttributeNames: {
        '#count': 'count'
      },
      ExpressionAttributeValues: {
        ':count': newCount,
        ':lastSeen': new Date().toISOString(),
        ':ttl': Math.floor(Date.now() / 1000) + config.dedupeTTL
      }
    }));

    return {
      isDuplicate: true,
      count: newCount,
      shouldBlock
    };

  } catch (error) {
    console.error('Error checking duplicate:', error);
    // If there's an error with DynamoDB, allow the submission to proceed
    // This prevents DynamoDB issues from blocking legitimate submissions
    return {
      isDuplicate: false,
      count: 0,
      shouldBlock: false
    };
  }
}
