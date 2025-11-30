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

    const customers = await prisma.customer.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: { tenders: true, invoices: true }
        }
      },
      orderBy: { name: 'asc' },
    })

    const stats = {
      total: customers.length,
      active: customers.filter(c => c.isActive).length,
      government: customers.filter(c => c.type === 'GOVERNMENT').length,
      private: customers.filter(c => c.type === 'PRIVATE').length,
      totalBalance: customers.reduce((sum, c) => sum + Number(c.currentBalance || 0), 0),
    }

    return NextResponse.json({ customers, stats })
  } catch (error) {
    console.error('Customers fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}
