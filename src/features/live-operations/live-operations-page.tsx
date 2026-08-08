'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, Ban, Binoculars, Building2, CarFront, Contact, ExternalLink, Eye, Filter, Layers3, LayoutDashboard, List, Map as MapIcon, MapPin, MoreHorizontal, Navigation, Paperclip, Pencil, Play, Plus, Radio, RefreshCw, Route, Search, Send, SkipBack, SkipForward, SlidersHorizontal, Square, Table2, Trash2, Truck, Upload, UserMinus, UserRound, X, Zap } from 'lucide-react'
import { useApiData } from '@/hooks/use-api-data'
import { GoogleLiveMap } from '@/components/google-live-map'
import { StatusBadge } from '@/components/ui/status-badge'
import { ComposeDialog } from '@/components/ui/compose-dialog'
import { VehicleEditor } from '@/components/vehicle-editor'
import { listDashboardState, putDashboardState } from '@/lib/dashboard-state'
import type { ApiRecord } from '@/types/dashboard'

type ViewMode = 'map' | 'table' | 'board'
type ResourceView = 'Vehicles' | 'Drivers' | 'Places' | 'Positions' | 'Geofences' | 'Events'
type BoardStage = 'Created' | 'Dispatched' | 'Started' | 'On Route'

const resourceViews: { label: ResourceView; icon: typeof Truck }[] = [
  { label: 'Vehicles', icon: CarFront }, { label: 'Drivers', icon: Contact },
  { label: 'Places', icon: Building2 }, { label: 'Positions', icon: MapPin },
  { label: 'Geofences', icon: Radio }, { label: 'Events', icon: List },
]

const boardStages: BoardStage[] = ['Created', 'Dispatched', 'Started', 'On Route']

function stopLabel(row: Record<string, unknown>, type: 'pickup' | 'dropoff') {
  const stops = Array.isArray(row.stops) ? row.stops as Record<string, unknown>[] : []
  const stop = stops.find(item => String(item.type || '').toLowerCase() === type)
  const address = (stop?.address || {}) as Record<string, unknown>
  return [address.line1, address.city, address.country_code].filter(Boolean).map(String).join(', ') || '—'
}

function assignedDriver(row: Record<string, unknown>) {
  const assigned = row.assigned_driver && typeof row.assigned_driver === 'object' ? row.assigned_driver as Record<string, unknown> : {}
  const driver = (row.driver || {}) as Record<string, unknown>
  return String(assigned.name || driver.name || (typeof row.assigned_driver === 'string' ? row.assigned_driver : '') || 'Unassigned')
}

function relativeLastSeen(value: unknown) {
  if (!value) return '—'
  const time = new Date(String(value)).getTime()
  if (!Number.isFinite(time)) return String(value)
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000))
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} hr`
  return `${Math.floor(seconds / 86_400)} days`
}

function positionCoordinate(value: unknown) {
  const coordinate = Number(value)
  return Number.isFinite(coordinate) ? coordinate.toFixed(6) : '—'
}

function positionTimestamp(value: unknown) {
  if (!value) return '—'
  const timestamp = new Date(String(value))
  if (!Number.isFinite(timestamp.getTime())) return String(value)
  return timestamp.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function coordinates(value: unknown) {
  const point = value && typeof value === 'object' ? value as ApiRecord : {}
  const latitude = Number(point.latitude)
  const longitude = Number(point.longitude)
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
}

function haversineKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const earthRadiusKm = 6371.0088
  const latitudeDelta = radians(to.latitude - from.latitude)
  const longitudeDelta = radians(to.longitude - from.longitude)
  const fromLatitude = radians(from.latitude)
  const toLatitude = radians(to.latitude)
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function boardStage(row: Record<string, unknown>, index: number): BoardStage {
  const status = String(row.status || '').toLowerCase()
  if (status.includes('created') || status.includes('published')) return 'Created'
  if (status.includes('dispatch') || status.includes('assigned')) return 'Dispatched'
  if (status.includes('start') || status.includes('pickup')) return 'Started'
  if (status.includes('route') || status.includes('transit')) return 'On Route'
  return boardStages[index % boardStages.length]
}

export function LiveOperationsPage({ initialView = 'map' }: { initialView?: ViewMode }) {
  const { rows, loading, error, refresh } = useApiData('Live Operations', 10_000, false)
  const { rows: orderRows, loading: ordersLoading, refresh: refreshOrders } = useApiData('Orders', 10_000, false)
  const { rows: vehicleRows, loading: vehiclesLoading } = useApiData('Vehicles', 10_000, false)
  const { rows: driverRows, loading: driversLoading } = useApiData('Drivers', 10_000, false)
  const { rows: geofenceRows } = useApiData('Service Areas', 10_000, false)
  const [importedRows, setImportedRows] = useState<ApiRecord[]>([])
  const [view, setView] = useState<ViewMode>(initialView)
  const [search, setSearch] = useState('')
  const [resourceSearch, setResourceSearch] = useState('')
  const [resourceView, setResourceView] = useState<ResourceView>('Vehicles')
  const [positionPlaying, setPositionPlaying] = useState(false)
  const [positionCursor, setPositionCursor] = useState(0)
  const [positionSpeed, setPositionSpeed] = useState(1)
  const [positionHistory, setPositionHistory] = useState<ApiRecord[]>([])
  const [trackable, setTrackable] = useState('')
  const [positionRange, setPositionRange] = useState(() => { const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - 7); return `${start.toISOString().slice(0, 10)}, ${end.toISOString().slice(0, 10)}` })
  const [eventProvider, setEventProvider] = useState('')
  const [eventDevice, setEventDevice] = useState('')
  const [eventRange, setEventRange] = useState('')
  const [mapHeight, setMapHeight] = useState(440)
  const [boardType, setBoardType] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [detailsRow, setDetailsRow] = useState<Record<string, unknown> | null>(null)
  const [detailsMode, setDetailsMode] = useState<'order' | 'vehicle'>('order')
  const [resourceActionRow, setResourceActionRow] = useState<ApiRecord | null>(null)
  const [resourceActionPosition, setResourceActionPosition] = useState({ top: 0, right: 0 })
  const [hiddenVehicleIds, setHiddenVehicleIds] = useState<Set<string>>(new Set())
  const [routedPath, setRoutedPath] = useState<{ key: string; positions: ApiRecord[] }>({ key: '', positions: [] })
  const [showSelectedRoute, setShowSelectedRoute] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<ApiRecord | null>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<ApiRecord | null>(null)
  const [vehicleOverrides, setVehicleOverrides] = useState<Record<string, ApiRecord>>({})
  const [orderActionRow, setOrderActionRow] = useState<string | null>(null)
  const [orderActionPosition, setOrderActionPosition] = useState({ top: 0, right: 0 })
  const [actionNotice, setActionNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({ route: true, driver: true, pickup: true, dropoff: true })
  const [tablePage, setTablePage] = useState(1)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [stageOverrides, setStageOverrides] = useState<Record<string, BoardStage>>({})
  const [chatText, setChatText] = useState('')
  const [chatMessages, setChatMessages] = useState<string[]>([])
  const [mapOrdersOpen, setMapOrdersOpen] = useState(false)
  const [mapOrderSearch, setMapOrderSearch] = useState('')
  const [mapSearchOpen, setMapSearchOpen] = useState(false)
  const [mapSearch, setMapSearch] = useState('')
  const [alternateMapStyle, setAlternateMapStyle] = useState(false)
  const [mapCommand, setMapCommand] = useState<{ type: 'zoom-in' | 'zoom-out' | 'locate' | 'toggle-type'; nonce: number }>()
  const resourceSearchRef = useRef<HTMLInputElement>(null)
  const mapSearchRef = useRef<HTMLInputElement>(null)
  const mapDragStart = useRef<{ y: number; height: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([listDashboardState<ApiRecord>('vehicle-overrides'), listDashboardState<boolean>('deleted-vehicles')]).then(([overrides, deleted]) => {
      if (cancelled) return
      setVehicleOverrides(Object.fromEntries(overrides.map(entry => [entry.key, entry.value])))
      setHiddenVehicleIds(new Set(deleted.filter(entry => entry.value).map(entry => entry.key)))
    }).catch(value => { if (!cancelled) setActionNotice(value instanceof Error ? value.message : 'Unable to load vehicle state.') })
    return () => { cancelled = true }
  }, [])
  const allRows = useMemo(() => [...orderRows, ...importedRows], [importedRows, orderRows])
  const filtered = useMemo(() => allRows.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'all' || String(row.status || '').toLowerCase() === statusFilter)), [allRows, search, statusFilter])
  const orderStatuses = useMemo(() => Array.from(new Set(allRows.map(row => String(row.status || '').toLowerCase()).filter(Boolean))).sort(), [allRows])
  const tablePageCount = Math.max(1, Math.ceil(filtered.length / 10))
  const currentTablePage = Math.min(tablePage, tablePageCount)
  const pagedOrders = useMemo(() => filtered.slice((currentTablePage - 1) * 10, currentTablePage * 10), [currentTablePage, filtered])
  const activeMapOrders = orderRows
  const visibleMapOrders = useMemo(() => activeMapOrders.filter(row => JSON.stringify(row).toLowerCase().includes(mapOrderSearch.toLowerCase())), [activeMapOrders, mapOrderSearch])
  const liveFiltered = useMemo(() => rows.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search])
  const effectiveVehicleRows = useMemo(() => vehicleRows.map(vehicle => ({ ...vehicle, ...(vehicleOverrides[String(vehicle.id || '')] || {}) })), [vehicleOverrides, vehicleRows])
  const placeRows = useMemo(() => {
    const places = new Map<string, ApiRecord>()
    orderRows.forEach(order => {
      const stops = Array.isArray(order.stops) ? order.stops as ApiRecord[] : []
      stops.forEach((stop, index) => {
        const address = (stop.address || {}) as ApiRecord
        const latitude = Number(address.latitude)
        const longitude = Number(address.longitude)
        const label = [address.line1 || address.label, address.city, address.state, address.country_code].filter(Boolean).map(String).join(', ')
        if (!label) return
        const key = `${label}|${Number.isFinite(latitude) ? latitude : ''}|${Number.isFinite(longitude) ? longitude : ''}`
        if (!places.has(key)) places.set(key, {
          id: String(stop.id || `${order.id || 'order'}-${stop.type || index}`),
          address: label,
          type: stop.type,
          position: Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined,
        })
      })
    })
    return Array.from(places.values())
  }, [orderRows])
  const resources = useMemo(() => {
    const source = resourceView === 'Vehicles' ? effectiveVehicleRows : resourceView === 'Drivers' ? driverRows : resourceView === 'Places' ? placeRows : resourceView === 'Positions' ? rows : []
    return source.filter(row => (resourceView !== 'Vehicles' || !hiddenVehicleIds.has(String(row.id || ''))) && JSON.stringify(row).toLowerCase().includes(resourceSearch.toLowerCase()))
  }, [driverRows, effectiveVehicleRows, hiddenVehicleIds, placeRows, resourceSearch, resourceView, rows])
  const effectiveTrackable = trackable || String(driverRows[0]?.id || '')
  const latestPositionRows = useMemo(() => rows.filter(row => {
    if (!effectiveTrackable) return false
    const driver = row.driver && typeof row.driver === 'object' ? row.driver as ApiRecord : {}
    return String(driver.id || row.driver_id || '') === effectiveTrackable
  }), [effectiveTrackable, rows])
  const positionRows = useMemo(() => [...(positionHistory.length ? positionHistory : latestPositionRows)].sort((left, right) => {
    const leftPosition = left.position && typeof left.position === 'object' ? left.position as ApiRecord : left
    const rightPosition = right.position && typeof right.position === 'object' ? right.position as ApiRecord : right
    return new Date(String(leftPosition.recorded_at || 0)).getTime() - new Date(String(rightPosition.recorded_at || 0)).getTime()
  }), [latestPositionRows, positionHistory])
  const positionMapRows = useMemo(() => {
    if (!effectiveTrackable || positionRows.length === 0) return []
    const driver = driverRows.find(row => String(row.id) === effectiveTrackable)
    const selectedRow = positionRows[Math.min(positionCursor, positionRows.length - 1)]
    if (!selectedRow) return []
    const position = selectedRow.position && typeof selectedRow.position === 'object' ? selectedRow.position as ApiRecord : selectedRow
    const latitude = Number(position.latitude)
    const longitude = Number(position.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
    return [{
      id: effectiveTrackable,
      driver: { id: effectiveTrackable, name: driver?.name || driver?.id || 'Selected driver' },
      position: { ...position, latitude, longitude },
    }]
  }, [driverRows, effectiveTrackable, positionCursor, positionRows])
  const vehicleLocationRows = useMemo(() => {
    const liveIds = new Set(liveFiltered.map(row => String(((row.driver || {}) as ApiRecord).id || row.id || '')))
    const missingVehicles = effectiveVehicleRows.flatMap(vehicle => {
      const driverId = String(vehicle.driver_id || '')
      const position = vehicle.position && typeof vehicle.position === 'object' ? vehicle.position as ApiRecord : null
      if (!driverId || !position || liveIds.has(driverId)) return []
      return [{ id: driverId, driver: { id: driverId, name: vehicle.assigned_driver || vehicle.registration_number || driverId }, position } as ApiRecord]
    })
    return [...liveFiltered, ...missingVehicles]
  }, [effectiveVehicleRows, liveFiltered])
  const baseMapRows = resourceView === 'Positions' ? positionMapRows : vehicleLocationRows
  const mapSelected = resourceView === 'Positions' ? effectiveTrackable : selected
  const deviceEventRows = useMemo(() => orderRows.flatMap(order => {
    const metadata = order.metadata && typeof order.metadata === 'object' ? order.metadata as ApiRecord : {}
    const event = metadata.device_event && typeof metadata.device_event === 'object' ? metadata.device_event as ApiRecord : null
    if (!event) return []
    return [{ ...event, id: `${order.id}-device`, device: order.external_reference || order.id } as ApiRecord]
  }), [orderRows])
  const geofenceEventRows = useMemo(() => orderRows.flatMap(order => {
    const metadata = order.metadata && typeof order.metadata === 'object' ? order.metadata as ApiRecord : {}
    const event = metadata.geofence_event && typeof metadata.geofence_event === 'object' ? metadata.geofence_event as ApiRecord : null
    if (!event) return []
    return [{ ...event, id: `${order.id}-geofence`, order: order.external_reference || order.id } as ApiRecord]
  }), [orderRows])
  const selectedVehicle = useMemo(() => effectiveVehicleRows.find(row => String(row.id) === selectedVehicleId), [effectiveVehicleRows, selectedVehicleId])
  const selectedDriver = useMemo(() => selectedVehicle ? driverRows.find(row => String(row.id) === String(selectedVehicle.driver_id)) : undefined, [driverRows, selectedVehicle])
  const selectedOrder = useMemo(() => {
    if (!selectedDriver) return undefined
    const driverOrders = orderRows.filter(row => {
      const assigned = row.assigned_driver && typeof row.assigned_driver === 'object' ? row.assigned_driver as ApiRecord : {}
      return String(assigned.id || row.assigned_driver_id || '') === String(selectedDriver.id)
    })
    return driverOrders.find(row => !['delivered', 'cancelled', 'failed'].includes(String(row.status).toLowerCase())) || driverOrders[0]
  }, [orderRows, selectedDriver])
  const selectedRouteEndpoints = useMemo(() => {
    const stops = Array.isArray(selectedOrder?.stops) ? selectedOrder.stops as ApiRecord[] : []
    const pickup = coordinates(stops.find(stop => String(stop.type || '').toLowerCase() === 'pickup')?.address)
    const dropoff = coordinates(stops.find(stop => String(stop.type || '').toLowerCase() === 'dropoff')?.address)
    return pickup && dropoff ? { pickup, dropoff, key: `${pickup.latitude},${pickup.longitude}:${dropoff.latitude},${dropoff.longitude}` } : null
  }, [selectedOrder])
  useEffect(() => {
    if (!selectedRouteEndpoints) return
    let cancelled = false
    const { pickup, dropoff, key } = selectedRouteEndpoints
    const query = new URLSearchParams({ originLat: String(pickup.latitude), originLng: String(pickup.longitude), destinationLat: String(dropoff.latitude), destinationLng: String(dropoff.longitude) })
    fetch(`/api/dev/routes?${query}`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error(`Route failed (${response.status})`)))
      .then(value => { if (!cancelled && Array.isArray(value.path) && value.path.length) setRoutedPath({ key, positions: value.path.map((point: { lat: number; lng: number }) => ({ latitude: point.lat, longitude: point.lng })) }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedRouteEndpoints])
  const selectedRoutePositions = useMemo(() => selectedRouteEndpoints ? routedPath.key === selectedRouteEndpoints.key ? routedPath.positions : [selectedRouteEndpoints.pickup, selectedRouteEndpoints.dropoff] : [], [routedPath, selectedRouteEndpoints])
  const mapRows = useMemo(() => baseMapRows.map((row, index) => {
    const id = String(((row.driver || {}) as ApiRecord).id || row.id || index)
    return showSelectedRoute && id === mapSelected && selectedRoutePositions.length ? { ...row, route_positions: selectedRoutePositions } : row
  }), [baseMapRows, mapSelected, selectedRoutePositions, showSelectedRoute])
  const mapSearchResults = useMemo(() => {
    const query = mapSearch.trim().toLowerCase()
    if (!query) return mapRows.slice(0, 6)
    return mapRows.filter(row => JSON.stringify(row).toLowerCase().includes(query)).slice(0, 6)
  }, [mapRows, mapSearch])
  const selectedMaxLoadKg = Number(selectedVehicle?.max_load_kg)
  const selectedCurrentLoadKg = Number(selectedVehicle?.current_load_kg)
  const hasCapacityData = Number.isFinite(selectedMaxLoadKg) && selectedMaxLoadKg > 0 && Number.isFinite(selectedCurrentLoadKg) && selectedCurrentLoadKg >= 0
  const capacityPercent = hasCapacityData ? Math.min(100, Math.round((selectedCurrentLoadKg / selectedMaxLoadKg) * 100)) : null
  const maxLoadLabel = Number.isFinite(selectedMaxLoadKg) && selectedMaxLoadKg > 0 ? `${selectedMaxLoadKg.toLocaleString('en-IN')} KG` : 'Not provided'
  const routeEfficiency = useMemo(() => {
    if (!selectedOrder) return null
    const stops = Array.isArray(selectedOrder.stops) ? selectedOrder.stops as ApiRecord[] : []
    const pickupStop = stops.find(stop => String(stop.type || '').toLowerCase() === 'pickup')
    const dropoffStop = stops.find(stop => String(stop.type || '').toLowerCase() === 'dropoff')
    const pickup = coordinates(pickupStop?.address)
    const dropoff = coordinates(dropoffStop?.address)
    const current = coordinates(selectedVehicle?.position)
    if (pickup && dropoff && current) {
      const directDistance = haversineKm(pickup, dropoff)
      const liveDistance = haversineKm(pickup, current) + haversineKm(current, dropoff)
      if (directDistance > 0 && liveDistance > 0) return Math.min(100, Math.round((directDistance / liveDistance) * 100))
    }
    const plannedDistance = Number(selectedOrder.distance)
    const actualDistance = Number(selectedOrder.adhoc_distance)
    if (Number.isFinite(plannedDistance) && plannedDistance > 0 && Number.isFinite(actualDistance) && actualDistance > 0) {
      return Math.min(100, Math.round((plannedDistance / actualDistance) * 100))
    }
    return selectedOrder.is_route_optimized === true ? 100 : null
  }, [selectedOrder, selectedVehicle])
  const efficiencyGraph = useMemo(() => {
    if (routeEfficiency == null) return null
    const endY = 116 - routeEfficiency * 0.72
    const middleY = Math.min(108, endY + (100 - routeEfficiency) * 1.4 + 24)
    const firstPeakY = Math.max(28, endY + 18)
    return {
      path: `M8 112 C52 126 65 ${firstPeakY.toFixed(1)} 110 ${(firstPeakY + 10).toFixed(1)} S170 ${middleY.toFixed(1)} 205 ${(endY + 10).toFixed(1)} S258 ${(endY - 13).toFixed(1)} 286 ${endY.toFixed(1)}`,
      endY,
    }
  }, [routeEfficiency])
  const shipmentTrend = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      return { date, count: 0 }
    })
    orderRows.forEach(order => {
      const rawDate = order.created_at || order.inserted_at || order.updated_at
      if (!rawDate) return
      const orderDate = new Date(String(rawDate))
      if (!Number.isFinite(orderDate.getTime())) return
      orderDate.setHours(0, 0, 0, 0)
      const day = days.find(item => item.date.getTime() === orderDate.getTime())
      if (day) day.count += 1
    })
    const max = Math.max(1, ...days.map(day => day.count))
    return days.map(day => ({
      ...day,
      label: day.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }).replace('/', '.'),
      height: day.count === 0 ? 12 : 12 + Math.round((day.count / max) * 6),
    }))
  }, [orderRows])
  const selectedOrderPrice = selectedOrder?.price && typeof selectedOrder.price === 'object' ? selectedOrder.price as ApiRecord : {}
  const amountMinor = Number(selectedOrderPrice.amount_minor || selectedOrder?.amount_minor || 0)
  const selectedOrderItems = Array.isArray(selectedOrder?.items) ? selectedOrder.items as ApiRecord[] : []
  const parcelTypes = selectedOrderItems.map(item => String(item.name || '')).filter(Boolean).join(', ')
  const driverRating = selectedDriver?.rating ?? selectedDriver?.average_rating
  const selectedStops = Array.isArray(selectedOrder?.stops) ? selectedOrder.stops as ApiRecord[] : []
  const selectedDropoff = selectedStops.find(stop => String(stop.type || '').toLowerCase() === 'dropoff')
  const selectedArrivalAt = selectedDropoff?.latest_at || selectedDropoff?.earliest_at || selectedOrder?.estimated_arrival_at
  useEffect(() => {
    if (!effectiveTrackable) return
    const token = sessionStorage.getItem('droo.dev_access_token.v2')
    const [rawFrom, rawTo] = positionRange.split(',').map(value => value.trim())
    const query = new URLSearchParams({ limit: '100' })
    if (rawFrom) query.set('from', new Date(`${rawFrom}T00:00:00Z`).toISOString())
    if (rawTo) query.set('to', new Date(`${rawTo}T23:59:59Z`).toISOString())
    fetch(`/v1/admin/drivers/${encodeURIComponent(effectiveTrackable)}/positions?${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(response => response.ok ? response.json() : Promise.reject(new Error(`Position history failed (${response.status})`)))
      .then(value => { const positions = Array.isArray(value) ? value : value.data || []; setPositionHistory(positions); setPositionCursor(Math.max(0, positions.length - 1)) })
      .catch(() => { setPositionHistory([]); setPositionCursor(0) })
  }, [effectiveTrackable, positionRange])
  useEffect(() => {
    if (!positionPlaying || positionRows.length < 2) return
    const timer = window.setInterval(() => {
      setPositionCursor(current => {
        if (current >= positionRows.length - 1) {
          setPositionPlaying(false)
          return current
        }
        return current + 1
      })
    }, 1000 / positionSpeed)
    return () => window.clearInterval(timer)
  }, [positionPlaying, positionRows.length, positionSpeed])
  const select = useCallback((id: string) => setSelected(id), [])
  const changeView = useCallback((next: ViewMode) => {
    setView(next)
    const url = new URL(window.location.href)
    if (next === 'map') url.searchParams.delete('layout')
    else url.searchParams.set('layout', next === 'board' ? 'kanban' : 'table')
    window.history.replaceState({}, '', url)
  }, [])
  const focusVehicleOnMap = useCallback((vehicle: ApiRecord, includeRoute = false) => {
    const vehicleId = String(vehicle.id || '')
    const trackingId = String(vehicle.driver_id || vehicleId)
    setSelectedVehicleId(vehicleId || null)
    setSelected(trackingId || null)
    setResourceView('Vehicles')
    setShowSelectedRoute(includeRoute)
    setResourceActionRow(null)
    changeView('map')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [changeView])
  const deleteVehicle = useCallback(async (vehicle: ApiRecord) => {
    const id = String(vehicle.id || '')
    if (!id) { setActionNotice('Vehicle ID is missing.'); return }
    const label = String(vehicle.registration_number || vehicle.name || id)
    try { await putDashboardState('deleted-vehicles', id, true) } catch (value) { setActionNotice(value instanceof Error ? value.message : 'Unable to delete vehicle.'); return }
    setHiddenVehicleIds(current => new Set(current).add(id))
    if (selectedVehicleId === id) { setSelectedVehicleId(null); setSelected(null); setShowSelectedRoute(false) }
    setResourceActionRow(null)
    setDeletingVehicle(null)
    setActionNotice(`${label} deleted from the vehicle table.`)
  }, [selectedVehicleId])
  const issueMapCommand = useCallback((type: 'zoom-in' | 'zoom-out' | 'locate' | 'toggle-type') => setMapCommand({ type, nonce: Date.now() }), [])
  const resizeMap = useCallback((clientY: number) => {
    if (!mapDragStart.current) return
    const next = mapDragStart.current.height + clientY - mapDragStart.current.y
    setMapHeight(Math.max(260, Math.min(window.innerHeight - 120, next)))
  }, [])
  const toggleChecked = useCallback((id: string) => setChecked(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }), [])
  const importOrders = useCallback((file?: File) => {
    if (!file) return
    file.text().then(text => {
      const lines = text.split(/\r?\n/).filter(Boolean).slice(1)
      setImportedRows(lines.map((line, index) => {
        const values = line.split(',').map(value => value.trim().replace(/^"|"$/g, ''))
        return { id: values[0] || `imported_order_${Date.now()}_${index}`, external_reference: values[0], service_type: values[1], status: 'created', driver: { name: values[2] || 'Unassigned' }, stops: [{ type: 'pickup', address: { line1: values[3] } }, { type: 'dropoff', address: { line1: values[4] } }] }
      }))
    })
  }, [])
  const cancelOrder = useCallback(async (row: Record<string, unknown>) => {
    const id = String(row.id || '')
    if (!id) return
    const token = sessionStorage.getItem('droo.dev_access_token.v2')
    const response = await fetch(`/v1/admin/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID(), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ reason: 'Cancelled from operations dashboard' }) })
    if (!response.ok) throw new Error(`Cancel failed (${response.status})`)
    refreshOrders()
  }, [refreshOrders])
  const mutateOrder = useCallback(async (row: Record<string, unknown>, action: 'unassign' | 'archive') => {
    const id = String(row.id || '')
    if (!id) throw new Error('Order ID is missing.')
    const token = sessionStorage.getItem('droo.dev_access_token.v2')
    const response = await fetch(action === 'archive' ? `/v1/admin/orders/${encodeURIComponent(id)}` : `/v1/admin/orders/${encodeURIComponent(id)}/unassign`, {
      method: action === 'archive' ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!response.ok) throw new Error(`${action === 'archive' ? 'Delete' : 'Unassign'} failed (${response.status})`)
    refreshOrders()
  }, [refreshOrders])
  const exportOrders = useCallback(() => {
    const csv = ['ID,Route type,Driver,Pickup,Dropoff', ...filtered.map(row => {
      const driver = (row.driver || {}) as Record<string, unknown>
      return [String(row.external_reference || row.id || ''), String(row.service_type || 'Pickup & Dropoff'), String(driver.name || row.assigned_driver || 'Unassigned'), stopLabel(row, 'pickup'), stopLabel(row, 'dropoff')].map(value => `"${value.replaceAll('"', '""')}"`).join(',')
    })].join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'orders.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }, [filtered])

  return <div className="fleet-workspace orders-workspace">
    <div className="fleet-viewbar">
      <Layers3 />
      <div className="view-switcher">
        <button className={view === 'map' ? 'active' : ''} onClick={() => changeView('map')}><MapIcon />Map</button>
        <button className={view === 'table' ? 'active' : ''} onClick={() => changeView('table')}><Table2 />Table <span>{filtered.length}</span></button>
        <button className={view === 'board' ? 'active' : ''} onClick={() => changeView('board')}><LayoutDashboard />Board</button>
      </div>
    </div>

    {view === 'map' && <>
      <section className="operations-map-stage order-map-stage" style={{ height: mapHeight }}>
        <GoogleLiveMap rows={mapRows} selected={mapSelected} onSelect={select} command={mapCommand} markerStyle="truck" showStopMarkers={false} />
        <div className="map-zoom"><button aria-label="Zoom in" onClick={() => issueMapCommand('zoom-in')}>+</button><button aria-label="Zoom out" onClick={() => issueMapCommand('zoom-out')}>−</button></div>
        <div className="map-tools">
          <button className={`map-create-order${composeOpen ? ' is-active' : ''}`} aria-label="Create Order" aria-pressed={composeOpen} data-tooltip="Create Order" onClick={() => setComposeOpen(value => !value)}><Send /></button>
          <button className={mapSearchOpen ? 'active' : ''} aria-label="Search map" aria-expanded={mapSearchOpen} data-tooltip="Search map" onClick={() => { setMapSearchOpen(value => !value); setMapOrdersOpen(false); window.setTimeout(() => mapSearchRef.current?.focus(), 0) }}><Search /></button>
          <button className={mapOrdersOpen ? 'active' : ''} aria-label={`Orders: ${activeMapOrders.length}`} aria-expanded={mapOrdersOpen} data-tooltip="Order layers" onClick={() => { setMapOrdersOpen(value => !value); setMapSearchOpen(false) }}><Layers3 /><i>{activeMapOrders.length}</i></button>
          <button className={alternateMapStyle ? 'active' : ''} aria-label="Change map style" aria-pressed={alternateMapStyle} data-tooltip="Map style" onClick={() => { issueMapCommand('toggle-type'); setAlternateMapStyle(value => !value) }}><MapIcon /></button>
          <button aria-label="Fit all live positions" data-tooltip="Fit all positions" onClick={() => issueMapCommand('locate')}><Eye /></button>
          <button aria-label="Explore first live vehicle" data-tooltip="Explore vehicles" onClick={() => { const first = mapRows[0]; if (!first) { setResourceView('Vehicles'); setActionNotice('No live vehicle positions are available yet.'); return }; const id = String(((first.driver || {}) as ApiRecord).id || first.id || ''); setResourceView('Vehicles'); setSelected(id); issueMapCommand('locate') }}><Binoculars /></button>
        </div>
        {mapSearchOpen && <aside className="map-search-panel" aria-label="Search live map">
          <header><Search /><input ref={mapSearchRef} value={mapSearch} onChange={event => setMapSearch(event.target.value)} placeholder="Search vehicles or drivers…" /><button aria-label="Close map search" onClick={() => setMapSearchOpen(false)}><X /></button></header>
          <div>{mapSearchResults.map((row, index) => {
            const record = row as ApiRecord
            const driver = (row.driver || {}) as ApiRecord
            const id = String(driver.id || row.id || index)
            return <button key={id} onClick={() => { select(id); setMapSearchOpen(false) }}><Navigation /><span><strong>{String(driver.name || record.registration_number || record.name || `Vehicle ${index + 1}`)}</strong><small>{String(record.registration_number || driver.id || id)}</small></span></button>
          })}{mapSearchResults.length === 0 && <p>No matching live positions.</p>}</div>
        </aside>}
        {mapOrdersOpen && <aside className="map-orders-drawer" aria-label="Orders">
          <header><label><Search /><input autoFocus value={mapOrderSearch} onChange={event => setMapOrderSearch(event.target.value)} placeholder="Search orders..." /></label><button aria-label="More order options"><MoreHorizontal /></button><button aria-label="Close active orders" onClick={() => setMapOrdersOpen(false)}><X /></button></header>
          <div className="map-orders-heading"><strong>ORDERS</strong><b>{activeMapOrders.length} ORDERS</b></div>
          <div className="map-orders-list">{visibleMapOrders.map((order, index) => {
            const assigned = order.assigned_driver && typeof order.assigned_driver === 'object' ? order.assigned_driver as ApiRecord : {}
            const customer = order.customer && typeof order.customer === 'object' ? order.customer as ApiRecord : {}
            const status = String(order.status || 'Active')
            return <article key={String(order.id || index)}>
              <header><span>{index + 1}</span><MapPin /><strong>{String(order.external_reference || order.id || 'Order')}</strong><em>{status}</em></header>
              <div className="map-order-route"><i /><Truck /><span /><i /></div>
              <b className="map-order-gps">Live GPS</b>
              <div className="map-order-stops"><p><strong>Pickup</strong><span>{stopLabel(order, 'pickup')}</span></p><p><strong>Dropoff</strong><span>{stopLabel(order, 'dropoff')}</span></p></div>
              <div className="map-order-people"><p><UserRound /><span><strong>Customer</strong><small>{String(customer.name || 'No Customer')}</small><small>{String(customer.phone || customer.phone_number || 'No Phone')}</small></span></p><p><UserRound /><span><strong>Driver Assigned</strong><small>{assignedDriver(order)}</small><small>{String(assigned.phone || assigned.phone_number || 'No Phone')}</small></span></p></div>
            </article>
          })}{visibleMapOrders.length === 0 && <div className="map-orders-empty">No orders found.</div>}</div>
        </aside>}
        <div className="map-resize-handle" role="separator" aria-label="Resize map" aria-orientation="horizontal" tabIndex={0} onPointerDown={event => { mapDragStart.current = { y: event.clientY, height: mapHeight }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={event => resizeMap(event.clientY)} onPointerUp={event => { mapDragStart.current = null; event.currentTarget.releasePointerCapture(event.pointerId) }} onPointerCancel={() => { mapDragStart.current = null }} onDoubleClick={() => setMapHeight(window.innerHeight - 120)} onKeyDown={event => { if (event.key === 'ArrowDown') setMapHeight(value => Math.min(window.innerHeight - 120, value + 40)); if (event.key === 'ArrowUp') setMapHeight(value => Math.max(260, value - 40)); if (event.key === 'Enter') setMapHeight(window.innerHeight - 120) }}><span /></div>
        {loading && <div className="map-state">Loading orders…</div>}
        {error && <div className="map-state error">{error}</div>}
      </section>

      {selectedVehicle && <section className="shipment-dashboard" aria-label="Selected shipment dashboard">
        <article className="shipment-card shipment-summary-card">
          <header><h2>Shipment details</h2><button onClick={() => { if (selectedOrder) { setDetailsMode('order'); setDetailsRow(selectedOrder) } }}>Read more</button></header>
          <div className="shipment-person"><span><UserRound /></span><div><strong>{String(selectedDriver?.name || assignedDriver(selectedOrder || {}))}</strong><small>{String(selectedOrder?.external_reference || selectedOrder?.id || 'No active order')} · IN</small></div><div className="shipment-rating">Rating <b>{driverRating == null || driverRating === '' ? '—' : String(driverRating)}</b><MoreHorizontal /></div></div>
          <div className="shipment-facts">
            <section><strong>Transport parcels</strong><span>{String(selectedOrder?.status || 'Not available')}</span><b>{amountMinor ? `${(amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ₹` : '—'}</b></section>
            <section><strong>Parcels Loading</strong><div><span>{stopLabel(selectedOrder || {}, 'pickup')}</span><span>{stopLabel(selectedOrder || {}, 'dropoff')}</span></div><i /><small>Date of arrival</small><b>{selectedArrivalAt ? new Date(String(selectedArrivalAt)).toLocaleDateString('en-GB').replaceAll('/', '.') : 'Not scheduled'}</b></section>
            <section><strong>Status</strong><em>{String(selectedOrder?.status || 'Not available')}</em><small>Type of parcels</small><em>{parcelTypes || 'Not provided'}</em></section>
          </div>
        </article>

        <article className="shipment-card capacity-card">
          <header><h2>Current truck capacity</h2><button onClick={() => { if (selectedVehicle) { setDetailsMode('vehicle'); setDetailsRow(selectedVehicle) } }}>Read more</button></header>
          <div className="capacity-visual">
            <svg className="capacity-truck" viewBox="0 0 300 120" role="img" aria-label={capacityPercent == null ? 'Truck capacity not provided' : `Truck at ${capacityPercent}% capacity`}>
              <rect x="89" y="20" width="188" height="66" rx="3" className="truck-box" />
              <rect x="98" y="27" width="132" height="52" rx="2" className="truck-load" />
              <path d="M27 81V48c0-17 11-28 28-28h29v66H27z" className="truck-cab" />
              <path d="M34 48h42V28H55c-12 0-19 7-21 20z" className="truck-window" />
              <path d="M20 85h265v10H20z" className="truck-chassis" />
              <circle cx="60" cy="96" r="17" className="truck-wheel" /><circle cx="60" cy="96" r="7" className="truck-hub" />
              <circle cx="236" cy="96" r="17" className="truck-wheel" /><circle cx="236" cy="96" r="7" className="truck-hub" />
              <circle cx="270" cy="96" r="17" className="truck-wheel" /><circle cx="270" cy="96" r="7" className="truck-hub" />
              <path d="M27 62h52M35 72h16" className="truck-detail" />
            </svg>
            <b>{capacityPercent == null ? '—' : `${capacityPercent}%`}</b>
          </div>
          <div className="capacity-meta"><strong>{String(selectedVehicle?.registration_number || 'No vehicle')}</strong><span><Route />{String(selectedVehicle?.status || 'Unknown')}</span><b>Max Load</b><span>{maxLoadLabel}</span></div>
        </article>

        <article className="shipment-card trends-card">
          <header><h2>Shipment trends</h2></header><b>{orderRows.length} shipments</b>
          <div className="trend-chart" aria-label="Shipments created during the last seven days">{shipmentTrend.map((day, index) => <span key={day.date.toISOString()} className={index === shipmentTrend.length - 1 ? 'active' : ''} title={`${day.count} shipment${day.count === 1 ? '' : 's'}`}><i style={{ height: `${day.height}px` }} /><small>{day.label}</small></span>)}</div>
        </article>

        <article className="shipment-card efficiency-card">
          <header><h2>Route efficiency <i className="route-live-indicator">Live</i></h2><Link href="/route-efficiency">View analytics</Link></header><div className="efficiency-visual"><strong>{routeEfficiency == null ? '—' : routeEfficiency}<small>{routeEfficiency == null ? '' : '%'}</small></strong><svg viewBox="0 0 300 132" role="img" aria-label={routeEfficiency == null ? 'Route efficiency unavailable' : `${routeEfficiency}% live route efficiency`}><defs><pattern id="route-efficiency-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.2" className="efficiency-dot" /></pattern></defs><rect x="3" y="8" width="292" height="116" rx="5" className="efficiency-grid" /><text x="150" y="22" textAnchor="middle">The best road</text>{efficiencyGraph ? <><path key={routeEfficiency} className="efficiency-live-path" d={efficiencyGraph.path} pathLength="100" /><circle className="efficiency-live-point" cx="286" cy={efficiencyGraph.endY} r="6" /></> : <text className="efficiency-unavailable" x="150" y="75" textAnchor="middle">Waiting for route data</text>}</svg></div><button onClick={() => setActionNotice(`Best route sent to ${String(selectedDriver?.email || selectedDriver?.name || 'the driver')}.`)}>Send the best route to the driver&apos;s email</button>
        </article>

        <article className="shipment-card chat-card">
          <header><h2>Chat</h2><button aria-label="Open shipment chat" onClick={() => setActionNotice('Shipment chat is open.')}><ExternalLink /></button></header>
          <div className="chat-messages">{chatMessages.length ? chatMessages.map((message, index) => <p key={`${message}-${index}`}>{message}</p>) : <span>No messages for this shipment.</span>}</div>
          <form onSubmit={event => { event.preventDefault(); const message = chatText.trim(); if (!message) return; setChatMessages(current => [...current, message]); setChatText('') }}><button type="button" aria-label="Attach file" onClick={() => setActionNotice('Choose a file from the Orders import control.')}><Paperclip /></button><input value={chatText} onChange={event => setChatText(event.target.value)} placeholder="Message" aria-label="Chat message" /><button type="submit" aria-label="Send message"><Send /></button></form>
        </article>
      </section>}

      <section className="order-map-resources">
        <h2>Select a vehicle to view shipment details</h2>
        <div className="resource-tabs" role="tablist">{resourceViews.map(({ label, icon: Icon }) => <button key={label} role="tab" aria-selected={resourceView === label} className={resourceView === label ? 'active' : ''} onClick={() => setResourceView(label)}><Icon />{label}</button>)}</div>
        {(resourceView === 'Vehicles' || resourceView === 'Drivers' || resourceView === 'Places') && <>
          <label className="resource-search"><Search /><input ref={resourceSearchRef} value={resourceSearch} onChange={(event) => setResourceSearch(event.target.value)} placeholder={`Filter ${resourceView.toLowerCase()} by keyword...`} /></label>
          <div className="resource-table-wrap"><table className={`resource-table resource-${resourceView.toLowerCase()}`}><thead>{resourceView === 'Vehicles' ? <tr><th>VEHICLE</th><th>LOCATION</th><th>STATUS</th><th>LAST SEEN</th><th aria-label="Actions" /></tr> : resourceView === 'Drivers' ? <tr><th>DRIVER</th><th>LOCATION</th><th>CURRENT JOB</th><th>STATUS</th><th>LAST SEEN</th><th aria-label="Actions" /></tr> : <tr><th>ADDRESS</th><th>LOCATION</th></tr>}</thead><tbody>
            {resources.map((row, index) => {
              const driver = (row.driver || {}) as Record<string, unknown>
              const position = (row.position || {}) as Record<string, unknown>
              const id = String(driver.id || row.id || index)
              const location = position.latitude && position.longitude ? `${Number(position.latitude).toFixed(4)} ${Number(position.longitude).toFixed(4)}` : '—'
              const name = resourceView === 'Vehicles' ? row.registration_number || row.name || row.id : resourceView === 'Drivers' ? row.name || row.id : row.address || row.name || row.id
              const status = String(row.status || driver.status || 'Unknown')
              if (resourceView === 'Places') return <tr key={id}><td>{String(name || '—')}</td><td>{location}</td></tr>
              return <tr key={id} className={selected === id ? 'selected' : ''} onClick={() => { select(id); if (resourceView === 'Vehicles') setSelectedVehicleId(id) }}><td><span className="resource-name"><i />{resourceView === 'Drivers' ? <Contact /> : <Truck />}{String(name || 'Unnamed resource')}</span></td><td>{location}</td>{resourceView === 'Drivers' && <td>{String(row.current_job || row.active_order_id || '—')}</td>}<td><span className={`resource-status ${status.toLowerCase().replaceAll(' ', '-')}`}><i />{status}</span></td><td>{relativeLastSeen(position.recorded_at || row.updated_at || row.last_seen_at)}</td><td><button aria-label={`Actions for ${String(name || 'vehicle')}`} aria-expanded={resourceActionRow === row} onClick={event => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setResourceActionPosition({ top: Math.max(10, Math.min(rect.bottom + 6, window.innerHeight - 210)), right: Math.max(10, window.innerWidth - rect.right) }); setResourceActionRow(current => current === row ? null : row) }}><MoreHorizontal /></button></td></tr>
            })}
            {!loading && !vehiclesLoading && !driversLoading && resources.length === 0 && <tr><td colSpan={resourceView === 'Drivers' ? 6 : resourceView === 'Places' ? 2 : 5} className="resource-empty">No {resourceView.toLowerCase()} found.</td></tr>}
          </tbody></table></div>
        </>}

        {resourceView === 'Positions' && <section className="position-history">
          <div className="position-controls"><select value={effectiveTrackable} onChange={event => { setTrackable(event.target.value); setSelected(event.target.value || null); setPositionPlaying(false); setPositionCursor(0) }} aria-label="Select trackable"><option value="">Select trackable</option>{driverRows.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.name || row.id)}</option>)}</select><input type="text" value={positionRange} onChange={event => setPositionRange(event.target.value)} placeholder="Select date range" aria-label="Position date range" /><span /><button className="stop" disabled={!positionPlaying} onClick={() => setPositionPlaying(false)}><Square />Stop</button><button className="play" disabled={positionRows.length < 2} onClick={() => { if (positionCursor >= positionRows.length - 1) setPositionCursor(0); setPositionPlaying(true) }}><Play />{positionPlaying ? 'Playing' : 'Play'}</button><button aria-label="Previous position" disabled={positionCursor === 0} onClick={() => { setPositionPlaying(false); setPositionCursor(current => Math.max(0, current - 1)) }}><SkipBack /></button><button aria-label="Next position" disabled={positionRows.length === 0 || positionCursor >= positionRows.length - 1} onClick={() => { setPositionPlaying(false); setPositionCursor(current => Math.min(positionRows.length - 1, current + 1)) }}><SkipForward /></button><label>SPEED:<select aria-label="Playback speed" value={String(positionSpeed)} onChange={event => setPositionSpeed(Number(event.target.value))}><option value="0.5">0.5x</option><option value="1">1x</option><option value="2">2x</option></select></label></div>
          <table><thead><tr><th>#</th><th>TIMESTAMP</th><th>LATITUDE</th><th>LONGITUDE</th><th>SPEED (KM/H)</th><th>HEADING</th><th>ALTITUDE (M)</th></tr></thead><tbody>{positionRows.map((row, index) => { const position = (row.position && typeof row.position === 'object' ? row.position : row) as Record<string, unknown>; const speedKmh = Number(position.speed_mps); return <tr key={String(row.id || position.sequence || index)} className={positionCursor === index ? 'selected' : ''} onClick={() => { setPositionPlaying(false); setPositionCursor(index) }}><td>{index + 1}</td><td title={String(position.recorded_at || '')}>{positionTimestamp(position.recorded_at)}</td><td>{positionCoordinate(position.latitude)}</td><td>{positionCoordinate(position.longitude)}</td><td>{Number.isFinite(speedKmh) ? (speedKmh * 3.6).toFixed(1) : String(position.speed_kmh || '—')}</td><td>{position.heading_deg == null ? '—' : `${Number(position.heading_deg).toFixed(0)}°`}</td><td>{position.altitude_m == null ? '—' : Number(position.altitude_m).toFixed(0)}</td></tr> })}</tbody></table>
          {(!effectiveTrackable || positionRows.length === 0) && <div className="resource-special-empty"><Route /><strong>No positions loaded</strong><span>Select a trackable and date range to load position history for replay.</span></div>}
        </section>}

        {resourceView === 'Geofences' && <section className="geofence-events"><header><h3><Radio />Geofence Events</h3><span>{geofenceRows.length} zones · {geofenceEventRows.length} events</span></header>{geofenceEventRows.length ? <table><thead><tr><th>EVENT</th><th>GEOFENCE</th><th>ORDER</th><th>CREATED</th></tr></thead><tbody>{geofenceEventRows.map(row => <tr key={String(row.id)}><td>{String(row.event || '—')}</td><td>{String(row.geofence || '—')}</td><td>{String(row.order || '—')}</td><td>{String(row.created_at || '—')}</td></tr>)}</tbody></table> : <div className="resource-special-empty"><Radio /><strong>No geofence events yet</strong><span>Events will appear here in real time as drivers and vehicles cross zone and service area boundaries.</span></div>}</section>}

        {resourceView === 'Events' && <section className="device-events"><div className="event-controls"><select value={eventProvider} onChange={event => setEventProvider(event.target.value)}><option value="">All telematics</option>{Array.from(new Set(deviceEventRows.map(row => String(row.provider || '')).filter(Boolean))).map(provider => <option key={provider}>{provider}</option>)}</select><select value={eventDevice} onChange={event => setEventDevice(event.target.value)}><option value="">All devices</option>{deviceEventRows.map(row => <option key={String(row.id)} value={String(row.device)}>{String(row.device)}</option>)}</select><input value={eventRange} onChange={event => setEventRange(event.target.value)} placeholder="Select date range" /></div><table><thead><tr><th>EVENT</th><th>DEVICE</th><th>PROVIDER</th><th>SEVERITY</th><th>CODE</th><th>CREATED</th></tr></thead><tbody>{deviceEventRows.filter(row => (!eventProvider || row.provider === eventProvider) && (!eventDevice || row.device === eventDevice)).map(row => <tr key={String(row.id)}><td>{String(row.event || '—')}</td><td>{String(row.device || '—')}</td><td>{String(row.provider || '—')}</td><td>{String(row.severity || '—')}</td><td>{String(row.code || '—')}</td><td>{String(row.created_at || '—')}</td></tr>)}</tbody></table>{deviceEventRows.length === 0 && <div className="resource-special-empty"><Zap /><strong>No device events</strong><span>Events appear here after connected devices report activity for the selected filters.</span></div>}</section>}
      </section>
    </>}

    {view === 'table' && <section className="orders-table-view">
      <header className="orders-table-toolbar"><h1>Orders</h1><div><label><input value={search} onChange={event => { setSearch(event.target.value); setTablePage(1) }} placeholder="Search Orders" /><Search /></label><span className="orders-tool-popover"><button aria-label="Filter orders" className={filterOpen ? 'active' : ''} onClick={() => setFilterOpen(value => !value)}><Filter /></button>{filterOpen && <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setTablePage(1) }} aria-label="Filter by status"><option value="all">All statuses</option>{orderStatuses.map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select>}</span><span className="orders-tool-popover"><button aria-label="Configure columns" className={columnsOpen ? 'active' : ''} onClick={() => setColumnsOpen(value => !value)}><SlidersHorizontal /></button>{columnsOpen && <div className="column-picker">{Object.keys(visibleColumns).map(column => <label key={column}><input type="checkbox" checked={visibleColumns[column as keyof typeof visibleColumns]} onChange={() => setVisibleColumns(current => ({ ...current, [column]: !current[column as keyof typeof current] }))} />{column}</label>)}</div>}</span><button aria-label="Refresh orders" onClick={refreshOrders}><RefreshCw /></button><button className="primary" onClick={() => setComposeOpen(true)}><Plus />New</button><button onClick={exportOrders}><ArrowUpRight />Export</button><label className="orders-import"><Upload />Import<input type="file" accept=".csv" onChange={event => importOrders(event.target.files?.[0])} /></label></div></header>
      <div className="orders-data-wrap"><table className="orders-data-table"><thead><tr><th><input type="checkbox" checked={pagedOrders.length > 0 && pagedOrders.every((row, index) => checked.has(String(row.id || index)))} onChange={event => setChecked(current => { const next = new Set(current); pagedOrders.forEach((row, index) => { const id = String(row.id || index); if (event.target.checked) next.add(id); else next.delete(id) }); return next })} aria-label="Select visible orders" /></th><th>ID</th>{visibleColumns.route && <th>ROUTE TYPE</th>}{visibleColumns.driver && <th>DRIVER ASSIGNED</th>}{visibleColumns.pickup && <th>PICKUP</th>}{visibleColumns.dropoff && <th>DROPOFF</th>}<th /></tr></thead><tbody>{pagedOrders.map((row, index) => {
        const orderId = String(row.external_reference || row.id || '—')
        const rowId = String(row.id || index)
        return <tr key={rowId} className={checked.has(rowId) ? 'selected' : ''}><td><input type="checkbox" checked={checked.has(rowId)} onChange={() => toggleChecked(rowId)} aria-label={`Select ${orderId}`} /></td><td>{orderId}</td>{visibleColumns.route && <td><span className="route-type">⇄ {String(row.service_type || 'Pickup & Dropoff')}</span></td>}{visibleColumns.driver && <td><span className="assigned-driver"><i /><UserRound /><b>{assignedDriver(row)}</b>{Boolean(row.vehicle_registration) && <em><Truck />{String(row.vehicle_registration)}</em>}</span></td>}{visibleColumns.pickup && <td>{stopLabel(row, 'pickup')}</td>}{visibleColumns.dropoff && <td>{stopLabel(row, 'dropoff')}</td>}<td className="order-actions-cell"><button aria-label={`Actions for ${orderId}`} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setOrderActionPosition({ top: Math.max(10, Math.min(rect.bottom + 6, window.innerHeight - 242)), right: Math.max(10, window.innerWidth - rect.right) }); setOrderActionRow(current => current === rowId ? null : rowId) }}><MoreHorizontal /></button></td></tr>
      })}{!ordersLoading && filtered.length === 0 && <tr><td colSpan={7} className="resource-empty">No orders found.</td></tr>}</tbody></table></div>
      <footer className="orders-pagination"><span>Showing {filtered.length ? (currentTablePage - 1) * 10 + 1 : 0} to {Math.min(currentTablePage * 10, filtered.length)} of {filtered.length} results</span><button disabled={currentTablePage === 1} onClick={() => setTablePage(page => Math.max(1, page - 1))}>‹</button><b>{currentTablePage}</b><button disabled={currentTablePage === tablePageCount} onClick={() => setTablePage(page => Math.min(tablePageCount, page + 1))}>›</button></footer>
    </section>}

    {view === 'board' && <section className="orders-board-view">
      <header className="orders-board-toolbar"><h1>Order Board <span>{filtered.length}</span></h1><select value={boardType} onChange={event => setBoardType(event.target.value)} aria-label="Select order type"><option value="all">All Order Types</option><option value="pickup">Pickup &amp; Dropoff</option><option value="delivery">Delivery</option></select></header>
      <div className="orders-kanban">{boardStages.map(stage => {
        const cards = filtered.map((row, index) => ({ row, index })).filter(item => (stageOverrides[String(item.row.id || item.index)] || boardStage(item.row, item.index)) === stage && (boardType === 'all' || boardType === 'pickup'))
        return <section className={`kanban-column stage-${stage.toLowerCase().replace(' ', '-')}`} key={stage} onDragOver={event => event.preventDefault()} onDrop={event => { const id = event.dataTransfer.getData('text/order-id'); if (id) setStageOverrides(current => ({ ...current, [id]: stage })) }}><header><h2>{stage}</h2><span>{cards.length}</span></header><div className="kanban-cards">{cards.map(({ row, index }) => {
          const driver = (row.driver || {}) as Record<string, unknown>
          const id = String(row.external_reference || row.id || '—')
          const rowId = String(row.id || index)
          return <article className="order-kanban-card" draggable onDragStart={event => event.dataTransfer.setData('text/order-id', rowId)} key={rowId}><header><strong>{id}</strong><button aria-label={`View ${id}`} onClick={() => setDetailsRow(row)}><Eye /></button><span>{stage}</span></header><div className="kanban-route"><i /><b><Truck /></b><em /><section><p><strong>Pickup</strong>{stopLabel(row, 'pickup')}</p><p><strong>Dropoff</strong>{stopLabel(row, 'dropoff')}</p></section></div><footer><p><UserRound /><span><strong>Customer</strong>{String(row.customer_name || '—')}<br />{String(row.customer_phone || '—')}</span></p><p><UserRound /><span><strong>Driver Assigned</strong>{assignedDriver(row)}<br />{String(driver.phone || row.driver_phone || '—')}</span></p></footer></article>
        })}{stage === 'Created' && <button className="add-board-order" onClick={() => setComposeOpen(true)}><Plus />Add an order</button>}{cards.length === 0 && stage !== 'Created' && <div className="kanban-empty">No orders</div>}</div></section>
      })}</div>
    </section>}
    {composeOpen && <ComposeDialog module="Orders" label="Create Order" onClose={() => { setComposeOpen(false); refreshOrders(); refresh() }} />}
    {detailsRow && <div className="order-action-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDetailsRow(null) }}><section className="order-action-dialog" role="dialog" aria-modal="true"><header><div><small>{detailsMode === 'vehicle' ? 'VEHICLE DETAILS' : 'ORDER DETAILS'}</small><h2>{String(detailsMode === 'vehicle' ? detailsRow.registration_number || detailsRow.name || detailsRow.id || 'Vehicle' : detailsRow.external_reference || detailsRow.active_order_id || detailsRow.id || 'Order')}</h2></div><button onClick={() => setDetailsRow(null)} aria-label="Close details"><X /></button></header>{detailsMode === 'vehicle' ? <dl><div><dt>Status</dt><dd><StatusBadge value={String(detailsRow.status || 'Unknown')} /></dd></div><div><dt>Type</dt><dd>{String(detailsRow.type || '—')}</dd></div><div><dt>Driver</dt><dd>{String(detailsRow.assigned_driver || detailsRow.driver_id || 'Unassigned')}</dd></div><div><dt>Location</dt><dd>{positionCoordinate((detailsRow.position as ApiRecord | undefined)?.latitude)} {positionCoordinate((detailsRow.position as ApiRecord | undefined)?.longitude)}</dd></div></dl> : <dl><div><dt>Status</dt><dd><StatusBadge value={String(detailsRow.status || 'Unknown')} /></dd></div><div><dt>Driver</dt><dd>{assignedDriver(detailsRow)}</dd></div><div><dt>Pickup</dt><dd>{stopLabel(detailsRow, 'pickup')}</dd></div><div><dt>Dropoff</dt><dd>{stopLabel(detailsRow, 'dropoff')}</dd></div></dl>}<footer><button onClick={() => { setDetailsRow(null); changeView('map') }}>Show on map</button><button className="primary" onClick={() => setDetailsRow(null)}>Done</button></footer></section></div>}
    {resourceActionRow && <><button className="order-actions-dismiss" aria-label="Close vehicle actions" onClick={() => setResourceActionRow(null)} /><div className="global-order-actions-menu" style={{ top: resourceActionPosition.top, right: resourceActionPosition.right }} role="menu"><header>Vehicle Actions</header><button onClick={() => focusVehicleOnMap(resourceActionRow, true)}><Eye />View Vehicle</button><button onClick={() => { setEditingVehicle(resourceActionRow); setResourceActionRow(null) }}><Pencil />Edit Vehicle</button><button onClick={() => focusVehicleOnMap(resourceActionRow)}><MapPin />Locate Vehicle on Map</button><hr /><button onClick={() => { setDeletingVehicle(resourceActionRow); setResourceActionRow(null) }}><Trash2 />Delete Vehicle</button></div></>}
    {deletingVehicle && <div className="vehicle-delete-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDeletingVehicle(null) }}><section className="vehicle-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="vehicle-delete-title" aria-describedby="vehicle-delete-description"><div className="vehicle-delete-content"><span className="vehicle-delete-warning"><AlertTriangle /></span><div><h2 id="vehicle-delete-title">Delete Vehicle ({String(deletingVehicle.name || deletingVehicle.registration_number || deletingVehicle.id || 'Vehicle')})?</h2><p id="vehicle-delete-description">This action cannot be undone. Once deleted, the record will be permanently removed.</p></div></div><footer><button type="button" onClick={() => setDeletingVehicle(null)}><X />Cancel</button><button type="button" className="danger" onClick={() => deleteVehicle(deletingVehicle)}><Trash2 />Confirm Delete</button></footer></section></div>}
    {editingVehicle && <VehicleEditor vehicle={editingVehicle} drivers={driverRows} onClose={() => setEditingVehicle(null)} onSave={vehicle => { const id = String(vehicle.id || ''); putDashboardState('vehicle-overrides', id, vehicle).then(() => { setVehicleOverrides(current => ({ ...current, [id]: vehicle })); setEditingVehicle(null); setActionNotice('Vehicle changes saved.') }).catch(value => setActionNotice(value instanceof Error ? value.message : 'Unable to save vehicle changes.')) }} />}
    {orderActionRow && (() => { const row = filtered.find((item, index) => String(item.id || index) === orderActionRow); if (!row) return null; return <><button className="order-actions-dismiss" aria-label="Close order actions" onClick={() => setOrderActionRow(null)} /><div className="global-order-actions-menu" style={{ top: orderActionPosition.top, right: orderActionPosition.right }} role="menu"><header>Order Actions</header><button onClick={() => { setDetailsRow(row); setOrderActionRow(null) }}><Eye />View Order</button><button disabled={String(row.status).toLowerCase() !== 'assigned'} onClick={() => { setOrderActionRow(null); mutateOrder(row, 'unassign').then(() => setActionNotice('Driver unassigned.')).catch(error => setActionNotice(error instanceof Error ? error.message : 'Unassign failed.')) }}><UserMinus />Unassign Driver</button><button disabled={['delivered', 'cancelled', 'failed'].includes(String(row.status).toLowerCase())} onClick={() => { if (!window.confirm('Cancel this order?')) return; setOrderActionRow(null); cancelOrder(row).then(() => setActionNotice('Order cancelled.')).catch(error => setActionNotice(error instanceof Error ? error.message : 'Cancel failed.')) }}><Ban />Cancel Order</button><hr /><button onClick={() => { if (!window.confirm('Delete this order from operational lists?')) return; setOrderActionRow(null); mutateOrder(row, 'archive').then(() => setActionNotice('Order deleted.')).catch(error => setActionNotice(error instanceof Error ? error.message : 'Delete failed.')) }}><Trash2 />Delete Order</button></div></> })()}
    {actionNotice && <div className="orders-action-notice" role="status">{actionNotice}<button onClick={() => setActionNotice('')}><X /></button></div>}
  </div>
}
