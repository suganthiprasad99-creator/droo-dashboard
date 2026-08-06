'use client'

import { useEffect, useState } from 'react'
import type { ApiRecord, ModuleName } from '@/types/dashboard'
import { modules } from '@/lib/dashboard-config'

const ACCESS_TOKEN_KEY = 'droo.dev_access_token.v2'
const REFRESH_TOKEN_KEY = 'droo.dev_refresh_token.v2'

const demoRows: Partial<Record<ModuleName, ApiRecord[]>> = {
  'Live Operations': [
    { id: 'drv_demo_1', status: 'online', active_order_id: 'ord_demo_1001', driver: { id: 'drv_demo_1', name: 'Naveen Kumar', phone: '+91 90000 10001' }, position: { latitude: 13.0827, longitude: 80.2707, recorded_at: new Date().toISOString(), heading_deg: 115 } },
    { id: 'drv_demo_2', status: 'online', active_order_id: 'ord_demo_1002', driver: { id: 'drv_demo_2', name: 'Arun Prakash', phone: '+91 90000 10002' }, position: { latitude: 13.0604, longitude: 80.2496, recorded_at: new Date().toISOString(), heading_deg: 45 } },
  ],
  Orders: [
    { id: 'ord_demo_1001', external_reference: 'DEMO-1001', status: 'assigned', service_type: 'Standard Delivery', customer_name: 'Aarav Stores', assigned_driver: 'Naveen Kumar · TN 01 DR 0010', price: '₹1,450.75', sla: 'On time', sla_compliant: true, updated_at: new Date().toISOString(), stops: [{ type: 'pickup', address: { line1: 'T Nagar', city: 'Chennai', latitude: 13.0418, longitude: 80.2341 } }, { type: 'dropoff', address: { line1: 'Anna Nagar', city: 'Chennai', latitude: 13.085, longitude: 80.2101 } }] },
    { id: 'ord_demo_1002', external_reference: 'DEMO-1002', status: 'published', service_type: 'Express Delivery', customer_name: 'Meera Textiles', assigned_driver: '—', price: '₹860.00', sla: 'Awaiting assignment', sla_compliant: true, updated_at: new Date().toISOString(), stops: [{ type: 'pickup', address: { line1: 'Mylapore', city: 'Chennai', latitude: 13.0368, longitude: 80.2676 } }, { type: 'dropoff', address: { line1: 'Adyar', city: 'Chennai', latitude: 13.0067, longitude: 80.2572 } }] },
    { id: 'ord_demo_1003', external_reference: 'DEMO-1003', status: 'delivered', service_type: 'Standard Delivery', customer_name: 'Kavin Electronics', assigned_driver: 'Arun Prakash · TN 09 BK 4821', price: '₹1,120.00', sla: 'Completed on time', sla_compliant: true, updated_at: new Date().toISOString(), stops: [{ type: 'pickup', address: { line1: 'Kilpauk', city: 'Chennai', latitude: 13.0827, longitude: 80.2417 } }, { type: 'dropoff', address: { line1: 'Nungambakkam', city: 'Chennai', latitude: 13.0604, longitude: 80.2496 } }] },
  ],
  Drivers: [
    { id: 'drv_demo_1', name: 'Naveen Kumar', type: 'internal', status: 'online', phone: '+91 90000 10001', vehicle_id: 'veh_demo_1', vehicle_registration: 'TN 01 DR 0010' },
    { id: 'drv_demo_2', name: 'Arun Prakash', type: 'solo', status: 'online', phone: '+91 90000 10002', vehicle_id: 'veh_demo_2', vehicle_registration: 'TN 09 BK 4821' },
    { id: 'drv_demo_3', name: 'Priya Sharma', type: 'internal', status: 'available', phone: '+91 90000 10003', vehicle_id: 'veh_demo_3', vehicle_registration: 'TN 22 CM 7654' },
  ],
  Vehicles: [
    { id: 'veh_demo_1', registration_number: 'TN 01 DR 0010', type: 'motorcycle', status: 'active', assigned_driver: 'Naveen Kumar' },
    { id: 'veh_demo_2', registration_number: 'TN 09 BK 4821', type: 'scooter', status: 'active', assigned_driver: 'Arun Prakash' },
    { id: 'veh_demo_3', registration_number: 'TN 22 CM 7654', type: 'motorcycle', status: 'available', assigned_driver: 'Priya Sharma' },
  ],
  Fleets: [
    { id: 'flt_demo_1', name: 'Chennai Central Fleet', status: 'active', drivers: 2, vehicles: 2, service_area: 'Chennai Central' },
    { id: 'flt_demo_2', name: 'South Chennai Fleet', status: 'active', drivers: 1, vehicles: 1, service_area: 'South Chennai' },
  ],
  Applications: [{ id: 'app_demo_1', name: 'Karthik S', status: 'pending_review', vehicle_type: 'Motorcycle', submitted_at: new Date().toISOString() }],
  'Service Areas': [{ id: 'area_demo_1', name: 'Chennai Central', status: 'active', type: 'polygon', drivers_online: 10 }],
  Pricing: [{ id: 'price_demo_1', name: 'Chennai Standard', status: 'active', base_price: '₹60', per_km: '₹14' }],
  Earnings: [{ id: 'earn_demo_1', driver: 'Naveen Kumar', status: 'eligible', amount: '₹920.00', order_id: 'ord_demo_1001' }],
  Integrations: [{ id: 'hook_demo_1', name: 'Order status webhook', status: 'active', type: 'webhook', endpoint: 'https://example.test/droo/events' }],
}

function fallbackRows(module: ModuleName) {
  if (module === 'Overview') return [
    ...(demoRows.Orders || []).map(row => ({ ...row, __kind: 'order' })),
    ...(demoRows.Drivers || []).map(row => ({ ...row, __kind: 'driver', online: row.status === 'online' })),
    ...(demoRows.Earnings || []).map(row => ({ ...row, __kind: 'earning' })),
  ]
  return demoRows[module] || []
}

let activeDevLogin: Promise<string> | null = null

async function performDevLogin() {
  const challengeResponse = await fetch('/v1/auth/otp/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '+916369487527', purpose: 'login' }) })
  if (!challengeResponse.ok) throw new Error(`Development login request failed (${challengeResponse.status})`)
  const challenge = await challengeResponse.json()
  const verification = await fetch('/v1/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_id: challenge.challenge_id, code: '000000' }) })
  if (!verification.ok) throw new Error(`Development login verification failed (${verification.status})`)
  const session = await verification.json()
  if (typeof session.access_token !== 'string') throw new Error('Development login returned no access token')
  sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token)
  if (typeof session.refresh_token === 'string') sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)
  return session.access_token as string
}

function devLogin() {
  if (!activeDevLogin) activeDevLogin = performDevLogin().finally(() => { activeDevLogin = null })
  return activeDevLogin
}

async function refreshLogin() {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null
  const response = await fetch('/v1/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }) })
  if (!response.ok) { sessionStorage.removeItem(REFRESH_TOKEN_KEY); return null }
  const session = await response.json()
  if (typeof session.access_token !== 'string') return null
  sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token)
  if (typeof session.refresh_token === 'string') sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)
  return session.access_token as string
}

export function useApiData(module: ModuleName, refreshMs?: number, allowDemoFallback = true) {
  const [rows, setRows] = useState<ApiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!refreshMs) return
    const timer = window.setInterval(() => setRevision(value => value + 1), refreshMs)
    return () => window.clearInterval(timer)
  }, [refreshMs])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      if (module === 'Integrations') {
        const response = await fetch('/api/dev/integrations', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Integration API request failed (${response.status})`)
        const value = await response.json()
        if (!cancelled) setRows(Array.isArray(value) ? value : value.data || [])
        return
      }
      let token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
      if (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true') {
        const valid = token && await fetch('/v1/me', { headers: { Authorization: `Bearer ${token}` } }).then(response => response.ok).catch(() => false)
        if (!valid) { sessionStorage.removeItem(ACCESS_TOKEN_KEY); token = await refreshLogin() || await devLogin() }
      }
      if (!token) throw new Error('Sign in to load live API data.')
      const headers = { Authorization: `Bearer ${token}` }
      if (module === 'Overview') {
        const [orders, drivers, earnings, liveDrivers] = await Promise.all(['/admin/orders?limit=100', '/admin/drivers?limit=100', '/admin/earnings?limit=100', '/admin/live-drivers'].map(async endpoint => {
          const response = await fetch(`/v1${endpoint}`, { headers })
          if (!response.ok) throw new Error(`Overview API request failed (${response.status})`)
          return response.json()
        }))
        const liveRows: ApiRecord[] = Array.isArray(liveDrivers) ? liveDrivers : liveDrivers.data || []
        const onlineIDs = new Set(liveRows.map((row) => String(((row.driver || {}) as ApiRecord).id || '')))
        if (!cancelled) setRows([
          ...(orders.data || []).map((x: ApiRecord) => ({ ...x, __kind: 'order' })),
          ...(drivers.data || []).map((x: ApiRecord) => ({ ...x, __kind: 'driver', online: onlineIDs.has(String(x.id || '')) })),
          ...(earnings.data || []).map((x: ApiRecord) => ({ ...x, __kind: 'earning' })),
          ...liveRows.map((x: ApiRecord) => ({ ...x, __kind: 'live_driver' })),
        ])
        return
      }
      const path = modules[module].apiPath
      if (!path) { setRows([]); return }
      const response = await fetch(`/v1${path}`, { headers })
      if (!response.ok) throw new Error(`API request failed (${response.status})`)
      const value = await response.json()
      let records: ApiRecord[] = Array.isArray(value) ? value : value.data || []
      if (module === 'Orders' && !records.length && process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true') records = fallbackRows('Orders')
      if (!cancelled) setRows(module === 'Vehicles' ? records.map((driver) => {
        const vehicle = driver.vehicle && typeof driver.vehicle === 'object' ? driver.vehicle as ApiRecord : {}
        return {
          id: vehicle.id || driver.vehicle_id,
          registration_number: vehicle.registration_number || driver.vehicle_registration,
          type: vehicle.type || driver.vehicle_type,
          status: vehicle.status || driver.status,
          assigned_driver: driver.name,
          driver_id: driver.id,
          position: driver.position,
          max_load_kg: vehicle.max_load_kg,
          current_load_kg: vehicle.current_load_kg,
        }
      }).filter((vehicle) => vehicle.id || vehicle.registration_number) : module === 'Fleets' ? Array.from(records.reduce((fleets, driver) => {
        const fleet = driver.fleet && typeof driver.fleet === 'object' ? driver.fleet as ApiRecord : {}
        const id = String(fleet.id || driver.fleet_id || 'unassigned')
        const current = fleets.get(id) || { id, name: fleet.name || driver.fleet_name || 'Unassigned', status: fleet.status || 'active', drivers: 0, vehicles: 0, service_area: fleet.service_area || driver.service_area || '—' }
        current.drivers = Number(current.drivers) + 1
        if (driver.vehicle || driver.vehicle_id) current.vehicles = Number(current.vehicles) + 1
        fleets.set(id, current)
        return fleets
      }, new Map<string, ApiRecord>()).values()) : records)
    }
    load().catch(value => {
      if (cancelled) return
      if (module === 'Orders') {
        if (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true') {
          setRows(fallbackRows('Orders'))
          setError('')
        } else {
          setRows([])
          setError(value instanceof Error ? value.message : 'Orders API request failed')
        }
        return
      }
      if (allowDemoFallback && process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true') {
        setRows(fallbackRows(module))
        setError('')
        return
      }
      setError(value instanceof Error ? value.message : 'API request failed')
    }).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [allowDemoFallback, module, revision])

  return { rows, loading, error, refresh: () => setRevision(value => value + 1) }
}
