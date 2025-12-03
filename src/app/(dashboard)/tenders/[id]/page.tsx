/**
 * Tender Detail Page
 * View and edit individual tender information
 */

'use client';

import { TenderItems } from '@/components/tender/TenderItems';
import { TenderParticipants } from '@/components/tender/TenderParticipants';
import { TenderSpecificationAnalysis } from '@/components/tender/TenderSpecificationAnalysis';
import { TenderSubmissionDocuments } from '@/components/tender/TenderSubmissionDocuments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TenderStatus } from '@prisma/client';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Edit,
  FileText,
  Lightbulb,
  Loader2,
  Shield,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

interface TenderDetailProps {
  params: Promise<{ id: string }>;
}

interface TenderAnalysis {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  winProbability: {
    score: number;
    confidence: number;
    factors: {
      name: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
      description: string;
    }[];
  };
  competitiveScore: {
    overall: number;
    breakdown: {
      priceCompetitiveness: number;
      technicalCapability: number;
      deliveryCapacity: number;
      pastPerformance: number;
      compliance: number;
    };
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    rationale: string;
  }[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigations: string[];
  };
}

export default function TenderDetailPage({ params }: TenderDetailProps) {
  const { id } = use(params);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tender, setTender] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [analysis, setAnalysis] = useState<TenderAnalysis | null>(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const fetchAnalysis = async () => {
    try {
      const response = await fetch(`/api/tenders/${id}/analyze`);
      if (response.ok) {
        const data = await response.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
        }
      }
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    }
  };

  // Handler for SWOT analysis (used by analysis button in sidebar)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAnalyzeTender = async () => {
    setAnalyzingAI(true);
    setAnalysisError(null);
    try {
      const response = await fetch(`/api/tenders/${id}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to analyze tender');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setShowAnalysis(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze tender';
      setAnalysisError(message);
    } finally {
      setAnalyzingAI(false);
    }
  };

  // Fetch existing analysis on mount
  useEffect(() => {
    if (tender?.id) {
      fetchAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tender?.id]);

  useEffect(() => {
    fetchTender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTender = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${id}`);
      const result = await response.json();

      if (result.success) {
        setTender(result.data);
      }
    } catch (error) {
      console.error('Error fetching tender:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TenderStatus) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/tenders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        setTender(result.data);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tender?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tenders/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/tenders');
      }
    } catch (error) {
      console.error('Error deleting tender:', error);
    }
  };

  const handleAIAnalysis = async () => {
    setAnalyzingAI(true);
    setAnalysisError(null);

    try {
      const response = await fetch(`/api/tenders/${id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze tender');
      }

      if (result.success && result.data) {
        setAnalysis(result.data);
        setShowAnalysis(true);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze tender');
    } finally {
      setAnalyzingAI(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Tender Not Found</CardTitle>
            <CardDescription>The requested tender could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/tenders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tenders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const products = Array.isArray(tender.products) ? tender.products : [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{tender.title}</h1>
            <p className="text-muted-foreground font-mono">{tender.tenderNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAIAnalysis}
            disabled={analyzingAI}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {analyzingAI ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            {analyzingAI ? 'Analyzing...' : 'AI Analysis'}
          </Button>
          <Button variant="outline" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* AI Analysis Error */}
      {analysisError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-800">{analysisError}</span>
          <Button variant="ghost" size="sm" onClick={() => setAnalysisError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* AI Analysis Results */}
      {analysis && showAnalysis && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI Tender Analysis
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAnalysis(!showAnalysis)}>
                {showAnalysis ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Win Probability & Competitive Score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Win Probability */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">Win Probability</h3>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-purple-600">
                    {analysis.winProbability.score}%
                  </span>
                  <span className="text-sm text-muted-foreground mb-1">
                    confidence: {analysis.winProbability.confidence}%
                  </span>
                </div>
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${analysis.winProbability.score}%` }}
                  />
                </div>
                {analysis.winProbability.factors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {analysis.winProbability.factors.slice(0, 3).map((factor, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {factor.impact === 'positive' ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : factor.impact === 'negative' ? (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-gray-300" />
                        )}
                        <span className="text-muted-foreground">{factor.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Competitive Score */}
              <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Competitive Score</h3>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-blue-600">
                    {analysis.competitiveScore.overall}
                  </span>
                  <span className="text-sm text-muted-foreground mb-1">/ 100</span>
                </div>
                <div className="mt-3 space-y-2">
                  {Object.entries(analysis.competitiveScore.breakdown).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-28 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SWOT Analysis */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                SWOT Analysis
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-medium text-green-700 text-sm mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {analysis.swot.strengths.map((item, i) => (
                      <li key={i} className="text-xs text-green-800">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h4 className="font-medium text-yellow-700 text-sm mb-2">Weaknesses</h4>
                  <ul className="space-y-1">
                    {analysis.swot.weaknesses.map((item, i) => (
                      <li key={i} className="text-xs text-yellow-800">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-700 text-sm mb-2">Opportunities</h4>
                  <ul className="space-y-1">
                    {analysis.swot.opportunities.map((item, i) => (
                      <li key={i} className="text-xs text-blue-800">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="font-medium text-red-700 text-sm mb-2">Threats</h4>
                  <ul className="space-y-1">
                    {analysis.swot.threats.map((item, i) => (
                      <li key={i} className="text-xs text-red-800">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Recommendations & Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recommendations */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Recommendations
                </h3>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getPriorityColor(rec.priority)}>{rec.priority}</Badge>
                      </div>
                      <p className="text-sm font-medium">{rec.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Assessment */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Assessment
                </h3>
                <div
                  className={`border rounded-lg p-4 ${getRiskLevelColor(
                    analysis.riskAssessment.level
                  )}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="outline"
                      className={getRiskLevelColor(analysis.riskAssessment.level)}
                    >
                      {analysis.riskAssessment.level.toUpperCase()} RISK
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium mb-1">Risk Factors:</p>
                      <ul className="space-y-1">
                        {analysis.riskAssessment.factors.map((factor, i) => (
                          <li key={i} className="text-xs">
                            • {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">Mitigations:</p>
                      <ul className="space-y-1">
                        {analysis.riskAssessment.mitigations.map((mit, i) => (
                          <li key={i} className="text-xs">
                            • {mit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tender.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{tender.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {tender.customer && (
                  <div>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Customer
                    </h3>
                    <p className="text-muted-foreground">{tender.customer.name}</p>
                  </div>
                )}

                {tender.department && (
                  <div>
                    <h3 className="font-semibold mb-1">Department</h3>
                    <p className="text-muted-foreground">{tender.department}</p>
                  </div>
                )}

                {tender.category && (
                  <div>
                    <h3 className="font-semibold mb-1">Category</h3>
                    <p className="text-muted-foreground">{tender.category}</p>
                  </div>
                )}

                {tender.submissionDeadline && (
                  <div>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Submission Deadline
                    </h3>
                    <p className="text-muted-foreground">
                      {format(new Date(tender.submissionDeadline), 'PPP')}
                    </p>
                  </div>
                )}

                {tender.openingDate && (
                  <div>
                    <h3 className="font-semibold mb-1">Opening Date</h3>
                    <p className="text-muted-foreground">
                      {format(new Date(tender.openingDate), 'PPP')}
                    </p>
                  </div>
                )}

                {tender.estimatedValue && (
                  <div>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Estimated Value
                    </h3>
                    <p className="text-muted-foreground">
                      {tender.currency} {Number(tender.estimatedValue).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {tender.bondRequired && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Bid Bond Required
                  </h3>
                  {tender.bondAmount && (
                    <p className="text-muted-foreground">
                      Amount: {tender.currency} {Number(tender.bondAmount).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {tender.notes && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{tender.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tender Items Management */}
          <TenderItems
            tenderId={tender.id}
            isReadOnly={
              tender.status === 'WON' || tender.status === 'LOST' || tender.status === 'CANCELLED'
            }
          />

          {/* Participants and Bidding */}
          <TenderParticipants
            tenderId={tender.id}
            tenderStatus={tender.status}
            submissionDeadline={tender.submissionDeadline}
          />

          {/* Submission Documents */}
          <TenderSubmissionDocuments
            tenderId={tender.id}
            tenderNumber={tender.tenderNumber}
            tenderStatus={tender.status}
            isReadOnly={
              tender.status === 'WON' || tender.status === 'LOST' || tender.status === 'CANCELLED'
            }
          />

          {/* AI Specification Analysis - Manufacturers & Competitors */}
          <TenderSpecificationAnalysis
            tenderId={tender.id}
            tenderTitle={tender.title}
          />

          {/* Products/Items (Legacy - for old tenders) */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items (Legacy - {products.length})</CardTitle>
                <CardDescription>
                  These are old-format items. Use the Tender Items section above for new tenders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {products.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {item.itemDescription || item.name || `Item ${index + 1}`}
                          </h4>
                          {item.specifications && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.specifications}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {item.quantity} {item.unit}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {(tender.technicalRequirements || tender.commercialRequirements) && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tender.technicalRequirements && (
                  <div>
                    <h3 className="font-semibold mb-2">Technical Requirements</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {tender.technicalRequirements}
                    </p>
                  </div>
                )}
                {tender.commercialRequirements && (
                  <div>
                    <h3 className="font-semibold mb-2">Commercial Requirements</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {tender.commercialRequirements}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Current Status</label>
                <Select
                  value={tender.status}
                  onValueChange={handleStatusChange}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="WON">Won</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(tender.createdAt), 'PPP')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">{format(new Date(tender.updatedAt), 'PPP')}</p>
              </div>
              {tender.createdBy && (
                <div>
                  <p className="text-muted-foreground">Created By</p>
                  <p className="font-medium">{tender.createdBy.fullName}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/documents?moduleId=${tender.id}`}>View Documents</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
