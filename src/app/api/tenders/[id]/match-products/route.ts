/**
 * Tender Product Matching API
 * Compares tender specifications with supplier products
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  findMatchingProducts,
  compareAllTenderItems,
  checkCatalogCoverage,
} from '@/lib/ai/product-matcher';

/**
 * POST /api/tenders/[id]/match-products
 * Find matching products from supplier catalog for tender items
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tender with items
    const tender = await prisma.tender.findUnique({
      where: { id, isDeleted: false },
      include: {
        items: {
          where: { isDeleted: false },
          select: {
            id: true,
            description: true,
            specifications: true,
            quantity: true,
            unit: true,
          },
        },
        customer: {
          select: { name: true },
        },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    if (!tender.items || tender.items.length === 0) {
      return NextResponse.json(
        { error: 'No tender items to match. Please add items to the tender first.' },
        { status: 400 }
      );
    }

    // Check if we have products in catalog
    const catalogCheck = await checkCatalogCoverage(tender.category || undefined);
    if (!catalogCheck.hasProducts) {
      return NextResponse.json(
        {
          error: 'No products in supplier catalog. Please add products before matching.',
          catalogInfo: catalogCheck,
        },
        { status: 400 }
      );
    }

    // Parse request body for any specific options
    const body = await request.json().catch(() => ({}));
    const { itemId, includeAlternatives = true } = body;

    // If specific item requested, match only that item
    if (itemId) {
      const item = tender.items.find((i) => i.id === itemId);
      if (!item) {
        return NextResponse.json({ error: 'Tender item not found' }, { status: 404 });
      }

      const specs = typeof item.specifications === 'object' && item.specifications !== null
        ? (item.specifications as Record<string, any>)
        : {};

      const match = await findMatchingProducts({
        tenderItemDescription: item.description,
        tenderSpecifications: specs,
        quantity: item.quantity,
        unit: item.unit || 'unit',
        category: tender.category || undefined,
      });

      return NextResponse.json({
        success: true,
        tender: {
          id: tender.id,
          title: tender.title,
          tenderNumber: tender.tenderNumber,
        },
        itemMatch: match,
        catalogInfo: catalogCheck,
      });
    }

    // Match all items
    const tenderItemsForMatching = tender.items.map((item) => {
      const specs = typeof item.specifications === 'object' && item.specifications !== null
        ? (item.specifications as Record<string, any>)
        : {};

      return {
        description: item.description,
        specifications: specs,
        quantity: item.quantity,
        unit: item.unit || 'unit',
        category: tender.category || undefined,
      };
    });

    const comparison = await compareAllTenderItems(tenderItemsForMatching);

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        title: tender.title,
        tenderNumber: tender.tenderNumber,
        customerName: tender.customer?.name,
        category: tender.category,
      },
      comparison,
      catalogInfo: catalogCheck,
    });
  } catch (error) {
    console.error('Product matching error:', error);
    return NextResponse.json(
      {
        error: 'Product matching failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenders/[id]/match-products
 * Check if tender can be matched with products
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tender = await prisma.tender.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        title: true,
        tenderNumber: true,
        category: true,
        items: {
          where: { isDeleted: false },
          select: { id: true, description: true },
        },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Check catalog coverage
    const catalogCheck = await checkCatalogCoverage(tender.category || undefined);

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        title: tender.title,
        tenderNumber: tender.tenderNumber,
        category: tender.category,
        itemCount: tender.items.length,
      },
      canMatch: tender.items.length > 0 && catalogCheck.hasProducts,
      catalogInfo: catalogCheck,
      message:
        tender.items.length === 0
          ? 'Add tender items before matching'
          : !catalogCheck.hasProducts
          ? 'Add products to supplier catalog before matching'
          : 'Ready to match products',
    });
  } catch (error) {
    console.error('Get matching info error:', error);
    return NextResponse.json(
      { error: 'Failed to get matching information' },
      { status: 500 }
    );
  }
}
