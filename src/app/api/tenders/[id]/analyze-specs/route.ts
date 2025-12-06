/**
 * Tender Specification Analysis API
 * AI-powered analysis to identify manufacturers and competitors
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  analyzeSpecifications,
  findManufacturers,
  identifyCompetitors,
  extractSpecificationsFromText,
} from '@/lib/ai/specification-analyzer'

// POST /api/tenders/[id]/analyze-specs - Analyze tender specifications
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tender details
    const tender = await prisma.tender.findUnique({
      where: { id, isDeleted: false },
      include: {
        customer: {
          select: { name: true, country: true },
        },
        items: true,
      },
    })

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action = 'full', specifications, productName, category } = body

    // Build specifications text from tender data
    let specsText = specifications || ''
    if (!specsText && tender.items && tender.items.length > 0) {
      specsText = tender.items
        .map((item) => {
          const specs = item.specifications && typeof item.specifications === 'object'
            ? Object.entries(item.specifications as object)
                .map(([k, v]) => `  - ${k}: ${v}`)
                .join('\n')
            : ''
          return `Product: ${item.description || 'Unknown'}
Quantity: ${item.quantity} ${item.unit || 'units'}
${specs ? `Specifications:\n${specs}` : ''}`
        })
        .join('\n\n')
    }

    // Add tender description if no items
    if (!specsText && tender.description) {
      specsText = tender.description
    }

    if (!specsText) {
      return NextResponse.json(
        { error: 'No specifications found. Please add tender items or provide specifications.' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'full':
        // Full analysis including manufacturers and competitors
        result = await analyzeSpecifications({
          specifications: specsText,
          organization: tender.customer?.name || 'Unknown Organization',
          country: tender.customer?.country || 'Kuwait',
          tenderType: tender.category || 'Medical Equipment',
          estimatedValue: tender.estimatedValue
            ? `${tender.currency} ${tender.estimatedValue.toLocaleString()}`
            : 'Not specified',
        })
        break

      case 'manufacturers':
        // Find manufacturers for a specific product
        if (!productName) {
          return NextResponse.json(
            { error: 'Product name required for manufacturer search' },
            { status: 400 }
          )
        }
        result = await findManufacturers({
          productName,
          category: category || 'Medical Equipment',
          specifications: body.productSpecs || {},
          certifications: body.certifications || [],
        })
        break

      case 'competitors':
        // Identify likely competitors
        const products = tender.items?.map((i) => i.description || 'Unknown') || []
        result = await identifyCompetitors({
          tenderTitle: tender.title,
          organization: tender.customer?.name || 'Unknown Organization',
          country: tender.customer?.country || 'Kuwait',
          products: products.length > 0 ? products : ['Medical Equipment'],
          estimatedValue: tender.estimatedValue ? Number(tender.estimatedValue) : undefined,
        })
        break

      case 'extract':
        // Extract specifications from document text
        result = await extractSpecificationsFromText(specsText)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Note: Analysis results are returned directly without persistent storage
    // To persist results, consider adding a specificationAnalysis JSON field to Tender model

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        title: tender.title,
        tenderNumber: tender.tenderNumber,
      },
      analysis: result,
    })
  } catch (error) {
    console.error('Specification analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET /api/tenders/[id]/analyze-specs - Get tender info for analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tender = await prisma.tender.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        title: true,
        tenderNumber: true,
        description: true,
        category: true,
        items: {
          select: {
            description: true,
            specifications: true,
            quantity: true,
            unit: true,
          },
        },
        customer: {
          select: { name: true, country: true },
        },
      },
    })

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
    }

    // Check if tender has specifications to analyze
    const hasSpecs =
      tender.items.length > 0 ||
      (tender.description && tender.description.length > 50)

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        title: tender.title,
        tenderNumber: tender.tenderNumber,
        category: tender.category,
        itemCount: tender.items.length,
        customerName: tender.customer?.name,
      },
      hasSpecifications: hasSpecs,
      message: hasSpecs
        ? 'Ready for analysis'
        : 'Add tender items or description before analyzing',
    })
  } catch (error) {
    console.error('Get analysis info error:', error)
    return NextResponse.json({ error: 'Failed to get analysis info' }, { status: 500 })
  }
}
