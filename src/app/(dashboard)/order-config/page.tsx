import { Suspense } from 'react'
import { SettingsPage } from '@/features/settings/settings-page'

export default function Page() {
  return <Suspense fallback={<div className="order-config-loading">Loading order configuration…</div>}><SettingsPage /></Suspense>
}
