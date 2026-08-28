// @ts-nocheck
'use client'
import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { exportToPDF } from '@/lib/pdfExport'
import { gbp, fmtDate, platformLabel, platformColor, PLATFORMS, fmtDateInput, getWeekStart, getWeekEnd } from '@/lib/utils'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

interface Sale {
  id: string; platform: string; store: string; weekStart: string; weekEnd: string
  totalOrders: number; grossSales: number; commission: number
  vat: number; otherFees: number; netPaid: number; notes?: string
  adSpends?: number; topRankFee?: number; offersOnItems?: number;
}

const EMPTY_FORM = {
  platform: 'just_eat', store: 'Combined', weekStart: fmtDateInput(getWeekStart()),
  weekEnd: fmtDateInput(getWeekEnd(getWeekStart())),
  totalOrders: '', grossSales: '', commission: '', vat: '', otherFees: '', netPaid: '', notes: '',
  adSpends: '', topRankFee: '', offersOnItems: '',
}

function MultiSelectPlatformFilter({
  selected,
  onChange,
  is2025
}: {
  selected: string[]
  onChange: (val: string[]) => void
  is2025: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const options = [
    { value: "Deliveroo", label: "Deliveroo" },
    { value: "Just Eat", label: "Just Eat" },
    { value: "Uber Eats", label: "Uber Eats" },
    { value: "Herbies Website", label: "Herbies Website" },
    ...(!is2025 ? [{ value: "Tasty Bun Website", label: "Tasty Bun Website" }] : []),
    { value: "Herbies Mobile App", label: "Herbies Mobile App" },
    ...(!is2025 ? [{ value: "Tasty Bun Mobile App", label: "Tasty Bun Mobile App" }] : []),
    { value: "POS", label: "In-Store POS" },
  ]

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const getLabel = () => {
    if (selected.length === 0) return "All Platforms"
    if (selected.length === 1) {
      const opt = options.find(o => o.value === selected[0])
      return opt ? opt.label : selected[0]
    }
    if (selected.length <= 2) {
      return selected.map(val => options.find(o => o.value === val)?.label || val).join(", ")
    }
    return `${selected.length} Selected`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 text-white bg-transparent px-3 py-1 text-sm font-semibold rounded-lg hover:bg-[#1c2238] transition focus:outline-none"
      >
        <span>{getLabel()}</span>
        <span className="text-[9px] text-slate-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-[#111520] border border-[#1f2947] rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange([]); setIsOpen(false); }}
            className="text-left text-xs text-blue-400 hover:text-blue-300 font-bold px-2 py-1.5 rounded hover:bg-[#161b2c] transition"
          >
            Clear All (All Platforms)
          </button>
          <div className="h-[1px] bg-[#1f2947] my-1" />
          {options.map(opt => {
            const isChecked = selected.includes(opt.value)
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#161b2c] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer select-none transition"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(opt.value)}
                  className="rounded border-[#1f2947] bg-[#161b2c] text-blue-500 cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SalesContent({ is2025 }: { is2025?: boolean }) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const clientStores = is2025 ? ['Herbies Pizza'] : ['Herbies Pizza', 'Tasty Bun']
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState({ platform: '', ...defaultDateFilter() })
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Convert old lowercase tabs to properly cased store names for backward compatibility
  const getInitialTab = () => {
    const tab = searchParams.get('tab')
    if (tab === 'combined') return 'Combined'
    if (tab === 'monthly_combined') return 'Monthly Combined'
    if (tab === 'herbies') return 'Herbies Pizza'
    if (tab === 'monthly_herbies') return 'Monthly Herbies Pizza'
    if (tab === 'tasty') return 'Tasty Bun'
    if (tab === 'monthly_tasty') return 'Monthly Tasty Bun'
    return tab || 'Combined'
  }
  
  const [activeTab, setActiveTab] = useState(getInitialTab())

  useEffect(() => {
    setActiveTab(getInitialTab())
  }, [searchParams])

  const TABS = [
    { id: 'Combined', label: 'Combined (Weekly)' },
    { id: 'Herbies Pizza', label: 'Herbies Pizza (Weekly)' },
    { id: 'Tasty Bun', label: 'Tasty Bun (Weekly)' },
    { id: 'Monthly Combined', label: 'Monthly Combined' },
    { id: 'Monthly Herbies Pizza', label: 'Monthly Herbies Pizza' },
    { id: 'Monthly Tasty Bun', label: 'Monthly Tasty Bun' },
  ]
  
  const fetchSales = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    const clientId = session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId
    if (clientId) params.set('clientId', clientId)
    if (filter.platform) params.set('platform', filter.platform)
    
    // activeTab is now exactly the store name in DB (e.g. "Combined", "Monthly Herbies Pizza")
    params.set('store', activeTab)
    
    if (is2025) params.set('is2025', 'true')
    
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    const res = await fetch(`/api/sales?${params}`)
    const data = await res.json()
    setSales(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [session, filter, activeTab, is2025])

  useEffect(() => { if (session) fetchSales() }, [session, fetchSales])

  const filteredSales = sales.filter(s => {
    if (activeTab === 'Combined') return !s.store?.startsWith('Monthly')
    if (activeTab === 'Monthly Combined') return s.store?.startsWith('Monthly')
    
    // activeTab is now exactly the store name in DB (e.g. "Combined", "Monthly Herbies Pizza")
    return s.store === activeTab
  })

  // Auto-calc commission + net when gross changes
  function handleGrossChange(val: string) {
    const gross = parseFloat(val) || 0
    const platform = form.platform
    // Default commission rates
    const rates: Record<string, number> = { just_eat: 0.135, uber_eats: 0.30, deliveroo: 0.14, 'Herbies Pizza Website': 0.085, walk_in: 0, cash: 0 }
    
    // Check if Tasty Bun flat 4% commission applies
    const isTastyBun = platform?.includes('Tasty Bun')
    const commRate = isTastyBun ? 0.04 : (rates[platform] ?? 0)
    
    const commission = gross * commRate
    const vat = commission * 0.20
    const offers = parseFloat(form.offersOnItems as string) || 0
    const ads = parseFloat(form.adSpends as string) || 0
    const topRank = parseFloat(form.topRankFee as string) || 0
    const other = parseFloat(form.otherFees as string) || 0
    
    const netPaid = gross - commission - vat - offers - ads - topRank - other
    setForm(f => ({ 
      ...f, 
      grossSales: val, 
      commission: commission.toFixed(2), 
      vat: vat.toFixed(2), 
      netPaid: netPaid.toFixed(2) 
    }))
  }

  // Auto-recalculate netPaid whenever any input field changes
  function handleFieldChange(key: string, val: string) {
    setForm(f => {
      const updated = { ...f, [key]: val }
      if (key !== 'netPaid') {
        const gross = parseFloat(updated.grossSales as string) || 0
        const commission = parseFloat(updated.commission as string) || 0
        const vat = parseFloat(updated.vat as string) || 0
        const offers = parseFloat(updated.offersOnItems as string) || 0
        const ads = parseFloat(updated.adSpends as string) || 0
        const topRank = parseFloat(updated.topRankFee as string) || 0
        const other = parseFloat(updated.otherFees as string) || 0
        
        const netPaid = gross - commission - vat - offers - ads - topRank - other
        updated.netPaid = netPaid.toFixed(2)
      }
      return updated
    })
  }

  async function handleSave() {
    // Duplicate check (only for new records, not edits)
    if (!editId) {
      const duplicate = sales.find(s =>
        s.platform === form.platform &&
        s.store === form.store &&
        s.weekStart.split('T')[0] === form.weekStart
      )
      if (duplicate) {
        const proceed = confirm(
          `⚠️ Duplicate Warning!\n\nA "${platformLabel(form.platform)}" record for the week starting ${form.weekStart} already exists (${gbp(duplicate.grossSales)} gross sales).\n\nAre you sure you want to add another one?`
        )
        if (!proceed) return
      }
    }
    setSaving(true)
    const body: any = {
      ...form,
      totalOrders: parseInt(form.totalOrders as string) || 0,
      grossSales: parseFloat(form.grossSales as string) || 0,
      commission: parseFloat(form.commission as string) || 0,
      vat: parseFloat(form.vat as string) || 0,
      otherFees: parseFloat(form.otherFees as string) || 0,
      netPaid: parseFloat(form.netPaid as string) || 0,
      adSpends: parseFloat(form.adSpends as string) || 0,
      topRankFee: parseFloat(form.topRankFee as string) || 0,
      offersOnItems: parseFloat(form.offersOnItems as string) || 0,
    }
    const clientId = session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId
    if (clientId) body.clientId = clientId

    const url = editId ? `/api/sales/${editId}` : '/api/sales'
    const method = editId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    fetchSales()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sale record?')) return
    await fetch(`/api/sales/${id}`, { method: 'DELETE' })
    fetchSales()
  }

  function openEdit(s: Sale) {
    setForm({
      platform: s.platform,
      store: s.store || 'Combined',
      weekStart: s.weekStart.split('T')[0],
      weekEnd: s.weekEnd.split('T')[0],
      totalOrders: s.totalOrders.toString(),
      grossSales: s.grossSales.toString(),
      commission: s.commission.toString(),
      vat: s.vat.toString(),
      otherFees: s.otherFees.toString(),
      netPaid: s.netPaid.toString(),
      adSpends: (s.adSpends ?? 0).toString(),
      topRankFee: (s.topRankFee ?? 0).toString(),
      offersOnItems: (s.offersOnItems ?? 0).toString(),
      notes: s.notes ?? '',
    })
    setEditId(s.id)
    setShowForm(true)
  }

  const totals = sales.reduce((a, s) => ({
    orders: a.orders + s.totalOrders,
    gross: a.gross + s.grossSales,
    commission: a.commission + (s.commission || 0),
    vat: a.vat + (s.vat || 0),
    net: a.net + s.netPaid,
  }), { orders: 0, gross: 0, commission: 0, vat: 0, net: 0 })

  const getAvgCommPercent = () => {
    if (totals.gross === 0) return '0%';
    const totalDeductions = totals.gross - totals.net;
    return ((totalDeductions / totals.gross) * 100).toFixed(1) + '%';
  }

  const getRowCommPercent = (s: any) => {
    if (s.grossSales === 0) return '0%';
    const totalDeductions = s.grossSales - s.netPaid;
    return ((totalDeductions / s.grossSales) * 100).toFixed(1) + '%';
  }

  return (
    <div id="sales-export-area" className="space-y-6">
      {/* ── Centered Header & Filters ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Top Row: Centered Title & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight">Sales</h1>
          <p className="text-slate-400 text-sm font-medium">Weekly platform sales records</p>
        </div>

        {/* Middle Row: Centered Filter & Action Toolbar */}
        <div className="flex justify-center items-center print:hidden">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-3 flex flex-wrap items-center justify-center gap-4 shadow-xl backdrop-blur-md">
            {!is2025 && (
              <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-[#1f2947] p-1 rounded-xl">
                <button
                  onClick={() => router.push(`/dashboard/sales?tab=${activeTab.startsWith('Monthly ') ? 'Monthly Combined' : 'Combined'}`)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${(activeTab === 'Combined' || activeTab === 'Monthly Combined') ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  Combined
                </button>
                {clientStores.map(store => (
                  <button
                    key={store}
                    onClick={() => router.push(`/dashboard/sales?tab=${activeTab.startsWith('Monthly ') ? `Monthly ${store}` : store}`)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${(activeTab === store || activeTab === `Monthly ${store}`) ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {store}
                  </button>
                ))}
              </div>
            )}

            {!is2025 && <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>}

            <MultiSelectPlatformFilter
              selected={filter.platform ? filter.platform.split(',') : []}
              onChange={val => setFilter(f => ({ ...f, platform: val.join(',') }))}
              is2025={!!is2025}
            />

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <DateFilter filter={filter} setFilter={setFilter} />

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <button 
              onClick={() => setFilter({ platform: '', ...defaultDateFilter() })} 
              className="text-slate-400 hover:text-white hover:bg-[#1f2947]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <div data-html2canvas-ignore="true">
              <button 
                onClick={() => exportToPDF('sales-export-area', `Henley_Sales_${storeFilter || 'Combined'}_${filter.to || 'All_Time'}`)} 
                className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>📄</span> Export PDF
              </button>
            </div>

            <button
              id="add-sale-btn"
              onClick={() => { 
                setShowForm(true); 
                setEditId(null); 
                setForm({ 
                  ...EMPTY_FORM, 
                  store: activeTab 
                }) 
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> Add Sales Record
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Orders', value: totals.orders.toString(), icon: '🛒', color: '#fbbf24' },
          { label: 'Gross Sales', value: gbp(totals.gross), icon: '💷', color: '#4f8ef7' },
          { label: 'Total Deductions', value: gbp(totals.gross - totals.net), icon: '📉', color: '#f04060' },
          { label: filter.platform ? `${platformLabel(filter.platform)} Avg Ded %` : 'Avg Ded % (All)', value: getAvgCommPercent(), icon: '📊', color: '#a78bfa' },
          { label: 'Net Received', value: gbp(totals.net), icon: '✅', color: '#22d3a5' },
        ].map(c => (
          <div key={c.label} className="bg-[#111520] border border-[#1f2947] rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{c.label}</div>
            <div className="text-xl font-black text-white">{c.value}</div>
          </div>
        ))}
      </div>



      {/* Table */}
      <div className="bg-[#111520] border border-[#1f2947] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#161b2c] border-b border-[#1f2947]">
                {['Platform', 'Week', 'Orders', 'Gross Sales', 'Commissions', 'Ads / Top Rank', 'Other Deductions', 'Ded %', 'Net Paid', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-500">Loading…</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-500">No sales records yet. Add your first record above.</td></tr>
              ) : sales.map(s => (
                <tr key={s.id} className="border-b border-[#1f2947] hover:bg-[#161b2c] transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{ background: `${platformColor(s.platform)}1a`, color: platformColor(s.platform), border: `1px solid ${platformColor(s.platform)}33` }}>
                      {platformLabel(s.platform, s.store)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtDate(s.weekStart)} – {fmtDate(s.weekEnd)}</td>
                  <td className="px-4 py-3 font-semibold text-white">{s.totalOrders}</td>
                  <td className="px-4 py-3 font-semibold text-white">{gbp(s.grossSales)}</td>
                  <td className="px-4 py-3 text-red-400 font-semibold">{gbp(s.commission ?? 0)}</td>
                  <td className="px-4 py-3 text-purple-400 font-semibold">{gbp((s.adSpends ?? 0) + (s.topRankFee ?? 0))}</td>
                  <td className="px-4 py-3 text-red-400 font-semibold">{gbp((s.otherFees || 0) + (s.adminFee || 0) + (s.offersOnItems || 0) + (s.offerRedemptionFee || 0) - (s.refunds || 0))}</td>
                  <td className="px-4 py-3 text-slate-400">{getRowCommPercent(s)}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{gbp(s.netPaid)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-500/10 transition text-xs">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition text-xs">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">{editId ? 'Edit' : 'Add'} Sales Record</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {PLATFORMS.map(p => <option key={p.value} value={p.value} className="bg-[#111520] text-white">{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Store / Tab</label>
                  <select value={form.store} onChange={e => setForm(f => ({ ...f, store: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {!activeTab.startsWith('Monthly') ? (
                      <>
                        <option value="Combined">Combined (Weekly)</option>
                        <option value="Herbies Pizza">Herbies Pizza (Weekly)</option>
                        {!is2025 && <option value="Tasty Bun">Tasty Bun (Weekly)</option>}
                      </>
                    ) : (
                      <>
                        <option value="Monthly Combined">Monthly Combined</option>
                        <option value="Monthly Herbies Pizza">Monthly Herbies Pizza</option>
                        {!is2025 && <option value="Monthly Tasty Bun">Monthly Tasty Bun</option>}
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Total Orders</label>
                  <input type="number" value={form.totalOrders} onChange={e => setForm(f => ({ ...f, totalOrders: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Week Start</label>
                  <input type="date" value={form.weekStart} onChange={e => setForm(f => ({ ...f, weekStart: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Week End</label>
                  <input type="date" value={form.weekEnd} onChange={e => setForm(f => ({ ...f, weekEnd: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Gross Sales (£)</label>
                <input type="number" step="0.01" value={form.grossSales} onChange={e => handleGrossChange(e.target.value)}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder="0.00" />
                <p className="text-[11px] text-slate-500 mt-1">Commission & Net auto-calculated below</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Commission (£)', key: 'commission' },
                  { label: 'Net Paid (£)', key: 'netPaid' },
                  { label: 'Ad Spend (£)', key: 'adSpends' },
                  { label: 'Top Rank Fee (£)', key: 'topRankFee' },
                  { label: 'Cash Orders (£)', key: 'cashOrders' },
                  { label: 'Other Deductions (£)', key: 'otherFees' },
                  { label: 'Refunds (£)', key: 'refunds' },
                  { label: 'Admin Fee (£)', key: 'adminFee' },
                  { label: 'Offers on Items (£)', key: 'offersOnItems' },
                  { label: 'VAT (£)', key: 'vat' },
                ].filter(f => {
                  if (form.platform === 'Just Eat') {
                    return ['commission', 'netPaid', 'adSpends', 'cashOrders', 'otherFees'].includes(f.key)
                  }
                  return true
                }).map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">{f.label}</label>
                    <input type="number" step="0.01" value={(form as any)[f.key]}
                      onChange={e => handleFieldChange(f.key, e.target.value)}
                      className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notes (optional)</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder="Any notes…" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditId(null) }}
                className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold shadow-lg hover:opacity-90 disabled:opacity-50 transition">
                {saving ? 'Saving…' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function HenleySales({ is2025 }: { is2025?: boolean }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c14]" />}>
      <SalesContent is2025={is2025} />
    </Suspense>
  )
}
