/**
 * Single Document API
 * Handles GET, PUT, DELETE operations on individual documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'

// GET /api/documents/[id] - Get document details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const document = await prisma.document.findUnique({
      where: { id, isDeleted: false },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
        extractions: {
          orderBy: { createdAt: 'desc' },
          include: {
            reviewedBy: {
              select: { id: true, fullName: true },
            },
          },
        },
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

// PUT /api/documents/[id] - Update document metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const {
      name,
      description,
      tags,
      type,
      moduleType,
      moduleId,
      expiryDate,
      isArchived,
    } = body

    const document = await prisma.document.findUnique({
      where: { id, isDeleted: false },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(tags && { tags }),
        ...(type && { type }),
        ...(moduleType && { moduleType }),
        ...(moduleId !== undefined && { moduleId }),
        ...(expiryDate !== undefined && {
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        }),
        ...(isArchived !== undefined && { isArchived }),
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
        extractions: {
          where: { status: 'COMPLETED' },
        },
      },
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/[id] - Soft delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (permanent) {
      // Permanently delete file and record
      try {
        await unlink(document.path)
      } catch {
        // File may not exist
      }

      await prisma.document.delete({
        where: { id },
      })

      return NextResponse.json({
        success: true,
        message: 'Document permanently deleted',
      })
    }

    // Soft delete
    await prisma.document.update({
      where: { id },
      data: { isDeleted: true },
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted',
    })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
