'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { gbp, fmtDate, platformLabel, expenseCategoryLabel } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

const PIE_COLORS = ['#4f8ef7','#7b5cf0','#22d3a5','#f97316','#fbbf24','#f04060','#e879f9','#38bdf8']

export function HenleyReports({ is2025 = false }: { is2025?: boolean }) {
  const { data: session } = useSession()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<'weekly'|'monthly'>('weekly')
  const [filter, setFilter] = useState(defaultDateFilter())
  const reportRef = useRef<HTMLDivElement>(null)

  async function fetchReport() {
    if (!session) return
    setLoading(true)
    const params = new URLSearchParams({ period })
    if (session.user.clientId) params.set('clientId', session.user.clientId)
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    if (is2025) params.set('is2025', 'true')
    const res = await fetch(`/api/reports?${params}`)
    const data = await res.json()
    setReport(data)
    setLoading(false)
  }

  useEffect(() => { if (session) fetchReport() }, [session, period, filter])

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    if (!reportRef.current) return
    const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: '#0a0c14' })
    const img = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width/1.5, canvas.height/1.5] })
    pdf.addImage(img, 'PNG', 0, 0, canvas.width/1.5, canvas.height/1.5)
    pdf.save(`report-${period}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    if (!report) return
    const wb = XLSX.utils.book_new()

    // Sales sheet
    const salesData = report.sales.weekly.map((s: any) => ({
      Platform: platformLabel(s.platform),
      'Week Start': fmtDate(s.weekStart),
      'Week End': fmtDate(s.weekEnd),
      Orders: s.totalOrders,
      'Gross Sales': s.grossSales,
      Commission: s.commission,
      VAT: s.vat,
      'Net Paid': s.netPaid,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), 'Sales')

    // Expenses sheet
    const expData = report.expenses.items.map((e: any) => ({
      Category: expenseCategoryLabel(e.category),
      Subcategory: e.subcategory ?? '',
      Amount: e.amount,
      Period: e.period,
      Date: fmtDate(e.date),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expData), 'Expenses')

    // Summary sheet
    const summary = [
      { Metric: 'Gross Sales', Value: report.sales.totalGrossSales },
      { Metric: 'Net Received', Value: report.sales.totalNetPaid },
      { Metric: 'Commission Paid', Value: report.sales.totalCommission },
      { Metric: 'Total Expenses', Value: report.expenses.total },
      { Metric: 'Supplier Costs', Value: report.suppliers.total },
      { Metric: 'Net Profit', Value: report.profit.net },
      { Metric: 'Profit Margin %', Value: (report.profit.margin * 100).toFixed(1) + '%' },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'P&L Summary')

    XLSX.writeFile(wb, `report-${period}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (loading && !report) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-[#1f2947] border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  const r = report

  // CFO Metric Calculations
  const grossSales = r?.sales?.totalGrossSales || 0
  const wages = r?.expenses?.byCategory?.['wages'] || 0
  const cogs = r?.suppliers?.total || 0
  const laborCostPct = grossSales > 0 ? (wages / grossSales) * 100 : 0
  const foodCostPct = grossSales > 0 ? (cogs / grossSales) * 100 : 0
  const primeCost = wages + cogs
  const primeCostPct = grossSales > 0 ? (primeCost / grossSales) * 100 : 0
  const grossProfit = grossSales - cogs
  const grossProfitPct = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0
  
  const totalCommission = r?.sales?.totalCommission || 0
  const totalVat = r?.sales?.totalVat || 0
  const otherFees = r?.sales?.totalOtherFees || 0
  const operatingExpenses = (r?.expenses?.total || 0) - wages + totalCommission + totalVat + otherFees
  const ebitda = grossSales - cogs - wages - operatingExpenses
  const ebitdaMargin = grossSales > 0 ? (ebitda / grossSales) * 100 : 0

  // Weekly Trend Data
  const weeklyTrendData = (r?.sales?.weekly ?? []).map((week: any) => {
    const ws = new Date(week.weekStart).getTime()
    const we = new Date(week.weekEnd).getTime()
    
    const weekWages = (r?.expenses?.items ?? []).filter((e: any) => e.category === 'wages' && new Date(e.date).getTime() >= ws && new Date(e.date).getTime() <= we).reduce((sum: number, e: any) => sum + e.amount, 0)
    const weekCogs = (r?.suppliers?.items ?? []).filter((s: any) => new Date(s.invoiceDate).getTime() >= ws && new Date(s.invoiceDate).getTime() <= we).reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
    
    return {
      week: new Date(week.weekStart).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }),
      sales: week.grossSales,
      primeCost: weekWages + weekCogs,
    }
  })

  // Platform chart data
  const platData = r ? Object.entries(r.sales?.byPlatform ?? {}).map(([k, v]: any) => ({
    name: platformLabel(k), gross: v.grossSales, net: v.netPaid, commission: v.commission,
  })) : []

  // Expense pie
  const expPie = r ? Object.entries(r.expenses?.byCategory ?? {}).map(([k, v]: any) => ({
    name: expenseCategoryLabel(k), value: v,
  })) : []

  return (
    <div className="space-y-6 pb-10">
      {/* ── Centered Header & Filters ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Top Row: Centered Title & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight">CFO Financial Reports</h1>
          <p className="text-slate-400 text-sm font-medium">Advanced P&L, prime cost ratios, and platform margins</p>
        </div>

        {/* Middle Row: Centered Filter & Action Toolbar */}
        <div className="flex justify-center items-center print:hidden">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-3 flex flex-wrap items-center justify-center gap-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-[#1f2947] p-1 rounded-xl">
              <button 
                onClick={() => setPeriod('weekly')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${period === 'weekly' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                Weekly View
              </button>
              <button 
                onClick={() => setPeriod('monthly')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${period === 'monthly' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                Monthly View
              </button>
            </div>

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <DateFilter filter={filter} setFilter={setFilter} />

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <button 
              onClick={() => setFilter(defaultDateFilter())} 
              className="text-slate-400 hover:text-white hover:bg-[#1f2947]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <button 
              onClick={exportPDF} 
              className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>📄</span> Export PDF
            </button>

            <button 
              onClick={exportExcel} 
              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>📊</span> Export Excel
            </button>
          </div>
        </div>
      </div>

      {r && (
        <div ref={reportRef} className="space-y-6">
          {/* Advanced CFO KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-5 relative overflow-hidden group">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Gross Revenue</div>
              <div className="text-2xl font-black text-blue-400">{gbp(grossSales)}</div>
            </div>
            
            <div className={`bg-[#111520] border rounded-2xl p-5 relative overflow-hidden group ${foodCostPct > 35 ? 'border-red-500/30' : 'border-[#1f2947]'}`}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Food Cost (COGS)</div>
              <div className="text-2xl font-black text-orange-400">{foodCostPct.toFixed(1)}%</div>
              <div className="text-xs text-slate-500 mt-1">{gbp(cogs)}</div>
            </div>

            <div className={`bg-[#111520] border rounded-2xl p-5 relative overflow-hidden group ${laborCostPct > 35 ? 'border-red-500/30' : 'border-[#1f2947]'}`}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Labor Cost</div>
              <div className="text-2xl font-black text-purple-400">{laborCostPct.toFixed(1)}%</div>
              <div className="text-xs text-slate-500 mt-1">{gbp(wages)}</div>
            </div>

            <div className={`bg-[#111520] border rounded-2xl p-5 relative overflow-hidden shadow-lg ${primeCostPct <= 60 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${primeCostPct <= 60 ? 'text-emerald-500' : 'text-red-500'}`}>Prime Cost %</div>
              <div className={`text-2xl font-black ${primeCostPct <= 60 ? 'text-emerald-400' : 'text-red-400'}`}>{primeCostPct.toFixed(1)}%</div>
              <div className="text-xs text-slate-400 mt-1">{gbp(primeCost)} <span className="opacity-70 ml-1">(Target: ~60%)</span></div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden shadow-xl">
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">EBITDA Margin</div>
              <div className="text-2xl font-black text-emerald-400">{ebitdaMargin.toFixed(1)}%</div>
              <div className="text-xs text-slate-400 mt-1">{gbp(ebitda)} Net</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Trend Chart */}
            <div className="bg-[#111520] border border-[#1f2947] rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden z-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] -z-10 rounded-full mix-blend-screen pointer-events-none"></div>
              <h3 className="font-black text-white mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">📈</span>
                Revenue vs Prime Cost Trend
              </h3>
              {weeklyTrendData.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">No sales data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={weeklyTrendData} margin={{ left: -15, top: 5, right: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2947" vertical={false} />
                    <XAxis dataKey="week" tick={{ fill: '#8892b0', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#8892b0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} />
                    <Tooltip contentStyle={{ background: '#161b2c', border: '1px solid #1f2947', borderRadius: 12 }} formatter={(v: any) => `£${Number(v).toFixed(2)}`} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} iconType="circle" />
                    <Line type="monotone" dataKey="sales" name="Gross Sales" stroke="#4f8ef7" strokeWidth={3} dot={{ r: 3, fill: '#4f8ef7' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="primeCost" name="Prime Cost" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Platform comparison */}
            <div className="bg-[#111520] border border-[#1f2947] rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden z-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] -z-10 rounded-full mix-blend-screen pointer-events-none"></div>
              <h3 className="font-black text-white mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs">📊</span>
                Platform Margins
              </h3>
              {platData.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">No sales data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={platData} margin={{ left: -15, top: 5, right: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2947" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#8892b0', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#8892b0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} />
                    <Tooltip contentStyle={{ background: '#161b2c', border: '1px solid #1f2947', borderRadius: 12 }} formatter={(v: any) => `£${Number(v).toFixed(2)}`} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} iconType="circle" />
                    <Bar dataKey="gross" name="Gross Sales" fill="#4f8ef7" radius={[4,4,0,0]} />
                    <Bar dataKey="commission" name="Commission/Fees" fill="#f04060" radius={[4,4,0,0]} />
                    <Bar dataKey="net" name="Net Received" fill="#22d3a5" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* CFO Detailed P&L Statement */}
          <div className="bg-[#111520] border border-[#1f2947] rounded-3xl overflow-hidden shadow-2xl mt-8">
            <div className="px-6 py-5 border-b border-[#1f2947] bg-[#161b2c]/50">
              <h3 className="font-black text-white text-lg">Detailed Profit & Loss Statement</h3>
              <p className="text-xs text-slate-400 mt-1">Full financial breakdown for the selected period</p>
            </div>
            <div className="p-6">
              <div className="space-y-3 text-sm">
                
                {/* Revenue Group */}
                <div className="font-bold text-slate-300 uppercase tracking-wider text-xs border-b border-[#1f2947] pb-2 mb-3">Revenue</div>
                <div className="flex justify-between items-center text-slate-300 pl-4">
                  <span>Platform Sales (Delivery)</span>
                  <span>{gbp(grossSales - (r.sales?.totalCashOrders || 0))}</span>
                </div>
                {/* Could add walk-ins if we had it distinctly tracked, but we show Gross here */}
                <div className="flex justify-between items-center text-white font-bold pl-4 pt-2">
                  <span>Total Gross Revenue</span>
                  <span className="text-blue-400">{gbp(grossSales)}</span>
                </div>

                {/* COGS Group */}
                <div className="font-bold text-slate-300 uppercase tracking-wider text-xs border-b border-[#1f2947] pb-2 mb-3 mt-6">Cost of Goods Sold (COGS)</div>
                <div className="flex justify-between items-center text-slate-300 pl-4">
                  <span>Supplier Purchases (Food, Beverage, Packaging)</span>
                  <span className="text-red-400">-{gbp(cogs)}</span>
                </div>
                <div className="flex justify-between items-center text-white font-bold pl-4 pt-2">
                  <span>Gross Profit</span>
                  <span className="text-emerald-400">{gbp(grossProfit)} <span className="text-xs text-slate-500 font-normal ml-2">({grossProfitPct.toFixed(1)}%)</span></span>
                </div>

                {/* Labor Group */}
                <div className="font-bold text-slate-300 uppercase tracking-wider text-xs border-b border-[#1f2947] pb-2 mb-3 mt-6">Labor</div>
                <div className="flex justify-between items-center text-slate-300 pl-4">
                  <span>Staff Wages & Salaries</span>
                  <span className="text-red-400">-{gbp(wages)}</span>
                </div>
                <div className="flex justify-between items-center text-white font-bold pl-4 pt-2">
                  <span>Prime Cost (COGS + Labor)</span>
                  <span className={primeCostPct <= 60 ? 'text-emerald-400' : 'text-orange-400'}>{gbp(primeCost)} <span className="text-xs text-slate-500 font-normal ml-2">({primeCostPct.toFixed(1)}%)</span></span>
                </div>

                {/* Operating Expenses */}
                <div className="font-bold text-slate-300 uppercase tracking-wider text-xs border-b border-[#1f2947] pb-2 mb-3 mt-6">Operating Expenses</div>
                <div className="flex justify-between items-center text-slate-300 pl-4">
                  <span>Platform Commissions & Fees</span>
                  <span className="text-red-400">-{gbp(totalCommission)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 pl-4 pt-2">
                  <span>Platform Marketing (Ads / Top Rank)</span>
                  <span className="text-red-400">-{gbp(otherFees)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 pl-4 pt-2">
                  <span>VAT on Commissions</span>
                  <span className="text-red-400">-{gbp(totalVat)}</span>
                </div>
                {Object.entries(r?.expenses?.byCategory || {}).map(([k, v]: any) => {
                  if (k === 'wages') return null // Already counted in Labor
                  return (
                    <div key={k} className="flex justify-between items-center text-slate-300 pl-4 pt-2">
                      <span className="capitalize">{k}</span>
                      <span className="text-red-400">-{gbp(v)}</span>
                    </div>
                  )
                })}
                <div className="flex justify-between items-center text-white font-bold pl-4 pt-2">
                  <span>Total Operating Expenses</span>
                  <span className="text-red-400">-{gbp(operatingExpenses)}</span>
                </div>

                {/* Net Income */}
                <div className="font-bold text-slate-300 uppercase tracking-wider text-xs border-b border-[#1f2947] pb-2 mb-3 mt-8">Bottom Line</div>
                <div className="flex justify-between items-center text-white font-black text-xl pl-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 px-4">
                  <span>EBITDA / Net Profit</span>
                  <span className="text-emerald-400">{gbp(ebitda)} <span className="text-sm text-emerald-500 font-bold ml-2">({ebitdaMargin.toFixed(1)}%)</span></span>
                </div>

              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
