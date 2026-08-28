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
  const isAdmin = session?.user?.role === 'admin'
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

  const [showUnifiedAutoFill, setShowUnifiedAutoFill] = useState(false)
  const [unifiedAutoFillDate, setUnifiedAutoFillDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]
  })
  const [isAutoFillingUnified, setIsAutoFillingUnified] = useState(false)

  const handleUnifiedAutoFill = async () => {
    setIsAutoFillingUnified(true)
    try {
      const b1 = JSON.stringify({ date: unifiedAutoFillDate, clientId: session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId, is2025: filter.is2025 === true })
      const res1 = await fetch('/api/expenses/auto-fill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b1 })
      const res2 = await fetch('/api/staff/auto-fill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b1 })
      
      if (res1.ok && res2.ok) {
        alert('Successfully auto-filled ALL fixed wages and expenses for this week!')
        setShowUnifiedAutoFill(false)
        fetchData()
      } else {
        const d1 = await res1.json().catch(()=>({}))
        const d2 = await res2.json().catch(()=>({}))
        alert('Notice: ' + ((d1.error || '') + ' ' + (d2.error || '')).trim() )
        fetchData()
      }
    } catch(e) {
      alert('Error auto-filling')
    }
    setIsAutoFillingUnified(false)
  }
  const toggleCard = (card: string) => setExpandedCards(prev => ({ ...prev, [card]: !prev[card] }))

  const fetchData = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('clientId', session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId)
    if (filter.from) params.set('from', filter.from)
    if (filter.to)   params.set('to',   filter.to)
    // fetch all non-template records (backend excludes template by default)

    try {
      const [expRes, wagesRes, invRes, supRes] = await Promise.all([
        fetch(`/api/expenses?${params}`).then(r => r.json()),
        fetch(`/api/staff/wages?${params}`).then(r => r.json()),
        fetch(`/api/invoices?${params}`).then(r => r.json()),
        fetch(`/api/suppliers?clientId=${session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId}`).then(r => r.json()),
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

            {/* Unified Auto-Fill & Export PDF */}
            <div data-html2canvas-ignore="true" className="flex gap-2">
              <button 
                onClick={() => setShowUnifiedAutoFill(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>⚡</span> Auto-Add All
              </button>
              <button 
                onClick={() => exportToPDF('expenses-export-area', `Henley_Expenses_${storeFilter || 'Combined'}_${filter.to || 'All_Time'}`)}
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

          {/* ── Quick Stats Row ─────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <div className="bg-[#111520] border border-[#1f2947] rounded-xl p-4 flex flex-col justify-center transition-all hover:border-purple-500/30 hover:bg-purple-500/5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Staff Wages</div>
              <div className="text-lg font-black text-purple-400">{gbp(totals.wages)}</div>
            </div>
            <div className="bg-[#111520] border border-[#1f2947] rounded-xl p-4 flex flex-col justify-center transition-all hover:border-orange-500/30 hover:bg-orange-500/5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Suppliers</div>
              <div className="text-lg font-black text-orange-400">{gbp(totals.suppliers)}</div>
            </div>
            <div className="bg-[#111520] border border-[#1f2947] rounded-xl p-4 flex flex-col justify-center transition-all hover:border-cyan-500/30 hover:bg-cyan-500/5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Utilities</div>
              <div className="text-lg font-black text-cyan-400">{gbp(totals.utilities)}</div>
            </div>
            <div className="bg-[#111520] border border-[#1f2947] rounded-xl p-4 flex flex-col justify-center transition-all hover:border-pink-500/30 hover:bg-pink-500/5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Marketing</div>
              <div className="text-lg font-black text-pink-400">{gbp(totals.marketing)}</div>
            </div>
            <div className="bg-[#111520] border border-[#1f2947] rounded-xl p-4 flex flex-col justify-center transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Other</div>
              <div className="text-lg font-black text-emerald-400">{gbp(totals.other)}</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-orange-500 opacity-50" />
              <div className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest mb-1">Total Outgoing</div>
              <div className="text-xl font-black text-white">{gbp(totals.grandTotal)}</div>
            </div>
          </div>
          {storeFilter && <div className="mb-4 inline-flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-1.5 rounded-full text-xs font-bold z-10">½ split applied for shared {storeFilter} expenses</div>}

          {activeTab === 'overview' && (
            <div className="mt-8 bg-[#111520] border border-[#1f2947] rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-[#1f2947] bg-[#161b2c] flex items-center justify-between">
                <h3 className="text-lg font-black text-white">Master Ledger: All Outgoing Cash</h3>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Single Sheet View</div>
              </div>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#161b2c] shadow-md z-10">
                    <tr className="border-b border-[#1f2947]">
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Store</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Name / Category</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...wageItems.map(w => ({ id: w.id, date: w.weekEnd, type: 'Staff Wage', name: w.staff?.name || 'Staff', store: w.store, amount: w.amount, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' })),
                      ...supplierItems.map(s => ({ id: s.id, date: s.invoiceDate, type: 'Supplier', name: s.supplier?.name || 'Unknown', store: s.store || s.supplier?.franchise || 'Combined', amount: s.amount, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' })),
                      ...utilityItems.map(u => ({ id: u.id, date: u.date, type: 'Utility', name: u.subcategory || u.category, store: u.store, amount: u.displayAmount || u.amount, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' })),
                      ...marketingItems.map(m => ({ id: m.id, date: m.date, type: 'Marketing', name: m.subcategory || m.category, store: m.store, amount: m.displayAmount || m.amount, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' })),
                      ...otherItems.map(o => ({ id: o.id, date: o.date, type: 'Other', name: o.subcategory || o.notes || o.category, store: o.store, amount: o.displayAmount || o.amount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }))
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, i) => (
                      <tr key={i} className="border-b border-[#1f2947] hover:bg-[#161b2c] transition-colors">
                        <td className="px-4 py-3 text-slate-300 font-medium">{item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${item.bg} ${item.color}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs font-bold">{item.store || 'Combined'}</td>
                        <td className="px-4 py-3 text-slate-200">{item.name}</td>
                        <td className="px-4 py-3 text-right font-black text-white">{gbp(item.amount)}</td>
                      </tr>
                    ))}
                    {totals.grandTotal === 0 && (
                      <tr><td colSpan={5} className="text-center py-12 text-slate-500">No outgoing cash recorded for this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          )}


        </div>
      )}

      {/* UNIFIED AUTO-FILL MODAL */}
      {showUnifiedAutoFill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">⚡ Auto-Add All Fixed Costs</h2>
            <p className="text-slate-400 text-sm mb-6">Select the Week Ending date to instantly generate <b>all</b> auto-wages and auto-expenses in one click.</p>
            
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Sales Week Ending Date (Sunday)</label>
              <input type="date" value={unifiedAutoFillDate} onChange={e => {
                const d = new Date(e.target.value);
                const day = d.getDay();
                if (day !== 0) d.setDate(d.getDate() + (7 - day));
                setUnifiedAutoFillDate(d.toISOString().split('T')[0]);
              }}
                className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowUnifiedAutoFill(false)}
                className="flex-1 bg-[#161b2c] hover:bg-[#1f2947] text-white rounded-xl py-2.5 text-sm font-bold transition">
                Cancel
              </button>
              <button onClick={handleUnifiedAutoFill} disabled={isAutoFillingUnified}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl py-2.5 text-sm font-bold shadow-lg hover:opacity-90 disabled:opacity-50 transition">
                {isAutoFillingUnified ? 'Generating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
