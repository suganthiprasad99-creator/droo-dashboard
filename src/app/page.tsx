import { AppShell } from '@/components/layout/app-shell'
import { OverviewPage } from '@/features/overview/overview-page'

export default function HomePage() {
  return <AppShell homeMode><OverviewPage /></AppShell>
}
