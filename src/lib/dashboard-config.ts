import type { ModuleConfig, ModuleName } from '@/types/dashboard'

export const modules: Record<ModuleName, ModuleConfig> = {
  Overview: { name: 'Overview', description: 'Live operational health across your delivery network.' },
  'Live Operations': { name: 'Live Operations', description: 'Track available riders, active deliveries and stale locations.', apiPath: '/admin/live-drivers' },
  Orders: { name: 'Orders', description: 'Create, dispatch and monitor every delivery.', apiPath: '/admin/orders?limit=100', actionLabel: 'New order' },
  Drivers: { name: 'Drivers', description: 'Manage marketplace and salaried internal riders.', apiPath: '/admin/drivers?limit=100', actionLabel: 'Invite driver' },
  Vehicles: { name: 'Vehicles', description: 'Manage registered vehicles, assignments, capacity and lifecycle data.', apiPath: '/admin/vehicles?limit=100', actionLabel: 'New vehicle' },
  Fleets: { name: 'Fleets', description: 'Organize drivers and vehicles into operational groups.', apiPath: '/admin/fleets?limit=100', actionLabel: 'New fleet' },
  Applications: { name: 'Applications', description: 'Review rider profiles, vehicles and documents.', apiPath: '/admin/driver-applications' },
  'Service Areas': { name: 'Service Areas', description: 'Define operational coverage with polygon boundaries.', apiPath: '/admin/service-areas', actionLabel: 'New service area' },
  Pricing: { name: 'Pricing', description: 'Manage delivery pricing and rider revenue share.', apiPath: '/admin/pricing-rules', actionLabel: 'New pricing rule' },
  Earnings: { name: 'Earnings', description: 'Review rider ledger entries and adjustments.', apiPath: '/admin/earnings' },
  Integrations: { name: 'Integrations', description: 'Manage webhook subscriptions and API connections.', apiPath: '/webhook-endpoints', actionLabel: 'Add endpoint' },
  Issues: { name: 'Issues', description: 'Review delivery incidents reported by riders.' },
  'Organization Settings': { name: 'Organization Settings', description: 'Organization identity, memberships and access policy.' },
}
