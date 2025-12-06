/**
 * Local File Server API
 * Serves files from local storage when S3 is not configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { storageGet, isUsingLocalStorage } from '@/lib/storage';

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    // Reconstruct the file key from path segments
    const fileKey = decodeURIComponent(pathSegments.join('/'));

    // Security check - prevent path traversal
    if (fileKey.includes('..') || fileKey.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Get the file from storage
    const buffer = await storageGet(fileKey);

    // Determine content type
    const contentType = getMimeType(fileKey);

    // Return the file - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${fileKey.split('/').pop()}"`,
      },
    });
  } catch (error) {
    console.error('File serve error:', error);

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
