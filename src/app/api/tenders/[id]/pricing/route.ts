/**
 * Tender Pricing Advisor API
 * AI-powered pricing recommendations for tender bids
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generatePricingRecommendation,
  analyzeTenderPricing,
} from '@/lib/ai/pricing-advisor';
import prisma from '@/lib/prisma';

/**
 * POST /api/tenders/[id]/pricing
 * Get AI pricing recommendations for tender items
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

    const body = await request.json().catch(() => ({}));
    const { itemId, productDescription, quantity, costPrice, targetMargin, competitorPrices } = body;

    // If specific item pricing requested
    if (itemId && productDescription && quantity) {
      const tender = await prisma.tender.findUnique({
        where: { id, isDeleted: false },
        select: {
          category: true,
          estimatedValue: true,
          customer: { select: { name: true } },
        },
      });

      if (!tender) {
        return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
      }

      const recommendation = await generatePricingRecommendation({
        productDescription,
        category: tender.category || undefined,
        quantity,
        costPrice,
        targetMargin,
        tenderValue: tender.estimatedValue ? Number(tender.estimatedValue) : undefined,
        customerName: tender.customer?.name,
        competitorPrices: competitorPrices || [],
      });

      return NextResponse.json({
        success: true,
        itemId,
        recommendation,
      });
    }

    // Analyze entire tender pricing
    const analysis = await analyzeTenderPricing(id);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Pricing recommendation error:', error);
    return NextResponse.json(
      {
        error: 'Pricing analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenders/[id]/pricing
 * Get current pricing info for tender
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
        estimatedValue: true,
        currency: true,
        items: {
          where: { isDeleted: false },
          select: {
            id: true,
            description: true,
            quantity: true,
            unit: true,
            estimatedPrice: true,
          },
        },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    const itemCount = tender.items.length;
    const itemsWithPricing = tender.items.filter((i) => i.estimatedPrice && i.estimatedPrice > 0).length;
    const totalEstimated = tender.items.reduce(
      (sum, item) => sum + (item.estimatedPrice ? Number(item.estimatedPrice) * item.quantity : 0),
      0
    );

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        title: tender.title,
        tenderNumber: tender.tenderNumber,
        estimatedValue: tender.estimatedValue ? Number(tender.estimatedValue) : null,
        currency: tender.currency,
        itemCount,
        itemsWithPricing,
        totalEstimatedPrice: totalEstimated,
      },
      canAnalyze: itemCount > 0,
      message:
        itemCount === 0
          ? 'Add tender items before requesting pricing recommendations'
          : 'Ready for pricing analysis',
    });
  } catch (error) {
    console.error('Get pricing info error:', error);
    return NextResponse.json(
      { error: 'Failed to get pricing information' },
      { status: 500 }
    );
  }
}
