'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { gbp, fmtDate, getWeekStart, getWeekEnd } from '@/lib/utils'
import DateFilter, { defaultDateFilter } from '@/components/DateFilter'

function InvoicesContent() {
  const { data: session } = useSession()
  const [invoices, setInvoices] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
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
          amount: editForm.amount ? parseFloat(editForm.amount) : 0
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
  const [posFilter, setPosFilter] = useState('')
  const [storeFilter, setStoreFilter] = useState('')

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'all')
  }, [searchParams])
  
  // Form State
  const [type, setType] = useState('supplier')
  const [supplierId, setSupplierId] = useState('')
  const [platformName, setPlatformName] = useState('Hungry Birds Deliveroo')
  const [posName, setPosName] = useState('Walk-in Card')
  const [utilityName, setUtilityName] = useState('Electricity')

  const uniqueSuppliers = Array.from(new Map((Array.isArray(suppliers) ? suppliers : []).map(s => [s.name, s])).values())

  const tabs = [
    { id: 'all', label: 'Combined Sales Invoices Data' },
    { id: 'pos', label: 'Hungry Birds POS (Walk-in Card, Cash & POS)' },
    { id: 'platform', label: 'Uber Eats, Just Eat, Deliveroo Invoices' }
  ]

  // Strictly filter out supplier expenses on Sales Invoices page!
  const filteredInvoices = invoices.filter(inv => {
    if (inv.type === 'supplier' || inv.type === 'stock') return false; // REMOVE SUPPLIER EXPENSES FROM SALES INVOICES PAGE
    if (activeTab !== 'all' && inv.type !== activeTab) return false;
    if (storeFilter && inv.platform && !inv.platform.includes(storeFilter)) return false;
    if (posFilter && activeTab === 'pos' && inv.platform && !inv.platform.includes(posFilter)) return false;

    if (filter.from || filter.to) {
      const targetDate = inv.invoiceDate ? new Date(inv.invoiceDate) : null
      const weekStartDt = targetDate && !isNaN(targetDate.getTime()) ? getWeekStart(targetDate) : null
      const weekEndDt = weekStartDt ? getWeekEnd(weekStartDt) : null
      const primaryDate = (inv.type === 'platform' && weekEndDt) ? weekEndDt : targetDate

      if (primaryDate) {
        const pTime = primaryDate.getTime()
        if (filter.from) {
          const fromTime = new Date(filter.from).getTime()
          if (pTime < fromTime) return false
        }
        if (filter.to) {
          const toTime = new Date(filter.to)
          toTime.setHours(23, 59, 59, 999)
          if (pTime > toTime.getTime()) return false
        }
      }
    }

    return true;
  })
  const [amount, setAmount] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    const currentClientId = session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId;
    if (!currentClientId) return;

    try {
      const params = new URLSearchParams()
      params.set('clientId', currentClientId)
      if (filter.from) params.set('from', filter.from)
      if (filter.to) params.set('to', filter.to)
      if (platformFilter && activeTab === 'platform') params.set('platform', platformFilter)
      
      const supplierParams = new URLSearchParams()
      supplierParams.set('clientId', currentClientId)

      const [invRes, supRes] = await Promise.all([
        fetch(`/api/invoices?${params}`).then(r => r.json()),
        fetch(`/api/suppliers?${supplierParams}`).then(r => r.json()),
      ])
      setInvoices(Array.isArray(invRes) ? invRes : [])
      setSuppliers(Array.isArray(supRes) ? supRes : [])
    } catch (err) {
      console.error("Failed to fetch invoices", err)
      setInvoices([])
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    fetchData() 
  }, [session?.user?.role, session?.user?.clientId, filter.from, filter.to, platformFilter, activeTab])

  // Poll if any invoices are processing
  useEffect(() => {
    const hasProcessing = invoices.some(inv => inv.ocrStatus === 'processing' || inv.ocrStatus === 'pending')
    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchData()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [invoices, filter.from, filter.to, platformFilter, activeTab])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const files = fileInputRef.current?.files
    if (!files || files.length === 0) return alert('Please select at least one file')

    setUploading(true)
    setUploadProgress('')
    
    try {
      const currentClientId = session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId;

      if (type === 'supplier' || type === 'stock') {
        const formData = new FormData()
        Array.from(files).forEach(file => formData.append('file', file))
        formData.append('type', type)
        if (currentClientId) formData.append('clientId', currentClientId)
        if (type === 'platform' && platformName) formData.append('platform', platformName)
        if (type === 'pos' && posName) formData.append('platform', posName)

        const res = await fetch('/api/invoices', { method: 'POST', body: formData })
        setUploadProgress('Extracting data via Gemini...')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Upload failed`)
        }
        const newInvoice = await res.json()
        
        // Background OCR
        fetch(`/api/invoices/${newInvoice.id}/ocr`, { method: 'POST' }).then(() => fetchData()).catch(() => {})
      } else {
        // For platform/pos invoices, upload them one by one
        let i = 0;
        const total = Array.from(files).length;
        const uploadedInvoices: any[] = [];
        const errors: string[] = [];
        
        for (const file of Array.from(files)) {
          i++;
          setUploadProgress(`Uploading ${i} of ${total}...`)
          const formData = new FormData()
          formData.append('file', file)
          formData.append('type', type)
          if (currentClientId) formData.append('clientId', currentClientId)
          if (type === 'platform' && platformName) formData.append('platform', platformName)
          if (type === 'pos' && posName) formData.append('platform', posName)

          try {
            const res = await fetch('/api/invoices', { method: 'POST', body: formData })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.error || `Upload failed`)
            }
            const newInvoice = await res.json()
            uploadedInvoices.push(newInvoice)
          } catch (e: any) {
            errors.push(`${file.name}: ${e.message}`)
          }
        }
        
        if (errors.length > 0) {
          alert(`Some files failed to upload:\n${errors.join('\n')}`)
        }
        
        // Fire all OCR requests concurrently to the backend instantly. 
        // The backend handles rate limiting via exponential backoff.
        // This ensures that if the user refreshes the page, the backend has already received the requests.
        if (uploadedInvoices.length > 0) {
          uploadedInvoices.forEach(inv => {
            fetch(`/api/invoices/${inv.id}/ocr`, { method: 'POST' })
              .then(() => fetchData())
              .catch(() => {})
          })
        }
      }
      
      setIsModalOpen(false)
      setSupplierId('')
      setPlatformName('Hungry Birds Deliveroo')
      setUtilityName('Electricity')
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      await fetchData() // Refresh immediately to show them in "Processing" state
      
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
        return { title: 'Delivery Platforms (Uber Eats, Just Eat, Deliveroo)', desc: 'Manage your delivery app weekly sales statements.', buttonText: '+ Upload Delivery Statement' }
      case 'pos':
        return { title: 'POS & Walk-in Sales (Card, Cash & POS)', desc: 'Manage walk-in card machine statements, walk-in cash sales, and in-store POS sales.', buttonText: '+ Upload Card/POS Statement' }
      case 'all':
      default:
        return { title: 'Combined Sales Statements Data', desc: 'Master view combining all POS and delivery platform sales statements.', buttonText: '+ Upload Sales Statement' }
    }
  }
  const header = getHeaderContent()

  return (
    <div className="space-y-6">
      {/* Centered Title & Description */}
      <div className="text-center space-y-1.5 py-2">
        <h1 className="text-3xl font-black text-white tracking-tight">{header.title}</h1>
        <p className="text-slate-400 text-sm font-medium">{header.desc}</p>
      </div>

      {/* Filter Toolbar & Upload Action Underneath */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#111520]/50 border border-[#1f2947] rounded-2xl p-4 backdrop-blur-sm shadow-lg">
        <div className="flex gap-3 flex-wrap items-center w-full sm:w-auto">
          {activeTab === 'all' && (
            <>
              <select
                value={storeFilter}
                onChange={e => setStoreFilter(e.target.value)}
                className="bg-transparent text-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#111520] text-white">All Platforms</option>
                <option value="Just Eat" className="bg-[#111520] text-white">Just Eat</option>
                <option value="Uber Eats" className="bg-[#111520] text-white">Uber Eats</option>
                <option value="Deliveroo" className="bg-[#111520] text-white">Deliveroo</option>
                <option value="Cash" className="bg-[#111520] text-emerald-400 font-bold">💵 Walk-in Cash</option>
                <option value="Card" className="bg-[#111520] text-purple-400 font-bold">💳 Walk-in Card</option>
                <option value="POS" className="bg-[#111520] text-blue-400 font-bold">🖥️ POS Sales</option>
              </select>
              <div className="w-[1px] h-4 bg-[#1f2947]"></div>
            </>
          )}
          {activeTab === 'platform' && (
            <>
              <select
                value={platformFilter}
                onChange={e => setPlatformFilter(e.target.value)}
                className="bg-transparent text-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#111520] text-white">All Delivery Platforms</option>
                <option value="Uber Eats" className="bg-[#111520] text-white">Uber Eats</option>
                <option value="Just Eat" className="bg-[#111520] text-white">Just Eat</option>
                <option value="Deliveroo" className="bg-[#111520] text-white">Deliveroo</option>
              </select>
              <div className="w-[1px] h-4 bg-[#1f2947]"></div>
            </>
          )}
          {activeTab === 'pos' && (
            <>
              <select
                value={posFilter}
                onChange={e => setPosFilter(e.target.value)}
                className="bg-transparent text-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#111520] text-white">All POS & Walk-in Sales</option>
                <option value="Cash" className="bg-[#111520] text-emerald-400 font-bold">💵 Walk-in Cash</option>
                <option value="Card" className="bg-[#111520] text-purple-400 font-bold">💳 Walk-in Card</option>
                <option value="POS" className="bg-[#111520] text-blue-400 font-bold">🖥️ POS Sales</option>
              </select>
              <div className="w-[1px] h-4 bg-[#1f2947]"></div>
            </>
          )}
          <DateFilter filter={filter} setFilter={setFilter} />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              disabled={uploading}
              className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/20 transition whitespace-nowrap disabled:opacity-50"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={() => {
              setType(activeTab === 'all' ? 'platform' : activeTab)
              setIsModalOpen(true)
            }}
            disabled={uploading}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {header.buttonText}
          </button>
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
                const aProcessing = a.ocrStatus === 'processing' || a.ocrStatus === 'pending' ? 1 : 0
                const bProcessing = b.ocrStatus === 'processing' || b.ocrStatus === 'pending' ? 1 : 0
                if (aProcessing !== bProcessing) return bProcessing - aProcessing

                const dA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : new Date(a.createdAt).getTime()
                const dB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : new Date(b.createdAt).getTime()
                return dB - dA || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
                    {inv.platform ? (
                      <span className="font-semibold text-white">
                        {inv.platform.replace(/^Hungry Birds\s*/i, '')}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">No channel linked</span>
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
            <h2 className="text-lg font-bold text-white mb-5">
              {type === 'pos' ? 'Upload POS / Bank Statement' : 'Upload Delivery Platform Invoice'}
            </h2>
            <form onSubmit={handleUpload} className="space-y-4">
              {type === 'platform' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Select Delivery Platform</label>
                  <select value={platformName} onChange={e => setPlatformName(e.target.value)} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm">
                    <option value="Deliveroo">Deliveroo</option>
                    <option value="Just Eat">Just Eat</option>
                    <option value="Uber Eats">Uber Eats</option>
                  </select>
                </div>
              )}
              
              {type === 'pos' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Select Statement Source</label>
                  <select value={posName} onChange={e => setPosName(e.target.value)} className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm">
                    <option value="Walk-in Card">Walk-in Card</option>
                    <option value="Walk-in Cash">Walk-in Cash</option>
                    <option value="POS Sales">POS Sales</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Upload File (PDF/Image)</label>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" required className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 transition cursor-pointer" />
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border border-[#1f2947] text-slate-400 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {uploading ? (uploadProgress || 'Uploading...') : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function HungryBirdsInvoices() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-t-blue-500 rounded-full animate-spin" /></div>}>
      <InvoicesContent />
    </Suspense>
  )
}
