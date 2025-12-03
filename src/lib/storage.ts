/**
 * S3-compatible storage utilities
 * Ported from Dashboard repository
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Required for some S3-compatible services
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

/**
 * Upload a file to S3 storage
 */
export async function storagePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ url: string; key: string }> {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: data,
    ContentType: contentType,
    ACL: 'private', // Keep files private - use signed URLs for access
  });

  await s3Client.send(command);

  // Generate a signed URL for secure access (expires in 15 minutes)
  const url = await storageGetSignedUrl(key, 900);

  return { url, key };
}

/**
 * Delete a file from S3 storage
 */
export async function storageDelete(key: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Get a signed URL for temporary access to a private file
 */
export async function storageGetSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable is not set');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a random suffix for file keys
 */
export function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._\- ]/g, '_');
}

/**
 * Generate a unique file key
 */
export function generateFileKey(
  userId: string,
  originalFilename: string,
  prefix: string = 'documents'
): string {
  const sanitized = sanitizeFilename(originalFilename);
  return `${prefix}/${userId}/${Date.now()}-${randomSuffix()}-${sanitized}`;
}
