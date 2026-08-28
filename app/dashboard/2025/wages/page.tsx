import { HenleyWages } from '@/app/dashboard/expenses/wages/HenleyWages'

export default function Audit2025WagesPage() {
  return (
    <div className="space-y-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-6">
        <h1 className="text-xl font-bold text-red-400 mb-2">⚠️ 2025 Sandbox Uploads</h1>
        <p className="text-slate-300 text-sm">
          Any wages added here will automatically be isolated into the 2025 Audit database. 
          They will NOT appear in your main wages tab or affect your live dashboard calculations.
        </p>
      </div>
      <HenleyWages is2025={true} />
    </div>
  )
}
