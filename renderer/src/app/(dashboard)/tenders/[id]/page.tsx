/**
 * Tender Detail Page
 * View and edit individual tender information
 */

'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TenderStatusBadge } from '@/components/tenders/tender-status-badge'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  Edit,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { format } from 'date-fns'
import { TenderStatus } from '@prisma/client'

interface TenderDetailProps {
  params: Promise<{ id: string }>
}

// Force dynamic rendering for client components
export const dynamic = 'force-dynamic'

export default function TenderDetailPage({ params }: TenderDetailProps) {
  const { id } = use(params)
  const router = useRouter()
  const [tender, setTender] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchTender()
  }, [id])

  const fetchTender = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tenders/${id}`)
      const result = await response.json()

      if (result.success) {
        setTender(result.data)
      }
    } catch (error) {
      console.error('Error fetching tender:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: TenderStatus) => {
    try {
      setUpdating(true)
      const response = await fetch(`/api/tenders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (result.success) {
        setTender(result.data)
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tender?')) {
      return
    }

    try {
      const response = await fetch(`/api/tenders/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/tenders')
      }
    } catch (error) {
      console.error('Error deleting tender:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
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
    )
  }

  const products = Array.isArray(tender.products) ? tender.products : []

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
          <Button variant="outline" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

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

          {/* Products/Items */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items ({products.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                <p className="font-medium">
                  {format(new Date(tender.createdAt), 'PPP')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(tender.updatedAt), 'PPP')}
                </p>
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
                <Link href={`/documents?moduleId=${tender.id}`}>
                  View Documents
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
