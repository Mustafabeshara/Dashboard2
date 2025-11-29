/**
 * Document Upload API
 * Handles file uploads with support for multiple file types
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
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

    // Generate unique filename
    const fileId = uuidv4()
    const extension = file.name.split('.').pop() || ''
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100)
    const storageName = `${fileId}-${sanitizedName}`

    // Create upload directory structure
    const uploadDir = join(
      process.cwd(),
      'uploads',
      moduleType.toLowerCase(),
      new Date().toISOString().slice(0, 7) // YYYY-MM format for organization
    )
    await mkdir(uploadDir, { recursive: true })

    // Write file to disk
    const filePath = join(uploadDir, storageName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Infer document type if not provided
    const inferredType = documentType || inferDocumentType(file.name, file.type)

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path: filePath,
        url: `/uploads/${moduleType.toLowerCase()}/${new Date().toISOString().slice(0, 7)}/${storageName}`,
        type: inferredType,
        moduleType,
        moduleId,
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
        description,
        uploadedById,
        status: 'PENDING',
        metadata: {
          originalExtension: extension,
          uploadTimestamp: new Date().toISOString(),
        },
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    })

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
