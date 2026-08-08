'use client'

import Link from 'next/link'
import {
  Banknote, ChartNoAxesCombined, ChevronDown, CircleDollarSign, Clock3, FileChartColumn,
  FileClock, MoreHorizontal, ReceiptText, RefreshCw, WalletCards,
} from 'lucide-react'

const metrics = [
  { label: 'Revenue', value: '$0.00', icon: CircleDollarSign, tone: 'mint', change: '↓ -100%', changeTone: 'negative' },
  { label: 'Expenses', value: '$0.00', icon: ReceiptText, tone: 'rose', change: '— Current' },
  { label: 'Net Income', value: '$0.00', icon: ChartNoAxesCombined, tone: 'blue', change: '↓ -100%', changeTone: 'negative' },
  { label: 'Outstanding AR', value: '$0.00', icon: FileChartColumn, tone: 'amber', change: '— Current' },
  { label: 'Overdue AR', value: '$0.00', icon: Clock3, tone: 'rose', change: '— Current' },
  { label: 'Open Invoices', value: '0', icon: FileClock, tone: 'amber', change: '— Current' },
  { label: 'Wallet Balance', value: '$0.00', icon: WalletCards, tone: 'violet', change: '— Current' },
  { label: 'Active Wallets', value: '33', icon: WalletCards, tone: 'blue', change: '— Current' },
]

const activity = [
  ['Storefront sale reversal - Order order_htwlocwfmc canceled', 'Jul 27, 2026 · Sales Revenue / Cash', '$71.30'],
  ['Storefront sale - Order order_vpfihbkpj9', 'Jul 27, 2026 · Cash / Sales Revenue', '$56.50'],
  ['Storefront sale - Order order_20j2n9ikow', 'Jul 27, 2026 · Cash / Sales Revenue', '$136.75'],
  ['Storefront sale - Order order_1qi1tptv43', 'Jul 27, 2026 · Cash / Sales Revenue', '$71.30'],
]

function RefreshButton() {
  return <button className="ledger-refresh" aria-label="Refresh section" onClick={(event) => {
    const button = event.currentTarget
    button.classList.remove('refreshing')
    requestAnimationFrame(() => button.classList.add('refreshing'))
  }}><RefreshCw /></button>
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header><div><h2>{title}</h2><p>{subtitle}</p></div><RefreshButton /></header>
}

export function LedgerDashboard() {
  return <div className="ledger-page ledger-dashboard">
    <header className="ledger-page-header">
      <h1>Ledger Dashboard</h1>
      <div className="ledger-header-controls">
        <button>2026-08-01, 2026-08-07</button>
        <button>Ledger Dashboard <ChevronDown /></button>
        <button aria-label="More dashboard options"><MoreHorizontal /></button>
      </div>
    </header>

    <div className="ledger-dashboard-body">
      <section className="ledger-metrics" aria-label="Ledger summary">
        {metrics.map(({ label, value, icon: Icon, tone, change, changeTone }) => <article className={`ledger-metric ${tone}`} key={label}>
          <div><span>{label}</span><strong>{value}</strong></div>
          <i><Icon /></i>
          <small>vs previous period</small>
          <b className={changeTone || ''}>{change}</b>
        </article>)}
      </section>

      <section className="ledger-chart-grid">
        <article className="ledger-panel ledger-chart-panel">
          <PanelHeader title="Revenue Trend" subtitle="0.00 US$ revenue · 0.00 US$ net" />
          <div className="revenue-chart" aria-label="Revenue and expense trend chart">
            <div className="chart-y"><span>1.00 US$</span><span>0.80 US$</span><span>0.60 US$</span><span>0.40 US$</span><span>0.20 US$</span><span>0.00 US$</span></div>
            <div className="chart-plot"><i /><i /><i /><i /><i /><i /><b /></div>
            <div className="chart-x"><span>2026-08-01</span><span>2026-08-03</span><span>2026-08-05</span><span>2026-08-07</span></div>
            <div className="chart-legend"><span><i className="revenue" />Revenue</span><span><i className="expense" />Expenses</span></div>
          </div>
        </article>
        <article className="ledger-panel ledger-chart-panel">
          <PanelHeader title="Cash Flow Summary" subtitle="$0.00 net cash change" />
          <div className="cash-chart" aria-label="Cash flow summary chart"><span>1</span><span>0</span><div><i /><i /></div><footer><b>Operating</b><b>Financing</b><b>Investing</b></footer></div>
        </article>
      </section>

      <section className="ledger-analysis-grid">
        <article className="ledger-panel ledger-invoice-pipeline"><PanelHeader title="Invoice Pipeline" subtitle="0 invoices · open balance tracked by status" /><div className="ledger-empty">No invoices yet.</div></article>
        <article className="ledger-panel ledger-aging"><PanelHeader title="AR Aging Risk" subtitle="0 open invoices" /><div className="aging-bars">
          {[['Current', 'green'], ['1–30 days', 'blue'], ['31–60 days', 'orange'], ['61–90 days', 'red']].map(([label, color]) => <div key={label}><p><strong>{label}</strong><span>0 invoices</span></p><i><b className={color} /></i></div>)}
        </div></article>
        <article className="ledger-panel ledger-wallets"><PanelHeader title="Wallet Balances" subtitle="Grouped by currency with top active wallets" /><div className="currency-row"><div><strong>USD</strong><span>33 wallets</span></div><b>$0.00</b></div><div className="top-wallets"><h3>TOP WALLETS</h3>{['Droo Logistics', 'Daniel Martin', 'Demo Customer'].map((name, index) => <p key={name}><span>{index + 1}</span><strong>{name}</strong><b>$0.00</b></p>)}</div></article>
      </section>

      <section className="ledger-bottom-grid">
        <article className="ledger-panel ledger-activity"><PanelHeader title="Recent Financial Activity" subtitle="Latest journal entries posted to the ledger" /><div>{activity.map(([title, detail, amount]) => <div className="activity-row" key={title}><i><ReceiptText /></i><p><strong>{title}</strong><span>{detail}</span></p><b>{amount}</b></div>)}</div></article>
        <article className="ledger-panel ledger-reports"><header><div><h2>Financial Reports</h2><p>Jump into the source reports behind the dashboard</p></div><FileChartColumn /></header><nav>
          <Link href="/earnings"><ChartNoAxesCombined />Income Statement</Link><Link href="/earnings"><Banknote />Cash Flow</Link><Link href="/earnings"><Clock3 />AR Aging</Link><Link href="/earnings"><WalletCards />Wallet Summary</Link>
        </nav></article>
      </section>
    </div>
  </div>
}
