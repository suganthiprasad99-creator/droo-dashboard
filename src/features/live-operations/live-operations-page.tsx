'use client'

import { useCallback, useMemo, useState } from 'react'
import { BarChart3, Box, Layers3, LayoutDashboard, Map as MapIcon, MessageSquare, MoreHorizontal, Navigation, Search, Table2, Truck } from 'lucide-react'
import { useApiData } from '@/hooks/use-api-data'
import { GoogleLiveMap } from '@/components/google-live-map'
import { StatusBadge } from '@/components/ui/status-badge'

type ViewMode = 'map' | 'table' | 'board'

export function LiveOperationsPage() {
  const { rows, loading, error } = useApiData('Live Operations', 10_000)
  const [view, setView] = useState<ViewMode>('map')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const filtered = useMemo(() => rows.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search])
  const selectedRow = filtered.find((row, index) => String(((row.driver || {}) as Record<string, unknown>).id || row.id || index) === selected) || filtered[0]
  const driver = (selectedRow?.driver || {}) as Record<string, unknown>
  const select = useCallback((id: string) => setSelected(id), [])

  return <div className="fleet-workspace">
    <div className="fleet-viewbar">
      <Layers3 />
      <div className="view-switcher">
        <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}><MapIcon />Map</button>
        <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><Table2 />Table <span>{filtered.length}</span></button>
        <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}><LayoutDashboard />Board</button>
      </div>
      <label className="workspace-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search live operations" /></label>
    </div>

    {view === 'map' && <section className="operations-map-stage">
      <GoogleLiveMap rows={filtered} selected={selected} onSelect={select} />
      <div className="map-zoom"><button>+</button><button>−</button></div>
      <div className="map-tools"><button><Navigation /></button><button><Search /></button><button><Layers3 /><i>{filtered.length}</i></button><button><MapIcon /></button></div>
      {loading && <div className="map-state">Loading live operations…</div>}
      {error && <div className="map-state error">{error}</div>}
    </section>}

    {view === 'table' && <section className="panel fleet-mode-panel"><table><thead><tr><th>Driver</th><th>Order</th><th>Status</th><th>Last update</th></tr></thead><tbody>{filtered.map((row, index) => { const itemDriver = (row.driver || {}) as Record<string, unknown>; return <tr key={String(row.id || index)}><td>{String(itemDriver.name || 'Driver')}</td><td>{String(row.active_order_id || 'Available')}</td><td><StatusBadge value={String(row.status || 'online')} /></td><td>{String(((row.position || {}) as Record<string, unknown>).recorded_at || 'Live')}</td></tr> })}</tbody></table></section>}

    {view === 'board' && <section className="operations-board">{['Available', 'Assigned', 'In transit'].map((status) => <article className="panel" key={status}><header><h2>{status}</h2><span>{filtered.filter(row => String(row.status || 'Available').toLowerCase().includes(status.toLowerCase().split(' ')[0])).length}</span></header><div className="board-empty"><Truck />Operational cards appear here</div></article>)}</section>}

    <section className="operations-detail-grid">
      <article className="ops-card shipment-card">
        <header><h2>Shipment details</h2><button>Read more</button></header>
        <div className="shipment-person"><div className="large-avatar">{String(driver.name || 'D').charAt(0)}</div><p><strong>{String(driver.name || 'Available driver')}</strong><span>{String(selectedRow?.active_order_id || 'No active order selected')}</span></p><div className="shipment-rating">Rating <b>4.6</b><MoreHorizontal /></div></div>
        <div className="shipment-stats"><div><strong>Transport parcels</strong><span>{String(selectedRow?.status || 'Pending')}</span><b>₹1,450.75</b></div><div><strong>Parcel loading</strong><span>Collection → destination</span><b>{new Date().toLocaleDateString('en-IN')}</b></div><div><strong>Status</strong><StatusBadge value={String(selectedRow?.status || 'pending')} /><span>Standard delivery</span></div></div>
      </article>
      <article className="ops-card capacity-card"><header><h2>Current truck capacity</h2><button>Read more</button></header><div className="capacity-visual"><Truck /><strong>75%</strong></div><div className="capacity-meta"><strong>TN01DR0010</strong><span>Available</span><b>Max Load</b><span>1,400 KG</span></div></article>
      <article className="ops-card trends-card"><header><h2>Shipment trends</h2></header><div className="trend-chart"><span>10 shipments</span>{[36, 61, 46, 72, 54, 84, 67].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></article>
      <article className="ops-card efficiency-card"><header><h2>Route efficiency</h2></header><strong>79<small>%</small></strong><div className="efficiency-line"><BarChart3 /></div></article>
      <article className="ops-card chat-card"><header><h2>Chat</h2><MessageSquare /></header><div><Box /><span>No messages for this shipment.</span></div></article>
    </section>
  </div>
}
