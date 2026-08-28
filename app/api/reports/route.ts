import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const clientId = session?.user?.role === 'admin' ? searchParams.get('clientId') : session?.user?.clientId
  const period = searchParams.get('period') ?? 'weekly'
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const store = searchParams.get('store') // 'Herbies Pizza' | 'Tasty Bun' | null = Combined
  const platform = searchParams.get('platform') // 'Uber Eats' | 'Just Eat' | 'Deliveroo' | 'POS' | 'Website' | null = All
  const is2025 = searchParams.get('is2025') === 'true'

  if (!clientId) {
    return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
  }

  // Date range
  const now = new Date()
  let defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (period === 'monthly') defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'all_time') defaultFrom = is2025 ? new Date(2000, 0, 1) : new Date(Date.UTC(2026, 3, 1))
  const defaultTo = new Date()

  const dateFrom = from ? new Date(from) : defaultFrom
  const dateTo = to ? new Date(to) : defaultTo
  if (to && dateTo) {
    dateTo.setUTCHours(23, 59, 59, 999)
  }

  // Build sales where clause
  const salesWhere: any = { clientId, is2025, weekEnd: { gte: dateFrom, lte: dateTo } }
  if (platform) {
    const platforms = platform.split(',').map(p => p.trim()).filter(Boolean)
    const platformConditions = platforms.map(p => {
      if (p === 'Website' || p === 'POS' || p === 'Mobile App' || p === 'In-Store POS') {
        return { OR: [{ platform: { contains: p } }, { platform: 'POS' }, { platform: { contains: 'POS' } }] }
      }
      return { platform: { contains: p } }
    })
    
    if (platformConditions.length === 1) {
      if (platformConditions[0].OR) {
        salesWhere.OR = platformConditions[0].OR
      } else {
        Object.assign(salesWhere, platformConditions[0])
      }
    } else if (platformConditions.length > 1) {
      salesWhere.OR = platformConditions.flatMap(c => c.OR || [c])
    }
  }

  // Sales
  const salesRaw = await prisma.sale.findMany({
    where: salesWhere,
    include: { invoice: true },
    orderBy: { weekStart: 'asc' },
  })

  // Expenses
  const expenses = await prisma.expense.findMany({
    where: { clientId, is2025, date: { gte: dateFrom, lte: dateTo }, period: { not: 'template' } },
    orderBy: { date: 'asc' },
  })

  // Supplier invoices
  const supplierInvoicesRaw = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'supplier', invoiceDate: { gte: dateFrom, lte: dateTo } },
    include: { supplier: { select: { name: true, category: true, franchise: true } } },
    orderBy: { invoiceDate: 'asc' },
  })

  // Stocks
  const stocksRaw = await prisma.stock.findMany({
    where: { clientId, is2025, weekEnd: { gte: dateFrom, lte: dateTo } },
    orderBy: { weekEnd: 'asc' },
  })

  // Staff Wages
  const staffWagesRaw = await prisma.staffWage.findMany({
    where: { clientId, is2025, weekEnd: { gte: dateFrom, lte: dateTo } },
    include: { staff: true },
  })

  // To absolutely prevent double counting, filter out any manual expenses categorized as 'wages' or 'supplier'.
  // The `StaffWage` and `Invoice` (type: supplier) tables are the strict source of truth for these costs.
  const supplierInvoiceIds = new Set(supplierInvoicesRaw.map(i => i.id))
  let filteredExpenses = expenses.filter(e => {
    if (e.invoiceId && supplierInvoiceIds.has(e.invoiceId)) return false;
    if (e.category === 'wages' || e.category === 'supplier') return false;
    return true;
  })

  let supplierInvoices = supplierInvoicesRaw
  let stocks = stocksRaw
  let staffWages = staffWagesRaw
  let sales = salesRaw

  // Apply the Store filter and split Combined items 50/50
  if (store) {
    const isHerbies = store === 'Herbies Pizza'
    
    // Helper to determine what fraction of the cost applies to this store
    const getSplit = (text: string) => {
      const t = (text || '').toLowerCase()
      const matchesHerbies = t.includes('herbies')
      const matchesTasty = t.includes('tasty')
      
      // If explicit, assign 1 or 0
      if (isHerbies && matchesHerbies) return 1
      if (!isHerbies && matchesTasty) return 1
      if (isHerbies && matchesTasty) return 0
      if (!isHerbies && matchesHerbies) return 0
      
      // If implicit or "Combined", split 50/50, UNLESS it's the 2025 Sandbox (which is strictly Herbies Pizza 100%)
      return is2025 ? 1 : 0.5
    }

    filteredExpenses = filteredExpenses.map(e => ({
      ...e,
      amount: e.amount * getSplit(e.store || '')
    })).filter(e => e.amount > 0)

    supplierInvoices = supplierInvoicesRaw.map(i => {
      const supplierFranchise = i.supplier?.franchise || 'Combined'
      let split = 1
      if (supplierFranchise === 'Herbies Pizza') {
        split = isHerbies ? 1 : 0
      } else if (supplierFranchise === 'Tasty Bun') {
        split = !isHerbies ? 1 : 0
      } else {
        split = getSplit(i.platform || '')
      }
      return {
        ...i,
        amount: (i.amount || 0) * split
      }
    }).filter(i => (i.amount || 0) > 0)

    stocks = stocksRaw.map(s => ({
      ...s,
      value: s.value * getSplit(s.franchise || '')
    })).filter(s => s.value > 0)

    // Staff wages are completely for Herbies Pizza (0% for Tasty Bun)
    staffWages = staffWagesRaw.map(w => ({
      ...w,
      amount: w.amount * (isHerbies ? 1 : 0)
    })).filter(w => w.amount > 0)

    sales = salesRaw.map(s => {
      const split = getSplit(`${s.store} ${s.platform}`)
      return {
        ...s,
        grossSales: s.grossSales * split,
        netPaid: s.netPaid * split,
        commission: s.commission * split,
        vat: s.vat * split,
        otherFees: s.otherFees * split,
        adminFee: (s.adminFee || 0) * split,
        refunds: (s.refunds || 0) * split,
        offersOnItems: (s.offersOnItems || 0) * split,
        offerRedemptionFee: (s.offerRedemptionFee || 0) * split,
        totalOrders: Math.round(s.totalOrders * split),
        adSpends: (s.adSpends || 0) * split,
        topRankFee: (s.topRankFee || 0) * split
      }
    }).filter(s => s.grossSales > 0 || s.totalOrders > 0)
  }

  // Aggregate
  const totalGrossSales = sales.reduce((s, r) => s + r.grossSales, 0)
  const totalNetPaid = sales.reduce((s, r) => s + r.netPaid, 0)
  const totalCommission = sales.reduce((s, r) => s + r.commission, 0)
  const totalVat = sales.reduce((s, r) => s + r.vat, 0)
  
  // Aggregate other fees: otherFees + adminFee + offersOnItems + offerRedemptionFee
  const getOtherFees = (r: any) => (r.otherFees || 0) + (r.adminFee || 0) + (r.offersOnItems || 0) + (r.offerRedemptionFee || 0)
  
  const totalOtherFees = sales.reduce((s, r) => s + getOtherFees(r), 0)
  const totalOrders = sales.reduce((s, r) => s + r.totalOrders, 0)
  const totalCashOrders = sales.reduce((s, r) => s + (r.cashOrders || 0), 0)
  const totalRefunds = sales.reduce((s, r) => s + (r.refunds || 0), 0)
  
  // Aggregate marketing/ads: adSpends + topRankFee
  const getAdSpends = (r: any) => (r.adSpends || 0) + (r.topRankFee || 0)
  const totalAdSpends = sales.reduce((s, r: any) => s + getAdSpends(r), 0)

  // Platform breakdown
  const platformBreakdown = sales.reduce((acc, s) => {
    let ocr: any = null
    if (s.invoice?.ocrData) {
      try { ocr = JSON.parse(s.invoice.ocrData) } catch (e) {}
    }

    const isAlreadySplit = s.platform === 'Herbies POS' || s.platform === 'Herbies Web & App' || s.platform === 'Tasty Bun POS' && false; // Future proofing

    if (!isAlreadySplit && ocr && (ocr.website || ocr.consumerApp || ocr.s4dRegister || ocr.andromedaPOS || ocr.androweb || ocr.app)) {
      const isTasty = s.store && s.store.includes('Tasty')
      const storePrefix = isTasty ? 'Tasty Bun' : 'Herbies'
      
      const webAppGross = (ocr.website?.gross || 0) + (ocr.consumerApp?.gross || 0) + (ocr.androweb?.sales || 0) + (ocr.app?.sales || 0)
      const webAppNet = (ocr.website?.net !== undefined ? ocr.website.net : (ocr.website?.gross || 0)) + 
                        (ocr.consumerApp?.net !== undefined ? ocr.consumerApp.net : (ocr.consumerApp?.gross || 0)) +
                        (ocr.androweb?.sales || 0) + (ocr.app?.sales || 0)

      const posGross = (ocr.s4dRegister?.gross || 0) + (ocr.andromedaPOS?.sales || 0)
      const posNet = (ocr.s4dRegister?.net !== undefined ? ocr.s4dRegister.net : (ocr.s4dRegister?.gross || 0)) + (ocr.andromedaPOS?.sales || 0)

      const webAppOrders = (ocr.androweb?.orders || 0) + (ocr.app?.orders || 0)
      const posOrders = (ocr.andromedaPOS?.orders || 0)
      const hasSpecificOrders = (webAppOrders + posOrders) > 0

      const channels = [
        { name: `${storePrefix} Web & App`, gross: webAppGross, net: webAppNet, exactOrders: webAppOrders },
        { name: `${storePrefix} POS`, gross: posGross, net: posNet, exactOrders: posOrders },
      ]

      const totalGross = channels.reduce((sum, c) => sum + c.gross, 0)

      channels.forEach(ch => {
        if (!ch.gross && !ch.net) return
        const p = ch.name
        const ratio = totalGross > 0 ? ch.gross / totalGross : 0
        
        let baseSales = ch.net
        let commission = 0
        let finalNetPaid = baseSales

        if (isTasty) {
          // Tasty Bun: 4.0% commission on Net Sales for Web & App and POS
          commission = baseSales * 0.04
          finalNetPaid = baseSales - commission
        } else {
          // Herbies Pizza: 8.5% commission on Net Sales for Web & App, 0% for POS
          if (p.includes('Web & App') || p.includes('Website') || p.includes('Mobile App')) {
            commission = baseSales * 0.085
            finalNetPaid = baseSales - commission
          } else {
            commission = 0
            finalNetPaid = baseSales
          }
        }

        if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, netPaid: 0, commission: 0, vat: 0, adSpends: 0, otherFees: 0, cashOrders: 0, refunds: 0 }
        acc[p].grossSales += baseSales
        acc[p].netPaid += finalNetPaid
        acc[p].commission += commission
        acc[p].orders += hasSpecificOrders ? ch.exactOrders : Math.round(s.totalOrders * ratio)
        acc[p].vat += s.vat * ratio
        acc[p].cashOrders += (s.cashOrders || 0) * ratio
      })
      return acc
    }

    let p = s.platform || 'Unknown'
    const isTasty = s.store && s.store.includes('Tasty')
    if (isTasty) {
      if (p === 'Website' || p === 'Tasty Bun Website') p = 'Tasty Bun Website'
      else if (p === 'Mobile App' || p === 'Tasty Bun Mobile App') p = 'Tasty Bun Mobile App'
      else if (p === 'POS' || p === 'In-Store POS' || p === 'Tasty Bun POS') p = 'Tasty Bun POS'
    } else {
      if (p === 'Website' || p === 'Mobile App' || p === 'Web & App' || p === 'Herbies Web & App') p = 'Herbies Web & App'
      else if (p === 'POS' || p === 'In-Store POS' || p === 'Herbies POS') p = 'Herbies POS'
    }

    let commission = s.commission
    let finalNetPaid = s.netPaid || s.grossSales

    if (isTasty) {
      if (p.includes('Website') || p.includes('Mobile App') || p.includes('Web & App') || p.includes('POS')) {
        commission = s.grossSales * 0.04
        finalNetPaid = s.grossSales - commission
      }
    } else if (p.includes('Herbies')) {
      if (p.includes('Web & App') || p.includes('Website') || p.includes('Mobile App')) {
        commission = s.grossSales * 0.085
        finalNetPaid = s.grossSales - commission
      } else if (p.includes('POS')) {
        commission = 0
        finalNetPaid = s.grossSales
      }
    }

    if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, netPaid: 0, commission: 0, vat: 0, adSpends: 0, otherFees: 0, cashOrders: 0, refunds: 0 }
    acc[p].grossSales += s.grossSales
    acc[p].netPaid += finalNetPaid
    acc[p].commission += commission
    acc[p].vat += s.vat
    acc[p].orders += s.totalOrders
    acc[p].otherFees += getOtherFees(s)
    acc[p].adSpends += getAdSpends(s)
    acc[p].cashOrders += (s.cashOrders || 0)
    acc[p].refunds += (s.refunds || 0)
    return acc
  }, {} as any)

  // Calculate totals from platformBreakdown so Overview Top KPI Cards and Profit Summary match Platform Table sums 100%
  const totalGrossSalesFromPlatforms = Object.values(platformBreakdown).reduce((s: number, p: any) => s + (p.grossSales || 0), 0)
  const totalNetPaidFromPlatforms = Object.values(platformBreakdown).reduce((s: number, p: any) => s + (p.netPaid || 0), 0)
  const totalCommissionFromPlatforms = Object.values(platformBreakdown).reduce((s: number, p: any) => s + (p.commission || 0), 0)
  const totalVatFromPlatforms = Object.values(platformBreakdown).reduce((s: number, p: any) => s + (p.vat || 0), 0)
  const totalOrdersFromPlatforms = Object.values(platformBreakdown).reduce((s: number, p: any) => s + (p.orders || 0), 0)
  const totalOtherFeesFromPlatforms = Object.values(platformBreakdown).reduce((s: number, p: any) => s + (p.otherFees || 0), 0)
  const totalAdSpendsFromPlatforms = Object.values(platformBreakdown).reduce((s: number, p: any) => s + (p.adSpends || 0), 0)

  const effectiveGrossSales = totalGrossSalesFromPlatforms > 0 ? totalGrossSalesFromPlatforms : totalGrossSales
  const effectiveNetPaid = totalNetPaidFromPlatforms > 0 ? totalNetPaidFromPlatforms : totalNetPaid
  const effectiveCommission = totalCommissionFromPlatforms > 0 ? totalCommissionFromPlatforms : totalCommission
  const effectiveVat = totalVatFromPlatforms > 0 ? totalVatFromPlatforms : totalVat
  const effectiveOrders = totalOrdersFromPlatforms > 0 ? totalOrdersFromPlatforms : totalOrders
  const effectiveOtherFees = totalOtherFeesFromPlatforms
  const effectiveAdSpends = totalAdSpendsFromPlatforms

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

  const netProfit = effectiveNetPaid - totalExpenses - totalSupplierCost
  const profitMargin = effectiveGrossSales > 0 ? (netProfit / effectiveGrossSales) : 0

  return NextResponse.json({
    period, dateFrom, dateTo,
    sales: {
      totalGrossSales: effectiveGrossSales, 
      totalNetPaid: effectiveNetPaid, 
      totalCommission: effectiveCommission,
      totalVat: effectiveVat, 
      totalOtherFees: effectiveOtherFees, 
      totalOrders: effectiveOrders, 
      totalAdSpends: effectiveAdSpends,
      totalCashOrders, totalRefunds,
      avgOrderValue: effectiveOrders > 0 ? effectiveGrossSales / effectiveOrders : 0,
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
