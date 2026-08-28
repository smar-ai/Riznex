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
  const category = searchParams.get('category')
  const filterMode = searchParams.get('filterMode')
  const period = searchParams.get('period')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const is2025 = searchParams.get('is2025') === 'true'

  if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

  const where: any = { clientId, is2025 }
  
  if (category) {
    where.category = category
  } else if (filterMode === 'utilities') {
    where.category = { in: ['electricity', 'gas', 'water', 'internet', 'bin', 'utilities'] }
  } else if (filterMode === 'other') {
    where.category = { in: ['fuel', 'rent', 'tax', 'misc', 'fees'] }
  } else if (filterMode === 'marketing') {
    where.category = { in: ['social_media', 'facebook_ads', 'google_ads', 'newspaper_ads', 'print_material', 'marketing_misc', 'herbies_head_office'] }
  }

  if (period) {
    where.period = period
  } else {
    where.period = { not: 'template' }
  }
  const defaultFrom = is2025 ? new Date(2000, 0, 1) : new Date(Date.UTC(2026, 3, 1))
  const dateFrom = from ? new Date(from) : defaultFrom
  
  where.date = { gte: dateFrom }
  if (to) {
    const t = new Date(to)
    t.setUTCHours(23, 59, 59, 999)
    where.date.lte = t
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const clientId = session.user.role === 'admin' ? body.clientId : session.user.clientId

  if (String(body.period).toLowerCase() === 'monthly') {
    const weeklyAmount = Number(body.amount) / 4;
    const baseDate = new Date(body.date);
    const expensesToCreate = [];

    for (let i = 0; i < 4; i++) {
      const d = new Date(baseDate);
      d.setUTCDate(d.getUTCDate() - (i * 7));
      expensesToCreate.push({
        clientId,
        category: body.category,
        subcategory: body.subcategory ?? null,
        store: body.store ?? 'Combined',
        amount: weeklyAmount,
        period: 'weekly',
        date: d,
        notes: body.notes ? `${body.notes} (Week ${4-i}/4 split)` : `Split 1/4 of monthly expense`,
        is2025: body.is2025 === true,
      });
    }

    await prisma.expense.createMany({
      data: expensesToCreate
    });
    
    return NextResponse.json({ message: 'Split into 4 weekly expenses successfully' }, { status: 201 });
  } else {
    const expense = await prisma.expense.create({
      data: {
        clientId,
        category: body.category,
        subcategory: body.subcategory ?? null,
        store: body.store ?? 'Combined',
        amount: body.amount,
        period: body.period ?? 'weekly',
        date: new Date(body.date),
        notes: body.notes ?? null,
        is2025: body.is2025 === true,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  }
}
