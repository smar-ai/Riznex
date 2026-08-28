import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  
  const body = await req.json()
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      category: body.category,
      subcategory: body.subcategory,
      store: body.store,
      amount: body.amount,
      period: body.period,
      date: body.date ? new Date(body.date) : undefined,
      notes: body.notes,
    },
  })
  return NextResponse.json(expense)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  
  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
