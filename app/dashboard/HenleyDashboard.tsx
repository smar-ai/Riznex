'use client'
import { useEffect, useState } from 'react'
import { exportToPDF } from '@/lib/pdfExport'
import { useSession } from 'next-auth/react'
import { gbp } from '@/lib/utils'
import { ExcelStyleReport } from '@/components/ExcelStyleReport'

import DateFilter, { defaultDateFilter } from '@/components/DateFilter'
import MultiPlatformFilter from '@/components/MultiPlatformFilter'

const PLATFORM_LABELS: Record<string, string> = {
  just_eat: 'Just Eat', uber_eats: 'Uber Eats', deliveroo: 'Deliveroo', walk_in: 'Walk-in', cash: 'Cash', mobile_app: 'Mobile App'
}

export function HenleyDashboard({ is2025 = false }: { is2025?: boolean }) {
  const { data: session } = useSession()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(defaultDateFilter())
  const [store, setStore] = useState(is2025 ? 'Herbies Pizza' : '') // '' = Combined, 'Herbies Pizza', 'Tasty Bun'
  const [platform, setPlatform] = useState<string>('') // '' = All Platforms
  const [expandAll, setExpandAll] = useState(true)

  useEffect(() => {
    const loadReport = () => {
      const clientId = session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId
      if (!session) return
      const params = new URLSearchParams()
      if (clientId) params.set('clientId', clientId)
      if (filter.from) params.set('from', filter.from)
      if (filter.to) params.set('to', filter.to)
      if (!filter.from && !filter.to && filter.preset === 'all_time') {
        params.set('period', 'all_time')
      }
      if (store) params.set('store', store)
      if (platform) params.set('platform', platform)
      if (is2025) params.set('is2025', 'true')

      fetch(`/api/reports?${params}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
        .then(r => r.json())
        .then(data => { setReport(data); setLoading(false) })
        .catch(() => setLoading(false))
    }

    loadReport()
    window.addEventListener('focus', loadReport)
    return () => window.removeEventListener('focus', loadReport)
  }, [session, filter, store, platform])

  if (loading && !report) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-[#1f2947] border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
  if (!report) return (
    <div className="flex items-center justify-center h-64 text-slate-500 font-medium">
      Failed to load dashboard data. Please try again.
    </div>
  )

  const r = report
  
  const totalSales = r?.sales?.totalGrossSales ?? 0
  const orders = r?.sales?.totalOrders ?? 0
  const adSpends = r?.sales?.totalAdSpends ?? 0
  const totalCommission = r?.sales?.totalCommission ?? 0
  const totalOtherDeductions = r?.sales?.totalOtherFees ?? 0
  const totalExpenses = r?.expenses?.total ?? 0
  const totalSuppliers = r?.suppliers?.total ?? 0
  const totalStock = r?.stocks?.total ?? 0
  const netProfit = r?.profit?.net ?? 0

  const staffWages = r?.expenses?.byCategory?.['wages'] ?? 0
  const franchiseFees = r?.expenses?.byCategory?.['fees'] ?? 0
  const utilities = (r?.expenses?.byCategory?.['electricity'] ?? 0) + (r?.expenses?.byCategory?.['gas'] ?? 0) + (r?.expenses?.byCategory?.['water'] ?? 0) + (r?.expenses?.byCategory?.['internet'] ?? 0) + (r?.expenses?.byCategory?.['bin'] ?? 0) + (r?.expenses?.byCategory?.['utilities'] ?? 0)
  const marketing = (r?.expenses?.byCategory?.['social_media'] ?? 0) + (r?.expenses?.byCategory?.['facebook_ads'] ?? 0) + (r?.expenses?.byCategory?.['google_ads'] ?? 0) + (r?.expenses?.byCategory?.['newspaper_ads'] ?? 0) + (r?.expenses?.byCategory?.['print_material'] ?? 0) + (r?.expenses?.byCategory?.['marketing_misc'] ?? 0) + (r?.expenses?.byCategory?.['herbies_head_office'] ?? 0)
  const otherExpenses = totalExpenses - staffWages - utilities - franchiseFees - (is2025 ? 0 : marketing)
  const vat = r?.sales?.totalVat ?? 0
  const platformFees = totalCommission

  const platformData = r ? Object.entries(r.sales?.byPlatform ?? {}).map(([k, v]: any) => {
    let name = PLATFORM_LABELS[k] ?? k
    const isTasty = name.includes('Tasty') || (store && store.includes('Tasty'))
    
    if (isTasty) {
      if (name === 'Website') name = 'Tasty Bun Website'
      if (name === 'Mobile App') name = 'Tasty Bun Mobile App'
      if (name === 'POS' || name === 'In-Store POS') name = 'Tasty Bun POS'
    } else {
      if (name === 'Website' || name === 'Mobile App' || name === 'Web & App') name = 'Herbies Web & App'
      if (name === 'POS' || name === 'In-Store POS') name = 'Herbies POS'
    }

    const isDirect = name.includes('Web & App') || name.includes('Website') || name.includes('Mobile App') || name.includes('POS')
    
    let deductions = v.grossSales - v.netPaid
    if (isDirect) {
      if (v.commission > 0) {
        deductions = v.commission
      } else if (isTasty) {
        deductions = v.grossSales * 0.04
      } else if (name.includes('Web & App') || name.includes('Website') || name.includes('Mobile App')) {
        deductions = v.grossSales * 0.085
      } else {
        deductions = 0
      }
    }
    
    const net = v.netPaid

    return {
      name, 
      sales: v.grossSales, 
      orders: v.orders,
      deductions, 
      net,
    }
  }) : []

  const CHANNEL_ORDER = [
    'Deliveroo',
    'Just Eat',
    'Uber Eats',
    'Herbies POS',
    'Herbies Web & App',
    'Tasty Bun POS',
    'Tasty Bun Web & App',
    'Tasty Bun Website',
    'Tasty Bun Mobile App',
  ]

  platformData.sort((a: any, b: any) => {
    const idxA = CHANNEL_ORDER.indexOf(a.name)
    const idxB = CHANNEL_ORDER.indexOf(b.name)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.name.localeCompare(b.name)
  })

  const supplierData = Object.values((r?.suppliers?.items || []).reduce((acc: any, inv: any) => {
    const name = inv.supplier?.name || 'Unknown Supplier'
    if (!acc[name]) acc[name] = { name, category: inv.supplier?.category || 'General', amount: 0 }
    acc[name].amount += inv.amount || 0
    return acc
  }, {})).sort((a: any, b: any) => a.name.localeCompare(b.name))

  const getDynamicSubtitle = () => {
    let parts = []
    
    // 1. Store
    if (is2025) {
      parts.push('Tasty Bun')
    } else {
      parts.push(store || 'Combined')
    }

    // 2. Month and Year, 3. Week
    if (filter.preset === 'specific_period' && filter.year !== 'all') {
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      if (filter.month !== 'all') {
        const m = parseInt(filter.month || '0')
        parts.push(`${monthNames[m]} ${filter.year}`)
        
        if (filter.week !== 'all') {
          // Calculate the week string
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
    return parts.join(' | ')
  }

  const getExportFilename = () => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const storeLabel = store ? store.replace(/\s+/g, '_') : 'Combined'
    
    let datePart = 'All_Time'
    if (filter.preset === 'specific_period' && filter.year !== 'all') {
      if (filter.month !== 'all') {
        const m = parseInt(filter.month || '0')
        datePart = `${monthNames[m]}_${filter.year}`
        if (filter.week !== 'all') {
          datePart += `_Week_${filter.week}_Ending_${filter.to}`
        }
      } else {
        datePart = `Year_${filter.year}`
      }
    } else if (filter.preset === 'this_month') {
      datePart = 'This_Month'
    } else if (filter.preset === 'last_month') {
      datePart = 'Last_Month'
    } else if (filter.preset === 'last_week') {
      datePart = 'Last_Week'
    } else if (filter.preset === 'last_4_weeks') {
      datePart = 'Last_4_Weeks'
    }

    return `Henley_${storeLabel}_${datePart}`
  }

  return (
    <div className="space-y-8 pb-10 print-bw-report">
      {/* --- VISUAL DASHBOARD --- */}
      <div id="dashboard-export-area" className="bg-[#0e121b] min-h-screen text-slate-200 p-4 lg:p-8 font-sans flex flex-col gap-8 pb-32">
        {/* Header & Filter Controls Section */}
        <div className="flex flex-col gap-6 relative z-10">
        
        {/* Tier 1: Dynamic Title with Brand Logos on Left & Export Button */}
        <div className="flex justify-between items-center mb-2 relative flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Dynamic Logos on Left Side */}
            <div className="flex items-center gap-2">
              {(store === '' || store === 'Herbies Pizza') && (
                <img
                  src="/logos/herbies-pizza.jpg"
                  alt="Herbies Pizza"
                  className="w-11 h-11 rounded-xl object-cover border border-[#1f2947] shadow-md"
                />
              )}
              {(store === '' || store === 'Tasty Bun') && (
                <img
                  src="/logos/tasty-bun.jpg"
                  alt="Tasty Bun"
                  className="w-11 h-11 rounded-xl object-cover border border-[#1f2947] shadow-md"
                />
              )}
            </div>

            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {session?.user?.clientName ?? 'Henley on Thames'}
              </h1>
              <p className="text-slate-400 mt-1 font-medium">{getDynamicSubtitle()}</p>
            </div>
          </div>

          <div className="print:hidden" data-html2canvas-ignore="true">
            <button onClick={() => exportToPDF('dashboard-export-area', getExportFilename())} className="bg-[#111520] border border-[#1f2947] rounded-xl px-4 py-2.5 text-blue-400 hover:text-blue-300 hover:bg-[#1a2235] text-sm font-bold transition flex items-center gap-2 shadow-lg cursor-pointer">
              <span>📄</span> Export PDF Report
            </button>
          </div>
        </div>

        {/* Tier 2: Unified Executive Filter Toolbar */}
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-4 print:hidden shadow-xl backdrop-blur-md">
          {/* Left Side: Store Pills & Platform Filter */}
          <div className="flex flex-wrap items-center gap-3">
            {!is2025 && (
              <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-[#1f2947] p-1 rounded-xl">
                <button
                  onClick={() => setStore('')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    store === '' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Combined
                </button>
                <button
                  onClick={() => setStore('Herbies Pizza')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    store === 'Herbies Pizza' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Herbies Pizza
                </button>
                <button
                  onClick={() => setStore('Tasty Bun')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    store === 'Tasty Bun' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Tasty Bun
                </button>
              </div>
            )}

            {!is2025 && <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>}

            {/* Multi-Select Platform Checkboxes */}
            <MultiPlatformFilter selectedPlatforms={platform} onChange={setPlatform} />
          </div>

          {/* Right Side: Date Filter & Reset */}
          <div className="flex flex-wrap items-center gap-3">
            <DateFilter filter={filter} setFilter={setFilter} />

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <button 
              onClick={() => { setFilter(defaultDateFilter()); if(!is2025) setStore(''); setPlatform(''); }} 
              className="text-slate-400 hover:text-white hover:bg-[#1f2947]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
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
          <div className="text-3xl font-black text-emerald-400">{gbp(netProfit)}</div>
        </div>
      </div>

      {/* Expense Breakdown Strip — 7 tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Franchise & POS Fees</div>
          <div className="text-base font-black text-indigo-400">{gbp(franchiseFees)}</div>
        </div>
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Utilities</div>
          <div className="text-base font-black text-sky-400">{gbp(utilities)}</div>
        </div>
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wages</div>
          <div className="text-base font-black text-pink-400">{gbp(staffWages)}</div>
        </div>
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supplier Purchases</div>
          <div className="text-base font-black text-amber-400">{gbp(totalSuppliers)}</div>
        </div>
        {!is2025 && (
          <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Marketing</div>
            <div className="text-base font-black text-pink-400">{gbp(marketing)}</div>
          </div>
        )}
        <div className="bg-[#0e1420] border border-[#1f2947] rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Others</div>
          <div className="text-base font-black text-slate-400">{gbp(otherExpenses)}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Total Expenses</div>
          <div className="text-base font-black text-purple-300">{gbp(totalExpenses + totalSuppliers)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profit Summary Section */}
        <div className="bg-[#111520] border border-[#1f2947] rounded-3xl p-8 shadow-2xl lg:col-span-1 flex flex-col relative overflow-hidden z-0">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/10 blur-[80px] -z-10 rounded-full mix-blend-screen pointer-events-none"></div>
          <h2 className="text-xl font-black text-white mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                💰
              </span>
              Profit Summary
            </div>
            <button 
              onClick={() => setExpandAll(!expandAll)} 
              className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              title={expandAll ? "Collapse All" : "Expand All"}
            >
              {expandAll ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              )}
            </button>
          </h2>
          
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-300 font-semibold text-lg">Gross Sales</span>
            <span className="text-blue-400 font-bold text-lg">{gbp(totalSales)}</span>
          </div>

          <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-[#1f2947] pb-2">Less:</div>
          
          <div className="space-y-4 flex-1">
            {/* 1. Commissions */}
            <div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Commissions (3rd Parties)</span>
                <span className="text-red-400 font-medium">-{gbp(totalCommission)}</span>
              </div>
              {expandAll && totalCommission > 0 && r?.sales?.byPlatform && (
                <div className="pl-3 pt-1 space-y-1 mt-1 border-b border-[#1f2947]/50 mb-2">
                  {Object.entries(r.sales.byPlatform)
                    .sort(([aKey], [bKey]) => (PLATFORM_LABELS[aKey] || aKey).localeCompare(PLATFORM_LABELS[bKey] || bKey))
                    .map(([platKey, pData]: [string, any]) => {
                      const deduction = pData.commission ?? 0
                      if (deduction > 0) {
                        return (
                          <div key={platKey} className="flex justify-between items-center text-xs text-slate-500">
                            <span>• {PLATFORM_LABELS[platKey] || platKey}</span>
                            <span>-{gbp(deduction)}</span>
                          </div>
                        )
                      }
                      return null
                  })}
                </div>
              )}
            </div>

            {/* 1.2 Other Deductions */}
            <div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Other Deductions</span>
                <span className="text-red-400 font-medium">-{gbp(totalOtherDeductions)}</span>
              </div>
              {expandAll && totalOtherDeductions > 0 && r?.sales?.byPlatform && (
                <div className="pl-3 pt-1 space-y-1 mt-1 border-b border-[#1f2947]/50 mb-2">
                  {Object.entries(r.sales.byPlatform)
                    .sort(([aKey], [bKey]) => (PLATFORM_LABELS[aKey] || aKey).localeCompare(PLATFORM_LABELS[bKey] || bKey))
                    .map(([platKey, pData]: [string, any]) => {
                      const deduction = pData.otherFees ?? 0
                      if (deduction > 0) {
                        return (
                          <div key={platKey} className="flex justify-between items-center text-xs text-slate-500">
                            <span>• {PLATFORM_LABELS[platKey] || platKey}</span>
                            <span>-{gbp(deduction)}</span>
                          </div>
                        )
                      }
                      return null
                  })}
                </div>
              )}
            </div>



            {/* 1.6 Ad Spends */}
            {!is2025 && (
              <div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">3rd Party Ad Spends</span>
                  <span className="text-red-400 font-medium">-{gbp(adSpends)}</span>
                </div>
                {expandAll && adSpends > 0 && r?.sales?.byPlatform && (
                  <div className="pl-3 pt-1 space-y-1 mt-1 border-b border-[#1f2947]/50 mb-2">
                    {Object.entries(r.sales.byPlatform)
                      .sort(([aKey], [bKey]) => (PLATFORM_LABELS[aKey] || aKey).localeCompare(PLATFORM_LABELS[bKey] || bKey))
                      .map(([platKey, pData]: [string, any]) => {
                        const deduction = pData.adSpends ?? 0
                        if (deduction > 0) {
                          return (
                            <div key={platKey} className="flex justify-between items-center text-xs text-slate-500">
                              <span>• {PLATFORM_LABELS[platKey] || platKey}</span>
                              <span>-{gbp(deduction)}</span>
                            </div>
                          )
                        }
                        return null
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Franchise & POS Fees */}
            <div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Franchise & POS Fees</span>
                <span className="text-red-400 font-medium">-{gbp(franchiseFees)}</span>
              </div>
              {expandAll && franchiseFees > 0 && (
                <div className="pl-3 pt-1 space-y-1 mt-1 border-b border-[#1f2947]/50 mb-2">
                  {Object.entries(
                    (r?.expenses?.items || [])
                      .filter((e: any) => e.category === 'fees')
                      .reduce((acc: any, e: any) => {
                        const name = e.subcategory || 'Fee'
                        acc[name] = (acc[name] || 0) + e.amount
                        return acc
                      }, {})
                  )
                    .sort((a: any, b: any) => a[0].localeCompare(b[0]))
                    .map(([name, amount]: any) => (
                      <div key={name} className="flex justify-between items-center text-xs text-slate-500">
                        <span>• {name}</span>
                        <span>-{gbp(amount)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 3. Marketing */}
            {!is2025 && (
              <div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Marketing</span>
                  <span className="text-red-400 font-medium">-{gbp(marketing)}</span>
                </div>
                {expandAll && marketing > 0 && (
                  <div className="pl-3 pt-1 space-y-1 mt-1 border-b border-[#1f2947]/50 mb-2">
                    {['facebook_ads', 'google_ads', 'marketing_misc', 'newspaper_ads', 'print_material', 'social_media', 'herbies_head_office'].map(cat => {
                      const amt = r?.expenses?.byCategory?.[cat] ?? 0
                      if (amt > 0) {
                        const labels: any = { social_media: 'Social Media Handling Fee', facebook_ads: 'Facebook Ads', google_ads: 'Google Ads', newspaper_ads: 'Newspaper Ads', print_material: 'Print Material', marketing_misc: 'Other Marketing', herbies_head_office: 'Herbies Pizza Head Office Marketing' }
                        return (
                          <div key={cat} className="flex justify-between items-center text-xs text-slate-500">
                            <span>• {labels[cat]}</span>
                            <span>-{gbp(amt)}</span>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. Other Expenses */}
            <div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Other Expenses</span>
                <span className="text-red-400 font-medium">-{gbp(otherExpenses)}</span>
              </div>
              {expandAll && otherExpenses > 0 && (
                <div className="pl-3 pt-1 space-y-1 mt-1 border-b border-[#1f2947]/50 mb-2">
                  {Object.entries(
                    (r?.expenses?.items || [])
                      .filter((e: any) => {
                        const excluded = ['fees', 'wages', 'electricity', 'gas', 'water', 'internet', 'bin', 'utilities']
                        if (!is2025) excluded.push('social_media', 'facebook_ads', 'google_ads', 'newspaper_ads', 'print_material', 'marketing_misc', 'herbies_head_office')
                        return !excluded.includes(e.category)
                      })
                      .reduce((acc: any, e: any) => {
                        const name = e.subcategory || e.category || 'Other'
                        acc[name] = (acc[name] || 0) + e.amount
                        return acc
                      }, {})
                  )
                    .sort((a: any, b: any) => a[0].localeCompare(b[0]))
                    .map(([name, amount]: any) => (
                      <div key={name} className="flex justify-between items-center text-xs text-slate-500">
                        <span>• {name.charAt(0).toUpperCase() + name.slice(1)}</span>
                        <span>-{gbp(amount)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 5. Staff Wages */}
            <div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Staff Wages</span>
                <span className="text-red-400 font-medium">-{gbp(staffWages)}</span>
              </div>
              {expandAll && Object.keys(r?.expenses?.wagesByStaff || {}).length > 0 && (
                <div className="pl-3 pt-1 space-y-1 mt-1 border-b border-[#1f2947]/50 mb-2">
                  {Object.entries(r.expenses.wagesByStaff)
                    .sort(([aName], [bName]: any) => aName.localeCompare(bName))
                    .map(([name, amt]: any) => {
                    if (amt > 0) {
                      return (
                        <div key={name} className="flex justify-between items-center text-xs text-slate-500">
                          <span>• {name}</span>
                          <span>-{gbp(amt)}</span>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              )}
            </div>

            {/* 6. Supplier Purchases */}
            <div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Supplier Purchases</span>
                <span className="text-red-400 font-medium">-{gbp(totalSuppliers)}</span>
              </div>
              {expandAll && supplierData.length > 0 && (
                <div className="pl-3 pt-1 space-y-1 mt-1 border-b border-[#1f2947]/50 mb-2">
                  {supplierData.map((s: any) => (
                    <div key={s.name} className="flex justify-between items-center text-xs text-slate-500">
                      <span>• {s.name}</span>
                      <span>-{gbp(s.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Utilities */}
            <div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Utilities</span>
                <span className="text-red-400 font-medium">-{gbp(utilities)}</span>
              </div>
              {expandAll && utilities > 0 && (
                <div className="pl-3 pt-1 space-y-1 mt-1">
                  {Object.entries(
                    (r?.expenses?.items || [])
                      .filter((e: any) => ['electricity', 'gas', 'water', 'internet', 'bin', 'utilities'].includes(e.category))
                      .reduce((acc: any, e: any) => {
                        const name = e.subcategory || e.category
                        acc[name] = (acc[name] || 0) + e.amount
                        return acc
                      }, {})
                  )
                    .sort((a: any, b: any) => a[0].localeCompare(b[0]))
                    .map(([name, amount]: any) => (
                      <div key={name} className="flex justify-between items-center text-xs text-slate-500">
                        <span>• {name.charAt(0).toUpperCase() + name.slice(1)}</span>
                        <span>-{gbp(amount)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-emerald-500/20 flex justify-between items-center">
            <span className="text-emerald-500 font-black text-xl">= Net Profit</span>
            <span className="text-emerald-400 font-black text-2xl">{gbp(netProfit)}</span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8 flex flex-col">

          {/* Platform Table */}
          <div className="bg-[#111520] border border-[#1f2947] rounded-3xl p-8 shadow-2xl flex-1 flex flex-col relative overflow-hidden z-0">
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-500/10 blur-[100px] -z-10 rounded-full mix-blend-screen pointer-events-none"></div>
            <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-inner">
                📊
              </span>
              Platform Performance
            </h2>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 border-b-2 border-[#1f2947]">
                    <th className="pb-4 font-bold uppercase tracking-wider text-xs">Platform</th>
                    <th className="pb-4 font-bold uppercase tracking-wider text-xs text-right">Orders</th>
                    <th className="pb-4 font-bold uppercase tracking-wider text-xs text-right">Sales</th>
                    <th className="pb-4 font-bold uppercase tracking-wider text-xs text-right">Deductions</th>
                    <th className="pb-4 font-bold uppercase tracking-wider text-xs text-right">Ded. %</th>
                    <th className="pb-4 font-bold uppercase tracking-wider text-xs text-right text-emerald-400">Net Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2947]">
                  {platformData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">No platform data available</td>
                    </tr>
                  ) : (
                    platformData.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="py-4 font-semibold text-white">{p.name}</td>
                        <td className="py-4 text-slate-300 text-right">{p.orders}</td>
                        <td className="py-4 text-blue-400 text-right font-medium">{gbp(p.sales)}</td>
                        <td className="py-4 text-red-400 text-right font-medium">{gbp(p.deductions)}</td>
                        <td className="py-4 text-amber-400 text-right font-medium">
                          {(() => {
                            if (p.sales <= 0) return '0.0%'
                            if (p.name.includes('Herbies') && (p.name.includes('Web & App') || p.name.includes('Website') || p.name.includes('Mobile App'))) return '8.5%'
                            if (p.name.includes('Tasty') && (p.name.includes('Web & App') || p.name.includes('Website') || p.name.includes('Mobile App') || p.name.includes('POS'))) return '4.0%'
                            if (p.name.includes('Herbies POS')) return '0.0%'
                            return ((p.deductions / p.sales) * 100).toFixed(1) + '%'
                          })()}
                        </td>
                        <td className="py-4 text-emerald-400 text-right font-bold">{gbp(p.net)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplier Purchases Table */}
          <div className="bg-[#111520] border border-[#1f2947] rounded-3xl p-8 shadow-2xl flex-1 flex flex-col relative overflow-hidden z-0 mt-8">
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-orange-500/10 blur-[100px] -z-10 rounded-full mix-blend-screen pointer-events-none"></div>
            <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-inner">
                🛒
              </span>
              Supplier Purchases
            </h2>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 border-b-2 border-[#1f2947]">
                    <th className="pb-4 font-bold uppercase tracking-wider text-xs">Supplier</th>
                    <th className="pb-4 font-bold uppercase tracking-wider text-xs">Category</th>
                    <th className="pb-4 font-bold uppercase tracking-wider text-xs text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2947]">
                  {supplierData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">No supplier purchases found</td>
                    </tr>
                  ) : (
                    supplierData.map((s: any, i: number) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="py-4 font-semibold text-white">{s.name}</td>
                        <td className="py-4 text-slate-400 capitalize">{s.category}</td>
                        <td className="py-4 text-orange-400 text-right font-bold">{gbp(s.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* --- END VISUAL DASHBOARD --- */}

      {/* --- PRINT ONLY REPORT --- */}
      <div className="hidden print:block">
        <ExcelStyleReport 
          title={session?.user?.clientName ?? 'Overview'}
          dateRange={is2025 ? '2025 Data Sandbox' : filter.from ? `${filter.from} to ${filter.to || 'Present'}` : 'Year-to-Date 2026'}
          totals={{
            orders,
            grossSales: totalSales,
            netSales: r?.sales?.totalNetPaid ?? 0,
            totalExpenses: totalExpenses + totalSuppliers,
            netProfit
          }}
          platformData={platformData}
          supplierData={supplierData}
          profitSummary={{
            totalCommission,
            adSpends,
            franchiseFees,
            marketing,
            utilities,
            staffWages,
            totalSuppliers,
            otherExpenses
          }}
        />
      </div>
    </div>
  )
}
