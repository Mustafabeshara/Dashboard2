/**
 * AI Product Matcher
 * Matches tender specifications with supplier products
 * Compares specifications, certifications, and provides confidence scoring
 */

import { invokeUnifiedLLM, LLMProvider, Message } from './llm-provider';
import { sanitizePromptInput, createSafePrompt } from './prompt-sanitizer';
import prisma from '@/lib/prisma';

export interface ProductMatch {
  productId: string;
  productName: string;
  sku: string;
  manufacturerName?: string;
  matchScore: number; // 0-100
  matchType: 'exact' | 'equivalent' | 'similar' | 'partial';
  matchingSpecifications: string[];
  missingSpecifications: string[];
  certificationMatch: boolean;
  priceRange?: {
    cost: number;
    selling: number;
    currency: string;
  };
  notes: string;
  confidence: number; // 0-100
}

export interface TenderItemMatch {
  tenderItemDescription: string;
  tenderSpecifications: Record<string, string | number>;
  requiredCertifications: string[];
  quantity: number;
  unit: string;
  matches: ProductMatch[];
  bestMatch?: ProductMatch;
  alternativeMatches: ProductMatch[];
  noMatchReason?: string;
}

export interface ProductComparisonResult {
  success: boolean;
  tenderItems: TenderItemMatch[];
  overallMatchRate: number; // Percentage of items with good matches
  recommendations: string[];
  analysisDate: string;
  error?: string;
}

/**
 * Extract specifications from product for comparison
 */
function extractProductSpecs(product: any): {
  specs: Record<string, any>;
  certs: string[];
} {
  const specs: Record<string, any> = {};
  const certs: string[] = [];

  // Parse specifications JSON
  if (product.specifications && typeof product.specifications === 'object') {
    Object.assign(specs, product.specifications);
  }

  // Parse certifications JSON
  if (product.certifications) {
    if (Array.isArray(product.certifications)) {
      certs.push(...product.certifications);
    } else if (typeof product.certifications === 'object') {
      certs.push(...Object.values(product.certifications).filter(c => typeof c === 'string'));
    }
  }

  return { specs, certs };
}

/**
 * Compare tender specification with product using AI
 */
async function compareWithAI(params: {
  tenderItemDescription: string;
  tenderSpecs: Record<string, any>;
  requiredCertifications: string[];
  productName: string;
  productSpecs: Record<string, any>;
  productCertifications: string[];
}): Promise<{
  matchScore: number;
  matchType: 'exact' | 'equivalent' | 'similar' | 'partial';
  matchingSpecs: string[];
  missingSpecs: string[];
  certMatch: boolean;
  notes: string;
  confidence: number;
}> {
  const {
    tenderItemDescription,
    tenderSpecs,
    requiredCertifications,
    productName,
    productSpecs,
    productCertifications,
  } = params;

  // Sanitize inputs
  const sanitizedTenderDesc = sanitizePromptInput(tenderItemDescription, { maxLength: 500 });
  const sanitizedProductName = sanitizePromptInput(productName, { maxLength: 200 });

  const prompt = `You are a medical equipment specification matching expert. Compare the tender requirement with the supplier's product.

**TENDER REQUIREMENT:**
Item: ${sanitizedTenderDesc}
Required Specifications: ${JSON.stringify(tenderSpecs, null, 2)}
Required Certifications: ${requiredCertifications.join(', ') || 'Not specified'}

**SUPPLIER PRODUCT:**
Product Name: ${sanitizedProductName}
Product Specifications: ${JSON.stringify(productSpecs, null, 2)}
Product Certifications: ${productCertifications.join(', ') || 'None listed'}

**ANALYSIS INSTRUCTIONS:**
1. Determine if the product matches the tender requirements
2. Identify which specifications match, are equivalent, or are missing
3. Check certification compliance
4. Assign a match score (0-100) and match type (exact/equivalent/similar/partial)
5. Provide confidence score (0-100) based on specification clarity

**RESPOND WITH JSON ONLY (no markdown):**
{
  "matchScore": 0-100,
  "matchType": "exact|equivalent|similar|partial",
  "matchingSpecs": ["list of matching specification keys"],
  "missingSpecs": ["list of missing or non-matching specifications"],
  "certMatch": true/false,
  "notes": "Brief explanation of match quality and any concerns",
  "confidence": 0-100
}`;

  try {
    const response = await invokeUnifiedLLM(
      {
        messages: [
          {
            role: 'system',
            content: 'You are a medical equipment specification expert. Respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        responseFormat: { type: 'json_object' },
      },
      { provider: LLMProvider.GEMINI }
    );

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('No response from AI');
    }

    // Parse response
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);

    return {
      matchScore: Math.min(100, Math.max(0, result.matchScore || 0)),
      matchType: result.matchType || 'partial',
      matchingSpecs: result.matchingSpecs || [],
      missingSpecs: result.missingSpecs || [],
      certMatch: result.certMatch || false,
      notes: result.notes || 'Match analysis completed',
      confidence: Math.min(100, Math.max(0, result.confidence || 70)),
    };
  } catch (error) {
    console.error('AI comparison failed:', error);
    
    // Fallback to basic matching
    return {
      matchScore: 40,
      matchType: 'partial',
      matchingSpecs: [],
      missingSpecs: Object.keys(tenderSpecs),
      certMatch: false,
      notes: 'AI comparison unavailable, manual review required',
      confidence: 30,
    };
  }
}

/**
 * Find matching products for a tender item from supplier catalog
 */
export async function findMatchingProducts(params: {
  tenderItemDescription: string;
  tenderSpecifications: Record<string, any>;
  requiredCertifications?: string[];
  quantity?: number;
  unit?: string;
  category?: string;
}): Promise<TenderItemMatch> {
  const {
    tenderItemDescription,
    tenderSpecifications = {},
    requiredCertifications = [],
    quantity = 1,
    unit = 'unit',
    category,
  } = params;

  try {
    // Get all active products from suppliers
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        ...(category ? { category } : {}),
      },
      include: {
        manufacturer: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      take: 50, // Limit to avoid processing too many products
    });

    if (products.length === 0) {
      return {
        tenderItemDescription,
        tenderSpecifications,
        requiredCertifications,
        quantity,
        unit,
        matches: [],
        noMatchReason: 'No products found in supplier catalog',
      };
    }

    // Compare each product with tender requirements
    const matchPromises = products.map(async (product) => {
      const { specs, certs } = extractProductSpecs(product);

      // Use AI to compare
      const comparison = await compareWithAI({
        tenderItemDescription,
        tenderSpecs: tenderSpecifications,
        requiredCertifications,
        productName: product.name,
        productSpecs: specs,
        productCertifications: certs,
      });

      const match: ProductMatch = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        manufacturerName: product.manufacturer?.name,
        matchScore: comparison.matchScore,
        matchType: comparison.matchType,
        matchingSpecifications: comparison.matchingSpecs,
        missingSpecifications: comparison.missingSpecs,
        certificationMatch: comparison.certMatch,
        priceRange: product.costPrice && product.sellingPrice
          ? {
              cost: Number(product.costPrice),
              selling: Number(product.sellingPrice),
              currency: product.currency,
            }
          : undefined,
        notes: comparison.notes,
        confidence: comparison.confidence,
      };

      return match;
    });

    const allMatches = await Promise.all(matchPromises);

    // Sort by match score
    const sortedMatches = allMatches.sort((a, b) => b.matchScore - a.matchScore);

    // Identify best match and alternatives
    const goodMatches = sortedMatches.filter(m => m.matchScore >= 60);
    const bestMatch = goodMatches.length > 0 ? goodMatches[0] : undefined;
    const alternativeMatches = goodMatches.slice(1, 4); // Top 3 alternatives

    return {
      tenderItemDescription,
      tenderSpecifications,
      requiredCertifications,
      quantity,
      unit,
      matches: sortedMatches,
      bestMatch,
      alternativeMatches,
      noMatchReason: goodMatches.length === 0 ? 'No products meet minimum match threshold (60%)' : undefined,
    };
  } catch (error) {
    console.error('Product matching failed:', error);
    return {
      tenderItemDescription,
      tenderSpecifications,
      requiredCertifications,
      quantity,
      unit,
      matches: [],
      noMatchReason: error instanceof Error ? error.message : 'Product matching failed',
    };
  }
}

/**
 * Compare all tender items with supplier products
 */
export async function compareAllTenderItems(
  tenderItems: Array<{
    description: string;
    specifications?: Record<string, any>;
    requiredCertifications?: string[];
    quantity?: number;
    unit?: string;
    category?: string;
  }>
): Promise<ProductComparisonResult> {
  try {
    // Process each tender item
    const matchPromises = tenderItems.map((item) =>
      findMatchingProducts({
        tenderItemDescription: item.description,
        tenderSpecifications: item.specifications || {},
        requiredCertifications: item.requiredCertifications || [],
        quantity: item.quantity || 1,
        unit: item.unit || 'unit',
        category: item.category,
      })
    );

    const itemMatches = await Promise.all(matchPromises);

    // Calculate overall match rate
    const itemsWithGoodMatches = itemMatches.filter(
      (im) => im.bestMatch && im.bestMatch.matchScore >= 60
    ).length;
    const overallMatchRate = (itemsWithGoodMatches / tenderItems.length) * 100;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (overallMatchRate >= 80) {
      recommendations.push('Excellent match rate - company has most required products in catalog');
    } else if (overallMatchRate >= 60) {
      recommendations.push('Good match rate - consider tendering with some product sourcing needed');
    } else if (overallMatchRate >= 40) {
      recommendations.push('Moderate match rate - significant sourcing effort required');
    } else {
      recommendations.push('Low match rate - major product gaps, consider partnering or skip tender');
    }

    const itemsWithNoMatch = itemMatches.filter(im => !im.bestMatch);
    if (itemsWithNoMatch.length > 0) {
      recommendations.push(
        `${itemsWithNoMatch.length} item(s) have no suitable matches - sourcing required`
      );
    }

    const itemsWithLowConfidence = itemMatches.filter(
      im => im.bestMatch && im.bestMatch.confidence < 70
    );
    if (itemsWithLowConfidence.length > 0) {
      recommendations.push(
        `${itemsWithLowConfidence.length} item(s) need manual specification review`
      );
    }

    return {
      success: true,
      tenderItems: itemMatches,
      overallMatchRate: Math.round(overallMatchRate),
      recommendations,
      analysisDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Tender comparison failed:', error);
    return {
      success: false,
      tenderItems: [],
      overallMatchRate: 0,
      recommendations: [],
      analysisDate: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Comparison failed',
    };
  }
}

/**
 * Quick check if we have products that could match tender category
 */
export async function checkCatalogCoverage(category?: string): Promise<{
  hasProducts: boolean;
  productCount: number;
  categories: string[];
}> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      ...(category ? { category } : {}),
    },
    select: {
      category: true,
    },
  });

  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return {
    hasProducts: products.length > 0,
    productCount: products.length,
    categories: uniqueCategories as string[],
  };
}
