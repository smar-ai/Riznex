import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  
  const body = await req.json()
  
  const data: any = {}
  if (body.staffId) data.staffId = body.staffId
  if (body.amount !== undefined) data.amount = parseFloat(body.amount)
  if (body.weekEnd) data.weekEnd = new Date(body.weekEnd)
  if (body.store) data.store = body.store

  const wage = await prisma.staffWage.update({
    where: { id },
    data,
    include: { staff: true }
  })
  return NextResponse.json(wage)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  
  await prisma.staffWage.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
