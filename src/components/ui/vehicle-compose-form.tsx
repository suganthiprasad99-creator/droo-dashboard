'use client'

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { ChevronDown, ImagePlus, Plus, Trash2, Truck } from 'lucide-react'
import { fetchAuthenticated, useApiData } from '@/hooks/use-api-data'
import { VehicleLocationPicker } from '@/components/ui/vehicle-location-picker'

type Field = {
  name: string
  label: string
  type?: 'text' | 'number' | 'integer' | 'date' | 'time' | 'select' | 'driver' | 'skills' | 'json'
  options?: Array<[string, string]>
  step?: string
  unit?: string
  placeholder?: string
  required?: boolean
}

const bodyTypes: Array<[string, string]> = [['', 'Not specified'], ['car', 'Car'], ['van', 'Van'], ['truck', 'Truck'], ['motorcycle', 'Motorcycle'], ['scooter', 'Scooter'], ['bicycle', 'Bicycle'], ['other', 'Other']]
const sections: Array<{ title: string; subtitle?: string; fields: Field[]; open?: boolean }> = [
  { title: 'Details', open: true, fields: [
    { name: 'name', label: 'Name', required: true }, { name: 'internal_id', label: 'Internal ID' }, { name: 'plate_number', label: 'Plate number' }, { name: 'vin', label: 'VIN number', placeholder: '17-character VIN' },
    { name: 'make', label: 'Make' }, { name: 'model', label: 'Model' }, { name: 'year', label: 'Year', type: 'integer' }, { name: 'trim', label: 'Trim' }, { name: 'color', label: 'Color' }, { name: 'serial_number', label: 'Serial number' },
    { name: 'fuel_card_number', label: 'Fuel card number' }, { name: 'class', label: 'Class' }, { name: 'driver_uuid', label: 'Driver assigned', type: 'driver' },
    { name: 'status', label: 'Status', type: 'select', options: [['available', 'Available'], ['in_use', 'In use'], ['maintenance', 'Maintenance'], ['out_of_service', 'Out of service']] }, { name: 'call_sign', label: 'Call sign' },
  ] },
  { title: 'Measurement & units', fields: [
    { name: 'measurement_system', label: 'System of measurement', type: 'select', options: [['', 'Not specified'], ['metric', 'Metric'], ['imperial', 'Imperial']] },
    { name: 'fuel_volume_unit', label: 'Fuel volume unit', type: 'select', options: [['', 'Not specified'], ['L', 'Litres (L)'], ['gal', 'Gallons (gal)']] },
    { name: 'odometer', label: 'Current odometer', type: 'number', step: 'any', unit: 'km' }, { name: 'odometer_unit', label: 'Odometer unit', type: 'select', options: [['', 'Not specified'], ['km', 'Kilometres'], ['mi', 'Miles']] }, { name: 'odometer_at_purchase', label: 'Odometer at purchase', type: 'number', step: 'any', unit: 'km' },
  ] },
  { title: 'Body & usage', fields: [
    { name: 'body_type', label: 'Body type', type: 'select', options: bodyTypes }, { name: 'body_sub_type', label: 'Body subtype', type: 'select', options: [['', 'Not specified'], ['compact', 'Compact'], ['standard', 'Standard'], ['cargo', 'Cargo'], ['pickup', 'Pickup'], ['box', 'Box'], ['flatbed', 'Flatbed'], ['other', 'Other']] },
    { name: 'usage_type', label: 'Usage type', type: 'select', options: [['', 'Not specified'], ['delivery', 'Delivery'], ['commercial', 'Commercial'], ['passenger', 'Passenger'], ['mixed', 'Mixed use']] }, { name: 'ownership_type', label: 'Ownership type', type: 'select', options: [['', 'Not specified'], ['owned', 'Owned'], ['leased', 'Leased'], ['rented', 'Rented'], ['contractor', 'Contractor owned']] },
    { name: 'fuel_type', label: 'Fuel type', type: 'select', options: [['', 'Not specified'], ['petrol', 'Petrol'], ['diesel', 'Diesel'], ['electric', 'Electric'], ['hybrid', 'Hybrid'], ['cng', 'CNG'], ['lpg', 'LPG']] }, { name: 'transmission', label: 'Transmission', type: 'select', options: [['', 'Not specified'], ['automatic', 'Automatic'], ['manual', 'Manual'], ['cvt', 'CVT'], ['other', 'Other']] },
  ] },
  { title: 'Technical specifications', subtitle: 'Powertrain, capacity and compliance', fields: [
    { name: 'engine_number', label: 'Engine number' }, { name: 'engine_make', label: 'Engine make' }, { name: 'engine_model', label: 'Engine model' }, { name: 'engine_family', label: 'Engine family' }, { name: 'engine_configuration', label: 'Engine configuration', placeholder: 'Inline-4, V6' }, { name: 'cylinder_arrangement', label: 'Cylinder arrangement', placeholder: 'I, V, H' },
    { name: 'number_of_cylinders', label: 'Number of cylinders', type: 'integer' }, { name: 'engine_size', label: 'Engine size', type: 'number', step: 'any', unit: 'L' }, { name: 'engine_displacement', label: 'Engine displacement', type: 'number', step: 'any', unit: 'cc' }, { name: 'horsepower', label: 'Horsepower', type: 'number', step: 'any', unit: 'hp' }, { name: 'horsepower_rpm', label: 'Horsepower RPM', type: 'number', step: 'any', unit: 'rpm' }, { name: 'torque', label: 'Torque', type: 'number', step: 'any', unit: 'Nm' }, { name: 'torque_rpm', label: 'Torque RPM', type: 'number', step: 'any', unit: 'rpm' },
    { name: 'fuel_capacity', label: 'Fuel capacity', type: 'number', step: 'any', unit: 'L' }, { name: 'payload_capacity', label: 'Payload capacity', type: 'number', step: 'any', unit: 'kg' }, { name: 'towing_capacity', label: 'Towing capacity', type: 'number', step: 'any', unit: 'kg' }, { name: 'seating_capacity', label: 'Seating capacity', type: 'integer' }, { name: 'weight', label: 'Vehicle weight', type: 'number', step: 'any', unit: 'kg' },
    { name: 'length', label: 'Length', type: 'number', step: 'any', unit: 'cm' }, { name: 'width', label: 'Width', type: 'number', step: 'any', unit: 'cm' }, { name: 'height', label: 'Height', type: 'number', step: 'any', unit: 'cm' }, { name: 'cargo_volume', label: 'Cargo volume', type: 'number', step: 'any', unit: 'L' }, { name: 'payload_capacity_volume', label: 'Payload volume', type: 'number', step: 'any', unit: 'm³' }, { name: 'payload_capacity_pallets', label: 'Pallet capacity', type: 'integer' }, { name: 'payload_capacity_parcels', label: 'Parcel capacity', type: 'integer' },
    { name: 'passenger_volume', label: 'Passenger volume', type: 'number', step: 'any', unit: 'L' }, { name: 'interior_volume', label: 'Interior volume', type: 'number', step: 'any', unit: 'L' }, { name: 'ground_clearance', label: 'Ground clearance', type: 'number', step: 'any', unit: 'cm' }, { name: 'bed_length', label: 'Bed length', type: 'number', step: 'any', unit: 'cm' }, { name: 'emission_standard', label: 'Emission standard' }, { name: 'gvwr', label: 'GVWR', type: 'number', step: 'any', unit: 'kg' }, { name: 'gcwr', label: 'GCWR', type: 'number', step: 'any', unit: 'kg' },
  ] },
  { title: 'Financial & lifecycle', fields: [
    { name: 'currency', label: 'Currency', type: 'select', options: [['', 'Not specified'], ['INR', '🇮🇳 INR — India'], ['USD', '🇺🇸 USD — United States'], ['EUR', '🇪🇺 EUR — Euro'], ['GBP', '🇬🇧 GBP — United Kingdom'], ['AED', '🇦🇪 AED — UAE']] },
    { name: 'acquisition_cost', label: 'Acquisition cost', type: 'number', step: 'any' }, { name: 'current_value', label: 'Current value', type: 'number', step: 'any' }, { name: 'insurance_value', label: 'Insurance value', type: 'number', step: 'any' }, { name: 'depreciation_rate', label: 'Depreciation rate', type: 'number', step: 'any', unit: '%' },
    { name: 'estimated_service_life_distance', label: 'Estimated service life distance', type: 'number', step: 'any' }, { name: 'estimated_service_life_distance_unit', label: 'Service life distance unit', type: 'select', options: [['', 'Not specified'], ['km', 'Kilometres'], ['mi', 'Miles']] }, { name: 'estimated_service_life_months', label: 'Estimated service life months', type: 'integer' }, { name: 'purchased_at', label: 'Purchase date', type: 'date' }, { name: 'lease_expires_at', label: 'Lease expiry date', type: 'date' },
    { name: 'loan_amount', label: 'Loan amount', type: 'number', step: 'any' }, { name: 'loan_number_of_payments', label: 'Number of payments', type: 'integer' }, { name: 'loan_first_payment', label: 'First payment date', type: 'date' },
  ] },
  { title: 'Orchestrator constraints', fields: [
    { name: 'skills', label: 'Vehicle skills', type: 'skills', options: [['cold_chain', 'Cold chain'], ['fragile', 'Fragile goods'], ['heavy_load', 'Heavy load'], ['hazmat', 'Hazardous materials'], ['refrigerated', 'Refrigerated'], ['passenger', 'Passenger']] }, { name: 'time_window_start', label: 'Available from', type: 'time' }, { name: 'time_window_end', label: 'Available until', type: 'time' }, { name: 'max_tasks', label: 'Maximum tasks', type: 'integer' },
  ] },
]

const fieldNames = sections.flatMap(section => section.fields.map(field => field.name))
const numberFields = new Set(sections.flatMap(section => section.fields.filter(field => field.type === 'number' || field.type === 'integer').map(field => field.name)).filter(name => name !== 'year'))
const avatarOptions = [['', 'Default vehicle'], ['/images/vehicle-load-truck.png', 'Delivery truck'], ['/images/vehicle-load-truck-empty.png', 'Empty delivery truck']]

function nullable(data: FormData, name: string) { const value = String(data.get(name) || '').trim(); return value || null }
function vehiclePayload(data: FormData) {
  const vehicle: Record<string, unknown> = {}
  for (const name of fieldNames) vehicle[name] = numberFields.has(name) ? (nullable(data, name) === null ? null : Number(data.get(name))) : nullable(data, name)
  vehicle.year = nullable(data, 'year'); vehicle.status = String(data.get('status') || 'available'); vehicle.skills = data.getAll('skills').map(String).filter(Boolean); vehicle.dpf_equipped = data.get('dpf_equipped') === 'on'; vehicle.scr_equipped = data.get('scr_equipped') === 'on'; vehicle.avatar_url = nullable(data, 'avatar_url'); vehicle.custom_field_values = JSON.parse(String(data.get('custom_field_values') || '[]')); vehicle.meta = JSON.parse(String(data.get('meta') || '{}'))
  return { vehicle }
}

function FieldControl({ field, drivers }: { field: Field; drivers: Array<Record<string, unknown>> }) {
  if (field.type === 'select') return <select name={field.name} defaultValue={field.name === 'status' ? 'available' : ''} required={field.required}>{field.options?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
  if (field.type === 'driver') return <select name={field.name} defaultValue=""><option value="">Unassigned</option>{drivers.map(driver => <option key={String(driver.id)} value={String(driver.id)}>{String(driver.name || driver.phone || driver.id)}</option>)}</select>
  if (field.type === 'skills') return <select name={field.name} multiple size={Math.min(4, field.options?.length || 3)}>{field.options?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
  const input = <input name={field.name} required={field.required} placeholder={field.placeholder} type={field.type === 'integer' ? 'number' : field.type || 'text'} min={field.name === 'year' ? '1980' : field.type === 'number' || field.type === 'integer' ? '0' : undefined} max={field.name === 'year' ? '2100' : undefined} step={field.step || (field.type === 'integer' ? '1' : undefined)} />
  return field.unit ? <span className="vehicle-unit-control">{input}<b>{field.unit}</b></span> : input
}

type MetadataRow = { id: number; key: string; value: string; type: 'string' | 'number' | 'boolean' }
function MetadataEditor() {
  const [rows, setRows] = useState<MetadataRow[]>([])
  const payload = useMemo(() => Object.fromEntries(rows.filter(row => row.key.trim()).map(row => [row.key.trim(), row.type === 'number' ? Number(row.value) : row.type === 'boolean' ? row.value === 'true' : row.value])), [rows])
  return <details className="vehicle-form-section"><summary>Metadata<ChevronDown /></summary><div className="vehicle-metadata"><input type="hidden" name="meta" value={JSON.stringify(payload)} /><header><span>Key/value information passed to Fleet-Ops.</span><button type="button" onClick={() => setRows(current => [...current, { id: Date.now(), key: '', value: '', type: 'string' }])}><Plus />Add field</button></header>{rows.length ? rows.map(row => <div key={row.id}><input aria-label="Metadata key" placeholder="Key" value={row.key} onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, key: event.target.value } : item))} /><input aria-label="Metadata value" placeholder="Value" value={row.value} onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, value: event.target.value } : item))} /><select aria-label="Metadata type" value={row.type} onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, type: event.target.value as MetadataRow['type'] } : item))}><option value="string">Text</option><option value="number">Number</option><option value="boolean">Boolean</option></select><button aria-label="Remove metadata field" type="button" onClick={() => setRows(current => current.filter(item => item.id !== row.id))}><Trash2 /></button></div>) : <p>No metadata yet. Add a field when this vehicle needs custom routing or reporting information.</p>}<label><span>Custom field values (JSON)</span><textarea name="custom_field_values" rows={3} defaultValue="[]" spellCheck={false} /></label></div></details>
}

function vehicleError(status: number, body: { title?: string; detail?: string } | null) { if (status === 403) return 'Only organization owners and admins can create vehicles.'; if (status === 409) return 'A vehicle with this plate number or internal ID already exists.'; if (status === 422) return 'One or more vehicle fields contain invalid data.'; return body?.detail || body?.title || `Unable to create vehicle (${status}).` }

export function VehicleComposeForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(''); const [photo, setPhoto] = useState<File | null>(null); const [avatar, setAvatar] = useState('')
  const { rows: drivers } = useApiData('Drivers', undefined, false)
  const photoPreview = useMemo(() => photo ? URL.createObjectURL(photo) : '', [photo])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0] || null; if (!file) return; if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) { setError('Use a JPEG, PNG, GIF or WebP vehicle image.'); event.target.value = ''; return }; if (file.size > 10 * 1024 * 1024) { setError('Vehicle images must be 10 MB or smaller.'); event.target.value = ''; return }; setError(''); setPhoto(file) }
  async function uploadPhoto(file: File) { const create = await fetchAuthenticated('/v1/files/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose: 'vehicle_photo', filename: file.name, content_type: file.type, size_bytes: file.size }) }); if (!create.ok) throw new Error(`Unable to prepare the vehicle image (${create.status}).`); const upload = await create.json() as { file_id: string }; const content = await fetchAuthenticated(`/v1/files/${encodeURIComponent(upload.file_id)}/content`, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file }); if (!content.ok) throw new Error(`Unable to upload the vehicle image (${content.status}).`); return upload.file_id }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError('')
    try { const body = vehiclePayload(new FormData(event.currentTarget)); if (!body.vehicle.name && !body.vehicle.plate_number) throw new Error('Enter a vehicle name or plate number.'); if (photo) body.vehicle.photo_uuid = await uploadPhoto(photo); const response = await fetchAuthenticated('/v1/admin/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!response.ok) { const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null; throw new Error(vehicleError(response.status, problem)) }; onCreated()
    } catch (value) { setError(value instanceof SyntaxError ? 'Custom fields must contain valid JSON.' : value instanceof Error ? value.message : 'Unable to create vehicle.') } finally { setSubmitting(false) }
  }

  return <form className="vehicle-compose-form" onSubmit={submit}><div className="vehicle-form-body"><section className="vehicle-image-upload"><span className="vehicle-image-preview" style={photoPreview ? { backgroundImage: `url("${photoPreview}")` } : undefined}>{!photoPreview && <Truck />}</span><div><strong>Vehicle image</strong><label><ImagePlus />{photo ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={choosePhoto} /></label><small>{photo ? `${photo.name} · ${(photo.size / 1024).toFixed(0)} KB` : 'Supports PNG, JPEG, GIF and WebP up to 10 MB'}</small></div>{photo && <button type="button" onClick={() => setPhoto(null)}>Remove</button>}</section>
    {sections.map(section => <details className="vehicle-form-section" open={section.open} key={section.title}><summary>{section.title}<ChevronDown /></summary>{section.subtitle && <p>{section.subtitle}</p>}<div className="vehicle-form-grid">{section.fields.map(field => <label key={field.name}><span>{field.label}{field.required ? ' *' : ''}</span><FieldControl field={field} drivers={drivers} /></label>)}</div>{section.title === 'Details' && <VehicleLocationPicker />}{section.title === 'Technical specifications' && <div className="vehicle-checks"><label><input type="checkbox" name="dpf_equipped" /> DPF equipped</label><label><input type="checkbox" name="scr_equipped" /> SCR equipped</label></div>}</details>)}
    <details className="vehicle-form-section"><summary>Avatar<ChevronDown /></summary><div className="vehicle-avatar-picker"><span style={avatar ? { backgroundImage: `url("${avatar}")` } : undefined}>{!avatar && <Truck />}</span><label><b>Select map avatar</b><select name="avatar_url" value={avatar} onChange={event => setAvatar(event.target.value)}>{avatarOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></details><MetadataEditor />{error && <div className="modal-form-error" role="alert">{error}</div>}</div><footer><button type="button" className="secondary" onClick={onCancel} disabled={submitting}>Cancel</button><button className="primary" type="submit" disabled={submitting}>{submitting ? photo ? 'Uploading & creating…' : 'Creating…' : 'Create vehicle'}</button></footer></form>
}
