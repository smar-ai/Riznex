import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clientId = session.user.role === 'admin' ? searchParams.get('clientId') : session.user.clientId
  if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
  
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const is2025 = searchParams.get('is2025') === 'true'

  const where: any = { clientId, is2025 }
  const defaultFrom = is2025 ? new Date(2000, 0, 1) : new Date(Date.UTC(2026, 3, 1))
  const dateFrom = from ? new Date(from) : defaultFrom

  where.weekEnd = { gte: dateFrom }
  if (to) {
    const t = new Date(to)
    t.setUTCHours(23, 59, 59, 999)
    where.weekEnd.lte = t
  }

  const wages = await prisma.staffWage.findMany({
    where,
    include: { staff: true },
    orderBy: { weekEnd: 'desc' },
  })
  return NextResponse.json(wages)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const clientId = session.user.role === 'admin' ? body.clientId : session.user.clientId

  const wage = await prisma.staffWage.create({
    data: {
      clientId,
      staffId: body.staffId,
      amount: parseFloat(body.amount),
      weekEnd: new Date(body.weekEnd),
      store: body.store || 'Herbies Pizza',
    },
    include: { staff: true }
  })
  return NextResponse.json(wage, { status: 201 })
}
