'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { gbp, fmtDate, fmtDateInput } from '@/lib/utils'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

interface StaffWage {
  id: string; staffId: string; amount: number; weekEnd: string; store: string;
  staff?: { name: string }
}

export function HungryBirdsWages({ is2025 = false }: { is2025?: boolean }) {
  const { data: session } = useSession()
  const [wages, setWages] = useState<StaffWage[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ staffId: '', hours: '', amount: '', weekEnd: fmtDateInput(new Date()), store: 'Hungry Birds' })
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState(defaultDateFilter())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    if (!session) return
    setLoading(true)
    
    const clientId = session.user.role === 'admin' ? 'client-1' : session.user.clientId
    
    const params = new URLSearchParams()
    if (clientId) params.set('clientId', clientId)
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    if (is2025) params.set('is2025', 'true')
    
    const [wagesRes, staffRes] = await Promise.all([
      fetch(`/api/staff/wages?${params}`).then(r => r.json()),
      fetch(`/api/staff?clientId=${clientId || ''}`).then(r => r.json())
    ])
    
    setWages(Array.isArray(wagesRes) ? wagesRes : [])
    setStaffList(Array.isArray(staffRes) ? staffRes : [])
    setLoading(false)
  }, [session, filter, is2025])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!editId) {
      const duplicate = wages.find(w =>
        w.staffId === form.staffId &&
        w.weekEnd?.split('T')[0] === form.weekEnd
      )
      if (duplicate) {
        const proceed = confirm(`⚠️ Duplicate Warning!\n\nThis staff member already has a wage record for the week ending ${form.weekEnd} (£${duplicate.amount.toFixed(2)}).\n\nAre you sure you want to add another one?`)
        if (!proceed) return
      }
    }
    setSaving(true)
    const body: any = { ...form, amount: parseFloat(form.amount) || 0 }
    const clientId = session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId
    if (clientId) body.clientId = clientId
    const url = editId ? `/api/staff/wages/${editId}` : '/api/staff/wages'
    const method = editId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm({ staffId: '', hours: '', amount: '', weekEnd: fmtDateInput(new Date()), store: 'Hungry Birds' })
    fetchData()
  }

  async function handleDeleteSelected() {
    if (!confirm(`Delete ${selectedIds.size} selected wage record(s)?`)) return
    await Promise.all([...selectedIds].map(id => fetch(`/api/staff/wages/${id}`, { method: 'DELETE' })))
    setSelectedIds(new Set())
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this wage record?')) return
    await fetch(`/api/staff/wages/${id}`, { method: 'DELETE' })
    fetchData()
  }

  let totalWages = 0
  wages.forEach(w => { totalWages += w.amount })

  const uniqueStaffList = staffList.reduce((acc: any[], current) => {
    const capitalizedName = current.name.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
    const x = acc.find(item => item._normalizedName === capitalizedName)
    if (!x) return acc.concat([{ ...current, _normalizedName: capitalizedName, name: capitalizedName }])
    return acc
  }, []).sort((a: any, b: any) => a.name.localeCompare(b.name))

  const selectedStaff = staffList.find(s => s.id === form.staffId)
  const isHourly = selectedStaff && selectedStaff.hourlyRate != null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Staff Wages</h1>
            <p className="text-slate-400 text-sm mt-1">Manage weekly wage payouts</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selectedIds.size > 0 && (
              <button onClick={handleDeleteSelected} className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition">
                🗑️ Delete Selected ({selectedIds.size})
              </button>
            )}
            <button onClick={() => { setShowForm(true); setEditId(null); setForm({ staffId: staffList[0]?.id || '', hours: '', amount: '', weekEnd: fmtDateInput(new Date()), store: 'Hungry Birds' }) }} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition">
              + Add Wage
            </button>
          </div>
        </div>

        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-2.5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto overflow-x-auto px-2">
            <DateFilter filter={filter} setFilter={setFilter} />
            <div className="w-[1px] h-4 bg-[#1f2947]"></div>
            <button onClick={() => { setFilter(defaultDateFilter()); }} className="text-slate-400 hover:text-white text-xs px-2 py-1 font-semibold transition flex-shrink-0">Reset</button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Wages Paid</div>
          <div className="text-2xl font-black text-purple-400">{gbp(totalWages)}</div>
        </div>
      </div>

      <div className="bg-[#111520] border border-[#1f2947] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#161b2c] border-b border-[#1f2947]">
                <th className="px-4 py-3 w-10 text-center">
                  <input type="checkbox" checked={wages.length > 0 && selectedIds.size === wages.length} onChange={(e) => { if (e.target.checked) setSelectedIds(new Set(wages.map(w => w.id))); else setSelectedIds(new Set()) }} className="w-4 h-4 rounded border-[#1f2947] bg-[#111520] text-red-500 focus:ring-red-500/50 cursor-pointer" />
                </th>
                {['Staff', 'Amount', 'Week Ending', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">Loading…</td></tr>
              ) : wages.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">No wages recorded yet.</td></tr>
              ) : wages.map(w => (
                <tr key={w.id} className={`border-b border-[#1f2947] hover:bg-[#161b2c] transition-colors ${selectedIds.has(w.id) ? 'bg-red-500/5' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={selectedIds.has(w.id)} onChange={(e) => { const next = new Set(selectedIds); if (e.target.checked) next.add(w.id); else next.delete(w.id); setSelectedIds(next) }} className="w-4 h-4 rounded border-[#1f2947] bg-[#111520] text-red-500 focus:ring-red-500/50 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-300">{w.staff?.name || 'Staff Member'}</td>
                  <td className="px-4 py-3 font-bold text-purple-400">{gbp(w.amount)}</td>
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    {(() => {
                      if (!w.weekEnd) return '-';
                      const dt = new Date(w.weekEnd);
                      if (isNaN(dt.getTime())) return '-';
                      const day = dt.getUTCDay();
                      const sunday = day === 0 ? dt : new Date(dt.getTime() + (7 - day) * 24 * 60 * 60 * 1000);
                      return fmtDate(sunday);
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setForm({ staffId: w.staffId, hours: '', amount: w.amount.toString(), weekEnd: w.weekEnd.split('T')[0], store: 'Hungry Birds' }); setEditId(w.id); setShowForm(true) }} className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-500/10 transition text-xs">Edit</button>
                      <button onClick={() => handleDelete(w.id)} className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition text-xs">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">{editId ? 'Edit' : 'Add'} Wage Record</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Staff Member</label>
                <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value, hours: '', amount: '' }))} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                  <option value="" disabled>Select Staff</option>
                  {uniqueStaffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {uniqueStaffList.length === 0 && <p className="text-xs text-orange-400 mt-1">No staff members found in system. Please add them first.</p>}
              </div>

              {isHourly && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hours Worked (at {gbp(selectedStaff.hourlyRate)}/hr)</label>
                  <input type="number" step="0.5" value={form.hours} onChange={e => {
                    const hrs = parseFloat(e.target.value) || 0
                    setForm(f => ({ ...f, hours: e.target.value, amount: (hrs * selectedStaff.hourlyRate).toFixed(2) }))
                  }} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder="0.0" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{isHourly ? 'Calculated Total Amount (£)' : 'Amount (£)'}</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} readOnly={isHourly} className={`w-full text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none border ${isHourly ? 'bg-[#111520] border-[#1f2947] opacity-50 cursor-not-allowed' : 'bg-[#161b2c] border-[#1f2947] focus:border-blue-500'}`} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Week Ending Date (Sunday)</label>
                <input type="date" value={form.weekEnd} onChange={e => setForm(f => ({ ...f, weekEnd: e.target.value }))} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.staffId} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold shadow-lg hover:opacity-90 disabled:opacity-50 transition">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
