'use client'

/* eslint-disable @next/next/no-img-element -- previews may be local data URLs selected by the user. */

import { FormEvent, useMemo, useState } from 'react'
import { Eye, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import type { ApiRecord } from '@/types/dashboard'

type Field = [key: string, label: string, type?: 'text' | 'number' | 'date' | 'time']
type MetadataRow = { id: string; key: string; value: string | number | boolean; type: 'text' | 'number' | 'boolean' }

const metadataRows = (value: unknown): MetadataRow[] => Object.entries(value && typeof value === 'object' ? value as ApiRecord : {}).map(([key, item]) => ({
  id: crypto.randomUUID(), key, value: typeof item === 'boolean' || typeof item === 'number' ? item : String(item ?? ''), type: typeof item === 'boolean' ? 'boolean' : typeof item === 'number' ? 'number' : 'text',
}))

const sections: Array<{ title: string; fields: Field[] }> = [
  { title: 'Vehicle Identification', fields: [['name', 'Name'], ['registration_number', 'Plate Number'], ['vin_number', 'VIN Number'], ['make', 'Make'], ['model', 'Model'], ['year', 'Year', 'number'], ['trim', 'Trim'], ['color', 'Color'], ['serial_number', 'Serial Number'], ['fuel_card_number', 'Fuel Card Number'], ['class', 'Class'], ['call_sign', 'Call Sign']] },
  { title: 'Measurement & Units', fields: [['measurement_system', 'System of Measurement'], ['fuel_volume_unit', 'Fuel Volume Unit'], ['current_odometer', 'Current Odometer', 'number'], ['odometer_unit', 'Odometer Unit'], ['purchase_odometer', 'Odometer at Purchase', 'number']] },
  { title: 'Body & Usage', fields: [['body_type', 'Body Type'], ['body_subtype', 'Body Subtype'], ['usage_type', 'Usage Type'], ['ownership_type', 'Ownership Type'], ['fuel_type', 'Fuel Type'], ['transmission', 'Transmission']] },
  { title: 'Powertrain & Engine', fields: [['engine_number', 'Engine Number'], ['engine_make', 'Engine Make'], ['engine_model', 'Engine Model'], ['engine_family', 'Engine Family'], ['engine_configuration', 'Engine Configuration'], ['cylinder_arrangement', 'Cylinder Arrangement'], ['cylinders', 'Number of Cylinders', 'number'], ['engine_size', 'Engine Size'], ['engine_displacement', 'Engine Displacement'], ['horsepower', 'Horsepower', 'number'], ['horsepower_rpm', 'Horsepower RPM', 'number'], ['torque', 'Torque', 'number'], ['torque_rpm', 'Torque RPM', 'number']] },
  { title: 'Capacity & Dimensions', fields: [['fuel_capacity', 'Fuel Capacity (L)', 'number'], ['max_load_kg', 'Payload Capacity (kg)', 'number'], ['towing_capacity', 'Towing Capacity (kg)', 'number'], ['seating_capacity', 'Seating Capacity', 'number'], ['vehicle_weight', 'Vehicle Weight (kg)', 'number'], ['length', 'Length (cm)', 'number'], ['width', 'Width (cm)', 'number'], ['height', 'Height (cm)', 'number'], ['cargo_volume', 'Cargo Volume (L)', 'number'], ['payload_volume', 'Payload Volume (m³)', 'number'], ['pallet_capacity', 'Pallet Capacity', 'number'], ['parcel_capacity', 'Parcel Capacity', 'number'], ['passenger_volume', 'Passenger Volume (L)', 'number'], ['interior_volume', 'Interior Volume (L)', 'number'], ['ground_clearance', 'Ground Clearance (cm)', 'number'], ['bed_length', 'Bed Length (cm)', 'number']] },
  { title: 'Regulatory & Compliance', fields: [['emission_standard', 'Emission Standard'], ['gvwr', 'GVWR (kg)', 'number'], ['gcwr', 'GCWR (kg)', 'number']] },
  { title: 'Financial & Lifecycle', fields: [['currency', 'Currency'], ['acquisition_cost', 'Acquisition Cost', 'number'], ['current_value', 'Current Value', 'number'], ['insurance_value', 'Insurance Value', 'number'], ['depreciation_rate', 'Depreciation Rate (%)', 'number'], ['service_life_distance', 'Estimated Service Life (Distance)', 'number'], ['service_life_distance_unit', 'Service Life Distance Unit'], ['service_life_months', 'Estimated Service Life (Months)', 'number'], ['purchase_date', 'Purchase Date', 'date'], ['lease_expiry_date', 'Lease Expiry Date', 'date'], ['loan_amount', 'Loan Amount', 'number'], ['number_of_payments', 'Number of Payments', 'number'], ['first_payment_date', 'First Payment Date', 'date']] },
  { title: 'Orchestrator Constraints', fields: [['skills', 'Vehicle Skills'], ['available_from', 'Available From', 'time'], ['available_until', 'Available Until', 'time'], ['max_tasks', 'Max Tasks', 'number']] },
]

export function VehicleEditor({ vehicle, drivers, onClose, onSave }: { vehicle: ApiRecord; drivers: ApiRecord[]; onClose: () => void; onSave: (vehicle: ApiRecord) => void }) {
  const [draft, setDraft] = useState<ApiRecord>(() => ({ status: 'active', currency: 'INR', ...vehicle }))
  const [error, setError] = useState('')
  const [metadata, setMetadata] = useState<MetadataRow[]>(() => metadataRows(vehicle.metadata))
  const [metadataFilter, setMetadataFilter] = useState('')
  const [showMetadataValues, setShowMetadataValues] = useState(true)
  const [preview, setPreview] = useState(String(vehicle.image_url || '/images/vehicle-load-truck.png'))
  const title = String(draft.registration_number || draft.name || draft.id || 'Vehicle')
  const driverOptions = useMemo(() => drivers.map(driver => ({ id: String(driver.id || ''), name: String(driver.name || driver.id || 'Unnamed driver') })), [drivers])
  const visibleMetadata = metadata.filter(row => `${row.key} ${String(row.value)} ${row.type}`.toLowerCase().includes(metadataFilter.trim().toLowerCase()))
  const update = (key: string, value: string) => setDraft(current => ({ ...current, [key]: value }))
  const updateMetadata = (id: string, changes: Partial<MetadataRow>) => setMetadata(current => current.map(row => row.id === id ? { ...row, ...changes } : row))
  function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!String(draft.registration_number || '').trim()) { setError('Plate Number is required.'); return }
    const invalidMetadata = metadata.find(row => !row.key.trim() || (row.type === 'number' && !Number.isFinite(Number(row.value))))
    if (invalidMetadata) { setError('Every metadata row needs a key and valid value.'); return }
    const metadataObject = Object.fromEntries(metadata.map(row => [row.key.trim(), row.type === 'number' ? Number(row.value) : row.type === 'boolean' ? row.value === true || row.value === 'true' : String(row.value)]))
    const driver = driverOptions.find(option => option.id === String(draft.driver_id || ''))
    onSave({ ...draft, assigned_driver: driver?.name || draft.assigned_driver, metadata: metadataObject })
  }
  return <div className="vehicle-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><form className="vehicle-editor" onSubmit={submit}>
    <header><div><h2>Edit: {title}</h2></div><div><button type="button" aria-label="Preview vehicle"><Eye /></button><button className="primary"><Save />Save Changes</button><button type="button" aria-label="Close vehicle editor" onClick={onClose}><X /></button></div></header>
    <div className="vehicle-editor-body">
      <details open><summary>Details</summary><div className="vehicle-upload"><img src={preview} alt={title} /><label><Upload />Upload Image<input type="file" accept="image/png,image/jpeg,image/gif" onChange={event => { const file=event.target.files?.[0]; if (!file) return; const reader=new FileReader(); reader.onload=()=>{const value=String(reader.result||'');setPreview(value);update('image_url',value)};reader.readAsDataURL(file)}} /></label><small>Supports PNGs, JPEGs and GIFs</small></div><h4>Vehicle Identification</h4><div className="vehicle-editor-grid">{sections[0].fields.map(([key,label,type='text'])=><label key={key}><span>{label}{key==='registration_number'?' *':''}</span><input type={type} value={String(draft[key]??'')} onChange={event=>update(key,event.target.value)} /></label>)}</div><h4>Assignment & Status</h4><div className="vehicle-editor-grid"><label><span>Driver Assigned</span><select value={String(draft.driver_id || '')} onChange={event => update('driver_id', event.target.value)}><option value="">Unassigned</option>{driverOptions.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label><label><span>Status</span><select value={String(draft.status || 'active')} onChange={event => update('status', event.target.value)}><option value="active">Active</option><option value="available">Available</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option></select></label></div><h4>Location</h4><div className="vehicle-editor-grid"><label><span>Latitude</span><input type="number" step="any" value={String(((draft.position || {}) as ApiRecord).latitude || '')} onChange={event => setDraft(current => ({ ...current, position: { ...((current.position || {}) as ApiRecord), latitude: event.target.value } }))} /></label><label><span>Longitude</span><input type="number" step="any" value={String(((draft.position || {}) as ApiRecord).longitude || '')} onChange={event => setDraft(current => ({ ...current, position: { ...((current.position || {}) as ApiRecord), longitude: event.target.value } }))} /></label></div></details>
      {sections.slice(1).map(section => <details key={section.title} open><summary>{section.title}</summary><div className="vehicle-editor-grid">{section.fields.map(([key, label, type = 'text']) => <label key={key}><span>{label}</span><input type={type} value={String(draft[key] ?? '')} onChange={event => update(key, event.target.value)} /></label>)}</div>{section.title==='Regulatory & Compliance'&&<div className="vehicle-checks"><label><input type="checkbox" checked={draft.dpf_equipped===true} onChange={event=>setDraft(current=>({...current,dpf_equipped:event.target.checked}))}/>DPF Equipped</label><label><input type="checkbox" checked={draft.scr_equipped===true} onChange={event=>setDraft(current=>({...current,scr_equipped:event.target.checked}))}/>SCR Equipped</label></div>}</details>)}
      <details open><summary>Avatar</summary><div className="vehicle-avatar"><img src={preview} alt="Map avatar"/><label><span>Select map avatar</span><select value={String(draft.avatar||'truck')} onChange={event=>update('avatar',event.target.value)}><option value="truck">Delivery Truck</option><option value="van">Delivery Van</option><option value="mini-bus">Mini Bus</option><option value="car">Car</option></select></label></div></details>
      <details open><summary>Metadata</summary><div className="vehicle-metadata">
        <div className="vehicle-metadata-toolbar">
          <input aria-label="Filter metadata" placeholder="Filter keys..." value={metadataFilter} onChange={event => setMetadataFilter(event.target.value)} />
          <button type="button" onClick={() => setMetadata(current => [...current, { id: crypto.randomUUID(), key: '', value: '', type: 'text' }])}><Plus />Add</button>
          <button type="button" className={showMetadataValues ? 'active' : ''} aria-label={showMetadataValues ? 'Hide metadata values' : 'Show metadata values'} title={showMetadataValues ? 'Hide values' : 'Show values'} onClick={() => setShowMetadataValues(current => !current)}><Eye /></button>
          <button type="button" className="danger" disabled={!metadata.length} onClick={() => setMetadata([])}><Trash2 />Clear all</button>
        </div>
        <div className="vehicle-metadata-table" role="table" aria-label="Vehicle metadata">
          <div className="vehicle-metadata-heading" role="row"><strong role="columnheader">Key</strong><strong role="columnheader">Value</strong><strong role="columnheader">Type</strong><span aria-hidden="true" /></div>
          {visibleMetadata.map(row => <div className="vehicle-metadata-row" role="row" key={row.id}>
            <input role="cell" aria-label="Metadata key" placeholder="Key" value={row.key} onChange={event => updateMetadata(row.id, { key: event.target.value })} />
            {row.type === 'boolean'
              ? <label className="vehicle-metadata-boolean" role="cell"><input type="checkbox" checked={row.value === true || row.value === 'true'} onChange={event => updateMetadata(row.id, { value: event.target.checked })} /><span>{row.value === true || row.value === 'true' ? 'True' : 'False'}</span></label>
              : <input role="cell" aria-label={`Value for ${row.key || 'metadata'}`} type={showMetadataValues ? row.type : 'password'} step={row.type === 'number' ? 'any' : undefined} placeholder="Value" value={String(row.value)} onChange={event => updateMetadata(row.id, { value: event.target.value })} />}
            <select role="cell" aria-label={`Type for ${row.key || 'metadata'}`} value={row.type} onChange={event => { const type = event.target.value as MetadataRow['type']; updateMetadata(row.id, { type, value: type === 'boolean' ? false : type === 'number' ? '' : String(row.value) }) }}><option value="text">Text</option><option value="number">Number</option><option value="boolean">Boolean</option></select>
            <button type="button" className="icon danger" aria-label={`Remove ${row.key || 'metadata'} row`} onClick={() => setMetadata(current => current.filter(item => item.id !== row.id))}><Trash2 /></button>
          </div>)}
          {!visibleMetadata.length && <p className="vehicle-metadata-empty">{metadata.length ? 'No metadata matches this filter.' : 'No metadata added yet.'}</p>}
        </div>
      </div></details>
      {error && <p className="vehicle-editor-error" role="alert">{error}</p>}
    </div>
    <footer><button type="button" onClick={onClose}>Cancel</button><button className="primary"><Save />Save Changes</button></footer>
  </form></div>
}
