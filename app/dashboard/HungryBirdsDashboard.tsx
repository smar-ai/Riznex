'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { gbp } from '@/lib/utils'
import { exportToPDF } from '@/lib/pdfExport'

import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

const PLATFORM_LABELS: Record<string, string> = {
  just_eat: 'Just Eat', uber_eats: 'Uber Eats', deliveroo: 'Deliveroo', walk_in: 'Walk-in', cash: 'Cash', mobile_app: 'Mobile App'
}

export function HungryBirdsDashboard() {
  const { data: session } = useSession()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(defaultDateFilter())
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    const clientId = (session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId)
    if (!session) return
    setLoading(true)
    const params = new URLSearchParams()
    if (clientId) params.set('clientId', clientId)
    if (platform) params.set('platform', platform)
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    if (!filter.from && !filter.to && filter.preset === 'all_time') {
      params.set('period', 'all_time')
    }
    fetch(`/api/reports-hb?${params}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then(r => r.json())
      .then(data => { setReport(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [session, filter, platform])

  if (loading && !report) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-[#1f2947] border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  const r = report
  
  const totalSales = r?.sales?.totalGrossSales ?? 0
  const orders = r?.sales?.totalOrders ?? 0
  const totalCommission = r?.sales?.totalCommission ?? 0
  const totalExpenses = r?.expenses?.total ?? 0
  const totalSuppliers = r?.suppliers?.total ?? 0
  const totalStock = r?.stocks?.total ?? 0
  const netProfit = r?.profit?.net ?? 0

  const staffWages = r?.expenses?.byCategory?.['wages'] ?? 0
  const utilities = (r?.expenses?.byCategory?.['electricity'] ?? 0) + (r?.expenses?.byCategory?.['gas'] ?? 0) + (r?.expenses?.byCategory?.['water'] ?? 0) + (r?.expenses?.byCategory?.['internet'] ?? 0) + (r?.expenses?.byCategory?.['bin'] ?? 0) + (r?.expenses?.byCategory?.['utilities'] ?? 0)
  const otherExpenses = totalExpenses - staffWages - utilities
  const vat = r?.sales?.totalVat ?? 0
  const platformFees = totalCommission - vat
  const adSpends = r?.sales?.totalAdSpends ?? 0

  const platformData = r ? Object.entries(r.sales?.byPlatform ?? {}).map(([k, v]: any) => ({
    name: PLATFORM_LABELS[k] ?? k, 
    sales: v.grossSales, 
    orders: v.orders,
    deductions: v.grossSales - v.netPaid, 
    net: v.netPaid,
  })) : []

  const combinedTotalCost = totalExpenses + totalSuppliers
  const maxSales = Math.max(...platformData.map((p: any) => p.sales), 1)

  const expenseDistributionList = [
    { name: 'Supplier Purchases', amount: totalSuppliers, color: 'bg-amber-500' },
    { name: 'Staff Wages', amount: staffWages, color: 'bg-pink-500' },
    { name: 'Utilities', amount: utilities, color: 'bg-cyan-500' },
    { name: 'Ad Spend', amount: adSpends, color: 'bg-yellow-500' },
    { name: 'Other Expenses', amount: Math.max(0, otherExpenses), color: 'bg-indigo-500' },
  ].filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount)

  // Compute breakdowns for Profit Summary
  const utilitiesBreakdown = (r?.expenses?.items || [])
    .filter((e: any) => ['electricity', 'gas', 'water', 'internet', 'bin', 'utilities'].includes(e.category))
    .reduce((acc: any, e: any) => {
      const name = e.subcategory || e.category || 'Utility'
      acc[name] = (acc[name] || 0) + e.amount
      return acc
    }, {})

  const otherBreakdown = (r?.expenses?.items || [])
    .filter((e: any) => !['electricity', 'gas', 'water', 'internet', 'bin', 'utilities', 'wages', 'supplier'].includes(e.category))
    .reduce((acc: any, e: any) => {
      const name = e.subcategory || e.category || 'Other'
      acc[name] = (acc[name] || 0) + e.amount
      return acc
    }, {})

  const suppliersBreakdown = (r?.suppliers?.items || [])
    .reduce((acc: any, i: any) => {
      const name = i.supplier?.name || 'Unknown'
      acc[name] = (acc[name] || 0) + (i.amount || 0)
      return acc
    }, {})

  const wagesBreakdown = r?.expenses?.wagesByStaff || {}

  const getDynamicSubtitle = () => {
    let parts: string[] = []
    if (filter.preset === 'specific_period' && filter.year !== 'all') {
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      if (filter.month !== 'all') {
        const m = parseInt(filter.month || '0')
        parts.push(`${monthNames[m]} ${filter.year}`)
        if (filter.week !== 'all') {
          const date = new Date(Date.UTC(parseInt(filter.year), m, 1))
          while (date.getUTCDay() !== 0) date.setUTCDate(date.getUTCDate() + 1)
          let weekNum = 1
          while (date.getUTCMonth() === m) {
            if (weekNum.toString() === filter.week) {
              parts.push(`Week ${weekNum} (ending Sun, ${date.getUTCDate()} ${monthNames[m]})`)
              break
            }
            date.setUTCDate(date.getUTCDate() + 7)
            weekNum++
          }
        }
      } else {
        parts.push(`Year ${filter.year}`)
      }
    } else if (filter.preset === 'all_time') {
      parts.push('All Time')
    } else if (filter.preset === 'last_week') {
      parts.push('Last Week')
    } else if (filter.preset === 'last_4_weeks') {
      parts.push('Last 4 Weeks')
    } else if (filter.preset === 'this_month') {
      parts.push('This Month')
    } else if (filter.preset === 'last_month') {
      parts.push('Last Month')
    }
    return parts.join(' | ') || 'All Time'
  }

  const getPdfFilename = () => {
    const clientName = session?.user?.clientName ?? 'Hungry Birds'
    let periodText = 'All Time'
    if (filter.preset === 'specific_period' && filter.year !== 'all') {
      const fullMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
      if (filter.month !== 'all') {
        const m = parseInt(filter.month || '0')
        periodText = `${fullMonthNames[m]} ${filter.year}`
        if (filter.week !== 'all') {
          const date = new Date(Date.UTC(parseInt(filter.year), m, 1))
          while (date.getUTCDay() !== 0) date.setUTCDate(date.getUTCDate() + 1)
          let weekNum = 1
          while (date.getUTCMonth() === m) {
            if (weekNum.toString() === filter.week) {
              periodText = `Week ${weekNum} (ending Sun ${date.getUTCDate()} ${fullMonthNames[m]} ${filter.year})`
              break
            }
            date.setUTCDate(date.getUTCDate() + 7)
            weekNum++
          }
        }
      } else {
        periodText = `Year ${filter.year}`
      }
    } else if (filter.preset === 'all_time') {
      periodText = 'All Time'
    } else if (filter.preset === 'this_month') {
      const fullMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
      const now = new Date()
      periodText = `${fullMonthNames[now.getMonth()]} ${now.getFullYear()}`
    } else if (filter.preset === 'last_week') {
      periodText = 'Last Week'
    } else if (filter.preset === 'last_4_weeks') {
      periodText = 'Last 4 Weeks'
    } else if (filter.preset === 'last_month') {
      periodText = 'Last Month'
    }

    if (platform) {
      periodText += ` - ${platform}`
    }

    return `${clientName} - ${periodText}`
  }

  return (
    <div id="hungry-birds-export-area" className="space-y-8 pb-10">
      {/* Header & Filter Controls Section */}
      <div className="flex flex-col gap-6 relative z-10">
        
        {/* Tier 1: Centered Title & PDF Export Button */}
        <div className="flex justify-center items-start relative">
          <div className="w-full text-center flex flex-col items-center justify-center">
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hungry-birds-logo.jpg" alt="Hungry Birds Logo" className="h-12 w-auto rounded-xl shadow-md border border-[#1f2947] inline-block" />
              <span>{session?.user?.clientName ?? 'Hungry Birds'}</span>
            </h1>
            <p className="text-slate-400 mt-1.5 font-medium">{getDynamicSubtitle()}</p>
          </div>
          <div className="print:hidden absolute top-0 right-0" data-html2canvas-ignore="true">
            <button
              onClick={() => exportToPDF('hungry-birds-export-area', getPdfFilename())}
              className="bg-[#111520] border border-[#1f2947] rounded-xl px-4 py-2 text-blue-400 hover:text-blue-300 hover:bg-[#1a2235] text-sm font-bold transition flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <span>📄</span> Export PDF Report
            </button>
          </div>
        </div>

        {/* Tier 2: Filter Toolbar (Single Brand - No Store Tabs) */}
        <div className="bg-[#111520]/50 border border-[#1f2947] rounded-2xl p-3 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden shadow-lg backdrop-blur-sm">
          {/* Left Side: Platform selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#0e121b] border border-[#1f2947] rounded-xl px-3 py-2 flex gap-2 items-center">
              <div className="text-slate-400 opacity-70 text-sm">📱</div>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-300 outline-none cursor-pointer"
              >
                <option value="" className="bg-[#0e121b]">All Platforms</option>
                <option value="Just Eat" className="bg-[#0e121b]">Just Eat</option>
                <option value="Uber Eats" className="bg-[#0e121b]">Uber Eats</option>
                <option value="Deliveroo" className="bg-[#0e121b]">Deliveroo</option>
                <option value="Walk In Cash" className="bg-[#0e121b]">Walk-in Cash</option>
                <option value="Walk In Card" className="bg-[#0e121b]">Walk-in Card</option>
                <option value="POS Sales" className="bg-[#0e121b]">POS Sales</option>
              </select>
            </div>
          </div>

          {/* Right Side: DateFilter & Reset */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#0e121b] border border-[#1f2947] rounded-xl px-4 py-2 flex gap-2 items-center">
              <div className="text-slate-400 opacity-70 mr-1 text-sm">📅</div>
              <DateFilter filter={filter} setFilter={setFilter} />
            </div>
            
            <button
              onClick={() => { setFilter(defaultDateFilter()); setPlatform(''); }}
              className="bg-[#0e121b] border border-[#1f2947] rounded-xl px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPIs - 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-5 shadow-lg">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Orders</div>
          <div className="text-2xl font-black text-orange-400">{orders}</div>
        </div>
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-5 shadow-lg">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Gross Sales</div>
          <div className="text-2xl font-black text-blue-400">{gbp(totalSales)}</div>
        </div>
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-5 shadow-lg">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Net Sales</div>
          <div className="text-2xl font-black text-cyan-400">{gbp(r?.sales?.totalNetPaid ?? 0)}</div>
        </div>
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-5 shadow-lg">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Expenses</div>
          <div className="text-2xl font-black text-purple-400">{gbp(totalExpenses + totalSuppliers)}</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border border-emerald-500/30 rounded-2xl p-5 shadow-emerald-500/10 shadow-xl">
          <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Net Profit</div>
          <div className={`text-3xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-emerald-400'}`}>{gbp(netProfit)}</div>
        </div>
      </div>

      {/* Expense Breakdown Strip — 7 tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Commissions</div>
          <div className="text-base font-black text-red-400">{gbp(totalCommission)}</div>
        </div>
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ad Spend</div>
          <div className="text-base font-black text-yellow-400">{gbp(adSpends)}</div>
        </div>
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Utilities</div>
          <div className="text-base font-black text-cyan-400">{gbp(utilities)}</div>
        </div>
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wages</div>
          <div className="text-base font-black text-pink-400">{gbp(staffWages)}</div>
        </div>
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supplier Purchases</div>
          <div className="text-base font-black text-amber-400">{gbp(totalSuppliers)}</div>
        </div>
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Others</div>
          <div className="text-base font-black text-indigo-400">{gbp(otherExpenses)}</div>
        </div>
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1 bg-purple-500/10 border-purple-500/20">
          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Total Expenses</div>
          <div className="text-base font-black text-purple-300">{gbp(totalExpenses + totalSuppliers)}</div>
        </div>
      </div>

      {/* Analytics Split: Profit Summary & Platform Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Waterfall Profit Summary */}
        <div className="bg-[#111520] border border-[#1f2947] rounded-3xl p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden z-0">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/10 blur-[100px] -z-10 rounded-full mix-blend-screen pointer-events-none"></div>
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner text-lg">
                💰
              </span>
              Profit Summary
            </h2>
            
            <div className="mb-6 border-b border-[#1f2947] pb-4 flex justify-between items-end">
              <span className="text-slate-300 font-bold text-lg">Gross Sales</span>
              <span className="text-blue-400 font-bold text-2xl">{gbp(totalSales)}</span>
            </div>

            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">LESS:</div>
            <ul className="space-y-3.5 font-normal">
              <li className="text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-200 font-semibold flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    Commission
                  </span>
                  <span className="text-red-400 font-bold text-sm">-{gbp(totalCommission)}</span>
                </div>
                {Object.entries(r?.sales?.byPlatform || {}).some(([_, d]: any) => d.commission > 0) && (
                  <ul className="pl-4 space-y-1 border-l border-[#1f2947]/50 ml-1 my-1">
                    {Object.entries(r?.sales?.byPlatform || {}).map(([name, data]: any) => {
                      if (!data.commission) return null
                      return (
                        <li key={name} className="flex justify-between items-center text-xs text-slate-400">
                          <span>{PLATFORM_LABELS[name] ?? name}</span>
                          <span className="font-medium text-slate-300">-{gbp(data.commission)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>

              <li className="text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-200 font-semibold flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    Ad Spends & Promoted
                  </span>
                  <span className="text-red-400 font-bold text-sm">-{gbp(adSpends)}</span>
                </div>
                {Object.entries(r?.sales?.byPlatform || {}).some(([_, d]: any) => d.adSpends > 0) && (
                  <ul className="pl-4 space-y-1 border-l border-[#1f2947]/50 ml-1 my-1">
                    {Object.entries(r?.sales?.byPlatform || {}).map(([name, data]: any) => {
                      if (!data.adSpends) return null
                      return (
                        <li key={name} className="flex justify-between items-center text-xs text-slate-400">
                          <span>{PLATFORM_LABELS[name] ?? name}</span>
                          <span className="font-medium text-slate-300">-{gbp(data.adSpends)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>

              <li className="text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-200 font-semibold flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                    Other Deductions
                  </span>
                  <span className="text-red-400 font-bold text-sm">-{gbp(vat)}</span>
                </div>
                {Object.entries(r?.sales?.byPlatform || {}).some(([_, d]: any) => (d.grossSales - d.netPaid - d.commission - d.adSpends) > 0) && (
                  <ul className="pl-4 space-y-1 border-l border-[#1f2947]/50 ml-1 my-1">
                    {Object.entries(r?.sales?.byPlatform || {}).map(([name, data]: any) => {
                      const otherDed = data.grossSales - data.netPaid - (data.commission || 0) - (data.adSpends || 0)
                      if (otherDed <= 0) return null
                      return (
                        <li key={name} className="flex justify-between items-center text-xs text-slate-400">
                          <span>{PLATFORM_LABELS[name] ?? name}</span>
                          <span className="font-medium text-slate-300">-{gbp(otherDed)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>

              <li className="text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-200 font-semibold flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Utilities
                  </span>
                  <span className="text-red-400 font-bold text-sm">-{gbp(utilities)}</span>
                </div>
                {Object.keys(utilitiesBreakdown).length > 0 && (
                  <ul className="pl-4 space-y-1 border-l border-[#1f2947]/50 ml-1 my-1">
                    {Object.entries(utilitiesBreakdown).map(([name, amount]: any) => (
                      <li key={name} className="flex justify-between items-center text-xs text-slate-400">
                        <span>{name}</span>
                        <span className="font-medium text-slate-300">-{gbp(amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>

              <li className="text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-200 font-semibold text-sm">Supplier Purchases</span>
                  <span className="text-red-400 font-bold text-sm">-{gbp(totalSuppliers)}</span>
                </div>
                {Object.keys(suppliersBreakdown).length > 0 && (
                  <ul className="pl-4 space-y-1 border-l border-[#1f2947]/50 ml-1 my-1">
                    {Object.entries(suppliersBreakdown).map(([name, amount]: any) => (
                      <li key={name} className="flex justify-between items-center text-xs text-slate-400">
                        <span>{name}</span>
                        <span className="font-medium text-slate-300">-{gbp(amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>

              <li className="text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-200 font-semibold text-sm">Staff Wages</span>
                  <span className="text-red-400 font-bold text-sm">-{gbp(staffWages)}</span>
                </div>
                {Object.keys(wagesBreakdown).length > 0 && (
                  <ul className="pl-4 space-y-1 border-l border-[#1f2947]/50 ml-1 my-1">
                    {Object.entries(wagesBreakdown).map(([name, amount]: any) => (
                      <li key={name} className="flex justify-between items-center text-xs text-slate-400">
                        <span>{name}</span>
                        <span className="font-medium text-slate-300">-{gbp(amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>

              <li className="text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-200 font-semibold text-sm">Other Expenses</span>
                  <span className="text-red-400 font-bold text-sm">-{gbp(otherExpenses)}</span>
                </div>
                {Object.keys(otherBreakdown).length > 0 && (
                  <ul className="pl-4 space-y-1 border-l border-[#1f2947]/50 ml-1 my-1">
                    {Object.entries(otherBreakdown).map(([name, amount]: any) => (
                      <li key={name} className="flex justify-between items-center text-xs text-slate-400">
                        <span>{name}</span>
                        <span className="font-medium text-slate-300">-{gbp(amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-emerald-500/20 flex justify-between items-center">
            <span className="text-emerald-400 font-bold text-xl tracking-tight">= Net Profit</span>
            <span className="text-emerald-400 font-bold text-2xl">{gbp(netProfit)}</span>
          </div>
        </div>

        {/* Right Column (2 cols wide): Platform Performance Table */}
        <div className="lg:col-span-2 bg-[#111520] border border-[#1f2947] rounded-3xl p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden z-0">
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-500/10 blur-[100px] -z-10 rounded-full mix-blend-screen pointer-events-none"></div>
          <div>
            <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-inner text-lg">
                📊
              </span>
              Platform Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 border-b border-[#1f2947]">
                    <th className="pb-3 font-semibold uppercase tracking-wider text-xs">Platform</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-xs text-right">Orders</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-xs text-right">Sales</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-xs text-right">Deductions</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-xs text-right">%</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-xs text-right text-emerald-400">Net Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2947]/50">
                  {platformData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">No platform data available</td>
                    </tr>
                  ) : (
                    platformData.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="py-3.5 font-semibold text-slate-200 text-sm">{p.name}</td>
                        <td className="py-3.5 text-slate-300 text-right font-medium text-sm">{p.orders}</td>
                        <td className="py-3.5 text-blue-400 text-right font-bold text-sm">{gbp(p.sales)}</td>
                        <td className="py-3.5 text-red-400 text-right font-bold text-sm">{gbp(p.deductions)}</td>
                        <td className="py-3.5 text-slate-400 text-right font-medium text-xs">
                          {p.sales > 0 ? ((p.deductions / p.sales) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="py-3.5 text-emerald-400 text-right font-bold text-sm">{gbp(p.net)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Visual Distribution Charts Stacked Vertically under Platform Performance */}
            <div className="mt-8 pt-6 border-t border-[#1f2947] flex flex-col gap-5">
              
              {/* Sales Distribution */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span className="flex items-center gap-2"><span className="text-blue-400">📈</span> Sales Distribution</span>
                  <span className="text-blue-400 font-bold text-xs">{gbp(totalSales)}</span>
                </div>
                <div className="space-y-1.5">
                  {platformData.map((p: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">{p.name}</span>
                        <span className="text-blue-400 font-bold text-xs">{gbp(p.sales)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0e121b] rounded-full overflow-hidden border border-[#1f2947]">
                        <div 
                          style={{ width: `${Math.min(100, Math.max(3, (p.sales / maxSales) * 100))}%` }} 
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expense Distribution */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span className="flex items-center gap-2"><span className="text-purple-400">💸</span> Expense Distribution</span>
                  <span className="text-purple-400 font-bold text-xs">{gbp(combinedTotalCost)}</span>
                </div>
                <div className="space-y-1.5">
                  {expenseDistributionList.map((item: any, idx: number) => {
                    const pct = combinedTotalCost > 0 ? ((item.amount / combinedTotalCost) * 100).toFixed(1) : '0.0'
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">{item.name}</span>
                          <span className="text-slate-200 font-bold text-xs">{pct}% <span className="text-slate-500 font-normal">({gbp(item.amount)})</span></span>
                        </div>
                        <div className="w-full h-1.5 bg-[#0e121b] rounded-full overflow-hidden border border-[#1f2947]">
                          <div 
                            style={{ width: `${combinedTotalCost > 0 ? Math.min(100, Math.max(3, (item.amount / combinedTotalCost) * 100)) : 0}%` }} 
                            className={`h-full ${item.color} rounded-full`}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}