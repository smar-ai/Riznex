import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clients = await prisma.client.findMany({
    include: {
      users: { where: { role: 'client' }, select: { id: true, name: true, email: true } },
      _count: { select: { sales: true, expenses: true, suppliers: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Ignore absurd future dates (like 2027) which are user typos in data entry
  const now = new Date();
  now.setDate(now.getDate() + 30); // allow up to a month in future

  const salesGroup = await prisma.sale.groupBy({
    by: ['clientId', 'platform'],
    where: { weekEnd: { lte: now } },
    _max: { weekEnd: true }
  })
  
  const expensesGroup = await prisma.expense.groupBy({
    by: ['clientId', 'category'],
    where: { date: { lte: now } },
    _max: { date: true }
  })

  const clientsWithDates = clients.map(c => {
    const cSales = salesGroup.filter(s => s.clientId === c.id)
    const cExpenses = expensesGroup.filter(s => s.clientId === c.id)
    
    const posPlatforms = ['POS Sales', 'Walk In Card', 'Walk In Cash', 'Herbies POS', 'Tasty Bun POS', 'Herbies Web & App']
    const posDates = cSales.filter(s => posPlatforms.includes(s.platform)).map(s => s._max.weekEnd?.getTime() || 0)
    const maxPosDate = posDates.length > 0 ? Math.max(...posDates) : 0

    // Include "utilities" which is what Henley uses
    const autoExpensesDates = cExpenses.filter(e => ['electricity', 'gas', 'water', 'internet', 'rent', 'utilities'].includes(e.category)).map(e => e._max.date?.getTime() || 0)
    const maxAutoExpDate = autoExpensesDates.length > 0 ? Math.max(...autoExpensesDates) : 0

    return {
      ...c,
      latestDates: {
        uber_eats: cSales.find(s => s.platform === 'Uber Eats')?._max.weekEnd || null,
        deliveroo: cSales.find(s => s.platform === 'Deliveroo')?._max.weekEnd || null,
        just_eat: cSales.find(s => s.platform === 'Just Eat')?._max.weekEnd || null,
        pos: maxPosDate > 0 ? new Date(maxPosDate) : null,
        auto_expenses: maxAutoExpDate > 0 ? new Date(maxAutoExpDate) : null,
      }
    }
  })

  return NextResponse.json(clientsWithDates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, address, phone, email, jeCommission, ueCommission, delCommission, userEmail, userName, userPassword } = body

  const client = await prisma.client.create({
    data: {
      name,
      address: address || null,
      phone: phone || null,
      email: email || null,
      jeCommission: jeCommission ?? 14,
      ueCommission: ueCommission ?? 30,
      delCommission: delCommission ?? 14,
    },
  })

  if (userEmail && userPassword) {
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(userPassword, 10)
    await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        name: userName || name,
        role: 'client',
        clientId: client.id,
      },
    })
  }

  return NextResponse.json(client, { status: 201 })
}
