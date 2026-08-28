// @ts-nocheck
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { gbp, fmtDate } from '@/lib/utils'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

export function HungryBirdsSuppliers() {
  const { data: session } = useSession()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [supForm, setSupForm] = useState({ name: '', customName: '', category: 'food', franchise: 'Combined' })
  const [invForm, setInvForm] = useState({ amount: '', invoiceDate: '', notes: '', store: 'Combined' })
  const [invFile, setInvFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState<string | null>(null)
  const [storeFilter, setStoreFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [filter, setFilter] = useState(defaultDateFilter())
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({})

  const toggleExpanded = (id: string) => setExpandedSuppliers(prev => ({ ...prev, [id]: !prev[id] }))

  const fetchSuppliers = useCallback(async () => {
    if (!session) return
    setLoading(true)
    
    const clientId = session.user.role === 'admin' ? 'client-1' : session.user.clientId
    
    const params = new URLSearchParams()
    if (clientId) params.set('clientId', clientId)
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    const res = await fetch(`/api/suppliers?${params}`)
    const data = await res.json()
    setSuppliers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [session, filter])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  async function saveSupplier() {
    setSaving(true)
    const body: any = { ...supForm }
    if ((session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId)) body.clientId = session.user.clientId
    
    if (editSupplierId) {
      await fetch(`/api/suppliers/${editSupplierId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, name: body.name }) })
    } else {
      await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, name: body.name === 'Custom' ? body.customName : body.name }) })
    }
    
    setSaving(false); setShowSupplierForm(false); setSupForm({ name: '', customName: '', category: 'food', franchise: 'Combined' }); setEditSupplierId(null)
    fetchSuppliers()
  }

  async function saveInvoice() {
    if (!selectedSupplier) return
    setSaving(true)
    const fd = new FormData()
    if (invFile) fd.append('file', invFile)
    fd.append('supplierId', selectedSupplier.id)
    fd.append('type', 'supplier')
    fd.append('clientId', (session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId) ?? '')
    fd.append('platform', invForm.store)
    if (invForm.amount) fd.append('amount', invForm.amount)
    if (invForm.invoiceDate) fd.append('invoiceDate', invForm.invoiceDate)
    const res = await fetch('/api/invoices', { method: 'POST', body: fd })
    const inv = await res.json()
    setSaving(false); setShowInvoiceForm(false); setInvForm({ amount: '', invoiceDate: '', notes: '', store: 'Combined' }); setInvFile(null)
    // Auto-trigger OCR
    if (inv.id) {
      setOcrLoading(inv.id)
      const ocrRes = await fetch(`/api/invoices/${inv.id}/ocr`, { method: 'POST' })
      const ocrData = await ocrRes.json()
      setOcrResult(ocrData.data)
      setOcrLoading(null)
    }
    fetchSuppliers()
  }

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  async function handleDeleteSelected() {
    if (!confirm("Delete " + selectedIds.size + " selected invoice(s)?")) return
    setLoading(true)
    await Promise.all([...selectedIds].map(id => fetch("/api/invoices/" + id, { method: "DELETE" })))
    setSelectedIds(new Set())
    fetchSuppliers()
  }

  async function handleDeleteInvoice(id: string) {
    if (!confirm("Delete this invoice?")) return
    await fetch("/api/invoices/" + id, { method: "DELETE" })
    fetchSuppliers()
  }

  const allInvoices = suppliers.flatMap(s => 
    (s.invoices || []).map((i: any) => ({ ...i, supplier: s }))
  ).filter(inv => {
    let matchStore = true;
    let matchSupplier = true;
    if (storeFilter) matchStore = !inv.supplier.franchise || inv.supplier.franchise === storeFilter || inv.supplier.franchise === "Combined";
    if (supplierFilter) matchSupplier = inv.supplier.name === supplierFilter;
    return matchStore && matchSupplier;
  }).sort((a, b) => {
    const aProc = a.ocrStatus === "processing" || a.ocrStatus === "pending" ? 1 : 0;
    const bProc = b.ocrStatus === "processing" || b.ocrStatus === "pending" ? 1 : 0;
    if (aProc !== bProc) return bProc - aProc;
    const dA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : new Date(a.createdAt).getTime();
    const dB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : new Date(b.createdAt).getTime();
    return dB - dA || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalSpend = allInvoices.reduce((a, i) => a + (i.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Suppliers</h1>
          <p className="text-slate-400 text-sm mt-1">Track supplier invoices and spending</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} disabled={loading} className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/20 transition whitespace-nowrap disabled:opacity-50">
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button onClick={() => { setEditSupplierId(null); setSupForm({ name: '', customName: '', category: 'food', franchise: 'Combined' }); setShowSupplierForm(true) }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition">
            + Add Supplier
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-4 flex gap-3 flex-wrap items-center">
          <DateFilter filter={filter} setFilter={setFilter} />
          <div className="w-[1px] h-4 bg-[#1f2947]"></div>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="bg-[#161b2c] border border-[#1f2947] text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none">
            <option value="">All Suppliers</option>
            {Array.from(new Set(suppliers.map(s => s.name))).map((n: any) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="bg-[#111520] border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-xl">📦</div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Supplier Spend</div>
            <div className="text-2xl font-black text-orange-400">{gbp(totalSpend)}</div>
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      <div className="bg-[#111520] border border-[#1f2947] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#161b2c] border-b border-[#1f2947]">
                <th className="px-4 py-3 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={allInvoices.length > 0 && selectedIds.size === allInvoices.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(allInvoices.map(x => x.id)))
                      else setSelectedIds(new Set())
                    }}
                    className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1f2947] text-blue-500 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">File</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">Loading...</td></tr>
              ) : allInvoices.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">No invoices found.</td></tr>
              ) : (
                allInvoices.map(inv => {
                  const isSelected = selectedIds.has(inv.id)
                  const targetDate = inv.invoiceDate ? new Date(inv.invoiceDate) : null
                  const dateStr = targetDate ? fmtDate(targetDate) : <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">MISSING</span>
                  
                  return (
                    <tr key={inv.id} className={isSelected ? "border-b border-[#1f2947] transition-colors bg-blue-500/5" : "border-b border-[#1f2947] transition-colors hover:bg-[#161b2c]"}>
                      <td className="px-4 py-3 w-12 text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const next = new Set(selectedIds)
                            if (next.has(inv.id)) next.delete(inv.id)
                            else next.add(inv.id)
                            setSelectedIds(next)
                          }}
                          className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1f2947] text-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{inv.supplier.name}</td>
                      <td className="px-4 py-3 text-slate-400 capitalize">{inv.supplier.category}</td>
                      <td className="px-4 py-3 text-slate-300">{dateStr}</td>
                      <td className="px-4 py-3 font-black text-white">{inv.amount ? gbp(inv.amount) : "-"}</td>
                      <td className="px-4 py-3">
                        {inv.ocrStatus === "processing" || inv.ocrStatus === "pending" ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1 text-xs">Processing ⏳</span>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-xs">Extracted ✅</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {inv.fileUrl ? (
                          <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs font-semibold">View File</a>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 flex gap-3">
                        <button onClick={() => handleDeleteInvoice(inv.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold">Del</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add Supplier Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">{editSupplierId ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <div className="space-y-4">
              <div className="hidden">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Franchise (Optional)</label>
                <input type="text" value={supForm.franchise} onChange={e => setSupForm({ ...supForm, franchise: e.target.value })} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Supplier Name</label>
                {editSupplierId ? (
                  <input value={supForm.name} onChange={e => setSupForm({ ...supForm, name: e.target.value })}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition" />
                ) : (
                  <>
                    <select value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 mb-2">
                      <option value="" disabled>Select a supplier...</option>
                      {Array.from(new Set(suppliers.map(s => s.name))).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      <option value="Custom">Custom / Add New...</option>
                    </select>
                    {supForm.name === 'Custom' && (
                      <input value={supForm.customName} onChange={e => setSupForm({ ...supForm, customName: e.target.value })}
                        placeholder="Type new supplier name..."
                        className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition mt-2" />
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                <select value={supForm.category} onChange={e => setSupForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                  {['food','packaging','cleaning','equipment','other'].map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
            </div>
              <div className="flex gap-3 mt-6 pt-2">
                <button onClick={() => { setShowSupplierForm(false); setEditSupplierId(null); setSupForm({ name: '', customName: '', category: 'food', franchise: 'Combined' }) }} className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
                <button onClick={saveSupplier} disabled={saving || (!supForm.name || (supForm.name === 'Custom' && !supForm.customName))}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition">
                  {saving ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {showInvoiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Upload Invoice</h2>
            <p className="text-slate-500 text-sm mb-5">For: <span className="text-white font-semibold">{selectedSupplier?.name}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Supplier</label>
                <select value={selectedSupplier?.id || ""} onChange={e => setSelectedSupplier(suppliers.find(s => s.id === e.target.value))}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                  <option value="" disabled>Select a supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.franchise || "Combined"})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Invoice File (PDF or Image)</label>
                <div className="border-2 border-dashed border-[#1f2947] rounded-xl p-4 text-center cursor-pointer hover:border-blue-500 transition"
                  onClick={() => document.getElementById('inv-file-input')?.click()}>
                  {invFile ? (
                    <div className="text-sm text-emerald-400">✅ {invFile.name}</div>
                  ) : (
                    <>
                      <div className="text-2xl mb-1">📎</div>
                      <div className="text-sm text-slate-400">Click to upload PDF or image</div>
                      <div className="text-xs text-slate-500 mt-1">AI will extract amounts automatically</div>
                    </>
                  )}
                </div>
                <input id="inv-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                  onChange={e => setInvFile(e.target.files?.[0] ?? null)} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Amount (£) — optional</label>
                  <input type="number" step="0.01" value={invForm.amount} onChange={e => setInvForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder="Auto from OCR" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Invoice Date</label>
                  <input type="date" value={invForm.invoiceDate} onChange={e => setInvForm(f => ({ ...f, invoiceDate: e.target.value }))}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              {ocrResult && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm">
                  <div className="font-bold text-emerald-400 mb-2">✅ OCR Extracted Data</div>
                  {Object.entries(ocrResult).filter(([k]) => k !== 'rawText').map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-white font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowInvoiceForm(false); setOcrResult(null) }} className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button onClick={saveInvoice} disabled={saving || !invFile} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition">
                {saving ? 'Uploading & scanning…' : 'Upload & Scan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
