import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

function canAccessClient(session: any, clientId: string) {
  if (session.user.role === 'admin') return true
  return session.user.clientId === clientId
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!canAccessClient(session, id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      staff: { where: { active: true } },
      suppliers: { where: { active: true } },
      _count: { select: { sales: true, expenses: true } },
    },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const client = await prisma.client.update({
    where: { id },
    data: {
      name: body.name,
      address: body.address,
      phone: body.phone,
      email: body.email,
      jeCommission: body.jeCommission,
      ueCommission: body.ueCommission,
      delCommission: body.delCommission,
    },
  })
  return NextResponse.json(client)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.client.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
