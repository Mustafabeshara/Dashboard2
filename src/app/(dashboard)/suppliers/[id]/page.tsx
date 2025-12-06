/**
 * Supplier Detail Page
 * View and manage individual supplier
 */

'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Trash2, Mail, Phone, Globe, Star, MapPin } from 'lucide-react'

interface SupplierDetailProps {
  params: Promise<{ id: string }>
}

export default function SupplierDetailPage({ params }: SupplierDetailProps) {
  const { id } = use(params)
  const router = useRouter()
  const [supplier, setSupplier] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSupplier()
  }, [id])

  const fetchSupplier = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/suppliers/${id}`)
      const result = await response.json()

      if (result.data) {
        setSupplier(result.data)
      }
    } catch (error) {
      console.error('Error fetching supplier:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this supplier?')) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/suppliers')
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
    }
  }

  const toggleActive = async () => {
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      })

      if (response.ok) {
        fetchSupplier()
      }
    } catch (error) {
      console.error('Error updating supplier:', error)
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

  if (!supplier) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Supplier Not Found</CardTitle>
            <CardDescription>The requested supplier could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/suppliers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Suppliers
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/suppliers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {supplier.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                {supplier.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {supplier.code && (
                <span className="text-sm text-muted-foreground font-mono">
                  {supplier.code}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={toggleActive} variant="outline">
            {supplier.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/suppliers/${id}/edit`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier.contactPerson && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{supplier.contactPerson}</p>
                </div>
              )}

              {supplier.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${supplier.email}`} className="hover:underline">
                    {supplier.email}
                  </a>
                </div>
              )}

              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${supplier.phone}`} className="hover:underline">
                    {supplier.phone}
                  </a>
                </div>
              )}

              {supplier.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={supplier.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {supplier.website}
                  </a>
                </div>
              )}

              {supplier.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p>{supplier.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {supplier.city && `${supplier.city}, `}{supplier.country}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {supplier.category && (
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{supplier.category}</p>
                  </div>
                )}

                {supplier.taxId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tax ID</p>
                    <p className="font-medium">{supplier.taxId}</p>
                  </div>
                )}

                {supplier.registrationNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">Registration Number</p>
                    <p className="font-medium">{supplier.registrationNumber}</p>
                  </div>
                )}

                {supplier.paymentTerms && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Terms</p>
                    <p className="font-medium">{supplier.paymentTerms}</p>
                  </div>
                )}

                {supplier.leadTime !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Time</p>
                    <p className="font-medium">{supplier.leadTime} days</p>
                  </div>
                )}

                {supplier.rating !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{Number(supplier.rating).toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                )}
              </div>

              {supplier.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{supplier.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">KWD 0</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Order</p>
                <p className="font-medium">Never</p>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          {supplier.rating !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Quality</span>
                    <span className="font-medium">{Number(supplier.rating).toFixed(1)}/5</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2" 
                      style={{ width: `${(Number(supplier.rating) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
