'use client'

import { AlertCircle } from 'lucide-react'

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="panel unavailable"><AlertCircle /><h2>Unable to open this dashboard page</h2><p>The page encountered an unexpected error. Your data was not changed.</p><button className="primary" onClick={reset}>Try again</button></section>
}
