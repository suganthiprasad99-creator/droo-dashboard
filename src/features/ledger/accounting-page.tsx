'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronLeft, ChevronRight, ListFilter, Plus, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'
import { FloatingPageHeader } from '@/components/ui/floating-page-header'

type Account = { name: string; code: string; type: 'Asset' | 'Liability' | 'Equity' | 'Expense' | 'Revenue'; balance: string; entries?: number }

const accounts: Account[] = [
  { name: 'Accounts Payable', code: 'AP-DEFAULT', type: 'Liability', balance: '$0.00' },
  { name: 'Accounts Receivable', code: 'AR-DEFAULT', type: 'Asset', balance: '$0.00' },
  { name: 'Bank Account', code: 'BANK-DEFAULT', type: 'Asset', balance: '$0.00' },
  { name: 'Cash', code: 'CASH-DEFAULT', type: 'Asset', balance: '$2,740.90', entries: 31 },
  { name: 'Customer Credit Liability', code: 'CUSTOMER-CREDIT', type: 'Liability', balance: '$0.00' },
  { name: 'Deferred Revenue', code: 'DEFERRED-REVENUE', type: 'Liability', balance: '$0.00' },
  { name: 'Driver Earnings Payable', code: 'DRIVER-PAYABLE', type: 'Liability', balance: '$0.00' },
  { name: "Owner's Equity", code: 'EQUITY-DEFAULT', type: 'Equity', balance: '$0.00' },
  { name: 'Driver Payout Expense', code: 'EXPENSE-DRIVER-PAYOUT', type: 'Expense', balance: '$0.00' },
  { name: 'Payment Gateway Fees', code: 'EXPENSE-GATEWAY-FEES', type: 'Expense', balance: '$0.00' },
  { name: 'Other Operating Expenses', code: 'EXPENSE-OTHER', type: 'Expense', balance: '$0.00' },
  { name: 'Refunds & Chargebacks', code: 'EXPENSE-REFUNDS', type: 'Expense', balance: '$0.00' },
  { name: 'Wallet Expenses', code: 'EXPENSE-WALLET', type: 'Expense', balance: '$0.00' },
  { name: 'Payment Gateway Clearing', code: 'GATEWAY-CLEARING', type: 'Asset', balance: '$0.00' },
  { name: 'Prepaid Expenses', code: 'PREPAID-DEFAULT', type: 'Asset', balance: '$0.00' },
  { name: 'Retained Earnings', code: 'RETAINED-EARNINGS', type: 'Equity', balance: '$0.00' },
  { name: 'Sales Revenue', code: 'REV-DEFAULT', type: 'Revenue', balance: '$2,740.90' },
  { name: 'Delivery Revenue', code: 'REVENUE-DELIVERY', type: 'Revenue', balance: '$0.00' },
  { name: 'Other Revenue', code: 'REVENUE-OTHER', type: 'Revenue', balance: '$0.00' },
  { name: 'Taxes Payable', code: 'TAX-PAYABLE', type: 'Liability', balance: '$0.00' },
  { name: 'Payroll Expense', code: 'EXPENSE-PAYROLL', type: 'Expense', balance: '$0.00' },
  { name: 'Fuel Expense', code: 'EXPENSE-FUEL', type: 'Expense', balance: '$0.00' },
  { name: 'Maintenance Expense', code: 'EXPENSE-MAINTENANCE', type: 'Expense', balance: '$0.00' },
  { name: 'Undeposited Funds', code: 'UNDEPOSITED-FUNDS', type: 'Asset', balance: '$0.00' },
  { name: 'Opening Balance Equity', code: 'OPENING-BALANCE', type: 'Equity', balance: '$0.00' },
]

const journalAmounts = ['$71.30', '$56.50', '$136.75', '$71.30', '$80.55', '$109.00', '$102.00', '$52.40', '$148.55', '$86.50', '$79.75', '$85.20', '$114.55', '$64.00', '$136.75', '$71.30', '$71.80', '$109.00', '$108.25', '$93.45', '$117.65', '$68.60', '$142.20', '$59.75', '$121.40', '$76.90', '$110.80', '$97.35', '$129.90', '$74.25', '$83.10']
const journals = journalAmounts.map((amount, index) => ({
  number: `JE-${String(31 - index).padStart(4, '0')}`,
  type: index === 0 ? 'Storefront Sale Reversal' : 'Storefront Sale',
  amount,
  muted: index === 6,
  debit: index === 0 ? 'REV-DEFAULT' : 'CASH-DEFAULT',
  credit: index === 0 ? 'CASH-DEFAULT' : 'REV-DEFAULT',
}))

function StatusPill({ children }: { children: React.ReactNode }) {
  return <span className="accounting-status">{children}</span>
}

function AccountingTools({ title, query, setQuery, onNew }: { title: string; query: string; setQuery: (value: string) => void; onNew?: () => void }) {
  return <FloatingPageHeader title={title} className="ledger-records-header accounting-header">
    <label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${title}`} /></label>
    <button aria-label="Filter"><ListFilter /></button><button aria-label="Display settings"><SlidersHorizontal /></button><button aria-label="Refresh"><RefreshCw /></button>
    {onNew && <button className="ledger-new" onClick={onNew}><Plus />New</button>}
  </FloatingPageHeader>
}

function Pagination({ count, pages = 1 }: { count: number; pages?: number }) {
  return <footer className="ledger-pagination accounting-pagination"><span>Showing 1 to {Math.min(30, count)} of {count} results</span><div><button disabled aria-label="Previous page"><ChevronLeft /></button><b>1</b>{pages > 1 && <b>2</b>}<button disabled aria-label="Next page"><ChevronRight /></button></div></footer>
}

export function AccountsPage({ creating = false }: { creating?: boolean }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const visible = useMemo(() => accounts.filter(account => `${account.name} ${account.code} ${account.type}`.toLowerCase().includes(query.toLowerCase())), [query])
  return <div className={`ledger-page accounting-page ${creating ? 'has-accounting-drawer' : ''}`}>
    <AccountingTools title="Accounts" query={query} setQuery={setQuery} onNew={() => router.push('/ledger/accounting/accounts/new')} />
    <div className="accounting-table-wrap"><table className="accounting-table accounts-table"><thead><tr><th><input type="checkbox" aria-label="Select all accounts" /></th>{['Name', 'Code', 'Type', 'Currency', 'Balance', 'Status'].map(label => <th key={label}><span>{label}</span><i>◆</i></th>)}</tr></thead><tbody>
      {visible.map(account => <tr key={account.code}><td><input type="checkbox" aria-label={`Select ${account.name}`} /></td><td>{account.name}</td><td>{account.code}</td><td>{account.type}</td><td>USD</td><td>{account.balance}</td><td><StatusPill>Active</StatusPill></td></tr>)}
    </tbody></table></div>
    <Pagination count={visible.length} />
    {creating && <AccountDrawer onClose={() => router.push('/ledger/accounting/accounts')} />}
  </div>
}

function DrawerShell({ title, action, onClose, onSubmit, children }: { title: string; action: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: React.ReactNode }) {
  return <aside className="accounting-drawer" aria-label={title}><form onSubmit={onSubmit}><header><h2>{title}</h2><button type="submit" className="accounting-create"><Check />{action}</button><button type="button" className="accounting-close" onClick={onClose} aria-label={`Close ${title}`}><X /></button></header><div className="accounting-drawer-body">{children}</div></form></aside>
}

function AccountDrawer({ onClose }: { onClose: () => void }) {
  return <DrawerShell title="Create New Account" action="Create Ledger Account" onClose={onClose} onSubmit={event => { event.preventDefault(); onClose() }}>
    <details open><summary>Account Details <ChevronDown /></summary><section><h3>Account Information</h3><div className="accounting-form-grid"><label className="wide"><span>Account Name</span><input required placeholder="e.g. Cash and Cash Equivalents" /></label><label><span>Account Code</span><input required placeholder="e.g. 1000" /></label><label><span>Account Type</span><select defaultValue="Asset"><option>Asset</option><option>Liability</option><option>Equity</option><option>Expense</option><option>Revenue</option></select></label><label><span>Currency</span><select defaultValue="USD"><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select></label><label><span>Status</span><select defaultValue="Active"><option>Active</option><option>Inactive</option></select></label></div><h3>Description</h3><label className="accounting-textarea"><span>Description</span><textarea placeholder="Optional description of this account…" /></label></section></details>
  </DrawerShell>
}

export function JournalPage({ creating = false }: { creating?: boolean }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const visible = useMemo(() => journals.filter(row => `${row.number} ${row.type} ${row.amount} ${row.debit} ${row.credit}`.toLowerCase().includes(query.toLowerCase())), [query])
  return <div className={`ledger-page accounting-page ${creating ? 'has-accounting-drawer' : ''}`}>
    <AccountingTools title="Journal Entries" query={query} setQuery={setQuery} onNew={() => router.push('/ledger/accounting/journal/new')} />
    <div className="accounting-table-wrap"><table className="accounting-table journal-table"><thead><tr><th><input type="checkbox" aria-label="Select all journal entries" /></th>{['Number', 'Date', 'Type', 'Status', 'Amount', 'Debit Account', 'Credit Account'].map(label => <th key={label}><span>{label}</span><i>◆</i></th>)}</tr></thead><tbody>
      {visible.map(row => <tr key={row.number} className={row.muted ? 'muted' : ''}><td><input type="checkbox" aria-label={`Select ${row.number}`} /></td><td>{row.number}</td><td>Jul 27, 2026 05:30</td><td>{row.type}</td><td><StatusPill>Posted</StatusPill></td><td>{row.amount}</td><td>{row.debit}</td><td>{row.credit}</td></tr>)}
    </tbody></table></div>
    <Pagination count={visible.length} pages={2} />
    {creating && <JournalDrawer onClose={() => router.push('/ledger/accounting/journal')} />}
  </div>
}

function JournalDrawer({ onClose }: { onClose: () => void }) {
  return <DrawerShell title="Create Journal Entry" action="Create Ledger Journal" onClose={onClose} onSubmit={event => { event.preventDefault(); onClose() }}>
    <details open><summary>Journal Entry <ChevronDown /></summary><section><h3>Entry Information</h3><div className="accounting-form-grid"><label><span>Entry Number</span><input required placeholder="e.g. JE-0001" /></label><label><span>Entry Date</span><input required type="date" /></label><label><span>Type</span><select defaultValue="Standard"><option>Standard</option><option>Adjustment</option><option>Reversal</option></select></label><label><span>Currency</span><select defaultValue="USD"><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select></label><label className="wide"><span>Amount</span><div className="amount-input"><b>🇺🇸</b><input required inputMode="decimal" defaultValue="0.00" /></div></label></div></section></details>
    <details open><summary>Double-Entry <ChevronDown /></summary><section><h3>Debit Account</h3><div className="accounting-form-grid"><label><span>Debit Account</span><select required defaultValue=""><option value="" disabled>Select debit account</option>{accounts.map(account => <option key={account.code}>{account.name}</option>)}</select></label><label><span>Debit Account Code</span><input placeholder="e.g. 1000" /></label></div><h3>Credit Account</h3><div className="accounting-form-grid"><label><span>Credit Account</span><select required defaultValue=""><option value="" disabled>Select credit account</option>{accounts.map(account => <option key={account.code}>{account.name}</option>)}</select></label><label><span>Credit Account Code</span><input placeholder="e.g. 2000" /></label></div></section></details>
    <details open><summary>Description <ChevronDown /></summary><section><label className="accounting-textarea"><span>Description</span><textarea placeholder="Describe the purpose of this journal entry…" /></label></section></details>
  </DrawerShell>
}

export function GeneralLedgerPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All Types')
  const [expanded, setExpanded] = useState<string | null>(null)
  const visible = accounts.filter(account => (type === 'All Types' || account.type === type) && `${account.name} ${account.code}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="ledger-page general-ledger-page"><FloatingPageHeader title="General Ledger" className="general-ledger-header"><label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Select date range" /></label><select value={type} onChange={event => setType(event.target.value)}><option>All Types</option><option>Asset</option><option>Liability</option><option>Equity</option><option>Expense</option><option>Revenue</option></select><button aria-label="More filters"><ChevronDown /></button></FloatingPageHeader><section className="general-ledger-list">
    {visible.map(account => <article key={account.code} className={expanded === account.code ? 'expanded' : ''}><button onClick={() => setExpanded(current => current === account.code ? null : account.code)} aria-expanded={expanded === account.code}><ChevronRight /><code>{account.code}</code><strong>{account.name}</strong><span className={`account-type ${account.type.toLowerCase()}`}>{account.type}</span><small>{account.entries ? `${account.entries} entries` : ''}</small><b>{account.balance}</b></button>{expanded === account.code && <div className="ledger-account-detail"><span>Opening balance</span><b>{account.balance}</b><span>Current balance</span><b>{account.balance}</b></div>}</article>)}
  </section></div>
}
