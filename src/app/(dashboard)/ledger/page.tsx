const metrics = [
  ['Revenue', '$0.00'], ['Expenses', '$0.00'], ['Net income', '$0.00'], ['Outstanding AR', '$0.00'],
  ['Overdue AR', '$0.00'], ['Open invoices', '0'], ['Wallet balance', '$0.00'], ['Active wallets', '16'],
]

export default function LedgerPage() {
  return <div>
    <header className="page-title"><div><h1>Ledger Dashboard</h1><p>Monitor billing, cash flow and account balances.</p></div></header>
    <section className="metrics">
      {metrics.map(([label, value]) => <article key={label}><p><span>{label}</span><strong>{value}</strong><small>vs previous period · Current</small></p></article>)}
    </section>
    <section className="grid">
      <article className="panel empty"><h2>Revenue Trend</h2><span>$0.00 revenue · $0.00 net</span></article>
      <article className="panel empty"><h2>Cash Flow Summary</h2><span>$0.00 net cash change</span></article>
    </section>
  </div>
}
