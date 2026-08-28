import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const sales = await prisma.sale.findMany({
    where: { clientId: 'cmpv4dvik0000vdj089wl6zmf' },
  })
  const totalAdSpends = sales.reduce((s, r: any) => s + (r.adSpends ?? 0), 0)
  return NextResponse.json({ totalAdSpends, count: sales.length, sample: sales[0] })
}
