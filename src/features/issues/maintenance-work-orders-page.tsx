'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowUpRight, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, Eye, Funnel, MoreHorizontal, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react'
import { maintenanceApi, type MaintenanceWorkOrder as ApiWorkOrder } from '@/lib/maintenance-api'
import { fetchAuthenticated } from '@/hooks/use-api-data'
import { ReferenceSelect, useMaintenanceReferenceOptions } from './use-maintenance-reference-options'

type WorkOrder = {
  id: string
  code: string
  subject: string
  category: string
  status: string
  priority: string
  assignee: string
  assigneeType: string
  targetType: string
  target: string
  openedAt: string
  dueAt: string
  closedAt: string
  instructions: string
  metadata: string
  created: string
  scheduleId?: string
  name?: string
  type?: string
}

type MetadataRow = { id: string; key: string; value: string | number | boolean; type: 'text' | 'number' | 'boolean' }
type AssetOption = { id: string; label: string; type: 'Vehicle' | 'Equipment' }
type AssigneeOption = { id: string; label: string }
const parseMetadata = (value: string): MetadataRow[] => {
  if (!value.trim()) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    return Object.entries(parsed).map(([key, item]) => ({ id: crypto.randomUUID(), key, value: typeof item === 'boolean' || typeof item === 'number' ? item : String(item ?? ''), type: typeof item === 'boolean' ? 'boolean' : typeof item === 'number' ? 'number' : 'text' }))
  } catch { return [{ id: crypto.randomUUID(), key: 'metadata', value, type: 'text' }] }
}

const columns = ['Code', 'Subject', 'Category', 'Status', 'Priority', 'Assignee', 'Due At', 'Created'] as const
type Column = (typeof columns)[number]
const blank = (): WorkOrder => ({ id: '', code: '', subject: '', category: '', status: '', priority: '', assignee: '', assigneeType: '', targetType: '', target: '', openedAt: '', dueAt: '', closedAt: '', instructions: '', metadata: '', created: '' })
const blankFilters = () => ({ code: '', subject: '', category: '', status: '', priority: '', assignee: '', dueAt: '', created: '' })
const title = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const fromApi = (row: ApiWorkOrder): WorkOrder => { const external = row.assigned_vendor_ref || ''; const isContact = external.startsWith('contact:'); const isVendor = external.startsWith('vendor:'); return ({ ...blank(), id: row.id, code: row.code, subject: row.subject, category: title(row.category), status: title(row.status), priority: title(row.priority), assignee: row.assigned_user_id || (isContact || isVendor ? external.slice(external.indexOf(':') + 1) : external), assigneeType: row.assigned_user_id ? 'User' : isContact ? 'Contact' : external ? 'Vendor' : '', targetType: row.vehicle_id ? 'Vehicle' : 'Equipment', target: row.vehicle_id || row.equipment_id || '', openedAt: row.opened_at?.slice(0, 10) || '', dueAt: row.due_at?.slice(0, 10) || '', closedAt: row.completed_at?.slice(0, 10) || '', instructions: row.instructions || '', created: row.created_at, scheduleId: row.schedule_id }) }

export function MaintenanceWorkOrdersPage() {
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(blankFilters)
  const [draftFilters, setDraftFilters] = useState(blankFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<Column, boolean>>(() => Object.fromEntries(columns.map(column => [column, true])) as Record<Column, boolean>)
  const [selected, setSelected] = useState<string[]>([])
  const [menu, setMenu] = useState<string | null>(null)
  const [editor, setEditor] = useState<WorkOrder | null>(null)
  const [viewOnly, setViewOnly] = useState(false)
  const [deleting, setDeleting] = useState<WorkOrder | null>(null)
  const [notice, setNotice] = useState('')
  const [guideOpen, setGuideOpen] = useState(() => searchParams.get('guide') === 'open')
  const [assets, setAssets] = useState<AssetOption[]>([])
  const [assignees, setAssignees] = useState<AssigneeOption[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      setRows((await maintenanceApi.listWorkOrders()).map(fromApi))
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load work orders.') }
    finally { setLoading(false) }
  }
  const loadAssets = async () => {
    try {
      const [equipment, vehicleResponse, driverResponse] = await Promise.all([maintenanceApi.listEquipment(), fetchAuthenticated('/v1/admin/vehicles'), fetchAuthenticated('/v1/admin/drivers?limit=100')])
      const vehicleBody = vehicleResponse.ok ? await vehicleResponse.json() as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> : []
      const vehicles = Array.isArray(vehicleBody) ? vehicleBody : vehicleBody.data || []
      const driverBody = driverResponse.ok ? await driverResponse.json() as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> : []
      const drivers = Array.isArray(driverBody) ? driverBody : driverBody.data || []
      setAssets([
        ...vehicles.map(row => ({ id: String(row.id || ''), label: String(row.name || row.call_sign || row.plate_number || row.id || ''), type: 'Vehicle' as const })).filter(row => row.id),
        ...equipment.map(row => ({ id: row.id, label: `${row.name}${row.code ? ` (${row.code})` : ''}`, type: 'Equipment' as const })),
      ])
      setAssignees(drivers.map(row => ({ id: String(row.user_id || ''), label: String(row.name || row.phone || row.user_id || '') })).filter(row => row.id))
    } catch { setAssets([]); setAssignees([]) }
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); void loadAssets() }, 0); return () => window.clearTimeout(timer) }, [])
  useEffect(() => { if (!guideOpen) return; const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')closeGuide()};window.addEventListener('keydown',closeOnEscape);return()=>window.removeEventListener('keydown',closeOnEscape) }, [guideOpen])

  function openGuide() { setGuideOpen(true); const url=new URL(window.location.href);url.searchParams.set('guide','open');window.history.replaceState({},'',url) }
  function closeGuide() { setGuideOpen(false); const url=new URL(window.location.href);url.searchParams.delete('guide');window.history.replaceState({},'',url) }

  const visible = useMemo(() => rows.filter(row => {
    const searchable = `${row.code} ${row.subject} ${row.category} ${row.status} ${row.priority} ${row.assignee}`.toLowerCase()
    return searchable.includes(search.toLowerCase()) && row.code.toLowerCase().includes(filters.code.toLowerCase()) && row.subject.toLowerCase().includes(filters.subject.toLowerCase()) && row.category.toLowerCase().includes(filters.category.toLowerCase()) && row.status.toLowerCase().includes(filters.status.toLowerCase()) && row.priority.toLowerCase().includes(filters.priority.toLowerCase()) && row.assignee.toLowerCase().includes(filters.assignee.toLowerCase()) && row.dueAt.includes(filters.dueAt) && row.created.toLowerCase().includes(filters.created.toLowerCase())
  }), [rows, search, filters])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!editor?.subject || !editor.category || !editor.status || !editor.priority || !editor.targetType || !editor.target) { setNotice('Complete the required fields and select a target vehicle or equipment item.'); return }
    if (editor.id) { setNotice('Use the work-order lifecycle actions to update an existing work order.'); return }
    const user = editor.assigneeType === 'User' && editor.assignee ? assignees.find(item => item.id === editor.assignee || item.label.toLowerCase() === editor.assignee.toLowerCase()) : undefined
    const ignoredInvalidUser = editor.assigneeType === 'User' && Boolean(editor.assignee) && !user
    const externalAssignee = (editor.assigneeType === 'Vendor' || editor.assigneeType === 'Contact') && editor.assignee ? `${editor.assigneeType.toLowerCase()}:${editor.assignee.trim()}` : ''
    try { const value = await maintenanceApi.createWorkOrder({ code: editor.code, subject: editor.subject, category: editor.category.toLowerCase().startsWith('preventive') ? 'preventive' : editor.category.toLowerCase(), priority: editor.priority.toLowerCase(), [editor.targetType.toLowerCase() === 'vehicle' ? 'vehicle_id' : 'equipment_id']: editor.target, currency: 'INR', estimated_cost_minor: 0, ...(user ? { assigned_user_id: user.id } : {}), ...(externalAssignee ? { assigned_vendor_ref: externalAssignee } : {}), ...(editor.dueAt ? { due_at: new Date(`${editor.dueAt}T23:59:59Z`).toISOString() } : {}), ...(editor.instructions ? { instructions: editor.instructions } : {}) }); await load(); setEditor(null); setNotice(ignoredInvalidUser ? `Work order ${value.code} created without an assignee because the selected driver was not an organization member.` : `Work order ${value.code} created.`) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save the work order.') }
  }
  const updateStatus = async (row: WorkOrder, status: string) => { try { let allowed = await maintenanceApi.allowedActions(row.id); const action = status === 'Completed' ? 'complete' : 'start'; if (action === 'start' && allowed.actions.includes('open')) { await maintenanceApi.transitionWorkOrder(row.id, { action: 'open' }); allowed = await maintenanceApi.allowedActions(row.id) } if (!allowed.actions.includes(action)) { setNotice(`${title(action)} is not allowed while the work order is ${row.status}.`); return } const value = await maintenanceApi.transitionWorkOrder(row.id, { action, ...(action === 'complete' ? { actual_cost_minor: 0 } : {}) }); setRows(items => items.map(item => item.id === value.id ? fromApi(value) : item)); setMenu(null); setNotice(`Work order marked ${status.toLowerCase()}.`) } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update work order.') } }
  const remove = async () => { if (!deleting) return; setDeleting(null); setNotice('Work orders are auditable records and cannot be deleted. Use Cancel when allowed.') }
  const exportRows = () => { const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'maintenance-work-orders.json'; link.click(); URL.revokeObjectURL(url) }
  const importRows = async (file?: File) => { if (!file) return; try { const values = JSON.parse(await file.text()) as WorkOrder[]; for (const value of values) await maintenanceApi.createWorkOrder({ code: value.code, subject: value.subject, category: value.category.toLowerCase().startsWith('preventive') ? 'preventive' : value.category.toLowerCase(), priority: value.priority.toLowerCase(), [value.targetType.toLowerCase() === 'vehicle' ? 'vehicle_id' : 'equipment_id']: value.target, currency: 'INR', estimated_cost_minor: 0 }); await load(); setNotice(`${values.length} work orders imported.`) } catch { setNotice('Import failed. Check the records and asset IDs.') } }

  return <div className="maintenance-list-page work-orders-page">
    <header className="maintenance-list-header"><h2>Work Orders</h2><div className="maintenance-list-search"><Search /><input aria-label="Search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Work Orders" /></div><div className="maintenance-list-actions">
      <button aria-label="Filter work orders" className={filtersOpen ? 'active' : ''} onClick={() => { setDraftFilters(filters); setFiltersOpen(value => !value); setColumnsOpen(false) }}><Funnel /></button>
      <button aria-label="Customize columns" className={columnsOpen ? 'active' : ''} onClick={() => { setColumnsOpen(value => !value); setFiltersOpen(false) }}><SlidersHorizontal /></button>
      <button aria-label="Refresh" onClick={() => { setLoading(true); void load() }}><RefreshCw className={loading ? 'spin' : ''} /></button>
      <button className="new-schedule-action" onClick={() => { setViewOnly(false); setEditor(blank()) }}><Plus />New</button>
      <button className="import-schedules-action" onClick={() => fileRef.current?.click()}><Upload />Import</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={event => void importRows(event.target.files?.[0])} />
      <button className="export-schedules-action" onClick={exportRows}><ArrowUpRight />Export</button>
      {filtersOpen && <div className="maintenance-filter-panel work-order-filter"><header>Filters</header><div className="maintenance-filter-grid">{Object.entries(draftFilters).map(([key, value]) => <FilterField key={key} label={{ code: 'Code', subject: 'Subject', category: 'Category', status: 'Status', priority: 'Priority', assignee: 'Assignee', dueAt: 'Due At', created: 'Created' }[key] || key} value={value} onChange={next => setDraftFilters(current => ({ ...current, [key]: next }))} />)}</div><footer><button type="button" onClick={() => { const cleared = blankFilters(); setDraftFilters(cleared); setFilters(cleared); setFiltersOpen(false) }}><Trash2 />Clear</button><button type="button" className="apply" onClick={() => { setFilters(draftFilters); setFiltersOpen(false) }}><Check />Apply</button></footer></div>}
      {columnsOpen && <div className="maintenance-columns-menu"><strong>Customize columns</strong>{columns.map(column => <label key={column}><input type="checkbox" checked={visibleColumns[column]} onChange={event => setVisibleColumns(current => ({ ...current, [column]: event.target.checked }))} />{column}</label>)}<button className="columns-done" onClick={() => setColumnsOpen(false)}>Done</button></div>}
    </div></header>
    {notice && <div className="maintenance-list-notice">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X /></button></div>}
    <section className="maintenance-table-panel"><div className="table-wrap"><table className="maintenance-schedules-table work-orders-table"><thead><tr><th><input aria-label="Select all work orders" type="checkbox" checked={visible.length > 0 && selected.length === visible.length} onChange={event => setSelected(event.target.checked ? visible.map(row => row.id) : [])} /></th>{columns.filter(column => visibleColumns[column]).map(column => <th key={column}>{column}<span>↕</span></th>)}<th /></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td><input aria-label={`Select ${row.subject}`} type="checkbox" checked={selected.includes(row.id)} onChange={event => setSelected(items => event.target.checked ? [...items, row.id] : items.filter(id => id !== row.id))} /></td>{visibleColumns.Code && <td><button className="schedule-id" onClick={() => { setViewOnly(true); setEditor(row) }}>{row.code}</button></td>}{visibleColumns.Subject && <td>{row.subject}</td>}{visibleColumns.Category && <td><span className="schedule-type">{row.category || '—'}</span></td>}{visibleColumns.Status && <td><span className={`schedule-status ${row.status.toLowerCase()}`}>{row.status || 'Open'}</span></td>}{visibleColumns.Priority && <td>{row.priority || 'Medium'}</td>}{visibleColumns.Assignee && <td>{row.assignee || '—'}</td>}{visibleColumns['Due At'] && <td>{row.dueAt || '—'}</td>}{visibleColumns.Created && <td>{row.created}</td>}<td className="schedule-row-actions"><button aria-label={`Actions for ${row.subject}`} onClick={() => setMenu(menu === row.id ? null : row.id)}><MoreHorizontal /></button>{menu === row.id && <div role="menu"><strong>Work Order Actions</strong><button role="menuitem" onClick={() => { setViewOnly(true); setEditor(row); setMenu(null) }}>View Work Order</button><button role="menuitem" onClick={() => { setViewOnly(false); setEditor(row); setMenu(null) }}>Edit Work Order</button><button role="menuitem" onClick={() => void updateStatus(row, 'In Progress')}>Start Work Order</button><button role="menuitem" onClick={() => void updateStatus(row, 'Completed')}>Complete Work Order</button><button role="menuitem" className="danger" onClick={() => { setDeleting(row); setMenu(null) }}>Delete Work Order</button></div>}</td></tr>)}</tbody></table></div>{!loading && !visible.length && <div className="work-orders-empty"><span><ClipboardList /></span><h3>No work orders yet</h3><p>Create work orders to assign maintenance tasks, track progress, and close out repairs.</p><div><button onClick={() => fileRef.current?.click()}><Upload />Import</button><button className="primary" onClick={() => setEditor(blank())}><Plus />New work order</button></div><button className="guide" onClick={openGuide}><BookOpen />Work orders guide</button></div>}<footer><p>Showing <b>{visible.length ? 1 : 0}</b> to <b>{visible.length || 1}</b> of <b>{visible.length}</b> results</p><div><button disabled><ChevronLeft /></button><button className="active">1</button><button disabled><ChevronRight /></button></div></footer></section>

    {guideOpen && <WorkOrdersGuide onClose={closeGuide} />}

    {editor && <WorkOrderEditor editor={editor} setEditor={setEditor} viewOnly={viewOnly} assets={assets} assignees={assignees} onSubmit={save} onClose={() => setEditor(null)} />}
    {deleting && <div className="vehicle-delete-backdrop" onMouseDown={event => event.target === event.currentTarget && setDeleting(null)}><section className="vehicle-delete-dialog" role="alertdialog" aria-modal="true"><div className="vehicle-delete-content"><span className="vehicle-delete-warning"><AlertTriangle /></span><div><h2>Delete Work Order ({deleting.code})?</h2><p>This action cannot be undone. Once deleted, the record will be permanently removed.</p></div></div><footer><button onClick={() => setDeleting(null)}><X />Cancel</button><button className="danger" onClick={() => void remove()}><Trash2 />Confirm Delete</button></footer></section></div>}
  </div>
}

const workOrderAttributes = [
  ['Code','Auto-generated reference code (for example, WO-00123)'],['Subject','Title of the maintenance or repair task'],['Target','The vehicle, driver, or equipment the work is performed on'],['Assignee','Driver, vendor, or contact responsible for the task'],['Priority','Low, medium, high, or urgent'],['Status','Current stage in the work-order workflow'],['Opened At','When the work order was created'],['Due At','Deadline for completion'],['Closed At','When the work order was completed and closed'],['Instructions','Detailed task instructions'],['Checklist','Structured list of sub-tasks to complete'],['Estimated Cost','Pre-work cost estimate'],['Approved Budget','Authorized spend amount'],['Actual Cost','Recorded cost after completion'],['Currency','Currency used for all cost fields'],['Cost Center','Budget code or department for accounting'],
]

function WorkOrdersGuide({onClose}:{onClose:()=>void}) {
  return <div className="work-order-guide-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section role="dialog" aria-modal="true" aria-label="Work orders guide">
    <header><h2>Work orders guide</h2><a href="/issues?view=work-orders&guide=open" target="_blank" rel="noreferrer" aria-label="Open Work orders guide in new tab"><ExternalLink/></a><button aria-label="Close Work orders guide" onClick={onClose}><X/></button></header>
    <div className="work-order-guide-brand"><span><ClipboardList/></span><strong>Droo</strong><button aria-label="Guide menu"><MoreHorizontal/></button></div>
    <div className="work-order-guide-section"><span><ClipboardList/></span><strong>Work Orders</strong><ChevronDown/></div>
    <article>
      <span>Work Orders</span><h1>Work Orders</h1><p className="lead">Create, assign, and track maintenance work orders—from initial task assignment through checklist completion and cost tracking to closure.</p>
      <h2>Work Orders</h2><p>A <strong>Work Order</strong> is an assigned maintenance or repair task. Work orders can be generated from maintenance schedules when service thresholds are reached, or created manually for repairs and inspections. Each work order is tracked from open to completion with a full cost record.</p>
      <h2>Work Order Attributes</h2><table><thead><tr><th>Field</th><th>Description</th></tr></thead><tbody>{workOrderAttributes.map(([field,description])=><tr key={field}><td>{field}</td><td>{description}</td></tr>)}</tbody></table>
      <h2>Work Order Status Flow</h2><pre>open ──► in_progress ──► closed{`\n`}  └────────► canceled</pre><table><thead><tr><th>Status</th><th>Meaning</th></tr></thead><tbody><tr><td>open</td><td>Created and not yet started</td></tr><tr><td>in_progress</td><td>Work has begun</td></tr><tr><td>closed</td><td>Work and checklist completed</td></tr><tr><td>canceled</td><td>Canceled before completion</td></tr></tbody></table>
      <h2>Creating a Work Order</h2><ol><li>Open Fleet-Ops → Maintenance → Work Orders.</li><li>Click <strong>New Work Order</strong>.</li><li>Set the subject, category, status, and priority.</li><li>Select the target vehicle or equipment.</li><li>Choose the assignee and due date.</li><li>Add detailed instructions and checklist items.</li><li>Enter estimated cost and approved budget.</li><li>Save the work order.</li></ol>
      <h2>Closing a Work Order</h2><p>Complete every checklist item, record the actual cost, add completion notes, and mark the work order as completed. The closure date is recorded automatically.</p>
    </article>
  </section></div>
}

function WorkOrderEditor({ editor, setEditor, viewOnly, assets, assignees, onSubmit, onClose }: { editor: WorkOrder; setEditor: React.Dispatch<React.SetStateAction<WorkOrder | null>>; viewOnly: boolean; assets: AssetOption[]; assignees: AssigneeOption[]; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  const references = useMaintenanceReferenceOptions()
  const update = (changes: Partial<WorkOrder>) => setEditor(current => current ? { ...current, ...changes } : current)
  return <div className="schedule-editor-backdrop"><section className="schedule-editor work-order-reference-editor" role="dialog" aria-modal="true" aria-label={viewOnly ? 'Work order details' : editor.id ? 'Edit work order' : 'Create new work order'}>
    <form onSubmit={onSubmit}>
      <header><div><h2>{viewOnly ? editor.subject : editor.id ? 'Edit work order' : 'Create new work order'}</h2><p>{viewOnly ? 'Review the work order details.' : 'Enter the work order details below.'}</p></div><div>{!viewOnly && <button className="primary" type="submit">{editor.id ? 'Save Changes' : 'Create Work Order'}</button>}<button type="button" aria-label="Close work order form" onClick={onClose}><X /></button></div></header>
      <div className="schedule-editor-body">
        <Section title="Identification" subtitle="Work Order Details"><label>Code<input disabled={viewOnly} value={editor.code} onChange={event => update({ code: event.target.value })} placeholder="Auto-generated if left blank" /></label><label>Subject<input disabled={viewOnly} required value={editor.subject} onChange={event => update({ subject: event.target.value })} placeholder="Brief description of the work order" /></label></Section>
        <Section title="Work Order Classification"><label>Category<select disabled={viewOnly} required value={editor.category} onChange={event => update({ category: event.target.value })}><option value="">Select Category</option><option>Inspection</option><option>Service</option><option>Repair</option><option>Preventive Maintenance</option></select></label><div className="work-order-status-priority"><strong>Status &amp; Priority</strong><div><label>Status<select disabled={viewOnly} required value={editor.status} onChange={event => update({ status: event.target.value })}><option value="">Select Status</option><option>Open</option><option>In Progress</option><option>On Hold</option><option>Completed</option><option>Cancelled</option></select></label><label>Priority<select disabled={viewOnly} required value={editor.priority} onChange={event => update({ priority: event.target.value })}><option value="">Select Priority</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label></div></div></Section>
        <Section title="Assignment" subtitle="Target Asset"><label>Target Type<select disabled={viewOnly} required value={editor.targetType} onChange={event => update({ targetType: event.target.value, target: '' })}><option value="">Select target type</option><option>Vehicle</option><option>Equipment</option></select></label>{editor.targetType && <label>Target<select disabled={viewOnly} required value={editor.target} onChange={event => update({ target: event.target.value })}><option value="">Select target asset</option>{assets.filter(asset => asset.type === editor.targetType).map(asset => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></label>}<label>Assignee Type<select disabled={viewOnly} value={editor.assigneeType} onChange={event => update({ assigneeType: event.target.value, assignee: '' })}><option value="">Select assignee type</option><option>User</option><option>Vendor</option><option>Contact</option></select></label>{editor.assigneeType === 'User' && <label>Assignee<select disabled={viewOnly} value={editor.assignee} onChange={event => update({ assignee: event.target.value })}><option value="">Select organization user</option>{assignees.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>}{(editor.assigneeType === 'Vendor' || editor.assigneeType === 'Contact') && <ReferenceSelect label="Assignee" disabled={viewOnly} value={editor.assignee} options={references.assigneesFor(editor.assigneeType)} placeholder="Select assignee" onChange={assignee => update({ assignee })} />}</Section>
        <Section title="Scheduling" subtitle="Dates"><label>Opened At<input disabled={viewOnly} type="date" value={editor.openedAt} onChange={event => update({ openedAt: event.target.value })} /></label><label>Due At<input disabled={viewOnly} type="date" value={editor.dueAt} onChange={event => update({ dueAt: event.target.value })} /></label><label>Closed At<input disabled={viewOnly || !editor.id} type="date" value={editor.closedAt} onChange={event => update({ closedAt: event.target.value })} /></label></Section>
        <Section title="Instructions"><label className="wide">Instructions<textarea disabled={viewOnly} value={editor.instructions} onChange={event => update({ instructions: event.target.value })} placeholder="Step-by-step instructions for the technician" /></label></Section>
        <section className="work-order-metadata-section"><h3>Metadata</h3><WorkOrderMetadata key={editor.id || 'new'} value={editor.metadata} disabled={viewOnly} onChange={metadata => update({ metadata })} /></section>
      </div>
      <footer><button type="button" onClick={onClose}>{viewOnly ? 'Close' : 'Cancel'}</button>{!viewOnly && <button className="primary" type="submit">{editor.id ? 'Save Changes' : 'Create Work Order'}</button>}</footer>
    </form>
  </section></div>
}

function WorkOrderMetadata({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  const [rows, setRows] = useState<MetadataRow[]>(() => parseMetadata(value))
  const [filter, setFilter] = useState('')
  const [showValues, setShowValues] = useState(true)
  const visible = rows.filter(row => `${row.key} ${String(row.value)} ${row.type}`.toLowerCase().includes(filter.trim().toLowerCase()))
  const commit = (updateRows: (current: MetadataRow[]) => MetadataRow[]) => {
    const next = updateRows(rows)
    setRows(next)
    const object = Object.fromEntries(next.filter(row => row.key.trim()).map(row => [row.key.trim(), row.type === 'number' ? Number(row.value) : row.type === 'boolean' ? row.value === true || row.value === 'true' : String(row.value)]))
    onChange(next.length ? JSON.stringify(object) : '')
  }
  const update = (id: string, changes: Partial<MetadataRow>) => commit(current => current.map(row => row.id === id ? { ...row, ...changes } : row))
  return <div className="work-order-metadata">
    <div className="work-order-metadata-toolbar"><input aria-label="Filter metadata" placeholder="Filter keys..." value={filter} onChange={event => setFilter(event.target.value)} /><button type="button" disabled={disabled} onClick={() => commit(current => [...current, { id: crypto.randomUUID(), key: '', value: '', type: 'text' }])}><Plus />Add</button><button type="button" className={showValues ? 'active' : ''} aria-label={showValues ? 'Hide metadata values' : 'Show metadata values'} onClick={() => setShowValues(current => !current)}><Eye /></button></div>
    <div className="work-order-metadata-table" role="table" aria-label="Work order metadata"><div className="work-order-metadata-heading" role="row"><strong role="columnheader">Key</strong><strong role="columnheader">Value</strong><strong role="columnheader">Type</strong><span /></div>
      {visible.map(row => <div className="work-order-metadata-row" role="row" key={row.id}><input role="cell" disabled={disabled} aria-label="Metadata key" placeholder="Key" value={row.key} onChange={event => update(row.id, { key: event.target.value })} />{row.type === 'boolean' ? <label className="work-order-metadata-boolean" role="cell"><input disabled={disabled} type="checkbox" checked={row.value === true || row.value === 'true'} onChange={event => update(row.id, { value: event.target.checked })} /><span>{row.value === true || row.value === 'true' ? 'True' : 'False'}</span></label> : <input role="cell" disabled={disabled} aria-label={`Value for ${row.key || 'metadata'}`} type={showValues ? row.type : 'password'} step={row.type === 'number' ? 'any' : undefined} placeholder="Value" value={String(row.value)} onChange={event => update(row.id, { value: event.target.value })} />}<select role="cell" disabled={disabled} aria-label={`Type for ${row.key || 'metadata'}`} value={row.type} onChange={event => { const type = event.target.value as MetadataRow['type']; update(row.id, { type, value: type === 'boolean' ? false : type === 'number' ? '' : String(row.value) }) }}><option value="text">Text</option><option value="number">Number</option><option value="boolean">Boolean</option></select>{!disabled && <button type="button" aria-label={`Remove ${row.key || 'metadata'} row`} onClick={() => commit(current => current.filter(item => item.id !== row.id))}><Trash2 /></button>}</div>)}
      {!visible.length && <p className="work-order-metadata-empty">{rows.length ? 'No metadata matches this filter.' : 'No metadata. Click Add to create one.'}</p>}
    </div>
  </div>
}

function FilterField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><strong>{label}</strong><span><input aria-label={`Filter by ${label}`} value={value} onChange={event => onChange(event.target.value)} placeholder={label} />{value && <button type="button" aria-label={`Clear ${label} filter`} onClick={() => onChange('')}><X /></button>}</span></label> }
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <section><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}<div>{children}</div></section> }
