'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ListFilter, Plus, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'

const invoiceColumns = ['Number', 'Customer', 'Order', 'Status', 'Total', 'Currency', 'Balance', 'Due Date', 'Invoice Date', 'Created']
const templateColumns = ['Name', 'Description', 'Orientation', 'Default', 'Created']

export function LedgerRecords({ type }: { type: 'invoices' | 'templates' }) {
  const [query, setQuery] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const title = type === 'invoices' ? 'Invoices' : 'Invoice Templates'
  const columns = useMemo(() => type === 'invoices' ? invoiceColumns : templateColumns, [type])

  return <div className="ledger-page ledger-records-page">
    <header className="ledger-records-header"><h1>{title}</h1><div>
      <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title}`} /></label>
      <button className={showFilter ? 'active' : ''} aria-label="Filter" onClick={() => setShowFilter((current) => !current)}><ListFilter /></button>
      <button aria-label="Display settings"><SlidersHorizontal /></button>
      <button aria-label="Refresh"><RefreshCw /></button>
      <button className="ledger-new" onClick={() => setShowNew(true)}><Plus /> New</button>
    </div></header>
    {showFilter && <div className="ledger-filter-popover"><strong>Filters</strong><span>No filters are available until records exist.</span><button onClick={() => setShowFilter(false)}>Done</button></div>}
    <div className="ledger-records-table-wrap"><table className="ledger-records-table"><thead><tr><th><input type="checkbox" aria-label="Select all" /></th>{columns.map(column => <th key={column}><span>{column}</span><i><b>◆</b></i></th>)}</tr></thead></table></div>
    <div className="ledger-no-records">{query ? `No ${title.toLowerCase()} match “${query}”` : 'No records found'}</div>
    <footer className="ledger-pagination"><span>Showing 1 to 1 of 0 results</span><div><button disabled aria-label="Previous page"><ChevronLeft /></button><b>1</b><button disabled aria-label="Next page"><ChevronRight /></button></div></footer>

    {showNew && <div className="ledger-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNew(false) }}><section role="dialog" aria-modal="true" aria-label={`New ${title}`}>
      <header><div><h2>New {type === 'invoices' ? 'Invoice' : 'Invoice Template'}</h2><p>Create a new {type === 'invoices' ? 'customer invoice' : 'reusable invoice layout'}.</p></div><button onClick={() => setShowNew(false)} aria-label="Close"><X /></button></header>
      <div className="ledger-modal-fields"><label><span>{type === 'invoices' ? 'Customer' : 'Template name'}</span><input autoFocus placeholder={type === 'invoices' ? 'Select a customer' : 'Standard invoice'} /></label><label><span>{type === 'invoices' ? 'Currency' : 'Orientation'}</span><select><option>{type === 'invoices' ? 'USD' : 'Portrait'}</option><option>{type === 'invoices' ? 'EUR' : 'Landscape'}</option></select></label></div>
      <footer><button onClick={() => setShowNew(false)}>Cancel</button><button className="primary" onClick={() => setShowNew(false)}>Create</button></footer>
    </section></div>}
  </div>
}
