import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clientId = session.user.role === 'admin' ? searchParams.get('clientId') : session.user.clientId
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const is2025 = searchParams.get('is2025') === 'true'
  if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

  const defaultFrom = is2025 ? new Date(2000, 0, 1) : new Date(Date.UTC(2026, 3, 1))
  const dateFrom = from ? new Date(from) : defaultFrom

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const invoiceWhere: any = { 
    type: 'supplier', 
    is2025,
    OR: [
      { invoiceDate: { gte: dateFrom, ...(to ? { lte: (() => { const t = new Date(to); t.setUTCHours(23, 59, 59, 999); return t })() } : {}) } },
      { invoiceDate: null }
    ]
  }

  const suppliers = await prisma.supplier.findMany({
    where: { clientId, active: true },
    include: {
      invoices: {
        where: invoiceWhere,
        select: { id: true, amount: true, invoiceDate: true, fileName: true, filePath: true, ocrStatus: true, supplierId: true, createdAt: true },
        orderBy: { invoiceDate: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(suppliers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const clientId = session.user.role === 'admin' ? body.clientId : session.user.clientId

  const supplier = await prisma.supplier.create({
    data: {
      clientId,
      name: body.name,
      category: body.category ?? null,
      contact: body.contact ?? null,
      franchise: body.franchise ?? 'Combined',
    },
  })
  return NextResponse.json(supplier, { status: 201 })
}
