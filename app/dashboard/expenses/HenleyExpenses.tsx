// @ts-nocheck
'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { gbp, fmtDate, expenseCategoryLabel, EXPENSE_CATEGORIES, fmtDateInput, getWeekStart, getWeekEnd } from '@/lib/utils'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

interface Expense {
  id: string; category: string; subcategory?: string; store: string;
  amount: number; period: string; date: string; notes?: string
}

const EMPTY_FORM = {
  category: 'wages', subcategory: '', store: 'Combined', amount: '', period: 'weekly',
  date: fmtDateInput(new Date()), notes: '',
}

function snapToSunday(dateStr: string): string {
  if (!dateStr) return dateStr
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  const dateObj = new Date(Date.UTC(y, m, d, 12, 0, 0))
  const day = dateObj.getUTCDay()
  if (day === 0) return dateStr
  const daysToAdd = 7 - day
  dateObj.setUTCDate(dateObj.getUTCDate() + daysToAdd)
  return dateObj.toISOString().slice(0, 10)
}

export function HenleyExpenses({ filterMode, is2025 = false }: { filterMode?: 'utilities' | 'other' | 'marketing' | 'templates', is2025?: boolean }) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAutoFill, setShowAutoFill] = useState(false)
  const [autoFillDate, setAutoFillDate] = useState(snapToSunday(fmtDateInput(new Date())))
  const [autoFilling, setAutoFilling] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ ...EMPTY_FORM, date: snapToSunday(fmtDateInput(new Date())) })
  const [templates, setTemplates] = useState<Expense[]>([])

  const previewExpenses = useMemo(() => {
    if (!templates || templates.length === 0) return []
    const preview = []
    for (const t of templates) {
      const isTastyBunOnly = t.store === 'Tasty Bun'

      if (is2025 && isTastyBunOnly) continue

      if (t.store === 'Combined') {
        preview.push({ id: t.id + '-h', name: `${t.subcategory || t.category} - Herbies Pizza`, amount: t.amount / 2 })
        preview.push({ id: t.id + '-t', name: `${t.subcategory || t.category} - Tasty Bun`, amount: t.amount / 2 })
      } else {
        preview.push({ id: t.id, name: t.subcategory || t.category, amount: t.amount })
      }
    }
    return preview
  }, [templates, is2025])
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState({ category: '', ...defaultDateFilter() })
  const [storeFilter, setStoreFilter] = useState(is2025 ? 'Herbies Pizza' : '')
  const [showUnifiedAutoFill, setShowUnifiedAutoFill] = useState(false)

  const fetchExpenses = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('clientId', session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId)
    if (filter.category) params.set('category', filter.category)
    if (filterMode && filterMode !== 'templates') params.set('filterMode', filterMode)
    if (filterMode === 'templates') params.set('period', 'template')
    // Omitting period parameter makes the backend default to fetching all non-template expenses (both weekly and monthly)
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    if (is2025) params.set('is2025', 'true')
    const res = await fetch(`/api/expenses?${params}`)
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [session, filter, filterMode])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  useEffect(() => {
    if (showAutoFill && templates.length === 0) {
      let url = `/api/expenses?period=template&clientId=${session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId}`
      fetch(url)
        .then(r => r.json())
        .then(data => setTemplates(Array.isArray(data) ? data : []))
    }
  }, [showAutoFill, session, templates.length])

  async function handleAutoFill() {
    setAutoFilling(true)
    const res = await fetch('/api/expenses/auto-fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: autoFillDate, clientId: session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId, is2025 })
    })
    setAutoFilling(false)
    setShowAutoFill(false)
    if (res.ok) {
      alert('Successfully auto-filled fixed weekly costs!')
      fetchExpenses()
    } else {
      const data = await res.json()
      alert('Error: ' + data.error)
    }
  }

  async function handleSave() {
    // Duplicate check (only for new records, not edits)
    if (!editId) {
      const duplicate = expenses.find(e =>
        e.category === form.category &&
        (e.store || 'Combined') === (form.store || 'Combined') &&
        (e.subcategory || '') === (form.subcategory || '') &&
        e.date?.split('T')[0] === form.date
      )
      if (duplicate) {
        const proceed = confirm(
          `⚠️ Duplicate Warning!\n\nAn expense with category "${expenseCategoryLabel(form.category)}"${form.subcategory ? ` / "${form.subcategory}"` : ''} on ${form.date} already exists (£${duplicate.amount.toFixed(2)}).\n\nAre you sure you want to add another one?`
        )
        if (!proceed) return
      }
    }
    setSaving(true)
    const body: any = { ...form, amount: parseFloat(form.amount as string) || 0, is2025 }
    const clientId = session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId
    if (clientId) body.clientId = clientId
    const url = editId ? `/api/expenses/${editId}` : '/api/expenses'
    const method = editId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    fetchExpenses()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    fetchExpenses()
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedIds.size} selected records?`)) return
    
    setLoading(true)
    const ids = Array.from(selectedIds)
    await fetch('/api/expenses/batch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    setSelectedIds(new Set())
    fetchExpenses()
  }

  const filteredExpenses = expenses.filter(e => {
    if (storeFilter && storeFilter !== 'Combined') {
      if (e.store !== storeFilter) return false
    }
    return true
  })

  // Group by category for totals
  const catTotals = {} as Record<string, number>
  if (filterMode === 'utilities') {
    ['electricity', 'gas', 'water', 'internet', 'bin', 'utilities'].forEach(c => catTotals[c] = 0)
  } else if (filterMode === 'other') {
    ['fuel', 'misc', 'tax', 'rent', 'fees'].forEach(c => catTotals[c] = 0)
  } else if (filterMode === 'marketing') {
    ['social_media', 'facebook_ads', 'google_ads', 'newspaper_ads', 'print_material', 'marketing_misc', 'herbies_head_office'].forEach(c => catTotals[c] = 0)
  } else if (!filterMode) {
    EXPENSE_CATEGORIES.forEach(c => catTotals[c.value] = 0)
  }

  filteredExpenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount
  })
  const grandTotal = filteredExpenses.reduce((a, e) => a + e.amount, 0)

  return (
    <div className="space-y-6">
      {/* ── Centered Header & Filters ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Top Row: Centered Title & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight">
            {filterMode === 'utilities' ? 'Utilities' : filterMode === 'other' ? 'Other Expenses' : filterMode === 'marketing' ? 'Marketing' : filterMode === 'templates' ? 'Fixed Expense Setup' : 'Expenses'}
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            {filterMode === 'utilities' ? 'Track electricity, gas, water, and internet bills' : filterMode === 'other' ? 'Track fuel, rent, tax, and miscellaneous expenses' : filterMode === 'marketing' ? 'Track all advertising and marketing expenses' : filterMode === 'templates' ? 'Setup your recurring fixed costs so you can auto-fill them weekly' : 'Track wages, utilities, fuel, rent and more'}
          </p>
        </div>

        {/* Middle Row: Centered Filter & Action Toolbar */}
        <div className="flex justify-center items-center print:hidden">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-3 flex flex-wrap items-center justify-center gap-4 shadow-xl backdrop-blur-md">
            {!is2025 && (
              <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-[#1f2947] p-1 rounded-xl">
                <button onClick={() => setStoreFilter('')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === '' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Combined</button>
                <button onClick={() => setStoreFilter('Herbies Pizza')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === 'Herbies Pizza' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Herbies Pizza</button>
                <button onClick={() => setStoreFilter('Tasty Bun')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === 'Tasty Bun' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Tasty Bun</button>
              </div>
            )}

            {!is2025 && <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>}

            <select
              value={filter.category}
              onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
              className="bg-transparent text-slate-300 hover:text-white text-xs font-bold focus:outline-none cursor-pointer transition-colors"
            >
              <option value="" className="bg-[#111520] text-white">All Categories</option>
              {EXPENSE_CATEGORIES.filter(c => {
                if (filterMode === 'utilities') return ['electricity', 'gas', 'water', 'internet'].includes(c.value)
                if (filterMode === 'other') return ['fuel', 'rent', 'tax', 'misc', 'fees'].includes(c.value)
                if (filterMode === 'marketing') return ['social_media', 'facebook_ads', 'google_ads', 'newspaper_ads', 'print_material', 'marketing_misc', 'herbies_head_office'].includes(c.value)
                return true
              }).map(c => <option key={c.value} value={c.value} className="bg-[#111520] text-white">{c.label}</option>)}
            </select>

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <DateFilter filter={filter} setFilter={setFilter} />

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <button 
              onClick={() => setFilter({ category: '', ...defaultDateFilter() })} 
              className="text-slate-400 hover:text-white hover:bg-[#1f2947]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>

            {selectedIds.size > 0 && (
              <>
                <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>
                <button
                  onClick={handleDeleteSelected}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  🗑️ Delete ({selectedIds.size})
                </button>
              </>
            )}

            {filterMode !== 'templates' && filterMode !== 'marketing' && (
              <>
                <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>
                <Link href="/dashboard/expenses/templates" className="bg-[#1c2238] text-white border border-[#2a3441] px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-[#2a3441] transition cursor-pointer flex items-center gap-1.5">
                  ⚙️ Setup Fixed Costs
                </Link>
                <button
                  onClick={() => setShowAutoFill(true)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
                >
                  ⚡ Auto-Fill Fixed Costs
                </button>
              </>
            )}

            <button
              id="add-expense-btn"
              onClick={() => { 
                setShowForm(true); 
                setEditId(null); 
                setForm({
                  ...EMPTY_FORM,
                  category: filterMode === 'utilities' ? 'electricity' : filterMode === 'other' ? 'fuel' : filterMode === 'marketing' ? 'social_media' : 'wages'
                }) 
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> {filterMode === 'templates' ? 'Add Fixed Cost' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>

      {/* Category totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(catTotals).map(([cat, total]) => (
          <div key={cat} className="bg-[#111520] border border-[#1f2947] rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{expenseCategoryLabel(cat)}</div>
            <div className="text-lg font-black text-red-400">{gbp(total)}</div>
          </div>
        ))}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grand Total</div>
          <div className="text-lg font-black text-red-400">{gbp(grandTotal)}</div>
        </div>
      </div>


      {/* Table */}
      <div className="bg-[#111520] border border-[#1f2947] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#161b2c] border-b border-[#1f2947]">
                <th className="px-4 py-3 w-10 text-center">
                  <input type="checkbox"
                    checked={filteredExpenses.length > 0 && selectedIds.size === filteredExpenses.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(filteredExpenses.map(e => e.id)))
                      else setSelectedIds(new Set())
                    }}
                    className="w-4 h-4 rounded border-[#1f2947] bg-[#111520] text-red-500 focus:ring-red-500/50 cursor-pointer"
                  />
                </th>
                {['Category', 'Subcategory', 'Amount', 'Period', 'Week', 'Month', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">Loading…</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">No expenses recorded yet.</td></tr>
              ) : filteredExpenses.map(e => {
                const targetDate = e.date ? new Date(e.date) : null
                const weekStartDt = targetDate && !isNaN(targetDate.getTime()) ? getWeekStart(targetDate) : null
                const weekEndDt = weekStartDt ? getWeekEnd(weekStartDt) : null
                
                const weekStr = weekStartDt && weekEndDt ? `${fmtDate(weekStartDt)} - ${fmtDate(weekEndDt)}` : '-'
                const monthStr = targetDate ? targetDate.toLocaleString('en-GB', { month: 'short', year: 'numeric' }) : '-'

                return (
                <tr key={e.id} className={`border-b border-[#1f2947] transition-colors ${selectedIds.has(e.id) ? 'bg-red-500/5' : 'hover:bg-[#161b2c]'}`}>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox"
                      checked={selectedIds.has(e.id)}
                      onChange={(ev) => {
                        const newSet = new Set(selectedIds)
                        if (ev.target.checked) newSet.add(e.id)
                        else newSet.delete(e.id)
                        setSelectedIds(newSet)
                      }}
                      className="w-4 h-4 rounded border-[#1f2947] bg-[#111520] text-red-500 focus:ring-red-500/50 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold">
                      {expenseCategoryLabel(e.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{e.subcategory || '—'}</td>
                  <td className="px-4 py-3 font-bold text-red-400">{gbp(e.amount)}</td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{e.period}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{weekStr}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{monthStr}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{e.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => {
                        setForm({ category: e.category, subcategory: e.subcategory ?? '', amount: e.amount.toString(), period: e.period, date: e.date.split('T')[0], notes: e.notes ?? '' })
                        setEditId(e.id); setShowForm(true)
                      }} className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-500/10 transition text-xs">Edit</button>
                      <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition text-xs">Del</button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">{editId ? 'Edit' : 'Add'} Expense</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Store</label>
                <select value={form.store || 'Combined'} onChange={e => setForm(f => ({ ...f, store: e.target.value }))}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                  <option value="Combined">Combined</option>
                  <option value="Herbies Pizza">Herbies Pizza</option>
                  {!is2025 && <option value="Tasty Bun">Tasty Bun</option>}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {EXPENSE_CATEGORIES.filter(c => {
                      if (filterMode === 'utilities') return ['electricity', 'gas', 'water', 'internet'].includes(c.value)
                      if (filterMode === 'other') return ['fuel', 'rent', 'tax', 'misc', 'fees'].includes(c.value)
                      if (filterMode === 'marketing') return ['social_media', 'facebook_ads', 'google_ads', 'newspaper_ads', 'print_material', 'marketing_misc', 'herbies_head_office'].includes(c.value)
                      return true
                    }).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Subcategory / Name</label>
                  <input type="text" value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Staff name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Amount (£)</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Period</label>
                  <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Sales Week Ending Date (Sunday)</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: snapToSunday(e.target.value) }))}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditId(null) }}
                className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition">
                {saving ? 'Saving…' : 'Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Fill Modal */}
      {showAutoFill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">⚡ Auto-Fill Fixed Costs</h2>
            <p className="text-slate-400 text-sm mb-6">Select the Week Ending date (snaps automatically to Sunday week-ending).</p>
            
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Sales Week Ending Date (Sunday)</label>
              <input type="date" value={autoFillDate} onChange={e => setAutoFillDate(snapToSunday(e.target.value))}
                className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" />
            </div>

            {previewExpenses.length > 0 && (
              <div className="mb-6 bg-[#161b2c] rounded-xl p-3 max-h-40 overflow-y-auto border border-[#1f2947]">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Expenses to generate ({previewExpenses.length})</div>
                <div className="space-y-1.5">
                  {previewExpenses.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">⚡ {p.name}</span>
                      <span className="text-emerald-400 font-bold">{gbp(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowAutoFill(false)}
                className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button onClick={handleAutoFill} disabled={autoFilling}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl py-2.5 text-sm font-bold shadow-lg hover:opacity-90 disabled:opacity-50 transition">
                {autoFilling ? 'Filling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
