'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, CarFront, Check, ChevronDown, CircleDollarSign,
  Code2, CreditCard, FolderOpen, ImagePlus, Info, Layers3, Map, MapPin, Plus, Route,
  Save, Send, Settings2, SlidersHorizontal, Trash2, Upload, UsersRound, Workflow, type LucideIcon,
} from 'lucide-react'
import { listDashboardState, putDashboardState } from '@/lib/dashboard-state'

const sections = ['hub', 'navigator-app', 'map', 'payments', 'notifications', 'routing', 'orchestrator', 'scheduling', 'custom-fields', 'avatars'] as const
type Section = typeof sections[number]
type Entity = 'Driver' | 'Vehicle' | 'Contact' | 'Vendor' | 'Place' | 'Entity' | 'Fleet' | 'Issue' | 'Fuel Report'
type FieldGroup = { id: string; name: string; entity: Entity }

type SettingsState = {
  navigator: { orderConfig: string; editEntity: boolean; onboard: boolean }
  map: { provider: string; type: string; traffic: boolean; transit: boolean; cluster: boolean }
  payments: { provider: string; currency: string; collectOnDelivery: boolean; autoInvoice: boolean; tips: boolean }
  notifications: { dispatch: boolean; driver: boolean; customer: boolean; email: boolean; sms: boolean; delay: string }
  routing: { service: string; optimization: string; unit: string; tracking: string; fallbacks: string[]; late: boolean; lateGrace: string; deviations: boolean; threshold: string; stoppages: boolean; stoppageDuration: string }
  orchestrator: { engine: string; autoAllocate: boolean; reallocate: boolean; maxTravel: string; balance: boolean; cardFields: string[] }
  scheduling: { horizon: string; shiftDuration: string; dailyLimit: string; weeklyLimit: string; autoActivate: boolean; notifyDrivers: boolean; templates: string[] }
  customFields: FieldGroup[]
  avatars: Record<'Vehicles' | 'Places' | 'Drivers', string[]>
}

const defaults: SettingsState = {
  navigator: { orderConfig: 'Transport', editEntity: false, onboard: false },
  map: { provider: 'Leaflet', type: 'Roadmap', traffic: false, transit: false, cluster: true },
  payments: { provider: 'Manual', currency: 'INR', collectOnDelivery: true, autoInvoice: false, tips: false },
  notifications: { dispatch: true, driver: true, customer: true, email: true, sms: false, delay: '5' },
  routing: { service: 'OSRM', optimization: 'OSRM', unit: 'Kilometers', tracking: 'Google Routes', fallbacks: ['OSRM', 'Calculated'], late: true, lateGrace: '15', deviations: true, threshold: '500', stoppages: true, stoppageDuration: '30' },
  orchestrator: { engine: 'VROOM', autoAllocate: false, reallocate: false, maxTravel: '3600', balance: false, cardFields: ['Tracking Number', 'Scheduled At', 'Status', 'Customer', 'Dropoff'] },
  scheduling: { horizon: '60', shiftDuration: '8', dailyLimit: '11', weeklyLimit: '70', autoActivate: true, notifyDrivers: false, templates: [] },
  customFields: [], avatars: { Vehicles: [], Places: [], Drivers: [] },
}

const sectionMeta: Record<Exclude<Section, 'hub'>, { title: string; icon: LucideIcon }> = {
  'navigator-app': { title: 'Navigator App Settings', icon: Send }, map: { title: 'Fleet-Ops Map Settings', icon: Map },
  payments: { title: 'Payment Settings', icon: CreditCard }, notifications: { title: 'Notification Settings', icon: Bell },
  routing: { title: 'Fleet-Ops Routing & Tracking', icon: Route }, orchestrator: { title: 'Orchestrator Settings', icon: Workflow },
  scheduling: { title: 'Scheduling Settings', icon: CalendarDays }, 'custom-fields': { title: 'Custom Fields', icon: SlidersHorizontal },
  avatars: { title: 'Avatar Management', icon: ImagePlus },
}

type HubItem = readonly [string, string, Exclude<Section, 'hub'>, LucideIcon]
const hubGroups: readonly { title: string; description: string; items: readonly HubItem[] }[] = [
  { title: 'Driver And Map Experience', description: 'Tune what dispatchers and drivers see while work is moving.', items: [['Navigator App', 'Driver app behavior and workflow defaults.', 'navigator-app', Send], ['Map', 'Map providers, defaults, and display behavior.', 'map', Map]] },
  { title: 'Dispatch Automation', description: 'Shape route planning, assignment, and scheduling behavior.', items: [['Routing', 'Routing engines and routing defaults.', 'routing', Route], ['Orchestrator', 'Dispatch orchestration and assignment behavior.', 'orchestrator', Workflow], ['Scheduling', 'Schedule planning and operational timing rules.', 'scheduling', CalendarDays]] },
  { title: 'Business And Data', description: 'Keep commerce, metadata, and visual conventions aligned.', items: [['Payments', 'Payment setup for operational commerce workflows.', 'payments', CreditCard], ['Custom Fields', 'Operational metadata fields for Fleet-Ops records.', 'custom-fields', SlidersHorizontal], ['Avatars', 'Visual assets for driver, vehicle, and map displays.', 'avatars', ImagePlus]] },
  { title: 'Communication', description: 'Control operational alerts and notification behavior.', items: [['Notifications', 'Operational status alerts and notification rules.', 'notifications', Bell]] },
]

function mergeSettings(saved: Partial<SettingsState>): SettingsState {
  return {
    navigator: { ...defaults.navigator, ...saved.navigator }, map: { ...defaults.map, ...saved.map },
    payments: { ...defaults.payments, ...saved.payments }, notifications: { ...defaults.notifications, ...saved.notifications },
    routing: { ...defaults.routing, ...saved.routing }, orchestrator: { ...defaults.orchestrator, ...saved.orchestrator },
    scheduling: { ...defaults.scheduling, ...saved.scheduling }, customFields: saved.customFields || [],
    avatars: { ...defaults.avatars, ...saved.avatars },
  }
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return <div className="fleet-setting-toggle"><button type="button" role="switch" aria-checked={checked} className={checked ? 'on' : ''} onClick={() => onChange(!checked)}><i /></button><span><strong>{label}</strong>{description && <small>{description}</small>}</span></div>
}

function Panel({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return <section className="fleet-settings-panel"><header><button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}><strong>{title}</strong><ChevronDown className={open ? '' : 'closed'} /></button>{actions}</header>{open && <div className="fleet-settings-panel-body">{children}</div>}</section>
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="fleet-setting-field"><span>{label} <Info /></span><select value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select></label>
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="fleet-setting-field"><span>{label} <Info /></span><input type="number" min="0" value={value} onChange={event => onChange(event.target.value)} /></label>
}

export function FleetSettingsPage({ section }: { section: string }) {
  const current: Section = sections.includes(section as Section) ? section as Section : 'hub'
  const [settings, setSettings] = useState<SettingsState>(defaults)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [entity, setEntity] = useState<Entity>('Driver')
  const [avatarType, setAvatarType] = useState<'Vehicles' | 'Places' | 'Drivers'>('Vehicles')
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  useEffect(() => {
    let cancelled = false
    const local = localStorage.getItem('droo.fleet-settings.v1')
    if (local) Promise.resolve(local).then(value => {
      if (cancelled) return
      try { setSettings(mergeSettings(JSON.parse(value))) } catch {}
    })
    listDashboardState<SettingsState>('fleet-settings').then(entries => {
      const remote = entries.find(entry => entry.key === 'configuration')?.value
      if (!cancelled && remote) setSettings(mergeSettings(remote))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true); setNotice('')
    localStorage.setItem('droo.fleet-settings.v1', JSON.stringify(settings))
    try { await putDashboardState('fleet-settings', 'configuration', settings); setNotice('Settings saved successfully.') }
    catch { setNotice('Settings saved on this device. Server sync is currently unavailable.') }
    finally { setSaving(false) }
  }

  function persistImmediate(next: SettingsState, message: string) {
    setSettings(next)
    localStorage.setItem('droo.fleet-settings.v1', JSON.stringify(next))
    void putDashboardState('fleet-settings', 'configuration', next).catch(() => {})
    setNotice(message)
  }

  function addGroup(event: FormEvent) {
    event.preventDefault()
    const name = newGroupName.trim()
    if (!name) return
    persistImmediate({ ...settings, customFields: [...settings.customFields, { id: crypto.randomUUID(), name, entity }] }, 'Field group created.')
    setNewGroupName(''); setNewGroupOpen(false)
  }

  const groups = useMemo(() => settings.customFields.filter(group => group.entity === entity), [entity, settings.customFields])
  const meta = current === 'hub' ? null : sectionMeta[current]

  return <div className="fleet-settings-page">
    {current === 'hub' ? <header className="fleet-settings-hero app-page-header"><div><span>SETTINGS</span><h1>Fleet-Ops Settings</h1><p>Configure the operator, driver, routing, notification, and data rules that shape Fleet-Ops workflows.</p></div></header>
      : <header className="fleet-settings-header app-page-header"><div>{meta && <meta.icon />}<h1>{meta?.title}</h1></div>{!['custom-fields', 'avatars'].includes(current) && <button className="fleet-save" onClick={save} disabled={saving}><Save />{saving ? 'Saving…' : 'Save Changes'}</button>}</header>}
    {notice && <div className="fleet-settings-notice" role="status"><Check />{notice}<button onClick={() => setNotice('')}>×</button></div>}

    {current === 'hub' && <div className="fleet-settings-hub"><div className="fleet-settings-groups">{hubGroups.map(group => <section className="fleet-hub-group" key={group.title}><header><h2>{group.title}</h2><p>{group.description}</p></header><div>{group.items.map(([label, description, href, Icon]) => <Link key={label} href={`/fleet-ops/settings/${href}`}><i><Icon /></i><span><strong>{label}</strong><small>{description}</small></span><ArrowRight /></Link>)}</div></section>)}</div><aside className="fleet-settings-aside"><section><h2>Setup Focus</h2><p>Compact next steps for operators.</p><article><Send /><strong>Start with driver experience</strong><span>Navigator App and Map settings should be reviewed before live dispatch.</span></article><article className="amber"><Route /><strong>Review automation rules</strong><span>Routing, orchestration, and scheduling affect assignment behavior.</span></article><article className="green"><SlidersHorizontal /><strong>Keep forms focused</strong><span>Add custom fields after core workflows are stable.</span></article></section><section className="fleet-guides"><strong>GUIDES</strong><span>Read the guide before changing settings.</span>{hubGroups.flatMap(group => group.items).map(([label, description, href, Icon]) => <Link key={label} href={`/fleet-ops/settings/${href}`}><Icon /><span><b>Read the guide on {label}</b><small>{description}</small></span></Link>)}</section></aside></div>}

    {current === 'navigator-app' && <div className="fleet-settings-form narrow"><Panel title="ENTITY FIELD EDITING SETTINGS"><SelectField label="Select Order Config" value={settings.navigator.orderConfig} options={['Transport', 'Same-day Grocery', 'Pharmacy Express']} onChange={orderConfig => setSettings(value => ({ ...value, navigator: { ...value.navigator, orderConfig } }))} /><Toggle label="Allow driver to edit entity details" checked={settings.navigator.editEntity} onChange={editEntity => setSettings(value => ({ ...value, navigator: { ...value.navigator, editEntity } }))} /></Panel><Panel title="DRIVER ONBOARD SETTINGS"><Toggle label="Enable driver onboard from Navigator App" checked={settings.navigator.onboard} onChange={onboard => setSettings(value => ({ ...value, navigator: { ...value.navigator, onboard } }))} /></Panel></div>}

    {current === 'map' && <div className="fleet-settings-form narrow"><Panel title="CONFIGURE MAP"><SelectField label="Map Provider" value={settings.map.provider} options={['Leaflet', 'Google Maps', 'Mapbox']} onChange={provider => setSettings(value => ({ ...value, map: { ...value.map, provider } }))} />{settings.map.provider !== 'Leaflet' && <SelectField label="Map Type" value={settings.map.type} options={['Roadmap', 'Satellite', 'Terrain', 'Hybrid']} onChange={type => setSettings(value => ({ ...value, map: { ...value.map, type } }))} />}<Toggle label="Show Traffic Layer" checked={settings.map.traffic} onChange={traffic => setSettings(value => ({ ...value, map: { ...value.map, traffic } }))} /><Toggle label="Show Transit Layer" checked={settings.map.transit} onChange={transit => setSettings(value => ({ ...value, map: { ...value.map, transit } }))} /><Toggle label="Cluster nearby vehicle markers" checked={settings.map.cluster} onChange={cluster => setSettings(value => ({ ...value, map: { ...value.map, cluster } }))} /></Panel></div>}

    {current === 'payments' && <div className="fleet-settings-form narrow"><Panel title="PAYMENT PROVIDER"><SelectField label="Provider" value={settings.payments.provider} options={['Manual', 'Stripe', 'Razorpay', 'Cashfree']} onChange={provider => setSettings(value => ({ ...value, payments: { ...value.payments, provider } }))} /><SelectField label="Settlement Currency" value={settings.payments.currency} options={['INR', 'USD', 'SGD', 'EUR']} onChange={currency => setSettings(value => ({ ...value, payments: { ...value.payments, currency } }))} /></Panel><Panel title="ORDER PAYMENT BEHAVIOUR"><Toggle label="Allow collection on delivery" checked={settings.payments.collectOnDelivery} onChange={collectOnDelivery => setSettings(value => ({ ...value, payments: { ...value.payments, collectOnDelivery } }))} /><Toggle label="Automatically create invoices" checked={settings.payments.autoInvoice} onChange={autoInvoice => setSettings(value => ({ ...value, payments: { ...value.payments, autoInvoice } }))} /><Toggle label="Allow driver tips" checked={settings.payments.tips} onChange={tips => setSettings(value => ({ ...value, payments: { ...value.payments, tips } }))} /></Panel></div>}

    {current === 'notifications' && <div className="fleet-settings-form narrow"><Panel title="OPERATIONAL NOTIFICATIONS"><Toggle label="Dispatcher alerts" description="Notify operators when assignment or route state changes." checked={settings.notifications.dispatch} onChange={dispatch => setSettings(value => ({ ...value, notifications: { ...value.notifications, dispatch } }))} /><Toggle label="Driver notifications" checked={settings.notifications.driver} onChange={driver => setSettings(value => ({ ...value, notifications: { ...value.notifications, driver } }))} /><Toggle label="Customer status updates" checked={settings.notifications.customer} onChange={customer => setSettings(value => ({ ...value, notifications: { ...value.notifications, customer } }))} /><NumberField label="Delay before exception alert (minutes)" value={settings.notifications.delay} onChange={delay => setSettings(value => ({ ...value, notifications: { ...value.notifications, delay } }))} /></Panel><Panel title="CHANNELS"><Toggle label="Email" checked={settings.notifications.email} onChange={email => setSettings(value => ({ ...value, notifications: { ...value.notifications, email } }))} /><Toggle label="SMS" checked={settings.notifications.sms} onChange={sms => setSettings(value => ({ ...value, notifications: { ...value.notifications, sms } }))} /></Panel></div>}

    {current === 'routing' && <div className="fleet-settings-form narrow"><Panel title="CONFIGURE ROUTING"><SelectField label="Routing Service" value={settings.routing.service} options={['OSRM', 'Google Routes', 'Mapbox Directions']} onChange={service => setSettings(value => ({ ...value, routing: { ...value.routing, service } }))} /><SelectField label="Routing Optimization Engine" value={settings.routing.optimization} options={['OSRM', 'VROOM', 'Google Routes']} onChange={optimization => setSettings(value => ({ ...value, routing: { ...value.routing, optimization } }))} /><SelectField label="Routing Distance Unit" value={settings.routing.unit} options={['Kilometers', 'Miles']} onChange={unit => setSettings(value => ({ ...value, routing: { ...value.routing, unit } }))} /></Panel><Panel title="TRACKING INTELLIGENCE"><SelectField label="Tracking Provider" value={settings.routing.tracking} options={['Google Routes', 'OSRM', 'Calculated']} onChange={tracking => setSettings(value => ({ ...value, routing: { ...value.routing, tracking } }))} /><div className="fleet-token-field"><span>Fallback Providers</span>{settings.routing.fallbacks.map(item => <b key={item}>× {item}</b>)}</div></Panel><Panel title="OPERATIONAL ALERTS"><Toggle label="Late Departures" checked={settings.routing.late} onChange={late => setSettings(value => ({ ...value, routing: { ...value.routing, late } }))} /><NumberField label="Late Departure Grace Period" value={settings.routing.lateGrace} onChange={lateGrace => setSettings(value => ({ ...value, routing: { ...value.routing, lateGrace } }))} /><Toggle label="Route Deviations" checked={settings.routing.deviations} onChange={deviations => setSettings(value => ({ ...value, routing: { ...value.routing, deviations } }))} /><NumberField label="Route Deviation Threshold" value={settings.routing.threshold} onChange={threshold => setSettings(value => ({ ...value, routing: { ...value.routing, threshold } }))} /><Toggle label="Prolonged Stoppages" checked={settings.routing.stoppages} onChange={stoppages => setSettings(value => ({ ...value, routing: { ...value.routing, stoppages } }))} /><NumberField label="Prolonged Stoppage Duration" value={settings.routing.stoppageDuration} onChange={stoppageDuration => setSettings(value => ({ ...value, routing: { ...value.routing, stoppageDuration } }))} /></Panel></div>}

    {current === 'orchestrator' && <div className="fleet-settings-form narrow"><Panel title="ALLOCATION ENGINE"><SelectField label="Active Allocation Engine" value={settings.orchestrator.engine} options={['VROOM', 'OSRM', 'Manual']} onChange={engine => setSettings(value => ({ ...value, orchestrator: { ...value.orchestrator, engine } }))} /><Toggle label="Auto-Allocate on Order Creation" description="Automatically run allocation when a new order is created." checked={settings.orchestrator.autoAllocate} onChange={autoAllocate => setSettings(value => ({ ...value, orchestrator: { ...value.orchestrator, autoAllocate } }))} /><Toggle label="Auto Re-Allocate on Delivery Completion" description="Re-run allocation when a delivery is completed." checked={settings.orchestrator.reallocate} onChange={reallocate => setSettings(value => ({ ...value, orchestrator: { ...value.orchestrator, reallocate } }))} /></Panel><Panel title="ALLOCATION CONSTRAINTS"><NumberField label="Max Travel Time (seconds)" value={settings.orchestrator.maxTravel} onChange={maxTravel => setSettings(value => ({ ...value, orchestrator: { ...value.orchestrator, maxTravel } }))} /><Toggle label="Balance Workload" description="Distribute orders evenly across available drivers and vehicles." checked={settings.orchestrator.balance} onChange={balance => setSettings(value => ({ ...value, orchestrator: { ...value.orchestrator, balance } }))} /></Panel><Panel title="CARD FIELDS"><p className="fleet-panel-copy">Configure which fields are displayed on order cards in the workbench.</p><div className="fleet-check-grid">{['Tracking Number', 'Scheduled At', 'Type', 'Priority', 'Pickup', 'Vehicle Assigned', 'Status', 'Customer', 'Notes', 'Dropoff', 'Driver Assigned', 'Created'].map(field => <label key={field}><input type="checkbox" checked={settings.orchestrator.cardFields.includes(field)} onChange={() => setSettings(value => ({ ...value, orchestrator: { ...value.orchestrator, cardFields: value.orchestrator.cardFields.includes(field) ? value.orchestrator.cardFields.filter(item => item !== field) : [...value.orchestrator.cardFields, field] } }))} />{field}</label>)}</div></Panel></div>}

    {current === 'scheduling' && <div className="fleet-settings-form narrow"><Panel title="MATERIALISATION"><NumberField label="Schedule Horizon (Days)" value={settings.scheduling.horizon} onChange={horizon => setSettings(value => ({ ...value, scheduling: { ...value.scheduling, horizon } }))} /><NumberField label="Default Shift Duration (Hours)" value={settings.scheduling.shiftDuration} onChange={shiftDuration => setSettings(value => ({ ...value, scheduling: { ...value.scheduling, shiftDuration } }))} /></Panel><Panel title="HOURS OF SERVICE LIMITS"><NumberField label="Daily Driving Limit (Hours)" value={settings.scheduling.dailyLimit} onChange={dailyLimit => setSettings(value => ({ ...value, scheduling: { ...value.scheduling, dailyLimit } }))} /><NumberField label="Weekly Driving Limit (Hours)" value={settings.scheduling.weeklyLimit} onChange={weeklyLimit => setSettings(value => ({ ...value, scheduling: { ...value.scheduling, weeklyLimit } }))} /></Panel><Panel title="BEHAVIOUR"><Toggle label="Auto-Activate Schedule" checked={settings.scheduling.autoActivate} onChange={autoActivate => setSettings(value => ({ ...value, scheduling: { ...value.scheduling, autoActivate } }))} /><Toggle label="Notify Drivers on Shift Changes" checked={settings.scheduling.notifyDrivers} onChange={notifyDrivers => setSettings(value => ({ ...value, scheduling: { ...value.scheduling, notifyDrivers } }))} /></Panel><Panel title="REUSABLE SCHEDULE TEMPLATES" actions={<button className="fleet-small-action" onClick={() => setSettings(value => ({ ...value, scheduling: { ...value.scheduling, templates: [...value.scheduling.templates, `Template ${value.scheduling.templates.length + 1}`] } }))}><Plus />New Template</button>}>{settings.scheduling.templates.length ? <div className="fleet-template-list">{settings.scheduling.templates.map((template, index) => <div key={`${template}-${index}`}><CalendarDays />{template}<button onClick={() => setSettings(value => ({ ...value, scheduling: { ...value.scheduling, templates: value.scheduling.templates.filter((_, itemIndex) => itemIndex !== index) } }))}><Trash2 /></button></div>)}</div> : <div className="fleet-empty">No reusable templates have been created yet.</div>}</Panel></div>}

    {current === 'custom-fields' && <div className="fleet-settings-form narrow custom"><section className="fleet-custom-manager"><header><h2>Custom Fields Manager</h2></header><nav>{(['Driver', 'Vehicle', 'Contact', 'Vendor', 'Place', 'Entity', 'Fleet', 'Issue', 'Fuel Report'] as Entity[]).map(item => <button key={item} className={entity === item ? 'active' : ''} onClick={() => setEntity(item)}>{item}</button>)}</nav><div className="fleet-custom-actions"><button className="fleet-save" onClick={() => setNewGroupOpen(true)}><Plus />New field group</button></div>{groups.length ? <div className="fleet-field-groups">{groups.map(group => <article key={group.id}><Layers3 /><strong>{group.name}</strong><small>{group.entity} fields</small><button onClick={() => persistImmediate({ ...settings, customFields: settings.customFields.filter(item => item.id !== group.id) }, 'Field group removed.')}><Trash2 /></button></article>)}</div> : <div className="fleet-custom-empty"><Layers3 /><strong>No custom field groups</strong><span>Add your first field group to start adding custom fields for {entity}s</span></div>}</section></div>}

    {current === 'avatars' && <div className="fleet-settings-form narrow avatars"><section className="fleet-avatar-manager"><nav>{(['Vehicles', 'Places', 'Drivers'] as const).map(item => <button key={item} className={avatarType === item ? 'active' : ''} onClick={() => setAvatarType(item)}>{item === 'Vehicles' ? <CarFront /> : item === 'Places' ? <MapPin /> : <UsersRound />}{item}</button>)}</nav><div className="fleet-avatar-upload"><FolderOpen /><h2>Upload Custom Avatars</h2><p>Drag and drop SVG or PNG files</p><label><Upload />Select files to upload<input type="file" accept="image/png,image/svg+xml" multiple onChange={event => { const names = Array.from(event.target.files || []).map(file => file.name); persistImmediate({ ...settings, avatars: { ...settings.avatars, [avatarType]: [...settings.avatars[avatarType], ...names] } }, `${names.length} avatar${names.length === 1 ? '' : 's'} added.`); event.currentTarget.value = '' }} /></label>{settings.avatars[avatarType].length > 0 && <div className="fleet-avatar-files">{settings.avatars[avatarType].map((name, index) => <span key={`${name}-${index}`}>{name}<button onClick={() => persistImmediate({ ...settings, avatars: { ...settings.avatars, [avatarType]: settings.avatars[avatarType].filter((_, itemIndex) => itemIndex !== index) } }, 'Avatar removed.')}>×</button></span>)}</div>}</div></section></div>}

    {newGroupOpen && <div className="fleet-settings-modal" onMouseDown={event => { if (event.target === event.currentTarget) setNewGroupOpen(false) }}><form onSubmit={addGroup}><header><h2>New {entity} field group</h2></header><label><span>Group name</span><input autoFocus value={newGroupName} onChange={event => setNewGroupName(event.target.value)} placeholder="e.g. Compliance details" /></label><footer><button type="button" onClick={() => setNewGroupOpen(false)}>Cancel</button><button className="fleet-save" type="submit"><Plus />Create group</button></footer></form></div>}
  </div>
}
