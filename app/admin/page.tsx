'use client'
import { useState, useEffect } from 'react'

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No Data'
    const dateObj = new Date(dateString)
    const day = dateObj.getUTCDate().toString().padStart(2, '0')
    const month = dateObj.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })
    const year = dateObj.getUTCFullYear()
    return `${day} - ${month} - ${year}`
  }

  const fetchClients = () => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => { setClients(data); setLoading(false) })
  }

  useEffect(() => { fetchClients() }, [])

  async function saveClient() {
    if (!editingClient) return
    setSaving(true)
    await fetch(`/api/clients/${editingClient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingClient)
    })
    setSaving(false)
    setEditingClient(null)
    fetchClients()
  }

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-t-blue-500 rounded-full animate-spin"></div></div>

  return (
    <div className="max-w-5xl mx-auto">
      {/* Ultra Premium Header */}
      <div className="flex flex-col items-center justify-center text-center mt-4 mb-10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent blur-3xl -z-10 rounded-full" />
        <h1 className="text-5xl md:text-6xl font-black tracking-[0.2em] uppercase bg-gradient-to-br from-[#FCEE21] via-[#D4AF37] to-[#8A6d24] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(212,175,55,0.2)] mb-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          RIZNEX
        </h1>
        <h2 className="text-xs md:text-sm font-bold text-slate-300 tracking-[0.5em] uppercase flex items-center gap-4">
          <span className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#D4AF37]"></span>
          Digital Solutions
          <span className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#D4AF37]"></span>
        </h2>
      </div>

      <div className="text-center border-b border-[#1f2947] pb-2 mb-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest">
          All Clients
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clients.map(c => (
          <div key={c.id} className="bg-[#0b0e17] border border-[#1f2947] rounded-3xl p-6 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all group relative overflow-hidden flex flex-col justify-between">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full pointer-events-none transition-all group-hover:bg-blue-500/20" />
            
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-white/5 backdrop-blur overflow-hidden flex-shrink-0 border border-white/10 p-1">
                    {c.name === 'Hungry Birds' ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src="/hungry-birds-logo.jpg" alt="Hungry Birds" className="w-full h-full object-contain rounded-lg" />
                    ) : c.name === 'Henley on Thames' ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src="/logos/herbies-pizza.jpg" alt="Henley on Thames" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-lg font-black text-white">
                        {c.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg tracking-wide">{c.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">System Online</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Data Grid - 2 Columns to save vertical space */}
              <div className="bg-[#111520]/50 rounded-2xl p-4 border border-[#1f2947]/50 mb-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#00CCBC]"></div> Deliveroo</div>
                    <div className="text-sm font-mono text-slate-200">{formatDate(c.latestDates?.deliveroo)}</div>
                  </div>
                  
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#FF8000]"></div> Just Eat</div>
                    <div className="text-sm font-mono text-slate-200">{formatDate(c.latestDates?.just_eat)}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#06C167]"></div> Uber Eats</div>
                    <div className="text-sm font-mono text-slate-200">{formatDate(c.latestDates?.uber_eats)}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div> POS System</div>
                    <div className="text-sm font-mono text-slate-200">{formatDate(c.latestDates?.pos)}</div>
                  </div>

                  <div className="col-span-2 pt-2 mt-1 border-t border-[#1f2947]/50">
                    <div className="flex justify-between items-end">
                       <div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div> Auto Expenses</div>
                         <div className="text-sm font-mono text-slate-200">{formatDate(c.latestDates?.auto_expenses)}</div>
                       </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <button onClick={async () => {
              await fetch('/api/admin/set-client', { method: 'POST', body: JSON.stringify({ clientName: c.name }) });
              window.location.href = '/dashboard';
            }} className="w-full bg-[#1c2238] hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-bold border border-[#2a3441] hover:border-blue-500 transition-all duration-300">
              Access Database
            </button>
          </div>
        ))}
      </div>

      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">Edit Client Setup</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Business Name</label>
                <input value={editingClient.name} onChange={e => setEditingClient({...editingClient, name: e.target.value})} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">JE Comm %</label>
                  <input type="number" value={editingClient.jeCommission || 14} onChange={e => setEditingClient({...editingClient, jeCommission: parseFloat(e.target.value)})} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Uber Comm %</label>
                  <input type="number" value={editingClient.ueCommission || 30} onChange={e => setEditingClient({...editingClient, ueCommission: parseFloat(e.target.value)})} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Del Comm %</label>
                  <input type="number" value={editingClient.delCommission || 14} onChange={e => setEditingClient({...editingClient, delCommission: parseFloat(e.target.value)})} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingClient(null)} className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button onClick={saveClient} disabled={saving} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
