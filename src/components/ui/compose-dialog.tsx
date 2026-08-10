'use client'

import { useState, type FormEvent } from 'react'
import { CheckCircle2, Plus, Trash2, Upload, X } from 'lucide-react'
import type { ModuleName } from '@/types/dashboard'
import { fetchAuthenticated, useApiData } from '@/hooks/use-api-data'
import { VehicleComposeForm } from '@/components/ui/vehicle-compose-form'
import { FleetComposeForm } from '@/components/ui/fleet-compose-form'

export function OrderCreateForm({ onCancel, onValid }: { onCancel: () => void; onValid: () => void }) {
  const { rows: drivers } = useApiData('Drivers', undefined, false)
  const { rows: vehicles } = useApiData('Vehicles', undefined, false)
  const { rows: places } = useApiData('Service Areas', undefined, false)
  const [multipleDropoffs, setMultipleDropoffs] = useState(false)
  const [items, setItems] = useState([{ id: crypto.randomUUID(), description: '', quantity: '1' }])
  const [metadata, setMetadata] = useState([{ id: crypto.randomUUID(), key: '', value: '' }])
  return <form id="order-compose-form" style={{ minHeight: 0, overflow: 'hidden', flex: '1 1 auto' }} onSubmit={event => { event.preventDefault(); onValid() }}>
    <div className="order-reference-form" style={{ minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', flex: '1 1 auto', alignContent: 'start', gridAutoRows: 'max-content' }}>
      <OrderSection title="Details"><label><span>Order Type *</span><select required defaultValue=""><option value="">Select Order Type</option><option value="delivery">Delivery</option><option value="pickup-dropoff">Pickup &amp; Dropoff</option><option value="transport">Transport</option></select></label><label><span>Internal ID</span><input name="external_reference" maxLength={128} placeholder="Internal ID" /></label><label><span>Schedule</span><input type="datetime-local" /></label><label><span>Customer</span><select defaultValue=""><option value="">Select Customer</option></select></label><label><span>Facilitator</span><select defaultValue=""><option value="">Select Facilitator</option></select></label><label><span>Assign Driver</span><select defaultValue=""><option value="">Select Driver</option>{drivers.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.name || row.id)}</option>)}</select></label><label><span>Assign Vehicle</span><select defaultValue=""><option value="">Select Vehicle</option>{vehicles.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.name || row.registration_number || row.id)}</option>)}</select></label><div className="order-toggle-row wide"><label><input type="checkbox" />Ad-Hoc</label><label><input type="checkbox" />Dispatch</label><label><input type="checkbox" />Require Proof of Delivery</label></div></OrderSection>
      <OrderSection title="Route"><label className="wide order-inline-check"><input type="checkbox" checked={multipleDropoffs} onChange={event => setMultipleDropoffs(event.target.checked)} />Multiple Dropoff&apos;s</label><label><span>Pickup *</span><select required defaultValue=""><option value="">Select Pickup</option>{places.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.name || row.label || row.id)}</option>)}</select></label><label><span>Dropoff *</span><select required defaultValue=""><option value="">Select Dropoff</option>{places.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.name || row.label || row.id)}</option>)}</select></label><label><span>Return</span><select defaultValue=""><option value="">Select Return</option>{places.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.name || row.label || row.id)}</option>)}</select></label>{multipleDropoffs && <label><span>Additional Dropoff</span><select defaultValue=""><option value="">Select additional dropoff</option>{places.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.name || row.label || row.id)}</option>)}</select></label>}</OrderSection>
      <OrderSection title="Payload / Entities"><div className="order-items wide">{items.map(item => <div key={item.id}><input aria-label="Item description" value={item.description} onChange={event => setItems(current => current.map(row => row.id === item.id ? { ...row, description: event.target.value } : row))} placeholder="Item description" /><input aria-label="Item quantity" type="number" min="1" value={item.quantity} onChange={event => setItems(current => current.map(row => row.id === item.id ? { ...row, quantity: event.target.value } : row))} /><button type="button" aria-label="Remove item" onClick={() => setItems(current => current.filter(row => row.id !== item.id))}><Trash2 /></button></div>)}<button type="button" onClick={() => setItems(current => [...current, { id: crypto.randomUUID(), description: '', quantity: '1' }])}><Plus />Add Item to Order</button></div></OrderSection>
      <OrderSection title="Service"><label className="wide order-inline-check"><input type="checkbox" />Apply service rate</label></OrderSection>
      <OrderSection title="Notes"><label className="wide"><textarea placeholder="Enter order notes here...." /></label></OrderSection>
      <OrderSection title="Documents & Files"><label className="order-file-drop wide"><Upload /><strong>Upload Documents &amp; Files</strong><span>Drag and drop files or select files to upload.</span><input type="file" multiple /></label></OrderSection>
      <OrderSection title="Orchestrator Constraints"><label><span>Time Window Start</span><input type="datetime-local" /></label><label><span>Time Window End</span><input type="datetime-local" /></label><label><span>Required Skills</span><input placeholder="Select required skills..." /></label><label><span>Orchestrator Priority</span><input type="number" min="0" max="100" defaultValue="0" /></label></OrderSection>
      <OrderSection title="Metadata"><div className="order-metadata wide">{metadata.map(row => <div key={row.id}><input aria-label="Metadata key" value={row.key} onChange={event => setMetadata(current => current.map(item => item.id === row.id ? { ...item, key: event.target.value } : item))} placeholder="Key" /><input aria-label="Metadata value" value={row.value} onChange={event => setMetadata(current => current.map(item => item.id === row.id ? { ...item, value: event.target.value } : item))} placeholder="Value" /><select aria-label="Metadata type"><option>Text</option><option>Number</option><option>Boolean</option></select><button type="button" aria-label="Remove metadata" onClick={() => setMetadata(current => current.filter(item => item.id !== row.id))}><Trash2 /></button></div>)}<button type="button" onClick={() => setMetadata(current => [...current, { id: crypto.randomUUID(), key: '', value: '' }])}><Plus />Add</button></div></OrderSection>
    </div>
    <footer><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary" type="submit">Create Order</button></footer>
  </form>
}

function OrderSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3>{title}</h3><div>{children}</div></section> }

function driverErrorMessage(status: number, body: { title?: string; detail?: string } | null) {
  if (status === 403) return 'Only organization owners and admins can invite drivers.'
  if (status === 409) return 'A driver with these details already exists.'
  if (status === 422) return 'Check the driver name and use a valid international phone number.'
  return body?.detail || body?.title || `Unable to invite driver (${status}).`
}

function normalizeDriverPhone(value: FormDataEntryValue | null) {
  const phone = String(value || '').trim().replace(/[\s()-]/g, '')
  if (/^[0-9]{10}$/.test(phone)) return `+91${phone}`
  if (/^91[0-9]{10}$/.test(phone)) return `+${phone}`
  return phone
}

function DriverInviteForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()
    const body = {
      name: String(data.get('name') || '').trim(),
      phone: normalizeDriverPhone(data.get('phone')),
      ...(email ? { email } : {}),
      rider_type: 'internal',
    }
    try {
      const response = await fetchAuthenticated('/v1/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null
        throw new Error(driverErrorMessage(response.status, problem))
      }
      onCreated()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to invite driver.')
    } finally {
      setSubmitting(false)
    }
  }

  return <form onSubmit={submit}>
    <div className="form-grid">
      <label className="wide"><span>Full name</span><input name="name" required minLength={2} maxLength={120} autoFocus placeholder="Enter driver name" /></label>
      <label><span>Phone number</span><input name="phone" required type="tel" inputMode="tel" minLength={10} placeholder="98765 43210 or +91…" /></label>
      <label><span>Email (optional)</span><input name="email" type="email" placeholder="driver@example.com" /></label>
      <label className="wide"><span>Employment type</span><select value="internal" disabled aria-label="Employment type"><option value="internal">Internal rider</option></select></label>
      {error && <div className="modal-form-error wide" role="alert">{error}</div>}
    </div>
    <footer><button type="button" className="secondary" onClick={onCancel} disabled={submitting}>Cancel</button><button className="primary" type="submit" disabled={submitting}>{submitting ? 'Inviting…' : 'Invite driver'}</button></footer>
  </form>
}

export function ComposeDialog({ module, label, onClose, onCreated }: { module: ModuleName; label: string; onClose: () => void; onCreated?: () => void }) {
  const [done, setDone] = useState(false)
  const fields = module === 'Integrations' ? ['Endpoint name', 'Webhook URL', 'Signing secret'] : module === 'Pricing' ? ['Rule name', 'Base price (₹)', 'Price per kilometre (₹)'] : ['Area name', 'City', 'Postal codes']
  function created() {
    onCreated?.()
    setDone(true)
  }
  const description = module === 'Drivers' ? 'Add an internal rider to your organization.' : module === 'Vehicles' ? 'Create a Fleet-Ops vehicle with operational and lifecycle details.' : module === 'Fleets' ? 'Create an operational group and assign its hierarchy and coverage.' : `Create a new ${module.toLowerCase().replace(/s$/, '')} record.`
  const successTitle = module === 'Drivers' ? 'Driver invited' : module === 'Vehicles' ? 'Vehicle created' : module === 'Fleets' ? 'Fleet created' : 'Form validated'
  const successText = module === 'Drivers' ? 'The driver was created successfully and is now available in your organization.' : module === 'Vehicles' ? 'The vehicle was saved and is now available to Fleet-Ops.' : module === 'Fleets' ? 'The fleet was saved and is now available to Fleet-Ops.' : 'All required fields are ready for the Droo order endpoint.'
  const drawer = module === 'Vehicles' || module === 'Fleets'
  const modalClass = module === 'Orders' ? 'modal order-compose-modal' : drawer ? `modal ${module === 'Fleets' ? 'fleet-compose-modal' : 'vehicle-compose-modal'}` : 'modal'
  const backdropClass = module === 'Orders' ? 'modal-backdrop order-drawer-backdrop' : drawer ? `modal-backdrop ${module === 'Fleets' ? 'fleet-drawer-backdrop' : 'vehicle-drawer-backdrop'}` : 'modal-backdrop'
  return <div className={backdropClass} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className={modalClass} role="dialog" aria-modal="true" aria-label={label}>
      <header><div><h2>{label}</h2><p>{description}</p></div><div className="compose-header-actions">{module === 'Orders' && !done && <button className="primary" type="submit" form="order-compose-form">Create Order</button>}<button type="button" onClick={onClose} aria-label="Close"><X /></button></div></header>
      {done ? <div className="success"><CheckCircle2 /><strong>{successTitle}</strong><span>{successText}</span><button className="primary" onClick={onClose}>Done</button></div>
        : module === 'Orders' ? <OrderCreateForm onCancel={onClose} onValid={() => setDone(true)} />
        : module === 'Drivers' ? <DriverInviteForm onCancel={onClose} onCreated={created} />
        : module === 'Vehicles' ? <VehicleComposeForm onCancel={onClose} onCreated={created} />
        : module === 'Fleets' ? <FleetComposeForm onCancel={onClose} onCreated={created} />
        : <form onSubmit={event => { event.preventDefault(); setDone(true) }}><div className="form-grid">{fields.map((field, index) => <label className={index ? '' : 'wide'} key={field}><span>{field}</span>{field.includes('type') ? <select required><option value="">Select type</option><option>Internal rider</option></select> : <input required placeholder={`Enter ${field.toLowerCase()}`} />}</label>)}</div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Validate & continue</button></footer></form>}
    </section>
  </div>
}
