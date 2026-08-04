'use client'

import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type { ModuleName } from '@/types/dashboard'

export function ComposeDialog({ module, label, onClose }: { module: ModuleName; label: string; onClose: () => void }) {
  const [done, setDone] = useState(false)
  const fields = module === 'Orders' ? ['Customer reference', 'Pickup address', 'Drop-off address'] : module === 'Drivers' ? ['Full name', 'Phone number', 'Employment type'] : module === 'Integrations' ? ['Endpoint name', 'Webhook URL', 'Signing secret'] : module === 'Pricing' ? ['Rule name', 'Base price (₹)', 'Price per kilometre (₹)'] : ['Area name', 'City', 'Postal codes']
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-label={label}><header><div><h2>{label}</h2><p>Create a new {module.toLowerCase().replace(/s$/, '')} record.</p></div><button onClick={onClose} aria-label="Close"><X /></button></header>{done ? <div className="success"><CheckCircle2 /><strong>Ready to connect</strong><span>The form is valid and ready for the corresponding Droo V1 endpoint.</span><button className="primary" onClick={onClose}>Done</button></div> : <form onSubmit={event => { event.preventDefault(); setDone(true) }}><div className="form-grid">{fields.map((field, index) => <label className={index ? '' : 'wide'} key={field}><span>{field}</span>{field.includes('type') ? <select required><option value="">Select type</option><option>Internal rider</option><option>Solo rider</option></select> : <input required placeholder={`Enter ${field.toLowerCase()}`} />}</label>)}</div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Validate & continue</button></footer></form>}</section></div>
}
