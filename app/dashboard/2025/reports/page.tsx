import { HenleyReports } from '@/app/dashboard/reports/HenleyReports'

export default function Audit2025ReportsPage() {
  return (
    <div className="space-y-6">
      <HenleyReports is2025={true} />
    </div>
  )
}
