'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Factory,
  Globe,
  Loader2,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

interface ManufacturerInfo {
  name: string
  country: string
  website?: string
  productMatch: 'exact' | 'similar' | 'partial'
  matchingProducts: string[]
  estimatedPriceRange?: {
    min: number
    max: number
    currency: string
  }
  certifications?: string[]
  strengths?: string[]
  leadTime?: string
  notes?: string
}

interface CompetitorInfo {
  name: string
  type: 'distributor' | 'manufacturer' | 'importer' | 'local_agent'
  country: string
  marketPresence: 'strong' | 'moderate' | 'emerging'
  likelyProducts: string[]
  competitiveAdvantage?: string[]
  historicalWinRate?: string
  notes?: string
}

interface MarketIntelligence {
  marketSize?: string
  growthTrend?: 'growing' | 'stable' | 'declining'
  dominantPlayers?: string[]
  pricingTrends?: string
  regulatoryFactors?: string[]
  entryBarriers?: string[]
}

interface AnalysisResult {
  success: boolean
  specifications: Array<{
    name: string
    category: string
    specifications: Record<string, string | number>
    requiredCertifications?: string[]
    quantity?: number
    unit?: string
  }>
  manufacturers: ManufacturerInfo[]
  competitors: CompetitorInfo[]
  marketIntelligence: MarketIntelligence
  recommendations: string[]
  confidenceScore: number
  error?: string
}

interface TenderSpecificationAnalysisProps {
  tenderId: string
  tenderTitle: string
}

export function TenderSpecificationAnalysis({
  tenderId,
  // tenderTitle is reserved for future use in analysis requests
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tenderTitle,
}: TenderSpecificationAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedManufacturer, setExpandedManufacturer] = useState<string | null>(null)
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null)

  const runAnalysis = async () => {
    setAnalyzing(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenders/${tenderId}/analyze-specs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'full' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const getMatchBadgeColor = (match: string) => {
    switch (match) {
      case 'exact':
        return 'bg-green-100 text-green-800'
      case 'similar':
        return 'bg-blue-100 text-blue-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPresenceBadgeColor = (presence: string) => {
    switch (presence) {
      case 'strong':
        return 'bg-green-100 text-green-800'
      case 'moderate':
        return 'bg-blue-100 text-blue-800'
      case 'emerging':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'manufacturer':
        return 'bg-purple-100 text-purple-800'
      case 'distributor':
        return 'bg-blue-100 text-blue-800'
      case 'importer':
        return 'bg-orange-100 text-orange-800'
      case 'local_agent':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Specification Analysis
        </CardTitle>
        <CardDescription>
          Identify manufacturers and competitors based on tender specifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!result && !analyzing && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Analyze Tender Specifications</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Use AI to identify manufacturers who produce matching products and competitors
              who might bid on this tender.
            </p>
            <Button onClick={runAnalysis} disabled={analyzing}>
              <Sparkles className="h-4 w-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        )}

        {analyzing && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-4" />
            <p className="text-muted-foreground">Analyzing specifications...</p>
            <p className="text-xs text-muted-foreground mt-2">
              This may take a moment as we search our database
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Analysis Failed</p>
              <p className="text-sm text-red-700">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={runAnalysis}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {result && result.success && (
          <div className="space-y-6">
            {/* Confidence Score */}
            <div className="flex items-center justify-between bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Analysis Confidence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-purple-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${result.confidenceScore * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {Math.round(result.confidenceScore * 100)}%
                </span>
              </div>
            </div>

            <Tabs defaultValue="manufacturers">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="manufacturers" className="flex items-center gap-1">
                  <Factory className="h-4 w-4" />
                  <span className="hidden sm:inline">Manufacturers</span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-1.5 rounded-full">
                    {result.manufacturers.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="competitors" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Competitors</span>
                  <span className="bg-orange-100 text-orange-800 text-xs px-1.5 rounded-full">
                    {result.competitors.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="market" className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Market</span>
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Tips</span>
                </TabsTrigger>
              </TabsList>

              {/* Manufacturers Tab */}
              <TabsContent value="manufacturers" className="mt-4">
                {result.manufacturers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No manufacturers identified
                  </p>
                ) : (
                  <div className="space-y-3">
                    {result.manufacturers.map((mfr, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            setExpandedManufacturer(
                              expandedManufacturer === mfr.name ? null : mfr.name
                            )
                          }
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium">{mfr.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                {mfr.country}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${getMatchBadgeColor(mfr.productMatch)}`}
                            >
                              {mfr.productMatch} match
                            </span>
                            {expandedManufacturer === mfr.name ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>

                        {expandedManufacturer === mfr.name && (
                          <div className="border-t p-3 bg-gray-50 space-y-3">
                            {mfr.matchingProducts.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Matching Products
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {mfr.matchingProducts.map((p, i) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-white border px-2 py-0.5 rounded"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {mfr.estimatedPriceRange && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Estimated Price Range
                                </p>
                                <p className="text-sm">
                                  {mfr.estimatedPriceRange.currency}{' '}
                                  {mfr.estimatedPriceRange.min.toLocaleString()} -{' '}
                                  {mfr.estimatedPriceRange.max.toLocaleString()}
                                </p>
                              </div>
                            )}

                            {mfr.certifications && mfr.certifications.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Certifications
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {mfr.certifications.map((c, i) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {mfr.strengths && mfr.strengths.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Strengths
                                </p>
                                <ul className="text-sm space-y-1">
                                  {mfr.strengths.map((s, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <span className="text-green-600">•</span> {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {mfr.leadTime && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Lead Time
                                </p>
                                <p className="text-sm">{mfr.leadTime}</p>
                              </div>
                            )}

                            {mfr.website && (
                              <a
                                href={mfr.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Visit Website
                              </a>
                            )}

                            {mfr.notes && (
                              <p className="text-xs text-muted-foreground italic">{mfr.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Competitors Tab */}
              <TabsContent value="competitors" className="mt-4">
                {result.competitors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No competitors identified
                  </p>
                ) : (
                  <div className="space-y-3">
                    {result.competitors.map((comp, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            setExpandedCompetitor(
                              expandedCompetitor === comp.name ? null : comp.name
                            )
                          }
                        >
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-orange-600" />
                            <div>
                              <p className="font-medium">{comp.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                {comp.country}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${getTypeBadgeColor(comp.type)}`}
                            >
                              {comp.type.replace('_', ' ')}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${getPresenceBadgeColor(comp.marketPresence)}`}
                            >
                              {comp.marketPresence}
                            </span>
                            {expandedCompetitor === comp.name ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>

                        {expandedCompetitor === comp.name && (
                          <div className="border-t p-3 bg-gray-50 space-y-3">
                            {comp.likelyProducts.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Likely Products
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {comp.likelyProducts.map((p, i) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-white border px-2 py-0.5 rounded"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {comp.competitiveAdvantage && comp.competitiveAdvantage.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Competitive Advantages
                                </p>
                                <ul className="text-sm space-y-1">
                                  {comp.competitiveAdvantage.map((a, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <span className="text-orange-600">•</span> {a}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {comp.historicalWinRate && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Historical Win Rate
                                </p>
                                <p className="text-sm">{comp.historicalWinRate}</p>
                              </div>
                            )}

                            {comp.notes && (
                              <p className="text-xs text-muted-foreground italic">{comp.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Market Intelligence Tab */}
              <TabsContent value="market" className="mt-4">
                <div className="space-y-4">
                  {result.marketIntelligence.marketSize && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-800 mb-1">Market Size</p>
                      <p className="text-sm">{result.marketIntelligence.marketSize}</p>
                    </div>
                  )}

                  {result.marketIntelligence.growthTrend && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-green-800 mb-1">Growth Trend</p>
                      <p className="text-sm capitalize">{result.marketIntelligence.growthTrend}</p>
                    </div>
                  )}

                  {result.marketIntelligence.pricingTrends && (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-purple-800 mb-1">Pricing Trends</p>
                      <p className="text-sm">{result.marketIntelligence.pricingTrends}</p>
                    </div>
                  )}

                  {result.marketIntelligence.dominantPlayers &&
                    result.marketIntelligence.dominantPlayers.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Dominant Players
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.marketIntelligence.dominantPlayers.map((p, i) => (
                            <span key={i} className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {result.marketIntelligence.regulatoryFactors &&
                    result.marketIntelligence.regulatoryFactors.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Regulatory Factors
                        </p>
                        <ul className="text-sm space-y-1">
                          {result.marketIntelligence.regulatoryFactors.map((r, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-blue-600">•</span> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {result.marketIntelligence.entryBarriers &&
                    result.marketIntelligence.entryBarriers.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Entry Barriers
                        </p>
                        <ul className="text-sm space-y-1">
                          {result.marketIntelligence.entryBarriers.map((b, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-red-600">•</span> {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="mt-4">
                {result.recommendations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No recommendations</p>
                ) : (
                  <div className="space-y-3">
                    {result.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 bg-purple-50 rounded-lg p-3"
                      >
                        <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Re-analyze Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={runAnalysis} disabled={analyzing}>
                <Search className="h-4 w-4 mr-2" />
                Re-analyze
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
