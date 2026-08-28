import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const clientId = session.user.role === 'admin' ? searchParams.get('clientId') : session.user.clientId
    const is2025 = searchParams.get('is2025') === 'true'

    if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

    const stocks = await prisma.stock.findMany({
      where: { clientId, is2025 },
      orderBy: { weekEnd: 'desc' },
    })

    return NextResponse.json(stocks)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const clientId = session.user.role === 'admin' ? body.clientId : session.user.clientId

    if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

    const stock = await prisma.stock.create({
      data: {
        clientId,
        weekEnd: new Date(body.weekEnd),
        value: parseFloat(body.value),
        franchise: body.franchise || 'Combined',
        notes: body.notes,
      }
    })

    return NextResponse.json(stock)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
