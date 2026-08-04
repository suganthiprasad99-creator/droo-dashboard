'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'

type ApiRecord = Record<string, unknown>
type LeafletMap = { fitBounds: (bounds: [number, number][], options: { padding: [number, number]; maxZoom: number }) => void; remove: () => void }
type LeafletMarker = { setLatLng: (point: [number, number]) => LeafletMarker; setIcon: (icon: unknown) => LeafletMarker; addTo: (map: LeafletMap) => LeafletMarker; on: (event: string, action: () => void) => LeafletMarker; remove: () => void }
type Leaflet = { map: (element: HTMLDivElement, options: object) => LeafletMap; tileLayer: (url: string, options: object) => { addTo: (map: LeafletMap) => void }; divIcon: (options: object) => unknown; marker: (point: [number, number], options: object) => LeafletMarker }

declare global { interface Window { L?: Leaflet } }

let leafletPromise: Promise<Leaflet> | null = null
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (!leafletPromise) leafletPromise = new Promise((resolve, reject) => {
    const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(style)
    const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.async = true
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('OpenStreetMap failed to load'))
    script.onerror = () => reject(new Error('OpenStreetMap failed to load')); document.head.appendChild(script)
  })
  return leafletPromise
}

export function GoogleLiveMap({ rows, selected, onSelect }: { rows: ApiRecord[]; selected: string | null; onSelect: (id: string) => void }) {
  const element = useRef<HTMLDivElement>(null), map = useRef<LeafletMap | null>(null), markers = useRef(new Map<string, LeafletMarker>()), fitted = useRef(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!element.current) return
    let active = true
    loadLeaflet().then(L => {
      if (!active || !element.current) return
      if (!map.current) { map.current = L.map(element.current, { center: [13.0604, 80.2496], zoom: 12, zoomControl: true }); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map.current) }
      const bounds: [number, number][] = [], visible = new Set<string>()
      rows.forEach((row, index) => {
        const driver = (row.driver || {}) as ApiRecord, position = (row.position || {}) as ApiRecord, id = String(driver.id || row.id || index)
        const lat = Number(position.latitude), lng = Number(position.longitude); if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        const point: [number, number] = [lat, lng]; bounds.push(point); visible.add(id)
        const recorded = new Date(String(position.recorded_at || 0)).getTime(), stale = !recorded || Date.now() - recorded > 120_000
        const color = stale ? '#73766f' : selected === id ? '#ef6c28' : '#26845c', heading = Number(position.heading_deg || 0)
        const icon = L.divIcon({ className: 'driver-map-marker', html: `<span style="--marker-color:${color};--marker-heading:${heading}deg" aria-hidden="true"></span>`, iconSize: [34, 34], iconAnchor: [17, 17] })
        let marker = markers.current.get(id)
        if (!marker) { marker = L.marker(point, { icon, title: String(driver.name || 'Driver') }).addTo(map.current!).on('click', () => onSelect(id)); markers.current.set(id, marker) }
        else marker.setLatLng(point).setIcon(icon)
      })
      markers.current.forEach((marker, id) => { if (!visible.has(id)) { marker.remove(); markers.current.delete(id) } })
      if (!fitted.current && bounds.length) { map.current!.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 }); fitted.current = true }
    }).catch(value => setError(value instanceof Error ? value.message : 'OpenStreetMap failed to load'))
    return () => { active = false }
  }, [rows, selected, onSelect])
  useEffect(() => () => { map.current?.remove(); map.current = null }, [])
  if (error) return <div className="map-setup"><AlertCircle/><strong>{error}</strong><span>Check your internet connection and reload the page.</span></div>
  return <div ref={element} className="google-map" aria-label="Live driver locations on OpenStreetMap" />
}
