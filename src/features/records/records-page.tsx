'use client'

import { useState } from 'react'
import { AlertCircle, Download, Search } from 'lucide-react'
import { useApiData } from '@/hooks/use-api-data'
import { modules } from '@/lib/dashboard-config'
import type { ModuleName } from '@/types/dashboard'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'

export function RecordsPage({ module }: { module: ModuleName }) {
  const { rows, loading, error } = useApiData(module)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const keys = rows.length ? Object.keys(rows[0]).filter(key => !['stops', 'items', 'documents', 'polygon', 'requirements', 'events'].includes(key)).slice(0, 6) : ['id', 'status', 'name', 'type', 'updated_at']
  const statuses = [...new Set(rows.map(row => String(row.status || '')).filter(Boolean))]
  const filtered = rows.filter(row => (!status || row.status === status) && (!search || JSON.stringify(row).toLowerCase().includes(search.toLowerCase())))
  function exportRows() {
    const csv = [keys.join(','), ...filtered.map(row => keys.map(key => JSON.stringify(typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key] ?? '')).join(','))].join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `droo-${module.toLowerCase().replaceAll(' ', '-')}.csv`; link.click(); URL.revokeObjectURL(link.href)
  }
  return <><PageHeader config={modules[module]} /><section className="panel data"><div className="tools"><label><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${module.toLowerCase()}`} /></label><select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select><button className="secondary" disabled={!filtered.length} onClick={exportRows}><Download />Export CSV</button></div>{rows.length ? <div className="table-wrap"><table><thead><tr>{keys.map(key => <th key={key}>{key.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{filtered.map((row, index) => <tr key={String(row.id || index)}>{keys.map(key => <td key={key}>{key === 'status' ? <StatusBadge value={String(row[key] || 'unknown')} /> : typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '—')}</td>)}</tr>)}</tbody></table>{!filtered.length && <EmptyState loading={false} error="No records match the current filters." />}</div> : <EmptyState loading={loading} error={error} />}<div className="notice"><AlertCircle /><p><strong>OpenAPI-first module</strong><span>Only operations supported by Droo V1 are enabled.</span></p></div></section></>
}
