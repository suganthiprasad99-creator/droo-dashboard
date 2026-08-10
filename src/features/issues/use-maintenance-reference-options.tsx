'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApiData } from '@/hooks/use-api-data'
import { listDashboardState } from '@/lib/dashboard-state'

export type MaintenanceOption = { id: string; label: string }

type StoredReference = {
  id?: string
  name?: string
  code?: string
  email?: string
  address?: string
}

function storedOptions(entries: Awaited<ReturnType<typeof listDashboardState<StoredReference>>>) {
  return entries.map(entry => ({
    id: entry.value.id || entry.key,
    label: entry.value.name || entry.value.code || entry.value.email || entry.value.address || entry.key,
  })).filter(option => option.id && option.label)
}

export function useMaintenanceReferenceOptions() {
  const { rows: vehicles } = useApiData('Vehicles', undefined, false)
  const { rows: users } = useApiData('Drivers', undefined, false)
  const [equipment, setEquipment] = useState<MaintenanceOption[]>([])
  const [vendors, setVendors] = useState<MaintenanceOption[]>([])
  const [contacts, setContacts] = useState<MaintenanceOption[]>([])
  const [places, setPlaces] = useState<MaintenanceOption[]>([])
  const [workOrders, setWorkOrders] = useState<MaintenanceOption[]>([])

  useEffect(() => {
    let active = true
    Promise.all([
      listDashboardState<StoredReference>('maintenance-equipment'),
      listDashboardState<StoredReference>('resource-vendors'),
      listDashboardState<StoredReference>('resource-contacts'),
      listDashboardState<StoredReference>('resource-places'),
      listDashboardState<StoredReference>('maintenance-work-orders'),
    ]).then(([equipmentEntries, vendorEntries, contactEntries, placeEntries, workOrderEntries]) => {
      if (!active) return
      setEquipment(storedOptions(equipmentEntries))
      setVendors(storedOptions(vendorEntries))
      setContacts(storedOptions(contactEntries))
      setPlaces(storedOptions(placeEntries))
      setWorkOrders(storedOptions(workOrderEntries))
    }).catch(() => {
      if (!active) return
      setEquipment([])
      setVendors([])
      setContacts([])
      setPlaces([])
      setWorkOrders([])
    })
    return () => { active = false }
  }, [])

  const vehicleOptions = useMemo(() => vehicles.map(vehicle => ({
    id: String(vehicle.id || ''),
    label: String(vehicle.registration_number || vehicle.plate_number || vehicle.name || vehicle.id || ''),
  })).filter(option => option.id && option.label), [vehicles])

  const userOptions = useMemo(() => users.map(user => ({
    id: String(user.id || ''),
    label: String(user.name || user.email || user.phone || user.id || ''),
  })).filter(option => option.id && option.label), [users])

  const assetsFor = (type: string) => {
    const normalized = type.toLowerCase()
    if (normalized === 'vehicle') return vehicleOptions
    if (normalized === 'equipment') return equipment
    if (normalized === 'location' || normalized === 'place') return places
    return []
  }

  const assigneesFor = (type: string) => {
    const normalized = type.toLowerCase()
    if (normalized === 'vendor') return vendors
    if (normalized === 'contact') return contacts
    if (normalized === 'user' || normalized === 'person' || normalized === 'driver') return userOptions
    return []
  }

  return { vehicles: vehicleOptions, equipment, vendors, contacts, users: userOptions, places, workOrders, assetsFor, assigneesFor }
}

export function ReferenceSelect({ label, value, options, placeholder, disabled, onChange }: {
  label: string
  value: string
  options: MaintenanceOption[]
  placeholder: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return <label>{label}<select disabled={disabled} value={value} onChange={event => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
}
