'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, CircleGauge, Clock3, Cloud, Download, FileSpreadsheet, FileText, Fuel, Gauge, MapPin, Navigation, Route, Search, Timer, Truck, UserRound, X } from 'lucide-react'
import { GoogleLiveMap } from '@/components/google-live-map'
import { useApiData } from '@/hooks/use-api-data'
import type { ApiRecord } from '@/types/dashboard'

type Period = 'today' | 'yesterday' | '7d' | '30d' | 'custom'
type Coordinate = { latitude: number; longitude: number }
type RouteRecord = {
  id: string
  reference: string
  status: string
  driverID: string
  driverName: string
  vehicle: string
  serviceArea: string
  pickupLabel: string
  dropoffLabel: string
  pickup: Coordinate | null
  dropoff: Coordinate | null
  current: Coordinate | null
  plannedKm: number | null
  actualKm: number | null
  efficiency: number | null
  plannedMinutes: number | null
  actualMinutes: number | null
  averageSpeed: number | null
  stopCount: number
  completedStops: number
  failedStops: number
  startAt: Date | null
  endAt: Date | null
  updatedAt: Date | null
  order: ApiRecord
}

const activeStatuses = new Set(['assigned', 'enroute_pickup', 'arrived_pickup', 'picked_up', 'enroute_dropoff', 'arrived_dropoff'])
const completeStatuses = new Set(['delivered'])

function point(value: unknown): Coordinate | null {
  const record = value && typeof value === 'object' ? value as ApiRecord : {}
  const latitude = Number(record.latitude)
  const longitude = Number(record.longitude)
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
}

function distanceKm(from: Coordinate, to: Coordinate) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(to.latitude - from.latitude)
  const longitudeDelta = radians(to.longitude - from.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function dateValue(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isFinite(date.getTime()) ? date : null
}

function addressLabel(stop: ApiRecord | undefined) {
  const address = stop?.address && typeof stop.address === 'object' ? stop.address as ApiRecord : {}
  return [address.label || address.line1, address.city, address.state].filter(Boolean).map(String).join(', ') || 'Location unavailable'
}

function scoreTone(score: number | null) {
  if (score == null) return { label: 'Unavailable', className: 'unavailable' }
  if (score >= 95) return { label: 'Excellent', className: 'excellent' }
  if (score >= 85) return { label: 'Good', className: 'good' }
  if (score >= 70) return { label: 'Average', className: 'average' }
  return { label: 'Poor', className: 'poor' }
}

function formatNumber(value: number | null, suffix = '') {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })}${suffix}`
}

function Sparkline({ values, color = '#ff5962' }: { values: number[]; color?: string }) {
  if (!values.length) return <div className="route-chart-empty">No route history for this period</div>
  const maximum = Math.max(...values, 1)
  const points = values.map((value, index) => `${8 + index * (284 / Math.max(1, values.length - 1))},${88 - value / maximum * 70}`).join(' ')
  return <svg className="route-sparkline" viewBox="0 0 300 100" preserveAspectRatio="none" aria-label="Route metric trend"><defs><linearGradient id={`route-area-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs><polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><polygon points={`${points} 292,96 8,96`} fill={`url(#route-area-${color.replace('#', '')})`}/>{values.map((value, index) => <circle key={index} cx={8 + index * (284 / Math.max(1, values.length - 1))} cy={88 - value / maximum * 70} r="3" fill={color}/>)}</svg>
}

function KpiCard({ label, value, icon: Icon, trend, unavailable = false }: { label: string; value: string; icon: typeof Route; trend?: string; unavailable?: boolean }) {
  return <article className={`route-kpi ${unavailable ? 'unavailable' : ''}`}><header><span><Icon/></span>{trend && <em className={trend.startsWith('-') ? 'down' : 'up'}>{trend.startsWith('-') ? <ArrowDownRight/> : <ArrowUpRight/>}{trend}</em>}</header><strong>{value}</strong><p>{label}</p>{unavailable && <small>Awaiting telemetry</small>}</article>
}

export function RouteEfficiencyPage() {
  const { rows: orders, loading: ordersLoading, error: ordersError, refresh: refreshOrders } = useApiData('Orders', 10_000, false)
  const { rows: liveDrivers, loading: liveLoading, error: liveError, refresh: refreshLive } = useApiData('Live Operations', 10_000, false)
  const { rows: drivers } = useApiData('Drivers', 30_000, false)
  const { rows: vehicles } = useApiData('Vehicles', 30_000, false)
  const [period, setPeriod] = useState<Period>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [driverFilter, setDriverFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [mapLayer, setMapLayer] = useState<'routes' | 'satellite'>('routes')

  const allRoutes = useMemo<RouteRecord[]>(() => orders.map(order => {
    const assigned = order.assigned_driver && typeof order.assigned_driver === 'object' ? order.assigned_driver as ApiRecord : {}
    const driverID = String(assigned.id || order.assigned_driver_id || '')
    const driver = drivers.find(row => String(row.id) === driverID)
    const vehicle = vehicles.find(row => String(row.driver_id) === driverID)
    const live = liveDrivers.find(row => String(((row.driver || {}) as ApiRecord).id || row.id || '') === driverID)
    const stops = Array.isArray(order.stops) ? order.stops as ApiRecord[] : []
    const pickupStop = stops.find(stop => String(stop.type).toLowerCase() === 'pickup')
    const dropoffStop = stops.find(stop => String(stop.type).toLowerCase() === 'dropoff')
    const pickupAddress = pickupStop?.address && typeof pickupStop.address === 'object' ? pickupStop.address as ApiRecord : {}
    const pickup = point(pickupAddress)
    const dropoff = point(dropoffStop?.address)
    const current = point(live?.position || vehicle?.position)
    const plannedKm = pickup && dropoff ? distanceKm(pickup, dropoff) : null
    const status = String(order.status || 'unknown').toLowerCase()
    const actualMeters = Number(order.actual_distance_m || order.adhoc_distance_m)
    let actualKm = Number.isFinite(actualMeters) && actualMeters > 0 ? actualMeters / 1000 : null
    if (actualKm == null && activeStatuses.has(status) && pickup && dropoff && current) actualKm = distanceKm(pickup, current) + distanceKm(current, dropoff)
    const efficiency = plannedKm && actualKm ? Math.min(100, Math.round(plannedKm / actualKm * 100)) : order.is_route_optimized === true ? 100 : null
    const startAt = dateValue(order.started_at || order.assigned_at || order.created_at)
    const endAt = completeStatuses.has(status) ? dateValue(order.completed_at || order.updated_at) : null
    const actualMinutes = startAt && (activeStatuses.has(status) || completeStatuses.has(status)) ? Math.max(0, Math.round(((endAt || new Date()).getTime() - startAt.getTime()) / 60_000)) : null
    const plannedSeconds = Number(order.estimated_duration_s || order.planned_duration_s)
    const plannedMinutes = Number.isFinite(plannedSeconds) && plannedSeconds > 0 ? Math.round(plannedSeconds / 60) : null
    const completedStops = stops.filter(stop => ['completed', 'delivered'].includes(String(stop.status).toLowerCase())).length
    const failedStops = stops.filter(stop => String(stop.status).toLowerCase() === 'failed').length
    return {
      id: String(order.id || ''), reference: String(order.external_reference || order.id || 'Route'), status,
      driverID, driverName: String(assigned.name || driver?.name || 'Unassigned'), vehicle: String(vehicle?.registration_number || 'Unassigned'),
      serviceArea: String(order.service_area_name || pickupAddress.state || pickupAddress.city || 'Unassigned'), pickupLabel: addressLabel(pickupStop), dropoffLabel: addressLabel(dropoffStop),
      pickup, dropoff, current, plannedKm, actualKm, efficiency, plannedMinutes, actualMinutes,
      averageSpeed: actualKm && actualMinutes ? actualKm / (actualMinutes / 60) : null,
      stopCount: stops.length, completedStops, failedStops, startAt, endAt, updatedAt: dateValue(order.updated_at), order,
    }
  }), [drivers, liveDrivers, orders, vehicles])

  const periodBounds = useMemo(() => {
    const now = new Date()
    const end = period === 'custom' && customTo ? new Date(`${customTo}T23:59:59`) : now
    const start = new Date(end)
    if (period === 'today') start.setHours(0, 0, 0, 0)
    if (period === 'yesterday') { start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0) }
    if (period === '7d') start.setDate(start.getDate() - 7)
    if (period === '30d') start.setDate(start.getDate() - 30)
    if (period === 'custom' && customFrom) return { start: new Date(`${customFrom}T00:00:00`), end }
    return { start, end }
  }, [customFrom, customTo, period])

  const regions = useMemo(() => Array.from(new Set(allRoutes.map(route => route.serviceArea).filter(value => value !== 'Unassigned'))).sort(), [allRoutes])
  const routes = useMemo(() => allRoutes.filter(route => {
    const date = route.updatedAt || route.startAt
    return (!date || (date >= periodBounds.start && date <= periodBounds.end)) && (driverFilter === 'all' || route.driverID === driverFilter) && (regionFilter === 'all' || route.serviceArea === regionFilter) && `${route.reference} ${route.driverName} ${route.vehicle}`.toLowerCase().includes(search.toLowerCase())
  }), [allRoutes, driverFilter, periodBounds, regionFilter, search])

  const active = routes.filter(route => activeStatuses.has(route.status))
  const completed = routes.filter(route => completeStatuses.has(route.status))
  const scored = routes.filter(route => route.efficiency != null)
  const averageEfficiency = scored.length ? scored.reduce((sum, route) => sum + Number(route.efficiency), 0) / scored.length : null
  const plannedDistance = routes.reduce((sum, route) => sum + (route.plannedKm || 0), 0)
  const actualDistance = routes.reduce((sum, route) => sum + (route.actualKm || 0), 0)
  const distanceSaved = plannedDistance && actualDistance ? plannedDistance - actualDistance : null
  const averageDelivery = completed.filter(route => route.actualMinutes != null).length ? completed.reduce((sum, route) => sum + (route.actualMinutes || 0), 0) / completed.filter(route => route.actualMinutes != null).length : null
  const onTimeRoutes = completed.filter(route => route.plannedMinutes != null && route.actualMinutes != null && Number(route.actualMinutes) <= Number(route.plannedMinutes))
  const onTimeRate = completed.filter(route => route.plannedMinutes != null && route.actualMinutes != null).length ? onTimeRoutes.length / completed.filter(route => route.plannedMinutes != null && route.actualMinutes != null).length * 100 : null
  const deviations = routes.filter(route => route.efficiency != null && Number(route.efficiency) < 95).length
  const selected = routes.find(route => route.id === selectedID) || routes.find(route => route.efficiency != null) || routes[0]
  const trendValues = routes.filter(route => route.efficiency != null).sort((a, b) => (a.updatedAt?.getTime() || 0) - (b.updatedAt?.getTime() || 0)).map(route => Number(route.efficiency))

  const mapRows = selected ? [{ id: selected.driverID || selected.id, driver: { id: selected.driverID || selected.id, name: selected.driverName }, position: selected.current || selected.pickup || {}, planned_route_positions: [selected.pickup, selected.dropoff].filter(Boolean), actual_route_positions: [selected.pickup, selected.current, selected.dropoff].filter(Boolean), route_positions: [selected.pickup, selected.current, selected.dropoff].filter(Boolean) }] : []

  const exportCSV = () => {
    const header = ['Route ID', 'Driver', 'Vehicle', 'Status', 'Planned km', 'Actual km', 'Efficiency %']
    const lines = routes.map(route => [route.reference, route.driverName, route.vehicle, route.status, route.plannedKm ?? '', route.actualKm ?? '', route.efficiency ?? ''])
    downloadFile('route-efficiency.csv', [header, ...lines].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'), 'text/csv')
  }
  const exportExcel = () => {
    const rows = routes.map(route => `<tr><td>${escapeHTML(route.reference)}</td><td>${escapeHTML(route.driverName)}</td><td>${escapeHTML(route.vehicle)}</td><td>${escapeHTML(route.status)}</td><td>${route.plannedKm ?? ''}</td><td>${route.actualKm ?? ''}</td><td>${route.efficiency ?? ''}</td></tr>`).join('')
    downloadFile('route-efficiency.xls', `<table><tr><th>Route ID</th><th>Driver</th><th>Vehicle</th><th>Status</th><th>Planned km</th><th>Actual km</th><th>Efficiency %</th></tr>${rows}</table>`, 'application/vnd.ms-excel')
  }

  if (ordersLoading && liveLoading) return <div className="route-efficiency-page"><div className="route-skeleton hero"/><div className="route-skeleton-grid">{Array.from({ length: 8 }, (_, index) => <div className="route-skeleton" key={index}/>)}</div></div>

  return <main className="route-efficiency-page">
    <header className="route-page-header"><div><span>ANALYTICS / ROUTE INTELLIGENCE</span><h1>Route Efficiency</h1><p>Compare planned routes with live execution and surface operational inefficiencies.</p></div><div className="route-live-state"><i/>{liveError ? 'Live feed interrupted' : 'Live updates · 10s'}<button onClick={() => { refreshOrders(); refreshLive() }}>Refresh</button></div></header>
    {(ordersError || liveError) && <div className="route-error"><AlertTriangle/><span>{ordersError || liveError}</span></div>}

    <section className="route-filterbar"><label><CalendarDays/><select value={period} onChange={event => setPeriod(event.target.value as Period)}><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="custom">Custom Range</option></select></label>{period === 'custom' && <><input type="date" value={customFrom} onChange={event => setCustomFrom(event.target.value)}/><input type="date" value={customTo} onChange={event => setCustomTo(event.target.value)}/></>}<select value={regionFilter} onChange={event => setRegionFilter(event.target.value)}><option value="all">All regions</option>{regions.map(region => <option key={region}>{region}</option>)}</select><select value={driverFilter} onChange={event => setDriverFilter(event.target.value)}><option value="all">All drivers</option>{drivers.map(driver => <option key={String(driver.id)} value={String(driver.id)}>{String(driver.name || driver.id)}</option>)}</select><label className="route-search"><Search/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search routes, drivers, vehicles"/></label><div className="route-export"><button onClick={exportCSV}><Download/>CSV</button><button onClick={exportExcel}><FileSpreadsheet/>Excel</button><button onClick={() => window.print()}><FileText/>PDF</button></div></section>

    <section className="route-kpi-grid">
      <KpiCard label="Total Routes" value={String(routes.length)} icon={Route}/><KpiCard label="Active Routes" value={String(active.length)} icon={Navigation}/><KpiCard label="Completed Routes" value={String(completed.length)} icon={CheckCircle2}/><KpiCard label="Average Route Efficiency" value={formatNumber(averageEfficiency, '%')} icon={CircleGauge}/>
      <KpiCard label="Distance Planned" value={formatNumber(plannedDistance || null, ' km')} icon={MapPin}/><KpiCard label="Distance Travelled" value={formatNumber(actualDistance || null, ' km')} icon={Truck}/><KpiCard label="Distance Saved" value={formatNumber(distanceSaved, ' km')} icon={Gauge}/><KpiCard label="Average Delivery Time" value={formatNumber(averageDelivery, ' min')} icon={Clock3}/>
      <KpiCard label="On-Time Delivery Rate" value={formatNumber(onTimeRate, '%')} icon={Timer}/><KpiCard label="Route Deviations" value={String(deviations)} icon={AlertTriangle}/><KpiCard label="Fuel Saved" value="—" icon={Fuel} unavailable/><KpiCard label="CO₂ Reduction" value="—" icon={Cloud} unavailable/>
    </section>

    <section className="route-analysis-grid">
      <article className="route-panel route-trend-panel"><header><div><span>PERFORMANCE</span><h2>Route Efficiency Trend</h2></div><strong>{formatNumber(averageEfficiency, '%')}</strong></header><Sparkline values={trendValues}/><footer><span><i className="excellent"/>Excellent 95–100%</span><span><i className="good"/>Good 85–94%</span><span><i className="average"/>Average 70–84%</span><span><i className="poor"/>Poor &lt;70%</span></footer></article>
      <article className="route-panel route-alert-panel"><header><div><span>OPERATIONS</span><h2>Active Alerts</h2></div><b>{routes.filter(route => route.efficiency != null && Number(route.efficiency) < 95).length}</b></header><div>{routes.filter(route => route.efficiency != null && Number(route.efficiency) < 95).slice(0, 5).map(route => <button key={route.id} onClick={() => setSelectedID(route.id)}><AlertTriangle/><span><strong>{route.reference}</strong><small>{route.driverName} · {route.efficiency}% efficiency</small></span><ChevronRight/></button>)}{!routes.some(route => route.efficiency != null && Number(route.efficiency) < 95) && <div className="route-empty"><CheckCircle2/><strong>No route alerts</strong><span>No measurable route is below 95%.</span></div>}</div></article>
    </section>

    <section className="route-panel route-comparison"><header><div><span>LIVE COMPARISON</span><h2>{selected ? selected.reference : 'Route comparison'}</h2><p>{selected ? `${selected.driverName} · ${selected.vehicle}` : 'Select a route to compare execution.'}</p></div><div className="route-map-controls"><button className={mapLayer === 'routes' ? 'active' : ''} onClick={() => setMapLayer('routes')}>Routes</button><button className={mapLayer === 'satellite' ? 'active' : ''} onClick={() => setMapLayer('satellite')}>Satellite</button></div></header><div className="route-map-wrap"><GoogleLiveMap rows={mapRows} selected={selected ? selected.driverID || selected.id : null} onSelect={() => undefined} command={mapLayer === 'satellite' ? { type: 'toggle-type', nonce: 1 } : undefined}/><div className="route-map-legend"><span><i className="planned"/>Planned route</span><span><i className="actual"/>Actual/live route</span><span><i className="position"/>Driver position</span></div></div>{selected && <div className="route-comparison-metrics"><div><small>Planned Distance</small><strong>{formatNumber(selected.plannedKm, ' km')}</strong></div><div><small>Actual / Live Distance</small><strong>{formatNumber(selected.actualKm, ' km')}</strong></div><div><small>Extra Distance</small><strong>{selected.plannedKm != null && selected.actualKm != null ? formatNumber(Math.max(0, selected.actualKm - selected.plannedKm), ' km') : '—'}</strong></div><div><small>Efficiency Score</small><strong>{formatNumber(selected.efficiency, '%')}</strong></div><div><small>Average Speed</small><strong>{formatNumber(selected.averageSpeed, ' km/h')}</strong></div><div><small>Stops</small><strong>{selected.completedStops}/{selected.stopCount}</strong></div></div>}</section>

    <section className="route-panel route-table-panel"><header><div><span>ROUTE ANALYTICS</span><h2>Route Performance</h2></div><span>{routes.length} routes</span></header><div className="route-table-wrap"><table><thead><tr><th>ROUTE</th><th>DRIVER / VEHICLE</th><th>STATUS</th><th>PLANNED</th><th>ACTUAL / LIVE</th><th>DURATION</th><th>STOPS</th><th>EFFICIENCY</th><th/></tr></thead><tbody>{routes.map(route => { const tone = scoreTone(route.efficiency); return <tr key={route.id} className={selected?.id === route.id ? 'selected' : ''} onClick={() => setSelectedID(route.id)}><td><strong>{route.reference}</strong><small>{route.pickupLabel} → {route.dropoffLabel}</small></td><td><strong>{route.driverName}</strong><small>{route.vehicle}</small></td><td><span className={`route-status ${route.status}`}>{route.status.replaceAll('_', ' ')}</span></td><td>{formatNumber(route.plannedKm, ' km')}</td><td>{formatNumber(route.actualKm, ' km')}</td><td>{formatNumber(route.actualMinutes, ' min')}</td><td>{route.completedStops}/{route.stopCount}</td><td><span className={`efficiency-badge ${tone.className}`}><b>{formatNumber(route.efficiency, '%')}</b>{tone.label}</span></td><td><button aria-label={`View ${route.reference}`}><ChevronRight/></button></td></tr>})}{!routes.length && <tr><td colSpan={9}><div className="route-empty"><Route/><strong>No routes found</strong><span>Adjust filters or wait for route activity.</span></div></td></tr>}</tbody></table></div></section>

    <section className="route-analysis-grid route-driver-grid"><article className="route-panel route-driver-ranking"><header><div><span>DRIVER PERFORMANCE</span><h2>Efficiency Ranking</h2></div></header><div>{Array.from(new Set(routes.map(route => route.driverID))).filter(Boolean).map(id => { const driverRoutes = routes.filter(route => route.driverID === id && route.efficiency != null); const average = driverRoutes.length ? driverRoutes.reduce((sum, route) => sum + Number(route.efficiency), 0) / driverRoutes.length : null; const driver = routes.find(route => route.driverID === id); return { id, name: driver?.driverName || id, average, count: driverRoutes.length } }).sort((a, b) => Number(b.average || 0) - Number(a.average || 0)).slice(0, 8).map((driver, index) => <div key={driver.id}><b>{index + 1}</b><span><UserRound/><strong>{driver.name}</strong><small>{driver.count} measured routes</small></span><em>{formatNumber(driver.average, '%')}</em><i><span style={{ width: `${driver.average || 0}%` }}/></i></div>)}</div></article><article className="route-panel route-data-quality"><header><div><span>DATA QUALITY</span><h2>Telemetry Coverage</h2></div></header><div><p><strong>{routes.filter(route => route.current).length}/{routes.length}</strong><span>Routes with live GPS</span></p><p><strong>{routes.filter(route => route.plannedKm != null).length}/{routes.length}</strong><span>Routes with valid stops</span></p><p><strong>{routes.filter(route => route.actualKm != null).length}/{routes.length}</strong><span>Routes with execution distance</span></p><p><strong>—</strong><span>Idle and fuel telemetry unavailable</span></p></div></article></section>

    {selectedID && selected && <div className="route-detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedID(null) }}><aside className="route-detail-drawer"><header><div><span>ROUTE DETAILS</span><h2>{selected.reference}</h2><p>{selected.driverName} · {selected.vehicle}</p></div><button onClick={() => setSelectedID(null)}><X/></button></header><section className="route-detail-score"><strong>{formatNumber(selected.efficiency, '%')}</strong><span className={`efficiency-badge ${scoreTone(selected.efficiency).className}`}>{scoreTone(selected.efficiency).label}</span></section><dl><div><dt>Status</dt><dd>{selected.status.replaceAll('_', ' ')}</dd></div><div><dt>Service Area</dt><dd>{selected.serviceArea}</dd></div><div><dt>Route Start</dt><dd>{selected.startAt?.toLocaleString() || '—'}</dd></div><div><dt>Route End</dt><dd>{selected.endAt?.toLocaleString() || '—'}</dd></div><div><dt>Planned Distance</dt><dd>{formatNumber(selected.plannedKm, ' km')}</dd></div><div><dt>Actual / Live Distance</dt><dd>{formatNumber(selected.actualKm, ' km')}</dd></div><div><dt>Planned Duration</dt><dd>{formatNumber(selected.plannedMinutes, ' min')}</dd></div><div><dt>Actual Duration</dt><dd>{formatNumber(selected.actualMinutes, ' min')}</dd></div><div><dt>Completed Stops</dt><dd>{selected.completedStops}/{selected.stopCount}</dd></div><div><dt>Failed Stops</dt><dd>{selected.failedStops}</dd></div></dl><section className="route-timeline"><h3>Stop Timeline</h3>{(Array.isArray(selected.order.stops) ? selected.order.stops as ApiRecord[] : []).map((stop, index) => <article key={String(stop.id || index)}><i className={['completed', 'delivered'].includes(String(stop.status).toLowerCase()) ? 'done' : ''}><MapPin/></i><div><strong>{String(stop.type || `Stop ${index + 1}`).replaceAll('_', ' ')}</strong><span>{addressLabel(stop)}</span><small>{String(stop.status || 'pending')}</small></div></article>)}</section></aside></div>}
  </main>
}

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function escapeHTML(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character)
}
