import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clientId = searchParams.get('clientId') || session?.user?.clientId || 'client-1'
  const period = searchParams.get('period') ?? 'weekly'
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const platform = searchParams.get('platform')
  const is2025 = searchParams.get('is2025') === 'true'

  if (!clientId) {
    return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
  }

  // Date range
  const now = new Date()
  let defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (period === 'monthly') defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const defaultTo = new Date()
  let dateFrom = from ? new Date(from) : defaultFrom
  let dateTo = to ? new Date(to) : defaultTo

  if (period === 'all_time' || (!from && !to)) {
    dateFrom = is2025 ? new Date(2000, 0, 1) : new Date(2026, 0, 1)
    dateTo = new Date(2099, 11, 31, 23, 59, 59, 999)
  } else if (to && dateTo) {
    dateTo.setUTCHours(23, 59, 59, 999)
  }

  // Build sales where clause
  const salesWhere: any = { clientId, is2025, weekEnd: { gte: dateFrom, lte: dateTo } }
  if (platform) {
    let searchTerm = platform
    if (platform.includes('Card')) searchTerm = 'Card'
    else if (platform.includes('Cash')) searchTerm = 'Cash'
    else if (platform.includes('POS')) searchTerm = 'POS'
    else if (platform.includes('Uber')) searchTerm = 'Uber'
    else if (platform.includes('Just')) searchTerm = 'Just'
    else if (platform.includes('Deliveroo')) searchTerm = 'Deliveroo'

    salesWhere.platform = { contains: searchTerm }
  }

  // Sales
  const sales = await prisma.sale.findMany({
    where: salesWhere,
    orderBy: { weekStart: 'asc' },
  })

  // Expenses (Include manual ones that may have been filtered out before)
  let expensesRaw = await prisma.expense.findMany({
    where: { clientId, is2025, date: { gte: dateFrom, lte: dateTo }, period: { not: 'template' }, store: 'Hungry Birds' },
    orderBy: { date: 'asc' },
  })

  // Supplier invoices
  let supplierInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'supplier', invoiceDate: { gte: dateFrom, lte: dateTo }, supplier: { franchise: 'Hungry Birds' } },
    include: { supplier: { select: { name: true, category: true, franchise: true } } },
    orderBy: { invoiceDate: 'asc' },
  })

  // Stocks
  let stocks = await prisma.stock.findMany({
    where: { clientId, is2025, weekEnd: { gte: dateFrom, lte: dateTo }, franchise: 'Hungry Birds' },
    orderBy: { weekEnd: 'asc' },
  })

  // Staff Wages
  let staffWages = await prisma.staffWage.findMany({
    where: { clientId, is2025, weekEnd: { gte: dateFrom, lte: dateTo }, store: 'Hungry Birds' },
    include: { staff: true },
  })

  // If a specific platform is selected, zero-out restaurant-wide operating costs
  if (platform) {
    expensesRaw = []
    supplierInvoices = []
    stocks = []
    staffWages = []
  }

  // Remove the aggressive filter for manual expenses so they appear on the dashboard
  const supplierInvoiceIds = new Set(supplierInvoices.map(i => i.id))
  let filteredExpenses = expensesRaw.filter(e => {
    // If it's explicitly linked to a supplier invoice, don't double count it
    if (e.invoiceId && supplierInvoiceIds.has(e.invoiceId)) return false;
    return true;
  })

  // Aggregate
  const totalGrossSales = sales.reduce((s, r) => s + r.grossSales, 0)
  const totalNetPaid = sales.reduce((s, r) => s + r.netPaid, 0)
  const totalCommission = sales.reduce((s, r) => s + r.commission, 0)
  const totalVat = sales.reduce((s, r) => s + r.vat, 0)
  
  const getOtherFees = (r: any) => (r.otherFees || 0) + (r.adminFee || 0) + (r.offersOnItems || 0) + (r.offerRedemptionFee || 0)
  const totalOtherFees = sales.reduce((s, r) => s + getOtherFees(r), 0)
  const totalOrders = sales.reduce((s, r) => s + r.totalOrders, 0)
  const totalCashOrders = sales.reduce((s, r) => s + (r.cashOrders || 0), 0)
  const totalRefunds = sales.reduce((s, r) => s + (r.refunds || 0), 0)
  
  const getAdSpends = (r: any) => (r.adSpends || 0) + (r.topRankFee || 0)
  const totalAdSpends = sales.reduce((s, r: any) => s + getAdSpends(r), 0)

  // Platform breakdown
  const platformBreakdown = sales.reduce((acc, s) => {
    const p = s.platform || 'Unknown'
    if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, netPaid: 0, commission: 0, vat: 0, adSpends: 0, otherFees: 0, cashOrders: 0, refunds: 0 }
    acc[p].grossSales += s.grossSales
    acc[p].orders += s.totalOrders
    acc[p].netPaid += s.netPaid
    acc[p].commission += s.commission
    acc[p].vat += s.vat
    acc[p].otherFees += getOtherFees(s)
    acc[p].adSpends += getAdSpends(s)
    acc[p].cashOrders += (s.cashOrders || 0)
    acc[p].refunds += (s.refunds || 0)
    return acc
  }, {} as any)

  const expenseBreakdown: Record<string, number> = {}
  for (const e of filteredExpenses) {
    expenseBreakdown[e.category] = (expenseBreakdown[e.category] ?? 0) + e.amount
  }
  
  const wagesByStaff: Record<string, number> = {}
  const totalWages = staffWages.reduce((s, w) => {
    const name = w.staff?.name || 'Unknown Staff'
    wagesByStaff[name] = (wagesByStaff[name] ?? 0) + w.amount
    return s + w.amount
  }, 0)
  
  expenseBreakdown['wages'] = (expenseBreakdown['wages'] ?? 0) + totalWages
  
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0) + totalWages
  const totalSupplierCost = supplierInvoices.reduce((s, i) => s + (i.amount ?? 0), 0)
  const totalStock = stocks.reduce((s, st) => s + st.value, 0)

  // Monthly Comparison & Cost Drivers Engine (May, June, July)
  const monthDefs = [
    { key: 'May 2026', start: new Date('2026-05-01T00:00:00Z'), end: new Date('2026-05-31T23:59:59Z') },
    { key: 'June 2026', start: new Date('2026-06-01T00:00:00Z'), end: new Date('2026-06-30T23:59:59Z') },
    { key: 'July 2026', start: new Date('2026-07-01T00:00:00Z'), end: new Date('2026-07-31T23:59:59Z') }
  ];

  const monthlyComparison = monthDefs.map(m => {
    const mSales = sales.filter(s => s.weekEnd >= m.start && s.weekEnd <= m.end);
    const gross = mSales.reduce((a, b) => a + b.grossSales, 0);
    const netPaid = mSales.reduce((a, b) => a + b.netPaid, 0);
    const commission = mSales.reduce((a, b) => a + b.commission, 0);
    const orders = mSales.reduce((a, b) => a + b.totalOrders, 0);

    const mSuppliers = supplierInvoices.filter(i => i.invoiceDate && i.invoiceDate >= m.start && i.invoiceDate <= m.end).reduce((a, b) => a + (b.amount || 0), 0);
    const mWages = staffWages.filter(w => w.weekEnd >= m.start && w.weekEnd <= m.end).reduce((a, b) => a + b.amount, 0);
    
    const supIds = new Set(supplierInvoices.map(i => i.id));
    const mOpExp = filteredExpenses.filter(e => e.date >= m.start && e.date <= m.end && (!e.invoiceId || !supIds.has(e.invoiceId)) && e.category !== 'wages' && e.category !== 'supplier').reduce((a, b) => a + b.amount, 0);

    const totalExp = mWages + mSuppliers + mOpExp;
    const netProfitMonth = netPaid - totalExp;

    return {
      month: m.key,
      orders,
      gross,
      netPaid,
      commission,
      wages: mWages,
      suppliers: mSuppliers,
      opExp: mOpExp,
      totalExpenses: totalExp,
      netProfit: netProfitMonth,
      wagesPct: gross > 0 ? (mWages / gross) * 100 : 0,
      suppliersPct: gross > 0 ? (mSuppliers / gross) * 100 : 0,
      commissionPct: gross > 0 ? (commission / gross) * 100 : 0,
      profitMarginPct: gross > 0 ? (netProfitMonth / gross) * 100 : 0
    }
  })

  const netProfit = totalNetPaid - totalExpenses - totalSupplierCost
  const profitMargin = totalGrossSales > 0 ? (netProfit / totalGrossSales) : 0

  return NextResponse.json({
    period, dateFrom, dateTo,
    monthlyComparison,
    sales: {
      totalGrossSales, totalNetPaid, totalCommission,
      totalVat, totalOtherFees, totalOrders, totalAdSpends,
      totalCashOrders, totalRefunds,
      avgOrderValue: totalOrders > 0 ? totalGrossSales / totalOrders : 0,
      byPlatform: platformBreakdown,
      weekly: sales,
    },
    expenses: {
      total: totalExpenses,
      byCategory: expenseBreakdown,
      wagesByStaff: wagesByStaff,
      items: filteredExpenses,
    },
    suppliers: {
      total: totalSupplierCost,
      items: supplierInvoices,
    },
    stocks: {
      total: totalStock,
      items: stocks,
    },
    profit: {
      net: netProfit,
      margin: profitMargin,
    },
  })
}
