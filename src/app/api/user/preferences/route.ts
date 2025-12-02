import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Default preferences structure
const defaultNotificationPreferences = {
  email: true,
  system: true,
  budgetAlerts: true,
  tenderUpdates: true,
  inventoryAlerts: true,
  approvalRequests: true,
  weeklyDigest: false,
}

const defaultAppearancePreferences = {
  theme: 'system', // 'light' | 'dark' | 'system'
  sidebarCollapsed: false,
  compactMode: false,
  colorScheme: 'default', // 'default' | 'blue' | 'green' | 'purple'
}

// GET - Fetch current user preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        notificationPreferences: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse notification preferences
    let notifications = defaultNotificationPreferences
    try {
      if (user.notificationPreferences) {
        notifications = {
          ...defaultNotificationPreferences,
          ...(typeof user.notificationPreferences === 'string' 
            ? JSON.parse(user.notificationPreferences)
            : user.notificationPreferences)
        }
      }
    } catch {
      // Use defaults if parsing fails
    }

    // Appearance preferences stored in AppSettings (user-specific key)
    let appearance = defaultAppearancePreferences
    try {
      const appearanceSetting = await prisma.appSettings.findUnique({
        where: { key: `user_appearance_${session.user.id}` }
      })
      if (appearanceSetting) {
        appearance = {
          ...defaultAppearancePreferences,
          ...JSON.parse(appearanceSetting.value)
        }
      }
    } catch {
      // Use defaults
    }

    return NextResponse.json({
      notifications,
      appearance,
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// PUT - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notifications, appearance } = body

    // Update notification preferences in User table
    if (notifications) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          notificationPreferences: notifications,
        },
      })
    }

    // Update appearance preferences in AppSettings
    if (appearance) {
      await prisma.appSettings.upsert({
        where: { key: `user_appearance_${session.user.id}` },
        create: {
          key: `user_appearance_${session.user.id}`,
          value: JSON.stringify(appearance),
          isEncrypted: false,
          description: `Appearance preferences for user ${session.user.id}`,
        },
        update: {
          value: JSON.stringify(appearance),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
