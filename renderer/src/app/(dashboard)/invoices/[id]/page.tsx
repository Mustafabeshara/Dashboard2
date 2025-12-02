/**
 * Invoice Detail Page
 * View and manage individual invoice
 */

'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { ArrowLeft, Download, Edit, Trash2, Send } from 'lucide-react'
import { format } from 'date-fns'

interface InvoiceDetailProps {
  params: Promise<{ id: string }>
}

// Force dynamic rendering for client components
export const dynamic = 'force-dynamic'

export default function InvoiceDetailPage({ params }: InvoiceDetailProps) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/invoices/${id}`)
      const result = await response.json()

      if (result.data) {
        setInvoice(result.data)
      }
    } catch (error) {
      console.error('Error fetching invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return
    }

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/invoices')
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchInvoice()
      }
    } catch (error) {
      console.error('Error updating status:', error)
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

  if (!invoice) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Not Found</CardTitle>
            <CardDescription>The requested invoice could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/invoices">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoices
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const subtotal = invoice.items?.reduce((sum: number, item: any) => 
    sum + (Number(item.quantity) * Number(item.unitPrice)), 0) || 0
  const taxAmount = Number(invoice.taxAmount || 0)
  const total = Number(invoice.totalAmount || 0)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Invoice {invoice.invoiceNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/invoices/${id}/edit`}>
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
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <Link 
                    href={`/customers/${invoice.customer.id}`}
                    className="font-medium hover:underline"
                  >
                    {invoice.customer.name}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">
                    {format(new Date(invoice.invoiceDate), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">
                    {invoice.dueDate ? format(new Date(invoice.dueDate), 'PPP') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">{invoice.paymentTerms || 'N/A'}</p>
                </div>
              </div>

              {invoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoice.items && invoice.items.length > 0 ? (
                  <>
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-sm text-muted-foreground">
                          <th className="text-left py-2">Description</th>
                          <th className="text-right py-2">Quantity</th>
                          <th className="text-right py-2">Unit Price</th>
                          <th className="text-right py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((item: any) => (
                          <tr key={item.id} className="border-b">
                            <td className="py-3">{item.description}</td>
                            <td className="text-right py-3">{item.quantity}</td>
                            <td className="text-right py-3">
                              {invoice.currency} {Number(item.unitPrice).toLocaleString()}
                            </td>
                            <td className="text-right py-3">
                              {invoice.currency} {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{invoice.currency} {subtotal.toLocaleString()}</span>
                        </div>
                        {taxAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax</span>
                            <span>{invoice.currency} {taxAmount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total</span>
                          <span>{invoice.currency} {total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No line items found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.status === 'DRAFT' && (
                <Button 
                  className="w-full" 
                  onClick={() => handleStatusChange('SENT')}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Invoice
                </Button>
              )}
              {invoice.status === 'SENT' && (
                <Button 
                  className="w-full" 
                  onClick={() => handleStatusChange('PAID')}
                >
                  Mark as Paid
                </Button>
              )}
              <Button className="w-full" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </CardContent>
          </Card>

          {/* Information */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(invoice.createdAt), 'PPP')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(invoice.updatedAt), 'PPP')}
                </p>
              </div>
              {invoice.paidAt && (
                <div>
                  <p className="text-muted-foreground">Paid On</p>
                  <p className="font-medium">
                    {format(new Date(invoice.paidAt), 'PPP')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
