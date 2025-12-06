# AI Features Guide

This guide describes the AI-powered features available in the Medical Distribution Management System.

## Table of Contents

1. [Overview](#overview)
2. [Tender AI Extraction](#tender-ai-extraction)
3. [Product Matching](#product-matching)
4. [Specification Analysis](#specification-analysis)
5. [Pricing Intelligence](#pricing-intelligence)
6. [SWOT & Win Probability Analysis](#swot--win-probability-analysis)
7. [Configuration](#configuration)
8. [Best Practices](#best-practices)

## Overview

The system includes several AI-powered features to streamline tender management, product sourcing, and pricing decisions. All AI features use state-of-the-art language models (Gemini, Groq) and include confidence scoring to help you make informed decisions.

### Supported AI Providers

- **Gemini (Google AI)**: Best for document processing, vision tasks
- **Groq**: Best for fast text processing
- **Fallback**: Automatic failover between providers

### Security Features

- ✅ Input sanitization to prevent prompt injection
- ✅ Rate limiting to prevent abuse
- ✅ Confidence scoring for all predictions
- ✅ Human review flags for low-confidence results

## Tender AI Extraction

**Purpose**: Automatically extract tender data from PDF documents and images.

### Features

- Extract tender reference, title, organization
- Identify closing dates
- Parse item lists with quantities and specifications
- Bilingual support (English and Arabic)
- Confidence scoring for each extracted field

### API Endpoint

```
POST /api/tenders/{tenderId}/extract
```

### Request Body

```json
{
  "fileUrl": "https://example.com/tender.pdf",
  "mimeType": "application/pdf"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "reference": "MOH-2024-001",
    "title": "Medical Equipment Supply",
    "organization": "Ministry of Health",
    "closingDate": "2024-12-31",
    "items": [
      {
        "itemDescription": "Blood Pressure Monitor",
        "quantity": 100,
        "unit": "pieces"
      }
    ],
    "confidence": {
      "overall": 0.85,
      "reference": 0.9,
      "title": 0.85,
      "organization": 0.9,
      "closingDate": 0.8,
      "items": 0.85
    }
  },
  "needsReview": false
}
```

### Human Review Triggers

The system automatically flags extractions for human review when:
- Overall confidence < 70%
- Critical field confidence < 70% (reference, closing date, items)
- Missing critical data

### Best Practices

1. **Use High-Quality Documents**: Clear scans produce better results
2. **Review Low Confidence**: Always review items flagged for human review
3. **Verify Critical Data**: Double-check reference numbers and closing dates
4. **Arabic Documents**: The system handles bilingual content automatically

## Product Matching

**Purpose**: Match tender specifications with products in your supplier catalog.

### Features

- AI-powered specification comparison
- Match scoring (0-100)
- Match types: exact, equivalent, similar, partial
- Alternative product suggestions
- Certification compliance checking

### API Endpoint

```
POST /api/tenders/{tenderId}/match-products
```

### Response

```json
{
  "success": true,
  "comparison": {
    "tenderItems": [
      {
        "tenderItemDescription": "Blood Pressure Monitor",
        "tenderSpecifications": {
          "accuracy": "±3 mmHg",
          "memory": "100 readings"
        },
        "bestMatch": {
          "productId": "prod-123",
          "productName": "Omron BP-100",
          "matchScore": 85,
          "matchType": "equivalent",
          "matchingSpecifications": ["accuracy", "memory"],
          "missingSpecifications": [],
          "certificationMatch": true,
          "confidence": 90
        },
        "alternativeMatches": [...]
      }
    ],
    "overallMatchRate": 85,
    "recommendations": [
      "Excellent match rate - company has most required products",
      "2 items need manual specification review"
    ]
  }
}
```

### Match Scores

- **90-100**: Exact match - meets all specifications
- **75-89**: Equivalent - functionally equivalent product
- **60-74**: Similar - close match with minor differences
- **< 60**: Partial - significant gaps, requires review

### Best Practices

1. **Update Product Catalog**: Keep specifications current
2. **Add Certifications**: Include all product certifications
3. **Review Alternatives**: Consider alternative matches for flexibility
4. **Check Low Scores**: Items < 60 may need sourcing or partnering

## Specification Analysis

**Purpose**: Analyze tender specifications to identify manufacturers and competitors.

### Features

- Identify manufacturers who produce matching products
- Analyze likely competitors
- Gather market intelligence
- Provide strategic recommendations

### API Endpoint

```
POST /api/tenders/{tenderId}/analyze-specs
```

### Request Options

```json
{
  "action": "full",  // or "manufacturers", "competitors", "extract"
  "specifications": "optional override text"
}
```

### Response

```json
{
  "success": true,
  "analysis": {
    "specifications": [...],
    "manufacturers": [
      {
        "name": "Philips Healthcare",
        "country": "Netherlands",
        "productMatch": "exact",
        "matchingProducts": ["IntelliVue Monitor"],
        "estimatedPriceRange": {
          "min": 5000,
          "max": 8000,
          "currency": "USD"
        },
        "certifications": ["ISO 13485", "CE Mark"],
        "strengths": ["Global leader", "Strong support"]
      }
    ],
    "competitors": [...],
    "marketIntelligence": {
      "marketSize": "Growing",
      "dominantPlayers": ["Philips", "GE Healthcare"],
      "pricingTrends": "Stable to slight increase"
    },
    "recommendations": [...]
  }
}
```

### Use Cases

1. **Sourcing Decisions**: Identify which manufacturers to approach
2. **Competitive Analysis**: Understand who else might bid
3. **Market Research**: Gather intelligence on pricing and trends
4. **Partnership Strategy**: Identify potential partners for gaps

## Pricing Intelligence

**Purpose**: Generate data-driven pricing recommendations for tender bids.

### Features

- Historical pricing analysis
- Market-based recommendations
- Win probability by price point
- Margin optimization
- Competitor price comparison

### API Endpoint

```
POST /api/tenders/{tenderId}/pricing
```

### Request (for single item)

```json
{
  "itemId": "item-123",
  "productDescription": "Blood Pressure Monitor",
  "quantity": 100,
  "costPrice": 50,
  "targetMargin": 20,
  "competitorPrices": [65, 68, 72]
}
```

### Response

```json
{
  "success": true,
  "recommendation": {
    "recommendedPrice": 67,
    "priceRange": {
      "minimum": 60,
      "competitive": 66,
      "optimal": 67,
      "maximum": 75
    },
    "confidence": 85,
    "winProbability": 72,
    "margin": {
      "atRecommended": 25.4,
      "atCompetitive": 24.2,
      "atOptimal": 25.4
    },
    "factors": [
      {
        "name": "Historical Win Rate",
        "impact": "positive",
        "weight": 30,
        "description": "Strong track record at this price point"
      }
    ],
    "competitors": [...],
    "recommendations": [
      "Price is competitive while maintaining healthy margin",
      "Consider volume discount for quantity > 100"
    ],
    "warnings": []
  }
}
```

### Price Ranges Explained

- **Minimum**: Lowest viable price (covers cost + minimal margin)
- **Competitive**: Price to beat most competitors
- **Optimal**: Best balance of margin and win probability ⭐
- **Maximum**: Highest justifiable price

### Best Practices

1. **Provide Cost Data**: More accurate with actual cost prices
2. **Monitor Win Rates**: Track actual results to improve predictions
3. **Consider Context**: Factor in customer relationships and strategic importance
4. **Use Competitive Intel**: Better recommendations with competitor data
5. **Review Warnings**: Address any pricing concerns flagged

## SWOT & Win Probability Analysis

**Purpose**: Comprehensive tender evaluation and strategic analysis.

### Features

- SWOT analysis (Strengths, Weaknesses, Opportunities, Threats)
- Win probability calculation (0-100%)
- Competitive scoring
- Risk assessment
- Strategic recommendations

### API Endpoint

```
POST /api/tenders/{tenderId}/analyze
```

### Response

```json
{
  "success": true,
  "data": {
    "swot": {
      "strengths": [
        "Established presence in Kuwait market",
        "Strong MOH relationships"
      ],
      "weaknesses": [...],
      "opportunities": [...],
      "threats": [...]
    },
    "winProbability": {
      "score": 72,
      "confidence": 85,
      "factors": [...]
    },
    "competitiveScore": {
      "overall": 75,
      "breakdown": {
        "priceCompetitiveness": 70,
        "technicalCapability": 80,
        "deliveryCapacity": 75,
        "pastPerformance": 78,
        "compliance": 85
      }
    },
    "recommendations": [...],
    "riskAssessment": {
      "level": "medium",
      "factors": [...],
      "mitigations": [...]
    }
  }
}
```

### Using Win Probability

- **> 70%**: Strong candidate - prepare detailed bid
- **50-70%**: Moderate chance - evaluate strategic importance
- **< 50%**: Low probability - consider if worth the effort

### Best Practices

1. **Use Early**: Run analysis before committing significant resources
2. **Factor into Go/No-Go**: Use as input for bid/no-bid decisions
3. **Address Weaknesses**: Act on recommendations to improve position
4. **Track Accuracy**: Compare predictions with actual outcomes

## Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key

# Optional (use defaults if not set)
AI_CACHE_ENABLED=true
AI_CACHE_TTL=3600
AI_TIMEOUT=30000
```

### Getting API Keys

1. **Gemini**: Visit https://makersuite.google.com/app/apikey
2. **Groq**: Visit https://console.groq.com/keys

### Rate Limits

Default rate limits (configurable):
- Groq: 30 requests/minute, 14,400 requests/day
- Gemini: 60 requests/minute, 1,500 requests/day

## Best Practices

### General Guidelines

1. **Validate AI Outputs**: Always review AI-generated results
2. **Use Confidence Scores**: Pay attention to confidence ratings
3. **Provide Context**: Better inputs lead to better outputs
4. **Monitor Usage**: Track AI costs and usage patterns
5. **Update Regularly**: Keep product catalog and specifications current

### Data Quality

1. **Product Catalog**: Keep specifications detailed and current
2. **Historical Data**: More past tenders = better predictions
3. **Document Quality**: Use clear, high-resolution scans
4. **Certifications**: Maintain accurate certification records

### Security

1. **Protect API Keys**: Never commit keys to version control
2. **Review Sensitive Data**: Be careful with confidential information
3. **Use Rate Limiting**: Prevent abuse with appropriate limits
4. **Audit Logs**: Monitor AI usage for unusual patterns

### Cost Optimization

1. **Cache Results**: Enable caching for frequently accessed data
2. **Batch Processing**: Process multiple items together when possible
3. **Use Appropriate Models**: Don't use vision models for text-only tasks
4. **Monitor Spending**: Track API costs and set budgets

## Troubleshooting

### Common Issues

**"No AI providers configured"**
- Solution: Set GEMINI_API_KEY or GROQ_API_KEY in environment

**"Low confidence extraction"**
- Solution: Use higher quality document scans, review manually

**"No matching products found"**
- Solution: Update product catalog with relevant items

**"Pricing analysis failed"**
- Solution: Ensure tender items have descriptions and quantities

### Getting Help

1. Check API response error messages
2. Review AI usage logs
3. Verify environment configuration
4. Contact support: support@beshara.com

## Performance Benchmarks

Typical processing times:
- Document extraction: 5-15 seconds
- Product matching: 2-5 seconds per item
- Specification analysis: 8-12 seconds
- Pricing recommendation: 3-6 seconds per item
- SWOT analysis: 10-15 seconds

## Future Enhancements

Planned features:
- [ ] Real-time market price tracking
- [ ] Automated competitor intelligence
- [ ] Machine learning for win prediction
- [ ] Multi-language expansion
- [ ] Voice-to-text tender entry
- [ ] Automated bid document generation

## Feedback

We're constantly improving our AI features. Share your feedback and suggestions:
- Email: ai-feedback@beshara.com
- Issues: https://github.com/Mustafabeshara/Dashboard2/issues

---

**Last Updated**: December 2024  
**Version**: 1.0.0
