import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Company profile keys
const COMPANY_SETTINGS_KEYS = {
  name: 'company_name',
  taxId: 'company_tax_id',
  email: 'company_email',
  phone: 'company_phone',
  address: 'company_address',
  website: 'company_website',
  registrationNumber: 'company_registration_number',
  currency: 'company_currency',
}

// GET - Fetch company profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all company settings
    const settings = await prisma.appSettings.findMany({
      where: {
        key: {
          in: Object.values(COMPANY_SETTINGS_KEYS)
        }
      }
    })

    // Convert to object
    const profile: Record<string, string> = {
      name: 'Beshara Group',
      taxId: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      registrationNumber: '',
      currency: 'KWD',
    }

    // Map settings to profile
    for (const setting of settings) {
      const key = Object.entries(COMPANY_SETTINGS_KEYS).find(([, v]) => v === setting.key)?.[0]
      if (key) {
        profile[key] = setting.value
      }
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching company profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company profile' },
      { status: 500 }
    )
  }
}

// PUT - Update company profile (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    const adminRoles = ['ADMIN', 'CEO', 'CFO']
    if (!user || !adminRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only admins can update company profile' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Update each setting
    const updates = []
    for (const [key, settingKey] of Object.entries(COMPANY_SETTINGS_KEYS)) {
      if (body[key] !== undefined) {
        updates.push(
          prisma.appSettings.upsert({
            where: { key: settingKey },
            create: {
              key: settingKey,
              value: body[key] || '',
              isEncrypted: false,
              description: `Company ${key}`,
            },
            update: {
              value: body[key] || '',
            },
          })
        )
      }
    }

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating company profile:', error)
    return NextResponse.json(
      { error: 'Failed to update company profile' },
      { status: 500 }
    )
  }
}
