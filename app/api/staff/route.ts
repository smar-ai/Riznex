import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clientId = session.user.role === 'admin' ? searchParams.get('clientId') : session.user.clientId
  if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

  const staff = await prisma.staff.findMany({
    where: { clientId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(staff)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const clientId = session.user.role === 'admin' ? body.clientId : session.user.clientId

  const staffMember = await prisma.staff.create({
    data: {
      clientId,
      name: body.name,
      role: body.role ?? null,
      hourlyRate: body.hourlyRate ?? null,
      weeklyWage: body.weeklyWage ?? null,
    },
  })
  return NextResponse.json(staffMember, { status: 201 })
}
