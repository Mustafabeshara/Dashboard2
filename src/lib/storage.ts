/**
 * Storage utilities with S3 and local filesystem fallback
 * Uses local storage when S3 is not configured
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';
import path from 'path';

// Check if S3 is properly configured
const isS3Configured = !!(
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET_NAME &&
  process.env.S3_ACCESS_KEY_ID !== 'your-s3-access-key'
);

// Initialize S3 client only if configured
const s3Client = isS3Configured
  ? new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true,
    })
  : null;

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

// Local storage directory (relative to project root)
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

/**
 * Ensure local storage directory exists
 */
async function ensureLocalStorageDir(subdir?: string): Promise<string> {
  const dir = subdir ? path.join(LOCAL_STORAGE_DIR, subdir) : LOCAL_STORAGE_DIR;
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Upload a file to storage (S3 or local filesystem)
 */
export async function storagePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ url: string; key: string }> {
  // Use S3 if configured
  if (isS3Configured && s3Client) {
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: data,
      ContentType: contentType,
      ACL: 'private',
    });

    await s3Client.send(command);
    const url = await storageGetSignedUrl(key, 900);
    return { url, key };
  }

  // Fallback to local filesystem
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  const fileDir = path.dirname(filePath);
  await ensureLocalStorageDir(path.relative(LOCAL_STORAGE_DIR, fileDir));

  const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  await fs.writeFile(filePath, buffer);

  // Return a local URL that can be served by the API
  const url = `/api/files/${encodeURIComponent(key)}`;
  return { url, key };
}

/**
 * Get a file from storage
 */
export async function storageGet(key: string): Promise<Buffer> {
  // Use S3 if configured
  if (isS3Configured && s3Client) {
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const chunks: Uint8Array[] = [];

    if (response.Body) {
      // @ts-expect-error - Body is a readable stream
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
    }

    return Buffer.concat(chunks);
  }

  // Fallback to local filesystem
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  return await fs.readFile(filePath);
}

/**
 * Delete a file from storage
 */
export async function storageDelete(key: string): Promise<void> {
  // Use S3 if configured
  if (isS3Configured && s3Client) {
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return;
  }

  // Fallback to local filesystem
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  try {
    await fs.unlink(filePath);
  } catch (error: unknown) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Get a signed URL for temporary access to a private file
 */
export async function storageGetSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  // Use S3 if configured
  if (isS3Configured && s3Client) {
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // For local storage, return the API endpoint
  return `/api/files/${encodeURIComponent(key)}`;
}

/**
 * Check if using local storage
 */
export function isUsingLocalStorage(): boolean {
  return !isS3Configured;
}

/**
 * Get local file path (only works with local storage)
 */
export function getLocalFilePath(key: string): string {
  return path.join(LOCAL_STORAGE_DIR, key);
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
