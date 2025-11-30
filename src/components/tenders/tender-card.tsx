/**
 * Tender Card Component
 * Displays tender information in card format for list views
 */

'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TenderStatusBadge } from './tender-status-badge'
import { Badge } from '@/components/ui/badge'
import { Calendar, Building2, DollarSign, Clock } from 'lucide-react'
import { format, formatDistanceToNow, isPast } from 'date-fns'

interface TenderCardProps {
  tender: {
    id: string
    tenderNumber: string
    title: string
    description?: string | null
    status: any
    submissionDeadline?: Date | string | null
    estimatedValue?: number | null
    currency?: string
    department?: string | null
    customer?: {
      name: string
    } | null
    createdAt: Date | string
  }
}

export function TenderCard({ tender }: TenderCardProps) {
  const deadline = tender.submissionDeadline
    ? new Date(tender.submissionDeadline)
    : null
  const isOverdue = deadline && isPast(deadline)
  const isActive = ['DRAFT', 'IN_PROGRESS'].includes(tender.status)

  return (
    <Link href={`/tenders/${tender.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{tender.title}</CardTitle>
                {isOverdue && isActive && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
              </div>
              <CardDescription className="flex items-center gap-2">
                <span className="font-mono text-sm">{tender.tenderNumber}</span>
              </CardDescription>
            </div>
            <TenderStatusBadge status={tender.status} />
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {tender.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {tender.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {tender.customer && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="truncate">{tender.customer.name}</span>
                </div>
              )}

              {tender.department && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="truncate">{tender.department}</span>
                </div>
              )}

              {deadline && (
                <div
                  className={`flex items-center gap-2 ${
                    isOverdue && isActive
                      ? 'text-destructive font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(deadline, 'MMM dd, yyyy')}
                    {isActive && (
                      <span className="text-xs ml-1">
                        ({formatDistanceToNow(deadline, { addSuffix: true })})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {tender.estimatedValue && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {tender.currency || 'KWD'}{' '}
                    {Number(tender.estimatedValue).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="h-3 w-3" />
              <span>
                Created {formatDistanceToNow(new Date(tender.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
