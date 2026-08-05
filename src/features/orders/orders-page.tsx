'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Columns2, Download, List, Map as MapIcon, Search } from 'lucide-react'
import { GoogleLiveMap } from '@/components/google-live-map'
import { ComposeDialog } from '@/components/ui/compose-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { useApiData } from '@/hooks/use-api-data'
import type { ApiRecord } from '@/types/dashboard'

type OrderStatus = 'all' | string
type ViewMode = 'list' | 'map' | 'split'

function text(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function dateTime(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return text(value)
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(',', ',')
}

function stopsFor(order: ApiRecord) {
  const stops = Array.isArray(order.stops) ? order.stops as ApiRecord[] : []
  const place = (stop?: ApiRecord) => {
    const address = (stop?.address || {}) as ApiRecord
    return text(address.city || address.line1 || stop?.name, '')
  }
  const from = place(stops[0])
  const to = place(stops[stops.length - 1])
  return from && to ? `${from} → ${to}` : text(order.route || order.service_area)
}

function normalizedStatus(order: ApiRecord) {
  return text(order.status, 'unknown').toLowerCase().replaceAll('_', ' ')
}

function stopPosition(order: ApiRecord) {
  return stopPositions(order)[0] || null
}

function stopPositions(order: ApiRecord) {
  const stops = Array.isArray(order.stops) ? order.stops as ApiRecord[] : []
  const positions: Array<{ latitude: number; longitude: number; type: string }> = []
  for (const stop of stops) {
    const address = (stop.address || {}) as ApiRecord
    const latitude = Number(address.latitude ?? stop.latitude)
    const longitude = Number(address.longitude ?? stop.longitude)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) positions.push({ latitude, longitude, type: text(stop.type, 'stop') })
  }
  return positions
}

export function OrdersPage() {
  const { rows, loading, error } = useApiData('Orders')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus>('all')
  const [view, setView] = useState<ViewMode>('list')
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [composeOpen, setComposeOpen] = useState(false)
  const statuses = useMemo(() => [...new Set(rows.map(normalizedStatus))], [rows])

  const filtered = useMemo(() => rows.filter((row) => {
    const matchesSearch = !search || JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
    const matchesStatus = status === 'all' || normalizedStatus(row) === status
    return matchesSearch && matchesStatus
  }), [rows, search, status])

  const mapRows = useMemo(() => filtered.flatMap((order, index) => {
    const position = stopPosition(order)
    if (!position) return []
    const id = text(order.id, String(index))
    return [{ id, status: order.status, active_order_id: order.id, driver: { id, name: text(order.external_reference || order.id) }, position: { ...position, recorded_at: order.updated_at }, route_positions: stopPositions(order) }]
  }), [filtered])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * pageSize
  const pageRows = filtered.slice(pageStart, pageStart + pageSize)

  const metrics = useMemo(() => {
    const count = (values: string[]) => rows.filter(row => values.includes(normalizedStatus(row))).length
    const total = rows.length
    const percent = (value: number) => total ? `${Math.round(value / total * 100)}%` : '0%'
    const slaRows = rows.filter(row => typeof row.sla_compliant === 'boolean')
    const slaCompliant = slaRows.filter(row => row.sla_compliant === true).length
    return [
      ['Total Orders', total, `${filtered.length} currently shown`],
      ['Completed', count(['delivered', 'completed']), percent(count(['delivered', 'completed']))],
      ['In Transit', count(['assigned', 'in transit', 'picked up']), percent(count(['assigned', 'in transit', 'picked up']))],
      ['Delayed', count(['delayed']), percent(count(['delayed']))],
      ['Cancelled', count(['cancelled', 'canceled']), percent(count(['cancelled', 'canceled']))],
      ['SLA Compliance', slaRows.length ? `${Math.round(slaCompliant / slaRows.length * 100)}%` : '—', slaRows.length ? `${slaCompliant} of ${slaRows.length}` : 'No SLA data'],
    ]
  }, [rows, filtered.length])

  function exportRows() {
    const keys = [...new Set(filtered.flatMap(row => Object.keys(row)))]
    const csv = [keys.join(','), ...filtered.map(row => keys.map(key => JSON.stringify(row[key] ?? '')).join(','))].join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'droo-orders.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const tableView = <div className="orders-list-view">
    <div className="orders-reference-table"><table>
      <thead><tr><th>Order ID</th><th>Order Time</th><th>Service Type</th><th>Route</th><th>Customer</th><th>Driver / Vehicle</th><th>Status</th><th>SLA</th><th>ETA / ATA</th></tr></thead>
      <tbody>{pageRows.map((order, index) => { const orderId = text(order.id, String(pageStart + index)); const selectOrder = () => { setSelected(orderId); setView('split') }; return <tr key={orderId} data-order-id={orderId} tabIndex={0} className={selected === orderId ? 'selected-order-row' : ''} onClick={selectOrder} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectOrder() } }}>
        <td className="order-id">{text(order.id || order.external_reference)}</td>
        <td>{dateTime(order.created_at || order.updated_at)}</td>
        <td>{text(order.service_type || order.type)}</td>
        <td>{stopsFor(order)}</td>
        <td>{text(order.customer_name || order.customer)}</td>
        <td>{text(order.assigned_driver || order.driver)}</td>
        <td><StatusBadge value={normalizedStatus(order)} /></td>
        <td>{text(order.sla || order.sla_percentage)}</td>
        <td>{dateTime(order.eta || order.completed_at || order.updated_at)}</td>
      </tr> })}</tbody>
    </table>{!filtered.length && <EmptyState loading={false} error="No orders match the current filters." />}</div>
    <footer className="orders-pagination"><span>{filtered.length ? `Showing ${pageStart + 1} to ${Math.min(pageStart + pageSize, filtered.length)} of ${filtered.length} orders` : 'Showing 0 orders'}</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), Math.max(5, currentPage + 2)).map(pageNumber => <button key={pageNumber} className={pageNumber === currentPage ? 'active' : ''} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}<button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}><ChevronRight /></button></div><select aria-label="Rows per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={25}>25 / page</option><option value={50}>50 / page</option><option value={100}>100 / page</option></select></footer>
  </div>

  const mapView = <div className="orders-map"><GoogleLiveMap rows={mapRows} selected={selected} onSelect={setSelected} />{!mapRows.length && <div className="orders-map-empty"><MapIcon /><strong>No mapped orders</strong><span>Orders need a pickup or drop-off coordinate before they can appear on the map.</span></div>}</div>

  return <div className="orders-reference-page">
    <header className="orders-reference-header">
      <h1>Orders</h1>
      <div>
        <button className="orders-export" onClick={exportRows}><Download /> Export</button>
        <button className="orders-create" onClick={() => setComposeOpen(true)}>Create Order <ChevronDown /></button>
      </div>
    </header>

    <section className="orders-metrics" aria-label="Order metrics">
      {metrics.map(([label, value, detail]) => <article key={String(label)}>
        <span>{label}</span><strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
        <small>{detail}</small>
      </article>)}
    </section>

    <section className="orders-reference-panel">
      <div className="orders-compact-toolbar">
        <label className="orders-compact-search"><Search /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search orders" /></label>
        <select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} aria-label="All statuses"><option value="all">All statuses</option>{statuses.map(item => <option key={item}>{item}</option>)}</select>
        <div className="orders-compact-switcher" aria-label="Orders view">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List />List</button>
          <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}><MapIcon />Map</button>
          <button className={view === 'split' ? 'active' : ''} onClick={() => setView('split')}><Columns2 />Split</button>
        </div>
        <button className="orders-export-csv" disabled={!filtered.length} onClick={exportRows}><Download />Export CSV</button>
      </div>

      {loading ? <EmptyState loading /> : <>
        {error && <div className="orders-data-warning" role="alert"><strong>Orders data is unavailable</strong><span>{error}</span></div>}
        {view === 'list' ? tableView : view === 'map' ? mapView : <div className="orders-reference-split">{tableView}{mapView}</div>}
      </>}
    </section>
    {composeOpen && <ComposeDialog module="Orders" label="Create Order" onClose={() => setComposeOpen(false)} />}
  </div>
}
