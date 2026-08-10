'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleUserRound,
  Download,
  Filter,
  Fuel,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  SquarePen,
  Upload,
  UserRound,
  Warehouse,
  X,
} from 'lucide-react'
import { deleteDashboardState, listDashboardState, putDashboardState } from '@/lib/dashboard-state'
import { useApiData } from '@/hooks/use-api-data'

type ResourceKind = 'vendors' | 'contacts' | 'places' | 'fuel-reports' | 'issues'
type ResourceRecord = Record<string, string> & { id: string; created_at: string }
type FieldType = 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea'
type Field = {
  name: string
  label: string
  placeholder?: string
  type?: FieldType
  options?: string[]
  required?: boolean
  wide?: boolean
  section?: string
}
type Column = { label: string; value: (row: ResourceRecord) => React.ReactNode }
type ResourceConfig = {
  title: string
  singular: string
  namespace: string
  prefix: string
  sectionTitle: string
  fields: Field[]
  columns: Column[]
  required: string[]
}

const statusOptions = ['Active', 'Inactive']
const vendorTypes = [
  { value: 'Vendor', description: 'General vendor type for uncategorized services' },
  { value: 'Integrated Vendor', description: 'Vendor with native API integration into Fleetbase' },
  { value: 'Fuel Supplier', description: 'Provides fuel for vehicles' },
]

const configs: Record<ResourceKind, ResourceConfig> = {
  vendors: {
    title: 'Vendors', singular: 'Vendor', namespace: 'resource-vendors', prefix: 'vendor', sectionTitle: 'Vendor Details', required: ['setup_type', 'name', 'type'],
    columns: [
      { label: 'Name', value: row => <span className="rm-identity"><Warehouse />{row.name}</span> },
      { label: 'ID', value: row => row.id },
      { label: 'Internal ID', value: row => vendorInternalId(row) },
      { label: 'Address', value: row => row.address || '—' },
      { label: 'Type', value: row => row.type || row.setup_type || '—' },
      { label: 'Created', value: row => formatCreated(row.created_at) },
      { label: 'Status', value: row => <StatusBadge value={row.status || 'Active'} /> },
    ],
    fields: [
      { name: 'setup_type', label: 'Select vendor type', placeholder: 'Select vendor status', type: 'select', options: vendorTypes.map(option => option.value), required: true, wide: true, section: 'Setup Vendor' },
      { name: 'name', label: 'Name', placeholder: 'Name', required: true },
      { name: 'email', label: 'Email', placeholder: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', placeholder: '+91 81234 56789', type: 'tel' },
      { name: 'website', label: 'Website URL', placeholder: 'Website URL' },
      { name: 'type', label: 'Type', placeholder: 'Select vendor type', type: 'select', options: vendorTypes.map(option => option.value), required: true },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions },
      { name: 'address', label: 'Address', placeholder: 'Select address', type: 'select', wide: true },
      { name: 'country', label: 'Country', placeholder: 'Country', type: 'select', options: ['India', 'Singapore', 'United Arab Emirates', 'United Kingdom', 'United States'] },
    ],
  },
  contacts: {
    title: 'Contacts', singular: 'Contact', namespace: 'resource-contacts', prefix: 'contact', sectionTitle: 'Contact Details', required: ['name'],
    columns: [
      { label: 'Name', value: row => <span className="rm-identity"><UserRound />{row.name}</span> },
      { label: 'ID', value: row => row.id },
      { label: 'Internal ID', value: row => row.internal_id || '—' },
      { label: 'Email', value: row => row.email || '—' },
    ],
    fields: [
      { name: 'name', label: 'Name', placeholder: 'Name', required: true },
      { name: 'title', label: 'Title', placeholder: 'Title' },
      { name: 'email', label: 'Email', placeholder: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', placeholder: '+91 81234 56789', type: 'tel' },
      { name: 'internal_id', label: 'Internal ID', placeholder: 'Internal ID' },
      { name: 'address', label: 'Address', placeholder: 'Select address', type: 'select', wide: true },
    ],
  },
  places: {
    title: 'Places', singular: 'Place', namespace: 'resource-places', prefix: 'place', sectionTitle: 'Place Details', required: ['name', 'street_1', 'city', 'country'],
    columns: [{ label: 'Address', value: row => <span className="rm-place-address"><MapPin />{formatAddress(row)}</span> }],
    fields: [
      { name: 'name', label: 'Name', placeholder: 'Name', wide: true, required: true },
      { name: 'street_1', label: 'Street 1', placeholder: 'Street 1', wide: true, required: true },
      { name: 'street_2', label: 'Street 2', placeholder: 'Street 2', wide: true },
      { name: 'neighborhood', label: 'Neighborhood', placeholder: 'Neighborhood' },
      { name: 'building', label: 'Building', placeholder: 'Building' },
      { name: 'security_code', label: 'Security Access Code', placeholder: 'Security Access Code' },
      { name: 'postal_code', label: 'Postal Code', placeholder: 'Postal Code' },
      { name: 'city', label: 'City', placeholder: 'City', required: true },
      { name: 'state', label: 'State', placeholder: 'State' },
      { name: 'country', label: 'Country', placeholder: 'Select country', type: 'select', options: ['India', 'Singapore', 'United Arab Emirates', 'United Kingdom', 'United States'], required: true, wide: true },
      { name: 'latitude', label: 'Latitude', placeholder: 'Latitude', type: 'number' },
      { name: 'longitude', label: 'Longitude', placeholder: 'Longitude', type: 'number' },
      { name: 'phone', label: 'Phone', placeholder: '+91 81234 56789', type: 'tel', wide: true },
      { name: 'avatar', label: 'Select map avatar', placeholder: 'Select avatar', type: 'select', options: ['Building', 'Warehouse', 'Store', 'Home'], wide: true, section: 'Avatar' },
    ],
  },
  'fuel-reports': {
    title: 'Fuel Reports', singular: 'Fuel Report', namespace: 'resource-fuel-reports', prefix: 'fuel_report', sectionTitle: 'Fuel Report Details', required: ['reporter', 'status'],
    columns: [
      { label: 'ID', value: row => row.id },
      { label: 'Reporter', value: row => row.reporter },
      { label: 'Driver', value: row => row.driver || '—' },
      { label: 'Vehicle', value: row => row.vehicle || '—' },
      { label: 'Status', value: row => <StatusBadge value={row.status} /> },
    ],
    fields: [
      { name: 'reporter', label: 'Reporter', type: 'select', options: ['Droo Administrator'], required: true },
      { name: 'driver', label: 'Driver', placeholder: 'Select driver', type: 'select' },
      { name: 'vehicle', label: 'Vehicle', placeholder: 'Select vehicle', type: 'select' },
      { name: 'status', label: 'Status', placeholder: 'Select status', type: 'select', options: ['Pending', 'Approved', 'Rejected'], required: true },
      { name: 'odometer', label: 'Odometer', placeholder: 'Odometer', type: 'number' },
      { name: 'fuel_cost', label: 'Fuel Cost', placeholder: '₹0.00', type: 'number' },
      { name: 'fuel_volume', label: 'Fuel / Volume (L)', placeholder: 'Enter liters', type: 'number' },
      { name: 'latitude', label: 'Latitude', placeholder: 'Latitude', type: 'number' },
      { name: 'longitude', label: 'Longitude', placeholder: 'Longitude', type: 'number' },
    ],
  },
  issues: {
    title: 'Issues', singular: 'Issue', namespace: 'resource-issues', prefix: 'issue', sectionTitle: 'Issue Report', required: ['title', 'issue_type', 'category', 'report'],
    columns: [
      { label: 'ID', value: row => row.id },
      { label: 'Priority', value: row => <PriorityBadge value={row.priority} /> },
      { label: 'Type', value: row => row.issue_type },
      { label: 'Category', value: row => row.category },
      { label: 'Driver', value: row => row.driver || '—' },
      { label: 'Status', value: row => <StatusBadge value={row.status} /> },
    ],
    fields: [
      { name: 'title', label: 'Title', placeholder: 'Issue title', wide: true, required: true },
      { name: 'reported_by', label: 'Reported By', type: 'select', options: ['Droo Administrator'] },
      { name: 'assigned_to', label: 'Assigned To', placeholder: 'Select assignee', type: 'select', options: ['Operations Team', 'Maintenance Team', 'Safety Team'] },
      { name: 'driver', label: 'Driver', placeholder: 'Select driver', type: 'select' },
      { name: 'vehicle', label: 'Vehicle', placeholder: 'Select vehicle', type: 'select' },
      { name: 'order', label: 'Order', placeholder: 'Order reference' },
      { name: 'issue_type', label: 'Issue Type', type: 'select', options: ['Operational', 'Inspection', 'Safety', 'Customer'], required: true },
      { name: 'category', label: 'Issue Category', placeholder: 'Select issue category', type: 'select', options: ['Equipment', 'Maintenance', 'Delivery', 'Vehicle', 'Driver', 'Other'], required: true },
      { name: 'report', label: 'Issue Report', placeholder: 'Describe the issue', type: 'textarea', wide: true, required: true },
      { name: 'tags', label: 'Issue Tags', placeholder: 'Add tags', wide: true },
      { name: 'priority', label: 'Issue Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
      { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Resolved'] },
      { name: 'latitude', label: 'Latitude', placeholder: 'Latitude', type: 'number' },
      { name: 'longitude', label: 'Longitude', placeholder: 'Longitude', type: 'number' },
    ],
  },
}

function formatAddress(row: ResourceRecord) {
  const address = [row.street_1, row.street_2, row.city, row.state, row.postal_code, row.country].filter(Boolean).join(', ')
  return [row.name, address].filter(Boolean).join(' - ')
}

function vendorInternalId(row: ResourceRecord) {
  if (/^DL\d{6}$/.test(row.internal_id || '')) return row.internal_id
  const hash = [...row.id].reduce((value, character) => (value * 31 + character.charCodeAt(0)) % 1_000_000, 0)
  return `DL${String(hash).padStart(6, '0')}`
}

function formatCreated(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(',', '')
}

function initialValues(kind: ResourceKind) {
  const values: Record<string, string> = {}
  configs[kind].fields.forEach(field => { values[field.name] = '' })
  if (kind === 'vendors') values.status = 'Active'
  if (kind === 'fuel-reports') { values.reporter = 'Droo Administrator'; values.status = 'Pending' }
  if (kind === 'issues') {
    values.title = `Issue reported on ${new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date())}`
    values.reported_by = 'Droo Administrator'; values.issue_type = 'Operational'; values.priority = 'Low'; values.status = 'Pending'
  }
  return values
}

function StatusBadge({ value }: { value: string }) {
  const normalized = (value || 'Pending').toLowerCase()
  return <span className={`rm-badge ${normalized.replaceAll(' ', '-')}`}>{value || 'Pending'}</span>
}

function PriorityBadge({ value }: { value: string }) {
  return <span className={`rm-priority ${(value || 'Low').toLowerCase()}`}><i />{value || 'Low'}</span>
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`
}

export function ResourceManagementPage({ kind }: { kind: ResourceKind }) {
  const config = configs[kind]
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<ResourceRecord[]>([])
  const [places, setPlaces] = useState<ResourceRecord[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(searchParams.get('new') === '1')
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create')
  const [editingId, setEditingId] = useState('')
  const [actionRow, setActionRow] = useState('')
  const [vendorFilter, setVendorFilter] = useState('All')
  const [filterOpen, setFilterOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [revision, setRevision] = useState(0)
  const [addressModal, setAddressModal] = useState(false)
  const [vendorTypeOpen, setVendorTypeOpen] = useState(false)
  const [tab, setTab] = useState<'contacts' | 'customers'>('contacts')
  const [form, setForm] = useState<Record<string, string>>(() => initialValues(kind))
  const [placeForm, setPlaceForm] = useState<Record<string, string>>(() => initialValues('places'))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [placeSaving, setPlaceSaving] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const { rows: drivers } = useApiData('Drivers', undefined, false)
  const { rows: vehicles } = useApiData('Vehicles', undefined, false)

  useEffect(() => {
    let cancelled = false
    listDashboardState<ResourceRecord>(config.namespace)
      .then(entries => { if (!cancelled) setRows(entries.map(entry => ({ ...entry.value, id: entry.value.id || entry.key }))) })
      .catch(value => { if (!cancelled) setError(value instanceof Error ? value.message : `Unable to load ${config.title.toLowerCase()}.`) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [config.namespace, config.title, revision])

  useEffect(() => {
    if (kind !== 'vendors' && kind !== 'contacts') return
    let cancelled = false
    listDashboardState<ResourceRecord>('resource-places')
      .then(entries => { if (!cancelled) setPlaces(entries.map(entry => entry.value)) })
      .catch(() => { /* The address picker can remain empty until places are available. */ })
    return () => { cancelled = true }
  }, [kind])

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter(row => {
      if (kind === 'contacts' && (row.contact_type || 'contact') !== (tab === 'contacts' ? 'contact' : 'customer')) return false
      if (kind === 'vendors' && vendorFilter !== 'All' && (row.status || 'Active') !== vendorFilter) return false
      return !needle || JSON.stringify(row).toLowerCase().includes(needle)
    })
  }, [kind, query, rows, tab, vendorFilter])

  const fields = config.fields.map(field => {
    if (field.name === 'driver') return { ...field, options: drivers.map(driver => String(driver.name || driver.phone || driver.id)).filter(Boolean) }
    if (field.name === 'vehicle') return { ...field, options: vehicles.map(vehicle => String(vehicle.registration_number || vehicle.plate_number || vehicle.name || vehicle.id)).filter(Boolean) }
    if (field.name === 'address') return { ...field, options: places.map(place => formatAddress(place)).filter(Boolean) }
    return field
  })
  const sections = [...new Set(fields.map(field => field.section || config.sectionTitle))]

  function startCreate() {
    setDrawerMode('create'); setEditingId(''); setForm(initialValues(kind)); setError(''); setOpen(true)
  }

  function closeDrawer() {
    setOpen(false)
    setDrawerMode('create'); setEditingId(''); setActionRow('')
    if (searchParams.get('new') === '1') router.replace(`/${kind}`)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const missing = config.required.map(name => fields.find(field => field.name === name)?.label || name).filter((_, index) => !form[config.required[index]]?.trim())
    if (missing.length) { setError(`Enter ${missing.join(', ')}.`); return }
    setSaving(true); setError('')
    const id = editingId || createId(config.prefix)
    const existing = rows.find(row => row.id === id)
    const record: ResourceRecord = { ...(existing || {}), ...form, id, created_at: existing?.created_at || new Date().toISOString() }
    if (kind === 'vendors') record.internal_id = vendorInternalId(record)
    if (kind === 'contacts') record.contact_type = tab === 'customers' ? 'customer' : 'contact'
    try {
      const saved = await putDashboardState(config.namespace, id, record)
      setRows(current => editingId ? current.map(row => row.id === id ? { ...saved.value, id } : row) : [{ ...saved.value, id }, ...current])
      setNotice(`${config.singular} ${id} ${editingId ? 'updated' : 'created'}.`)
      closeDrawer()
      window.setTimeout(() => setNotice(''), 4000)
    } catch (value) {
      setError(value instanceof Error ? value.message : `Unable to create ${config.singular.toLowerCase()}.`)
    } finally { setSaving(false) }
  }

  function openVendor(row: ResourceRecord, mode: 'edit' | 'view') {
    setDrawerMode(mode)
    setEditingId(row.id)
    setForm({ ...initialValues(kind), ...row })
    setActionRow('')
    setError('')
    setOpen(true)
  }

  function exportVendors() {
    const headers = ['Name', 'ID', 'Internal ID', 'Address', 'Type', 'Created', 'Status']
    const values = rows.map(row => [row.name, row.id, vendorInternalId(row), row.address, row.type || row.setup_type, row.created_at, row.status || 'Active'])
    const csv = [headers, ...values].map(line => line.map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a'); link.href = url; link.download = 'vendors.csv'; link.click(); URL.revokeObjectURL(url)
  }

  async function importVendors(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>[]
      if (!Array.isArray(parsed)) throw new Error('Vendor import must be a JSON array.')
      const imported: ResourceRecord[] = []
      for (const value of parsed) {
        const id = typeof value.id === 'string' && value.id ? value.id : createId('vendor')
        const record = { ...value, id, created_at: typeof value.created_at === 'string' ? value.created_at : new Date().toISOString() } as ResourceRecord
        record.internal_id = vendorInternalId(record)
        const saved = await putDashboardState(config.namespace, id, record)
        imported.push({ ...record, ...saved.value, id })
      }
      setRows(current => [...imported, ...current.filter(row => !imported.some(item => item.id === row.id))])
      setNotice(`${imported.length} vendor${imported.length === 1 ? '' : 's'} imported.`)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to import vendors.')
    } finally { event.target.value = '' }
  }

  function openAddressModal() {
    setPlaceForm(initialValues('places'))
    setPlaceError('')
    setVendorTypeOpen(false)
    setAddressModal(true)
  }

  async function submitPlace(event: FormEvent) {
    event.preventDefault()
    const required = configs.places.required
    const missing = required.map(name => configs.places.fields.find(field => field.name === name)?.label || name).filter((_, index) => !placeForm[required[index]]?.trim())
    if (missing.length) { setPlaceError(`Enter ${missing.join(', ')}.`); return }
    setPlaceSaving(true); setPlaceError('')
    const id = createId('place')
    const record: ResourceRecord = { ...placeForm, id, created_at: new Date().toISOString() }
    try {
      const saved = await putDashboardState('resource-places', id, record)
      const place: ResourceRecord = { ...record, ...saved.value, id }
      setPlaces(current => [place, ...current])
      setForm(current => ({ ...current, address: formatAddress(place), country: current.country || place.country || '' }))
      setAddressModal(false)
    } catch (value) {
      setPlaceError(value instanceof Error ? value.message : 'Unable to create place.')
    } finally { setPlaceSaving(false) }
  }

  async function remove(row: ResourceRecord) {
    if (!window.confirm(`Delete ${config.singular.toLowerCase()} ${row.name || row.id}?`)) return
    try {
      await deleteDashboardState(config.namespace, row.id)
      setRows(current => current.filter(item => item.id !== row.id))
      setNotice(`${config.singular} deleted.`)
      window.setTimeout(() => setNotice(''), 4000)
    } catch (value) {
      setError(value instanceof Error ? value.message : `Unable to delete ${config.singular.toLowerCase()}.`)
    }
  }

  return <div className={`resource-manager resource-manager-${kind} ${open ? 'drawer-open' : ''}`}>
    <section className="rm-list">
      <header className="rm-list-header">
        {kind === 'contacts' ? <nav className="rm-tabs" aria-label="Contact type">
          <button className={tab === 'contacts' ? 'active' : ''} onClick={() => setTab('contacts')}>Contacts</button>
          <button className={tab === 'customers' ? 'active' : ''} onClick={() => setTab('customers')}>Customers</button>
        </nav> : <h1>{config.title}</h1>}
        <label className="rm-search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${config.title}`} /></label>
        {kind === 'vendors' ? <div className="rm-vendor-toolbar">
          <div className="rm-filter-wrap"><button type="button" title="Filter vendors" aria-label="Filter vendors" onClick={() => setFilterOpen(value => !value)}><Filter /></button>{filterOpen && <div className="rm-filter-menu">{['All', 'Active', 'Inactive'].map(value => <button type="button" className={vendorFilter === value ? 'active' : ''} key={value} onClick={() => { setVendorFilter(value); setFilterOpen(false) }}>{value}</button>)}</div>}</div>
          <button type="button" title="Toggle table density" aria-label="Toggle table density" onClick={() => setCompact(value => !value)}><SlidersHorizontal /></button>
          <button type="button" title="Refresh vendors" aria-label="Refresh vendors" onClick={() => setRevision(value => value + 1)}><RefreshCw /></button>
          <button className="rm-new" onClick={startCreate}><Plus />New</button>
          <button className="rm-import" type="button" onClick={() => importRef.current?.click()}><Upload />Import</button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importVendors} />
          <button className="rm-export" type="button" onClick={exportVendors}><Download />Export</button>
        </div> : <button className="rm-new" onClick={startCreate}><Plus />New {config.singular}</button>}
      </header>

      {notice && <div className="rm-notice"><Check />{notice}<button onClick={() => setNotice('')}><X /></button></div>}
      {error && !open && <div className="rm-error">{error}</div>}

      <div className={`rm-table-wrap ${compact ? 'compact' : ''}`}>
        <table>
          <thead><tr><th className="rm-check"><input type="checkbox" aria-label="Select all" /></th>{config.columns.map(column => <th key={column.label}>{column.label}<ChevronsUpDown /></th>)}<th aria-label="Actions" /></tr></thead>
          <tbody>{visibleRows.map(row => <tr key={row.id}>
            <td className="rm-check"><input type="checkbox" aria-label={`Select ${row.id}`} /></td>
            {config.columns.map(column => <td key={column.label}>{column.value(row)}</td>)}
            <td className="rm-actions">{kind === 'vendors' ? <div className="rm-action-wrap"><button type="button" aria-label={`Actions for ${row.id}`} aria-expanded={actionRow === row.id} onClick={() => setActionRow(current => current === row.id ? '' : row.id)}><MoreHorizontal /></button>{actionRow === row.id && <div className="rm-action-menu"><strong>Vendor Actions</strong><button type="button" onClick={() => openVendor(row, 'view')}>View Vendor</button><button type="button" onClick={() => openVendor(row, 'edit')}>Edit Vendor</button><button type="button" className="delete" onClick={() => { setActionRow(''); remove(row) }}>Delete Vendor</button></div>}</div> : <button type="button" title={`Delete ${config.singular.toLowerCase()}`} aria-label={`Delete ${row.id}`} onClick={() => remove(row)}><MoreHorizontal /></button>}</td>
          </tr>)}</tbody>
        </table>
        {!loading && !visibleRows.length && <div className="rm-empty">
          {kind === 'vendors' ? <Warehouse /> : kind === 'contacts' ? <UserRound /> : kind === 'places' ? <MapPin /> : kind === 'fuel-reports' ? <Fuel /> : <CircleUserRound />}
          <strong>No {tab === 'customers' && kind === 'contacts' ? 'customers' : config.title.toLowerCase()} found</strong>
          <span>Create the first {tab === 'customers' && kind === 'contacts' ? 'customer' : config.singular.toLowerCase()} to add it here.</span>
          <button onClick={startCreate}><Plus />Create {config.singular}</button>
        </div>}
        {loading && <div className="rm-empty"><span>Loading {config.title.toLowerCase()}…</span></div>}
      </div>
      {kind === 'vendors' && <footer className="rm-pagination"><span>Showing {visibleRows.length ? 1 : 0} to {visibleRows.length} of {visibleRows.length} results</span><button type="button" disabled><ChevronLeft /></button><b>1</b><button type="button" disabled><ChevronRight /></button></footer>}
    </section>

    {open && <form className={`rm-drawer ${drawerMode === 'view' ? 'view-mode' : ''}`} onSubmit={submit}>
      <header><h2>{drawerMode === 'create' ? `Create ${kind === 'places' ? 'new' : 'a new'} ${config.singular.toLowerCase()}` : `${drawerMode === 'view' ? 'View' : 'Edit'} ${config.singular.toLowerCase()}`}</h2><div>{drawerMode !== 'view' && <button className="rm-create" disabled={saving} type="submit"><Check />{saving ? 'Saving…' : drawerMode === 'edit' ? `Save ${config.singular}` : `Create ${config.singular}`}</button>}<button className="rm-close" type="button" onClick={closeDrawer} aria-label="Close"><X /></button></div></header>
      <div className="rm-drawer-scroll">
        {sections.map(section => <section className="rm-form-section" key={section}>
          <h3>{section}<ChevronDown /></h3>
          {kind === 'contacts' && section === config.sectionTitle && <div className="rm-upload"><CircleUserRound /><label><Upload /><span>Upload Image</span><input type="file" accept="image/png,image/jpeg,image/gif" /></label><small>Supports PNGs, JPEGs and GIFs</small></div>}
          {kind === 'places' && section === 'Avatar' && <div className="rm-avatar-preview"><Building2 /></div>}
          <div className="rm-fields">
            {fields.filter(field => (field.section || config.sectionTitle) === section).map(field => <label className={`${field.wide ? 'wide' : ''} ${field.type === 'textarea' ? 'textarea' : ''}`} key={field.name}>
              <span>{field.label}{field.required && <sup>*</sup>}</span>
              {field.name === 'address' && <button className="rm-new-address" type="button" aria-label="New Address" onClick={openAddressModal}><SquarePen />New Address</button>}
              {kind === 'vendors' && field.name === 'setup_type' ? <div className="rm-vendor-type">
                <button type="button" className={vendorTypeOpen ? 'open' : ''} onClick={() => setVendorTypeOpen(value => !value)} aria-expanded={vendorTypeOpen}>
                  <span>{form.setup_type || field.placeholder}</span><ChevronDown />
                </button>
                {vendorTypeOpen && <div className="rm-vendor-type-menu">{vendorTypes.map(option => <button type="button" key={option.value} className={form.setup_type === option.value ? 'selected' : ''} onClick={() => { setForm(current => ({ ...current, setup_type: option.value, type: current.type || option.value })); setVendorTypeOpen(false) }}><strong>{option.value}</strong><span>{option.description}</span></button>)}</div>}
              </div> : field.type === 'select' ? <span className="rm-select"><select value={form[field.name] || ''} onChange={event => setForm(current => ({ ...current, [field.name]: event.target.value }))} required={field.required}>
                <option value="">{field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
                {(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}
              </select><ChevronDown /></span> : field.type === 'textarea' ? <textarea value={form[field.name] || ''} onChange={event => setForm(current => ({ ...current, [field.name]: event.target.value }))} placeholder={field.placeholder} required={field.required} /> : <input value={form[field.name] || ''} onChange={event => setForm(current => ({ ...current, [field.name]: event.target.value }))} placeholder={field.placeholder} type={field.type || 'text'} required={field.required} />}
              {(field.name === 'longitude' && (kind === 'places' || kind === 'fuel-reports' || kind === 'issues')) && <button className="rm-map-link" type="button"><MapPin />Select from map</button>}
            </label>)}
          </div>
        </section>)}
        {error && <div className="rm-drawer-error">{error}</div>}
      </div>
    </form>}

    {addressModal && <div className="rm-address-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setAddressModal(false)}>
      <form className="rm-address-modal" role="dialog" aria-modal="true" aria-labelledby="rm-address-title" onSubmit={submitPlace}>
        <header><h2 id="rm-address-title">Create a new place</h2><button type="button" onClick={() => setAddressModal(false)} aria-label="Close address form"><X /></button></header>
        <div className="rm-address-scroll">
          <section><h3>Place Details<ChevronDown /></h3><div className="rm-address-fields">
            {configs.places.fields.filter(field => !field.section).map(field => <label className={`field-${field.name}`} key={field.name}>
              <span>{field.label}{field.required && <sup>*</sup>}</span>
              {field.type === 'select' ? <span className="rm-select"><select value={placeForm[field.name] || ''} onChange={event => setPlaceForm(current => ({ ...current, [field.name]: event.target.value }))} required={field.required}><option value="">{field.placeholder}</option>{(field.options || []).map(option => <option key={option}>{option}</option>)}</select><ChevronDown /></span> : <input value={placeForm[field.name] || ''} onChange={event => setPlaceForm(current => ({ ...current, [field.name]: event.target.value }))} placeholder={field.placeholder} type={field.type || 'text'} required={field.required} />}
              {field.name === 'longitude' && <button className="rm-map-link" type="button"><MapPin />Select from map</button>}
            </label>)}
          </div></section>
          <section><h3>Avatar<ChevronDown /></h3><div className="rm-address-avatar"><div><Building2 /></div><label><span>Select map avatar</span><span className="rm-select"><select value={placeForm.avatar || ''} onChange={event => setPlaceForm(current => ({ ...current, avatar: event.target.value }))}><option value="">Select avatar</option>{['Building', 'Warehouse', 'Store', 'Home'].map(option => <option key={option}>{option}</option>)}</select><ChevronDown /></span></label></div></section>
          {placeError && <div className="rm-drawer-error">{placeError}</div>}
        </div>
        <footer><button type="button" className="rm-address-cancel" onClick={() => setAddressModal(false)}><X />Cancel</button><button type="submit" className="rm-create" disabled={placeSaving}><Check />{placeSaving ? 'Creating…' : 'Create Place'}</button></footer>
      </form>
    </div>}
  </div>
}
