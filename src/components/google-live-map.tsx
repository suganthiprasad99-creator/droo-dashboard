'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, MapPin } from 'lucide-react'
import type { Layer, Map as LeafletMap } from 'leaflet'

type ApiRecord = Record<string, unknown>
type MapCommand = { type: 'zoom-in' | 'zoom-out' | 'locate' | 'toggle-type'; nonce: number }

const defaultCenter = { lat: 11.1271, lng: 78.6569 }
const streetTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const terrainTiles = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'

export function GoogleLiveMap({ rows, selected, onSelect, command, markerStyle = 'arrow', showStopMarkers = true }: { rows: ApiRecord[]; selected: string | null; onSelect: (id: string) => void; command?: MapCommand; markerStyle?: 'arrow' | 'truck'; showStopMarkers?: boolean }) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const baseLayer = useRef<Layer | null>(null)
  const pointBounds = useRef<[number, number][]>([])
  const alternateTiles = useRef(false)
  const [error, setError] = useState('')

  const invalidateMap = (instance: LeafletMap | null) => {
    if (!instance || map.current !== instance || !instance.getContainer().isConnected) return
    instance.invalidateSize({ animate: false, pan: false })
  }

  useEffect(() => {
    if (!element.current) return
    let active = true
    setError('')
    import('leaflet').then(L => {
      if (!active || !element.current) return
      const instance = L.map(element.current, {
        center: defaultCenter,
        zoom: 7,
        zoomControl: false,
        attributionControl: true,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      })
      map.current = instance
      baseLayer.current = L.tileLayer(alternateTiles.current ? terrainTiles : streetTiles, {
        maxZoom: alternateTiles.current ? 17 : 19,
        attribution: alternateTiles.current ? '&copy; OpenTopoMap contributors' : '&copy; OpenStreetMap contributors',
      }).addTo(instance)
      const bounds: [number, number][] = []
      rows.forEach((row, index) => {
        const driver = (row.driver || {}) as ApiRecord
        const position = (row.position || {}) as ApiRecord
        const id = String(driver.id || row.id || index)
        const lat = Number(position.latitude), lng = Number(position.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        bounds.push([lat, lng])
        const isSelected = selected === id
        const recorded = new Date(String(position.recorded_at || 0)).getTime()
        const stale = !recorded || Date.now() - recorded > 120_000
        const color = isSelected ? '#ef6c28' : stale ? '#73766f' : '#26845c'
        const size = isSelected ? 22 : 18
        const heading = Number(position.heading_deg || 0)
        const truckColor = isSelected ? '#f97316' : stale ? '#858984' : '#16a34a'
        const markerHtml = markerStyle === 'truck'
          ? `<svg viewBox="0 0 34 20" width="${isSelected ? 34 : 30}" height="${isSelected ? 20 : 18}" aria-hidden="true" style="display:block;filter:drop-shadow(0 1px 1px white) drop-shadow(0 2px 2px #0005)"><rect x="2" y="4" width="19" height="10" rx="1.5" fill="${truckColor}"/><path d="M21 7h6l5 5v2H21z" fill="${truckColor}"/><path d="M23 8h3.5l3 3H23z" fill="#dff4ff"/><rect x="4" y="6" width="14" height="2" rx="1" fill="#ffffff70"/><circle cx="9" cy="15" r="3" fill="#30332f"/><circle cx="9" cy="15" r="1.2" fill="#d7d9d5"/><circle cx="26" cy="15" r="3" fill="#30332f"/><circle cx="26" cy="15" r="1.2" fill="#d7d9d5"/></svg>`
          : `<span style="display:block;width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${size}px solid ${color};filter:drop-shadow(0 0 1px white) drop-shadow(0 2px 3px #0006);transform:rotate(${heading}deg)"></span>`
        const iconWidth = markerStyle === 'truck' ? (isSelected ? 34 : 30) : size
        const iconHeight = markerStyle === 'truck' ? (isSelected ? 20 : 18) : size
        const icon = L.divIcon({ className: `live-map-vehicle-marker ${markerStyle === 'truck' ? 'truck-marker' : ''}`, html: markerHtml, iconSize: [iconWidth, iconHeight], iconAnchor: [iconWidth / 2, iconHeight / 2] })
        L.marker([lat, lng], { icon, title: String(driver.name || 'Driver') }).on('click', () => onSelect(id)).addTo(instance)
      })

      const selectedRow = selected ? rows.find((row, index) => String(((row.driver || {}) as ApiRecord).id || row.id || index) === selected) : undefined
      const plannedPositions = Array.isArray(selectedRow?.planned_route_positions) ? selectedRow.planned_route_positions as ApiRecord[] : []
      const actualPositions = Array.isArray(selectedRow?.actual_route_positions) ? selectedRow.actual_route_positions as ApiRecord[] : []
      const routePositions = Array.isArray(selectedRow?.route_positions) ? selectedRow.route_positions as ApiRecord[] : []
      const toRoute = (positions: ApiRecord[]) => positions.flatMap(position => {
        const lat = Number(position.latitude), lng = Number(position.longitude)
        return Number.isFinite(lat) && Number.isFinite(lng) ? [[lat, lng] as [number, number]] : []
      })
      const plannedRoute = toRoute(plannedPositions)
      const actualRoute = toRoute(actualPositions)
      const route = actualRoute.length ? actualRoute : toRoute(routePositions)
      if (plannedRoute.length > 1) L.polyline(plannedRoute, { color: '#3978f6', weight: 4, opacity: .9, dashArray: '9 8' }).addTo(instance)
      if (route.length) {
        L.polyline(route, { color: '#ef6c28', weight: 5, opacity: .9 }).addTo(instance)
        if (showStopMarkers) {
          const markerRoute = plannedRoute.length ? plannedRoute : route
          const endpoints = markerRoute.length > 1 ? [markerRoute[0], markerRoute[markerRoute.length - 1]] : [markerRoute[0]]
          endpoints.forEach((point, index) => {
            const label = index === 0 ? 'P' : 'D'
            const color = index === 0 ? '#26845c' : '#ef6c28'
            const icon = L.divIcon({ className: 'live-map-stop-marker', html: `<span style="display:grid;place-items:center;width:25px;height:25px;border:2px solid white;border-radius:50%;background:${color};color:white;font:700 11px sans-serif;box-shadow:0 2px 6px #0005">${label}</span>`, iconSize: [25, 25], iconAnchor: [12, 12] })
            L.marker(point, { icon, title: index === 0 ? 'Pickup' : 'Drop-off' }).addTo(instance)
          })
        }
        const selectedPosition = (selectedRow?.position || {}) as ApiRecord
        const selectedLat = Number(selectedPosition.latitude), selectedLng = Number(selectedPosition.longitude)
        const currentPosition: [number, number][] = Number.isFinite(selectedLat) && Number.isFinite(selectedLng) ? [[selectedLat, selectedLng]] : []
        instance.fitBounds(L.latLngBounds([...plannedRoute, ...route, ...currentPosition]), { padding: [60, 60], maxZoom: 15, animate: false })
      } else if (selectedRow) {
        const selectedPosition = (selectedRow.position || {}) as ApiRecord
        const selectedLat = Number(selectedPosition.latitude), selectedLng = Number(selectedPosition.longitude)
        if (Number.isFinite(selectedLat) && Number.isFinite(selectedLng)) instance.setView([selectedLat, selectedLng], 15, { animate: false })
        else if (bounds.length) instance.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 13, animate: false })
      } else if (bounds.length) instance.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 13, animate: false })
      pointBounds.current = bounds
      requestAnimationFrame(() => active && invalidateMap(instance))
    }).catch(value => active && setError(value instanceof Error ? value.message : 'Map failed to load'))
    return () => {
      active = false
      const instance = map.current
      map.current = null
      baseLayer.current = null
      pointBounds.current = []
      if (instance) {
        instance.stop()
        instance.off()
        instance.remove()
      }
    }
  }, [rows, selected, onSelect, markerStyle, showStopMarkers])

  useEffect(() => {
    const instance = map.current
    if (!instance || !command) return
    if (command.type === 'zoom-in') instance.zoomIn()
    if (command.type === 'zoom-out') instance.zoomOut()
    if (command.type === 'locate') {
      import('leaflet').then(L => pointBounds.current.length ? instance.fitBounds(L.latLngBounds(pointBounds.current), { padding: [60, 60], maxZoom: 13, animate: false }) : instance.setView(defaultCenter, 7, { animate: false }))
    }
    if (command.type === 'toggle-type') {
      import('leaflet').then(L => {
        if (baseLayer.current) instance.removeLayer(baseLayer.current)
        alternateTiles.current = !alternateTiles.current
        baseLayer.current = L.tileLayer(alternateTiles.current ? terrainTiles : streetTiles, { maxZoom: alternateTiles.current ? 17 : 19, attribution: alternateTiles.current ? '&copy; OpenTopoMap contributors' : '&copy; OpenStreetMap contributors' }).addTo(instance).bringToBack()
      })
    }
  }, [command])

  useEffect(() => {
    if (!element.current) return
    const observer = new ResizeObserver(() => invalidateMap(map.current))
    observer.observe(element.current)
    return () => observer.disconnect()
  }, [])

  if (error) return <div className="map-setup"><AlertCircle /><strong>Map unavailable</strong><span>{error}</span></div>
  return <><div ref={element} className="google-map dashboard-google-map" aria-label="Live locations on OpenStreetMap" />{!rows.length && <div className="live-map-empty"><MapPin /><strong>Map ready</strong><span>Live locations will appear here when coordinates are available.</span></div>}</>
}
