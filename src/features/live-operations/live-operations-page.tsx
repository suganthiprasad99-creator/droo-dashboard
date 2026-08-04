'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Truck } from 'lucide-react'
import { useApiData } from '@/hooks/use-api-data'
import { modules } from '@/lib/dashboard-config'
import { EmptyState } from '@/components/ui/empty-state'
import { GoogleLiveMap } from '@/components/google-live-map'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'

export function LiveOperationsPage() {
  const { rows, loading, error } = useApiData('Live Operations', 10_000)
  const [search, setSearch] = useState(''), [selected, setSelected] = useState<string | null>(null), [clock, setClock] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1_000); return () => window.clearInterval(timer) }, [])
  const filtered = rows.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()))
  const select = useCallback((id: string) => setSelected(id), [])
  return <><PageHeader config={modules['Live Operations']} /><div className="live"><section className="live-list"><div className="tools"><label><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Driver, phone or order" /></label></div>{filtered.length ? filtered.map((row, index) => { const driver = (row.driver || {}) as Record<string, unknown>, position = (row.position || {}) as Record<string, unknown>, id = String(driver.id || row.id || index), stale = clock > 0 && clock - new Date(String(position.recorded_at || 0)).getTime() > 120_000; return <button className={`live-driver ${selected === id ? 'selected' : ''}`} onClick={() => setSelected(id)} key={id}><div className="avatar"><Truck /></div><p><strong>{String(driver.name || 'Driver')}</strong><span>{String(row.active_order_id || 'Available')} · {stale ? 'Location stale' : 'Updated live'}</span></p><StatusBadge value={stale ? 'stale' : 'online'} /></button> }) : <EmptyState loading={loading} error={error || 'No live drivers match your search.'} />}</section><section className="map"><GoogleLiveMap rows={filtered} selected={selected} onSelect={select} /></section></div></>
}
