/**
 * Tender Status Badge Component
 * Displays tender status with appropriate styling
 */

import { Badge } from '@/components/ui/badge'
import { TenderStatus } from '@prisma/client'

interface TenderStatusBadgeProps {
  status: TenderStatus
  className?: string
}

const STATUS_CONFIG: Record<
  TenderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  DRAFT: {
    label: 'Draft',
    variant: 'outline',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    variant: 'default',
  },
  SUBMITTED: {
    label: 'Submitted',
    variant: 'secondary',
  },
  WON: {
    label: 'Won',
    variant: 'default',
  },
  LOST: {
    label: 'Lost',
    variant: 'destructive',
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'outline',
  },
}

export function TenderStatusBadge({ status, className }: TenderStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
