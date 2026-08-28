import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { date, overrides, clientId } = body
    
    if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 })

    const targetDate = new Date(date)
    const day = targetDate.getDay() || 7
    const weekStart = new Date(targetDate)
    weekStart.setDate(targetDate.getDate() - day + 1)
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const actualClientId = session.user.role === 'admin' ? clientId : session.user.clientId
    if (!actualClientId) return NextResponse.json({ error: 'Client ID missing' }, { status: 400 })

    // Fetch all active staff members with a fixed weekly wage
    const fixedStaff = await prisma.staff.findMany({
      where: {
        clientId: actualClientId,
        active: true,
        weeklyWage: { not: null }
      }
    })

    if (fixedStaff.length === 0) {
      return NextResponse.json({ error: 'No fixed-wage staff members found.' }, { status: 400 })
    }

    const fixedStaffIds = fixedStaff.map(s => s.id)

    // Guard against duplicates: Check if any of these specific staff members already have a wage logged for this weekEnd
    const existingFills = await prisma.staffWage.findMany({
      where: {
        clientId: actualClientId,
        staffId: { in: fixedStaffIds },
        weekEnd: {
          gte: weekStart,
          lte: weekEnd
        }
      }
    })

    if (existingFills.length > 0) {
      await prisma.staffWage.deleteMany({
        where: { id: { in: existingFills.map(e => e.id) } }
      })
    }

    // Generate the wage records for the selected week
    const newWages = fixedStaff.map(staff => ({
      clientId: actualClientId,
      staffId: staff.id,
      weekEnd: weekEnd, // Store precise weekEnd date
      amount: overrides?.[staff.id] !== undefined ? overrides[staff.id] : staff.weeklyWage,
      store: 'Herbies Pizza' // Assigned to Herbies Pizza as requested
    }))

    await prisma.staffWage.createMany({
      data: newWages
    })

    return NextResponse.json({ message: 'Auto-filled fixed wages successfully', count: newWages.length }, { status: 200 })
  } catch (error: any) {
    console.error('Auto-fill wages error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
