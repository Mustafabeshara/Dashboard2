/**
 * Admin Settings API
 * Provides access to system configuration (read from environment)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEnvironmentInfo, getEnabledProviders } from '@/lib/env-validator'
import { 
  APPROVAL_THRESHOLDS, 
  BUDGET_THRESHOLDS, 
  CURRENCY_CONFIG 
} from '@/lib/config/business-rules'

// System settings are configured via environment variables
// This endpoint provides a read-only view of current configuration

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view settings
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const envInfo = getEnvironmentInfo()
    const aiProviders = getEnabledProviders()

    // Return current configuration (read-only)
    const settings = {
      application: {
        name: 'Medical Distribution Dashboard',
        version: '1.0.0',
        environment: envInfo.nodeEnv,
      },
      business: {
        currency: CURRENCY_CONFIG.DEFAULT,
        approvalThresholds: {
          autoApprove: APPROVAL_THRESHOLDS.AUTO_APPROVE,
          manager: APPROVAL_THRESHOLDS.MANAGER,
          financeManager: APPROVAL_THRESHOLDS.FINANCE_MANAGER,
          cfo: APPROVAL_THRESHOLDS.CFO,
        },
        budgetAlerts: {
          warningThreshold: BUDGET_THRESHOLDS.WARNING,
          criticalThreshold: BUDGET_THRESHOLDS.CRITICAL,
        },
      },
      ai: {
        configuredProviders: aiProviders,
        providerCount: aiProviders.length,
      },
      security: {
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      },
      database: {
        hasConnectionString: !!process.env.DATABASE_URL,
        hasLocalDatabase: !!process.env.LOCAL_DATABASE_URL,
      },
      storage: {
        hasS3: !!(process.env.S3_BUCKET_NAME && process.env.S3_ACCESS_KEY_ID),
        hasRedis: !!process.env.REDIS_URL,
      },
      email: {
        configured: !!(process.env.EMAIL_SERVER && process.env.EMAIL_USER),
      },
    }

    return NextResponse.json({
      success: true,
      settings,
      message: 'Settings are configured via environment variables. Update your .env file or Railway dashboard to change.',
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST - Inform about configuration method
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: false,
      message: 'Settings are managed via environment variables. Please update your .env file or Railway dashboard variables.',
      documentation: 'See DEPLOYMENT_GUIDE.md for configuration instructions',
    }, { status: 400 })
  } catch (error) {
    console.error('Error with settings action:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
