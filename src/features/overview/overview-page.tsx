'use client'

import Link from 'next/link'
import { Activity, AlertCircle, Box, CheckCircle2, Truck, Users } from 'lucide-react'
import { useApiData } from '@/hooks/use-api-data'
import { modules } from '@/lib/dashboard-config'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'

export function OverviewPage() {
  const { rows, loading, error } = useApiData('Overview')
  const orders = rows.filter(row => row.__kind === 'order'), drivers = rows.filter(row => row.__kind === 'driver'), earnings = rows.filter(row => row.__kind === 'earning')
  const active = orders.filter(row => ['assigned', 'enroute_pickup', 'arrived_pickup', 'picked_up', 'enroute_dropoff', 'arrived_dropoff'].includes(String(row.status))).length
  const pending = orders.filter(row => ['created', 'published'].includes(String(row.status))).length
  const completed = orders.filter(row => row.status === 'delivered').length
  const attention = orders.filter(row => ['failed', 'cancelled'].includes(String(row.status))).length
  const terminal = orders.filter(row => ['delivered', 'failed', 'cancelled'].includes(String(row.status))).length
  const online = drivers.filter(row => row.online === true).length
  const rate = terminal ? Math.round(completed / terminal * 100) : 0
  const payouts = earnings.reduce((sum, row) => sum + Number((row.amount as Record<string, unknown>)?.amount_minor || 0), 0)
  const stages = [['Created', 'created'], ['Published', 'published'], ['Assigned', 'assigned'], ['In transit', 'enroute'], ['Delivered', 'delivered']]
  return <><PageHeader config={modules.Overview} />{error ? <EmptyState loading={false} error={error} /> : <><div className="metrics">{[[Activity, 'Active orders', loading ? '—' : active, `${pending} waiting to dispatch`], [Truck, 'Online drivers', loading ? '—' : online, `${drivers.length - online} unavailable`], [AlertCircle, 'Requires attention', loading ? '—' : attention, attention ? 'Review operational exceptions' : 'No urgent exceptions'], [CheckCircle2, 'Completion rate', loading ? '—' : `${rate}%`, `${completed} completed deliveries`]].map(([Item, label, value, note]) => { const Icon = Item as React.ElementType; return <article key={String(label)}><div className="metric-icon"><Icon /></div><p><span>{String(label)}</span><strong>{String(value)}</strong><small>{String(note)}</small></p></article> })}</div><div className="grid"><section className="panel"><header><div><h2>Order flow</h2><p>{orders.length} orders · Rider payouts ₹{(payouts / 100).toLocaleString('en-IN')}</p></div></header><div className="bars">{stages.map(([label, status]) => { const count = status === 'enroute' ? orders.filter(row => String(row.status).includes('enroute') || String(row.status).includes('arrived') || row.status === 'picked_up').length : orders.filter(row => row.status === status).length; return <div key={label}><span>{label}<b>{count}</b></span><i><em style={{ width: `${orders.length ? Math.max(3, count / orders.length * 100) : 0}%` }} /></i></div> })}</div></section><section className="panel quick"><header><h2>Quick actions</h2></header>{[['Open orders', Box, '/orders'], ['Open live operations', Activity, '/live-operations'], ['Manage riders', Users, '/drivers']].map(([label, Item, href]) => { const Icon = Item as React.ElementType; return <Link key={String(href)} href={String(href)}><div><Icon /></div><p><strong>{String(label)}</strong><span>Open operational workflow</span></p></Link> })}</section></div></>}</>
}
