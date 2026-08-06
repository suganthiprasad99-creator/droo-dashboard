export type ModuleName =
  | 'Overview'
  | 'Live Operations'
  | 'Orders'
  | 'Drivers'
  | 'Vehicles'
  | 'Fleets'
  | 'Applications'
  | 'Service Areas'
  | 'Pricing'
  | 'Earnings'
  | 'Integrations'
  | 'Issues'
  | 'Organization Settings'

export type ApiRecord = Record<string, unknown>

export type ModuleConfig = {
  name: ModuleName
  description: string
  apiPath?: string
  actionLabel?: string
}
