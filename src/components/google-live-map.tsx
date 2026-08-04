'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, MapPin } from 'lucide-react'

type ApiRecord = Record<string, unknown>

let mapsPromise: Promise<void> | null = null
function loadMaps(key: string) {
  if (typeof google !== 'undefined' && google.maps) return Promise.resolve()
  if (!mapsPromise) mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
  return mapsPromise
}

export function GoogleLiveMap({ rows, selected, onSelect }: { rows: ApiRecord[]; selected: string | null; onSelect: (id: string) => void }) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<google.maps.Map | null>(null)
  const markers = useRef(new Map<string, google.maps.Marker>())
  const fitted = useRef(false)
  const [error, setError] = useState('')
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  useEffect(() => {
    if (!key || !element.current) return
    let active = true
    loadMaps(key).then(() => {
      if (!active || !element.current) return
      if (!map.current) map.current = new google.maps.Map(element.current, {
        center: { lat: 13.0604, lng: 80.2496 }, zoom: 12, mapTypeControl: false,
        streetViewControl: false, fullscreenControl: true, gestureHandling: 'greedy',
      })
      const bounds = new google.maps.LatLngBounds()
      const visible = new Set<string>()
      rows.forEach((row, index) => {
        const driver = (row.driver || {}) as ApiRecord
        const position = (row.position || {}) as ApiRecord
        const id = String(driver.id || row.id || index)
        const lat = Number(position.latitude), lng = Number(position.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        visible.add(id); bounds.extend({ lat, lng })
        const recorded = new Date(String(position.recorded_at || 0)).getTime()
        const stale = !recorded || Date.now() - recorded > 120_000
        const icon: google.maps.Symbol = {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          rotation: Number(position.heading_deg || 0), scale: selected === id ? 7 : 6,
          fillColor: stale ? '#73766f' : selected === id ? '#ef6c28' : '#26845c',
          fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2,
        }
        let marker = markers.current.get(id)
        if (!marker) {
          marker = new google.maps.Marker({ map: map.current, position: { lat, lng }, title: String(driver.name || 'Driver'), icon })
          marker.addListener('click', () => onSelect(id))
          markers.current.set(id, marker)
        } else { marker.setPosition({ lat, lng }); marker.setIcon(icon); marker.setMap(map.current) }
      })
      markers.current.forEach((marker, id) => { if (!visible.has(id)) { marker.setMap(null); markers.current.delete(id) } })
      if (!fitted.current && !bounds.isEmpty()) { map.current.fitBounds(bounds, 70); fitted.current = true }
    }).catch(value => setError(value instanceof Error ? value.message : 'Google Maps failed to load'))
    return () => { active = false }
  }, [key, rows, selected, onSelect])

  if (!key) return <div className="map-setup"><MapPin/><strong>Google Maps key required</strong><span>Add a browser-restricted key to <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.</span></div>
  if (error) return <div className="map-setup"><AlertCircle/><strong>{error}</strong><span>Check the key restrictions, billing, and Maps JavaScript API.</span></div>
  return <div ref={element} className="google-map" aria-label="Live driver locations on Google Maps" />
}
