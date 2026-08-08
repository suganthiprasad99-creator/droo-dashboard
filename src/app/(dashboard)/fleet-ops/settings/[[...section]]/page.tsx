import { FleetSettingsPage } from '@/features/fleet-settings/fleet-settings-page'

export default async function Page({ params }: PageProps<'/fleet-ops/settings/[[...section]]'>) {
  const { section } = await params
  return <FleetSettingsPage section={section?.[0] || 'hub'} />
}
