import { TelematicsPage } from '@/features/telematics/telematics-page'
import { DevicesPage } from '@/features/telematics/devices-page'
import { SensorsPage } from '@/features/telematics/sensors-page'
import { EventsPage } from '@/features/telematics/events-page'
import { FuelProvidersPage } from '@/features/telematics/fuel-providers-page'

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  return view === 'devices' ? <DevicesPage /> : view === 'sensors' ? <SensorsPage /> : view === 'events' ? <EventsPage /> : view === 'fuel-Integrations' || view === 'fuel-providers' ? <FuelProvidersPage /> : <TelematicsPage />
}
