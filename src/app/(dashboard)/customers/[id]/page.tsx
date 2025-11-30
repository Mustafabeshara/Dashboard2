/**
 * Customer Detail Page
 * View and manage individual customer information
 */

'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'

interface CustomerDetailProps {
  params: Promise<{ id: string }>
}

export default function CustomerDetailPage({ params }: CustomerDetailProps) {
  const { id } = use(params)
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomer()
  }, [id])

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${id}`)
      const result = await response.json()

      if (result.success) {
        setCustomer(result.data)
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/customers')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
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

  if (!customer) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Not Found</CardTitle>
            <CardDescription>The requested customer could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/customers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Customers
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
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={customer.type === 'GOVERNMENT' ? 'default' : 'secondary'}>
                {customer.type === 'GOVERNMENT' ? 'Government' : 'Private'}
              </Badge>
              {!customer.isActive && (
                <Badge variant="outline" className="text-gray-500">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/customers/${id}/edit`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Tenders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer._count.tenders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer._count.invoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Current Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KWD {Number(customer.currentBalance).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tenders">Tenders</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customer.primaryContact && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Primary Contact</p>
                        <p className="font-medium">{customer.primaryContact}</p>
                      </div>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{customer.email}</p>
                      </div>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{customer.phone}</p>
                      </div>
                    </div>
                  )}
                  {(customer.address || customer.city) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">
                          {customer.address && <span>{customer.address}<br /></span>}
                          {customer.city}, {customer.country}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {customer.registrationNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Registration Number</p>
                      <p className="font-medium">{customer.registrationNumber}</p>
                    </div>
                  )}
                  {customer.taxId && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tax ID</p>
                      <p className="font-medium">{customer.taxId}</p>
                    </div>
                  )}
                  {customer.paymentTerms && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Terms</p>
                      <p className="font-medium">{customer.paymentTerms}</p>
                    </div>
                  )}
                  {customer.creditLimit && (
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Limit</p>
                      <p className="font-medium">KWD {Number(customer.creditLimit).toLocaleString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tenders">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Tenders</CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.tenders && customer.tenders.length > 0 ? (
                    <div className="space-y-4">
                      {customer.tenders.map((tender: any) => (
                        <Link
                          key={tender.id}
                          href={`/tenders/${tender.id}`}
                          className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{tender.title}</h4>
                              <p className="text-sm text-muted-foreground font-mono">
                                {tender.tenderNumber}
                              </p>
                            </div>
                            <Badge>{tender.status}</Badge>
                          </div>
                          {tender.estimatedValue && (
                            <p className="text-sm mt-2">
                              Value: {tender.currency} {Number(tender.estimatedValue).toLocaleString()}
                            </p>
                          )}
                          {tender.submissionDeadline && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Deadline: {format(new Date(tender.submissionDeadline), 'PPP')}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No tenders found for this customer
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.invoices && customer.invoices.length > 0 ? (
                    <div className="space-y-4">
                      {customer.invoices.map((invoice: any) => (
                        <Link
                          key={invoice.id}
                          href={`/invoices/${invoice.id}`}
                          className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{invoice.invoiceNumber}</h4>
                              <p className="text-sm mt-1">
                                {invoice.currency} {Number(invoice.totalAmount).toLocaleString()}
                              </p>
                            </div>
                            <Badge>{invoice.status}</Badge>
                          </div>
                          {invoice.dueDate && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Due: {format(new Date(invoice.dueDate), 'PPP')}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No invoices found for this customer
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link href={`/tenders/create?customerId=${id}`}>
                  Create Tender
                </Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href={`/invoices/create?customerId=${id}`}>
                  Create Invoice
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(customer.createdAt), 'PPP')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(customer.updatedAt), 'PPP')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
