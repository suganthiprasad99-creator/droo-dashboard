'use client'

import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type { ModuleName } from '@/types/dashboard'

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

export function ComposeDialog({ module, label, onClose }: { module: ModuleName; label: string; onClose: () => void }) {
  const [done, setDone] = useState(false)
  const fields = module === 'Drivers' ? ['Full name', 'Phone number', 'Employment type'] : module === 'Integrations' ? ['Endpoint name', 'Webhook URL', 'Signing secret'] : module === 'Pricing' ? ['Rule name', 'Base price (₹)', 'Price per kilometre (₹)'] : ['Area name', 'City', 'Postal codes']
  return <div className={module === 'Orders' ? 'modal-backdrop order-drawer-backdrop' : 'modal-backdrop'} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className={module === 'Orders' ? 'modal order-compose-modal' : 'modal'} role="dialog" aria-modal="true" aria-label={label}><header><div><h2>{label}</h2><p>Create a new {module.toLowerCase().replace(/s$/, '')} record.</p></div><button onClick={onClose} aria-label="Close"><X /></button></header>{done ? <div className="success"><CheckCircle2 /><strong>Form validated</strong><span>All required fields are ready for the Droo order endpoint.</span><button className="primary" onClick={onClose}>Done</button></div> : module === 'Orders' ? <RequiredOrderForm onCancel={onClose} onValid={() => setDone(true)} /> : <form onSubmit={event => { event.preventDefault(); setDone(true) }}><div className="form-grid">{fields.map((field, index) => <label className={index ? '' : 'wide'} key={field}><span>{field}</span>{field.includes('type') ? <select required><option value="">Select type</option><option>Internal rider</option><option>Solo rider</option></select> : <input required placeholder={`Enter ${field.toLowerCase()}`} />}</label>)}</div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Validate & continue</button></footer></form>}</section></div>
}
