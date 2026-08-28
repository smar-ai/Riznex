// @ts-nocheck
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { gbp, fmtDate, expenseCategoryLabel, EXPENSE_CATEGORIES, fmtDateInput, getWeekStart, getWeekEnd } from '@/lib/utils'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

interface Expense {
  id: string; category: string; subcategory?: string
  amount: number; period: string; date: string; notes?: string
}

const EMPTY_FORM = {
  category: 'wages', subcategory: '', amount: '', period: 'weekly',
  date: fmtDateInput(new Date()), notes: '',
}

export function HungryBirdsExpenses() {
  const { data: session } = useSession()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState({ category: '', ...defaultDateFilter() })
  const [storeFilter, setStoreFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchExpenses = useCallback(async () => {
    if (!session) return
    setLoading(true)
    
    const clientId = session.user.role === 'admin' ? 'client-1' : session.user.clientId
    
    const params = new URLSearchParams()
    if (clientId) params.set('clientId', clientId)
    if (filter.category) params.set('category', filter.category)
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    const res = await fetch(`/api/expenses?${params}`)
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [session, filter])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  async function handleSave() {
    setSaving(true)
    const body: any = { ...form, amount: parseFloat(form.amount as string) || 0 }
    if ((session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId)) body.clientId = session.user.clientId
    const url = editId ? `/api/expenses/${editId}` : '/api/expenses'
    const method = editId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    fetchExpenses()
  }

  async function handleDeleteSelected() {
    if (!confirm(`Delete ${selectedIds.size} selected expense(s)?`)) return
    setLoading(true)
    await Promise.all([...selectedIds].map(id => fetch(`/api/expenses/${id}`, { method: 'DELETE' })))
    setSelectedIds(new Set())
    fetchExpenses()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    fetchExpenses()
  }

  const filteredExpenses = expenses.filter(e => {
    if (storeFilter) {
      const matchText = `${e.category} ${e.subcategory || ''} ${e.notes || ''}`.toLowerCase()
      if (!matchText.includes(storeFilter.toLowerCase())) return false
    }
    return true
  })

  // Group by category for totals
  const catTotals = filteredExpenses.reduce((a, e) => {
    a[e.category] = (a[e.category] ?? 0) + e.amount
    return a
  }, {} as Record<string, number>)
  const grandTotal = filteredExpenses.reduce((a, e) => a + e.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Expenses</h1>
          <p className="text-slate-400 text-sm mt-1">Track wages, utilities, fuel, rent and more</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1.5 bg-[#111520] border border-[#1f2947] rounded-xl p-1.5 shadow-sm">
            <button onClick={() => setStoreFilter('')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${storeFilter === '' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Overall</button>
          </div>
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected}
              disabled={loading}
              className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/20 transition whitespace-nowrap disabled:opacity-50"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            id="add-expense-btn"
            onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition"
          >
            + Add Expense
          </button>
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

      {/* Filter */}
      <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-4 flex gap-3 flex-wrap items-center">
        <select
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="bg-transparent text-white px-2 py-1 text-sm focus:outline-none"
        >
          <option value="" className="bg-[#111520] text-white">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-[#111520] text-white">{c.label}</option>)}
        </select>
        <div className="w-[1px] h-4 bg-[#1f2947]"></div>
        <DateFilter filter={filter} setFilter={setFilter} />
        <div className="w-[1px] h-4 bg-[#1f2947]"></div>
        <button onClick={() => setFilter({ category: '', ...defaultDateFilter() })} className="text-slate-400 hover:text-white text-xs px-2 py-1 font-semibold transition">Reset</button>
      </div>

      {/* Table */}
      <div className="bg-[#111520] border border-[#1f2947] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#161b2c] border-b border-[#1f2947]">
                <th className="px-4 py-3 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredExpenses.length > 0 && selectedIds.size === filteredExpenses.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(filteredExpenses.map(x => x.id)))
                      else setSelectedIds(new Set())
                    }}
                    className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1f2947] text-blue-500 cursor-pointer"
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

                const isSelected = selectedIds.has(e.id);
                return (
                <tr key={e.id} className={`border-b border-[#1f2947] transition-colors ${isSelected ? 'bg-blue-500/5' : 'hover:bg-[#161b2c]'}`}>
                  <td className="px-4 py-3 w-12 text-center">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const next = new Set(selectedIds)
                        if (next.has(e.id)) next.delete(e.id)
                        else next.add(e.id)
                        setSelectedIds(next)
                      }}
                      className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1f2947] text-blue-500 cursor-pointer"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
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
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold shadow-lg hover:opacity-90 disabled:opacity-50 transition">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
