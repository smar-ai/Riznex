// @ts-nocheck
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { gbp, fmtDate, fmtDateInput, getWeekStart, getWeekEnd } from '@/lib/utils'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

interface StaffWage {
  id: string; staffId: string; amount: number; weekEnd: string; store: string;
  staff?: { name: string }
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

export function HenleyWages({ is2025 = false }: { is2025?: boolean }) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [wages, setWages] = useState<StaffWage[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ staffId: '', hours: '', amount: '', weekEnd: snapToSunday(fmtDateInput(new Date())), store: 'Herbies Pizza' })
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAutoFill, setShowAutoFill] = useState(false)
  const [autoFillDate, setAutoFillDate] = useState(snapToSunday(fmtDateInput(new Date())))
  const [autoFilling, setAutoFilling] = useState(false)
  const [autoFillOverrides, setAutoFillOverrides] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState(defaultDateFilter())
  const [storeFilter, setStoreFilter] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const loadData = async () => {
    const clientId = session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf'
      : (session?.user?.clientId || 'cmpv4dvik0000vdj089wl6zmf')

    const params = new URLSearchParams()
    params.set('clientId', clientId)
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    if (is2025) params.set('is2025', 'true')

    try {
      const [wagesRes, staffRes] = await Promise.all([
        fetch(`/api/staff/wages?${params}`).then(r => r.json()),
        fetch(`/api/staff?clientId=${clientId}`).then(r => r.json())
      ])
      setWages(Array.isArray(wagesRes) ? wagesRes : [])
      setStaffList(Array.isArray(staffRes) ? staffRes : [])
    } catch (err) {
      console.error('Error fetching wages:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filter.from, filter.to])

  async function handleSave() {
    // Strict Duplicate Check (blocks adding duplicate entries for same staff & weekEnd)
    if (!editId) {
      const targetDateStr = form.weekEnd ? new Date(form.weekEnd).toISOString().slice(0, 10) : ''
      const duplicate = wages.find(w => {
        if (w.staffId !== form.staffId) return false
        const wDateStr = w.weekEnd ? new Date(w.weekEnd).toISOString().slice(0, 10) : ''
        return wDateStr === targetDateStr
      })
      if (duplicate) {
        const staffName = staffList.find(s => s.id === form.staffId)?.name || 'This staff member'
        alert(`❌ DUPLICATE ENTRY BLOCKED!\n\n"${staffName}" already has a wage record of £${duplicate.amount.toFixed(2)} recorded for week ending ${targetDateStr}.\n\nDuplicate entries for the same staff member and week ending date are strictly prevented.`)
        return
      }
    }
    setSaving(true)
    const body: any = { ...form, amount: parseFloat(form.amount) || 0 }
    const clientId = session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId
    if (clientId) body.clientId = clientId
    const url = editId ? `/api/staff/wages/${editId}` : '/api/staff/wages'
    const method = editId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm({ staffId: '', hours: '', amount: '', weekEnd: fmtDateInput(new Date()), store: 'Herbies Pizza' })
    loadData()
  }

  async function handleAutoFill() {
    setAutoFilling(true)
    const res = await fetch('/api/staff/auto-fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: autoFillDate, overrides: autoFillOverrides, clientId: session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId })
    })
    setAutoFilling(false)
    setShowAutoFill(false)
    setAutoFillOverrides({})
    if (res.ok) {
      alert('Successfully generated fixed staff wages for the selected week!')
      loadData()
    } else {
      const data = await res.json()
      alert('Error: ' + data.error)
    }
  }

  async function handleDeleteSelected() {
    if (!confirm(`Delete ${selectedIds.size} selected wage record(s)?`)) return
    await Promise.all([...selectedIds].map(id => fetch(`/api/staff/wages/${id}`, { method: 'DELETE' })))
    setSelectedIds(new Set())
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this wage record?')) return
    await fetch(`/api/staff/wages/${id}`, { method: 'DELETE' })
    loadData()
  }

  const filteredWages = wages.filter(w => {
    if (storeFilter && w.store !== storeFilter && w.store !== 'Combined') return false
    if (staffFilter && w.staffId !== staffFilter) return false
    return true
  })

  // Calculate totals correctly
  let totalWages = 0
  const staffTotals: Record<string, number> = {}

  filteredWages.forEach(w => {
    totalWages += w.amount
    staffTotals[w.staffId] = (staffTotals[w.staffId] || 0) + w.amount
  })

  const selectedStaff = staffList.find(s => s.id === form.staffId)
  const isHourly = selectedStaff && selectedStaff.hourlyRate != null

  // Deduplicate staff list by capitalized name for dropdowns
  const uniqueStaffList = staffList.reduce((acc: any[], current) => {
    const capitalizedName = current.name
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    const x = acc.find(item => item._normalizedName === capitalizedName)
    if (!x) {
      return acc.concat([{ ...current, _normalizedName: capitalizedName, name: capitalizedName }])
    }
    return acc
  }, []).sort((a: any, b: any) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      {/* ── Centered Header & Filters ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Top Row: Centered Title & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight">Staff Wages</h1>
          <p className="text-slate-400 text-sm font-medium">Manage weekly wage payouts for your staff</p>
        </div>

        {/* Middle Row: Centered Filter & Action Toolbar */}
        <div className="flex justify-center items-center print:hidden">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-3 flex flex-wrap items-center justify-center gap-4 shadow-xl backdrop-blur-md">
            <select
              value={staffFilter}
              onChange={e => setStaffFilter(e.target.value)}
              className="bg-transparent text-slate-300 hover:text-white text-xs font-bold focus:outline-none cursor-pointer transition-colors"
            >
              <option value="" className="bg-[#111520] text-white">All Staff</option>
              {uniqueStaffList.map(s => (
                <option key={s.id} value={s.id} className="bg-[#111520] text-white">{s.name}</option>
              ))}
            </select>

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <DateFilter filter={filter} setFilter={setFilter} />

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <button 
              onClick={() => { setFilter(defaultDateFilter()); setStaffFilter(''); }} 
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

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <button
              onClick={() => setShowAutoFill(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
            >
              ⚡ Auto-Fill Fixed Wages
            </button>

            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm({ staffId: staffList[0]?.id || '', hours: '', amount: '', weekEnd: fmtDateInput(new Date()), store: 'Herbies Pizza' }) }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> Add Wage
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Wages Paid</div>
          <div className="text-2xl font-black text-purple-400">{gbp(totalWages)}</div>
        </div>

        {Object.keys(staffTotals).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {Object.entries(staffTotals)
              .sort((a, b) => b[1] - a[1]) // Sort by amount descending
              .map(([staffId, amount]) => {
                const staffName = staffList.find(s => s.id === staffId)?.name || 'Unknown Staff'
                return (
                  <div key={staffId} className="bg-[#111520] border border-[#1f2947] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate" title={staffName}>{staffName}</div>
                    <div className="text-lg font-black text-white">{gbp(amount)}</div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      <div className="bg-[#111520] border border-[#1f2947] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#161b2c] border-b border-[#1f2947]">
                <th className="px-4 py-3 w-10 text-center">
                  <input type="checkbox"
                    checked={filteredWages.length > 0 && selectedIds.size === filteredWages.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(filteredWages.map(w => w.id)))
                      else setSelectedIds(new Set())
                    }}
                    className="w-4 h-4 rounded border-[#1f2947] bg-[#111520] text-red-500 focus:ring-red-500/50 cursor-pointer"
                  />
                </th>
                {['Staff Name', 'Store', 'Amount', 'Week Ending', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && wages.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[#1f2947] animate-pulse">
                    <td className="px-4 py-4 text-center"><div className="w-4 h-4 bg-[#1f2947] rounded mx-auto"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-[#1f2947] rounded w-32"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-[#1f2947] rounded w-20"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-[#1f2947] rounded w-16"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-[#1f2947] rounded w-24"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-[#1f2947] rounded w-16"></div></td>
                  </tr>
                ))
              ) : filteredWages.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 font-medium">No wages recorded yet.</td></tr>
              ) : filteredWages.map(w => {
                return (
                <tr key={w.id} className={`border-b border-[#1f2947] hover:bg-[#161b2c] transition-colors ${selectedIds.has(w.id) ? 'bg-red-500/5' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox"
                      checked={selectedIds.has(w.id)}
                      onChange={(e) => {
                        const next = new Set(selectedIds)
                        if (e.target.checked) next.add(w.id)
                        else next.delete(w.id)
                        setSelectedIds(next)
                      }}
                      className="w-4 h-4 rounded border-[#1f2947] bg-[#111520] text-red-500 focus:ring-red-500/50 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{w.staff?.name || 'Unknown Staff'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                      Herbies Pizza
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-purple-400">
                    {gbp(w.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{w.weekEnd ? fmtDate(w.weekEnd) : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => {
                        setForm({ staffId: w.staffId, hours: '', amount: w.amount.toString(), weekEnd: w.weekEnd.split('T')[0], store: 'Herbies Pizza' })
                        setEditId(w.id); setShowForm(true)
                      }} className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-500/10 transition text-xs">Edit</button>
                      <button onClick={() => handleDelete(w.id)} className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition text-xs">Del</button>
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
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">{editId ? 'Edit' : 'Add'} Wage Record</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Staff Member</label>
                <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value, hours: '', amount: '' }))}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                  <option value="" disabled>Select Staff</option>
                  {uniqueStaffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {uniqueStaffList.length === 0 && <p className="text-xs text-orange-400 mt-1">No staff members found. Add staff first!</p>}
              </div>

              {isHourly && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hours Worked (at {gbp(selectedStaff.hourlyRate)}/hr)</label>
                  <input type="number" step="0.5" value={form.hours} onChange={e => {
                    const hrs = parseFloat(e.target.value) || 0
                    setForm(f => ({ ...f, hours: e.target.value, amount: (hrs * selectedStaff.hourlyRate).toFixed(2) }))
                  }}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder="0.0" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{isHourly ? 'Calculated Total Amount (£)' : 'Amount (£)'}</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  readOnly={isHourly}
                  className={`w-full text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none border ${isHourly ? 'bg-[#111520] border-[#1f2947] opacity-50 cursor-not-allowed' : 'bg-[#161b2c] border-[#1f2947] focus:border-blue-500'}`} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Week Ending Date (Sunday)</label>
                <input type="date" value={form.weekEnd} onChange={e => setForm(f => ({ ...f, weekEnd: snapToSunday(e.target.value) }))}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditId(null) }}
                className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.staffId}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold shadow-lg hover:opacity-90 disabled:opacity-50 transition">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAutoFill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Auto-Fill Wages</h2>
            <p className="text-sm text-slate-400 mb-6">Select a date within the week (snaps automatically to Sunday week-ending).</p>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Week Ending Date (Sunday)</label>
              <input type="date" value={autoFillDate} onChange={e => setAutoFillDate(snapToSunday(e.target.value))}
                className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            
            {staffList.filter(s => s.active && s.weeklyWage).length > 0 && (
              <div className="mb-6 bg-[#161b2c] rounded-xl p-3 max-h-40 overflow-y-auto border border-[#1f2947]">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Wages to generate ({staffList.filter(s => s.active && s.weeklyWage).length})</div>
                <div className="space-y-2">
                  {staffList.filter(s => s.active && s.weeklyWage).map(s => {
                    const currentVal = autoFillOverrides[s.id] !== undefined ? autoFillOverrides[s.id] : s.weeklyWage;
                    return (
                      <div key={s.id} className="flex justify-between items-center text-xs gap-2">
                        <span className="text-slate-300 whitespace-nowrap">• {s.name}</span>
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={currentVal} 
                            onChange={e => setAutoFillOverrides(prev => ({ ...prev, [s.id]: parseFloat(e.target.value) || 0 }))}
                            className="w-full bg-[#111520] border border-[#1f2947] text-emerald-400 font-bold rounded px-2 py-1 pl-5 text-right focus:outline-none focus:border-emerald-500" 
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowAutoFill(false)} className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button onClick={handleAutoFill} disabled={autoFilling} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition">
                {autoFilling ? 'Generating…' : 'Generate Wages'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
