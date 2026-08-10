'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  PackageOpen,
  RefreshCw,
  Search,
  Wrench,
  X,
} from 'lucide-react'
import { MaintenanceSchedulesPage } from './maintenance-schedules-page'
import { MaintenanceWorkOrdersPage } from './maintenance-work-orders-page'
import { MaintenanceMaintenancesPage } from './maintenance-maintenenances-page'
import { MaintenanceEquipmentPage } from './maintenance-equipment-page'
import { MaintenancePartsPage } from './maintenance-parts-page'
import { maintenanceApi, type MaintenanceSummary } from '@/lib/maintenance-api'
import { ResourceManagementPage } from '@/features/resources/resource-management-page'

const maintenanceCards = [
  { title: 'Overdue Schedules', description: 'No recurring service is overdue.', view: 'schedules', icon: AlertTriangle },
  { title: 'Due This Week', description: 'Maintenance schedules due in the next 7 days.', view: 'schedules', icon: CalendarClock },
  { title: 'Open Work Orders', description: 'No open work orders right now.', view: 'work-orders', icon: ClipboardList },
  { title: 'Low Stock Parts', description: 'No low-stock parts detected.', view: 'parts', icon: PackageOpen },
]

const maintenanceSections = [
  {
    title: 'Planning',
    description: 'Schedule recurring service before work turns urgent.',
    items: [
      { title: 'Schedules', description: 'Recurring maintenance intervals and service windows.', view: 'schedules', icon: CalendarClock },
      { title: 'Work Orders', description: 'Repair tasks, assignments, vendor work, and closure.', view: 'work-orders', icon: ClipboardList },
    ],
  },
  {
    title: 'Records',
    description: 'Keep the maintenance history and serviceable asset catalog current.',
    items: [
      { title: 'Maintenances', description: 'Maintenance records and service history by asset.', view: 'maintenances', icon: Wrench },
      { title: 'Equipment', description: 'Assigned equipment and serviceable operational assets.', view: 'equipment', icon: Wrench },
      { title: 'Parts', description: 'Parts inventory visibility for repair planning.', view: 'parts', icon: PackageOpen },
    ],
  },
]

const guides = [
  { title: 'Schedules', text: 'Plan recurring service windows and convert due schedules into work orders.' },
  { title: 'Work Orders', text: 'Coordinate assigned maintenance work, vendors, due dates, and completion.' },
  { title: 'Equipment', text: 'Track serviceable equipment that participates in maintenance operations.' },
  { title: 'Parts', text: 'Manage parts inventory and restocking signals used by maintenance teams.' },
]

function MaintenanceHub() {
  const [guide, setGuide] = useState<(typeof guides)[number] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null)
  const [totals, setTotals] = useState({ schedules: 0, workOrders: 0, maintenances: 0, equipment: 0, parts: 0 })
  const [loadError, setLoadError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const refresh = async () => {
    setRefreshing(true)
    setLoadError('')
    try {
      const [nextSummary, schedules, workOrders, records, equipment, parts] = await Promise.all([maintenanceApi.summary(), maintenanceApi.listSchedules(), maintenanceApi.listWorkOrders(), maintenanceApi.listRecords(), maintenanceApi.listEquipment(), maintenanceApi.listParts()])
      setSummary(nextSummary)
      setTotals({ schedules: schedules.length, workOrders: workOrders.length, maintenances: records.length, equipment: equipment.length, parts: parts.length })
      setUpdatedAt(new Date())
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Unable to load live maintenance operations.') }
    finally { setRefreshing(false) }
  }
  useEffect(() => { const initial = window.setTimeout(() => void refresh(), 0); const interval = window.setInterval(() => void refresh(), 30_000); return () => { window.clearTimeout(initial); window.clearInterval(interval) } }, [])
  const cardValues: Record<string, number> = { 'Overdue Schedules': summary?.overdue_schedules || 0, 'Due This Week': summary?.due_next_7_days || 0, 'Open Work Orders': summary?.open_work_orders || 0, 'Low Stock Parts': summary?.low_stock_parts || 0 }
  const sectionValues: Record<string, number> = { Schedules: totals.schedules, 'Work Orders': totals.workOrders, Maintenances: totals.maintenances, Equipment: totals.equipment, Parts: totals.parts }
  const cardDescription = (title: string) => {
    const value = cardValues[title]
    if (title === 'Overdue Schedules') return value ? `${value} schedule${value === 1 ? ' is' : 's are'} overdue and need attention.` : 'No recurring service is overdue.'
    if (title === 'Due This Week') return value ? `${value} schedule${value === 1 ? ' is' : 's are'} due in the next 7 days.` : 'No maintenance schedules are due this week.'
    if (title === 'Open Work Orders') return value ? `${value} work order${value === 1 ? ' is' : 's are'} active across Fleet-Ops.` : 'No open work orders right now.'
    return value ? `${value} part${value === 1 ? ' is' : 's are'} at or below the reorder threshold.` : 'No low-stock parts detected.'
  }

  return <div className="maintenance-hub-page">
    <div className="maintenance-hub-heading">
      <div>
        <span>Maintenance</span>
        <h1>Maintenance Hub</h1>
        <p>Plan recurring service, coordinate work orders, and keep assets ready for daily operations.{updatedAt && <small> Live as of {updatedAt.toLocaleTimeString()}</small>}</p>
      </div>
      <button aria-label="Reload maintenance data" title="Reload" onClick={() => void refresh()}><RefreshCw className={refreshing ? 'spin' : ''} /></button>
    </div>

    {loadError && <div className="maintenance-list-notice">{loadError}<button aria-label="Retry maintenance dashboard" onClick={() => void refresh()}><RefreshCw /></button></div>}
    <section className="maintenance-summary-grid" aria-busy={refreshing}>
      {maintenanceCards.map(card => <Link key={card.title} href={`/issues?view=${card.view}`} className="maintenance-summary-card">
        <div className="maintenance-card-icon"><card.icon /></div>
        <div><span>{card.title}</span><strong>{cardValues[card.title]}</strong><p>{cardDescription(card.title)}</p></div>
        <small>Open {card.title}<ArrowRight /></small>
      </Link>)}
    </section>

    <div className="maintenance-hub-layout">
      <div className="maintenance-hub-main">
        {maintenanceSections.map(section => <section className="maintenance-section" key={section.title}>
          <header><h2>{section.title}</h2><p>{section.description}</p></header>
          <div className="maintenance-link-grid">
            {section.items.map(item => <Link key={item.title} href={`/issues?view=${item.view}`}>
              <i><item.icon /></i><div><strong>{item.title}</strong><span>{item.description}</span></div><b>{sectionValues[item.title]}</b><ArrowRight />
            </Link>)}
          </div>
        </section>)}
      </div>

      <aside className="maintenance-action-queue">
        <header><h2>Action Queue</h2><p>Signals from schedules, work orders, parts, and equipment.</p></header>
        {(summary?.overdue_schedules || 0) > 0 && <Link href="/issues?view=schedules"><strong>{summary?.overdue_schedules} overdue schedule{summary?.overdue_schedules === 1 ? '' : 's'}</strong><span>Review overdue service and trigger the required work orders.</span></Link>}
        {(summary?.due_next_7_days || 0) > 0 && <Link href="/issues?view=schedules"><strong>{summary?.due_next_7_days} schedule{summary?.due_next_7_days === 1 ? '' : 's'} due this week</strong><span>Plan technicians, parts, and service windows before the due date.</span></Link>}
        {(summary?.open_work_orders || 0) > 0 && <Link href="/issues?view=work-orders"><strong>{summary?.open_work_orders} open work order{summary?.open_work_orders === 1 ? '' : 's'}</strong><span>Review assignments and advance work using the allowed actions.</span></Link>}
        {(summary?.low_stock_parts || 0) > 0 && <Link href="/issues?view=parts"><strong>{summary?.low_stock_parts} low-stock part{summary?.low_stock_parts === 1 ? '' : 's'}</strong><span>Replenish inventory before active maintenance work is blocked.</span></Link>}
        {(summary?.assets_out_of_service || 0) > 0 && <Link href="/issues?view=equipment"><strong>{summary?.assets_out_of_service} asset{summary?.assets_out_of_service === 1 ? '' : 's'} out of service</strong><span>Review affected equipment and associated repair work.</span></Link>}
        {summary && !summary.overdue_schedules && !summary.due_next_7_days && !summary.open_work_orders && !summary.low_stock_parts && !summary.assets_out_of_service && <Link href="/issues?view=schedules"><strong>No immediate maintenance actions</strong><span>Fleet maintenance operations are currently within planned thresholds.</span></Link>}
        <div className="maintenance-guides">
          <b>Guides</b><p>Read the guide before changing maintenance workflows.</p>
          {guides.map(item => <button key={item.title} onClick={() => setGuide(item)}><strong>Read the guide on {item.title}</strong><span>{item.text}</span></button>)}
        </div>
      </aside>
    </div>

    {guide && <div className="maintenance-guide-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setGuide(null)}>
      <section role="dialog" aria-modal="true" aria-labelledby="maintenance-guide-title">
        <header><h2 id="maintenance-guide-title">Maintenance {guide.title.toLowerCase()} guide</h2><div><Link href={`/issues?view=${guide.title.toLowerCase().replace(' ', '-')}`} aria-label="Open documentation in a new tab" target="_blank"><ExternalLink /></Link><button aria-label="Close documentation" onClick={() => setGuide(null)}><X /></button></div></header>
        <article>
          <span>{guide.title}</span>
          <h1>Maintenance {guide.title}</h1>
          <p>{guide.text}</p>
          <h2>Overview</h2>
          <p>Use this area to plan, assign, and track maintenance activity for vehicles and equipment.</p>
          <h2>How it works</h2>
          <ol><li>Review the affected vehicles and their current service status.</li><li>Create the maintenance record and enter its dates, ownership, parts, and work details.</li><li>Assign the work to the appropriate team member or vendor.</li><li>Track progress until the maintenance work is completed.</li><li>Close the record to preserve the vehicle service history.</li></ol>
          <h2>Related workflow</h2>
          <p>Maintenance schedules can create work orders. Work orders can consume parts and update maintenance history when completed.</p>
        </article>
      </section>
    </div>}
  </div>
}

function MaintenanceView({ view }: { view: string }) {
  const names: Record<string, string> = { schedules: 'Schedules', 'work-orders': 'Work Orders', maintenances: 'Maintenances', equipment: 'Equipment', parts: 'Parts' }
  const name = names[view] ?? 'Maintenance Hub'
  return <div className="maintenance-record-page">
    <div className="page-title"><div><span className="maintenance-breadcrumb">Maintenance / {name}</span><h1>{name}</h1><p>Manage {name.toLowerCase()} for vehicle maintenance operations.</p></div><Link className="secondary" href="/issues?view=maintenance">Back to Maintenance Hub</Link></div>
    <section className="panel data"><div className="tools"><label><Search /><input placeholder={`Search ${name.toLowerCase()}`} /></label><button className="primary">Create {name === 'Parts' ? 'part' : name.slice(0, -1).toLowerCase()}</button></div><div className="empty"><div className="empty-icon"><Wrench /></div><strong>No {name.toLowerCase()} yet</strong><span>New maintenance records will appear here.</span></div></section>
  </div>
}

export function IssuesPage() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  if (view === 'maintenance') return <MaintenanceHub />
  if (view === 'schedules') return <MaintenanceSchedulesPage />
  if (view === 'work-orders') return <MaintenanceWorkOrdersPage />
  if (view === 'maintenances') return <MaintenanceMaintenancesPage />
  if (view === 'equipment') return <MaintenanceEquipmentPage />
  if (view === 'parts') return <MaintenancePartsPage />
  if (view && ['schedules', 'work-orders'].includes(view)) return <MaintenanceView view={view} />
  return <ResourceManagementPage kind="issues" />
}
