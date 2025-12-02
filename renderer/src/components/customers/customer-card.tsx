/**
 * Customer Card Component
 * Display customer information in a card layout
 */

'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Mail, Phone, MapPin, TrendingUp, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomerCardProps {
  customer: {
    id: string
    name: string
    type: 'GOVERNMENT' | 'PRIVATE'
    primaryContact?: string | null
    email?: string | null
    phone?: string | null
    city?: string | null
    country?: string
    currentBalance: number
    isActive: boolean
    _count?: {
      tenders: number
      invoices: number
    }
  }
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const balance = Number(customer.currentBalance || 0)
  const hasDebt = balance > 0

  return (
    <Link href={`/customers/${customer.id}`}>
      <Card className={cn(
        'hover:shadow-lg transition-all cursor-pointer h-full',
        !customer.isActive && 'opacity-60 bg-gray-50'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{customer.name}</h3>
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
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Contact Information */}
          <div className="space-y-2 text-sm">
            {customer.primaryContact && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium">{customer.primaryContact}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{customer.city}, {customer.country}</span>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="pt-3 border-t grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                <span>Tenders</span>
              </div>
              <p className="text-lg font-semibold">{customer._count?.tenders || 0}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                <span>Invoices</span>
              </div>
              <p className="text-lg font-semibold">{customer._count?.invoices || 0}</p>
            </div>
          </div>

          {/* Balance */}
          {hasDebt && (
            <div className="pt-3 border-t">
              <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
              <p className={cn(
                'text-lg font-semibold',
                balance > 0 ? 'text-red-600' : 'text-green-600'
              )}>
                KWD {balance.toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
