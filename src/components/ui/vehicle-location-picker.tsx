'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker } from 'leaflet'
import { LocateFixed, MapPin } from 'lucide-react'

const defaultCenter: [number, number] = [13.0827, 80.2707]

export function VehicleLocationPicker() {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || !element.current || map.current) return
    let active = true
    import('leaflet').then(L => {
      if (!active || !element.current) return
      const instance = L.map(element.current, { zoomControl: true }).setView(defaultCenter, 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(instance)
      instance.on('click', event => {
        const lat = event.latlng.lat.toFixed(6); const lng = event.latlng.lng.toFixed(6)
        setLatitude(lat); setLongitude(lng)
        if (marker.current) marker.current.setLatLng(event.latlng); else marker.current = L.marker(event.latlng).addTo(instance)
      })
      map.current = instance
      window.setTimeout(() => instance.invalidateSize(), 0)
    })
    return () => { active = false }
  }, [open])

  function updatePoint(nextLatitude: string, nextLongitude: string) {
    setLatitude(nextLatitude); setLongitude(nextLongitude)
    const lat = Number(nextLatitude); const lng = Number(nextLongitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !map.current) return
    import('leaflet').then(L => { const point = L.latLng(lat, lng); map.current?.setView(point, Math.max(map.current.getZoom(), 13)); if (marker.current) marker.current.setLatLng(point); else if (map.current) marker.current = L.marker(point).addTo(map.current) })
  }

  function currentLocation() {
    navigator.geolocation?.getCurrentPosition(position => updatePoint(position.coords.latitude.toFixed(6), position.coords.longitude.toFixed(6)))
  }

  return <div className="vehicle-location-control"><div className="vehicle-form-grid"><label><span>Latitude</span><input name="latitude" type="number" min="-90" max="90" step="any" value={latitude} onChange={event => updatePoint(event.target.value, longitude)} /></label><label><span>Longitude</span><input name="longitude" type="number" min="-180" max="180" step="any" value={longitude} onChange={event => updatePoint(latitude, event.target.value)} /></label></div><div className="vehicle-location-actions"><button type="button" onClick={() => setOpen(value => !value)}><MapPin />{open ? 'Hide map' : 'Select from map'}</button><button type="button" onClick={currentLocation}><LocateFixed />Use current location</button></div>{open && <div ref={element} className="vehicle-location-map" />}</div>
}
