import { HenleyExpenses } from '@/app/dashboard/expenses/HenleyExpenses'

export default function Audit2025ExpensesPage() {
  return (
    <div className="space-y-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-6">
        <h1 className="text-xl font-bold text-red-400 mb-2">⚠️ 2025 Sandbox Expenses</h1>
        <p className="text-slate-300 text-sm">
          Expenses added here are securely locked into the 2025 Audit database. 
          They will not touch your live day-to-day books.
        </p>
      </div>
      <HenleyExpenses is2025={true} />
    </div>
  )
}
