'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Copy, Download, MoreHorizontal, RefreshCw, Search, SlidersHorizontal, Truck, Upload } from 'lucide-react'
import { fetchAuthenticated, useApiData } from '@/hooks/use-api-data'
import { modules } from '@/lib/dashboard-config'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import type { ApiRecord } from '@/types/dashboard'

type SortKey = 'name' | 'plate_number' | 'driver' | 'id' | 'status' | 'created_at'
type SortDirection = 'asc' | 'desc'
const pageSize = 25

function text(value: unknown, fallback = '—') { return typeof value === 'string' && value.trim() ? value : fallback }
function dateTime(value: unknown) { if (!value) return '—'; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString() }
function csvCells(line: string) {
  const cells: string[] = []; let value = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) { const character = line[index]; if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1 } else if (character === '"') quoted = !quoted; else if (character === ',' && !quoted) { cells.push(value.trim()); value = '' } else value += character }
  cells.push(value.trim()); return cells
}

function VehiclePhoto({ row }: { row: ApiRecord }) {
  const directURL = text(row.avatar_url, ''); const fileID = text(row.photo_uuid, ''); const [url, setURL] = useState(directURL)
  useEffect(() => { let active = true; if (directURL || !fileID) return; fetchAuthenticated(`/v1/files/${encodeURIComponent(fileID)}/download-url`).then(response => response.ok ? response.json() : null).then(value => { if (active && value?.download_url) setURL(String(value.download_url)) }).catch(() => undefined); return () => { active = false } }, [directURL, fileID])
  return <span className="vehicle-photo" style={url ? { backgroundImage: `url("${url.replaceAll('"', '%22')}")` } : undefined}>{!url && <Truck />}</span>
}

function SortHeader({ field, label, active, onSort }: { field: SortKey; label: string; active: boolean; onSort: (field: SortKey) => void }) {
  return <button className={active ? 'active' : ''} onClick={() => onSort(field)}>{label}<ChevronsUpDown /></button>
}

export function VehicleRecordsPage() {
  const { rows, loading, error, refresh } = useApiData('Vehicles', undefined, false)
  const { rows: drivers } = useApiData('Drivers', undefined, false)
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [sortKey, setSortKey] = useState<SortKey>('created_at'); const [sortDirection, setSortDirection] = useState<SortDirection>('desc'); const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set()); const [menu, setMenu] = useState(''); const [notice, setNotice] = useState(''); const [importing, setImporting] = useState(false); const importInput = useRef<HTMLInputElement>(null)
  const driverNames = useMemo(() => new Map(drivers.map(driver => [String(driver.id), text(driver.name || driver.phone, String(driver.id))])), [drivers])
  const driverName = (row: ApiRecord) => text(row.driver_name || row.assigned_driver || driverNames.get(String(row.driver_uuid || row.driver_id || '')), 'Unassigned')
  const valueFor = (row: ApiRecord, key: SortKey) => key === 'driver' ? driverName(row) : key === 'name' ? text(row.name || row.registration_number || row.plate_number, '') : text(row[key], '')
  const statuses = useMemo(() => Array.from(new Set(rows.map(row => text(row.status, '')).filter(Boolean))).sort(), [rows])
  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return rows.filter(row => (!status || row.status === status) && (!query || [row.name, row.plate_number, row.registration_number, row.internal_id, row.vin, row.id, driverName(row)].some(value => String(value || '').toLowerCase().includes(query)))).sort((left, right) => { const a = valueFor(left, sortKey); const b = valueFor(right, sortKey); const comparison = sortKey === 'created_at' ? new Date(a).getTime() - new Date(b).getTime() : a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); return sortDirection === 'asc' ? comparison : -comparison })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, status, sortKey, sortDirection, driverNames])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)); const currentPage = Math.min(page, pageCount); const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  function sort(key: SortKey) { if (sortKey === key) setSortDirection(value => value === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDirection('asc') } }
  function exportRows() { const keys = ['name', 'plate_number', 'driver_uuid', 'id', 'status', 'created_at']; const csv = [keys.join(','), ...filtered.map(row => keys.map(key => JSON.stringify(row[key] ?? '')).join(','))].join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'droo-vehicles.csv'; link.click(); URL.revokeObjectURL(link.href) }
  async function importCSV(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; setImporting(true); setNotice('')
    try { const lines = (await file.text()).split(/\r?\n/).filter(line => line.trim()); if (lines.length < 2) throw new Error('The CSV file has no vehicle rows.'); const headers = csvCells(lines[0]).map(header => header.trim().toLowerCase().replaceAll(' ', '_')); let created = 0
      for (const line of lines.slice(1)) { const values = csvCells(line); const vehicle: Record<string, unknown> = Object.fromEntries(headers.map((header, index) => [header, values[index] || null])); vehicle.status ||= 'available'; const response = await fetchAuthenticated('/v1/admin/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ vehicle }) }); if (!response.ok) throw new Error(`Import stopped at row ${created + 2} (${response.status}).`); created += 1 }
      setNotice(`${created} vehicle${created === 1 ? '' : 's'} imported.`); refresh()
    } catch (value) { setNotice(value instanceof Error ? value.message : 'Vehicle import failed.') } finally { setImporting(false) }
  }
  const visibleIDs = visible.map(row => String(row.id)); const allVisibleSelected = Boolean(visibleIDs.length) && visibleIDs.every(id => selected.has(id))
  function selectVisible() { setSelected(current => { const next = new Set(current); if (allVisibleSelected) visibleIDs.forEach(id => next.delete(id)); else visibleIDs.forEach(id => next.add(id)); return next }) }

  return <><PageHeader config={modules.Vehicles} onCreated={refresh} /><section className="vehicle-records"><div className="vehicle-table-tools">
    <label><Search /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search vehicles" /></label><select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} aria-label="Filter vehicles by status"><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select>
    <button aria-label="Filter vehicles" title="Status filter"><SlidersHorizontal /></button><button aria-label="Refresh vehicles" onClick={refresh}><RefreshCw /></button><button className="vehicle-import" onClick={() => importInput.current?.click()} disabled={importing}><Upload />{importing ? 'Importing…' : 'Import'}</button><input ref={importInput} hidden type="file" accept=".csv,text/csv" onChange={importCSV} /><button onClick={exportRows} disabled={!filtered.length}><Download />Export</button>
  </div>{rows.length ? <div className="vehicle-table-wrap"><table className="vehicle-table"><thead><tr><th><input aria-label="Select visible vehicles" type="checkbox" checked={allVisibleSelected} onChange={selectVisible} /></th><th><SortHeader field="name" label="Name" active={sortKey === 'name'} onSort={sort} /></th><th><SortHeader field="plate_number" label="Plate number" active={sortKey === 'plate_number'} onSort={sort} /></th><th><SortHeader field="driver" label="Driver assigned" active={sortKey === 'driver'} onSort={sort} /></th><th><SortHeader field="id" label="ID" active={sortKey === 'id'} onSort={sort} /></th><th><SortHeader field="status" label="Status" active={sortKey === 'status'} onSort={sort} /></th><th><SortHeader field="created_at" label="Created" active={sortKey === 'created_at'} onSort={sort} /></th><th aria-label="Actions" /></tr></thead><tbody>{visible.map(row => { const id = String(row.id); return <tr key={id}><td><input aria-label={`Select ${text(row.name || row.plate_number, id)}`} type="checkbox" checked={selected.has(id)} onChange={() => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })} /></td><td><span className="vehicle-name-cell"><i className={`vehicle-presence ${text(row.status, 'available')}`} /><VehiclePhoto row={row} /><strong>{text(row.name || row.registration_number || row.plate_number, 'Unnamed vehicle')}</strong></span></td><td>{text(row.plate_number || row.registration_number)}</td><td>{driverName(row)}</td><td><code>{id}</code></td><td><StatusBadge value={text(row.status, 'available')} /></td><td>{dateTime(row.created_at)}</td><td className="vehicle-actions"><button aria-label={`Actions for ${id}`} onClick={() => setMenu(current => current === id ? '' : id)}><MoreHorizontal /></button>{menu === id && <div><button onClick={() => { navigator.clipboard.writeText(id); setNotice('Vehicle ID copied.'); setMenu('') }}><Copy />Copy vehicle ID</button>{Boolean(row.plate_number) && <button onClick={() => { navigator.clipboard.writeText(String(row.plate_number)); setNotice('Plate number copied.'); setMenu('') }}><Copy />Copy plate number</button>}</div>}</td></tr> })}</tbody></table></div> : <EmptyState loading={loading} error={error} />}
  <footer className="vehicle-table-footer"><span>{selected.size ? `${selected.size} selected · ` : ''}{filtered.length ? `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length}` : 'No results'}</span><div><button disabled={currentPage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft /></button><strong>{currentPage}</strong><button disabled={currentPage >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}><ChevronRight /></button></div></footer>{notice && <div className="vehicle-table-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><ChevronDown /></button></div>}</section></>
}
