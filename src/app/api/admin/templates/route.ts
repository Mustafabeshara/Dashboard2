/**
 * Extraction Templates API
 * Manages document extraction templates with AI prompts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch all templates or by type
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const templates = await prisma.extractionTemplate.findMany({
      where: {
        ...(type ? { type: type as any } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      type,
      description,
      promptTemplate,
      outputSchema,
      fieldMappings,
      isActive = true,
      isDefault = false,
    } = body

    if (!name || !type || !promptTemplate) {
      return NextResponse.json(
        { error: 'Name, type, and promptTemplate are required' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults of same type
    if (isDefault) {
      await prisma.extractionTemplate.updateMany({
        where: { type, isDefault: true },
        data: { isDefault: false },
      })
    }

    const template = await prisma.extractionTemplate.create({
      data: {
        name,
        type,
        description,
        promptTemplate,
        outputSchema: outputSchema || {},
        fieldMappings: fieldMappings || {},
        isActive,
        isDefault,
        createdById: session.user.id,
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

// PUT - Update a template
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults of same type
    if (updates.isDefault) {
      const existing = await prisma.extractionTemplate.findUnique({
        where: { id },
      })
      if (existing) {
        await prisma.extractionTemplate.updateMany({
          where: { type: existing.type, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }
    }

    const template = await prisma.extractionTemplate.update({
      where: { id },
      data: {
        ...updates,
        version: { increment: 1 },
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    await prisma.extractionTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
