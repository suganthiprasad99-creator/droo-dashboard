import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { OverviewPage } from '@/features/overview/overview-page'

export default function HomePage() {
  return <Suspense fallback={null}><AppShell homeMode><OverviewPage /></AppShell></Suspense>
}
