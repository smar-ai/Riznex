import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { date, clientId } = body
    const is2025 = body.is2025 === true
    
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

    // Fetch all templates for this client
    const templates = await prisma.expense.findMany({
      where: {
        clientId: actualClientId,
        period: 'template'
      }
    })

    if (templates.length === 0) {
      return NextResponse.json({ error: 'No templates found to auto-fill.' }, { status: 400 })
    }

    // Guard against duplicates for the same week
    const existingAutoFills = await prisma.expense.findFirst({
      where: {
        clientId: actualClientId,
        is2025,
        date: { gte: weekStart, lte: weekEnd },
        notes: { contains: 'Auto-filled' }
      }
    })

    if (existingAutoFills) {
      return NextResponse.json({ error: 'You have already auto-filled your fixed costs for this week! If you need to regenerate them, please delete the existing ones first.' }, { status: 400 })
    }

    if (templates.length === 0) {
      return NextResponse.json({ error: 'No templates found to auto-fill.' }, { status: 400 })
    }

    // Smart Routing Engine: Clone templates and split 50/50 if shared (unless in 2025 sandbox)
    const newExpenses = []
    
    for (const t of templates) {
      const isTastyBunOnly = t.store === 'Tasty Bun'
      const isHerbiesOnly = t.store === 'Herbies Pizza'

      if (is2025 && isTastyBunOnly) {
        continue // Skip Tasty Bun expenses entirely in the 2025 sandbox
      }

      if (isTastyBunOnly || isHerbiesOnly) {
        // Dedicated store expense (e.g. Tasty Bun Franchise Fee) - do not split
        newExpenses.push({
          clientId: actualClientId,
          is2025,
          category: t.category,
          subcategory: t.subcategory,
          store: t.store,
          amount: t.amount,
          period: 'weekly',
          date: new Date(date),
          notes: t.notes || 'Auto-filled from template'
        })
      } else {
        if (is2025) {
          // In 2025 sandbox, allocate 100% of shared expenses to Herbies Pizza
          newExpenses.push({
            clientId: actualClientId,
            is2025,
            category: t.category,
            subcategory: `${t.subcategory || ''} - Herbies Pizza`.trim(),
            store: 'Herbies Pizza',
            amount: t.amount,
            period: 'weekly',
            date: new Date(date),
            notes: 'Auto-filled from template (100% Herbies Pizza)'
          })
        } else {
          // Shared expense (e.g. Rent, Petrol) - Split 50/50
          const halfAmount = t.amount / 2
          
          newExpenses.push({
            clientId: actualClientId,
            is2025,
            category: t.category,
            subcategory: `${t.subcategory || ''} - Herbies Pizza`.trim(),
            store: 'Herbies Pizza',
            amount: halfAmount,
            period: 'weekly',
            date: new Date(date),
            notes: 'Auto-filled 50/50 split'
          })
          
          newExpenses.push({
            clientId: actualClientId,
            is2025,
            category: t.category,
            subcategory: `${t.subcategory || ''} - Tasty Bun`.trim(),
            store: 'Tasty Bun',
            amount: halfAmount,
            period: 'weekly',
            date: new Date(date),
            notes: 'Auto-filled 50/50 split'
          })
        }
      }
    }

    const result = await prisma.expense.createMany({
      data: newExpenses
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
