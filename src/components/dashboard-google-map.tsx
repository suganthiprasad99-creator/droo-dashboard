'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, MapPin } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'

type ApiRecord = Record<string, unknown>
type Coordinate = { lat: number; lng: number }
type RouteMetrics = { totalDistanceMeters: number; travelledDistanceMeters: number; remainingDistanceMeters: number; durationSeconds: number; pickupCompleted: boolean; dropoffCompleted: boolean }

const defaultCenter: Coordinate = { lat: 13.0827, lng: 80.2707 }

function stopCoordinate(order: ApiRecord | undefined, type: string) {
  const stops = Array.isArray(order?.stops) ? order.stops as ApiRecord[] : []
  const stop = stops.find((value) => String(value.type || '') === type)
  const address = (stop?.address || {}) as ApiRecord
  const lat = Number(address.latitude), lng = Number(address.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

export function DashboardGoogleMap({ rows = [], selectedDriverID = '', selectedOrder, mapCommand, mapMode = 'tracking', onRouteMetrics }: { rows?: ApiRecord[]; selectedDriverID?: string; selectedOrder?: ApiRecord; mapCommand?: { type: 'zoom-in' | 'zoom-out' | 'refresh'; id: number }; mapMode?: 'tracking' | 'traffic' | 'poi'; onRouteMetrics?: (metrics: RouteMetrics | null) => void }) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<LeafletMap | null>(null)
  const [error, setError] = useState('')
  const [routeError, setRouteError] = useState('')
  const [routeVisible, setRouteVisible] = useState(false)

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !mapCommand) return
    if (mapCommand.type === 'zoom-in') map.zoomIn()
    if (mapCommand.type === 'zoom-out') map.zoomOut()
    if (mapCommand.type === 'refresh') map.invalidateSize({ animate: true })
  }, [mapCommand])

  useEffect(() => {
    if (!mapElement.current) return
    let active = true
    setError('')
    setRouteError('')
    setRouteVisible(false)
    onRouteMetrics?.(null)

    import('leaflet').then(async (L) => {
      if (!active || !mapElement.current) return
      const map = L.map(mapElement.current, { center: defaultCenter, zoom: 12, zoomControl: false, attributionControl: true })
      mapInstance.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const visiblePoints: Coordinate[] = []
      const selectedRow = rows.find((row) => String(((row.driver || {}) as ApiRecord).id || '') === selectedDriverID)
      const selectedLocation = (selectedRow?.position || {}) as ApiRecord
      const selectedLat = Number(selectedLocation.latitude), selectedLng = Number(selectedLocation.longitude)
      const selectedPosition: Coordinate | null = Number.isFinite(selectedLat) && Number.isFinite(selectedLng) ? { lat: selectedLat, lng: selectedLng } : null
      rows.forEach((row) => {
        const driver = (row.driver || {}) as ApiRecord
        const position = (row.position || {}) as ApiRecord
        const lat = Number(position.latitude), lng = Number(position.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        const point = { lat, lng }
        visiblePoints.push(point)
        const selected = String(driver.id || '') === selectedDriverID
        const size = selected ? 20 : 16
        const color = selected ? '#ff4e55' : '#26845c'
        const heading = Number(position.heading_deg || 0)
        const icon = L.divIcon({
          className: 'dashboard-vehicle-marker',
          html: `<span style="display:block;width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${size}px solid ${color};filter:drop-shadow(0 0 1px white) drop-shadow(0 1px 2px #0006);transform:rotate(${heading}deg)"></span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })
        L.marker(point, { icon, title: String(driver.name || 'Online driver') }).addTo(map)
      })

      const pickup = stopCoordinate(selectedOrder, 'pickup')
      const dropoff = stopCoordinate(selectedOrder, 'dropoff')
      if (mapMode === 'poi') {
        ;([[pickup, 'P', '#26845c', 'Pickup'], [dropoff, 'D', '#ff4e55', 'Drop-off']] as const).forEach(([point, label, color, title]) => {
          if (!point) return
          const icon = L.divIcon({ className: 'dashboard-stop-marker', html: `<span style="display:grid;place-items:center;width:25px;height:25px;border:2px solid white;border-radius:50%;background:${color};color:white;font:700 11px sans-serif;box-shadow:0 2px 6px #0005">${label}</span>`, iconSize: [25, 25], iconAnchor: [12, 12] })
          L.marker(point, { icon, title }).addTo(map)
        })
      }
      const afterPickup = new Set(['picked_up', 'enroute_dropoff', 'arrived_dropoff', 'delivered']).has(String(selectedOrder?.status || ''))
      const delivered = String(selectedOrder?.status || '') === 'delivered'
      const destination = afterPickup ? dropoff : pickup
      if (selectedPosition && destination && pickup && dropoff) {
        visiblePoints.push(destination)
        const fetchRoute = async (origin: Coordinate, routeDestination: Coordinate) => {
          const parameters = new URLSearchParams({ originLat: String(origin.lat), originLng: String(origin.lng), destinationLat: String(routeDestination.lat), destinationLng: String(routeDestination.lng) })
          const response = await fetch(`/api/dev/routes?${parameters}`)
          const value = await response.json()
          if (!response.ok) throw new Error(String(value.title || 'Development route request failed.'))
          return value as { path?: Coordinate[]; distance_meters?: number; duration_seconds?: number }
        }
        const [plannedRoute, remainingRoute] = await Promise.all([fetchRoute(pickup, dropoff), fetchRoute(selectedPosition, destination)])
        const plannedDistance = Number(plannedRoute.distance_meters || 0)
        const nextStopDistance = delivered ? 0 : Number(remainingRoute.distance_meters || 0)
        const totalDistance = afterPickup ? plannedDistance : plannedDistance + nextStopDistance
        const remainingDistance = afterPickup ? nextStopDistance : totalDistance
        const travelledDistance = delivered ? totalDistance : afterPickup ? Math.max(0, totalDistance - remainingDistance) : 0
        onRouteMetrics?.({ totalDistanceMeters: totalDistance, travelledDistanceMeters: travelledDistance, remainingDistanceMeters: remainingDistance, durationSeconds: delivered ? 0 : Number(remainingRoute.duration_seconds || 0), pickupCompleted: afterPickup, dropoffCompleted: delivered })
        const path = delivered ? plannedRoute.path || [] : remainingRoute.path || []
        if (path.length) {
          L.polyline(path, { color: delivered ? '#26845c' : '#ff6b35', opacity: .95, weight: 6 }).addTo(map)
          map.fitBounds(L.latLngBounds(path), { padding: [70, 70] })
          setRouteVisible(true)
        }
      } else if (visiblePoints.length) {
        map.fitBounds(L.latLngBounds(visiblePoints), { padding: [70, 70], maxZoom: 13 })
      }
    }).catch((value) => {
      if (!active) return
      const message = value instanceof Error ? value.message : 'OpenStreetMap failed to load.'
      if (mapInstance.current) setRouteError(message)
      else setError(message)
    })

    return () => {
      active = false
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [rows, selectedDriverID, selectedOrder, mapMode, onRouteMetrics])

  if (error) return <div className="shot-map-canvas dashboard-map-setup error"><AlertCircle/><strong>{error}</strong><span>The free OpenStreetMap development map could not be initialized.</span></div>

  return <div className="shot-map-canvas">
    <div ref={mapElement} className="dashboard-google-map" aria-label="Delivery route on OpenStreetMap" />
    {!rows.length&&<div className="dashboard-map-empty"><MapPin size={16}/>Waiting for live driver locations</div>}
    {routeVisible&&<div className="dashboard-route-legend"><span><i className="remaining"/>OSRM road route to next stop</span></div>}
    {mapMode==='traffic'&&<div className="dashboard-route-warning"><AlertCircle size={14}/><span>Live traffic is unavailable with the free OSRM provider.</span></div>}
    {routeError&&<div className="dashboard-route-warning"><AlertCircle size={14}/><span>{routeError}</span></div>}
  </div>
}
