/**
 * Documents API
 * Handles document CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DocumentType, ModuleType, DocumentStatus } from '@prisma/client'

// GET /api/documents - List documents with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const moduleType = searchParams.get('moduleType') as ModuleType | null
    const moduleId = searchParams.get('moduleId')
    const type = searchParams.get('type') as DocumentType | null
    const status = searchParams.get('status') as DocumentStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {
      isDeleted: false,
    }

    if (moduleType) where.moduleType = moduleType
    if (moduleId) where.moduleId = moduleId
    if (type) where.type = type
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ]
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, email: true },
          },
          extractions: {
            where: { status: 'COMPLETED' },
            select: {
              id: true,
              extractionType: true,
              confidence: true,
              isApproved: true,
              createdAt: true,
            },
          },
          _count: {
            select: { versions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ])

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

// POST /api/documents - Create document record (file upload handled separately)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      originalName,
      mimeType,
      size,
      path,
      url,
      type,
      moduleType,
      moduleId,
      tags,
      description,
      uploadedById,
      expiryDate,
      metadata,
    } = body

    // Validate required fields
    if (!name || !originalName || !mimeType || !size || !path || !type || !moduleType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const document = await prisma.document.create({
      data: {
        name,
        originalName,
        mimeType,
        size,
        path,
        url,
        type,
        moduleType,
        moduleId,
        tags: tags || [],
        description,
        uploadedById,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        metadata,
        status: 'PENDING',
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    )
  }
}
