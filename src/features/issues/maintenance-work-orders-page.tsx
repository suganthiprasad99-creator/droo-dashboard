'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowUpRight, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, Eye, Funnel, MoreHorizontal, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react'
import { deleteDashboardState, listDashboardState, putDashboardState } from '@/lib/dashboard-state'

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
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const stored = await listDashboardState<WorkOrder>('maintenance-work-orders')
      setRows(stored.map(entry => {
        const row = entry.value
        return { ...blank(), ...row, code: row.code || row.id, subject: row.subject || row.name || '', category: row.category || row.type || '' }
      }))
    } catch { setNotice('Unable to load work orders.') }
    finally { setLoading(false) }
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [])
  useEffect(() => { if (!guideOpen) return; const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')closeGuide()};window.addEventListener('keydown',closeOnEscape);return()=>window.removeEventListener('keydown',closeOnEscape) }, [guideOpen])

  function openGuide() { setGuideOpen(true); const url=new URL(window.location.href);url.searchParams.set('guide','open');window.history.replaceState({},'',url) }
  function closeGuide() { setGuideOpen(false); const url=new URL(window.location.href);url.searchParams.delete('guide');window.history.replaceState({},'',url) }

  const visible = useMemo(() => rows.filter(row => {
    const searchable = `${row.code} ${row.subject} ${row.category} ${row.status} ${row.priority} ${row.assignee}`.toLowerCase()
    return searchable.includes(search.toLowerCase()) && row.code.toLowerCase().includes(filters.code.toLowerCase()) && row.subject.toLowerCase().includes(filters.subject.toLowerCase()) && row.category.toLowerCase().includes(filters.category.toLowerCase()) && row.status.toLowerCase().includes(filters.status.toLowerCase()) && row.priority.toLowerCase().includes(filters.priority.toLowerCase()) && row.assignee.toLowerCase().includes(filters.assignee.toLowerCase()) && row.dueAt.includes(filters.dueAt) && row.created.toLowerCase().includes(filters.created.toLowerCase())
  }), [rows, search, filters])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!editor?.subject || !editor.category || !editor.status || !editor.priority) { setNotice('Complete the required work order fields.'); return }
    const id = editor.id || `work_order_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`
    const value = { ...editor, id, code: editor.code || id, created: editor.created || new Date().toISOString().slice(0, 16).replace('T', ' ') }
    try { await putDashboardState('maintenance-work-orders', id, value); setRows(items => [...items.filter(item => item.id !== id), value]); setEditor(null); setNotice(editor.id ? 'Work order updated.' : `Work order ${id} created.`) }
    catch { setNotice('Unable to save the work order.') }
  }
  const updateStatus = async (row: WorkOrder, status: string) => { const value = { ...row, status, closedAt: status === 'Completed' ? new Date().toISOString().slice(0, 10) : row.closedAt }; await putDashboardState('maintenance-work-orders', row.id, value); setRows(items => items.map(item => item.id === row.id ? value : item)); setMenu(null); setNotice(`Work order marked ${status.toLowerCase()}.`) }
  const remove = async () => { if (!deleting) return; try { await deleteDashboardState('maintenance-work-orders', deleting.id); setRows(items => items.filter(item => item.id !== deleting.id)); setSelected(items => items.filter(id => id !== deleting.id)); setDeleting(null); setNotice('Work order deleted.') } catch { setNotice('Unable to delete the work order.') } }
  const exportRows = () => { const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'maintenance-work-orders.json'; link.click(); URL.revokeObjectURL(url) }
  const importRows = async (file?: File) => { if (!file) return; try { const values = JSON.parse(await file.text()) as WorkOrder[]; await Promise.all(values.map(value => putDashboardState('maintenance-work-orders', value.id, value))); await load(); setNotice(`${values.length} work orders imported.`) } catch { setNotice('Import failed. Select a valid work orders JSON file.') } }

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

    {editor && <div className="schedule-editor-backdrop"><section className="schedule-editor" role="dialog" aria-modal="true" aria-label={viewOnly ? 'Work order details' : editor.id ? 'Edit work order' : 'Create new work order'}><header><div><h2>{viewOnly ? editor.subject : editor.id ? 'Edit work order' : 'Create new work order'}</h2><p>{viewOnly ? 'Review the work order details.' : 'Enter the work order details below.'}</p></div><button aria-label="Close work order form" onClick={() => setEditor(null)}><X /></button></header><form onSubmit={save}><div className="schedule-editor-body"><Section title="Identification" subtitle="Work Order Details"><label>Code<input disabled={viewOnly} value={editor.code} onChange={event => setEditor({ ...editor, code: event.target.value })} placeholder="Auto-generated if left blank" /></label><label>Subject<input disabled={viewOnly} required value={editor.subject} onChange={event => setEditor({ ...editor, subject: event.target.value })} placeholder="Brief description of the work order" /></label></Section><Section title="Work Order Classification"><label>Category<select disabled={viewOnly} required value={editor.category} onChange={event => setEditor({ ...editor, category: event.target.value })}><option value="">Select Category</option><option>Inspection</option><option>Service</option><option>Repair</option><option>Preventive Maintenance</option></select></label><label>Status<select disabled={viewOnly} required value={editor.status} onChange={event => setEditor({ ...editor, status: event.target.value })}><option value="">Select Status</option><option>Open</option><option>In Progress</option><option>On Hold</option><option>Completed</option><option>Cancelled</option></select></label><label>Priority<select disabled={viewOnly} required value={editor.priority} onChange={event => setEditor({ ...editor, priority: event.target.value })}><option value="">Select Priority</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label></Section><Section title="Assignment" subtitle="Target Asset"><label>Target Type<select disabled={viewOnly} value={editor.targetType} onChange={event => setEditor({ ...editor, targetType: event.target.value, target: '' })}><option value="">Select target type</option><option>Vehicle</option><option>Equipment</option></select></label><label>Target<input disabled={viewOnly} value={editor.target} onChange={event => setEditor({ ...editor, target: event.target.value })} placeholder="Select target asset" /></label><label>Assignee Type<select disabled={viewOnly} value={editor.assigneeType} onChange={event => setEditor({ ...editor, assigneeType: event.target.value })}><option value="">Select assignee type</option><option>Person</option><option>Vendor</option><option>Team</option></select></label><label>Assignee<input disabled={viewOnly} value={editor.assignee} onChange={event => setEditor({ ...editor, assignee: event.target.value })} placeholder="Select assignee" /></label></Section><Section title="Scheduling" subtitle="Dates"><label>Opened At<input disabled={viewOnly} type="date" value={editor.openedAt} onChange={event => setEditor({ ...editor, openedAt: event.target.value })} /></label><label>Due At<input disabled={viewOnly} type="date" value={editor.dueAt} onChange={event => setEditor({ ...editor, dueAt: event.target.value })} /></label><label>Closed At<input disabled={viewOnly} type="date" value={editor.closedAt} onChange={event => setEditor({ ...editor, closedAt: event.target.value })} /></label></Section><Section title="Instructions"><label className="wide">Instructions<textarea disabled={viewOnly} value={editor.instructions} onChange={event => setEditor({ ...editor, instructions: event.target.value })} placeholder="Step-by-step instructions for the technician" /></label></Section><section className="work-order-metadata-section"><h3>Metadata</h3><WorkOrderMetadata key={editor.id || 'new'} value={editor.metadata} disabled={viewOnly} onChange={metadata => setEditor(current => current ? { ...current, metadata } : current)} /></section></div><footer><button type="button" onClick={() => setEditor(null)}>{viewOnly ? 'Close' : 'Cancel'}</button>{!viewOnly && <button className="primary" type="submit">{editor.id ? 'Save Changes' : 'Create Work Order'}</button>}</footer></form></section></div>}
    {deleting && <div className="vehicle-delete-backdrop" onMouseDown={event => event.target === event.currentTarget && setDeleting(null)}><section className="vehicle-delete-dialog" role="alertdialog" aria-modal="true"><div className="vehicle-delete-content"><span className="vehicle-delete-warning"><AlertTriangle /></span><div><h2>Delete Work Order ({deleting.code})?</h2><p>This action cannot be undone. Once deleted, the record will be permanently removed.</p></div></div><footer><button onClick={() => setDeleting(null)}><X />Cancel</button><button className="danger" onClick={() => void remove()}><Trash2 />Confirm Delete</button></footer></section></div>}
  </div>
}

const workOrderAttributes = [
  ['Code','Auto-generated reference code (for example, WO-00123)'],['Subject','Title of the maintenance or repair task'],['Target','The vehicle, driver, or equipment the work is performed on'],['Assignee','Person, vendor, or team responsible for the task'],['Priority','Low, medium, high, or urgent'],['Status','Current stage in the work-order workflow'],['Opened At','When the work order was created'],['Due At','Deadline for completion'],['Closed At','When the work order was completed and closed'],['Instructions','Detailed task instructions'],['Checklist','Structured list of sub-tasks to complete'],['Estimated Cost','Pre-work cost estimate'],['Approved Budget','Authorized spend amount'],['Actual Cost','Recorded cost after completion'],['Currency','Currency used for all cost fields'],['Cost Center','Budget code or department for accounting'],
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
