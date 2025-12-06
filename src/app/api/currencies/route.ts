/**
 * Currency API Endpoints
 * GET - Get supported currencies and exchange rates
 * POST - Update exchange rates (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { currencyService, CURRENCIES } from '@/lib/currency/currency-service'

// GET /api/currencies - Get all currencies and rates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeRates = searchParams.get('includeRates') !== 'false'
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const amount = searchParams.get('amount')

    // If conversion requested
    if (from && to && amount) {
      const parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount)) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      }

      const converted = currencyService.convert(parsedAmount, from, to)
      const formatted = currencyService.formatWithSymbol(converted, to)

      return NextResponse.json({
        success: true,
        conversion: {
          from: { currency: from, amount: parsedAmount },
          to: { currency: to, amount: converted, formatted },
          rate: currencyService.getRate(to) / currencyService.getRate(from),
        },
      })
    }

    // Return all currencies
    const currencies = Object.values(CURRENCIES).map(c => ({
      ...c,
      rate: currencyService.getRate(c.code),
    }))

    return NextResponse.json({
      success: true,
      baseCurrency: 'KWD',
      currencies,
      rates: includeRates ? currencyService.getAllRates() : undefined,
      lastUpdate: currencyService.getLastUpdate(),
    })
  } catch (error) {
    console.error('Error fetching currencies:', error)
    return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 })
  }
}

// POST /api/currencies - Update exchange rates (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    if (session.user.role !== 'ADMIN' && session.user.role !== 'CEO') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { rates } = body

    if (!rates || typeof rates !== 'object') {
      return NextResponse.json({ error: 'Invalid rates format' }, { status: 400 })
    }

    // Validate rates
    for (const [code, rate] of Object.entries(rates)) {
      if (!CURRENCIES[code]) {
        return NextResponse.json({ error: `Unknown currency: ${code}` }, { status: 400 })
      }
      if (typeof rate !== 'number' || rate <= 0) {
        return NextResponse.json({ error: `Invalid rate for ${code}` }, { status: 400 })
      }
    }

    currencyService.updateRates(rates as Record<string, number>)

    return NextResponse.json({
      success: true,
      message: 'Exchange rates updated',
      updatedAt: currencyService.getLastUpdate(),
    })
  } catch (error) {
    console.error('Error updating rates:', error)
    return NextResponse.json({ error: 'Failed to update rates' }, { status: 500 })
  }
}
