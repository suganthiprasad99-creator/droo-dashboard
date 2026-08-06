'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, ChevronDown, ChevronUp, CircleCheck, Clock3, Eye, MapPin, MessageCircle, MoreVertical, Play, Plus, RefreshCw, Search, Settings2, SlidersHorizontal, Trash2, Truck, X } from 'lucide-react'
import { GoogleLiveMap } from '@/components/google-live-map'
import { StatusBadge } from '@/components/ui/status-badge'
import { useApiData } from '@/hooks/use-api-data'
import type { ApiRecord } from '@/types/dashboard'

const text = (value: unknown, fallback = '—') => value === null || value === undefined || value === '' ? fallback : String(value)
const normalizedStatus = (value: unknown) => text(value, 'available').toLowerCase().replaceAll('_', ' ')
const positionOf = (row?: ApiRecord) => row?.position && typeof row.position === 'object' ? row.position as ApiRecord : {}
const assignedDriverID = (row: ApiRecord) => {
  const assigned = row.assigned_driver && typeof row.assigned_driver === 'object' ? row.assigned_driver as ApiRecord : {}
  return text(assigned.id || row.assigned_driver_id, '')
}
const stopText = (order: ApiRecord, type: 'pickup' | 'dropoff') => {
  const stops = Array.isArray(order.stops) ? order.stops as ApiRecord[] : []
  const stop = stops.find(item => normalizedStatus(item.type) === type)
  const address = stop?.address && typeof stop.address === 'object' ? stop.address as ApiRecord : {}
  return [address.line1 || address.label, address.city, address.state].filter(Boolean).map(String).join(', ') || 'Not provided'
}
const dateKey = (value: unknown) => {
  const date = new Date(String(value || 0))
  if (!Number.isFinite(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
type ActivityKind = 'assigned' | 'reached' | 'delay' | 'delivered' | 'scheduled'
const activityDefinition = (kind: ActivityKind) => {
  if (kind === 'delivered') return { title: 'Delivered In', done: 'Shipment delivery was completed successfully.', next: 'No route action remains; close the trip and confirm proof of delivery.', tone: 'done' }
  if (kind === 'delay') return { title: 'Delay reported on route', done: 'Stale route telemetry was detected and operations were notified.', next: 'Contact the driver, resolve the delay, and resume the planned route.', tone: 'alert' }
  if (kind === 'reached') return { title: 'Reached', done: 'The vehicle reached the route destination.', next: 'Complete the stop service and continue to the next destination.', tone: 'reached' }
  if (kind === 'assigned') return { title: 'Assigned to', done: 'Vehicle and driver assignment completed.', next: 'Driver must accept the trip and begin the route.', tone: 'assigned' }
  return { title: 'Scheduled for dispatch', done: 'The order was created and scheduled for dispatch.', next: 'Assign an available vehicle and dispatch it at the scheduled time.', tone: 'scheduled' }
}
const activityFor = (order: ApiRecord) => {
  const status = normalizedStatus(order.status)
  if (status === 'delivered') return activityDefinition('delivered')
  if (/failed|exception|delay|issue/.test(status)) return activityDefinition('delay')
  if (/enroute|picked up|arrived|route|transit/.test(status)) return activityDefinition('reached')
  if (/assigned|dispatch/.test(status)) return activityDefinition('assigned')
  return activityDefinition('scheduled')
}
const activityTime = (order: ApiRecord) => {
  const value = order.updated_at || order.created_at
  const date = new Date(String(value || 0))
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
}

type DispatchPhase = {
  label: string
  mode: 'assign-vehicles' | 'assign-drivers' | 'optimize-routes' | 'allocate-orders'
  statuses: string[]
  engine: 'vroom' | 'greedy' | 'capacity'
  respectCapacity: boolean
  respectSkills: boolean
  balanceWorkload: boolean
  returnToDepot: boolean
  autoCommit: boolean
}
const createPhase = (): DispatchPhase => ({ label: 'Assign Vehicles', mode: 'assign-vehicles', statuses: ['created'], engine: 'greedy', respectCapacity: true, respectSkills: true, balanceWorkload: false, returnToDepot: false, autoCommit: false })
const queueFieldLabels = { tracking: 'Tracking Number', status: 'Status', scheduled: 'Scheduled At', customer: 'Customer', type: 'Type', notes: 'Notes', priority: 'Priority', dropoff: 'Dropoff', pickup: 'Pickup', driver: 'Driver Assigned', vehicle: 'Vehicle Assigned', created: 'Created' } as const
type QueueField = keyof typeof queueFieldLabels

export function OrchestratorPage() {
  const { rows: orders, loading: ordersLoading, error: ordersError, refresh: refreshOrders } = useApiData('Orders', 10_000, false)
  const { rows: drivers, loading: driversLoading, error: driversError, refresh: refreshDrivers } = useApiData('Drivers', 10_000, false)
  const { rows: vehicles, loading: vehiclesLoading, error: vehiclesError, refresh: refreshVehicles } = useApiData('Vehicles', 10_000, false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [search, setSearch] = useState('')
  const [queueTab, setQueueTab] = useState<'ready' | 'hold' | 'exceptions'>('ready')
  const [selected, setSelected] = useState<string | null>(null)
  const [refreshRevision, setRefreshRevision] = useState(0)
  const [notice, setNotice] = useState('')
  const [traffic, setTraffic] = useState(false)
  const [configureOpen, setConfigureOpen] = useState(false)
  const [phases, setPhases] = useState<DispatchPhase[]>(() => [createPhase()])
  const [editingPhase, setEditingPhase] = useState<number | null>(null)
  const [phaseDraft, setPhaseDraft] = useState<DispatchPhase | null>(null)
  const [cardFieldsOpen, setCardFieldsOpen] = useState(false)
  const [queueFields, setQueueFields] = useState<QueueField[]>(['tracking', 'status', 'scheduled', 'customer', 'type', 'dropoff'])
  const [queueFieldsDraft, setQueueFieldsDraft] = useState<QueueField[]>(queueFields)
  const [dispatching, setDispatching] = useState(false)
  const [dispatchingOrderID, setDispatchingOrderID] = useState('')
  const [assignmentOrder, setAssignmentOrder] = useState<ApiRecord | null>(null)
  const [assignmentDriverID, setAssignmentDriverID] = useState('')
  const [stagedAssignment, setStagedAssignment] = useState<{ order: ApiRecord; driverID: string } | null>(null)
  const [dispatchedOrderIDs, setDispatchedOrderIDs] = useState<Set<string>>(new Set())
  const [detailOrder, setDetailOrder] = useState<ApiRecord | null>(null)
  const [detailResource, setDetailResource] = useState<ApiRecord | null>(null)
  const [fullActivityOpen, setFullActivityOpen] = useState(false)
  const [mapCommand, setMapCommand] = useState<{ type: 'toggle-type'; nonce: number }>()
  const mapPanelRef = useRef<HTMLElement>(null)
  const fleetPanelRef = useRef<HTMLElement>(null)

  const datedOrders = useMemo(() => orders.filter(order => {
    const orderDate = dateKey(order.created_at || order.inserted_at || order.updated_at)
    return !orderDate || orderDate === date
  }), [date, orders])
  const effectiveOrders = useMemo(() => datedOrders.map(order => dispatchedOrderIDs.has(text(order.id, '')) ? { ...order, status: 'assigned' } : order), [datedOrders, dispatchedOrderIDs])
  const activeOrders = useMemo(() => effectiveOrders.filter(order => !['delivered', 'cancelled', 'failed'].includes(normalizedStatus(order.status))), [effectiveOrders])
  const pendingOrders = useMemo(() => activeOrders.filter(order => /created|published|pending/.test(normalizedStatus(order.status))), [activeOrders])
  const readyOrders = useMemo(() => activeOrders.filter(order => /created|published|ready/.test(normalizedStatus(order.status))), [activeOrders])
  const onRouteOrders = useMemo(() => activeOrders.filter(order => /assigned|dispatch|start|pickup|route|transit/.test(normalizedStatus(order.status))), [activeOrders])
  const exceptionOrders = useMemo(() => activeOrders.filter(order => /exception|delay|issue|failed/.test(normalizedStatus(order.status))), [activeOrders])
  const holdOrders = useMemo(() => activeOrders.filter(order => /hold|paused/.test(normalizedStatus(order.status))), [activeOrders])
  const queueSource = queueTab === 'ready' ? readyOrders : queueTab === 'hold' ? holdOrders : exceptionOrders
  const queue = useMemo(() => queueSource.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [queueSource, search])

  const liveRows = useMemo(() => drivers.flatMap((driver, index) => {
    const position = positionOf(driver)
    const latitude = Number(position.latitude)
    const longitude = Number(position.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
    return [{ id: driver.id || index, status: driver.status, driver: { id: driver.id, name: driver.name, phone: driver.phone }, position } as ApiRecord]
  }), [drivers])

  const fleetRows = useMemo(() => vehicles.map((vehicle, index) => {
    const driver = drivers.find(item => text(item.id, '') === text(vehicle.driver_id, '')) || drivers[index]
    const activeOrder = activeOrders.find(order => assignedDriverID(order) === text(driver?.id, ''))
    const position = positionOf(driver)
    const maxLoadKg = Number(vehicle.max_load_kg)
    const currentLoadKg = Number(vehicle.current_load_kg)
    const status = activeOrder ? 'On Route' : normalizedStatus(vehicle.status) === 'active' ? 'Available' : normalizedStatus(vehicle.status)
    return { vehicle, driver, activeOrder, position, maxLoadKg, currentLoadKg, status }
  }), [activeOrders, drivers, vehicles])

  const refreshAll = () => {
    refreshOrders(); refreshDrivers(); refreshVehicles(); setRefreshRevision(value => value + 1)
    setNotice('Live operations refreshed.')
  }
  const runDispatch = async () => {
    if (stagedAssignment) {
      setDispatching(true)
      setNotice('')
      const assigned = await assignQueueOrder(stagedAssignment.order, stagedAssignment.driverID)
      setDispatching(false)
      if (assigned) setStagedAssignment(null)
      return
    }
    if (!readyOrders.length) { setNotice('No orders are ready to dispatch.'); return }
    if (!drivers.length) { setNotice('No eligible drivers are available for dispatch.'); return }
    const token = sessionStorage.getItem('droo.dev_access_token.v2')
    if (!token) { setNotice('Your session expired. Refresh the page and try again.'); return }
    setDispatching(true)
    setNotice('')
    const completed: string[] = []
    const failures: string[] = []
    const dispatchPhases = phases.filter(phase => phase.mode !== 'optimize-routes')
    const allowedStatuses = new Set(dispatchPhases.flatMap(phase => phase.statuses))
    const candidates = readyOrders.filter(order => allowedStatuses.has(normalizedStatus(order.status)))
    if (!candidates.length) { setNotice('No orders match the statuses included in the configured phases.'); setDispatching(false); return }
    for (const [index, order] of candidates.entries()) {
      const orderID = text(order.id, '')
      const driverID = text(drivers[index % drivers.length]?.id, '')
      if (!orderID || !driverID) continue
      try {
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': `orchestrator-${orderID}-${crypto.randomUUID()}-${index}` }
        if (normalizedStatus(order.status) === 'created') {
          const published = await fetch(`/v1/admin/orders/${encodeURIComponent(orderID)}/publish`, { method: 'POST', headers })
          if (!published.ok) throw new Error(`publish ${published.status}`)
        }
        const assigned = await fetch(`/v1/admin/orders/${encodeURIComponent(orderID)}/assign`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': `${headers['Idempotency-Key']}-assign` }, body: JSON.stringify({ driver_id: driverID }) })
        if (!assigned.ok) throw new Error(`assign ${assigned.status}`)
        completed.push(orderID)
      } catch {
        failures.push(orderID)
      }
    }
    setDispatchedOrderIDs(current => new Set([...current, ...completed]))
    refreshOrders()
    setDispatching(false)
    setNotice(failures.length
      ? `${completed.length} order${completed.length === 1 ? '' : 's'} dispatched; ${failures.length} could not be assigned.`
      : `${phases.length} dispatch phase${phases.length === 1 ? '' : 's'} completed for ${completed.length} orders.`)
  }
  const openDriverSelection = (order: ApiRecord) => {
    setAssignmentOrder(order)
    setAssignmentDriverID('')
    setStagedAssignment(null)
    window.setTimeout(() => fleetPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }
  const stageDriverAssignment = () => {
    if (!assignmentOrder || !assignmentDriverID) return
    const driver = drivers.find(item => text(item.id, '') === assignmentDriverID)
    setStagedAssignment({ order: assignmentOrder, driverID: assignmentDriverID })
    setAssignmentOrder(null)
    setAssignmentDriverID('')
    setNotice(`${text(driver?.name, 'Driver')} selected for ${text(assignmentOrder.external_reference || assignmentOrder.id, 'shipment')}. Click Run Phase to confirm the assignment.`)
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0)
  }
  async function assignQueueOrder(order: ApiRecord, driverID: string): Promise<boolean> {
    const orderID = text(order.id, '')
    const driver = drivers.find(item => text(item.id, '') === driverID)
    const token = sessionStorage.getItem('droo.dev_access_token.v2')
    if (!orderID || !driverID || !token) { setNotice('An eligible driver or active session is unavailable.'); return false }
    setDispatchingOrderID(orderID)
    try {
      const key = `queue-${orderID}-${crypto.randomUUID()}`
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }
      if (normalizedStatus(order.status) === 'created') {
        const published = await fetch(`/v1/admin/orders/${encodeURIComponent(orderID)}/publish`, { method: 'POST', headers })
        if (!published.ok) {
          const problem = await published.json().catch(() => ({})) as ApiRecord
          throw new Error(text(problem.detail || problem.title, `Publishing failed (${published.status}).`))
        }
      }
      const assigned = await fetch(`/v1/admin/orders/${encodeURIComponent(orderID)}/assign`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': `${key}-assign` }, body: JSON.stringify({ driver_id: driverID }) })
      if (!assigned.ok) {
        const problem = await assigned.json().catch(() => ({})) as ApiRecord
        throw new Error(text(problem.detail || problem.title, `Assignment failed (${assigned.status}).`))
      }
      setDispatchedOrderIDs(current => new Set([...current, orderID]))
      setAssignmentOrder(null)
      setAssignmentDriverID('')
      refreshOrders()
      refreshDrivers()
      setRefreshRevision(value => value + 1)
      setSelected(driverID)
      setNotice(`${text(order.external_reference || orderID)} assigned to ${text(driver?.name, 'driver')}. The vehicle is now shown on the live map.`)
      window.setTimeout(() => mapPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The shipment could not be assigned. Refresh and try again.')
      return false
    }
    finally { setDispatchingOrderID('') }
  }
  const openPhase = (index: number) => { setEditingPhase(index); setPhaseDraft({ ...phases[index], statuses: [...phases[index].statuses] }) }
  const addPhase = () => {
    const next = createPhase()
    setPhases(current => [...current, next])
    setEditingPhase(phases.length)
    setPhaseDraft(next)
  }
  const movePhase = (index: number, direction: -1 | 1) => setPhases(current => {
    const target = index + direction
    if (target < 0 || target >= current.length) return current
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]
    if (editingPhase === index) setEditingPhase(target)
    return next
  })
  const removePhase = (index: number) => {
    if (phases.length === 1) { setNotice('At least one phase is required.'); return }
    setPhases(current => current.filter((_, itemIndex) => itemIndex !== index))
    setEditingPhase(null); setPhaseDraft(null)
  }
  const selectVehicle = (driverID: string) => {
    setSelected(driverID)
    mapPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const error = ordersError || driversError || vehiclesError
  const loading = ordersLoading || driversLoading || vehiclesLoading
  const detailVehicle = detailResource?.vehicle && typeof detailResource.vehicle === 'object' ? detailResource.vehicle as ApiRecord : {}
  const detailDriver = detailResource?.driver && typeof detailResource.driver === 'object' ? detailResource.driver as ApiRecord : {}
  const detailPosition = detailResource?.position && typeof detailResource.position === 'object' ? detailResource.position as ApiRecord : {}
  const detailAssignedDriver = detailOrder ? drivers.find(item => text(item.id, '') === assignedDriverID(detailOrder)) : undefined
  const selectedFleet = selected ? fleetRows.find(row => text(row.driver?.id, '') === selected) : undefined
  const activityOrders = useMemo(() => [...effectiveOrders].sort((a, b) => new Date(String(b.updated_at || b.created_at || 0)).getTime() - new Date(String(a.updated_at || a.created_at || 0)).getTime()), [effectiveOrders])
  const feedActivities = useMemo(() => {
    const assigned = activityOrders.filter(order => /assigned|dispatch/.test(normalizedStatus(order.status)))
    const delivered = activityOrders.filter(order => normalizedStatus(order.status) === 'delivered')
    const scheduled = activityOrders.filter(order => /created|published|pending|ready/.test(normalizedStatus(order.status)))
    const referenceTime = Math.max(0, ...activityOrders.map(order => new Date(String(order.updated_at || order.created_at || 0)).getTime()).filter(Number.isFinite), ...drivers.map(driver => new Date(String(positionOf(driver).recorded_at || 0)).getTime()).filter(Number.isFinite))
    const staleAssigned = assigned.find(order => {
      const driver = drivers.find(item => text(item.id, '') === assignedDriverID(order))
      const recorded = new Date(String(positionOf(driver).recorded_at || 0)).getTime()
      return !recorded || referenceTime - recorded > 10 * 60_000
    })
    return [
      assigned[0] && { order: assigned[0], activity: activityDefinition('assigned') },
      delivered[0] && { order: delivered[0], activity: activityDefinition('reached') },
      staleAssigned && { order: staleAssigned, activity: activityDefinition('delay') },
      delivered[1] && { order: delivered[1], activity: activityDefinition('delivered') },
      scheduled[0] && { order: scheduled[0], activity: activityDefinition('scheduled') },
    ].filter((entry): entry is { order: ApiRecord; activity: ReturnType<typeof activityDefinition> } => Boolean(entry))
  }, [activityOrders, drivers])
  const fullActivityEntries = useMemo(() => {
    const featuredKeys = new Set(feedActivities.map(entry => `${text(entry.order.id, '')}-${entry.activity.tone}`))
    const remaining = activityOrders.map(order => ({ order, activity: activityFor(order) })).filter(entry => !featuredKeys.has(`${text(entry.order.id, '')}-${entry.activity.tone}`))
    return [...feedActivities, ...remaining]
  }, [activityOrders, feedActivities])
  const activityDescription = (order: ApiRecord) => {
    const driver = drivers.find(item => text(item.id, '') === assignedDriverID(order))
    const vehicle = vehicles.find(item => text(item.driver_id, '') === text(driver?.id, ''))
    const registration = text(vehicle?.registration_number, '')
    const route = `${stopText(order, 'pickup')} → ${stopText(order, 'dropoff')}`
    return activityFor(order).tone === 'assigned' && registration
      ? `${registration} · ${text(driver?.name, 'Driver assigned')}`
      : `${registration || text(order.external_reference || order.id)} · ${route}`
  }

  return <div className="orchestrator-page">
    <header className="orchestrator-command-header"><div><h1>Orchestrator Command Center</h1><p>Plan, assign, and monitor today’s fleet operations</p></div><div><label aria-label="Select operations date"><CalendarDays /><input type="date" value={date} onChange={event => { setDate(event.target.value); setDispatchedOrderIDs(new Set()); setStagedAssignment(null) }} /></label><button className="secondary" aria-expanded={configureOpen} onClick={() => { setConfigureOpen(value => !value); setEditingPhase(null); setPhaseDraft(null) }}><Settings2 />{configureOpen ? 'Close configuration' : 'Configure'}</button><button className="primary" disabled={dispatching} onClick={runDispatch}><Play />{dispatching ? 'Running…' : `Run ${phases.length} Phase(s)`}</button></div></header>
    {stagedAssignment && <div className="orchestrator-staged-assignment"><span><strong>{text(drivers.find(driver => text(driver.id, '') === stagedAssignment.driverID)?.name, 'Driver')} selected</strong><small>{text(stagedAssignment.order.external_reference || stagedAssignment.order.id, 'Shipment')} is ready. Click Run Phase to assign it and display the vehicle on the map.</small></span><button onClick={() => setStagedAssignment(null)}>Cancel selection</button></div>}

    {configureOpen && <section className="orchestrator-phase-builder"><header><div><h3>Phases</h3><p>Compose a multi-step orchestration run. Each phase runs a specific mode in sequence.</p></div><button onClick={addPhase}><Plus />Add Phase</button></header><div className="phase-builder-body"><ol>{phases.map((phase, index) => <li key={`${phase.label}-${index}`} className={editingPhase === index ? 'active' : ''}><button className="phase-select" onClick={() => openPhase(index)}><strong>{phase.label}</strong><small>Phase {index + 1}</small></button><span><button aria-label="Move up" disabled={index === 0} onClick={() => movePhase(index, -1)}><ChevronUp /></button><button aria-label="Move down" disabled={index === phases.length - 1} onClick={() => movePhase(index, 1)}><ChevronDown /></button><button aria-label="Delete phase" onClick={() => removePhase(index)}><Trash2 /></button></span></li>)}</ol>{phaseDraft && editingPhase !== null ? <form onSubmit={event => { event.preventDefault(); setPhases(current => current.map((phase, index) => index === editingPhase ? phaseDraft : phase)); setEditingPhase(null); setPhaseDraft(null); setNotice('Dispatch phase saved.') }}><label>Phase Label<input value={phaseDraft.label} onChange={event => setPhaseDraft({ ...phaseDraft, label: event.target.value })} /></label><fieldset><legend>Mode</legend>{([['assign-vehicles','Assign Vehicles'],['assign-drivers','Assign Drivers'],['optimize-routes','Optimize Routes'],['allocate-orders','Allocate Orders']] as const).map(([value, label]) => <button type="button" className={phaseDraft.mode === value ? 'active' : ''} key={value} onClick={() => setPhaseDraft({ ...phaseDraft, mode: value, label })}>{label}</button>)}</fieldset><fieldset><legend>Include Order Statuses</legend>{['created','published','assigned'].map(status => <button type="button" className={phaseDraft.statuses.includes(status) ? 'active' : ''} key={status} onClick={() => setPhaseDraft({ ...phaseDraft, statuses: phaseDraft.statuses.includes(status) ? phaseDraft.statuses.filter(item => item !== status) : [...phaseDraft.statuses, status] })}>{status === 'assigned' ? 'Started' : status.charAt(0).toUpperCase() + status.slice(1)}</button>)}</fieldset><label>Engine<select value={phaseDraft.engine} onChange={event => setPhaseDraft({ ...phaseDraft, engine: event.target.value as DispatchPhase['engine'] })}><option value="vroom">VROOM</option><option value="greedy">Greedy (built-in)</option><option value="capacity">Capacity (built-in)</option></select></label><fieldset className="phase-constraints"><legend>Constraints</legend>{([['respectCapacity','Respect Capacity'],['respectSkills','Respect Skills'],['balanceWorkload','Balance Workload'],['returnToDepot','Return to Depot'],['autoCommit','Auto-commit after phase']] as const).map(([key,label]) => <label key={key}>{label}<input type="checkbox" checked={phaseDraft[key]} onChange={event => setPhaseDraft({ ...phaseDraft, [key]: event.target.checked })} /></label>)}</fieldset><footer><button type="submit" className="primary">Save Phase</button><button type="button" onClick={() => { setEditingPhase(null); setPhaseDraft(null) }}>Cancel</button></footer></form> : <div className="phase-empty">Select a phase to edit its settings.</div>}</div><footer><button className="primary" disabled={dispatching} onClick={runDispatch}><Play />{dispatching ? 'Running…' : `Run ${phases.length} Phase(s)`}</button></footer></section>}

    <section className="orchestrator-summary"><article><i className="orange"><Truck /></i><span>Pending orders<strong>{pendingOrders.length}</strong></span></article><article><i className="blue"><CalendarDays /></i><span>Ready to dispatch<strong>{readyOrders.length}</strong></span></article><article><i className="green"><Truck /></i><span>On route<strong>{onRouteOrders.length}</strong></span></article><article><i className="red"><AlertTriangle /></i><span>Exceptions<strong>{exceptionOrders.length}</strong></span></article></section>

    <section className="orchestrator-grid"><article ref={mapPanelRef} className="orchestrator-panel orchestrator-map-panel"><header><h2>Live Map <span>• Tamil Nadu</span></h2><div><button className={traffic ? 'active' : ''} onClick={() => { const next = !traffic; setTraffic(next); setMapCommand({ type: 'toggle-type', nonce: Date.now() }); setNotice(`Traffic map ${next ? 'enabled' : 'disabled'}.`) }}>Traffic {traffic ? 'On' : 'Off'}</button><button aria-label="Refresh map" onClick={refreshAll}><RefreshCw /></button></div></header><div className="orchestrator-live-map"><GoogleLiveMap key={`${refreshRevision}-${selected || ''}`} rows={liveRows} selected={selected} onSelect={setSelected} command={mapCommand} markerStyle="truck" />{selectedFleet && <article className="orchestrator-map-vehicle-card"><header><span><strong>{text(selectedFleet.vehicle.registration_number, 'Vehicle')}</strong><StatusBadge value={selectedFleet.status} /></span><button aria-label="Close vehicle card" onClick={() => setSelected(null)}><X /></button></header><dl><div><dt>Driver</dt><dd>{text(selectedFleet.driver?.name, 'Unassigned')}</dd></div><div><dt>Location</dt><dd>{Number(selectedFleet.position.latitude).toFixed(5)}, {Number(selectedFleet.position.longitude).toFixed(5)}</dd></div><div><dt>Route</dt><dd>{selectedFleet.activeOrder ? `${stopText(selectedFleet.activeOrder, 'pickup')} → ${stopText(selectedFleet.activeOrder, 'dropoff')}` : 'Route unavailable'}</dd></div><div><dt>Next Stop</dt><dd>{selectedFleet.activeOrder ? stopText(selectedFleet.activeOrder, 'dropoff') : 'Next stop unavailable'}</dd></div><div><dt>ETA</dt><dd>{selectedFleet.activeOrder?.estimated_arrival_at ? new Date(String(selectedFleet.activeOrder.estimated_arrival_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ETA unavailable'}</dd></div></dl><button onClick={() => selectedFleet.activeOrder ? setDetailOrder(selectedFleet.activeOrder) : setNotice('No active route is available for this vehicle.')}>View Route</button></article>}{loading && <div className="map-state">Loading live operations…</div>}{error && <div className="map-state error">{error}</div>}</div><footer><strong>Map Legend</strong><span><i className="planned" />Planned route</span><span><i className="active" />Active route</span><span><i className="available" />Vehicle available</span><span><MapPin />Stop / Drop point</span></footer></article>

    <article className="orchestrator-panel orchestrator-queue"><header><h2>Dispatch Queue</h2><button aria-label="Card fields" className={cardFieldsOpen ? 'active' : ''} onClick={() => { setQueueFieldsDraft(queueFields); setCardFieldsOpen(true) }}><SlidersHorizontal /></button></header><nav><button className={queueTab === 'ready' ? 'active' : ''} onClick={() => setQueueTab('ready')}>Ready to dispatch <b>{readyOrders.length}</b></button><button className={queueTab === 'hold' ? 'active' : ''} onClick={() => setQueueTab('hold')}>On hold <b>{holdOrders.length}</b></button><button className={queueTab === 'exceptions' ? 'active' : ''} onClick={() => setQueueTab('exceptions')}>Exceptions <b>{exceptionOrders.length}</b></button></nav><label><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search shipments" /></label><div>{queue.length ? queue.slice(0, 8).map((row, index) => {
      const driverID = assignedDriverID(row)
      const assigned = drivers.find(item => text(item.id, '') === driverID)
      const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as ApiRecord : {}
      const scheduled = row.estimated_arrival_at || row.scheduled_at
      return <article className="dispatch-queue-card" key={text(row.id, String(index))}><header><strong>{text(row.external_reference || row.id, 'Shipment')}</strong>{queueFields.includes('status') && <StatusBadge value={normalizedStatus(row.status)} />}</header><div>{queueFields.includes('pickup') && <p><b>Pickup</b><span>{stopText(row, 'pickup')}</span></p>}{queueFields.includes('dropoff') && <p><b>Dropoff</b><span>{stopText(row, 'dropoff')}</span></p>}{queueFields.includes('scheduled') && <p><b>Scheduled</b><span>{scheduled ? new Date(String(scheduled)).toLocaleString() : 'Not scheduled'}</span></p>}{queueFields.includes('customer') && <p><b>Customer</b><span>{text(row.customer_name || metadata.customer_name, 'No customer')}</span></p>}{queueFields.includes('type') && <p><b>Type</b><span>{text(row.service_type || metadata.service_type, 'Standard')}</span></p>}{queueFields.includes('notes') && <p><b>Notes</b><span>{text(metadata.notes, 'No notes')}</span></p>}{queueFields.includes('priority') && <p><b>Priority</b><span>{text(metadata.priority, 'Normal')}</span></p>}{queueFields.includes('driver') && <p><b>Driver</b><span>{text(assigned?.name, 'Awaiting driver')}</span></p>}{queueFields.includes('vehicle') && <p><b>Vehicle</b><span>{text(vehicles.find(vehicle => text(vehicle.driver_id, '') === driverID)?.registration_number, 'Unassigned')}</span></p>}{queueFields.includes('created') && <p><b>Created</b><span>{row.created_at ? new Date(String(row.created_at)).toLocaleString() : '—'}</span></p>}</div><footer><span>{text(assigned?.name, 'Awaiting driver')}</span><button disabled={Boolean(dispatchingOrderID)} onClick={() => openDriverSelection(row)}>{dispatchingOrderID === text(row.id, '') ? 'Assigning…' : 'Assign'}</button><button aria-label="Open shipment details" onClick={() => { setDetailOrder(row); if (driverID) setSelected(driverID) }}><Eye /></button></footer></article>
    }) : <section><Truck /><strong>No shipments in this queue.</strong><span>Operational shipments will appear here.</span></section>}</div><footer><Link href="/orders">View all shipments <span>›</span></Link></footer></article></section>

    <section ref={fleetPanelRef} className={`orchestrator-panel orchestrator-fleet${assignmentOrder ? ' assignment-mode' : ''}`}><header><h2>Fleet Availability</h2><span>{fleetRows.length} vehicles ready</span></header>{assignmentOrder && <div className="fleet-assignment-bar"><span><strong>Select a driver for {text(assignmentOrder.external_reference || assignmentOrder.id, 'shipment')}</strong><small>Click a driver row below, then prepare the assignment.</small></span><div><button disabled={Boolean(dispatchingOrderID)} onClick={() => { setAssignmentOrder(null); setAssignmentDriverID('') }}>Cancel</button><button className="primary" disabled={!assignmentDriverID || Boolean(dispatchingOrderID)} onClick={stageDriverAssignment}>Assign selected driver</button></div></div>}<div className="table-wrap"><table><thead><tr><th>Vehicle</th><th>Driver</th><th>Current location</th><th>Capacity</th><th>Status</th><th>ETA</th><th>Actions</th></tr></thead><tbody>{fleetRows.map(({ vehicle, driver, activeOrder, position, maxLoadKg, currentLoadKg, status }, index) => {
      const driverID = text(driver?.id, '')
      const hasPosition = Number.isFinite(Number(position.latitude)) && Number.isFinite(Number(position.longitude))
      const canAssign = !activeOrder
      const chooseDriver = () => assignmentOrder ? canAssign ? setAssignmentDriverID(driverID) : setNotice(`${text(driver?.name, 'This driver')} already has an active order.`) : hasPosition && selectVehicle(driverID)
      return <tr key={text(vehicle.id, String(index))} aria-disabled={Boolean(assignmentOrder) && !canAssign} className={`${selected === driverID ? 'selected ' : ''}${assignmentDriverID === driverID ? 'assignment-selected ' : ''}${assignmentOrder && !canAssign ? 'assignment-unavailable' : ''}`} tabIndex={assignmentOrder && !canAssign ? -1 : 0} onClick={chooseDriver} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseDriver() } }}><td><button className="vehicle-link" onClick={event => { event.stopPropagation(); chooseDriver() }}><Truck /><strong>{text(vehicle.registration_number, `TN01DR${String(index + 1).padStart(4, '0')}`)}</strong></button></td><td><span className="driver-cell"><i>{text(driver?.name, 'D').charAt(0)}</i><span><strong>{text(driver?.name, 'Available driver')}</strong><small>{text(driver?.phone)}</small></span></span></td><td>{hasPosition ? `${Number(position.latitude).toFixed(4)}, ${Number(position.longitude).toFixed(4)}` : 'Location unavailable'}</td><td><span className="capacity-cell">{Number.isFinite(currentLoadKg) ? (currentLoadKg / 1000).toFixed(1) : '—'} / {Number.isFinite(maxLoadKg) ? (maxLoadKg / 1000).toFixed(1) : '—'} MT<i><b style={{ width: `${maxLoadKg > 0 ? Math.min(100, currentLoadKg / maxLoadKg * 100) : 0}%` }} /></i></span></td><td><StatusBadge value={status} /></td><td>{activeOrder?.estimated_arrival_at ? new Date(String(activeOrder.estimated_arrival_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td><span className="fleet-actions"><button aria-label="Open driver and vehicle" onClick={event => { event.stopPropagation(); setDetailResource({ vehicle, driver, position, status, activeOrder }) }}><MessageCircle /></button><button aria-label="View on map" disabled={!hasPosition} onClick={event => { event.stopPropagation(); selectVehicle(driverID) }}><MapPin /></button><button aria-label="Open vehicle details" onClick={event => { event.stopPropagation(); setDetailResource({ vehicle, driver, position, status, activeOrder }) }}><MoreVertical /></button></span></td></tr>
    })}{!loading && fleetRows.length === 0 && <tr><td colSpan={7}>No fleet resources available.</td></tr>}</tbody></table></div></section>

    <section className="orchestrator-panel orchestrator-feed"><header><h2>Live Operations Feed</h2><button onClick={() => setFullActivityOpen(true)}>View full activity ›</button></header><div>{feedActivities.map(({ order, activity }, index) => <article key={`${text(order.id, String(index))}-${activity.tone}`} className={activity.tone} onClick={() => setDetailOrder(order)}><i>{activity.tone === 'alert' ? <AlertTriangle /> : activity.tone === 'reached' ? <MapPin /> : activity.tone === 'scheduled' ? <CalendarDays /> : <Truck />}</i><span><time>{activityTime(order)}</time><strong>{activity.title}</strong><small>{activityDescription(order)}</small></span></article>)}{!feedActivities.length && !loading && <article><i><Eye /></i><span><strong>No recent activity</strong><small>Order updates will appear here.</small></span></article>}</div></section>

    {detailOrder && <div className="orchestrator-config-backdrop" onMouseDown={event => event.target === event.currentTarget && setDetailOrder(null)}><section className="orchestrator-detail-dialog" role="dialog" aria-modal="true" aria-label="Shipment details"><header><div><h2>{text(detailOrder.external_reference || detailOrder.id, 'Shipment')}</h2><p>Live order details</p></div><button aria-label="Close shipment details" onClick={() => setDetailOrder(null)}><X /></button></header><dl><div><dt>Status</dt><dd><StatusBadge value={normalizedStatus(detailOrder.status)} /></dd></div><div><dt>Driver</dt><dd>{text(detailAssignedDriver?.name, 'Awaiting assignment')}</dd></div><div><dt>Pickup</dt><dd>{stopText(detailOrder, 'pickup')}</dd></div><div><dt>Dropoff</dt><dd>{stopText(detailOrder, 'dropoff')}</dd></div></dl><footer><button onClick={() => setDetailOrder(null)}>Close</button><Link href="/orders?layout=table">Open orders</Link></footer></section></div>}

    {detailResource && <div className="orchestrator-config-backdrop" onMouseDown={event => event.target === event.currentTarget && setDetailResource(null)}><section className="orchestrator-detail-dialog" role="dialog" aria-modal="true" aria-label="Vehicle and driver details"><header><div><h2>{text(detailVehicle.registration_number, 'Vehicle')}</h2><p>Live fleet resource details</p></div><button aria-label="Close vehicle details" onClick={() => setDetailResource(null)}><X /></button></header><dl><div><dt>Driver</dt><dd>{text(detailDriver.name)}</dd></div><div><dt>Phone</dt><dd>{text(detailDriver.phone)}</dd></div><div><dt>Status</dt><dd><StatusBadge value={text(detailResource.status)} /></dd></div><div><dt>Capacity</dt><dd>{text(detailVehicle.current_load_kg)} / {text(detailVehicle.max_load_kg)} KG</dd></div><div><dt>Latitude</dt><dd>{Number.isFinite(Number(detailPosition.latitude)) ? Number(detailPosition.latitude).toFixed(6) : 'Not reported'}</dd></div><div><dt>Longitude</dt><dd>{Number.isFinite(Number(detailPosition.longitude)) ? Number(detailPosition.longitude).toFixed(6) : 'Not reported'}</dd></div></dl><footer><button onClick={() => setDetailResource(null)}>Close</button><button className="primary" disabled={!detailDriver.id} onClick={() => { setDetailResource(null); selectVehicle(text(detailDriver.id, '')) }}>View on map</button></footer></section></div>}

    {fullActivityOpen && <div className="orchestrator-activity-backdrop" onMouseDown={event => event.target === event.currentTarget && setFullActivityOpen(false)}><section className="orchestrator-activity-dialog" role="dialog" aria-modal="true" aria-label="Full live operations activity"><header><div><h2>Full Live Operations Activity</h2><p>Completed work and the next required action for every vehicle.</p></div><button aria-label="Close full activity" onClick={() => setFullActivityOpen(false)}><X /></button></header><div>{fullActivityEntries.map(({ order, activity }, index) => <article key={`${text(order.id, String(index))}-${activity.tone}-${index}`} onClick={() => { setFullActivityOpen(false); setDetailOrder(order) }}><div className="activity-summary"><i className={activity.tone}>{activity.tone === 'alert' ? <AlertTriangle /> : activity.tone === 'reached' ? <MapPin /> : activity.tone === 'scheduled' ? <CalendarDays /> : activity.tone === 'done' ? <CircleCheck /> : <Truck />}</i><span><time>{activityTime(order)}</time><strong>{activity.title}</strong><small>{activityDescription(order)}</small></span></div><section className="activity-done"><b><CircleCheck />Process done</b><p>{activity.done}</p></section><section className="activity-todo"><b><Clock3 />Yet to do</b><p>{activity.next}</p></section></article>)}{!fullActivityEntries.length && <div className="activity-empty">No live operations activity is available.</div>}</div></section></div>}

    {cardFieldsOpen && <div className="orchestrator-config-backdrop" onMouseDown={event => event.target === event.currentTarget && setCardFieldsOpen(false)}><section className="orchestrator-card-fields-dialog" role="dialog" aria-modal="true" aria-label="Configure dispatch card fields"><header><div><h2>Standard Fields</h2><p>These fields appear on every order card regardless of order type.</p></div><button aria-label="Close card fields" onClick={() => setCardFieldsOpen(false)}><X /></button></header><div>{(Object.entries(queueFieldLabels) as [QueueField,string][]).map(([field,label]) => <label key={field}><input type="checkbox" checked={queueFieldsDraft.includes(field)} onChange={event => setQueueFieldsDraft(current => event.target.checked ? [...current, field] : current.filter(item => item !== field))} />{label}</label>)}</div><footer><button onClick={() => setCardFieldsOpen(false)}>Back</button><button className="primary" onClick={() => { setQueueFields(queueFieldsDraft); setCardFieldsOpen(false); setNotice('Dispatch card fields updated.') }}>Save Card Fields</button></footer></section></div>}

    {notice && <div className="orchestrator-notice" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
  </div>
}
