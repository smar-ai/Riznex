import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  
  const body = await req.json()
  const sale = await prisma.sale.update({
    where: { id },
    data: {
      platform: body.platform,
      store: body.store,
      weekStart: body.weekStart ? new Date(body.weekStart) : undefined,
      weekEnd: body.weekEnd ? new Date(body.weekEnd) : undefined,
      totalOrders: body.totalOrders,
      grossSales: body.grossSales,
      commission: body.commission,
      vat: body.vat,
      otherFees: body.otherFees,
      adminFee: body.adminFee ?? 0,
      refunds: body.refunds ?? 0,
      cashOrders: body.cashOrders ?? 0,
      netPaid: body.netPaid,
      adSpends: body.adSpends ?? 0,
      topRankFee: body.topRankFee ?? 0,
      offersOnItems: body.offersOnItems ?? 0,
      notes: body.notes,
    },
  })
  return NextResponse.json(sale)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  
  const sale = await prisma.sale.findUnique({ where: { id }, include: { invoice: true } })
  if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.sale.delete({ where: { id } })

  if (sale.invoice) {
    const absoluteFilePath = path.join(process.cwd(), 'public', sale.invoice.filePath)
    try { await unlink(absoluteFilePath) } catch (err) {}
    await prisma.invoice.delete({ where: { id: sale.invoice.id } }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
