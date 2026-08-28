// @ts-nocheck
'use client'
import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
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

function SalesContent() {
  const { data: session } = useSession()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState({ platform: '', ...defaultDateFilter() })
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Convert old lowercase tabs to properly cased store names for backward compatibility
  const getInitialTab = () => {
    return 'Combined'
  }
  
  const [activeTab, setActiveTab] = useState(getInitialTab())

  useEffect(() => {
    setActiveTab(getInitialTab())
  }, [searchParams])

  const TABS = [
    { id: 'Combined', label: 'Weekly Overview' },
  ]

  const fetchSales = useCallback(async (currentClientId: string, currentFilter: any, currentTab: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('clientId', currentClientId)
    if (currentFilter.platform) params.set('platform', currentFilter.platform)
    
    // activeTab is exactly the store name in DB (e.g. "Combined")
    params.set('store', currentTab)
    
    if (currentFilter.from) params.set('from', currentFilter.from)
    if (currentFilter.to) params.set('to', currentFilter.to)
    
    try {
      const res = await fetch(`/api/sales?${params}`)
      const data = await res.json()
      setSales(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to fetch sales", err)
      setSales([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { 
    const currentClientId = session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId;
    if (currentClientId) {
      fetchSales(currentClientId, filter, activeTab) 
    }
  }, [session?.user?.role, session?.user?.clientId, filter.platform, filter.from, filter.to, activeTab, fetchSales])

  const filteredSales = sales.filter(s => {
    return s.store === 'Combined'
  })

  // Auto-calc commission + net when gross changes
  function handleGrossChange(val: string) {
    const gross = parseFloat(val) || 0
    const platform = form.platform
    // Default commission rates
    const rates: Record<string, number> = { just_eat: 0.135, uber_eats: 0.30, deliveroo: 0.14, walk_in: 0, cash: 0 }
    const commRate = rates[platform] ?? 0
    const commission = gross * commRate
    const vat = commission * 0.20
    const netPaid = gross - commission - vat
    setForm(f => ({ ...f, grossSales: val, commission: commission.toFixed(2), vat: vat.toFixed(2), netPaid: netPaid.toFixed(2) }))
  }

  async function handleSave() {
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
    if ((session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId)) body.clientId = session.user.clientId

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
    fetchSales(session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId, filter, activeTab)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/pos-report-hb/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Upload successful");
        fetchSales(session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId, filter, activeTab);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  const getAvgDeductionPercent = () => {
    if (totals.gross === 0) return '0%';
    const deductions = totals.gross - totals.net;
    return Math.max(0, (deductions / totals.gross) * 100).toFixed(1) + '%';
  }

  const getRowDeductionPercent = (s: any) => {
    if (!s || s.grossSales === 0) return '0.0%';
    const deductions = s.grossSales - s.netPaid;
    return Math.max(0, (deductions / s.grossSales) * 100).toFixed(1) + '%';
  }

  return (
    <div className="space-y-4">
      {/* Top Header Row: Title on Left, Action Buttons on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Sales</h1>
          <p className="text-slate-400 text-xs font-medium mt-0.5">Weekly platform sales records</p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*,.pdf" 
            onChange={handleFileUpload} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap cursor-pointer"
          >
            {isUploading ? 'Uploading...' : '+ Upload Orders (PDF/Img)'}
          </button>
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
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition whitespace-nowrap cursor-pointer"
          >
            + Add Sales Record
          </button>
        </div>
      </div>

      {/* Filter Toolbar Row (Positioned Cleanly Under Top Header) */}
      <div className="bg-[#111520] border border-[#1f2947] rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/sales')}
            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md cursor-pointer"
          >
            Weekly Overview
          </button>
          <div className="w-[1px] h-4 bg-[#1f2947]"></div>
          <select
            value={filter.platform}
            onChange={e => setFilter(f => ({ ...f, platform: e.target.value }))}
            className="bg-transparent text-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-[#111520] text-white">All Platforms</option>
            <option value="just_eat" className="bg-[#111520] text-white">Just Eat</option>
            <option value="uber_eats" className="bg-[#111520] text-white">Uber Eats</option>
            <option value="deliveroo" className="bg-[#111520] text-white">Deliveroo</option>
            <option value="walk_in_cash" className="bg-[#111520] text-white">Walk-in Cash</option>
            <option value="walk_in_card" className="bg-[#111520] text-white">Walk-in Card</option>
            <option value="pos_sales" className="bg-[#111520] text-white">POS Sales</option>
          </select>
          <div className="w-[1px] h-4 bg-[#1f2947]"></div>
          <DateFilter filter={filter} setFilter={setFilter} />
        </div>

        <button 
          onClick={() => setFilter({ platform: '', ...defaultDateFilter() })} 
          className="text-slate-400 hover:text-white text-xs px-2.5 py-1 font-bold transition bg-[#0e121b] border border-[#1f2947] rounded-lg cursor-pointer"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Orders', value: totals.orders.toString(), icon: '🛒', color: '#fbbf24' },
          { label: 'Gross Sales', value: gbp(totals.gross), icon: '💷', color: '#4f8ef7' },
          { label: 'Total Deductions', value: gbp(totals.gross - totals.net), icon: '📉', color: '#f04060' },
          { label: filter.platform ? `${platformLabel(filter.platform)} Avg Deduction %` : 'Avg Deduction % (All)', value: getAvgDeductionPercent(), icon: '📊', color: '#a78bfa' },
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
                {['Platform', 'Week', 'Orders', 'Gross Sales', 'Commissions', 'Ads / Top Rank', 'Other Deductions', 'Deduction %', 'Net Paid', 'Actions'].map(h => (
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
                      {platformLabel(s.platform)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtDate(s.weekStart)} – {fmtDate(s.weekEnd)}</td>
                  <td className="px-4 py-3 font-semibold text-white">{s.totalOrders}</td>
                  <td className="px-4 py-3 font-semibold text-white">{gbp(s.grossSales)}</td>
                  <td className="px-4 py-3 text-red-400 font-semibold">{gbp(s.commission ?? 0)}</td>
                  <td className="px-4 py-3 text-purple-400 font-semibold">{gbp((s.adSpends ?? 0) + (s.topRankFee ?? 0))}</td>
                  <td className="px-4 py-3 text-red-400 font-semibold">{gbp((s.grossSales - s.netPaid) - (s.commission ?? 0) - ((s.adSpends ?? 0) + (s.topRankFee ?? 0)))}</td>
                  <td className="px-4 py-3 text-slate-300 font-semibold">{getRowDeductionPercent(s)}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{gbp(s.netPaid)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-500/10 transition text-xs">Edit</button>
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
                    <option value="Combined">Weekly Overview</option>
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
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">{f.label}</label>
                    <input type="number" step="0.01" value={(form as any)[f.key]}
                      onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
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

export function HungryBirdsSales() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c14]" />}>
      <SalesContent />
    </Suspense>
  )
}
