'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle, Archive, ArrowRight, Boxes, Check, ChevronDown, Copy, GitBranch, GripVertical,
  Layers3, LockKeyhole, Package, Plus, Save, Send, Settings2, Tag, Trash2, X,
} from 'lucide-react'

type ConfigTab = 'details' | 'fields' | 'flow' | 'entities'
type FlowStep = {
  key: string; code: string; status: string; details: string; color: string; complete: boolean
  require_pod: boolean; pod_method: string; activities: string[]; events: string[]; actions: unknown[]
  logic: unknown[]; options: unknown[]; entities: unknown[]; sequence: number; internalId: string
}
type CustomField = { id: string; label: string; key: string; type: 'text' | 'number' | 'date' | 'select' | 'checkbox'; required: boolean; options?: string[] }
type FieldGroup = { id: string; name: string; description: string; fields: CustomField[] }
type CustomEntity = { id: string; name: string; type: string; description: string; width: string; height: string; length: string; weight: string; dimensions_unit: string; weight_unit: string; photo_url?: string }
type OrderConfig = {
  id?: number; uuid: string; public_id?: string; name: string; namespace: string; description: string; key: string
  status: 'private' | 'published' | 'draft'; version: string; core_service: boolean; tags: string[]
  flow: Record<string, FlowStep>; entities: CustomEntity[]; meta: FieldGroup[]; created_at?: string; updated_at?: string
}

const CONFIG_ID = '533e2537-7e6f-4ada-a650-3fbf11cb9fb1'
const newId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
const makeStep = (code: string, status: string, details: string, activities: string[] = [], complete = false): FlowStep => ({
  key: code, code, color: '#1f2937', logic: [], events: [], status, actions: [], details, options: [], complete,
  entities: [], sequence: 0, activities, internalId: newId(), pod_method: 'scan', require_pod: false,
})
const demoConfig: OrderConfig = {
  id: 1, uuid: CONFIG_ID, public_id: 'order_config_vixn05hdr6', name: 'Transport', namespace: 'fleet-ops',
  description: 'Standard transport and delivery order', key: 'transport', status: 'published', version: '1.0.0', core_service: true,
  tags: ['transport', 'delivery'], meta: [], entities: [],
  flow: {
    created: makeStep('created', 'Order Created', 'New order was created.', ['dispatched']),
    dispatched: makeStep('dispatched', 'Order Dispatched', 'Order has been dispatched.', ['started']),
    started: makeStep('started', 'Order Started', 'Order has been started.', ['enroute']),
    enroute: makeStep('enroute', 'Driver Enroute', 'Driver is en-route.', ['completed']),
    completed: makeStep('completed', 'Order Completed', 'Order has been completed.', [], true),
  },
}

const groceryConfig: OrderConfig = {
  id: 2, uuid: '86b9f552-65f2-47a5-8774-9292f12f91c1', public_id: 'order_config_grocery_local',
  name: 'Same-day Grocery', namespace: 'retail-ops', description: 'Same-day grocery fulfilment with picking, cold-chain handling and customer OTP delivery.',
  key: 'same-day-grocery', status: 'published', version: '1.2.0', core_service: false,
  tags: ['grocery', 'same-day', 'otp'],
  meta: [
    { id: 'grp_grocery_customer', name: 'Customer preferences', description: 'Delivery and substitution choices captured at checkout.', fields: [
      { id: 'fld_substitution', label: 'Allow substitutions', key: 'allow_substitutions', type: 'checkbox', required: true },
      { id: 'fld_delivery_slot', label: 'Delivery slot', key: 'delivery_slot', type: 'select', required: true, options: ['09:00–12:00', '12:00–15:00', '15:00–18:00', '18:00–21:00'] },
      { id: 'fld_instructions', label: 'Delivery instructions', key: 'delivery_instructions', type: 'text', required: false },
    ] },
    { id: 'grp_grocery_compliance', name: 'Handling requirements', description: 'Operational controls for sensitive grocery orders.', fields: [
      { id: 'fld_age_check', label: 'Age verification required', key: 'age_verification_required', type: 'checkbox', required: true },
      { id: 'fld_max_temperature', label: 'Maximum temperature', key: 'maximum_temperature', type: 'number', required: false },
    ] },
  ],
  entities: [
    { id: 'ent_grocery_crate', name: 'Grocery crate', type: 'grocery-crate', description: 'Reusable crate for ambient grocery items.', length: '60', width: '40', height: '32', weight: '20', dimensions_unit: 'cm', weight_unit: 'kg' },
    { id: 'ent_chilled_bag', name: 'Chilled bag', type: 'chilled-bag', description: 'Insulated bag for dairy, frozen and temperature-sensitive goods.', length: '45', width: '35', height: '35', weight: '12', dimensions_unit: 'cm', weight_unit: 'kg' },
  ],
  flow: {
    created: makeStep('created', 'Order Created', 'The customer order has been accepted.', ['picking']),
    picking: makeStep('picking', 'Picking Items', 'Store staff are collecting the requested products.', ['packed']),
    packed: makeStep('packed', 'Ready for Dispatch', 'Items are packed and ready for driver collection.', ['dispatched']),
    dispatched: makeStep('dispatched', 'Out for Delivery', 'The order is travelling to the customer.', ['delivered']),
    delivered: { ...makeStep('delivered', 'Delivered', 'Customer received the order after OTP verification.', [], true), require_pod: true, pod_method: 'otp' },
  },
}

const pharmacyConfig: OrderConfig = {
  id: 3, uuid: 'dd8731c5-da97-4cff-b5ed-58cf7db82cdf', public_id: 'order_config_pharmacy_local',
  name: 'Pharmacy Express', namespace: 'health-ops', description: 'Priority medicine delivery with prescription checks, tamper-safe packaging and recipient signature.',
  key: 'pharmacy-express', status: 'private', version: '1.0.0', core_service: false,
  tags: ['pharmacy', 'priority', 'signature'],
  meta: [
    { id: 'grp_pharmacy_prescription', name: 'Prescription details', description: 'Information required to validate and dispense prescribed medicine.', fields: [
      { id: 'fld_prescription_ref', label: 'Prescription reference', key: 'prescription_reference', type: 'text', required: true },
      { id: 'fld_prescriber', label: 'Prescriber name', key: 'prescriber_name', type: 'text', required: true },
      { id: 'fld_prescription_date', label: 'Prescription date', key: 'prescription_date', type: 'date', required: true },
    ] },
    { id: 'grp_pharmacy_delivery', name: 'Delivery controls', description: 'Recipient and storage checks performed at delivery.', fields: [
      { id: 'fld_recipient_age', label: 'Minimum recipient age', key: 'minimum_recipient_age', type: 'number', required: true },
      { id: 'fld_refrigeration', label: 'Refrigeration required', key: 'refrigeration_required', type: 'checkbox', required: true },
    ] },
  ],
  entities: [
    { id: 'ent_medicine_pouch', name: 'Tamper-safe medicine pouch', type: 'medicine-pouch', description: 'Sealed pouch used for standard prescription medicine.', length: '30', width: '22', height: '8', weight: '2', dimensions_unit: 'cm', weight_unit: 'kg' },
    { id: 'ent_cold_box', name: 'Medical cold box', type: 'medical-cold-box', description: 'Temperature-controlled container for refrigerated medicine.', length: '40', width: '30', height: '30', weight: '8', dimensions_unit: 'cm', weight_unit: 'kg' },
  ],
  flow: {
    created: makeStep('created', 'Order Created', 'The pharmacy delivery request was received.', ['verification']),
    verification: makeStep('verification', 'Prescription Review', 'A pharmacist is validating the prescription.', ['packing']),
    packing: makeStep('packing', 'Packing Medicine', 'Approved items are being packed and sealed.', ['collected']),
    collected: makeStep('collected', 'Collected by Driver', 'The driver collected the sealed package.', ['enroute']),
    enroute: makeStep('enroute', 'Driver Enroute', 'The driver is travelling to the recipient.', ['delivered']),
    delivered: { ...makeStep('delivered', 'Delivered', 'The recipient signed for the medicine.', [], true), require_pod: true, pod_method: 'signature' },
  },
}

const seededConfigs = [groceryConfig, pharmacyConfig]
const isArchivedLocally = (uuid: string) => typeof window !== 'undefined' && localStorage.getItem(`droo.order-config.archived.${uuid}`) !== null
const activeSeededConfigs = () => seededConfigs.filter(item => !isArchivedLocally(item.uuid))

const tabs: { id: ConfigTab; label: string; description: string; icon: typeof Settings2 }[] = [
  { id: 'details', label: 'Details', description: 'Identity and publishing', icon: Settings2 },
  { id: 'fields', label: 'Custom Fields', description: 'Order data requirements', icon: Layers3 },
  { id: 'flow', label: 'Activity Flow', description: 'Statuses and transitions', icon: GitBranch },
  { id: 'entities', label: 'Entities', description: 'Packages and resources', icon: Boxes },
]

function normalizeConfig(value: Partial<OrderConfig>): OrderConfig {
  return { ...demoConfig, ...value, uuid: value.uuid || newId(), tags: Array.isArray(value.tags) ? value.tags : [], meta: Array.isArray(value.meta) ? value.meta : [], entities: Array.isArray(value.entities) ? value.entities : [], flow: value.flow && typeof value.flow === 'object' ? value.flow : {} }
}

function validateConfig(config: OrderConfig): { message: string; tab: ConfigTab }[] {
  const problems: { message: string; tab: ConfigTab }[] = []
  if (!config.name.trim()) problems.push({ message: 'Name is required.', tab: 'details' })
  if (!config.key.trim()) problems.push({ message: 'Key is required.', tab: 'details' })
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.key)) problems.push({ message: 'Key must use lowercase letters, numbers, and hyphens.', tab: 'details' })
  if (!config.namespace.trim()) problems.push({ message: 'Namespace is required.', tab: 'details' })
  if (!/^\d+\.\d+\.\d+$/.test(config.version)) problems.push({ message: 'Version must use semantic versioning, for example 1.0.0.', tab: 'details' })
  if (!Object.keys(config.flow).length) problems.push({ message: 'At least one activity is required.', tab: 'flow' })
  return problems
}

async function requestConfigs(): Promise<OrderConfig[]> {
  const response = await fetch('/int/v1/order-configs', { credentials: 'include', cache: 'no-store' })
  if (!response.ok) throw new Error(`Unable to load configurations (${response.status})`)
  const data = await response.json()
  const rows: Partial<OrderConfig>[] = Array.isArray(data) ? data : data.order_configs || data.data || []
  const seeds = activeSeededConfigs()
  const liveConfigs = rows.map(normalizeConfig).filter(item => !isArchivedLocally(item.uuid))
  return [...seeds, ...liveConfigs.filter(item => !seeds.some(seed => seed.uuid === item.uuid))]
}

export function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedId = searchParams.get('config')
  const initialConfig = seededConfigs.find(item => item.uuid === requestedId) || seededConfigs[0]
  const [configs, setConfigs] = useState<OrderConfig[]>(seededConfigs)
  const [selectedId, setSelectedId] = useState(initialConfig.uuid)
  const [draft, setDraft] = useState<OrderConfig>(initialConfig)
  const [tab, setTab] = useState<ConfigTab>('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [stepEditor, setStepEditor] = useState<FlowStep | null>(null)
  const [entityEditor, setEntityEditor] = useState<CustomEntity | null>(null)
  const [groupEditor, setGroupEditor] = useState<FieldGroup | null>(null)

  useEffect(() => {
    let cancelled = false
    requestConfigs().then(rows => {
      if (cancelled || !rows.length) return
      setConfigs(rows)
      const match = rows.find(item => item.uuid === (requestedId || CONFIG_ID)) || rows[0]
      setSelectedId(match.uuid); setDraft(match)
    }).catch(() => {
      const availableSeeds = activeSeededConfigs()
      const fallback = availableSeeds.find(item => item.uuid === requestedId) || availableSeeds[0] || seededConfigs[0]
      setConfigs(availableSeeds.length ? availableSeeds : [fallback]); setSelectedId(fallback.uuid); setDraft(fallback); setError('Live configuration service is unavailable. Changes will be kept in this browser until the service reconnects.')
    }).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [requestedId])

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    function warnBeforeInternalNavigation(event: MouseEvent) {
      if (!dirty || event.defaultPrevented || event.button !== 0) return
      const target = event.target as Element | null
      const link = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!link || link.target === '_blank' || link.origin !== window.location.origin || link.href === window.location.href) return
      if (!window.confirm('You have unsaved configuration changes. Leave this page and discard them?')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    document.addEventListener('click', warnBeforeInternalNavigation, true)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeLeaving)
      document.removeEventListener('click', warnBeforeInternalNavigation, true)
    }
  }, [dirty])

  const immutable = draft.core_service && draft.status === 'published'
  const flowSteps = useMemo(() => Object.values(draft.flow).sort((a, b) => a.sequence - b.sequence), [draft.flow])
  const update = useCallback((patch: Partial<OrderConfig>) => { setDraft(current => ({ ...current, ...patch })); setDirty(true); setError(''); setNotice('') }, [])

  function selectConfig(uuid: string) {
    if (dirty && !window.confirm('Discard unsaved changes and open another configuration?')) return
    const next = configs.find(item => item.uuid === uuid)
    if (!next) return
    setSelectedId(uuid); setDraft(next); setDirty(false); setError(''); setNotice(''); router.replace(`/order-config?config=${uuid}`, { scroll: false })
  }

  function createConfig() {
    if (dirty && !window.confirm('Discard unsaved changes and create a new configuration?')) return
    const uuid = newId()
    const next = normalizeConfig({ uuid, id: undefined, public_id: undefined, name: 'Untitled configuration', description: '', key: '', namespace: 'fleet-ops', status: 'draft', version: '0.1.0', core_service: false, tags: [], meta: [], entities: [], flow: { created: makeStep('created', 'Order Created', 'New order was created.') } })
    setConfigs(current => [...current, next]); setSelectedId(uuid); setDraft(next); setDirty(true); setTab('details'); setError(''); setNotice('')
  }

  function duplicateConfig() {
    if (dirty && !window.confirm('Discard unsaved changes and duplicate the last saved version?')) return
    const uuid = newId()
    const copy: OrderConfig = {
      ...draft, id: undefined, uuid, public_id: undefined, name: `${draft.name} copy`, key: `${draft.key || 'configuration'}-copy`,
      status: 'draft', core_service: false,
      tags: [...draft.tags],
      meta: draft.meta.map(group => ({ ...group, id: newId(), fields: group.fields.map(field => ({ ...field, id: newId(), options: field.options ? [...field.options] : undefined })) })),
      entities: draft.entities.map(entity => ({ ...entity, id: newId() })),
      flow: Object.fromEntries(Object.entries(draft.flow).map(([code, step]) => [code, { ...step, internalId: newId(), activities: [...step.activities], events: [...step.events], actions: [...step.actions], logic: [...step.logic], options: [...step.options], entities: [...step.entities] }])),
    }
    setConfigs(current => [...current, copy]); setSelectedId(uuid); setDraft(copy); setDirty(true); setTab('details'); setError(''); setNotice('Duplicated as a new draft. Review the key and save when ready.')
  }

  async function persist(config: OrderConfig, successMessage = 'Configuration saved successfully.') {
    setError(''); setNotice('')
    const problems = validateConfig(config)
    if (problems.length) { setError(problems.map(problem => problem.message).join(' ')); setTab(problems[0].tab); return false }
    setSaving(true)
    try {
      const endpoint = config.id ? `/int/v1/order-configs/${config.uuid}` : '/int/v1/order-configs'
      const response = await fetch(endpoint, { method: config.id ? 'PUT' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': newId() }, body: JSON.stringify(config) })
      if (!response.ok) throw new Error(`Save failed (${response.status})`)
      const body = response.status === 204 ? config : normalizeConfig(await response.json())
      setDraft(body); setSelectedId(body.uuid); setConfigs(current => current.map(item => item.uuid === config.uuid ? body : item)); setDirty(false); setNotice(successMessage)
    } catch {
      localStorage.setItem(`droo.order-config.${config.uuid}`, JSON.stringify(config))
      setDraft(config); setConfigs(current => current.map(item => item.uuid === config.uuid ? config : item)); setDirty(false); setNotice(`${successMessage} Stored locally until the live service reconnects.`)
    } finally { setSaving(false) }
    return true
  }

  async function save() {
    await persist(draft)
  }

  async function publishConfig() {
    if (draft.status === 'published') return
    if (!window.confirm('Publish this configuration? It will become available for new orders.')) return
    await persist({ ...draft, status: 'published' }, 'Configuration published successfully.')
  }

  async function archiveConfig() {
    if (!window.confirm(`Archive “${draft.name}”? It will be removed from the active configuration list.`)) return
    if (configs.length === 1) { setError('Create another configuration before archiving the only active configuration.'); return }
    setSaving(true); setError(''); setNotice('')
    if (draft.id) {
      try {
        const response = await fetch(`/int/v1/order-configs/${draft.uuid}`, { method: 'DELETE', credentials: 'include', headers: { 'Idempotency-Key': newId() } })
        if (!response.ok && response.status !== 404) throw new Error(`Archive failed (${response.status})`)
      } catch { /* The local archive marker below keeps the UI usable while offline. */ }
    }
    localStorage.setItem(`droo.order-config.archived.${draft.uuid}`, JSON.stringify(draft))
    const remaining = configs.filter(item => item.uuid !== draft.uuid)
    const next = remaining[0]
    setConfigs(remaining); setDraft(next); setSelectedId(next.uuid); setDirty(false); setSaving(false); setNotice('Configuration archived.')
    router.replace(`/order-config?config=${next.uuid}`, { scroll: false })
  }

  function addTag() {
    const value = tagInput.trim().toLowerCase()
    if (!value || draft.tags.includes(value)) return
    update({ tags: [...draft.tags, value] }); setTagInput('')
  }

  function saveStep(event: FormEvent) {
    event.preventDefault(); if (!stepEditor) return
    const code = stepEditor.code.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!code || !stepEditor.status.trim()) { setError('Activity code and status are required.'); return }
    const oldKey = Object.entries(draft.flow).find(([, value]) => value.internalId === stepEditor.internalId)?.[0]
    const next = { ...draft.flow }; if (oldKey && oldKey !== code) delete next[oldKey]
    next[code] = { ...stepEditor, key: code, code, activities: stepEditor.complete ? [] : stepEditor.activities.filter(Boolean) }
    update({ flow: next }); setStepEditor(null)
  }

  function deleteStep(code: string) {
    if (Object.keys(draft.flow).length === 1) { setError('An order configuration must have at least one activity.'); return }
    const next = { ...draft.flow }; delete next[code]
    Object.values(next).forEach(step => { step.activities = step.activities.filter(item => item !== code) })
    update({ flow: next })
  }

  function saveEntity(event: FormEvent) {
    event.preventDefault(); if (!entityEditor) return
    const entity = { ...entityEditor, type: entityEditor.type || entityEditor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
    update({ entities: draft.entities.some(item => item.id === entity.id) ? draft.entities.map(item => item.id === entity.id ? entity : item) : [...draft.entities, entity] }); setEntityEditor(null)
  }

  function saveGroup(event: FormEvent) {
    event.preventDefault(); if (!groupEditor) return
    update({ meta: draft.meta.some(item => item.id === groupEditor.id) ? draft.meta.map(item => item.id === groupEditor.id ? groupEditor : item) : [...draft.meta, groupEditor] }); setGroupEditor(null)
  }

  if (loading) return <div className="order-config-loading">Loading order configuration…</div>
  return <div className="order-config-page unified-config-page">
    <header className="unified-config-header">
      <div><span className="eyebrow">OPERATIONS / ORDER CONFIG</span><h1>Orders Configuration</h1><p>Define the data, lifecycle and entities shared by every order created with this configuration.</p></div>
      <div className="config-header-actions">
        <label className="config-picker"><span>Configuration</span><select aria-label="Configuration" value={selectedId} onChange={event => selectConfig(event.target.value)}>{configs.map(item => <option key={item.uuid} value={item.uuid}>{item.name}</option>)}</select><ChevronDown /></label>
        <button type="button" className="secondary" onClick={createConfig}><Plus />New config</button>
        <button type="button" className="secondary" onClick={duplicateConfig} disabled={saving}><Copy />Duplicate</button>
        <button type="button" className="secondary" onClick={archiveConfig} disabled={saving}><Archive />Archive</button>
        <button type="button" className="secondary" onClick={publishConfig} disabled={saving || draft.status === 'published'}><Send />{draft.status === 'published' ? 'Published' : 'Publish'}</button>
        <button type="button" className="primary" onClick={save} disabled={saving || !dirty}><Save />{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </header>

    {(error || notice) && <div className={error ? 'config-banner error' : 'config-banner success'} role={error ? 'alert' : 'status'}>{error ? <AlertCircle /> : <Check />}<span>{error || notice}</span><button aria-label="Dismiss message" onClick={() => { setError(''); setNotice('') }}><X /></button></div>}

    <div className="config-summary-strip">
      <div><span className={`config-state ${draft.status}`}>{draft.status}</span><strong>{draft.name}</strong><small>{draft.public_id || 'Unsaved configuration'}</small></div>
      <dl><div><dt>Namespace</dt><dd>{draft.namespace || '—'}</dd></div><div><dt>Version</dt><dd>{draft.version}</dd></div><div><dt>Activities</dt><dd>{flowSteps.length}</dd></div><div><dt>Entities</dt><dd>{draft.entities.length}</dd></div></dl>
    </div>

    <div className="config-workspace">
      <nav className="config-section-nav" aria-label="Order configuration sections">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><Icon /><span><strong>{item.label}</strong><small>{item.description}</small></span>{tab === item.id && <ArrowRight />}</button> })}</nav>
      <main className="config-content">
        {tab === 'details' && <section className="config-card">
          <header><div><h2>Configuration details</h2><p>The stable identity used by order APIs and downstream integrations.</p></div>{immutable && <span className="locked-badge"><LockKeyhole />Core configuration</span>}</header>
          {immutable && <div className="immutable-note"><LockKeyhole /><span><strong>Published core fields are protected</strong><small>Create a new configuration to change its identity. Tags, fields, workflow and entities remain manageable.</small></span></div>}
          <div className="config-form-grid">
            <label><span>Name *</span><input value={draft.name} disabled={immutable} onChange={event => update({ name: event.target.value })} /></label>
            <label><span>Key *</span><input value={draft.key} disabled={immutable} onChange={event => update({ key: event.target.value.toLowerCase().replace(/\s+/g, '-') })} /><small>Lowercase, URL-safe identifier.</small></label>
            <label className="wide"><span>Description</span><textarea rows={3} value={draft.description} disabled={immutable} onChange={event => update({ description: event.target.value })} /></label>
            <label><span>Namespace *</span><input value={draft.namespace} disabled={immutable} onChange={event => update({ namespace: event.target.value })} /></label>
            <label><span>Version *</span><input value={draft.version} disabled={immutable} onChange={event => update({ version: event.target.value })} placeholder="1.0.0" /></label>
            <label><span>Visibility</span><select value={draft.status} disabled={immutable} onChange={event => update({ status: event.target.value as OrderConfig['status'] })}><option value="draft">Draft</option><option value="private">Private</option><option value="published">Published</option></select></label>
            <label className="wide"><span>Tags</span><div className="tag-editor">{draft.tags.map(tag => <button type="button" key={tag} onClick={() => update({ tags: draft.tags.filter(item => item !== tag) })}><Tag />{tag}<X /></button>)}<input value={tagInput} onChange={event => setTagInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTag() } }} onBlur={addTag} placeholder="Add a tag and press Enter" /></div></label>
          </div>
        </section>}

        {tab === 'fields' && <section className="config-card">
          <header><div><h2>Custom fields</h2><p>Collect structured information that the standard order schema does not cover.</p></div><button className="secondary" onClick={() => setGroupEditor({ id: newId(), name: '', description: '', fields: [] })}><Plus />New field group</button></header>
          {draft.meta.length === 0 ? <EmptyState icon={Layers3} title="No custom fields" copy="Standard pickup, drop-off and order fields remain available. Add a group only for additional business data." action="Add field group" onAction={() => setGroupEditor({ id: newId(), name: '', description: '', fields: [] })} /> : <div className="config-list">{draft.meta.map(group => <article key={group.id}><div className="config-list-icon"><Layers3 /></div><div><strong>{group.name}</strong><span>{group.description || `${group.fields.length} custom fields`}</span><small>{group.fields.map(field => field.label).join(' · ') || 'No fields yet'}</small></div><button className="secondary" onClick={() => setGroupEditor(group)}>Edit</button><button className="icon-danger" aria-label={`Delete ${group.name}`} onClick={() => update({ meta: draft.meta.filter(item => item.id !== group.id) })}><Trash2 /></button></article>)}</div>}
        </section>}

        {tab === 'flow' && <section className="config-card flow-card">
          <header><div><h2>Activity flow</h2><p>Control valid order transitions. Each activity points only to its allowed next states.</p></div><button className="secondary" onClick={() => setStepEditor(makeStep('', '', ''))}><Plus />New activity</button></header>
          <div className="flow-legend"><span><i className="start" />Start</span><span><i />In progress</span><span><i className="complete" />Complete</span></div>
          <div className="flow-list">{flowSteps.map((step, index) => <article key={step.internalId} className={step.complete ? 'complete' : ''}><GripVertical /><span className="flow-index">{index + 1}</span><div className="flow-copy"><strong>{step.status}</strong><code>{step.code}</code><p>{step.details}</p></div><div className="flow-next"><small>CAN TRANSITION TO</small>{step.complete ? <span>Terminal state</span> : step.activities.length ? step.activities.map(next => <span key={next}>{draft.flow[next]?.status || next}<ArrowRight /></span>) : <span>No next activity</span>}</div>{step.require_pod && <span className="pod-chip"><Check />POD · {step.pod_method}</span>}<button className="secondary" onClick={() => setStepEditor({ ...step, activities: [...step.activities] })}>Edit</button><button className="icon-danger" aria-label={`Delete ${step.status}`} onClick={() => deleteStep(step.code)}><Trash2 /></button></article>)}</div>
        </section>}

        {tab === 'entities' && <section className="config-card">
          <header><div><h2>Custom entities</h2><p>Reusable packages, equipment or resources attached to orders.</p></div><button className="secondary" onClick={() => setEntityEditor({ id: newId(), name: '', type: '', description: '', width: '', height: '', length: '', weight: '', dimensions_unit: 'cm', weight_unit: 'kg' })}><Plus />New entity</button></header>
          {draft.entities.length === 0 ? <EmptyState icon={Package} title="No custom entities" copy="Add package types or operational resources when an order needs more than the standard goods description." action="Add custom entity" onAction={() => setEntityEditor({ id: newId(), name: '', type: '', description: '', width: '', height: '', length: '', weight: '', dimensions_unit: 'cm', weight_unit: 'kg' })} /> : <div className="entity-grid">{draft.entities.map(entity => <article key={entity.id}><div className="entity-icon"><Package /></div><span className="config-state private">{entity.type}</span><h3>{entity.name}</h3><p>{entity.description || 'No description'}</p><dl><div><dt>Dimensions</dt><dd>{entity.length || '—'} × {entity.width || '—'} × {entity.height || '—'} {entity.dimensions_unit}</dd></div><div><dt>Weight</dt><dd>{entity.weight || '—'} {entity.weight_unit}</dd></div></dl><footer><button className="secondary" onClick={() => setEntityEditor(entity)}>Edit entity</button><button className="icon-danger" aria-label={`Delete ${entity.name}`} onClick={() => update({ entities: draft.entities.filter(item => item.id !== entity.id) })}><Trash2 /></button></footer></article>)}</div>}
        </section>}
      </main>
    </div>

    {stepEditor && <EditorModal title={stepEditor.status ? 'Edit activity' : 'New activity'} description="Define the status, allowed transitions and proof-of-delivery rules." onClose={() => setStepEditor(null)} onSubmit={saveStep} submit="Save activity"><div className="config-form-grid"><label><span>Status label *</span><input required value={stepEditor.status} onChange={event => setStepEditor({ ...stepEditor, status: event.target.value })} /></label><label><span>Code *</span><input required value={stepEditor.code} onChange={event => setStepEditor({ ...stepEditor, code: event.target.value })} placeholder="driver_enroute" /></label><label className="wide"><span>Description</span><textarea rows={3} value={stepEditor.details} onChange={event => setStepEditor({ ...stepEditor, details: event.target.value })} /></label><label className="wide"><span>Allowed next activities</span><div className="check-grid">{flowSteps.filter(item => item.internalId !== stepEditor.internalId).map(item => <label key={item.code}><input type="checkbox" checked={stepEditor.activities.includes(item.code)} disabled={stepEditor.complete} onChange={event => setStepEditor({ ...stepEditor, activities: event.target.checked ? [...stepEditor.activities, item.code] : stepEditor.activities.filter(code => code !== item.code) })} />{item.status}</label>)}</div></label><label className="inline-check"><input type="checkbox" checked={stepEditor.complete} onChange={event => setStepEditor({ ...stepEditor, complete: event.target.checked, activities: event.target.checked ? [] : stepEditor.activities })} /><span>Terminal / complete activity</span></label><label className="inline-check"><input type="checkbox" checked={stepEditor.require_pod} onChange={event => setStepEditor({ ...stepEditor, require_pod: event.target.checked })} /><span>Require proof of delivery</span></label>{stepEditor.require_pod && <label><span>POD method</span><select value={stepEditor.pod_method} onChange={event => setStepEditor({ ...stepEditor, pod_method: event.target.value })}><option value="scan">Scan</option><option value="photo">Photo</option><option value="signature">Signature</option><option value="otp">OTP</option></select></label>}</div></EditorModal>}

    {entityEditor && <EditorModal title={entityEditor.name ? 'Edit entity' : 'New custom entity'} description="Describe the package or resource shape sent in the compatible order-config payload." onClose={() => setEntityEditor(null)} onSubmit={saveEntity} submit="Save entity"><div className="config-form-grid"><label><span>Name *</span><input required value={entityEditor.name} onChange={event => setEntityEditor({ ...entityEditor, name: event.target.value })} /></label><label><span>Type key</span><input value={entityEditor.type} onChange={event => setEntityEditor({ ...entityEditor, type: event.target.value })} placeholder="Auto-generated from name" /></label><label className="wide"><span>Description</span><textarea rows={3} value={entityEditor.description} onChange={event => setEntityEditor({ ...entityEditor, description: event.target.value })} /></label><label><span>Length</span><input type="number" min="0" value={entityEditor.length} onChange={event => setEntityEditor({ ...entityEditor, length: event.target.value })} /></label><label><span>Width</span><input type="number" min="0" value={entityEditor.width} onChange={event => setEntityEditor({ ...entityEditor, width: event.target.value })} /></label><label><span>Height</span><input type="number" min="0" value={entityEditor.height} onChange={event => setEntityEditor({ ...entityEditor, height: event.target.value })} /></label><label><span>Dimensions unit</span><select value={entityEditor.dimensions_unit} onChange={event => setEntityEditor({ ...entityEditor, dimensions_unit: event.target.value })}><option value="cm">cm</option><option value="m">m</option><option value="in">in</option></select></label><label><span>Weight</span><input type="number" min="0" value={entityEditor.weight} onChange={event => setEntityEditor({ ...entityEditor, weight: event.target.value })} /></label><label><span>Weight unit</span><select value={entityEditor.weight_unit} onChange={event => setEntityEditor({ ...entityEditor, weight_unit: event.target.value })}><option value="kg">kg</option><option value="g">g</option><option value="lb">lb</option></select></label></div></EditorModal>}

    {groupEditor && <EditorModal title={groupEditor.name ? 'Edit field group' : 'New field group'} description="Group related custom values so order creators can understand why they are required." onClose={() => setGroupEditor(null)} onSubmit={saveGroup} submit="Save field group"><div className="config-form-grid"><label><span>Group name *</span><input required value={groupEditor.name} onChange={event => setGroupEditor({ ...groupEditor, name: event.target.value })} /></label><label className="wide"><span>Description</span><textarea rows={2} value={groupEditor.description} onChange={event => setGroupEditor({ ...groupEditor, description: event.target.value })} /></label><div className="wide field-builder"><header><strong>Fields</strong><button type="button" className="secondary" onClick={() => setGroupEditor({ ...groupEditor, fields: [...groupEditor.fields, { id: newId(), label: '', key: '', type: 'text', required: false }] })}><Plus />Add field</button></header>{groupEditor.fields.map(field => <div key={field.id}><input aria-label="Field label" placeholder="Field label" value={field.label} onChange={event => setGroupEditor({ ...groupEditor, fields: groupEditor.fields.map(item => item.id === field.id ? { ...item, label: event.target.value, key: item.key || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') } : item) })} /><input aria-label="Field key" placeholder="field_key" value={field.key} onChange={event => setGroupEditor({ ...groupEditor, fields: groupEditor.fields.map(item => item.id === field.id ? { ...item, key: event.target.value } : item) })} /><select aria-label="Field type" value={field.type} onChange={event => setGroupEditor({ ...groupEditor, fields: groupEditor.fields.map(item => item.id === field.id ? { ...item, type: event.target.value as CustomField['type'] } : item) })}><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Select</option><option value="checkbox">Checkbox</option></select><label><input type="checkbox" checked={field.required} onChange={event => setGroupEditor({ ...groupEditor, fields: groupEditor.fields.map(item => item.id === field.id ? { ...item, required: event.target.checked } : item) })} />Required</label><button type="button" className="icon-danger" aria-label={`Delete ${field.label || 'field'}`} onClick={() => setGroupEditor({ ...groupEditor, fields: groupEditor.fields.filter(item => item.id !== field.id) })}><Trash2 /></button></div>)}</div></div></EditorModal>}
  </div>
}

function EmptyState({ icon: Icon, title, copy, action, onAction }: { icon: typeof Layers3; title: string; copy: string; action: string; onAction: () => void }) {
  return <div className="config-empty"><span><Icon /></span><h3>{title}</h3><p>{copy}</p><button className="secondary" onClick={onAction}><Plus />{action}</button></div>
}

function EditorModal({ title, description, onClose, onSubmit, submit, children }: { title: string; description: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; submit: string; children: React.ReactNode }) {
  return <div className="modal-backdrop order-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><form className="modal order-compose-modal config-editor" onSubmit={onSubmit}><header><div><h2>{title}</h2><p>{description}</p></div><button type="button" aria-label="Close" onClick={onClose}><X /></button></header><div className="config-editor-body">{children}</div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="submit" className="primary"><Save />{submit}</button></footer></form></div>
}
