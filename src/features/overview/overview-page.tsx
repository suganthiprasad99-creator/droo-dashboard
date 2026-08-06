'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Bell, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, Copy, LayoutGrid, MapPin, Plus, RefreshCw, Route, Trash2, UserRound, Wrench, Zap } from 'lucide-react'
import { DashboardGoogleMap } from '@/components/dashboard-google-map'
import { useApiData } from '@/hooks/use-api-data'
import type { ApiRecord } from '@/types/dashboard'

const fallbackOrders = [
  ['ORD-2026-07-28-001', 'NovaPoshta Parcels', 'In Transit', '28 Jul, 11:45 AM'],
  ['ORD-2026-07-28-002', 'QuickShip Colombo', 'In Transit', '28 Jul, 10:30 AM'],
  ['ORD-2026-07-28-003', 'City Express', 'Pending Pickup', '28 Jul, 09:00 AM'],
  ['ORD-2026-07-28-004', 'Swift Logistics', 'Delivered', '27 Jul, 06:15 PM'],
]

type LocalDashboard = { id: string; name: string; system: boolean }
const defaultDashboard: LocalDashboard = { id: 'default', name: 'Default Dashboard', system: true }
const dashboardStorageKey = 'droo.custom-dashboards.v1'
const activeOrderStatuses = new Set(['assigned', 'enroute_pickup', 'arrived_pickup', 'picked_up', 'enroute_dropoff', 'arrived_dropoff'])

function TrendChart({ kind }: { kind: 'delivery' | 'revenue' }) {
  const points = kind === 'delivery' ? '48,112 70,94 92,104 116,96 140,72 162,88 188,66 212,56 236,38 260,50 284,78 310,66 334,78 358,68' : '48,112 78,100 108,100 138,86 168,74 198,56 228,78 258,74 288,92 316,68 342,96 368,98'
  const area = `${points} 368,124 48,124`
  const gradientID = `trend-${kind}`
  return <svg className="dashboard-trend-chart" viewBox="0 0 390 155" role="img" aria-label={`${kind} trend chart`}>
    <defs><linearGradient id={gradientID} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff4e55" stopOpacity=".22"/><stop offset="1" stopColor="#ff4e55" stopOpacity=".02"/></linearGradient></defs>
    {[28,52,76,100,124].map((y,index)=><g key={y}><line x1="46" y1={y} x2="374" y2={y} stroke="#ecece8" strokeDasharray="3 3"/><text x="3" y={y+3}>{['$1.00','$0.75','$0.50','$0.25','$0.00'][index]}</text></g>)}
    <polygon points={area} fill={`url(#${gradientID})`}/><polyline points={points} fill="none" stroke="#ff4e55" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
    {kind==='delivery'&&<><line x1="236" y1="26" x2="236" y2="124" stroke="#ff9a9e" strokeDasharray="3 3"/><circle cx="236" cy="38" r="7" fill="#ff4e55" stroke="#fff" strokeWidth="3"/><g className="trend-tooltip"><rect x="209" y="3" width="55" height="27" rx="5"/><text x="218" y="14">Jul 20</text><text x="218" y="25">$0.72</text></g></>}
    {(kind==='delivery'?[[48,'Jun 29'],[132,'Jul 06'],[216,'Jul 13'],[286,'Jul 20'],[344,'Jul 27']]:[[48,'2026-07-28']]).map(([x,label])=><text key={String(label)} x={Number(x)} y="148" textAnchor={Number(x)===48?'start':'middle'}>{label}</text>)}
  </svg>
}

function EfficiencyChart() {
  return <svg className="efficiency-chart" viewBox="0 0 210 130" aria-label="Route efficiency trend"><defs><pattern id="efficiency-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.5" fill="#fff" opacity=".16"/></pattern></defs><rect width="210" height="130" fill="url(#efficiency-dots)"/><polyline points="14,108 30,92 44,98 58,68 72,74 88,48 104,38 120,42 136,30 152,58 168,34 184,18 199,8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{[[14,108],[58,68],[104,38],[152,58],[199,8]].map(([cx,cy])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#fff"/>)}</svg>
}

function formatStatus(value: string) {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

function customerName(order: ApiRecord) {
  const metadata = (order.metadata || {}) as ApiRecord
  return String(metadata.customer_name || order.external_reference || 'Tamil Nadu customer')
}

function findStop(order: ApiRecord | undefined, type: string) {
  const stops = Array.isArray(order?.stops) ? order.stops as ApiRecord[] : []
  return stops.find((stop) => String(stop.type || '') === type)
}

function stopAddress(stop: ApiRecord | undefined) {
  const address = (stop?.address || {}) as ApiRecord
  return String(address.line1 || 'Address available in order details')
}

function stopCity(stop: ApiRecord | undefined, fallback: string) {
  const address = (stop?.address || {}) as ApiRecord
  return String(address.city || fallback)
}

function distanceKM(order: ApiRecord) {
  const pickup = (findStop(order, 'pickup')?.address || {}) as ApiRecord
  const dropoff = (findStop(order, 'dropoff')?.address || {}) as ApiRecord
  const lat1 = Number(pickup.latitude), lon1 = Number(pickup.longitude), lat2 = Number(dropoff.latitude), lon2 = Number(dropoff.longitude)
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0
  const radians = (value: number) => value * Math.PI / 180
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function OverviewPage() {
  const { rows, loading, error } = useApiData('Overview', 30_000)
  const [selectedOrderID, setSelectedOrderID] = useState('')
  const [vehicleIndex, setVehicleIndex] = useState(0)
  const [topDriverMetric, setTopDriverMetric] = useState<'orders' | 'ontime' | 'distance'>('orders')
  const [dashboards, setDashboards] = useState<LocalDashboard[]>([defaultDashboard])
  const [currentDashboardID, setCurrentDashboardID] = useState('default')
  const [dashboardSelectorOpen, setDashboardSelectorOpen] = useState(false)
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false)
  const [createDashboardOpen, setCreateDashboardOpen] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [editingLayout, setEditingLayout] = useState(false)
  const [widgetPanelOpen, setWidgetPanelOpen] = useState(false)
  const [mapCommand, setMapCommand] = useState<{ type: 'zoom-in' | 'zoom-out' | 'refresh'; id: number }>()
  const [mapMode, setMapMode] = useState<'tracking' | 'traffic' | 'poi'>('tracking')
  const [routeMetrics, setRouteMetrics] = useState<{ totalDistanceMeters: number; travelledDistanceMeters: number; remainingDistanceMeters: number; durationSeconds: number; pickupCompleted: boolean; dropoffCompleted: boolean } | null>(null)
  const orderRecords = useMemo(() => rows.filter((row) => row.__kind === 'order'), [rows])
  const driverRecords = useMemo(() => rows.filter((row) => row.__kind === 'driver'), [rows])
  const liveDrivers = useMemo(() => rows.filter((row) => row.__kind === 'live_driver'), [rows])
  const activeOrderRecords = useMemo(() => orderRecords.filter((row) => activeOrderStatuses.has(String(row.status || ''))), [orderRecords])
  const visibleOrders = useMemo(() => (activeOrderRecords.length ? activeOrderRecords : orderRecords).slice(0, 8), [activeOrderRecords, orderRecords])
  const vehicles = useMemo(() => driverRecords.filter((driver) => driver.vehicle && typeof driver.vehicle === 'object'), [driverRecords])
  const currentVehicleDriver = vehicles[vehicleIndex]
  const currentVehicle = (currentVehicleDriver?.vehicle || {}) as ApiRecord
  const currentLoadPercent = 48 + (vehicleIndex * 7) % 43
  const maxLoadKG = String(currentVehicle.type || '').includes('motorcycle') ? 220 : 160
  const currentLoadKG = Math.round(maxLoadKG * currentLoadPercent / 100)
  const orders = visibleOrders.length ? visibleOrders.map((order) => [
    String(order.external_reference || order.id || 'Order'),
    customerName(order),
    formatStatus(String(order.status || 'created')),
    formatDate(String(order.updated_at || order.created_at || '')),
  ]) : fallbackOrders
  const selectedOrder = visibleOrders.find((order) => String(order.id) === selectedOrderID) || visibleOrders[0]
  const selectedPickup = findStop(selectedOrder, 'pickup')
  const selectedDropoff = findStop(selectedOrder, 'dropoff')
  const selectedDriver = (selectedOrder?.assigned_driver || {}) as ApiRecord
  const totalKM = routeMetrics ? routeMetrics.totalDistanceMeters / 1000 : null
  const travelledKM = routeMetrics ? routeMetrics.travelledDistanceMeters / 1000 : null
  const remainingKM = routeMetrics ? routeMetrics.remainingDistanceMeters / 1000 : null
  const routeProgress = routeMetrics?.dropoffCompleted ? 100 : routeMetrics && routeMetrics.totalDistanceMeters > 0 ? Math.min(99, Math.round(routeMetrics.travelledDistanceMeters / routeMetrics.totalDistanceMeters * 100)) : 0
  const etaMinutes = routeMetrics ? Math.max(1, Math.ceil(routeMetrics.durationSeconds / 60)) : null
  const updateRouteMetrics = useCallback((metrics: { totalDistanceMeters: number; travelledDistanceMeters: number; remainingDistanceMeters: number; durationSeconds: number; pickupCompleted: boolean; dropoffCompleted: boolean } | null) => setRouteMetrics(metrics), [])
  const topDrivers = driverRecords.map((driver, index) => {
    const assigned = orderRecords.filter((order) => String(((order.assigned_driver || {}) as ApiRecord).id || '') === String(driver.id || ''))
    const delivered = assigned.filter((order) => String(order.status) === 'delivered')
    const onTime = delivered.filter((order) => {
      const deadline = findStop(order, 'dropoff')?.latest_at
      return deadline && new Date(String(order.updated_at)).getTime() <= new Date(String(deadline)).getTime()
    }).length
    return { driver, orders: assigned.length, ontime: delivered.length ? Math.round((onTime / delivered.length) * 100) : 0, distance: assigned.reduce((sum, order) => sum + distanceKM(order), 0), index }
  }).sort((a, b) => b[topDriverMetric] - a[topDriverMetric] || a.index - b.index)

  const driverMetricValue = (entry: (typeof topDrivers)[number]) => {
    if (topDriverMetric === 'orders') return `${entry.orders} orders`
    if (topDriverMetric === 'ontime') return `${entry.ontime}%`
    return `${entry.distance.toFixed(1)} km`
  }

  const currentDashboard = dashboards.find((dashboard) => dashboard.id === currentDashboardID) || defaultDashboard

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(dashboardStorageKey) || '[]') as LocalDashboard[]
        if (Array.isArray(saved)) setDashboards([defaultDashboard, ...saved.filter((dashboard) => dashboard.id !== 'default')])
      } catch { /* Ignore invalid local development state. */ }
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const persistDashboards = (next: LocalDashboard[]) => {
    setDashboards(next)
    localStorage.setItem(dashboardStorageKey, JSON.stringify(next.filter((dashboard) => !dashboard.system)))
  }

  const createDashboard = () => {
    const name = newDashboardName.trim()
    if (!name) return
    const dashboard = { id: `dashboard_${Date.now()}`, name, system: false }
    persistDashboards([...dashboards, dashboard])
    setCurrentDashboardID(dashboard.id)
    setNewDashboardName('')
    setCreateDashboardOpen(false)
  }

  const deleteDashboard = () => {
    if (currentDashboard.system || !window.confirm(`Delete ${currentDashboard.name}?`)) return
    persistDashboards(dashboards.filter((dashboard) => dashboard.id !== currentDashboard.id))
    setCurrentDashboardID('default')
    setEditingLayout(false)
    setDashboardMenuOpen(false)
  }

  const selectVehicleAt = (index: number) => {
    if (index < 0 || index >= vehicles.length) return
    setVehicleIndex(index)
    const driverID = String(vehicles[index].id || '')
    const assignedOrder = activeOrderRecords.find((order) => String(((order.assigned_driver || {}) as ApiRecord).id || '') === driverID)
    if (assignedOrder) setSelectedOrderID(String(assignedOrder.id || ''))
  }

  const selectVehicle = (driverID: string) => {
    selectVehicleAt(vehicles.findIndex((driver) => String(driver.id) === driverID))
  }

  const moveVehicle = (direction: number) => {
    if (vehicles.length) selectVehicleAt((vehicleIndex + direction + vehicles.length) % vehicles.length)
  }

  const selectOrder = (order: ApiRecord) => {
    setSelectedOrderID(String(order.id || ''))
    const driverID = String(((order.assigned_driver || {}) as ApiRecord).id || '')
    const index = vehicles.findIndex((driver) => String(driver.id || '') === driverID)
    if (index >= 0) setVehicleIndex(index)
  }

  return <div className={`shot-dashboard ${editingLayout ? 'dashboard-layout-editing' : ''}`}>
    <header className="shot-dashboard-head"><h1>{currentDashboard.name}</h1><label><span>Select vehicle</span><select aria-label="Select vehicle" value={String(currentVehicleDriver?.id || '')} onChange={(event) => selectVehicle(event.target.value)}><option value="" disabled>Select a vehicle</option>{vehicles.map((driver, index) => { const vehicle=(driver.vehicle||{}) as ApiRecord; return <option key={String(driver.id)} value={String(driver.id)}>Vehicle {String(index+1).padStart(2,'0')} · {String(vehicle.registration_number||vehicle.id||'Unregistered')}</option> })}</select></label><div className="shot-dashboard-select"><div className="dashboard-action-wrap"><button aria-haspopup="menu" aria-expanded={dashboardSelectorOpen} onClick={()=>{setDashboardSelectorOpen(!dashboardSelectorOpen);setDashboardMenuOpen(false)}}>{currentDashboard.name} <ChevronDown /></button>{dashboardSelectorOpen&&<div className="dashboard-action-menu dashboard-selector-menu" role="menu">{dashboards.map(dashboard=><button role="menuitem" key={dashboard.id} onClick={()=>{setCurrentDashboardID(dashboard.id);setDashboardSelectorOpen(false);setEditingLayout(false)}}><LayoutGrid/><span>{dashboard.name}</span>{dashboard.id===currentDashboard.id&&<Check/>}</button>)}</div>}</div><div className="dashboard-action-wrap"><button className="dashboard-more-button" aria-label="Dashboard actions" aria-haspopup="menu" aria-expanded={dashboardMenuOpen} onClick={()=>{setDashboardMenuOpen(!dashboardMenuOpen);setDashboardSelectorOpen(false)}}>•••</button>{dashboardMenuOpen&&<div className="dashboard-action-menu" role="menu"><button role="menuitem" onClick={()=>{setCreateDashboardOpen(true);setDashboardMenuOpen(false)}}><Plus/>Create new Dashboard</button>{currentDashboard.system?<p>Create a dashboard to customize widgets.</p>:<><button role="menuitem" onClick={()=>{setEditingLayout(!editingLayout);setDashboardMenuOpen(false)}}><LayoutGrid/>{editingLayout?'Finish editing':'Edit layout'}</button><button role="menuitem" onClick={()=>{setWidgetPanelOpen(true);setDashboardMenuOpen(false)}}><Plus/>Add widgets</button><button role="menuitem" className="danger" onClick={deleteDashboard}><Trash2/>Delete dashboard</button></>}</div>}</div>{editingLayout&&<button className="dashboard-save-button" onClick={()=>setEditingLayout(false)}>Save layout</button>}</div></header>

    <section className="shot-map-card">
      <div className="shot-map-tabs">{(['tracking','traffic','poi'] as const).map(mode=><button key={mode} className={mapMode===mode?'active':''} onClick={()=>setMapMode(mode)}>{mode==='poi'?'POI':mode.charAt(0).toUpperCase()+mode.slice(1)}</button>)}</div>
      <aside className="shot-route-stats"><div className="route-distance-summary"><Route/><span>Distance remaining<strong>{remainingKM===null?'—':remainingKM.toFixed(1)} <small>km</small></strong><small className="route-distance-breakdown">Total {totalKM===null?'—':totalKM.toFixed(1)} km · Travelled {travelledKM===null?'—':travelledKM.toFixed(1)} km</small></span></div><div><CircleDollarSign/><span>Estimated ETA<strong>{routeMetrics?.dropoffCompleted?'Delivered':etaMinutes??'—'} {!routeMetrics?.dropoffCompleted&&<small>min</small>}</strong></span></div><div><i className="progress-ring">{routeProgress}</i><span>Route progress<strong>{routeProgress} <small>%</small></strong><em><b style={{width:`${routeProgress}%`}}/></em><small className="route-stop-status"><b className={routeMetrics?.pickupCompleted?'done':''}>{routeMetrics?.pickupCompleted?'✓':'○'} Pickup</b><b className={routeMetrics?.dropoffCompleted?'done':''}>{routeMetrics?.dropoffCompleted?'✓':'○'} Drop-off</b></small></span></div></aside>
      <DashboardGoogleMap rows={liveDrivers} selectedDriverID={String(currentVehicleDriver?.id || '')} selectedOrder={selectedOrder} mapCommand={mapCommand} mapMode={mapMode} onRouteMetrics={updateRouteMetrics} />
      <div className="shot-map-tools"><button aria-label="Zoom in" onClick={()=>setMapCommand({type:'zoom-in',id:Date.now()})}>+</button><button aria-label="Zoom out" onClick={()=>setMapCommand({type:'zoom-out',id:Date.now()})}>−</button><button aria-label="Refresh map" onClick={()=>setMapCommand({type:'refresh',id:Date.now()})}><RefreshCw/></button></div>
      <aside className="shot-alert"><header><Bell/> Alerts &amp; Notifications</header><div><Bell/><p><strong>Geofence alert <time>13:48</time></strong><span>Truck entered restricted zone near Warehouse B.</span></p></div><button>View all alerts <ChevronRight/></button></aside>
    </section>

    <section className="shot-kpis">{[[ClipboardList,'Total orders',loading?'—':String(orderRecords.length)],[Zap,'Active orders',loading?'—':String(activeOrderRecords.length)],[UserRound,'Total drivers',loading?'—':String(driverRecords.length)],[UserRound,'Drivers online',loading?'—':String(liveDrivers.length)]].map(([Icon,label,value])=>{const I=Icon as React.ElementType;return <article key={String(label)}><header>{String(label)}<I/></header><strong>{String(value)}</strong></article>})}</section>

    <section className="shot-orders-load">
      <article className="shot-active-orders"><h2>Active Orders {error && <small>{error}</small>}</h2><div className="orders-columns"><div className="order-list"><h3>Orders ({activeOrderRecords.length})</h3>{orders.map((order,index)=>{const record=visibleOrders[index];const active=String(record?.id||'')===String(selectedOrder?.id||'');return <button key={order[0]} className={active?'selected':''} onClick={()=>record&&selectOrder(record)}><strong>{order[0]}</strong><span>{order[1]}</span><b className={order[2]==='Delivered'?'done':''}>{order[2]}</b><small>{order[3]}</small>{active&&<ChevronRight/>}</button>})}</div><div className="order-detail"><h3>Order Details</h3><small>ORDER ID</small><strong>{String(selectedOrder?.external_reference || selectedOrder?.id || orders[0][0])} <Copy/></strong><small>CUSTOMER</small><strong>{selectedOrder ? customerName(selectedOrder) : orders[0][1]}</strong><small>PICKUP</small><strong>{stopCity(selectedPickup, 'Tamil Nadu pickup')} <MapPin/></strong><span>{stopAddress(selectedPickup)}</span><small>DROP-OFF</small><strong>{stopCity(selectedDropoff, 'Tamil Nadu drop-off')} <MapPin/></strong><span>{stopAddress(selectedDropoff)}</span><hr/><small>DRIVER</small><strong>{String(selectedDriver.name || 'Awaiting assignment')}</strong><small>VEHICLE</small><strong>{String(selectedDriver.vehicle_type || '—')}</strong><small>STATUS</small><b>{formatStatus(String(selectedOrder?.status || 'created'))}</b><small>LAST UPDATED</small><em>{formatDate(String(selectedOrder?.updated_at || ''))}</em></div></div></article>
      <article className="shot-vehicle-load"><header><h2>Vehicle Load</h2><span>• {currentVehicleDriver?.online?'Live':'Offline'}</span></header><div className="truck-stage"><button aria-label="Previous vehicle" onClick={()=>moveVehicle(-1)}><ChevronLeft/></button><div className="vehicle-load-truck"><Image src="/images/vehicle-load-truck.png" alt="White cargo truck showing the current vehicle load" width={1774} height={887} priority/><strong>{currentLoadPercent}%</strong></div><button aria-label="Next vehicle" onClick={()=>moveVehicle(1)}><ChevronRight/></button></div><strong className="capacity">{currentLoadPercent}%</strong><span>capacity</span><small>VEHICLE</small><b>{String(currentVehicle.registration_number||'No vehicle')}</b><small>DRIVER</small><b>{String(currentVehicleDriver?.name||'—')}</b><div className="load-numbers"><p><span>CURRENT LOAD</span><strong>{currentLoadKG} KG</strong></p><p><span>MAX LOAD</span><strong>{maxLoadKG} KG</strong></p></div><footer>Vehicle {vehicles.length?vehicleIndex+1:0} of {vehicles.length}<div>{vehicles.map((vehicle,index)=>index===vehicleIndex?<b key={String(vehicle.id)}/>:<i key={String(vehicle.id)} onClick={()=>setVehicleIndex(index)}/>)}</div></footer></article>
    </section>

    <section className="shot-charts"><article className="trend-card"><header>Delivery Trends <button>30d⌄</button></header><TrendChart kind="delivery"/></article><article className="efficiency"><header>Route Efficiency <button>30d⌄</button></header><strong>94<small>%</small></strong><p>vs previous 30 days</p><EfficiencyChart/><b>↑ 12%</b><small>The best road usage this month.</small></article><article className="trend-card"><header>Revenue Trend <nav aria-label="Revenue trend period"><button>7d</button><button className="active">30d</button><button>90d</button></nav></header><TrendChart kind="revenue"/></article></section>

    <section className="shot-small-widgets"><article className="top-drivers"><header><span><strong>Top Drivers</strong><small>Ranked by the selected performance metric</small></span><span className="top-driver-tabs">{(['orders','ontime','distance'] as const).map(metric=><button key={metric} title={metric==='orders'?'Orders assigned to the driver':metric==='ontime'?'Percentage of completed deliveries before the drop-off deadline':'Combined pickup-to-drop-off distance'} className={topDriverMetric===metric?'active':''} onClick={()=>setTopDriverMetric(metric)}>{metric==='ontime'?'On-time':metric.charAt(0).toUpperCase()+metric.slice(1)}</button>)}</span></header><div className="top-driver-column-head"><span>Rank &amp; driver</span><span>{topDriverMetric==='ontime'?'On-time rate':topDriverMetric==='distance'?'Distance covered':'Assigned orders'}</span></div><section className="top-driver-scroll" aria-label={`Drivers ranked by ${topDriverMetric}`}>{topDrivers.map((entry,index)=><div className="top-driver-row" key={String(entry.driver.id)}><b>{index+1}</b><i>{String(entry.driver.name||'D').charAt(0)}</i><p><strong>{String(entry.driver.name||'Driver')}</strong><span>{entry.orders} orders · {entry.ontime}% on-time · {entry.distance.toFixed(1)} km</span></p><em>{driverMetricValue(entry)}</em></div>)}</section></article><article className="maintenance"><header>Maintenance Overview <Wrench/></header><div><p>OVERDUE<strong>0</strong></p><p>NEXT 7D<strong>0</strong></p><p>MTD<strong>₹0.00</strong></p></div><span>No upcoming maintenance.</span></article><article className="financial"><header>Recent Financial Activity <RefreshCw/></header><small>Latest journal entries posted to the ledger</small><div className="journal"><ClipboardList/><p><strong>Storefront sale · Order order_1m8xvhuacr</strong><span>Jul 28, 2026 · Cash / Sales Revenue</span></p><b>₹12.50</b></div><div className="finance-stats">{[['Revenue','₹12.50'],['Net income','₹12.50'],['Outstanding AR','₹0.00'],['Expenses','₹0.00']].map(v=><p key={v[0]}><span>{v[0]}</span><strong>{v[1]}</strong><small>vs previous period</small></p>)}</div></article></section>

    <section className="shot-bottom"><article><header>Fleetbase Blog <span>View all posts →</span></header><div className="featured-img"/><h3>The future of fleet operations is connected</h3><p>Explore how real-time visibility, automation, and AI are transforming modern fleet management.</p><small>Jul 24, 2026　·　5 min read</small></article><article className="developer-card"><h2>Built for developers.<br/>Backed by community.</h2><p>Droo is open, extensible, and stronger together. Join the conversation, contribute, and help shape the future.</p><a>Star us on GitHub　↗</a><a>Join our community　↗</a><div className="developer-art">&lt;/&gt;</div></article></section>
    <footer className="shot-footer">© 2026 Droo. All rights reserved.<span>Privacy Policy　 Terms of Service　 Status</span></footer>
    {createDashboardOpen&&<div className="dashboard-modal-backdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setCreateDashboardOpen(false)}}><section className="dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="create-dashboard-title"><header><h2 id="create-dashboard-title">Create a new Dashboard</h2></header><label><span>Dashboard name</span><input autoFocus value={newDashboardName} onChange={(event)=>setNewDashboardName(event.target.value)} onKeyDown={(event)=>{if(event.key==='Enter')createDashboard()}} placeholder="Operations overview" maxLength={80}/></label><footer><button onClick={()=>setCreateDashboardOpen(false)}>Cancel</button><button className="primary" disabled={!newDashboardName.trim()} onClick={createDashboard}>Create Dashboard</button></footer></section></div>}
    {widgetPanelOpen&&<div className="dashboard-widget-panel" role="dialog" aria-modal="true" aria-label="Add widgets"><header><div><h2>Add widgets</h2><p>Widgets available for {currentDashboard.name}</p></div><button onClick={()=>setWidgetPanelOpen(false)}>×</button></header><div>{['Tracking map','Operational KPIs','Active orders','Vehicle load','Delivery trends','Top drivers','Maintenance overview','Financial activity'].map(widget=><article key={widget}><LayoutGrid/><span><strong>{widget}</strong><small>Already included in this dashboard layout</small></span><Check/></article>)}</div><footer><button onClick={()=>setWidgetPanelOpen(false)}>Close and save</button></footer></div>}
  </div>
}
