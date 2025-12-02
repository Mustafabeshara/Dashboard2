/**
 * Admin Settings API
 * Manages system-wide configuration settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch all settings or by category
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const settings = await prisma.systemSettings.findMany({
      where: category ? { category } : undefined,
      orderBy: { key: 'asc' },
    })

    // Mask secret values
    const maskedSettings = settings.map((setting) => ({
      ...setting,
      value: setting.isSecret ? '********' : setting.value,
    }))

    return NextResponse.json({ settings: maskedSettings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST - Create or update settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings must be an array' },
        { status: 400 }
      )
    }

    const results = await Promise.all(
      settings.map(async (setting: {
        key: string
        value: unknown
        category: string
        description?: string
        isSecret?: boolean
      }) => {
        return prisma.systemSettings.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value as object,
            category: setting.category,
            description: setting.description,
            isSecret: setting.isSecret ?? false,
          },
          create: {
            key: setting.key,
            value: setting.value as object,
            category: setting.category,
            description: setting.description,
            isSecret: setting.isSecret ?? false,
          },
        })
      })
    )

    return NextResponse.json({ success: true, count: results.length })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a setting
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      )
    }

    await prisma.systemSettings.delete({
      where: { key },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting setting:', error)
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    )
  }
}
