import { HenleyDashboard } from '@/app/dashboard/HenleyDashboard'

export default function Audit2025OverviewPage() {
  return (
    <div className="space-y-6">
      <HenleyDashboard is2025={true} />
    </div>
  )
}
