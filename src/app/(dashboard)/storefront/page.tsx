import { Store } from 'lucide-react'

const metrics = [
  ['Revenue', '$0.00'], ['Orders', '0'], ['Average order value', '$0.00'], ['Active orders', '0'],
  ['Completed orders', '0'], ['Customers', '0'], ['Cart conversion', '0%'], ['Cancellation rate', '0%'],
]

export default function StorefrontPage() {
  return <div>
    <header className="page-title">
      <div><h1>Storefront Dashboard</h1><p>Manage products, customers and storefront orders.</p></div>
      <button className="secondary"><Store /> Product Stationery Store</button>
    </header>
    <section className="metrics">
      {metrics.map(([label, value]) => <article key={label}><p><span>{label}</span><strong>{value}</strong><small>vs previous period</small></p></article>)}
    </section>
    <section className="grid">
      <article className="panel empty"><h2>Revenue Trend</h2><span>$0.00 across 0 orders</span></article>
      <article className="panel empty"><h2>Top Products</h2><span>No product sales yet.</span></article>
    </section>
  </div>
}
