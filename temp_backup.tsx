'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { gbp, fmtDate } from '@/lib/utils'
import { exportToPDF } from '@/lib/pdfExport'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

const TABS = [
  { id: 'overview',  label: '💸 Expenses Summary',          color: 'blue' },
  { id: 'wages',     label: '👥 Staff Wages',        color: 'purple' },
  { id: 'suppliers', label: '📦 Supplier Purchases', color: 'orange' },
  { id: 'utilities', label: '⚡ Utilities',           color: 'cyan' },
  { id: 'other',     label: '💸 Other Expenses',     color: 'emerald' },
]

const GRAD: Record<string,string> = {
  blue:'from-blue-500 to-indigo-500', purple:'from-purple-500 to-violet-500',
  orange:'from-orange-500 to-red-500', cyan:'from-cyan-500 to-teal-500',
  emerald:'from-emerald-500 to-green-500',
}
const CLR: Record<string,string> = {
  blue:'text-blue-400', purple:'text-purple-400', orange:'text-orange-400',
  cyan:'text-cyan-400', emerald:'text-emerald-400',
}
const BORDER: Record<string,string> = {
  blue:'border-blue-500/30 bg-blue-500/5', purple:'border-purple-500/30 bg-purple-500/5',
  orange:'border-orange-500/30 bg-orange-500/5', cyan:'border-cyan-500/30 bg-cyan-500/5',
  emerald:'border-emerald-500/30 bg-emerald-500/5',
}

export function HenleyExpensesDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState(defaultDateFilter())
  const [storeFilter, setStoreFilter] = useState('')
  const [activeTab, setActiveTab]   = useState('overview')

  const [totals, setTotals]           = useState({ utilities:0, other:0, wages:0, suppliers:0, marketing:0, grandTotal:0 })
  const [wageItems, setWageItems]     = useState<any[]>([])
  const [supplierItems, setSupplierItems] = useState<any[]>([])
  const [utilityItems, setUtilityItems]   = useState<any[]>([])
  const [otherItems, setOtherItems]       = useState<any[]>([])
  const [marketingItems, setMarketingItems] = useState<any[]>([])

  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const toggleCard = (card: string) => setExpandedCards(prev => ({ ...prev, [card]: !prev[card] }))

  const fetchData = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const params = new URLSearchParams()
    if (session.user.clientId) params.set('clientId', session.user.clientId)
    if (filter.from) params.set('from', filter.from)
    if (filter.to)   params.set('to',   filter.to)
    // fetch all non-template records (backend excludes template by default)

    try {
      const [expRes, wagesRes, invRes, supRes] = await Promise.all([
        fetch(`/api/expenses?${params}`).then(r => r.json()),
        fetch(`/api/staff/wages?${params}`).then(r => r.json()),
        fetch(`/api/invoices?${params}`).then(r => r.json()),
        fetch(`/api/suppliers?clientId=${session.user.clientId || ''}`).then(r => r.json()),
      ])

      const expenses  = Array.isArray(expRes)   ? expRes   : []
      const wages     = Array.isArray(wagesRes)  ? wagesRes : []
      const invoices  = Array.isArray(invRes)    ? invRes   : []
      const suppliers = Array.isArray(supRes)    ? supRes   : []
      const supplierMap = new Map(suppliers.map((s: any) => [s.id, s]))

      const utils: any[] = [], others: any[] = [], marketing: any[] = []
      let utilSum = 0, otherSum = 0, marketingSum = 0
      expenses.forEach((e: any) => {
        let isShared = true

        if (storeFilter && e.store !== storeFilter && e.store !== 'Combined') return

        const isCombined = e.store === 'Combined' || !e.store
        const amount = (isCombined && storeFilter) ? e.amount / 2 : e.amount
        const expObj = { ...e, displayAmount: amount, isSplit: isCombined && !!storeFilter }

        const isUtil = ['electricity','gas','water','internet','bin','utilities'].includes(e.category)
        const isMarketing = ['social_media', 'facebook_ads', 'google_ads', 'newspaper_ads', 'print_material', 'marketing_misc', 'herbies_head_office'].includes(e.category)
        if (isUtil) { utilSum += amount; utils.push(expObj) }
        else if (isMarketing) { marketingSum += amount; marketing.push(expObj) }
        else        { otherSum += amount; others.push(expObj) }
      })

      let wageSum = 0
      const filteredWages = wages.filter((w: any) => {
        if (storeFilter && w.store !== storeFilter && w.store !== 'Combined') return false
        return true
      }).map((w: any) => {
        const isCombined = w.store === 'Combined'
        const amount = (isCombined && storeFilter) ? w.amount / 2 : w.amount
        wageSum += amount
        return { ...w, displayAmount: amount, isSplit: isCombined && !!storeFilter }
      })

      let supSum = 0
      const filteredInv = invoices
        .filter((i: any) => i.type === 'supplier')
        .map((i: any) => {
          const s = supplierMap.get(i.supplierId)
          if (!s) return null
          if (storeFilter && s.franchise !== storeFilter && s.franchise !== 'Combined') return null
          const isCombined = s.franchise === 'Combined'
          const amount = (isCombined && storeFilter) ? (i.amount||0)/2 : (i.amount||0)
          supSum += amount
          return { ...i, supplierName: s.name, category: s.category, displayAmount: amount, isSplit: isCombined && !!storeFilter }
        }).filter(Boolean)

      setTotals({ utilities:utilSum, other:otherSum, wages:wageSum, suppliers:supSum, marketing:marketingSum, grandTotal:utilSum+otherSum+wageSum+supSum+marketingSum })
      setWageItems(filteredWages)
      setSupplierItems(filteredInv)
      setUtilityItems(utils)
      setOtherItems(others)
      setMarketingItems(marketing)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [session, filter, storeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const TH = ({ cols }: { cols: string[] }) => (
    <thead><tr className="bg-[#161b2c] border-b border-[#1f2947]">
      {cols.map(h => <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}
    </tr></thead>
  )

  const EmptyRow = ({ cols, msg }: { cols: number; msg: string }) => (
    <tr><td colSpan={cols} className="text-center py-14 text-slate-500">{msg}</td></tr>
  )

  return (
    <div id="expenses-export-area" className="space-y-6">

      {/* ── Centered Header & Filters ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Top Row: Centered Title & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight">Expenses Summary</h1>
          <p className="text-slate-400 text-sm font-medium">Full breakdown of all outgoing cash</p>
        </div>

        {/* Middle Row: Centered Filter Toolbar */}
        <div className="flex justify-center items-center print:hidden">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-3 flex flex-wrap items-center justify-center gap-4 shadow-xl backdrop-blur-md">
            {/* Store toggle */}
            <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-[#1f2947] p-1 rounded-xl">
              <button 
                onClick={() => setStoreFilter('')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === '' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                Combined
              </button>
              <button 
                onClick={() => setStoreFilter('Herbies Pizza')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === 'Herbies Pizza' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                Herbies Pizza
              </button>
              <button 
                onClick={() => setStoreFilter('Tasty Bun')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === 'Tasty Bun' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                Tasty Bun
              </button>
            </div>

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            {/* Date Filter */}
            <DateFilter filter={filter} setFilter={setFilter} />

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            {/* Reset Button */}
            <button 
              onClick={() => { setFilter(defaultDateFilter()); setStoreFilter(''); }} 
              className="text-slate-400 hover:text-white hover:bg-[#1f2947]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            {/* Export PDF Button */}
            <div data-html2canvas-ignore="true">
              <button 
                onClick={() => exportToPDF('expenses-export-area', `Henley_Expenses_${storeFilter || 'Combined'}`)}
                className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>📄</span> Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-[#1f2947] border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Total Outgoing Banner ──────────────────────── */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 opacity-50" />
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 z-10">Total Outgoing</div>
            <div className="text-6xl font-black text-white z-10 drop-shadow-md">{gbp(totals.grandTotal)}</div>
            {storeFilter && <div className="mt-3 inline-flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-1.5 rounded-full text-xs font-bold z-10">½ split applied for shared {storeFilter} expenses</div>}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500" />
          </div>

          {/* ── OVERVIEW CARDS ─────────────────────────────── */}
          {(
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Staff Wages Card */}
              <div className="bg-[#111520] border border-[#1f2947] hover:border-purple-500/30 rounded-2xl p-6 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-xl">👥</div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Wages</div>
                      <div className="text-2xl font-black text-purple-400">{gbp(totals.wages)}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleCard('wages')} className="text-[11px] text-purple-400 hover:text-purple-300 font-bold transition">{expandedCards['wages'] ? 'Collapse ↑' : 'Expand ↓'}</button>
                </div>
                {wageItems.length === 0
                  ? <p className="text-slate-600 text-xs italic">No wage records for this period</p>
                  : expandedCards['wages'] && (
                    <ul className="space-y-2">
                    {Object.values(wageItems.reduce((acc: any, w: any) => {
                      const name = w.staff?.name || 'Unknown'
                      if (!acc[name]) acc[name] = { name, displayAmount: 0 }
                      acc[name].displayAmount += w.displayAmount
                      return acc
                    }, {})).map((w: any, i) => (
                      <li key={i} className="flex items-center justify-between py-1.5 border-b border-[#1f2947] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                          <span className="text-sm text-slate-300 font-medium">{w.name}</span>
                        </div>
                        <span className="text-sm font-bold text-purple-400">{gbp(w.displayAmount)}</span>
                      </li>
                    ))}
                  </ul>
                  )
                }
              </div>

              {/* Supplier Purchases Card */}
              <div className="bg-[#111520] border border-[#1f2947] hover:border-orange-500/30 rounded-2xl p-6 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-xl">📦</div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier Purchases</div>
                      <div className="text-2xl font-black text-orange-400">{gbp(totals.suppliers)}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleCard('suppliers')} className="text-[11px] text-orange-400 hover:text-orange-300 font-bold transition">{expandedCards['suppliers'] ? 'Collapse ↑' : 'Expand ↓'}</button>
                </div>
                {supplierItems.length === 0
                  ? <p className="text-slate-600 text-xs italic">No supplier invoices for this period</p>
                  : expandedCards['suppliers'] && (
                    <ul className="space-y-2">
                    {Object.values(supplierItems.reduce((acc: any, inv: any) => {
                      const name = inv?.supplierName || 'Unknown'
                      if (!acc[name]) acc[name] = { name, displayAmount: 0, category: inv.category }
                      acc[name].displayAmount += (inv?.displayAmount || 0)
                      return acc
                    }, {})).map((inv: any, i) => (
                      <li key={i} className="flex items-center justify-between py-1.5 border-b border-[#1f2947] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                          <span className="text-sm text-slate-300 font-medium">{inv.name}</span>
                          {inv.category && <span className="text-[10px] bg-orange-500/10 border border-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold">{inv.category}</span>}
                        </div>
                        <span className="text-sm font-bold text-orange-400">{gbp(inv.displayAmount)}</span>
                      </li>
                    ))}
                  </ul>
                  )
                }
              </div>

              {/* Utilities Card */}
              <div className="bg-[#111520] border border-[#1f2947] hover:border-cyan-500/30 rounded-2xl p-6 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-xl">⚡</div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilities</div>
                      <div className="text-2xl font-black text-cyan-400">{gbp(totals.utilities)}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleCard('utilities')} className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold transition">{expandedCards['utilities'] ? 'Collapse ↑' : 'Expand ↓'}</button>
                </div>
                {utilityItems.length === 0
                  ? <p className="text-slate-600 text-xs italic">No utility records for this period</p>
                  : expandedCards['utilities'] && (
                    <ul className="space-y-2">
                    {Object.values(utilityItems.reduce((acc: any, e: any) => {
                      const name = e.subcategory || e.category || 'Utility'
                      if (!acc[name]) acc[name] = { name, displayAmount: 0 }
                      acc[name].displayAmount += (e.displayAmount || e.amount || 0)
                      return acc
                    }, {})).map((e: any, i) => (
                      <li key={i} className="flex items-center justify-between py-1.5 border-b border-[#1f2947] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                          <span className="text-sm text-slate-300 font-medium capitalize">{e.name}</span>
                        </div>
                        <span className="text-sm font-bold text-cyan-400">
                          {gbp(e.displayAmount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  )
                }
              </div>

              {/* Marketing Card */}
              <div className="bg-[#111520] border border-[#1f2947] hover:border-pink-500/30 rounded-2xl p-6 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-xl">📱</div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marketing</div>
                      <div className="text-2xl font-black text-pink-400">{gbp(totals.marketing)}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleCard('marketing')} className="text-[11px] text-pink-400 hover:text-pink-300 font-bold transition">{expandedCards['marketing'] ? 'Collapse ↑' : 'Expand ↓'}</button>
                </div>
                {marketingItems.length === 0
                  ? <p className="text-slate-600 text-xs italic">No marketing expenses for this period</p>
                  : expandedCards['marketing'] && (
                    <ul className="space-y-2">
                    {Object.values(marketingItems.reduce((acc: any, e: any) => {
                      const name = e.subcategory || e.category || 'Marketing'
                      if (!acc[name]) acc[name] = { name, displayAmount: 0 }
                      acc[name].displayAmount += (e.displayAmount || e.amount || 0)
                      return acc
                    }, {})).map((e: any, i) => (
                      <li key={i} className="flex items-center justify-between py-1.5 border-b border-[#1f2947] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0" />
                          <span className="text-sm text-slate-300 font-medium capitalize">{e.name}</span>
                        </div>
                        <span className="text-sm font-bold text-pink-400">
                          {gbp(e.displayAmount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  )
                }
              </div>

              {/* Other Expenses Card */}
              <div className="bg-[#111520] border border-[#1f2947] hover:border-emerald-500/30 rounded-2xl p-6 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-xl">💸</div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Other Expenses</div>
                      <div className="text-2xl font-black text-emerald-400">{gbp(totals.other)}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleCard('other')} className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold transition">{expandedCards['other'] ? 'Collapse ↑' : 'Expand ↓'}</button>
                </div>
                {otherItems.length === 0
                  ? <p className="text-slate-600 text-xs italic">No other expenses for this period</p>
                  : expandedCards['other'] && (
                    <ul className="space-y-2">
                    {Object.values(otherItems.reduce((acc: any, e: any) => {
                      const name = e.subcategory || e.notes || e.category || 'Other'
                      if (!acc[name]) acc[name] = { name, displayAmount: 0 }
                      acc[name].displayAmount += (e.displayAmount || e.amount || 0)
                      return acc
                    }, {})).map((e: any, i) => (
                      <li key={i} className="flex items-center justify-between py-1.5 border-b border-[#1f2947] last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span className="text-sm text-slate-300 font-medium">{e.name}</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">
                          {gbp(e.displayAmount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  )
                }
              </div>

            </div>
          )}


        </div>
      )}
    </div>
  )
}
