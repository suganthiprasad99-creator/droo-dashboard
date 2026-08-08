'use client'

import { useState, type FormEvent } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type { ModuleName } from '@/types/dashboard'
import { fetchAuthenticated } from '@/hooks/use-api-data'
import { VehicleComposeForm } from '@/components/ui/vehicle-compose-form'
import { FleetComposeForm } from '@/components/ui/fleet-compose-form'

function RequiredOrderForm({ onCancel, onValid }: { onCancel: () => void; onValid: () => void }) {
  return <form onSubmit={event => { event.preventDefault(); onValid() }}>
    <div className="order-form-grid">
      <label className="wide"><span>Customer reference</span><input name="external_reference" required maxLength={128} placeholder="e.g. WEB-ORDER-1048" /></label>
      <fieldset>
        <legend>Pickup details</legend>
        <div className="order-stop-grid">
          <label><span>Contact name</span><input name="pickup_contact_name" required maxLength={120} placeholder="Pickup contact" /></label>
          <label><span>Contact phone</span><input name="pickup_contact_phone" required type="tel" pattern="\+[1-9][0-9]{7,14}" placeholder="+91 98765 43210" /></label>
          <label className="wide"><span>Address line 1</span><input name="pickup_address" required maxLength={255} placeholder="Street and building" /></label>
          <label><span>City</span><input name="pickup_city" required maxLength={120} placeholder="City" /></label>
          <label><span>Country code</span><input name="pickup_country" required pattern="[A-Za-z]{2}" maxLength={2} placeholder="IN" /></label>
          <label><span>Latitude</span><input name="pickup_latitude" required type="number" min="-90" max="90" step="any" placeholder="13.0827" /></label>
          <label><span>Longitude</span><input name="pickup_longitude" required type="number" min="-180" max="180" step="any" placeholder="80.2707" /></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Drop-off details</legend>
        <div className="order-stop-grid">
          <label><span>Contact name</span><input name="dropoff_contact_name" required maxLength={120} placeholder="Recipient name" /></label>
          <label><span>Contact phone</span><input name="dropoff_contact_phone" required type="tel" pattern="\+[1-9][0-9]{7,14}" placeholder="+91 98765 43210" /></label>
          <label className="wide"><span>Address line 1</span><input name="dropoff_address" required maxLength={255} placeholder="Street and building" /></label>
          <label><span>City</span><input name="dropoff_city" required maxLength={120} placeholder="City" /></label>
          <label><span>Country code</span><input name="dropoff_country" required pattern="[A-Za-z]{2}" maxLength={2} placeholder="IN" /></label>
          <label><span>Latitude</span><input name="dropoff_latitude" required type="number" min="-90" max="90" step="any" placeholder="13.0067" /></label>
          <label><span>Longitude</span><input name="dropoff_longitude" required type="number" min="-180" max="180" step="any" placeholder="80.2572" /></label>
        </div>
      </fieldset>
    </div>
    <footer><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary" type="submit">Validate &amp; continue</button></footer>
  </form>
}

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
      <header><div><h2>{label}</h2><p>{description}</p></div><button onClick={onClose} aria-label="Close"><X /></button></header>
      {done ? <div className="success"><CheckCircle2 /><strong>{successTitle}</strong><span>{successText}</span><button className="primary" onClick={onClose}>Done</button></div>
        : module === 'Orders' ? <RequiredOrderForm onCancel={onClose} onValid={() => setDone(true)} />
        : module === 'Drivers' ? <DriverInviteForm onCancel={onClose} onCreated={created} />
        : module === 'Vehicles' ? <VehicleComposeForm onCancel={onClose} onCreated={created} />
        : module === 'Fleets' ? <FleetComposeForm onCancel={onClose} onCreated={created} />
        : <form onSubmit={event => { event.preventDefault(); setDone(true) }}><div className="form-grid">{fields.map((field, index) => <label className={index ? '' : 'wide'} key={field}><span>{field}</span>{field.includes('type') ? <select required><option value="">Select type</option><option>Internal rider</option></select> : <input required placeholder={`Enter ${field.toLowerCase()}`} />}</label>)}</div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Validate & continue</button></footer></form>}
    </section>
  </div>
}
