import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
function getClientId(session: any, req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const clientId = searchParams.get('clientId')
  if (session.user.role === 'admin') return clientId
  return session.user.clientId
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = getClientId(session, req)
  if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

  const { searchParams } = req.nextUrl
  const platform = searchParams.get('platform')
  const store = searchParams.get('store')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const is2025 = searchParams.get('is2025') === 'true'

  const where: any = { clientId, is2025 }

  // Platform filter: map codes to label substrings
  const platformMap: Record<string, string> = {
    uber_eats: 'Uber Eats',
    just_eat: 'Just Eat',
    deliveroo: 'Deliveroo',
    walk_in_cash: 'Cash',
    walk_in_card: 'Card',
    pos_sales: 'POS',
    pos: 'POS',
    'Just Eat': 'Just Eat',
    'Uber Eats': 'Uber Eats',
    'Deliveroo': 'Deliveroo',
    'Walk In Cash': 'Cash',
    'Walk In Card': 'Card',
    'POS Sales': 'POS',
    'In-Store POS': 'POS'
  }

  // Filter by explicit store name
  const storeConditions: any[] = []

  if (store && store !== 'Combined' && !store.startsWith('Monthly ')) {
    storeConditions.push({ store })
  }
  
  // Always exclude monthly records in weekly views
  const monthlyStores = ['Monthly Combined', 'Monthly Herbies Pizza', 'Monthly Tasty Bun']
  if (!store?.startsWith('Monthly')) {
    storeConditions.push({ store: { notIn: monthlyStores } })
  } else {
    // If it is a monthly view, filter by that exact store
    storeConditions.push({ store })
  }

  if (platform) {
    const platforms = platform.split(',').filter(Boolean)
    const platformConditions = platforms.map(p => {
      const label = platformMap[p] || p
      return { platform: { contains: label } }
    })
    if (platformConditions.length > 0) {
      storeConditions.push({ OR: platformConditions })
    }
  }

  if (storeConditions.length === 1) {
    Object.assign(where, storeConditions[0])
  } else if (storeConditions.length > 1) {
    where.AND = storeConditions
  }

  const defaultFrom = is2025 ? new Date(2000, 0, 1) : new Date(Date.UTC(2026, 3, 1))
  const dateFrom = from ? new Date(from) : defaultFrom
  
  where.weekEnd = { gte: dateFrom }
  if (to) {
    const t = new Date(to)
    t.setUTCHours(23, 59, 59, 999)
    where.weekEnd.lte = t
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { weekStart: 'desc' },
    include: { invoice: { select: { id: true, fileName: true, filePath: true } } },
  })
  return NextResponse.json(sales)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const clientId = session.user.role === 'admin' ? body.clientId : session.user.clientId

  if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

  const sale = await prisma.sale.create({
    data: {
      clientId,
      platform: body.platform,
      store: body.store || 'Combined',
      weekStart: new Date(body.weekStart),
      weekEnd: new Date(body.weekEnd),
      totalOrders: body.totalOrders ?? 0,
      grossSales: body.grossSales ?? 0,
      commission: body.commission ?? 0,
      vat: body.vat ?? 0,
      otherFees: body.otherFees ?? 0,
      adminFee: body.adminFee ?? 0,
      refunds: body.refunds ?? 0,
      cashOrders: body.cashOrders ?? 0,
      netPaid: body.netPaid ?? 0,
      adSpends: body.adSpends ?? 0,
      topRankFee: body.topRankFee ?? 0,
      offersOnItems: body.offersOnItems ?? 0,
      notes: body.notes ?? null,
      invoiceId: body.invoiceId ?? null,
    },
  })
  return NextResponse.json(sale, { status: 201 })
}
