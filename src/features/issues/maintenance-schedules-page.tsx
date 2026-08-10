'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, Funnel, Monitor, MoreHorizontal, Plus, RefreshCw, Search, SlidersHorizontal, Table2, Trash2, Upload, X } from 'lucide-react'
import { maintenanceApi, type MaintenanceSchedule as ApiSchedule } from '@/lib/maintenance-api'
import { fetchAuthenticated } from '@/hooks/use-api-data'

type MaintenanceSchedule = {
  id: string
  name: string
  subject: string
  type: string
  status: 'Active' | 'Paused' | ''
  nextDue: string
  created: string
  assetType: string
  intervalMethod: string
  priority: string
  assigneeType: string
  instructions: string
  reminderDays: string
  intervalValue: string
  lastServiceDate: string
}

const emptySchedule = (): MaintenanceSchedule => ({ id: '', name: '', subject: '', type: '', status: '', nextDue: '', created: '', assetType: '', intervalMethod: '', priority: '', assigneeType: '', instructions: '', reminderDays: '', intervalValue: '', lastServiceDate: '' })
const scheduleColumns = ['ID', 'Name', 'Subject', 'Type', 'Status', 'Next Due', 'Created'] as const
type ScheduleColumn = (typeof scheduleColumns)[number]
type ScheduleFilters = { id: string; name: string; type: string; status: string; nextDue: string; created: string }
type AssetOption = { id: string; label: string; type: 'vehicle' | 'equipment' }
const emptyFilters = (): ScheduleFilters => ({ id: '', name: '', type: '', status: '', nextDue: '', created: '' })

const prettyDate = (value: string) => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)).replace(/ /g, ', ').replace(', ,', ', ') : '—'
const fromApi = (row: ApiSchedule): MaintenanceSchedule => ({ ...emptySchedule(), id: row.id, name: row.name, subject: row.vehicle_id || row.equipment_id || '', type: row.maintenance_type, status: row.status === 'active' ? 'Active' : 'Paused', nextDue: row.next_due_at?.slice(0, 10) || '', created: row.created_at, assetType: row.vehicle_id ? 'vehicle' : 'equipment', intervalMethod: row.trigger_type === 'distance' ? 'mileage' : row.trigger_type.replace('_', '-'), intervalValue: String(row.interval_days || row.interval_distance_km || row.interval_engine_hours || ''), lastServiceDate: row.last_completed_at?.slice(0, 10) || '', instructions: row.instructions || '' })

export function MaintenanceSchedulesPage() {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<MaintenanceSchedule | null>(null)
  const [viewOnly, setViewOnly] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<ScheduleColumn, boolean>>(() => Object.fromEntries(scheduleColumns.map(column => [column, true])) as Record<ScheduleColumn, boolean>)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<ScheduleFilters>(emptyFilters)
  const [draftFilters, setDraftFilters] = useState<ScheduleFilters>(emptyFilters)
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2026, 0, 1))
  const [selected, setSelected] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [deletingSchedule, setDeletingSchedule] = useState<MaintenanceSchedule | null>(null)
  const [assets, setAssets] = useState<AssetOption[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      setSchedules((await maintenanceApi.listSchedules()).map(fromApi))
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load maintenance schedules.') }
    finally { setLoading(false) }
  }
  const loadAssets = async () => {
    try {
      const [equipment, vehicleResponse] = await Promise.all([maintenanceApi.listEquipment(), fetchAuthenticated('/v1/admin/vehicles')])
      const vehicleBody = vehicleResponse.ok ? await vehicleResponse.json() as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> : []
      const vehicles = Array.isArray(vehicleBody) ? vehicleBody : vehicleBody.data || []
      setAssets([
        ...vehicles.map(row => ({ id: String(row.id || ''), label: String(row.name || row.call_sign || row.plate_number || row.id || ''), type: 'vehicle' as const })).filter(row => row.id),
        ...equipment.map(row => ({ id: row.id, label: `${row.name}${row.code ? ` (${row.code})` : ''}`, type: 'equipment' as const })),
      ])
    } catch { setAssets([]) }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); void loadAssets() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const visible = useMemo(() => schedules.filter(item => `${item.id} ${item.name} ${item.subject} ${item.type} ${item.status}`.toLowerCase().includes(search.toLowerCase()) && item.id.toLowerCase().includes(filters.id.toLowerCase()) && item.name.toLowerCase().includes(filters.name.toLowerCase()) && item.type.toLowerCase().includes(filters.type.toLowerCase()) && item.status.toLowerCase().includes(filters.status.toLowerCase()) && item.nextDue.includes(filters.nextDue) && item.created.toLowerCase().includes(filters.created.toLowerCase())), [schedules, search, filters])
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!editor?.name || !editor.type || !editor.assetType || !editor.subject || !editor.intervalMethod) { setNotice('Complete the required fields and select a target vehicle or equipment item.'); return }
    if (editor.id) { setNotice('Existing schedules are lifecycle-controlled. Create a replacement schedule to change its definition.'); return }
    const trigger = editor.intervalMethod === 'mileage' ? 'distance' : editor.intervalMethod.replace('-', '_')
    const interval = Number(editor.intervalValue)
    if (!Number.isFinite(interval) || interval <= 0) { setNotice('Enter an interval value greater than zero.'); return }
    try { await maintenanceApi.createSchedule({ name: editor.name, maintenance_type: editor.type, trigger_type: trigger, [editor.assetType === 'vehicle' ? 'vehicle_id' : 'equipment_id']: editor.subject, ...(trigger === 'time' ? { interval_days: interval } : trigger === 'distance' ? { interval_distance_km: interval } : trigger === 'engine_hours' ? { interval_engine_hours: interval } : { interval_days: interval }), ...(editor.nextDue ? { next_due_at: new Date(`${editor.nextDue}T00:00:00Z`).toISOString() } : {}), ...(editor.instructions ? { instructions: editor.instructions } : {}) }); await load(); setEditor(null); setNotice('Maintenance schedule created.') } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save the maintenance schedule.') }
  }
  const updateStatus = async (item: MaintenanceSchedule, status: 'Active' | 'Paused') => {
    try { const value = status === 'Active' ? await maintenanceApi.resumeSchedule(item.id) : await maintenanceApi.pauseSchedule(item.id); setSchedules(items => items.map(current => current.id === value.id ? fromApi(value) : current)); setMenu(null); setNotice(`Schedule ${status.toLowerCase()}.`) } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update schedule.') }
  }
  const remove = async (item: MaintenanceSchedule) => {
    setDeletingSchedule(null); setMenu(null); setNotice(`Schedule ${item.id} cannot be deleted because maintenance history must be preserved. Pause it instead.`)
  }
  const trigger = async (item: MaintenanceSchedule) => {
    try { const workOrder = await maintenanceApi.triggerSchedule(item.id); setNotice(`Work order ${workOrder.code} created from schedule.`) }
    catch { setNotice('Unable to create a work order from this schedule.') }
    finally { setMenu(null) }
  }
  const exportRows = () => {
    const blob = new Blob([JSON.stringify(schedules, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'maintenance-schedules.json'; anchor.click(); URL.revokeObjectURL(url)
  }
  const importRows = async (file?: File) => {
    if (!file) return
    try { const rows = JSON.parse(await file.text()) as MaintenanceSchedule[]; for (const row of rows) { const trigger = row.intervalMethod === 'mileage' ? 'distance' : row.intervalMethod.replace('-', '_'); const interval = Number(row.intervalValue); await maintenanceApi.createSchedule({ name: row.name, maintenance_type: row.type, trigger_type: trigger, [row.assetType === 'vehicle' ? 'vehicle_id' : 'equipment_id']: row.subject, ...(trigger === 'time' ? { interval_days: interval } : trigger === 'distance' ? { interval_distance_km: interval } : trigger === 'engine_hours' ? { interval_engine_hours: interval } : { interval_days: interval }) }) } await load(); setNotice(`${rows.length} schedules imported.`) } catch { setNotice('Import failed. Check the records and asset IDs.') }
  }

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth()
    const first = new Date(year, month, 1), start = new Date(year, month, 1 - first.getDay())
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date })
  }, [calendarMonth])

  return <div className="maintenance-list-page">
    <header className="maintenance-list-header"><h2>Maintenance Schedules</h2><div className="maintenance-list-search"><Search /><input aria-label="Search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Maintenance Schedules" /></div><div className="maintenance-list-actions">
      <button aria-label="Filter schedules" className={filtersOpen ? 'active' : ''} onClick={() => { setDraftFilters(filters); setFiltersOpen(value => !value); setColumnsOpen(false) }}><Funnel /></button>
      <button aria-label="Customize columns" className={columnsOpen ? 'active' : ''} onClick={() => { setColumnsOpen(value => !value); setFiltersOpen(false) }}><SlidersHorizontal /></button>
      <button aria-label="Select schedule view" className={viewMenuOpen ? 'active' : ''} onClick={() => { setViewMenuOpen(value => !value); setFiltersOpen(false); setColumnsOpen(false) }}><Monitor /></button>
      <button aria-label="Refresh" onClick={() => { setLoading(true); void load() }}><RefreshCw className={loading ? 'spin' : ''} /></button>
      <button className="new-schedule-action" onClick={() => { setViewOnly(false); setEditor(emptySchedule()); setNotice('') }}><Plus />New</button><button className="import-schedules-action" onClick={() => fileRef.current?.click()}><Upload />Import</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={event => void importRows(event.target.files?.[0])} /><button className="export-schedules-action" onClick={exportRows}><ArrowUpRight />Export</button>
      {filtersOpen && <div className="maintenance-filter-panel"><header>Filters</header><div className="maintenance-filter-grid"><FilterField label="ID" value={draftFilters.id} onChange={value => setDraftFilters(current => ({ ...current, id: value }))} /><FilterField label="Name" value={draftFilters.name} onChange={value => setDraftFilters(current => ({ ...current, name: value }))} /><FilterField label="Type" value={draftFilters.type} onChange={value => setDraftFilters(current => ({ ...current, type: value }))} /><FilterField label="Status" value={draftFilters.status} onChange={value => setDraftFilters(current => ({ ...current, status: value }))} /><FilterField label="Next Due" value={draftFilters.nextDue} onChange={value => setDraftFilters(current => ({ ...current, nextDue: value }))} /><FilterField label="Created" value={draftFilters.created} onChange={value => setDraftFilters(current => ({ ...current, created: value }))} /></div><footer><button type="button" onClick={() => { const cleared = emptyFilters(); setDraftFilters(cleared); setFilters(cleared); setFiltersOpen(false) }}><Trash2 />Clear</button><button type="button" className="apply" onClick={() => { setFilters(draftFilters); setFiltersOpen(false) }}><Check />Apply</button></footer></div>}
      {columnsOpen && <div className="maintenance-columns-menu"><strong>Customize columns</strong>{scheduleColumns.map(column => <label key={column}><input type="checkbox" checked={visibleColumns[column]} onChange={event => setVisibleColumns(current => ({ ...current, [column]: event.target.checked }))} />{column}</label>)}<button className="columns-done" onClick={() => setColumnsOpen(false)}>Done</button></div>}
      {viewMenuOpen && <div className="maintenance-view-menu" role="menu"><strong>Display</strong><button className={viewMode === 'table' ? 'active' : ''} onClick={() => { setViewMode('table'); setViewMenuOpen(false) }}><Table2 />Table View</button><button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => { setViewMode('calendar'); setViewMenuOpen(false) }}><CalendarDays />Calendar View</button></div>}
    </div></header>
    {notice && <div className="maintenance-list-notice">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X /></button></div>}
    {viewMode === 'table' ? <section className="maintenance-table-panel"><div className="table-wrap"><table className="maintenance-schedules-table"><thead><tr><th><input aria-label="Select all schedules" type="checkbox" checked={selected.length === visible.length && visible.length > 0} onChange={event => setSelected(event.target.checked ? visible.map(item => item.id) : [])} /></th>{scheduleColumns.filter(label => visibleColumns[label]).map(label => <th key={label}>{label}<span>↕</span></th>)}<th /></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><input aria-label={`Select ${item.name}`} type="checkbox" checked={selected.includes(item.id)} onChange={event => setSelected(values => event.target.checked ? [...values, item.id] : values.filter(id => id !== item.id))} /></td>{visibleColumns.ID && <td><button className="schedule-id" onClick={() => { setViewOnly(true); setEditor(item) }}>{item.id}</button></td>}{visibleColumns.Name && <td>{item.name}</td>}{visibleColumns.Subject && <td>{item.subject}</td>}{visibleColumns.Type && <td><span className="schedule-type">{item.type}</span></td>}{visibleColumns.Status && <td><span className={`schedule-status ${item.status.toLowerCase()}`}>{item.status}</span></td>}{visibleColumns['Next Due'] && <td>{prettyDate(item.nextDue)}</td>}{visibleColumns.Created && <td>{item.created}</td>}<td className="schedule-row-actions"><button aria-label={`Actions for ${item.name}`} aria-expanded={menu === item.id} onClick={() => setMenu(menu === item.id ? null : item.id)}><MoreHorizontal /></button>{menu === item.id && <div role="menu"><strong>Maintenance Schedule Actions</strong><button role="menuitem" onClick={() => { setViewOnly(true); setEditor(item); setMenu(null) }}>View Maintenance Schedule</button><button role="menuitem" onClick={() => { setViewOnly(false); setEditor(item); setMenu(null) }}>Edit Maintenance Schedule</button><button role="menuitem" onClick={() => void trigger(item)}>Trigger Work Order Now</button><button role="menuitem" disabled={item.status === 'Paused'} onClick={() => void updateStatus(item, 'Paused')}>Pause Schedule</button><button role="menuitem" disabled={item.status === 'Active'} onClick={() => void updateStatus(item, 'Active')}>Resume Schedule</button><button role="menuitem" className="danger" onClick={() => { setDeletingSchedule(item); setMenu(null) }}>Delete Maintenance Schedule</button></div>}</td></tr>)}</tbody></table></div>{!loading && !visible.length && <div className="maintenance-table-empty">No maintenance schedules found.</div>}<footer><p>Showing <b>{visible.length ? 1 : 0}</b> to <b>{visible.length}</b> of <b>{visible.length}</b> results</p><div><button disabled><ChevronLeft /></button><button className="active">1</button><button disabled><ChevronRight /></button></div></footer></section> : <section className="maintenance-calendar-panel"><header><button aria-label="Previous month" onClick={() => setCalendarMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft /></button><h3>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3><button aria-label="Today" onClick={() => setCalendarMonth(new Date())}>Today</button><button aria-label="Next month" onClick={() => setCalendarMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight /></button></header><div className="maintenance-calendar-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <b key={day}>{day}</b>)}</div><div className="maintenance-calendar-grid">{calendarDays.map(date => { const dateKey = date.toISOString().slice(0, 10); const due = visible.filter(item => item.nextDue === dateKey); return <div key={dateKey} className={date.getMonth() === calendarMonth.getMonth() ? '' : 'outside'}><span>{date.getDate()}</span>{due.map(item => <button key={item.id} onClick={() => { setViewOnly(true); setEditor(item) }}><i />{item.name}<small>{item.subject}</small></button>)}</div> })}</div></section>}

    {deletingSchedule && <div className="vehicle-delete-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDeletingSchedule(null) }}><section className="vehicle-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="schedule-delete-title" aria-describedby="schedule-delete-description"><div className="vehicle-delete-content"><span className="vehicle-delete-warning"><AlertTriangle /></span><div><h2 id="schedule-delete-title">Delete Maintenance-Schedule ({deletingSchedule.name})?</h2><p id="schedule-delete-description">This action cannot be undone. Once deleted, the record will be permanently removed.</p></div></div><footer><button type="button" onClick={() => setDeletingSchedule(null)}><X />Cancel</button><button type="button" className="danger" onClick={() => void remove(deletingSchedule)}><Trash2 />Confirm Delete</button></footer></section></div>}

    {editor && <div className="modal-backdrop order-drawer-backdrop schedule-editor-backdrop"><section className="modal order-compose-modal schedule-editor" role="dialog" aria-modal="true" aria-label={viewOnly ? 'Maintenance schedule details' : editor.id ? 'Edit maintenance schedule' : 'Create new maintenance schedule'}><header><div><h2>{viewOnly ? 'Maintenance schedule details' : editor.id ? 'Edit maintenance schedule' : 'Create new maintenance schedule'}</h2><p>{viewOnly ? 'Review this maintenance schedule record.' : editor.id ? 'Update this maintenance schedule record.' : 'Create a new maintenance schedule record.'}</p></div><button type="button" aria-label="Close schedule form" onClick={() => setEditor(null)}><X /></button></header><form onSubmit={save}><div className="schedule-editor-body">
      <ScheduleSection title="Schedule Details"><label>Schedule Name<input disabled={viewOnly} value={editor.name} onChange={event => setEditor({ ...editor, name: event.target.value })} placeholder="e.g. Oil & Filter Change — Truck #4" /></label><label>Type<select disabled={viewOnly} value={editor.type} onChange={event => setEditor({ ...editor, type: event.target.value })}><option value="">Select Type</option><option value="inspection">Inspection</option><option value="service">Service</option><option value="repair">Repair</option></select></label><label>Status<select disabled={viewOnly} value={editor.status} onChange={event => setEditor({ ...editor, status: event.target.value as MaintenanceSchedule['status'] })}><option value="">Select Status</option><option>Active</option><option>Paused</option></select></label></ScheduleSection>
      <ScheduleSection title="Asset" description="Which asset does this schedule apply to?"><label>Asset Type<select disabled={viewOnly} required value={editor.assetType} onChange={event => setEditor({ ...editor, assetType: event.target.value, subject: '' })}><option value="">Select Asset Type</option><option value="vehicle">Vehicle</option><option value="equipment">Equipment</option></select></label>{editor.assetType && <label>{editor.assetType === 'vehicle' ? 'Vehicle' : 'Equipment'}<select disabled={viewOnly} required value={editor.subject} onChange={event => setEditor({ ...editor, subject: event.target.value })}><option value="">Select {editor.assetType}</option>{assets.filter(asset => asset.type === editor.assetType).map(asset => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></label>}</ScheduleSection>
      <ScheduleSection title="Maintenance Interval" description="How should this maintenance be triggered?"><label>Interval Method<select disabled={viewOnly} value={editor.intervalMethod} onChange={event => setEditor({ ...editor, intervalMethod: event.target.value })}><option value="">Select interval method</option><option value="time">Time-based</option><option value="mileage">Mileage-based</option><option value="engine-hours">Engine hours-based</option><option value="hybrid">Hybrid</option></select></label>{editor.intervalMethod && <><label>Interval Value<input disabled={viewOnly} type="number" min="1" value={editor.intervalValue} onChange={event => setEditor({ ...editor, intervalValue: event.target.value })} placeholder={editor.intervalMethod === 'time' ? 'e.g. 90 days' : 'e.g. 10000'} /></label><label>Last Service Date<input disabled={viewOnly} type="date" value={editor.lastServiceDate} onChange={event => setEditor({ ...editor, lastServiceDate: event.target.value })} /></label><label>Next Due<input disabled={viewOnly} type="date" value={editor.nextDue} onChange={event => setEditor({ ...editor, nextDue: event.target.value })} /></label></>}</ScheduleSection>
      <ScheduleSection title="Work Order Defaults" description="These settings are used when a work order is auto-generated from this schedule."><label>Default Priority<select disabled={viewOnly} value={editor.priority} onChange={event => setEditor({ ...editor, priority: event.target.value })}><option value="">Select Priority</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label><label>Default Assignee Type<select disabled={viewOnly} value={editor.assigneeType} onChange={event => setEditor({ ...editor, assigneeType: event.target.value })}><option value="">Select Assignee Type</option><option>Driver</option><option>Vendor</option><option>Contact</option></select></label><label className="wide">Instructions<textarea disabled={viewOnly} value={editor.instructions} onChange={event => setEditor({ ...editor, instructions: event.target.value })} placeholder="Instructions for the technician performing this maintenance..." /></label></ScheduleSection>
      <ScheduleSection title="Reminder Emails" description="Send email reminders before the next due date"><label>Reminder Days Before<input disabled={viewOnly} value={editor.reminderDays} onChange={event => setEditor({ ...editor, reminderDays: event.target.value })} placeholder="7, 1" /></label><p>Press Enter or comma to add each offset. The default assignee will receive an email for each configured offset.</p></ScheduleSection>
    </div><footer><button type="button" className="secondary" onClick={() => setEditor(null)}>{viewOnly ? 'Close' : 'Cancel'}</button>{!viewOnly && <button className="primary" type="submit">{editor.id ? 'Save Changes' : 'Create Maintenance Schedule'}</button>}</footer></form></section></div>}
  </div>
}

function ScheduleSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section><h3>{title}</h3>{description && <p>{description}</p>}<div>{children}</div></section>
}

function FilterField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><strong>{label}</strong><span><input aria-label={`Filter by ${label}`} type="text" value={value} onChange={event => onChange(event.target.value)} placeholder={label} />{value && <button type="button" aria-label={`Clear ${label} filter`} onClick={() => onChange('')}><X /></button>}</span></label>
}
