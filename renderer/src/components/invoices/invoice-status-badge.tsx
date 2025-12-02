/**
 * Invoice Status Badge Component
 * Display invoice status with appropriate styling
 */

import { Badge } from '@/components/ui/badge'
import { InvoiceStatus } from '@prisma/client'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: any }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  SENT: { label: 'Sent', variant: 'default' },
  PAID: { label: 'Paid', variant: 'default' },
  OVERDUE: { label: 'Overdue', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' },
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}
