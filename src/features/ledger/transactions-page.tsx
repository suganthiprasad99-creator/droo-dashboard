'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, ListFilter, MoreHorizontal, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'

type Transaction = {
  slug: string
  id: string
  amount: string
  status: 'Success' | 'Voided'
  muted?: boolean
}

const ids = [
  'transaction_yp2udnvlwa', 'transaction_6duzgltuzm', 'transaction_dk9jzm6ooq', 'transaction_ndfeqdrmal',
  'transaction_iixi4snjrr', 'transaction_3hbpu1zv9s', 'transaction_ees8y92zrq', 'transaction_jc6ffb75yv',
  'transaction_lgdm78e7lv', 'transaction_tlyumbtrlh', 'transaction_gjuakip8yi', 'transaction_5qi6ffwvno',
  'transaction_lgszgvv1rw', 'transaction_vxo1odl2mq', 'transaction_7fod4iksap', 'transaction_pqzmr9nk1e',
  'transaction_51gynlbvqu', 'transaction_alxapafrip', 'transaction_qdsvjichls', 'transaction_29nr8ewlca',
  'transaction_8doym5ttue', 'transaction_lj4p7xwqsn', 'transaction_ua9crg0vki', 'transaction_hx6d3npmwy',
  'transaction_k4q7bce12a', 'transaction_zp8tm6jvwr', 'transaction_n1sy5gduoq', 'transaction_b7l3cavx9e',
  'transaction_f0wp2kri6n', 'transaction_m5xq8sje3t',
]
const amounts = ['$71.30', '$56.50', '$136.75', '$71.30', '$80.55', '$109.00', '$102.00', '$52.40', '$148.55', '$86.50', '$79.75', '$85.20', '$114.55', '$64.00', '$136.75', '$108.25', '$71.80', '$93.45', '$108.25', '$76.90', '$121.40', '$59.75', '$142.20', '$68.60', '$97.35', '$110.80', '$74.25', '$129.90', '$83.10', '$117.65']

const transactions: Transaction[] = ids.map((id, index) => ({
  id,
  slug: index === 0 ? '578f8f8d-3839-4e2b-9dc2-c4ad00fb6877' : id,
  amount: amounts[index],
  status: index === 0 ? 'Voided' : 'Success',
  muted: index === 5,
}))

const columns = ['ID', 'Date', 'Description', 'Type', 'Direction', 'Amount', 'Status']

export function TransactionsPage({ selectedId }: { selectedId?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [status, setStatus] = useState<'All' | 'Success' | 'Voided'>('All')
  const visibleRows = useMemo(() => transactions.filter(row => {
    const matchesQuery = !query || `${row.id} Storefront demo order storefront Credit ${row.amount} ${row.status}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (status === 'All' || row.status === status)
  }), [query, status])
  const selected = transactions.find(row => row.slug === selectedId || row.id === selectedId) || (selectedId ? transactions[0] : undefined)

  const openTransaction = (row: Transaction) => router.push(`/ledger/payments/transactions/${row.slug}`)

  return <div className={`ledger-page transactions-page ${selected ? 'has-transaction-drawer' : ''}`}>
    <header className="ledger-records-header transactions-header"><h1>Transactions</h1><div>
      <label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Transactions" /></label>
      <button className={filterOpen ? 'active' : ''} aria-label="Filter" onClick={() => setFilterOpen(current => !current)}><ListFilter /></button>
      <button aria-label="Display settings"><SlidersHorizontal /></button>
      <button aria-label="Refresh"><RefreshCw /></button>
    </div></header>
    {filterOpen && <div className="transaction-filter"><strong>Status</strong>{(['All', 'Success', 'Voided'] as const).map(option => <button className={status === option ? 'active' : ''} key={option} onClick={() => { setStatus(option); setFilterOpen(false) }}>{option}</button>)}</div>}
    <div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th><input type="checkbox" aria-label="Select all transactions" /></th>{columns.map(column => <th key={column}><span>{column}</span><i>◆</i></th>)}<th /></tr></thead><tbody>
      {visibleRows.map(row => <tr key={row.id} className={row.muted ? 'muted' : ''} onClick={() => openTransaction(row)}>
        <td onClick={event => event.stopPropagation()}><input type="checkbox" aria-label={`Select ${row.id}`} /></td><td>{row.id}</td><td>Jul 1, 2026 13:30</td><td>Storefront demo order</td><td>storefront</td><td>Credit</td><td>{row.amount}</td><td><span className={`transaction-status ${row.status.toLowerCase()}`}>{row.status}</span></td><td><button aria-label={`Open ${row.id}`} onClick={event => { event.stopPropagation(); openTransaction(row) }}><MoreHorizontal /></button></td>
      </tr>)}
    </tbody></table></div>
    {!visibleRows.length && <div className="transaction-empty">No matching transactions</div>}
    <footer className="ledger-pagination transaction-pagination"><span>Showing 1 to {visibleRows.length} of {visibleRows.length} results</span><div><button disabled aria-label="Previous page"><ChevronLeft /></button><b>1</b><button disabled aria-label="Next page"><ChevronRight /></button></div></footer>
    {selected && <TransactionDrawer transaction={selected} onClose={() => router.push('/ledger/payments/transactions')} />}
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="transaction-field"><strong>{label}</strong><span>{children}</span></div>
}

function TransactionDrawer({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  return <aside className="transaction-drawer" aria-label="Transaction details">
    <header><div><h2>{transaction.id}</h2><p><span className="transaction-status voided">Voided</span><b>Storefront</b></p></div><div><strong>+{transaction.amount}</strong><span>USD</span></div><button onClick={onClose} aria-label="Close transaction details"><X /></button></header>
    <nav><button className="active">Overview</button></nav>
    <div className="transaction-drawer-body">
      <details open><summary>Transaction Details <ChevronDown /></summary><section><h3>Transaction Information</h3><div className="transaction-fields">
        <Field label="Reference ID"><code>{transaction.id}</code></Field><Field label="Status"><span className="transaction-status voided">voided</span></Field><Field label="Type">Storefront</Field><Field label="Direction">Credit</Field><Field label="Gateway">cash</Field><Field label="Gateway Transaction ID"><code>sf-demo-completed-order-16</code></Field><Field label="Payment Method">-</Field><Field label="Card">-</Field><Field label="Reference">-</Field><Field label="Date">Jul 1, 2026 13:30</Field>
      </div><h3>Amounts</h3><div className="transaction-fields"><Field label="Amount"><b>{transaction.amount}</b></Field><Field label="Currency">USD</Field><Field label="Fee">$0.00</Field><Field label="Tax">$0.00</Field><Field label="Net Amount"><b>$0.00</b></Field><Field label="Balance After">$0.00</Field></div><h3>Settlement</h3><div className="transaction-fields"><Field label="Exchange Rate">1.00000000</Field><Field label="Settled Currency">-</Field><Field label="Settled Amount">$0.00</Field><Field label="Settled At">-</Field></div></section></details>
      <details open><summary>Parties <ChevronDown /></summary><section className="transaction-fields"><Field label="Payer">-</Field><Field label="Payee">-</Field><Field label="Initiated By">-</Field><Field label="IP Address">-</Field></section></details>
      <details open><summary>Description &amp; Notes <ChevronDown /></summary><section className="transaction-fields"><Field label="Description">Storefront demo order</Field></section></details>
      <details open><summary>Record Info <ChevronDown /></summary><section className="transaction-fields"><Field label="Created">Jul 1, 2026 13:30</Field><Field label="Last Updated">Jul 27, 2026 17:01</Field></section></details>
    </div>
  </aside>
}

export function PaymentPlaceholder({ title }: { title: string }) {
  return <div className="ledger-page ledger-records-page"><header className="ledger-records-header"><h1>{title}</h1></header><div className="ledger-no-records">No records found</div></div>
}
