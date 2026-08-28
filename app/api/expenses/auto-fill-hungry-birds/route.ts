import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getWeekStart, getWeekEnd } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date } = await req.json()
  if (!date) return NextResponse.json({ error: 'Target date is required' }, { status: 400 })

  const clientId = 'client-1' // Hardcoded for Hungry Birds safely

  const targetDate = new Date(date)
  const weekStart = getWeekStart(targetDate)
  const weekEnd = getWeekEnd(weekStart)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  try {
    // We will generate Wages, Expenses, and Invoices (for suppliers)

    // 1. WAGES
    const wagesToAdd = [
      { name: 'Staff 1', amount: 200 },
      { name: 'Staff 2', amount: 200 },
      { name: 'Chef', amount: 400 },
      { name: 'Owner', amount: 500 }
    ]

    for (const w of wagesToAdd) {
      let staff = await prisma.staff.findFirst({
        where: { clientId, name: w.name }
      })
      if (!staff) {
        staff = await prisma.staff.create({
          data: { clientId, name: w.name, role: 'Staff Member', weeklyWage: w.amount, active: true }
        })
      }

      const existingWage = await prisma.staffWage.findFirst({
        where: { staffId: staff.id, weekEnd: weekEnd }
      })

      if (!existingWage) {
        await prisma.staffWage.create({
          data: { clientId, staffId: staff.id, amount: w.amount, weekEnd: weekEnd, store: 'Hungry Birds' }
        })
      }
    }

    // 2. SUPPLIERS (Invoices Table)
    const suppliersToAdd = [
      { name: 'Express Foods', amount: 450, category: 'food' },
      { name: 'Wington', amount: 325, category: 'food' },
      { name: 'Elc', amount: 200, category: 'food' },
      { name: 'NB Foods', amount: 350, category: 'food' },
      { name: 'Fairwise Ltd', amount: 75, category: 'food' },
      { name: 'Macros', amount: 75, category: 'food' }
    ]

    for (const sup of suppliersToAdd) {
      let supplier = await prisma.supplier.findFirst({
        where: { clientId, name: sup.name }
      })
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: { clientId, name: sup.name, category: sup.category, franchise: 'Hungry Birds' }
        })
      }

      const existingInv = await prisma.invoice.findFirst({
        where: { clientId, supplierId: supplier.id, type: 'supplier', invoiceDate: weekEnd }
      })

      if (!existingInv) {
        await prisma.invoice.create({
          data: {
            clientId,
            supplierId: supplier.id,
            type: 'supplier',
            amount: sup.amount,
            invoiceDate: weekEnd,
            fileName: 'Auto-generated fixed expense',
            filePath: 'none',
            fileType: 'auto',
            ocrStatus: 'done'
          }
        })
      }
    }

    // 3. UTILITIES & OTHER EXPENSES
    const expensesToAdd = [
      { category: 'utilities', subcategory: 'Fuel', amount: 150.00 },
      { category: 'utilities', subcategory: 'Electricity, Gas, Water', amount: 150.00 },
      { category: 'rent', subcategory: 'Rent', amount: 325.00 },
      { category: 'utilities', subcategory: 'Bin Collection', amount: 27.75 },
      { category: 'utilities', subcategory: 'Internet', amount: 17.00 },
      { category: 'marketing', subcategory: 'Social Media', amount: 25.00 },
      { category: 'marketing', subcategory: 'Website', amount: 19.23 }
    ]

    for (const e of expensesToAdd) {
      const existingExp = await prisma.expense.findFirst({
        where: { clientId, category: e.category, subcategory: e.subcategory, date: weekEnd }
      })

      if (!existingExp) {
        await prisma.expense.create({
          data: {
            clientId,
            category: e.category,
            subcategory: e.subcategory,
            amount: e.amount,
            date: weekEnd,
            period: 'weekly',
            store: 'Hungry Birds'
          }
        })
      }
    }

    // 4. WALK IN CASH SALES (£500.00)
    const existingSale = await prisma.sale.findFirst({
      where: { clientId, platform: 'Walk In Cash', weekEnd: weekEnd }
    })

    if (!existingSale) {
      await prisma.sale.create({
        data: {
          clientId,
          platform: 'Walk In Cash',
          store: 'Hungry Birds',
          weekStart: weekStart,
          weekEnd: weekEnd,
          grossSales: 500,
          netPaid: 500,
          totalOrders: 25,
          commission: 0,
          vat: 0,
          adminFee: 0,
          topRankFee: 0,
          refunds: 0,
          cashOrders: 500,
          otherFees: 0,
          is2025: false,
          notes: 'Auto-generated fixed weekly Walk-in Cash Sales'
        }
      })
    }

    return NextResponse.json({ success: true, message: 'All fixed expenses and walk-in cash sales added for the week.' })
  } catch (error: any) {
    console.error('Error auto-filling Hungry Birds expenses:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
