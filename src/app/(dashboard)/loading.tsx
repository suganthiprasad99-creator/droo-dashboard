import { Activity } from 'lucide-react'

export default function DashboardLoading() {
  return <div className="empty"><div className="empty-icon"><Activity className="spin" /></div><strong>Loading Droo Operations</strong><span>Preparing the latest operational view.</span></div>
}
