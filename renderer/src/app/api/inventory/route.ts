import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const inventory = await prisma.inventory.findMany({
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const stats = {
      totalItems: inventory.length,
      totalValue: inventory.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0),
      lowStock: inventory.filter(i => i.availableQuantity < 10).length,
      expiringSoon: inventory.filter(i => {
        if (!i.expiryDate) return false
        const daysUntilExpiry = Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0
      }).length,
    }

    return NextResponse.json({ inventory, stats })
  } catch (error) {
    console.error('Inventory fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}
