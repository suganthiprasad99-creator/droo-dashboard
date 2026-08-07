import { fetchAuthenticated } from '@/hooks/use-api-data'

export type DashboardStateEntry<T> = { key: string; value: T; updated_at: string }

const path = (namespace: string, key?: string) => `/v1/admin/dashboard-state/${encodeURIComponent(namespace)}${key ? `/${encodeURIComponent(key)}` : ''}`

export async function listDashboardState<T>(namespace: string): Promise<DashboardStateEntry<T>[]> {
  const response = await fetchAuthenticated(path(namespace), { cache: 'no-store' })
  if (!response.ok) throw new Error(`Unable to load ${namespace} (${response.status})`)
  const body = await response.json()
  return Array.isArray(body.data) ? body.data : []
}

export async function putDashboardState<T>(namespace: string, key: string, value: T): Promise<DashboardStateEntry<T>> {
  const response = await fetchAuthenticated(path(namespace, key), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ value }) })
  if (!response.ok) throw new Error(`Unable to save ${namespace} (${response.status})`)
  return response.json()
}

export async function deleteDashboardState(namespace: string, key: string) {
  const response = await fetchAuthenticated(path(namespace, key), { method: 'DELETE', headers: { 'Idempotency-Key': crypto.randomUUID() } })
  if (!response.ok && response.status !== 404) throw new Error(`Unable to delete ${namespace} (${response.status})`)
}
