// @ts-nocheck
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { gbp, fmtDate, getWeekStart, getWeekEnd } from '@/lib/utils'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

export function HenleySuppliers() {
  const { data: session } = useSession()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [supForm, setSupForm] = useState({ name: '', customName: '', category: 'food', franchise: 'Combined' })
  const [invForm, setInvForm] = useState({ amount: '', invoiceDate: '', notes: '', store: 'Combined' })
  const [invFiles, setInvFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState<string | null>(null)
  const [storeFilter, setStoreFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [filter, setFilter] = useState({ ...defaultDateFilter() })
  const [ocrResult, setOcrResult] = useState<any>(null)
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ invoiceDate: string, amount: string }>({ invoiceDate: '', amount: '' })
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [sortBy, setSortBy] = useState<string>('invoiceDate')

  const handleEditClick = (inv: any) => {
    setEditingId(inv.id)
    setEditForm({
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
      amount: inv.amount ? inv.amount.toString() : ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    try {
      await fetch(`/api/invoices/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          invoiceDate: editForm.invoiceDate || null,
          amount: editForm.amount ? parseFloat(editForm.amount) : 0,
          ocrStatus: 'done',
          notes: 'SUCCESS'
        })
      })
      setEditingId(null)
      fetchSuppliers()
    } catch (e) {
      alert('Failed to save')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return alert('No invoices selected.')
    if (!confirm(`Are you sure you want to permanently delete ALL ${selectedIds.length} selected invoices?`)) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (res.ok) {
        setSelectedIds([])
        await fetchSuppliers()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete invoices')
      }
    } catch (err) {
      alert('An error occurred while deleting invoices')
    }
    setSaving(false)
  }

  // Removed useEffect for searchParams

  const fetchSuppliers = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('clientId', session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId)
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    const res = await fetch(`/api/suppliers?${params}`)
    const data = await res.json()
    setSuppliers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [session, filter])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  // Poll every 5 seconds if there are any invoices still processing
  useEffect(() => {
    const hasProcessing = suppliers.some(s => 
      s.invoices.some((i: any) => i.ocrStatus === 'pending' || i.ocrStatus === 'processing')
    )
    if (!hasProcessing) return
    
    const interval = setInterval(() => {
      fetchSuppliers()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [suppliers, fetchSuppliers])

  async function saveSupplier() {
    setSaving(true)
    const body: any = { ...supForm }
    if ((session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId)) body.clientId = session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId
    
    if (editSupplierId) {
      await fetch(`/api/suppliers/${editSupplierId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, name: body.name }) })
    } else {
      await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, name: body.name === 'Custom' ? body.customName : body.name }) })
    }
    
    setSaving(false); setShowSupplierForm(false); setSupForm({ name: '', customName: '', category: 'food', franchise: 'Combined' }); setEditSupplierId(null)
    fetchSuppliers()
  }

  async function saveInvoice() {
    if (!selectedSupplier) return alert('Please select a supplier first')
    if (!manualEntry && invFiles.length === 0) return alert('Please select an invoice file to upload')
    if (manualEntry && !invForm.amount) return alert('Please enter the invoice amount')
    if (manualEntry && !invForm.invoiceDate) return alert('Please enter the invoice date')
    setSaving(true)

    // For manual entry, handle it as a single request
    if (manualEntry) {
      const fd = new FormData()
      const placeholder = new Blob([`Manual entry: ${selectedSupplier.name} - ${invForm.invoiceDate} - £${invForm.amount}`], { type: 'text/plain' })
      fd.append('file', placeholder, `manual_${Date.now()}.txt`)
      fd.append('supplierId', selectedSupplier.id)
      fd.append('type', 'supplier')
      fd.append('clientId', (session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId) ?? '')
      fd.append('platform', invForm.store)
      if (invForm.amount) fd.append('amount', invForm.amount)
      if (invForm.invoiceDate) fd.append('invoiceDate', invForm.invoiceDate)
      
      const res = await fetch('/api/invoices', { method: 'POST', body: fd })
      if (!res.ok) {
        setSaving(false)
        const err = await res.json()
        alert(`Upload failed: ${err.error || 'Unknown error'}`)
        return
      }
      const inv = await res.json()
      await fetch(`/api/invoices/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrStatus: 'done', notes: 'Manual entry' })
      })
      setSaving(false); setShowInvoiceForm(false); setInvForm({ amount: '', invoiceDate: '', notes: '', store: 'Combined' }); setInvFiles([]); setManualEntry(false)
      fetchSuppliers()
      return
    }

    // For file uploads, loop through all files
    let hasErrors = false
    const uploadedInvoices = []
    
    for (const file of invFiles) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('supplierId', selectedSupplier.id)
      fd.append('type', 'supplier')
      fd.append('clientId', (session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId) ?? '')
      fd.append('platform', invForm.store)
      if (invForm.amount) fd.append('amount', invForm.amount)
      if (invForm.invoiceDate) fd.append('invoiceDate', invForm.invoiceDate)
      
      const res = await fetch('/api/invoices', { method: 'POST', body: fd })
      if (res.status === 409) {
        alert(`⚠️ Duplicate Invoice Detected for ${file.name}!\n\nThis exact invoice file has already been uploaded.`)
        continue
      }
      if (!res.ok) {
        hasErrors = true
        alert(`Upload failed for ${file.name}`)
        continue
      }
      const inv = await res.json()
      uploadedInvoices.push(inv)
    }

    setSaving(false)
    setShowInvoiceForm(false)
    setInvForm({ amount: '', invoiceDate: '', notes: '', store: 'Combined' })
    setInvFiles([])
    setManualEntry(false)
    fetchSuppliers()
    
    // Trigger OCR for all uploaded files in the background
    for (const inv of uploadedInvoices) {
      fetch(`/api/invoices/${inv.id}/ocr`, { method: 'POST' }).then(() => fetchSuppliers())
    }
  }

  const getInvoiceSplit = (franchise: string, platform: string, targetStore: 'Herbies Pizza' | 'Tasty Bun') => {
    if (franchise === 'Herbies Pizza') return targetStore === 'Herbies Pizza' ? 1 : 0
    if (franchise === 'Tasty Bun') return targetStore === 'Tasty Bun' ? 1 : 0
    
    // Combined supplier - look at invoice platform
    const plat = (platform || '').toLowerCase()
    const matchesHerbies = plat.includes('herbies')
    const matchesTasty = plat.includes('tasty')
    
    if (matchesHerbies) return targetStore === 'Herbies Pizza' ? 1 : 0
    if (matchesTasty) return targetStore === 'Tasty Bun' ? 1 : 0
    
    // Fallback: split 50/50
    return 0.5
  }

  const filteredSuppliers = suppliers
    .filter(s => {
      if (!storeFilter) return true;
      return !s.franchise || s.franchise === storeFilter || s.franchise === 'Combined'
    })
    .map(s => {
      return {
        ...s,
        invoices: s.invoices
          .filter((inv: any) => {
            if (!storeFilter) return true
            if (s.franchise === 'Herbies Pizza' || s.franchise === 'Tasty Bun') return true
            return inv.platform === storeFilter || inv.platform === 'Combined' || !inv.platform
          })
          .map((inv: any) => {
            let amount = inv.amount ?? 0
            let isSplit = false
            if (storeFilter) {
              const targetStore = storeFilter as 'Herbies Pizza' | 'Tasty Bun'
              const splitRatio = getInvoiceSplit(s.franchise, inv.platform || '', targetStore)
              amount = amount * splitRatio
              isSplit = splitRatio === 0.5
            }
            return {
              ...inv,
              amount,
              _isSplit: isSplit
            }
          })
          // Removed: .filter((inv: any) => inv.amount > 0) so user can see and edit invoices with missing amounts
      }
    })
    .filter(s => s.invoices.length > 0)

  const totalSpend = filteredSuppliers.reduce((a, s) => a + s.invoices.reduce((b: number, i: any) => b + (i.amount ?? 0), 0), 0)

  const displayedInvoices = filteredSuppliers
    .flatMap(s => s.invoices.map((i: any) => ({ ...i, supplierName: s.name })))
    .filter((inv: any) => !supplierFilter || inv.supplierName === supplierFilter)
    .sort((a: any, b: any) => {
      if (sortBy === 'uploadDate') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortBy === 'uploadDateAsc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortBy === 'amountDesc') {
        return (b.amount || 0) - (a.amount || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortBy === 'amountAsc') {
        return (a.amount || 0) - (b.amount || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortBy === 'invoiceDateAsc') {
        const dA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0 
        const dB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0
        return dA - dB || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        const dA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0
        const dB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0
        return dB - dA || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

  return (
    <div className="space-y-6">
      {/* ── Centered Header & Filters ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Top Row: Centered Title & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight">Suppliers</h1>
          <p className="text-slate-400 text-sm font-medium">Track supplier invoices and spending</p>
        </div>

        {/* Middle Row: Centered Filter & Action Toolbar */}
        <div className="flex justify-center items-center print:hidden">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-3 flex flex-wrap items-center justify-center gap-4 shadow-xl backdrop-blur-md">
            {/* Store toggle */}
            <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-[#1f2947] p-1 rounded-xl">
              <button onClick={() => setStoreFilter('')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === '' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Combined</button>
              <button onClick={() => setStoreFilter('Herbies Pizza')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === 'Herbies Pizza' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Herbies Pizza</button>
              <button onClick={() => setStoreFilter('Tasty Bun')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === 'Tasty Bun' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Tasty Bun</button>
            </div>

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            {/* Date Filter */}
            <DateFilter filter={filter} setFilter={setFilter} />

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            {/* Reset Button */}
            <button 
              onClick={() => { setFilter(defaultDateFilter()); setStoreFilter(''); setSupplierFilter(''); }} 
              className="text-slate-400 hover:text-white hover:bg-[#1f2947]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>

            {selectedIds.length > 0 && (
              <>
                <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>
                <button 
                  onClick={async () => {
                    if (!confirm(`Are you sure you want to completely delete ${selectedIds.length} invoices? All associated financial data will be instantly removed.`)) return
                    for (const id of selectedIds) {
                      await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
                    }
                    setSelectedIds([])
                    fetchSuppliers()
                  }}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  🗑 Delete ({selectedIds.length})
                </button>
              </>
            )}

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            {/* Upload Invoice Button */}
            <button 
              onClick={() => { setSelectedSupplier(null); setShowInvoiceForm(true) }}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> Upload Invoice
            </button>

            {/* Add Supplier Button */}
            <button 
              onClick={() => { setEditSupplierId(null); setSupForm({ name: '', customName: '', category: 'food', franchise: 'Combined' }); setShowSupplierForm(true) }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition shadow-lg shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> Add Supplier
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {/* Combined spend */}
        {(() => {
          const combinedSpend = suppliers.reduce((a, s) => a + s.invoices.reduce((b: number, i: any) => b + (i.amount ?? 0), 0), 0)
          const herbiesSpend = suppliers.reduce((a, s) => {
            return a + s.invoices.reduce((b: number, i: any) => b + (i.amount ?? 0) * getInvoiceSplit(s.franchise, i.platform || '', 'Herbies Pizza'), 0)
          }, 0)
          const tastyBunSpend = suppliers.reduce((a, s) => {
            return a + s.invoices.reduce((b: number, i: any) => b + (i.amount ?? 0) * getInvoiceSplit(s.franchise, i.platform || '', 'Tasty Bun'), 0)
          }, 0)
          return (
            <>
              <div className="bg-[#111520] border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4 flex-1 min-w-[160px]">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-xl">📦</div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Combined Spend</div>
                  <div className="text-2xl font-black text-orange-400">{gbp(combinedSpend)}</div>
                </div>
              </div>
              <div className="bg-[#111520] border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 flex-1 min-w-[160px]">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-xl">🍕</div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Herbies Pizza</div>
                  <div className="text-2xl font-black text-red-400">{gbp(herbiesSpend)}</div>
                </div>
              </div>
              <div className="bg-[#111520] border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-4 flex-1 min-w-[160px]">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-xl">🍔</div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasty Bun</div>
                  <div className="text-2xl font-black text-yellow-400">{gbp(tastyBunSpend)}</div>
                </div>
              </div>
            </>
          )
        })()}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-2 border-[#1f2947] border-t-blue-500 rounded-full animate-spin" /></div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">🛒</div>
          <h3 className="text-lg font-bold text-white mb-2">No suppliers found</h3>
          <p className="text-slate-500 text-sm">You haven't added any suppliers yet.</p>
        </div>
      ) : null}
      {/* Unified Invoices Table */}
      {!loading && filteredSuppliers.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">All Supplier Invoices</h3>
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-[#161b2c] border border-[#1f2947] text-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 transition cursor-pointer"
              >
                <option value="uploadDate">Sort: Upload Date (Newest)</option>
                <option value="uploadDateAsc">Sort: Upload Date (Oldest)</option>
                <option value="invoiceDate">Sort: Invoice Date (Newest)</option>
                <option value="invoiceDateAsc">Sort: Invoice Date (Oldest)</option>
                <option value="amountDesc">Sort: Amount (Highest)</option>
                <option value="amountAsc">Sort: Amount (Lowest)</option>
              </select>
              <select
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                className="bg-[#161b2c] border border-[#1f2947] text-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 transition cursor-pointer"
              >
                <option value="">All Suppliers</option>
                {Array.from(new Set(suppliers.map(s => s.name))).sort().map(name => (
                  <option key={name as string} value={name as string}>{name as string}</option>
                ))}
              </select>
              {selectedIds.length > 0 && (
                <button 
                  onClick={handleDeleteSelected}
                  disabled={saving}
                  className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-500/20 transition whitespace-nowrap disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
                </button>
              )}
            </div>
          </div>
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#161b2c] border-b border-[#1f2947] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={
                        displayedInvoices.length > 0 && 
                        selectedIds.length === displayedInvoices.length
                      }
                      onChange={(e) => {
                        const allIds = displayedInvoices.map((i: any) => i.id)
                        setSelectedIds(e.target.checked ? allIds : [])
                      }}
                      className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1f2947] text-blue-500 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-4 font-bold">Date</th>
                  <th className="px-5 py-4 font-bold">Week</th>
                  <th className="px-5 py-4 font-bold">Month</th>
                  <th className="px-5 py-4 font-bold">Supplier Name</th>
                  <th className="px-5 py-4 font-bold text-right">Amount</th>
                  <th className="px-5 py-4 font-bold">Status</th>
                  <th className="px-5 py-4 font-bold text-right">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2947]">
                {displayedInvoices.map((inv: any) => {
                  const targetDate = inv.invoiceDate ? new Date(inv.invoiceDate) : null
                  const weekStartDt = targetDate && !isNaN(targetDate.getTime()) ? getWeekStart(targetDate) : null
                  const weekEndDt = weekStartDt ? getWeekEnd(weekStartDt) : null
                  
                  const dateColStr = targetDate ? fmtDate(targetDate) : <span className="text-red-400 font-bold text-[10px] uppercase tracking-wider border border-red-500/20 bg-red-500/10 px-2.5 py-1 rounded-full">Missing</span>
                  const weekStr = weekStartDt && weekEndDt ? `${fmtDate(weekStartDt)} - ${fmtDate(weekEndDt)}` : '-'
                  const monthStr = targetDate ? targetDate.toLocaleString('en-GB', { month: 'short', year: 'numeric' }) : '-'
                  
                  const isEditing = editingId === inv.id
                  const isSelected = selectedIds.includes(inv.id)
                  
                  // Find the supplier name this invoice belongs to
                  const supplier = filteredSuppliers.find(s => s.id === inv.supplierId)
                  
                  return (
                  <tr key={inv.id} className={`hover:bg-[#161b2c]/50 transition ${isSelected ? 'bg-blue-500/5' : ''}`}>
                    <td className="px-5 py-4 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedIds(prev => prev.includes(inv.id) ? prev.filter(id => id !== inv.id) : [...prev, inv.id])
                        }}
                        className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1f2947] text-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-4 font-medium text-white">
                      {isEditing ? (
                        <input 
                          type="date" 
                          value={editForm.invoiceDate} 
                          onChange={e => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                          className="bg-[#1f2947] border border-[#2d3b5e] text-white text-xs rounded px-2 py-1 w-[110px]"
                          style={{ colorScheme: 'dark' }}
                        />
                      ) : (
                        <div onClick={() => handleEditClick(inv)} className="cursor-pointer hover:text-blue-400 inline-block">
                          {dateColStr}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">{weekStr}</td>
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">{monthStr}</td>
                    <td className="px-5 py-4">
                      {supplier?.name ? (
                        <span className="font-semibold">{supplier.name}</span>
                      ) : (
                        <span className="text-slate-500 italic">No supplier linked</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-white">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-400 text-xs font-normal">£</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editForm.amount} 
                            onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                            className="bg-[#1f2947] border border-[#2d3b5e] text-white text-xs rounded px-2 py-1 w-20 text-right font-normal"
                          />
                        </div>
                      ) : (
                        <div onClick={() => handleEditClick(inv)} className="cursor-pointer hover:text-blue-400 inline-flex items-center gap-1.5">
                          {inv.amount ? gbp(inv.amount) : '-'}
                          {inv._isSplit && <span className="text-[9px] font-bold text-slate-500 bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 rounded-full">½ split</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {inv.ocrStatus === 'done' ? <span className="text-emerald-400 font-semibold text-xs">Extracted ✅</span> :
                       (inv.ocrStatus === 'pending' || inv.ocrStatus === 'processing') ? <span className="text-amber-400 font-semibold text-xs">Processing ⏳</span> :
                       (inv.notes && inv.notes.includes('Duplicate')) ? <span className="text-orange-400 font-semibold text-xs">Duplicate ⚠️</span> :
                       <span className="text-red-400 font-semibold text-xs">Failed ❌</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {isEditing ? (
                          <>
                            <button onClick={handleSaveEdit} className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs">Save</button>
                            <span className="text-slate-700">|</span>
                            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300 font-semibold text-xs">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => handleEditClick(inv)} className="text-amber-400 hover:text-amber-300 font-semibold text-xs">Edit</button>
                        )}
                        <span className="text-slate-700">|</span>
                        <a href={inv.filePath} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold text-xs">View</a>
                        <span className="text-slate-700">|</span>
                        <button onClick={async () => {
                          if (!confirm('Are you sure you want to completely delete this invoice? All associated financial data will be instantly removed from the dashboard and overview.')) return
                          await fetch(`/api/invoices/${inv.id}`, { method: 'DELETE' })
                          fetchSuppliers()
                        }} className="text-red-400 hover:text-red-300 font-semibold text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">{editSupplierId ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Franchise</label>
                <select value={supForm.franchise} onChange={e => setSupForm({ ...supForm, franchise: e.target.value })}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition">
                  <option value="Combined">Both / Combined</option>
                  <option value="Herbies Pizza">Herbies Pizza</option>
                  <option value="Tasty Bun">Tasty Bun</option>
                </select>
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
            <h2 className="text-lg font-bold text-white mb-4">Add Invoice</h2>

            {/* Toggle Tabs */}
            <div className="flex bg-[#161b2c] rounded-xl p-1 mb-5 gap-1">
              <button
                onClick={() => setManualEntry(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!manualEntry ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                📎 Upload File
              </button>
              <button
                onClick={() => setManualEntry(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${manualEntry ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                ✏️ Manual Entry
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Supplier</label>
                <select value={selectedSupplier?.id || ''} onChange={e => setSelectedSupplier(suppliers.find(s => s.id === e.target.value) || null)}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition">
                  <option value="" disabled>Select a supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.franchise && s.franchise !== 'Combined' ? `(${s.franchise})` : ''}</option>
                  ))}
                </select>
              </div>

              {selectedSupplier?.franchise === 'Combined' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Assign to Store (Optional)</label>
                  <select value={invForm.store} onChange={e => setInvForm({ ...invForm, store: e.target.value })}
                    className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition mt-4">
                    <option value="Combined">Split 50/50 (Combined)</option>
                    <option value="Herbies Pizza">Herbies Pizza (100%)</option>
                    <option value="Tasty Bun">Tasty Bun (100%)</option>
                  </select>
                </div>
              )}

              {/* File Upload - only shown in Upload mode */}
              {!manualEntry && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Invoice File(s) (PDF or Image)</label>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${isDragging ? 'border-emerald-400 bg-emerald-500/10' : 'border-[#1f2947] hover:border-blue-500 bg-[#161b2c]/50'}`}
                    onClick={() => document.getElementById('inv-file-input')?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        setInvFiles(Array.from(e.dataTransfer.files));
                      }
                    }}
                  >
                    {invFiles.length > 0 ? (
                      <div className="text-sm font-bold text-emerald-400">
                        ✅ {invFiles.length} file(s) selected: {invFiles.map(f => f.name).slice(0, 2).join(', ')}{invFiles.length > 2 ? '...' : ''}
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl mb-1">📎</div>
                        <div className="text-sm font-bold text-white mb-0.5">Drag & drop your files here</div>
                        <div className="text-xs text-slate-400">or click to browse PDF or image files</div>
                      </>
                    )}
                  </div>
                  <input id="inv-file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                    onChange={e => {
                      if (e.target.files) {
                        setInvFiles(Array.from(e.target.files))
                      }
                    }} />
                </div>
              )}

              {/* Manual Entry notice */}
              {manualEntry && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-300">
                  ✏️ Enter the invoice details manually. Date and amount are required.
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Franchise / Store</label>
                <select value={invForm.store} onChange={e => setInvForm({ ...invForm, store: e.target.value })}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition">
                  <option value="Combined">Combined</option>
                  <option value="Herbies Pizza">Herbies Pizza</option>
                  <option value="Tasty Bun">Tasty Bun</option>
                </select>
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
                  {Object.entries(ocrResult).filter(([k]) => k !== 'rawText' && k !== 'items').map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-white font-semibold">{String(v)}</span>
                    </div>
                  ))}
                  {ocrResult.items && ocrResult.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20">
                      <div className="text-xs font-bold text-emerald-400 mb-2">Line Items ({ocrResult.items.length})</div>
                      <div className="space-y-1">
                        {ocrResult.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[11px] bg-black/20 rounded px-2 py-1">
                            <span className="text-slate-300 truncate max-w-[160px]">{item.quantity}x {item.description}</span>
                            <span className="text-white">{item.isVat ? '(VAT)' : ''} £{item.netAmount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowInvoiceForm(false); setOcrResult(null); setManualEntry(false) }} className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
              <button 
                onClick={saveInvoice} 
                disabled={saving || (!manualEntry && invFiles.length === 0)} 
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition"
              >
                {saving 
                  ? (manualEntry ? 'Saving…' : 'Uploading & Scanning…') 
                  : (manualEntry ? '💾 Save Record' : '📎 Upload & Scan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
