'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { gbp, fmtDate } from '@/lib/utils'
import { exportToPDF } from '@/lib/pdfExport'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

export function HungryBirdsExpensesDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState(defaultDateFilter())
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  const [totals, setTotals]           = useState({ utilities:0, other:0, wages:0, suppliers:0, marketing:0, grandTotal:0 })
  const [showAutoFill, setShowAutoFill] = useState(false)
  const [autoFillDate, setAutoFillDate] = useState(new Date().toISOString().split('T')[0])
  const [autoFilling, setAutoFilling] = useState(false)
  const [wageItems, setWageItems]     = useState<any[]>([])
  const [supplierItems, setSupplierItems] = useState<any[]>([])
  const [utilityItems, setUtilityItems]   = useState<any[]>([])
  const [otherItems, setOtherItems]       = useState<any[]>([])
  const [marketingItems, setMarketingItems] = useState<any[]>([])

  const toggleCard = (card: string) => setExpandedCards(prev => ({ ...prev, [card]: !prev[card] }))

  const fetchData = useCallback(async () => {
    if (!session) return
    setLoading(true)
    
    const clientId = session.user.role === 'admin' ? 'client-1' : session.user.clientId
    
    const params = new URLSearchParams()
    if (clientId) params.set('clientId', clientId)
    if (filter.from) params.set('from', filter.from)
    if (filter.to)   params.set('to',   filter.to)
    params.set('period', 'weekly')

    try {
      const [expRes, wagesRes, invRes, supRes] = await Promise.all([
        fetch(`/api/expenses?${params}`).then(r => r.json()),
        fetch(`/api/staff/wages?${params}`).then(r => r.json()),
        fetch(`/api/invoices?${params}`).then(r => r.json()),
        fetch(`/api/suppliers?clientId=${clientId || ''}`).then(r => r.json()),
      ])

      const expenses  = Array.isArray(expRes)   ? expRes   : []
      const wages     = Array.isArray(wagesRes)  ? wagesRes : []
      const invoices  = Array.isArray(invRes)    ? invRes   : []
      const suppliers = Array.isArray(supRes)    ? supRes   : []
      const supplierMap = new Map(suppliers.map((s: any) => [s.id, s]))

      const utils: any[] = [], others: any[] = [], marketing: any[] = []
      let utilSum = 0, otherSum = 0, marketingSum = 0
      
      expenses.forEach((e: any) => {
        const isUtil = ['electricity','gas','water','internet','bin','utilities'].includes(e.category)
        const isMarketing = ['social_media', 'facebook_ads', 'google_ads', 'newspaper_ads', 'print_material', 'marketing_misc'].includes(e.category)
        if (isUtil) { utilSum += e.amount; utils.push(e) }
        else if (isMarketing) { marketingSum += e.amount; marketing.push(e) }
        else { otherSum += e.amount; others.push(e) }
      })

      let wageSum = 0
      wages.forEach((w: any) => { wageSum += w.amount })

      let supSum = 0
      const filteredInv = invoices
        .filter((i: any) => i.type === 'supplier')
        .map((i: any) => {
          const s = supplierMap.get(i.supplierId)
          if (!s) return null
          supSum += (i.amount || 0)
          return { ...i, supplierName: s.name, category: s.category, displayAmount: (i.amount || 0) }
        }).filter(Boolean)

      setTotals({ utilities:utilSum, other:otherSum, wages:wageSum, suppliers:supSum, marketing:marketingSum, grandTotal:utilSum+otherSum+wageSum+supSum+marketingSum })
      setWageItems(wages)
      setSupplierItems(filteredInv)
      setUtilityItems(utils)
      setOtherItems(others)
      setMarketingItems(marketing)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [session, filter])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAutoFill() {
    setAutoFilling(true)
    const res = await fetch('/api/expenses/auto-fill-hungry-birds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: autoFillDate })
    })
    setAutoFilling(false)
    setShowAutoFill(false)
    if (res.ok) {
      alert('Successfully generated all fixed weekly expenses for the selected week!')
      fetchData()
    } else {
      const data = await res.json()
      alert('Error: ' + data.error)
    }
  }

  return (
    <div id="expenses-export-area" className="space-y-6">

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Expenses Summary</h1>
          <p className="text-slate-400 text-sm mt-1">Full breakdown of all outgoing cash</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setShowAutoFill(true)} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:opacity-90 transition print:hidden">
            ⚡ Auto-Fill Weekly Fixed Expenses
          </button>
          <div className="flex items-center gap-3 bg-[#111520] border border-[#1f2947] rounded-xl px-3 py-1.5 print:hidden">
            <DateFilter filter={filter} setFilter={setFilter} />
            <div className="w-[1px] h-4 bg-[#1f2947]" />
            <button onClick={() => setFilter(defaultDateFilter())} className="text-slate-400 hover:text-white text-xs px-2 py-1 font-semibold transition">Reset</button>
            <div className="w-[1px] h-4 bg-[#1f2947]" />
            <div data-html2canvas-ignore="true">
              <button onClick={() => exportToPDF('expenses-export-area', 'Expenses Report')} className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 font-semibold transition flex items-center gap-1">
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
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 opacity-50" />
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 z-10">Total Outgoing</div>
            <div className="text-6xl font-black text-white z-10 drop-shadow-md">{gbp(totals.grandTotal)}</div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500" />
          </div>

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
              </div>
              {wageItems.length === 0
                ? <p className="text-slate-600 text-xs italic">No wage records for this period</p>
                : <p className="text-slate-400 text-xs italic">Total wages paid across all staff.</p>
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
                      <span className="text-sm font-bold text-cyan-400">{gbp(e.displayAmount)}</span>
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
                      <span className="text-sm font-bold text-emerald-400">{gbp(e.displayAmount)}</span>
                    </li>
                  ))}
                </ul>
                )
              }
            </div>

          </div>
        </div>
      )}

      {/* Auto-Fill Modal */}
      {showAutoFill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Auto-Fill Fixed Expenses</h2>
            <p className="text-sm text-slate-400 mb-6">Select a date within the week you want to generate all fixed wages, supplier costs, rent, utilities, and marketing expenses for.</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Target Date (Will snap to Week Ending Sunday)</label>
              <input type="date" value={autoFillDate} onChange={e => setAutoFillDate(e.target.value)}
                className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" />
            </div>

            <div className="mb-6 bg-[#161b2c] rounded-xl p-4 max-h-48 overflow-y-auto border border-[#1f2947] text-xs space-y-4">
              <div>
                <div className="font-bold text-slate-300 mb-2">👥 Wages (£1,300.00)</div>
                <ul className="text-slate-500 list-disc ml-5 space-y-1">
                  <li>Staff 1 (£200)</li>
                  <li>Staff 2 (£200)</li>
                  <li>Chef (£400)</li>
                  <li>Owner (£500)</li>
                </ul>
              </div>
              <div>
                <div className="font-bold text-slate-300 mb-2">📦 Suppliers (£1,475.00)</div>
                <ul className="text-slate-500 list-disc ml-5 space-y-1">
                  <li>Express Foods (£450)</li>
                  <li>Wington (£325)</li>
                  <li>Elc (£200)</li>
                  <li>NB Foods (£350)</li>
                  <li>Fairwise (£75)</li>
                  <li>Macros (£75)</li>
                </ul>
              </div>
              <div>
                <div className="font-bold text-slate-300 mb-2">⚡ Utilities & Other (£858.98)</div>
                <ul className="text-slate-500 list-disc ml-5 space-y-1">
                  <li>Rent (£325.00)</li>
                  <li>Fuel (£150.00)</li>
                  <li>Elec/Gas/Water (£150.00)</li>
                  <li>Bin (£27.75)</li>
                  <li>Internet (£17.00)</li>
                  <li>Social Media (£25.00)</li>
                  <li>Website (£19.23)</li>
                </ul>
              </div>
              <div>
                <div className="font-bold text-emerald-400 mb-2">💵 Walk-in Cash Sales (+£500.00)</div>
                <ul className="text-slate-500 list-disc ml-5 space-y-1">
                  <li>Fixed Weekly Cash Sales (+£500.00)</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setShowAutoFill(false)} className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button onClick={handleAutoFill} disabled={autoFilling} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition">
                {autoFilling ? 'Generating…' : 'Generate All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
