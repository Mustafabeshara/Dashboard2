/**
 * Document Upload API
 * Enhanced with S3 storage, magic byte validation, and proper security
 */

import { prisma } from '@/lib/prisma';
import { generateFileKey, storagePut } from '@/lib/storage';
import { DocumentType, ModuleType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Rate limiter for upload endpoint (more restrictive)
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
});

// Magic byte signatures for file type validation
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  'image/jpeg': [
    { bytes: [0xff, 0xd8, 0xff, 0xe0] },
    { bytes: [0xff, 0xd8, 0xff, 0xe1] },
    { bytes: [0xff, 0xd8, 0xff, 0xe8] },
  ],
  'image/png': [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }], // RIFF
  'application/msword': [{ bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }], // OLE
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
  ],
  'application/vnd.ms-excel': [{ bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }], // OLE
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
  ],
};

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Validation schema
const uploadSchema = z.object({
  moduleType: z.nativeEnum(ModuleType),
  moduleId: z.string().uuid().optional().nullable(),
  documentType: z.nativeEnum(DocumentType).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
});

/**
 * Detect MIME type from magic bytes
 */
function detectMimeType(buffer: Buffer): string | null {
  for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      const offset = sig.offset || 0;
      if (buffer.length < offset + sig.bytes.length) continue;

      let matches = true;
      for (let i = 0; i < sig.bytes.length; i++) {
        if (buffer[offset + i] !== sig.bytes[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return mimeType;
    }
  }
  return null;
}

/**
 * Sanitize filename to prevent path traversal
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '_') // Replace path separators
    .replace(/\.\./g, '_') // Remove ..
    .replace(/[<>:"|?*]/g, '_') // Remove Windows illegal chars
    .replace(/[\x00-\x1f]/g, '') // Remove control characters
    .substring(0, 255); // Limit length
}

/**
 * Check for dangerous file content patterns
 */
function hasDangerousContent(buffer: Buffer): boolean {
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1000));

  // Check for script tags in non-text files
  if (/<script/i.test(content)) return true;

  // Check for PHP code
  if (/<\?php/i.test(content)) return true;

  // Check for executable signatures
  const exeSignatures = [
    [0x4d, 0x5a], // MZ (Windows executable)
    [0x7f, 0x45, 0x4c, 0x46], // ELF (Linux executable)
  ];

  for (const sig of exeSignatures) {
    let matches = true;
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }

  return false;
}

// Document type inference from filename and mime type
function inferDocumentType(filename: string, mimeType: string): DocumentType {
  const lowerName = filename.toLowerCase();

  // Tender-related
  if (lowerName.includes('tender') || lowerName.includes('rfp') || lowerName.includes('rfq')) {
    if (lowerName.includes('spec') || lowerName.includes('technical')) {
      return 'TENDER_SPECS';
    }
    if (lowerName.includes('boq') || lowerName.includes('quantity')) {
      return 'TENDER_BOQ';
    }
    if (lowerName.includes('commercial') || lowerName.includes('price')) {
      return 'TENDER_COMMERCIAL';
    }
    return 'TENDER_DOCUMENT';
  }

  // Invoice
  if (lowerName.includes('invoice') || lowerName.includes('فاتورة')) {
    return 'INVOICE';
  }

  // Receipt/Expense
  if (
    lowerName.includes('receipt') ||
    lowerName.includes('expense') ||
    lowerName.includes('إيصال')
  ) {
    return 'EXPENSE_RECEIPT';
  }

  // Delivery
  if (lowerName.includes('delivery') || lowerName.includes('dn-') || lowerName.includes('تسليم')) {
    return 'DELIVERY_NOTE';
  }

  // Purchase Order
  if (lowerName.includes('po-') || lowerName.includes('purchase') || lowerName.includes('order')) {
    return 'PURCHASE_ORDER';
  }

  // Contract
  if (
    lowerName.includes('contract') ||
    lowerName.includes('agreement') ||
    lowerName.includes('عقد')
  ) {
    return 'CONTRACT';
  }

  // Certificate
  if (
    lowerName.includes('certificate') ||
    lowerName.includes('cert') ||
    lowerName.includes('شهادة')
  ) {
    return 'CERTIFICATE';
  }

  // Quotation
  if (lowerName.includes('quotation') || lowerName.includes('quote') || lowerName.includes('عرض')) {
    return 'QUOTATION';
  }

  // Datasheet
  if (lowerName.includes('datasheet') || lowerName.includes('spec')) {
    return 'PRODUCT_DATASHEET';
  }

  return 'OTHER';
}

async function handlePost(request: AuthenticatedRequest) {
  // Apply rate limiting
  const rateLimitResponse = await uploadRateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const moduleType = formData.get('moduleType') as string;
  const moduleId = formData.get('moduleId') as string | null;
  const documentType = formData.get('documentType') as string | null;
  const description = formData.get('description') as string | null;
  const tags = formData.get('tags') as string | null;

  // Validate file
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)` },
      { status: 400 }
    );
  }

  // Validate form data with Zod
  const parseResult = uploadSchema.safeParse({
    moduleType,
    moduleId,
    documentType,
    description,
    tags,
  });

  if (!parseResult.success) {
    const errors = parseResult.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return NextResponse.json(
      { error: 'Validation failed', details: errors },
      { status: 400 }
    );
  }

  // Read file data
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // SECURITY: Validate file content with magic bytes
  const detectedMimeType = detectMimeType(buffer);

  // For binary files, verify magic bytes match claimed MIME type
  if (MAGIC_BYTES[file.type] && detectedMimeType !== file.type) {
    // Allow ZIP-based formats (docx, xlsx) to have generic ZIP signature
    const isOfficeFormat =
      file.type.includes('openxmlformats') && detectedMimeType?.includes('openxmlformats');

    if (!isOfficeFormat) {
      logger.warn('MIME type mismatch detected', {
        context: {
          claimedType: file.type,
          detectedType: detectedMimeType,
          filename: file.name,
          userId: request.user.id,
        },
      });
      return NextResponse.json(
        { error: 'File content does not match declared type' },
        { status: 400 }
      );
    }
  }

  // SECURITY: Check for dangerous content
  if (hasDangerousContent(buffer)) {
    logger.warn('Dangerous content detected in upload', {
      context: {
        filename: file.name,
        userId: request.user.id,
      },
    });
    return NextResponse.json(
      { error: 'File contains potentially dangerous content' },
      { status: 400 }
    );
  }

  // Check MIME type against allowlist
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name);

  // Generate file key for S3
  const fileKey = generateFileKey(
    request.user.id,
    sanitizedFilename,
    `documents/${parseResult.data.moduleType.toLowerCase()}`
  );

  // Upload to S3
  const { url } = await storagePut(fileKey, buffer, file.type);

  // Infer document type if not provided
  const inferredType =
    (parseResult.data.documentType as DocumentType) ||
    inferDocumentType(sanitizedFilename, file.type);

  // Create document record in database
  const document = await prisma.document.create({
    data: {
      name: sanitizedFilename.replace(/\.[^/.]+$/, ''), // Remove extension
      originalName: sanitizedFilename,
      mimeType: file.type,
      size: file.size,
      path: fileKey, // Store S3 key as path
      url, // Public S3 URL
      type: inferredType,
      moduleType: parseResult.data.moduleType,
      moduleId: parseResult.data.moduleId || null,
      tags: parseResult.data.tags ? parseResult.data.tags.split(',').map((t) => t.trim()) : [],
      description: parseResult.data.description || null,
      uploadedById: request.user.id,
      status: 'PENDING',
      metadata: {
        originalExtension: sanitizedFilename.split('.').pop() || '',
        uploadTimestamp: new Date().toISOString(),
        s3Key: fileKey,
        detectedMimeType: detectedMimeType || 'unknown',
      },
    },
    include: {
      uploadedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  logger.info('Document uploaded', {
    context: {
      documentId: document.id,
      filename: sanitizedFilename,
      mimeType: file.type,
      size: file.size,
      uploadedBy: request.user.id,
    },
  });

  return NextResponse.json(
    {
      success: true,
      document,
      message: 'File uploaded successfully',
    },
    { status: 201 }
  );
}

// GET /api/documents/upload - Get upload configuration
async function handleGet() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    allowedExtensions: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.txt',
      '.csv',
    ],
  });
}

// Export with authentication middleware
export const POST = withAuth(handlePost);
export const GET = withAuth(handleGet);
