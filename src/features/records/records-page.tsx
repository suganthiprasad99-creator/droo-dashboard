'use client'

import { useState } from 'react'
import { AlertCircle, Download, Search } from 'lucide-react'
import { useApiData } from '@/hooks/use-api-data'
import { modules } from '@/lib/dashboard-config'
import type { ModuleName } from '@/types/dashboard'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import type { ApiRecord } from '@/types/dashboard'

export function RecordsPage({ module }: { module: ModuleName }) {
  const { rows, loading, error, refresh } = useApiData(module, undefined, module !== 'Drivers' && module !== 'Vehicles')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const keys = rows.length ? Object.keys(rows[0]).filter(key => !['stops', 'items', 'documents', 'polygon', 'requirements', 'events'].includes(key)).slice(0, 6) : ['id', 'status', 'name', 'type', 'updated_at']
  const statuses = [...new Set(rows.map(row => String(row.status || '')).filter(Boolean))]
  const filtered = rows.filter(row => (!status || row.status === status) && (!search || JSON.stringify(row).toLowerCase().includes(search.toLowerCase())))
  const columns: DataTableColumn<ApiRecord>[] = keys.map(key => ({
    key,
    header: key.replaceAll('_', ' '),
    className: key === 'id' ? 'order-id' : undefined,
    render: row => key === 'status' ? <StatusBadge value={String(row[key] || 'unknown')} /> : typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '—'),
  }))
  function exportRows() {
    const csv = [keys.join(','), ...filtered.map(row => keys.map(key => JSON.stringify(typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key] ?? '')).join(','))].join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `droo-${module.toLowerCase().replaceAll(' ', '-')}.csv`; link.click(); URL.revokeObjectURL(link.href)
  }
  return <><PageHeader config={modules[module]} onCreated={refresh} /><section className="panel data operations-records-panel"><div className="tools"><label><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${module.toLowerCase()}`} /></label><select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select><button className="secondary" disabled={!filtered.length} onClick={exportRows}><Download />Export CSV</button></div>{rows.length ? <DataTable rows={filtered} columns={columns} rowKey={(row) => String(row.id)} className="orders-reference-table operations-records-table" emptyMessage="No records match the current filters." /> : <EmptyState loading={loading} error={error} />}<div className="notice"><AlertCircle /><p><strong>OpenAPI-first module</strong><span>Only operations supported by Droo V1 are enabled.</span></p></div></section></>
}
