'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Package, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { useApiData } from '@/hooks/use-api-data'
import { deleteDashboardState, listDashboardState, putDashboardState } from '@/lib/dashboard-state'
import type { ApiRecord } from '@/types/dashboard'

type ScheduleStatus = 'scheduled' | 'partial' | 'off'
type RepeatMode = 'none' | 'daily' | 'weekdays' | 'weekly'
type Schedule = { id: string; driverId: string; vehicleId: string; date: string; start: string; end: string; breakStart: string; breakEnd: string; route: string; status: ScheduleStatus; repeat: RepeatMode; repeatUntil: string; timezone: string; maxHours: string; maxOrders: string; notes: string }

const STATE_NAMESPACE = 'scheduler'
const dayMs = 86_400_000
const seedDrivers: ApiRecord[] = [
  { id: 'drv_seed_1', name: 'Naveen Kumar', phone: '+91 90000 10001', status: 'online', vehicle_id: 'veh_seed_1', vehicle_registration: 'TN 01 DR 0010' },
  { id: 'drv_seed_2', name: 'Arun Prakash', phone: '+91 90000 10002', status: 'online', vehicle_id: 'veh_seed_2', vehicle_registration: 'TN 09 BK 4821' },
  { id: 'drv_seed_3', name: 'Priya Sharma', phone: '+91 90000 10003', status: 'available', vehicle_id: 'veh_seed_3', vehicle_registration: 'TN 22 CM 7654' },
]

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfWeek(date: Date) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  value.setDate(value.getDate() - value.getDay())
  return value
}

function driverName(driver: ApiRecord) {
  return String(driver.name || driver.full_name || driver.phone || driver.id || 'Unnamed driver')
}

function driverMeta(driver: ApiRecord) {
  const vehicle = (driver.vehicle || {}) as ApiRecord
  return String(driver.vehicle_registration || vehicle.registration || driver.phone || driver.rider_type || 'No vehicle assigned')
}

function driverVehicle(driver: ApiRecord) {
  const vehicle = (driver.vehicle || {}) as ApiRecord
  const id = String(driver.vehicle_id || vehicle.id || driver.vehicle_registration || vehicle.registration || '')
  return id ? { id, label: String(driver.vehicle_registration || vehicle.registration || vehicle.name || id) } : null
}

function orderDriverId(order: ApiRecord) {
  const assigned = order.assigned_driver && typeof order.assigned_driver === 'object' ? order.assigned_driver as ApiRecord : {}
  const driver = order.driver && typeof order.driver === 'object' ? order.driver as ApiRecord : {}
  return String(order.driver_id || order.assigned_driver_id || assigned.id || driver.id || '')
}

function orderRoute(order: ApiRecord) {
  const stops = Array.isArray(order.stops) ? order.stops as ApiRecord[] : []
  const label = (type: 'pickup' | 'dropoff') => {
    const stop = stops.find(item => String(item.type || '').toLowerCase() === type) || {}
    const address = stop.address && typeof stop.address === 'object' ? stop.address as ApiRecord : {}
    return String(address.line1 || address.label || address.city || stop.name || 'Not provided')
  }
  return { pickup: label('pickup'), dropoff: label('dropoff') }
}

function minutes(value: string) { const [hours, mins] = value.split(':').map(Number); return hours * 60 + mins }

function datesForRepeat(start: string, repeat: RepeatMode, until: string) {
  if (repeat === 'none' || !until) return [start]
  const dates: string[] = []; const cursor = new Date(`${start}T12:00:00`); const last = new Date(`${until}T12:00:00`)
  while (cursor <= last && dates.length < 366) { const weekday = cursor.getDay(); if (repeat === 'daily' || (repeat === 'weekdays' && weekday > 0 && weekday < 6) || repeat === 'weekly') dates.push(dateKey(cursor)); cursor.setDate(cursor.getDate() + (repeat === 'weekly' ? 7 : 1)) }
  return dates
}

export function SchedulerPage() {
  const { rows: apiDrivers, loading, error } = useApiData('Drivers')
  const { rows: orders, loading: ordersLoading } = useApiData('Orders')
  const drivers = useMemo(() => {
    if (apiDrivers.length >= 3) return apiDrivers
    const ids = new Set(apiDrivers.map(driver => String(driver.id)))
    return [...apiDrivers, ...seedDrivers.filter(driver => !ids.has(String(driver.id))).slice(0, 3 - apiDrivers.length)]
  }, [apiDrivers])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | ScheduleStatus>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [viewingSchedule, setViewingSchedule] = useState<Schedule | null>(null)
  const [formError, setFormError] = useState('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    listDashboardState<Schedule>(STATE_NAMESPACE).then(entries => { if (!cancelled) setSchedules(entries.map(entry => entry.value)) }).catch(value => { if (!cancelled) setFormError(value instanceof Error ? value.message : 'Unable to load schedules.') }).finally(() => { if (!cancelled) setStorageReady(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!storageReady || drivers.length < 3) return
    const seedDetails = [
      { day: 1, start: '08:00', end: '16:00', breakStart: '12:00', breakEnd: '12:30', route: 'Chennai Central', maxOrders: '12', notes: 'Morning city deliveries.' },
      { day: 2, start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '13:30', route: 'Guindy – Adyar', maxOrders: '10', notes: 'Priority customer route.' },
      { day: 3, start: '10:00', end: '18:00', breakStart: '14:00', breakEnd: '14:30', route: 'Anna Nagar – Kilpauk', maxOrders: '8', notes: 'Handle fragile parcels carefully.' },
    ]
    const seeded = drivers.slice(0, 3).map((driver, index): Schedule => {
      const details = seedDetails[index]
      const date = new Date(weekStart.getTime() + details.day * dayMs)
      return { id: `sch_seed_${index + 1}`, driverId: String(driver.id), vehicleId: driverVehicle(driver)?.id || '', date: dateKey(date), start: details.start, end: details.end, breakStart: details.breakStart, breakEnd: details.breakEnd, route: details.route, status: index === 2 ? 'partial' : 'scheduled', repeat: 'none', repeatUntil: '', timezone: 'Asia/Kolkata', maxHours: '8', maxOrders: details.maxOrders, notes: details.notes }
    })
    const missing = seeded.filter(entry => !schedules.some(item => item.id === entry.id))
    if (!missing.length) return
    let cancelled = false
    Promise.all(missing.map(entry => putDashboardState(STATE_NAMESPACE, entry.id, entry))).then(() => { if (!cancelled) setSchedules(current => [...current, ...missing.filter(entry => !current.some(item => item.id === entry.id))]) }).catch(value => { if (!cancelled) setFormError(value instanceof Error ? value.message : 'Unable to seed schedules.') })
    return () => { cancelled = true }
  }, [drivers, schedules, storageReady, weekStart])

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * dayMs)), [weekStart])
  const filteredDrivers = useMemo(() => drivers.filter(driver => {
    const matchesText = !search || JSON.stringify(driver).toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || schedules.some(item => item.driverId === String(driver.id) && item.status === statusFilter && days.some(day => item.date === dateKey(day)))
    return matchesText && matchesStatus
  }), [drivers, search, statusFilter, schedules, days])
  const vehicles = useMemo(() => Array.from(new Map(drivers.map(driverVehicle).filter((vehicle): vehicle is { id: string; label: string } => Boolean(vehicle)).map(vehicle => [vehicle.id, vehicle])).values()), [drivers])
  const viewingDriver = viewingSchedule ? drivers.find(driver => String(driver.id) === viewingSchedule.driverId) : undefined
  const viewingOrders = useMemo(() => viewingSchedule ? orders.filter(order => {
    const assignedId = orderDriverId(order)
    const assigned = order.assigned_driver && typeof order.assigned_driver === 'object' ? order.assigned_driver as ApiRecord : {}
    const driver = order.driver && typeof order.driver === 'object' ? order.driver as ApiRecord : {}
    const assignedName = String(assigned.name || driver.name || (typeof order.assigned_driver === 'string' ? order.assigned_driver : ''))
    return assignedId === viewingSchedule.driverId || Boolean(viewingDriver && assignedName === driverName(viewingDriver))
  }) : [], [orders, viewingDriver, viewingSchedule])

  function openEditor(driverId = '', date = dateKey(days[0]), schedule?: Schedule) {
    const assignedVehicle = driverVehicle(drivers.find(driver => String(driver.id) === driverId) || {})?.id || ''
    setEditing(schedule ? Object.assign({ vehicleId: '', breakStart: '', breakEnd: '', repeat: 'none' as RepeatMode, repeatUntil: '', timezone: 'Asia/Kolkata', maxHours: '8', maxOrders: '', notes: '' }, schedule) : { id: '', driverId, vehicleId: assignedVehicle, date, start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '13:30', route: '', status: 'scheduled', repeat: 'none', repeatUntil: '', timezone: 'Asia/Kolkata', maxHours: '8', maxOrders: '', notes: '' })
    setFormError('')
    setEditorOpen(true)
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    if (editing.status !== 'off' && minutes(editing.end) <= minutes(editing.start)) { setFormError('End time must be later than start time.'); return }
    if ((editing.breakStart && !editing.breakEnd) || (!editing.breakStart && editing.breakEnd)) { setFormError('Enter both break start and break end times.'); return }
    if (editing.breakStart && (minutes(editing.breakEnd) <= minutes(editing.breakStart) || minutes(editing.breakStart) < minutes(editing.start) || minutes(editing.breakEnd) > minutes(editing.end))) { setFormError('Break must be within the shift and its end must be later than its start.'); return }
    if (editing.repeat !== 'none' && (!editing.repeatUntil || editing.repeatUntil < editing.date)) { setFormError('Choose a repeat-until date on or after the schedule date.'); return }
    const targetDates = datesForRepeat(editing.date, editing.repeat, editing.repeatUntil)
    const conflict = schedules.find(item => item.id !== editing.id && item.status !== 'off' && targetDates.includes(item.date) && (item.driverId === editing.driverId || (editing.vehicleId && item.vehicleId === editing.vehicleId)) && minutes(editing.start) < minutes(item.end) && minutes(editing.end) > minutes(item.start))
    if (conflict) { setFormError(`This ${conflict.driverId === editing.driverId ? 'driver' : 'vehicle'} already has an overlapping schedule on ${conflict.date}.`); return }
    const entries = targetDates.map((date, index) => ({ ...editing, date, repeat: 'none' as RepeatMode, repeatUntil: '', id: editing.id && index === 0 ? editing.id : `sch_${crypto.randomUUID()}` }))
    try {
      await Promise.all(entries.map(entry => putDashboardState(STATE_NAMESPACE, entry.id, entry)))
      setSchedules(current => editing.id ? [...current.filter(item => item.id !== editing.id), ...entries] : [...current, ...entries])
      setEditorOpen(false); setEditing(null)
    } catch (value) { setFormError(value instanceof Error ? value.message : 'Unable to save schedule.') }
  }

  async function deleteSchedule(id: string) {
    try { await deleteDashboardState(STATE_NAMESPACE, id); setSchedules(current => current.filter(item => item.id !== id)); setEditorOpen(false); setEditing(null) }
    catch (value) { setFormError(value instanceof Error ? value.message : 'Unable to delete schedule.') }
  }

  const rangeLabel = `${days[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${days[6].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`

  return <div className="scheduler-page">
    <header className="scheduler-header"><div><h1>Scheduler</h1><p>Plan driver shifts, routes and availability.</p></div><button className="scheduler-add" onClick={() => openEditor()}><Plus />Add schedule</button></header>
    <section className="scheduler-panel">
      <div className="scheduler-toolbar">
        <label className="scheduler-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search driver or vehicle" aria-label="Search driver or vehicle" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}><X /></button>}</label>
        <label className="scheduler-range"><CalendarDays />{rangeLabel}</label>
        <div className="scheduler-nav"><button aria-label="Previous week" onClick={() => setWeekStart(value => new Date(value.getTime() - 7 * dayMs))}><ChevronLeft /></button><button onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button><button aria-label="Next week" onClick={() => setWeekStart(value => new Date(value.getTime() + 7 * dayMs))}><ChevronRight /></button></div>
        <select aria-label="Calendar view" defaultValue="week"><option value="week">Week</option></select>
        <button className={filtersOpen ? 'scheduler-filter active' : 'scheduler-filter'} aria-expanded={filtersOpen} aria-controls="scheduler-filter-menu" onClick={() => setFiltersOpen(value => !value)}><SlidersHorizontal />Filters</button>
      </div>
      {filtersOpen && <div className="scheduler-filters" id="scheduler-filter-menu" role="region" aria-label="Schedule filters"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | ScheduleStatus)} aria-label="Schedule status"><option value="all">All schedules</option><option value="scheduled">Scheduled</option><option value="partial">Partial</option><option value="off">Off</option></select><button onClick={() => setStatusFilter('all')}>Clear status filter</button></div>}
      {error && <div className="scheduler-warning" role="alert">{error}</div>}
      {loading ? <EmptyState loading /> : <div className="scheduler-grid-wrap"><div className="scheduler-grid" style={{ gridTemplateColumns: '210px repeat(7, minmax(130px, 1fr))' }}>
        <div className="scheduler-corner">Driver / Vehicle</div>{days.map(day => <div className={dateKey(day) === dateKey(new Date()) ? 'scheduler-day today' : 'scheduler-day'} key={dateKey(day)}><strong>{day.toLocaleDateString('en-GB', { weekday: 'short' })}</strong><span>{day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></div>)}
        {filteredDrivers.map(driver => { const id = String(driver.id); return <div className="scheduler-row-contents" key={id}>
          <div className="scheduler-driver"><i /><p><strong>{driverName(driver)}</strong><span>{driverMeta(driver)}</span></p></div>
          {days.map(day => { const key = dateKey(day); const entry = schedules.find(item => item.driverId === id && item.date === key); return entry ? <button className={`schedule-cell ${entry.status}`} key={key} onClick={() => setViewingSchedule(entry)}><strong>{entry.status === 'off' ? 'OFF' : `${entry.start} – ${entry.end}`}</strong>{entry.route && <span>{entry.route}</span>}</button> : <button className="schedule-cell empty" key={key} onClick={() => openEditor(id, key)}><Plus /><span>Add</span></button> })}
        </div> })}
      </div>{!filteredDrivers.length && <div className="scheduler-empty"><CalendarDays /><strong>No drivers to schedule</strong><span>{error ? 'Restore the Drivers API connection to load resources.' : 'Add drivers or change the current filters.'}</span></div>}</div>}
      <footer className="scheduler-legend"><span><i className="scheduled" />Scheduled</span><span><i className="partial" />Partial</span><span><i className="off" />Off</span><b>{schedules.filter(item => days.some(day => item.date === dateKey(day))).length} shifts this week</b></footer>
    </section>
    {viewingSchedule && <div className="shift-card-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setViewingSchedule(null) }}><section className="shift-card" role="dialog" aria-modal="true" aria-labelledby="shift-card-title"><header><div><small>{new Date(`${viewingSchedule.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} · {viewingSchedule.start}–{viewingSchedule.end}</small><h2 id="shift-card-title">{viewingDriver ? driverName(viewingDriver) : 'Driver shift'}</h2><span>{viewingDriver ? driverMeta(viewingDriver) : 'No vehicle assigned'}</span></div><button type="button" aria-label="Close shift details" onClick={() => setViewingSchedule(null)}><X /></button></header><div className="shift-card-route"><MapPin /><span><small>SHIFT ROUTE</small><strong>{viewingSchedule.route || 'No route assigned'}</strong></span></div><div className="shift-card-orders"><div className="shift-card-orders-title"><span><Package />Assigned orders</span><b>{viewingOrders.length}</b></div>{ordersLoading ? <p className="shift-card-empty">Loading assigned orders…</p> : viewingOrders.length ? viewingOrders.map(order => { const route = orderRoute(order); return <article key={String(order.id)}><header><strong>{String(order.external_reference || order.id || 'Order')}</strong><span>{String(order.status || 'assigned').replaceAll('_', ' ')}</span></header><div><i /><p><small>Pickup</small>{route.pickup}</p><em /><p><small>Drop-off</small>{route.dropoff}</p></div></article> }) : <p className="shift-card-empty">No orders are currently assigned to this driver.</p>}</div><footer><button type="button" onClick={() => setViewingSchedule(null)}>Close</button><button type="button" className="primary" onClick={() => { const schedule = viewingSchedule; setViewingSchedule(null); openEditor(schedule.driverId, schedule.date, schedule) }}><Pencil />Edit schedule</button></footer></section></div>}
    {editorOpen && editing && <div className="scheduler-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setEditorOpen(false); setEditing(null) } }}><form className="scheduler-editor" onSubmit={saveSchedule}>
      <header><div><h2>{editing.id ? 'Edit schedule' : 'Add schedule'}</h2><p>Set working hours, assignment and workload limits.</p></div><button type="button" aria-label="Close" onClick={() => { setEditorOpen(false); setEditing(null) }}><X /></button></header>
      <div className="scheduler-editor-fields">
        <label><span>Driver *</span><select required value={editing.driverId} onChange={event => { const driverId = event.target.value; setEditing({ ...editing, driverId, vehicleId: driverVehicle(drivers.find(driver => String(driver.id) === driverId) || {})?.id || editing.vehicleId }) }}><option value="">Select driver</option>{drivers.map(driver => <option value={String(driver.id)} key={String(driver.id)}>{driverName(driver)}</option>)}</select></label>
        <label><span>Vehicle</span><select value={editing.vehicleId} onChange={event => setEditing({ ...editing, vehicleId: event.target.value })}><option value="">Unassigned</option>{vehicles.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{vehicle.label}</option>)}</select></label>
        <label><span>Date *</span><input required type="date" value={editing.date} onChange={event => setEditing({ ...editing, date: event.target.value })} /></label>
        <label><span>Status</span><select value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value as ScheduleStatus })}><option value="scheduled">Scheduled</option><option value="partial">Partial</option><option value="off">Off</option></select></label>
        <label><span>Start time *</span><input required={editing.status !== 'off'} disabled={editing.status === 'off'} type="time" value={editing.start} onChange={event => setEditing({ ...editing, start: event.target.value })} /></label>
        <label><span>End time *</span><input required={editing.status !== 'off'} disabled={editing.status === 'off'} type="time" value={editing.end} onChange={event => setEditing({ ...editing, end: event.target.value })} /></label>
        <label><span>Break start</span><input disabled={editing.status === 'off'} type="time" value={editing.breakStart} onChange={event => setEditing({ ...editing, breakStart: event.target.value })} /></label>
        <label><span>Break end</span><input disabled={editing.status === 'off'} type="time" value={editing.breakEnd} onChange={event => setEditing({ ...editing, breakEnd: event.target.value })} /></label>
        <label className="wide"><span>Route / area</span><input value={editing.route} onChange={event => setEditing({ ...editing, route: event.target.value })} placeholder="e.g. Chennai Central" /></label>
        <label><span>Repeat</span><select value={editing.repeat} onChange={event => setEditing({ ...editing, repeat: event.target.value as RepeatMode })}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select></label>
        <label><span>Repeat until</span><input required={editing.repeat !== 'none'} disabled={editing.repeat === 'none'} min={editing.date} type="date" value={editing.repeatUntil} onChange={event => setEditing({ ...editing, repeatUntil: event.target.value })} /></label>
        <label><span>Time zone</span><select value={editing.timezone} onChange={event => setEditing({ ...editing, timezone: event.target.value })}><option value="Asia/Kolkata">India Standard Time (IST)</option><option value="UTC">UTC</option><option value="Asia/Dubai">Gulf Standard Time (GST)</option><option value="Asia/Singapore">Singapore Time (SGT)</option></select></label>
        <label><span>Maximum working hours</span><input min="1" max="24" step="0.5" type="number" value={editing.maxHours} onChange={event => setEditing({ ...editing, maxHours: event.target.value })} /></label>
        <label><span>Maximum orders</span><input min="1" type="number" value={editing.maxOrders} onChange={event => setEditing({ ...editing, maxOrders: event.target.value })} placeholder="No limit" /></label>
        <label className="wide"><span>Notes</span><textarea rows={3} value={editing.notes} onChange={event => setEditing({ ...editing, notes: event.target.value })} placeholder="Instructions or schedule notes" /></label>
        {formError && <div className="scheduler-form-error wide" role="alert">{formError}</div>}
      </div>
      <footer>{editing.id && <button className="scheduler-delete" type="button" onClick={() => deleteSchedule(editing.id)}><Trash2 />Delete</button>}<button className="secondary" type="button" onClick={() => { setEditorOpen(false); setEditing(null) }}>Cancel</button><button className="primary" type="submit">Save schedule</button></footer>
    </form></div>}
  </div>
}
