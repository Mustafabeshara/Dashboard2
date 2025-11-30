/**
 * Document Upload API
 * Enhanced with S3 storage for production-ready file handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storagePut, generateFileKey, sanitizeFilename } from '@/lib/storage'
import { DocumentType, ModuleType } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

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
]

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Document type inference from filename and mime type
function inferDocumentType(filename: string, mimeType: string): DocumentType {
  const lowerName = filename.toLowerCase()

  // Tender-related
  if (lowerName.includes('tender') || lowerName.includes('rfp') || lowerName.includes('rfq')) {
    if (lowerName.includes('spec') || lowerName.includes('technical')) {
      return 'TENDER_SPECS'
    }
    if (lowerName.includes('boq') || lowerName.includes('quantity')) {
      return 'TENDER_BOQ'
    }
    if (lowerName.includes('commercial') || lowerName.includes('price')) {
      return 'TENDER_COMMERCIAL'
    }
    return 'TENDER_DOCUMENT'
  }

  // Invoice
  if (lowerName.includes('invoice') || lowerName.includes('فاتورة')) {
    return 'INVOICE'
  }

  // Receipt/Expense
  if (lowerName.includes('receipt') || lowerName.includes('expense') || lowerName.includes('إيصال')) {
    return 'EXPENSE_RECEIPT'
  }

  // Delivery
  if (lowerName.includes('delivery') || lowerName.includes('dn-') || lowerName.includes('تسليم')) {
    return 'DELIVERY_NOTE'
  }

  // Purchase Order
  if (lowerName.includes('po-') || lowerName.includes('purchase') || lowerName.includes('order')) {
    return 'PURCHASE_ORDER'
  }

  // Contract
  if (lowerName.includes('contract') || lowerName.includes('agreement') || lowerName.includes('عقد')) {
    return 'CONTRACT'
  }

  // Certificate
  if (lowerName.includes('certificate') || lowerName.includes('cert') || lowerName.includes('شهادة')) {
    return 'CERTIFICATE'
  }

  // Quotation
  if (lowerName.includes('quotation') || lowerName.includes('quote') || lowerName.includes('عرض')) {
    return 'QUOTATION'
  }

  // Datasheet
  if (lowerName.includes('datasheet') || lowerName.includes('spec')) {
    return 'PRODUCT_DATASHEET'
  }

  return 'OTHER'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const moduleType = formData.get('moduleType') as ModuleType
    const moduleId = formData.get('moduleId') as string | null
    const documentType = formData.get('documentType') as DocumentType | null
    const description = formData.get('description') as string | null
    const tags = formData.get('tags') as string | null
    const uploadedById = formData.get('uploadedById') as string | null

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      )
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 }
      )
    }

    // Validate module type
    if (!moduleType) {
      return NextResponse.json(
        { error: 'Module type is required' },
        { status: 400 }
      )
    }

    // Validate uploaded by ID
    if (!uploadedById) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Read file data
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate file key for S3
    const fileKey = generateFileKey(
      uploadedById,
      file.name,
      `documents/${moduleType.toLowerCase()}`
    )

    // Upload to S3
    console.log(`[Upload] Uploading file to S3: ${fileKey}`)
    const { url } = await storagePut(fileKey, buffer, file.type)
    console.log(`[Upload] File uploaded successfully: ${url}`)

    // Infer document type if not provided
    const inferredType = documentType || inferDocumentType(file.name, file.type)

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path: fileKey, // Store S3 key as path
        url, // Public S3 URL
        type: inferredType,
        moduleType,
        moduleId,
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
        description,
        uploadedById,
        status: 'PENDING',
        metadata: {
          originalExtension: file.name.split('.').pop() || '',
          uploadTimestamp: new Date().toISOString(),
          s3Key: fileKey,
        },
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    })

    console.log(`[Upload] Document record created: ${document.id}`)

    return NextResponse.json(
      {
        success: true,
        document,
        message: 'File uploaded successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}

// GET /api/documents/upload - Get upload configuration
export async function GET() {
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
  })
}
