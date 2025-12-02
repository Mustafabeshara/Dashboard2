/**
 * AI Provider Configuration API
 * Manages AI provider settings and API keys
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch all AI providers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const providers = await prisma.aIProviderConfig.findMany({
      orderBy: { priority: 'asc' },
    })

    // Mask API keys
    const maskedProviders = providers.map((provider) => ({
      ...provider,
      apiKey: provider.apiKey ? '********' : null,
      hasApiKey: !!provider.apiKey,
    }))

    return NextResponse.json({ providers: maskedProviders })
  } catch (error) {
    console.error('Error fetching AI providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI providers' },
      { status: 500 }
    )
  }
}

// POST - Create or update AI provider
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
    const {
      provider,
      name,
      apiKey,
      model,
      priority = 1,
      isEnabled = true,
      rateLimit,
      dailyLimit,
      capabilities,
      config,
    } = body

    if (!provider || !name || !model) {
      return NextResponse.json(
        { error: 'Provider, name, and model are required' },
        { status: 400 }
      )
    }

    const result = await prisma.aIProviderConfig.upsert({
      where: {
        provider_model: { provider, model },
      },
      update: {
        name,
        ...(apiKey && apiKey !== '********' ? { apiKey } : {}),
        priority,
        isEnabled,
        rateLimit,
        dailyLimit,
        capabilities,
        config,
      },
      create: {
        provider,
        name,
        apiKey,
        model,
        priority,
        isEnabled,
        rateLimit,
        dailyLimit,
        capabilities,
        config,
      },
    })

    return NextResponse.json({
      provider: {
        ...result,
        apiKey: result.apiKey ? '********' : null,
        hasApiKey: !!result.apiKey,
      },
    })
  } catch (error) {
    console.error('Error saving AI provider:', error)
    return NextResponse.json(
      { error: 'Failed to save AI provider' },
      { status: 500 }
    )
  }
}

// PUT - Update provider usage stats
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, incrementUsage } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    const provider = await prisma.aIProviderConfig.update({
      where: { id },
      data: {
        ...(incrementUsage ? { usageCount: { increment: 1 } } : {}),
        lastUsed: new Date(),
      },
    })

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Error updating AI provider:', error)
    return NextResponse.json(
      { error: 'Failed to update AI provider' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an AI provider
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    await prisma.aIProviderConfig.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AI provider:', error)
    return NextResponse.json(
      { error: 'Failed to delete AI provider' },
      { status: 500 }
    )
  }
}
