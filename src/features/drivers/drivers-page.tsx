'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Eye, Filter,
  MapPin, MoreHorizontal, Plus, RefreshCw, Search, SlidersHorizontal, Upload, UserPlus, UserRound, X,
} from 'lucide-react'
import { fetchAuthenticated, useApiData } from '@/hooks/use-api-data'
import { listDashboardState, putDashboardState } from '@/lib/dashboard-state'
import type { ApiRecord } from '@/types/dashboard'

type DriverDetails = {
  internal_id: string
  license: string
  license_expiry: string
  vendor: string
  vehicle_id: string
  city: string
  country: string
  status: string
  latitude: string
  longitude: string
  skills: string
  max_driving_time: string
  max_distance: string
  avatar: string
  photo_name: string
  created_at: string
  metadata: { key: string; value: string; type: string }[]
}

type DriverForm = DriverDetails & { name: string; phone: string; email: string }

const emptyForm = (): DriverForm => ({
  name: '', phone: '', email: '', internal_id: '', license: '', license_expiry: '', vendor: '', vehicle_id: '', city: '', country: '', status: 'Available', latitude: '', longitude: '', skills: '', max_driving_time: '', max_distance: '', avatar: '', photo_name: '', created_at: '', metadata: [],
})

function driverInternalId(id: string, stored?: string) {
  if (/^DL\d{6}$/.test(stored || '')) return stored as string
  const hash = [...id].reduce((value, character) => (value * 31 + character.charCodeAt(0)) % 1_000_000, 0)
  return `DL${String(hash).padStart(6, '0')}`
}

function formatDate(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(',', '')
}

function normalizePhone(value: string) {
  const trimmed = value.trim().replace(/[\s()-]/g, '')
  if (trimmed.startsWith('+')) return trimmed
  if (/^[6-9]\d{9}$/.test(trimmed)) return `+91${trimmed}`
  return trimmed
}

function vehicleLabel(row: ApiRecord) {
  return String(row.registration_number || row.plate_number || row.name || row.id || '')
}

export function DriversPage() {
  const { rows, loading, error: apiError, refresh } = useApiData('Drivers', undefined, false)
  const { rows: vehicles } = useApiData('Vehicles', undefined, false)
  const [details, setDetails] = useState<Record<string, DriverDetails>>({})
  const [vendors, setVendors] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [filterOpen, setFilterOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [open, setOpen] = useState(false)
  const [accountMode, setAccountMode] = useState('')
  const [form, setForm] = useState<DriverForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [actionRow, setActionRow] = useState('')
  const [metadataKey, setMetadataKey] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      listDashboardState<DriverDetails>('driver-details'),
      listDashboardState<Record<string, string>>('resource-vendors'),
    ]).then(([driverEntries, vendorEntries]) => {
      if (cancelled) return
      setDetails(Object.fromEntries(driverEntries.map(entry => [entry.key, entry.value])))
      setVendors(vendorEntries.map(entry => entry.value.name).filter(Boolean))
    }).catch(() => { /* Core driver records still remain available. */ })
    return () => { cancelled = true }
  }, [rows.length])

  const visibleRows = useMemo(() => rows.filter(row => {
    const detail = details[String(row.id)]
    const displayStatus = detail?.status || (row.status === 'active' ? 'Available' : String(row.status || 'Unknown'))
    return (status === 'All' || displayStatus === status) && (!query.trim() || JSON.stringify({ ...row, ...detail }).toLowerCase().includes(query.trim().toLowerCase()))
  }), [details, query, rows, status])

  function startCreate() {
    setAccountMode(''); setForm(emptyForm()); setFormError(''); setOpen(true)
  }

  function close() { setOpen(false); setFormError('') }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (accountMode !== 'new') { setFormError('Select or add a user account for this driver.'); return }
    setSaving(true); setFormError('')
    try {
      const response = await fetchAuthenticated('/v1/admin/drivers', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ name: form.name.trim(), phone: normalizePhone(form.phone), ...(form.email.trim() ? { email: form.email.trim() } : {}), rider_type: 'internal', ...(form.vehicle_id ? { vehicle_id: form.vehicle_id } : {}) }),
      })
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null
        throw new Error(problem?.detail || problem?.title || `Unable to create driver (${response.status}).`)
      }
      const driver = await response.json() as ApiRecord
      const id = String(driver.id)
      const value: DriverDetails = { ...form, internal_id: driverInternalId(id, form.internal_id), created_at: new Date().toISOString(), metadata: form.metadata }
      await putDashboardState('driver-details', id, value)
      setDetails(current => ({ ...current, [id]: value }))
      setNotice(`Driver ${id} created.`); setOpen(false); refresh()
      window.setTimeout(() => setNotice(''), 4000)
    } catch (value) {
      setFormError(value instanceof Error ? value.message : 'Unable to create driver.')
    } finally { setSaving(false) }
  }

  function addMetadata() {
    const key = metadataKey.trim()
    if (!key || form.metadata.some(item => item.key === key)) return
    setForm(current => ({ ...current, metadata: [...current.metadata, { key, value: '', type: 'String' }] }))
    setMetadataKey('')
  }

  function exportRows() {
    const headers = ['Name', 'ID', 'Phone', 'License', 'Vehicle', 'Internal ID', 'Vendor', 'Status', 'Created']
    const data = visibleRows.map(row => {
      const detail = details[String(row.id)]
      return [row.name, row.id, row.phone, detail?.license, vehicleLabel((row.vehicle || {}) as ApiRecord), driverInternalId(String(row.id), detail?.internal_id), detail?.vendor, detail?.status || row.status, detail?.created_at]
    })
    const csv = [headers, ...data].map(line => line.map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const link = document.createElement('a'); link.href = url; link.download = 'drivers.csv'; link.click(); URL.revokeObjectURL(url)
  }

  function importDrivers(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setNotice(`Selected ${file.name}. Create drivers individually to validate user accounts and phone numbers.`)
    event.target.value = ''
  }

  return <div className={`driver-manager ${open ? 'drawer-open' : ''}`}>
    <section className="driver-list">
      <header className="driver-list-header"><h1>Drivers</h1><label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Drivers" /></label><div className="driver-toolbar">
        <div className="driver-filter"><button title="Filter drivers" aria-label="Filter drivers" onClick={() => setFilterOpen(value => !value)}><Filter /></button>{filterOpen && <div>{['All', 'Available', 'Suspended', 'Inactive'].map(value => <button className={status === value ? 'active' : ''} key={value} onClick={() => { setStatus(value); setFilterOpen(false) }}>{value}</button>)}</div>}</div>
        <button title="Toggle table density" aria-label="Toggle table density" onClick={() => setCompact(value => !value)}><SlidersHorizontal /></button><button title="Refresh drivers" aria-label="Refresh drivers" onClick={refresh}><RefreshCw /></button><button className="new" onClick={startCreate}><Plus />New</button><button className="import" onClick={() => importRef.current?.click()}><Upload />Import</button><input ref={importRef} hidden type="file" onChange={importDrivers} /><button onClick={exportRows}><Download />Export</button>
      </div></header>
      {notice && <div className="driver-notice"><Check />{notice}<button onClick={() => setNotice('')}><X /></button></div>}
      {(apiError || formError && !open) && <div className="driver-error">{apiError || formError}</div>}
      <div className={`driver-table-wrap ${compact ? 'compact' : ''}`}><table><thead><tr><th><input type="checkbox" aria-label="Select all" /></th>{['Name', 'ID', 'Phone', 'License', 'Vehicle', 'Internal ID', 'Vendor', 'Status', 'Created'].map(name => <th key={name}>{name}<ChevronsUpDown /></th>)}<th /></tr></thead><tbody>{visibleRows.map(row => {
        const id = String(row.id); const detail = details[id]; const vehicle = (row.vehicle || {}) as ApiRecord; const displayStatus = detail?.status || (row.status === 'active' ? 'Available' : String(row.status || 'Unknown'))
        return <tr key={id}><td><input type="checkbox" aria-label={`Select ${id}`} /></td><td><span className="driver-name"><UserRound />{String(row.name || 'Unnamed driver')}</span></td><td>{id}</td><td>{String(row.phone || '—')}</td><td>{detail?.license || '—'}</td><td>{vehicleLabel(vehicle) || vehicles.find(item => String(item.id) === detail?.vehicle_id) && vehicleLabel(vehicles.find(item => String(item.id) === detail?.vehicle_id)!) || '—'}</td><td>{driverInternalId(id, detail?.internal_id)}</td><td>{detail?.vendor || '—'}</td><td><span className={`driver-status ${displayStatus.toLowerCase()}`}><i />{displayStatus}</span></td><td>{formatDate(detail?.created_at || row.created_at)}</td><td className="driver-actions"><button aria-label={`Actions for ${id}`} onClick={() => setActionRow(current => current === id ? '' : id)}><MoreHorizontal /></button>{actionRow === id && <div><strong>Driver Actions</strong><button onClick={() => setActionRow('')}>View Driver</button><button onClick={() => setActionRow('')}>Edit Driver</button></div>}</td></tr>
      })}</tbody></table>{!loading && !visibleRows.length && <div className="driver-empty"><UserRound /><strong>No drivers found</strong><span>Create a driver to add it here.</span><button onClick={startCreate}><Plus />Create Driver</button></div>}{loading && <div className="driver-empty"><span>Loading drivers…</span></div>}</div>
      <footer className="driver-pagination"><span>Showing {visibleRows.length ? 1 : 0} to {visibleRows.length} of {visibleRows.length} results</span><button disabled><ChevronLeft /></button><b>1</b><button disabled><ChevronRight /></button></footer>
    </section>

    {open && <form className="driver-drawer" onSubmit={submit}><header><h2>Create a new driver</h2><div><button className="create" disabled={saving}><Check />{saving ? 'Creating…' : 'Create Driver'}</button><button type="button" className="close" onClick={close} aria-label="Close"><X /></button></div></header><div className="driver-drawer-scroll">
      <section><h3>User Account <button type="button" title="Add user account" onClick={() => setAccountMode('new')}><UserPlus /></button><ChevronDown /></h3><div className="driver-fields user-fields"><label className="wide"><span>User Account</span><span className="driver-select"><select value={accountMode} onChange={event => setAccountMode(event.target.value)}><option value="">Select User</option><option value="new">Create a new user account</option></select><ChevronDown /></span></label>{accountMode === 'new' && <><label><span>Full Name *</span><input required minLength={2} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Driver name" /></label><label><span>Phone *</span><input required type="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} placeholder="+91 98765 43210" /></label><label className="wide"><span>Email</span><input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="driver@example.com" /></label></>}</div></section>
      <section><h3>Driver Details <ChevronDown /></h3><div className="driver-upload"><UserRound /><label><Upload />Upload Image<input type="file" accept="image/png,image/jpeg,image/gif" onChange={event => setForm(current => ({ ...current, photo_name: event.target.files?.[0]?.name || '' }))} /></label><small>{form.photo_name || 'Supports PNGs, JPEGs and GIFs'}</small></div><div className="driver-fields"><label><span>Internal ID</span><input value={form.internal_id} onChange={event => setForm(current => ({ ...current, internal_id: event.target.value }))} placeholder="Generated automatically" /></label><label><span>Drivers License</span><input value={form.license} onChange={event => setForm(current => ({ ...current, license: event.target.value }))} placeholder="Drivers License" /></label><label><span>License Expiry</span><input type="date" value={form.license_expiry} onChange={event => setForm(current => ({ ...current, license_expiry: event.target.value }))} /></label><label><span>Vendor</span><span className="driver-select"><select value={form.vendor} onChange={event => setForm(current => ({ ...current, vendor: event.target.value }))}><option value="">Select Vendor</option>{vendors.map(value => <option key={value}>{value}</option>)}</select><ChevronDown /></span></label><label><span>Vehicle</span><span className="driver-select"><select value={form.vehicle_id} onChange={event => setForm(current => ({ ...current, vehicle_id: event.target.value }))}><option value="">Select Vehicle</option>{vehicles.map(vehicle => <option value={String(vehicle.id)} key={String(vehicle.id)}>{vehicleLabel(vehicle)}</option>)}</select><ChevronDown /></span></label><label><span>City</span><input value={form.city} onChange={event => setForm(current => ({ ...current, city: event.target.value }))} placeholder="City" /></label><label><span>Country</span><span className="driver-select"><select value={form.country} onChange={event => setForm(current => ({ ...current, country: event.target.value }))}><option value="">Select Country</option>{['India', 'Singapore', 'United Arab Emirates', 'United Kingdom', 'United States'].map(value => <option key={value}>{value}</option>)}</select><ChevronDown /></span></label><label><span>Status</span><span className="driver-select"><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}>{['Available', 'Suspended', 'Inactive'].map(value => <option key={value}>{value}</option>)}</select><ChevronDown /></span></label><label><span>Latitude</span><input type="number" value={form.latitude} onChange={event => setForm(current => ({ ...current, latitude: event.target.value }))} placeholder="Latitude" /></label><label><span>Longitude</span><input type="number" value={form.longitude} onChange={event => setForm(current => ({ ...current, longitude: event.target.value }))} placeholder="Longitude" /><button type="button" className="map-link"><MapPin />Select from map</button></label></div></section>
      <section><h3>Orchestrator Constraints <ChevronDown /></h3><div className="driver-subtitle">Skills &amp; Certifications</div><div className="driver-fields"><label className="wide"><span>Driver Skills</span><input value={form.skills} onChange={event => setForm(current => ({ ...current, skills: event.target.value }))} placeholder="Enter comma-separated skills…" /></label></div><div className="driver-subtitle route">Route Limits</div><p className="driver-help">Hard caps applied by the Orchestrator when building a single route. These are separate from the driver&apos;s shift schedule, which controls availability windows.</p><div className="driver-fields"><label><span>Max Driving Time (seconds)</span><input type="number" value={form.max_driving_time} onChange={event => setForm(current => ({ ...current, max_driving_time: event.target.value }))} placeholder="e.g. 28800 (8 h)" /></label><label><span>Max Distance (metres)</span><input type="number" value={form.max_distance} onChange={event => setForm(current => ({ ...current, max_distance: event.target.value }))} placeholder="e.g. 150000 (150 km)" /></label></div></section>
      <section><h3>Avatar <ChevronDown /></h3><div className="driver-avatar"><UserRound /><label><span>Select map avatar</span><span className="driver-select"><select value={form.avatar} onChange={event => setForm(current => ({ ...current, avatar: event.target.value }))}><option value="">Select avatar</option>{['Courier', 'Driver', 'Rider'].map(value => <option key={value}>{value}</option>)}</select><ChevronDown /></span></label></div></section>
      <section><h3>Metadata <ChevronDown /></h3><div className="driver-metadata-tools"><input value={metadataKey} onChange={event => setMetadataKey(event.target.value)} placeholder="Filter keys…" /><button type="button" onClick={addMetadata}><Plus />Add</button><button type="button" title="Show metadata"><Eye /></button></div><div className="driver-metadata-table"><header><b>Key</b><b>Value</b><b>Type</b></header>{form.metadata.length ? form.metadata.map((item, index) => <div key={item.key}><span>{item.key}</span><input value={item.value} onChange={event => setForm(current => ({ ...current, metadata: current.metadata.map((entry, itemIndex) => itemIndex === index ? { ...entry, value: event.target.value } : entry) }))} /><span>{item.type}</span></div>) : <p>No metadata. Click Add to create one.</p>}</div></section>
      {formError && <div className="driver-drawer-error">{formError}</div>}
    </div></form>}
  </div>
}
