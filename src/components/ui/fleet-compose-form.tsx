'use client'

import { useState, type FormEvent } from 'react'
import { fetchAuthenticated, useApiData } from '@/hooks/use-api-data'

function optional(data: FormData, name: string) {
  const value = String(data.get(name) || '').trim()
  return value || null
}

function fleetError(status: number, body: { title?: string; detail?: string } | null) {
  if (status === 403) return 'Only organization owners and admins can create fleets.'
  if (status === 409) return 'A fleet with this name already exists.'
  if (status === 422) return 'Check the fleet name and selected assignments.'
  return body?.detail || body?.title || `Unable to create fleet (${status}).`
}

export function FleetComposeForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const { rows: fleets } = useApiData('Fleets', undefined, false)
  const { rows: serviceAreas } = useApiData('Service Areas', undefined, false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const fleet = {
      name: String(data.get('name') || '').trim(),
      parent_fleet_id: optional(data, 'parent_fleet_id'),
      vendor_id: null,
      service_area_id: optional(data, 'service_area_id'),
      zone: optional(data, 'zone'),
      status: String(data.get('status') || 'active'),
      task: optional(data, 'task'),
    }
    try {
      const response = await fetchAuthenticated('/v1/admin/fleets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fleet }) })
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null
        throw new Error(fleetError(response.status, problem))
      }
      onCreated()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to create fleet.')
    } finally {
      setSubmitting(false)
    }
  }

  return <form className="fleet-compose-form" onSubmit={submit}>
    <div className="fleet-form-body">
      <details className="fleet-form-section" open>
        <summary>Fleet details</summary>
        <div className="fleet-form-grid">
          <label className="wide"><span>Fleet name *</span><input name="name" required minLength={2} maxLength={120} autoFocus placeholder="Fleet name" /></label>
          <label><span>Parent fleet</span><select name="parent_fleet_id" defaultValue=""><option value="">No parent fleet</option>{fleets.map(fleet => <option key={String(fleet.id)} value={String(fleet.id)}>{String(fleet.name || fleet.id)}</option>)}</select></label>
          <label><span>Vendor</span><select disabled aria-label="Vendor"><option>Not available yet</option></select><small>Vendor API is not available in the backend yet.</small></label>
          <label><span>Assign to service area</span><select name="service_area_id" defaultValue=""><option value="">No service area</option>{serviceAreas.map(area => <option key={String(area.id)} value={String(area.id)}>{String(area.name || area.id)}</option>)}</select></label>
          <label><span>Status</span><select name="status" defaultValue="active"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label><span>Zone</span><input name="zone" maxLength={120} placeholder="Operational zone" /></label>
          <label><span>Task / mission</span><input name="task" maxLength={160} placeholder="Task or mission" /></label>
        </div>
      </details>
      {error && <div className="modal-form-error" role="alert">{error}</div>}
    </div>
    <footer><button type="button" className="secondary" onClick={onCancel} disabled={submitting}>Cancel</button><button className="primary" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create fleet'}</button></footer>
  </form>
}
