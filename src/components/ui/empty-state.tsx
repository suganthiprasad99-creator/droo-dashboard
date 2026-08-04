import { Activity, Layers3 } from 'lucide-react'

export function EmptyState({ loading, error }: { loading: boolean; error?: string }) {
  return <div className="empty"><div className="empty-icon">{loading ? <Activity className="spin" /> : <Layers3 />}</div><strong>{loading ? 'Loading operational data' : error || 'No records found'}</strong><span>{error ? 'Configure authentication and confirm the Droo API is running.' : 'Records returned by the API will appear here.'}</span></div>
}
