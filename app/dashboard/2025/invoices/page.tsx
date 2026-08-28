import { HenleyInvoices } from '@/app/dashboard/invoices/HenleyInvoices'

export default function Audit2025InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-6">
        <h1 className="text-xl font-bold text-red-400 mb-2">⚠️ 2025 Sandbox Uploads</h1>
        <p className="text-slate-300 text-sm">
          Any files (POS, Invoices, Receipts) uploaded here will automatically be isolated into the 2025 Audit database. 
          They will NOT appear in your main invoices tab or affect your live dashboard calculations.
        </p>
      </div>
      <HenleyInvoices is2025={true} />
    </div>
  )
}
