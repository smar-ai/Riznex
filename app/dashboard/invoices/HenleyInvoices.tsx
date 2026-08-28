'use client'
import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { gbp, fmtDate, getWeekStart, getWeekEnd } from '@/lib/utils'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

function InvoicesContent({ is2025 = false }: { is2025?: boolean }) {
  const { data: session } = useSession()
  const [invoices, setInvoices] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ invoiceDate: string, amount: string }>({ invoiceDate: '', amount: '' })
  const [selectedIds, setSelectedIds] = useState<string[]>([])

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
      fetchData() // Refresh data
    } catch (e) {
      alert('Failed to save')
    }
  }
  
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'all'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [filter, setFilter] = useState(defaultDateFilter())
  const [platformFilter, setPlatformFilter] = useState('')
  const [storeFilter, setStoreFilter] = useState(is2025 ? 'Herbies Pizza' : '')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'all')
  }, [searchParams])
  
  // Form State
  const [type, setType] = useState('supplier')
  const [supplierId, setSupplierId] = useState('')
  const [platformName, setPlatformName] = useState('Herbies Pizza Deliveroo')
  const [posName, setPosName] = useState('Herbies Pizza POS')
  const [utilityName, setUtilityName] = useState('Electricity')
  const [mergeFiles, setMergeFiles] = useState(false)

  const uniqueSuppliers = Array.from(new Map((Array.isArray(suppliers) ? suppliers : []).map(s => [s.name, s])).values())

  const tabs = [
    { id: 'all', label: 'All Invoices' },
    { id: 'platform', label: 'Uber Eats, Just Eat, Deliveroo Invoices' },
    { id: 'pos', label: is2025 ? 'Herbies Pizza POS Invoices' : 'Herbies Pizza & Tasty Bun POS Invoices' }
  ]

  const filteredInvoices = invoices.filter(inv => {
    if (inv.type === 'supplier') return false;
    if (activeTab !== 'all' && inv.type !== activeTab) return false;
    if (storeFilter && inv.platform && !inv.platform.includes(storeFilter)) return false;
    if (statusFilter && inv.ocrStatus !== statusFilter) return false;

    // Evaluate primaryDate (week-end date for platform statements) against filter range
    const targetDate = inv.invoiceDate ? new Date(inv.invoiceDate) : null;
    const weekStartDt = targetDate && !isNaN(targetDate.getTime()) ? getWeekStart(targetDate) : null;
    const weekEndDt = weekStartDt ? getWeekEnd(weekStartDt) : null;
    const primaryDate = (inv.type === 'platform' && weekEndDt) ? weekEndDt : targetDate;

    if (filter.from && primaryDate) {
      const fromDt = new Date(filter.from);
      fromDt.setUTCHours(0, 0, 0, 0);
      if (primaryDate < fromDt) return false;
    }
    if (filter.to && primaryDate) {
      const toDt = new Date(filter.to);
      toDt.setUTCHours(23, 59, 59, 999);
      if (primaryDate > toDt) return false;
    }

    return true;
  })
  const [amount, setAmount] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragFileNames, setDragFileNames] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sortBy, setSortBy] = useState<string>('invoiceDate')

  const fetchData = useCallback(async () => {
    if (!session) return
    const params = new URLSearchParams()
    if (filter.from) params.set('from', filter.from)
    if (filter.to) params.set('to', filter.to)
    if (platformFilter) params.set('platform', platformFilter)
    if (is2025) params.set('is2025', 'true')
    const [invRes, supRes] = await Promise.all([
      fetch(`/api/invoices?${params}`).then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json()),
    ])
    setInvoices(invRes || [])
    setSuppliers(supRes || [])
    
    setLoading(false)
  }, [session, filter, platformFilter, is2025])

  useEffect(() => { fetchData() }, [fetchData])

  // Poll every 5 seconds if there are any invoices still processing
  useEffect(() => {
    const hasProcessing = invoices.some((i: any) => i.ocrStatus === 'pending' || i.ocrStatus === 'processing')
    if (!hasProcessing) return
    
    const interval = setInterval(() => {
      fetchData()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [invoices, fetchData])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const files = fileInputRef.current?.files
    if (!files || files.length === 0) return alert('Please select at least one file')

    setUploading(true)
    
    try {
      const clientId = session?.user?.role === 'admin'
        ? (session?.user?.clientId || 'cmpv4dvik0000vdj089wl6zmf')
        : (session?.user?.clientId || 'cmpv4dvik0000vdj089wl6zmf')

      if (files.length > 1 && !mergeFiles) {
        // Process each file as a separate invoice
        const fileArray = Array.from(files)
        setIsModalOpen(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        
        let errors: string[] = []
        for (const file of fileArray) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('type', type)
          formData.append('clientId', clientId)
          if (type === 'platform' && platformName) formData.append('platform', platformName)
          if (type === 'pos' && posName) formData.append('platform', posName)
          if (is2025) formData.append('is2025', 'true')

          const res = await fetch('/api/invoices', { method: 'POST', body: formData })
          if (res.ok) {
            const newInvoice = await res.json()
            fetch(`/api/invoices/${newInvoice.id}/ocr`, { method: 'POST' }).then(() => fetchData()).catch(() => {})
          } else {
            const data = await res.json().catch(() => ({}))
            errors.push(`${file.name}: ${data.error || 'Upload failed'}`)
          }
        }
        await fetchData()
        if (errors.length > 0) {
          alert(`Some files failed to upload:\n\n${errors.join('\n')}`)
        }
      } else {
        // Process as single (merged) invoice
        const formData = new FormData()
        Array.from(files).forEach(file => formData.append('file', file))
        formData.append('type', type)
        formData.append('clientId', clientId)
        if (type === 'platform' && platformName) formData.append('platform', platformName)
        if (type === 'pos' && posName) formData.append('platform', posName)
        if (is2025) formData.append('is2025', 'true')

        const res = await fetch('/api/invoices', { method: 'POST', body: formData })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Upload failed`)
        }
        const newInvoice = await res.json()
        
        setIsModalOpen(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        
        await fetchData()
        await fetch(`/api/invoices/${newInvoice.id}/ocr`, { method: 'POST' }).catch(() => {})
        await fetchData()
      }

      setSupplierId('')
      setPlatformName('Herbies Pizza Deliveroo')
      setUtilityName('Electricity')
      
    } catch (err: any) {
      alert(err.message || 'Upload failed')
    }
    
    setUploading(false)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return alert('No invoices selected.')
    if (!confirm(`Are you sure you want to permanently delete ALL ${selectedIds.length} selected invoices? This will also remove any linked sales and expenses.`)) return
    
    setUploading(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })
      
      if (res.ok) {
        setSelectedIds([])
        await fetchData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete invoices')
      }
    } catch (err) {
      alert('An error occurred while deleting invoices')
    }
    setUploading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This will also remove any linked sales and update your dashboard totals.')) return

    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete invoice')
      }
    } catch (err) {
      alert('An error occurred while deleting the invoice')
    }
  }

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-t-blue-500 rounded-full animate-spin" /></div>

  const getHeaderContent = () => {
    switch (activeTab) {
      case 'platform':
        return { title: 'Platform Invoices', desc: 'Manage your Uber Eats, Just Eat, and Deliveroo statements.', buttonText: '+ Upload Platform Invoice' }
      case 'pos':
        return { title: is2025 ? 'Herbies Pizza POS Invoices' : 'Herbies & Tasty Bun POS Invoices', desc: 'Manage invoices from your internal POS systems.', buttonText: '+ Upload POS Invoice' }
      case 'all':
      default:
        return { title: 'All Sales Invoices', desc: 'Overview of all your POS and platform statements.', buttonText: '+ Upload Invoice' }
    }
  }
  const header = getHeaderContent()

  return (
    <div className="space-y-6">
      {/* ── Centered Header & Filters ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Top Row: Centered Title & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight">{header.title}</h1>
          <p className="text-slate-400 text-sm font-medium">{header.desc}</p>
        </div>

        {/* Middle Row: Centered Filter & Action Toolbar */}
        <div className="flex justify-center items-center print:hidden">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-3 flex flex-wrap items-center justify-center gap-4 shadow-xl backdrop-blur-md">
            {!is2025 && (
              <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-[#1f2947] p-1 rounded-xl">
                <button
                  onClick={() => setStoreFilter('')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === '' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  Combined
                </button>
                <button
                  onClick={() => setStoreFilter('Herbies Pizza')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === 'Herbies Pizza' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  Herbies Pizza
                </button>
                <button
                  onClick={() => setStoreFilter('Tasty Bun')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${storeFilter === 'Tasty Bun' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  Tasty Bun
                </button>
              </div>
            )}

            {!is2025 && <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>}

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-300 hover:text-white text-xs font-bold focus:outline-none cursor-pointer transition-colors"
            >
              <option value="" className="bg-[#111520] text-white">All Statuses</option>
              <option value="done" className="bg-[#111520] text-white">Done</option>
              <option value="processing" className="bg-[#111520] text-white">Processing</option>
              <option value="pending" className="bg-[#111520] text-white">Pending</option>
              <option value="error" className="bg-[#111520] text-white">Error</option>
            </select>

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <DateFilter filter={filter} setFilter={setFilter} />

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <button 
              onClick={() => { setFilter(defaultDateFilter()); setStoreFilter(''); setStatusFilter(''); setSearchQuery(''); }} 
              className="text-slate-400 hover:text-white hover:bg-[#1f2947]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>

            {selectedIds.length > 0 && (
              <>
                <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>
                <button 
                  onClick={handleDeleteSelected}
                  disabled={uploading}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  🗑️ Delete ({selectedIds.length})
                </button>
              </>
            )}

            <div className="w-[1px] h-5 bg-[#1f2947] hidden sm:block"></div>

            <button 
              onClick={() => {
                setType(activeTab === 'all' ? 'platform' : activeTab)
                if (storeFilter === 'Tasty Bun') {
                  setPlatformName('Tasty Bun Deliveroo')
                  setPosName('Tasty Bun POS')
                } else {
                  setPlatformName('Herbies Pizza Deliveroo')
                  setPosName('Herbies Pizza POS')
                }
                setIsModalOpen(true)
              }}
              disabled={uploading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition whitespace-nowrap disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> {header.buttonText}
            </button>
          </div>
        </div>
      </div>


      {filteredInvoices.length === 0 ? (
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">🧾</div>
          <h3 className="text-lg font-bold text-white mb-2">No invoices found</h3>
          <p className="text-slate-500 text-sm">There are no invoices matching this category.</p>
        </div>
      ) : (
        <div className="bg-[#111520] border border-[#1f2947] rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#161b2c] border-b border-[#1f2947] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(filteredInvoices.map((inv: any) => inv.id))
                      else setSelectedIds([])
                    }}
                    className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1f2947] text-blue-500 focus:ring-blue-500 focus:ring-offset-[#111520] cursor-pointer"
                  />
                </th>
                <th className="px-5 py-4 font-bold">Date</th>
                <th className="px-5 py-4 font-bold">Week</th>
                <th className="px-5 py-4 font-bold">Month</th>
                <th className="px-5 py-4 font-bold">Details</th>
                <th className="px-5 py-4 font-bold text-right">Amount</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4 font-bold text-right">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2947]">
              {[...filteredInvoices].sort((a, b) => {
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
              }).map((inv: any) => {
                const targetDate = inv.invoiceDate ? new Date(inv.invoiceDate) : null
                const weekStartDt = targetDate && !isNaN(targetDate.getTime()) ? getWeekStart(targetDate) : null
                const weekEndDt = weekStartDt ? getWeekEnd(weekStartDt) : null
                
                const primaryDate = (inv.type === 'platform' && weekEndDt) ? weekEndDt : targetDate
                
                const dateColStr = primaryDate ? fmtDate(primaryDate) : <span className="text-red-400 font-bold text-[10px] uppercase tracking-wider border border-red-500/20 bg-red-500/10 px-2.5 py-1 rounded-full">Missing</span>
                const weekStr = weekStartDt && weekEndDt ? `${fmtDate(weekStartDt)} - ${fmtDate(weekEndDt)}` : '-'
                const monthStr = primaryDate ? primaryDate.toLocaleString('en-GB', { month: 'short', year: 'numeric' }) : '-'
                
                const isEditing = editingId === inv.id
                const isSelected = selectedIds.includes(inv.id)
                
                return (
                <tr key={inv.id} className={`hover:bg-[#161b2c]/50 transition ${isSelected ? 'bg-blue-500/5' : ''}`}>
                  <td className="px-5 py-4 w-12 text-center">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedIds(prev => prev.includes(inv.id) ? prev.filter(id => id !== inv.id) : [...prev, inv.id])
                      }}
                      className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1f2947] text-blue-500 focus:ring-blue-500 focus:ring-offset-[#111520] cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-4 font-medium text-white">
                    {isEditing ? (
                      <input 
                        type="date" 
                        value={editForm.invoiceDate} 
                        onChange={e => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                        className="bg-[#1f2947] border border-[#2d3b5e] text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500 w-[110px]"
                        style={{ colorScheme: 'dark' }}
                      />
                    ) : (
                      <div onClick={() => handleEditClick(inv)} className="cursor-pointer hover:text-blue-400 inline-block" title="Click to edit date">
                        {dateColStr}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-400 whitespace-nowrap">{weekStr}</td>
                  <td className="px-5 py-4 text-slate-400 whitespace-nowrap">{monthStr}</td>
                  <td className="px-5 py-4">
                    {inv.supplier?.name ? (
                      <span className="font-semibold">{inv.supplier.name}</span>
                    ) : inv.platform ? (
                      <span className="font-semibold">{inv.platform}</span>
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
                          className="bg-[#1f2947] border border-[#2d3b5e] text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500 w-20 text-right font-normal"
                        />
                      </div>
                    ) : (
                      <div onClick={() => handleEditClick(inv)} className="cursor-pointer hover:text-blue-400 inline-block" title="Click to edit amount">
                        {inv.amount ? gbp(inv.amount) : '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {inv.ocrStatus === 'done' ? <span className="text-emerald-400 font-semibold text-xs" title="Data extracted successfully">Extracted ✅</span> :
                     (inv.ocrStatus === 'pending' || inv.ocrStatus === 'processing') ? <span className="text-amber-400 font-semibold text-xs" title="Processing with AI...">Processing ⏳</span> :
                     (inv.notes && inv.notes.includes('Duplicate')) ? <span className="text-orange-400 font-semibold text-xs" title={inv.notes}>Duplicate ⚠️</span> :
                     <span className="text-red-400 font-semibold text-xs" title={inv.notes || 'Processing failed'}>Failed ❌</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {isEditing ? (
                        <>
                          <button onClick={handleSaveEdit} className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs transition bg-transparent border-0 cursor-pointer whitespace-nowrap">Save</button>
                          <span className="text-slate-700">|</span>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300 font-semibold text-xs transition bg-transparent border-0 cursor-pointer whitespace-nowrap">Cancel</button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleEditClick(inv)}
                          className="text-amber-400 hover:text-amber-300 font-semibold text-xs transition bg-transparent border-0 cursor-pointer whitespace-nowrap"
                        >
                          Edit
                        </button>
                      )}
                      <span className="text-slate-700">|</span>
                      <a href={inv.filePath} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold text-xs transition whitespace-nowrap">
                        View File
                      </a>
                      <span className="text-slate-700">|</span>
                      <button 
                        onClick={() => handleDelete(inv.id)} 
                        className="text-red-400 hover:text-red-300 font-semibold text-xs transition bg-transparent border-0 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">Upload Invoice</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              {['supplier', 'stock'].includes(type) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Invoice Type</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm">
                    <option value="supplier">Supplier Invoice (Food, Drink, Misc)</option>
                    <option value="stock">Stock Count / Inventory</option>
                  </select>
                </div>
              )}
              {(type === 'platform' || type === 'pos') && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Store</label>
                    <select 
                      value={type === 'pos' ? posName.replace(' POS', '') : platformName.replace(' Deliveroo', '').replace(' Just Eat', '').replace(' Uber Eats', '')} 
                      onChange={e => {
                        const store = e.target.value;
                        if (type === 'pos') {
                          setPosName(`${store} POS`);
                        } else {
                          const currentPlat = platformName.replace('Herbies Pizza ', '').replace('Tasty Bun ', '');
                          setPlatformName(`${store} ${currentPlat}`);
                        }
                      }} 
                      className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm"
                    >
                      <option value="Herbies Pizza">Herbies Pizza</option>
                      {!is2025 && <option value="Tasty Bun">Tasty Bun</option>}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Platform</label>
                    <select 
                      value={type === 'pos' ? 'POS' : platformName.replace('Herbies Pizza ', '').replace('Tasty Bun ', '')} 
                      onChange={e => {
                        const plat = e.target.value;
                        if (plat === 'POS') {
                          setType('pos');
                          const currentStore = posName.replace(' POS', '');
                          setPosName(`${currentStore} POS`);
                        } else {
                          setType('platform');
                          const currentStore = type === 'pos' ? posName.replace(' POS', '') : platformName.replace(' Deliveroo', '').replace(' Just Eat', '').replace(' Uber Eats', '');
                          setPlatformName(`${currentStore} ${plat}`);
                        }
                      }} 
                      className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm"
                    >
                      <option value="Deliveroo">Deliveroo</option>
                      <option value="Just Eat">Just Eat</option>
                      <option value="Uber Eats">Uber Eats</option>
                      <option value="POS">In-Store POS</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Upload File (PDF/Image)</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-[#1f2947] hover:border-blue-500 bg-[#161b2c]/50'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const dt = new DataTransfer();
                      Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
                      if (fileInputRef.current) {
                        fileInputRef.current.files = dt.files;
                        setDragFileNames(Array.from(dt.files).map(f => f.name));
                      }
                    }
                  }}
                >
                  {dragFileNames.length > 0 ? (
                    <div className="text-sm font-bold text-emerald-400">
                      ✅ {dragFileNames.length} file(s) selected: {dragFileNames.slice(0, 2).join(', ')}{dragFileNames.length > 2 ? '...' : ''}
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl mb-1">📎</div>
                      <div className="text-sm font-bold text-white mb-0.5">Drag & drop your files here</div>
                      <div className="text-xs text-slate-400">or click to browse PDF or image files</div>
                    </>
                  )}
                </div>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  multiple 
                  accept=".pdf,image/*,.jpg,.jpeg,.png,.webp" 
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setDragFileNames(Array.from(e.target.files).map(f => f.name));
                    }
                  }}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={mergeFiles} onChange={e => setMergeFiles(e.target.checked)} className="rounded border-[#1f2947] bg-[#161b2c] text-blue-500 cursor-pointer" />
                  <span className="text-xs font-semibold text-slate-400">Merge into single invoice (for multi-page docs)</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {uploading ? 'Uploading...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function HenleyInvoices({ is2025 = false }: { is2025?: boolean }) {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-t-blue-500 rounded-full animate-spin" /></div>}>
      <InvoicesContent is2025={is2025} />
    </Suspense>
  )
}
