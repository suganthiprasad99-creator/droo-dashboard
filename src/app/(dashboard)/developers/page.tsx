const metrics = [
  ['API requests', '17'], ['API error rate', '0%'], ['Avg API latency', '121ms'], ['Webhook success', '0%'],
  ['Active API keys', '1'], ['Active webhooks', '0'], ['Webhook failures', '0'], ['Events emitted', '518'],
]

export default function DevelopersPage() {
  return <div>
    <header className="page-title"><div><h1>Developers Dashboard</h1><p>Monitor API usage, integrations and event delivery.</p></div></header>
    <section className="metrics">
      {metrics.map(([label, value]) => <article key={label}><p><span>{label}</span><strong>{value}</strong><small>30d · Current</small></p></article>)}
    </section>
    <section className="grid">
      <article className="panel empty"><h2>API Traffic</h2><span>Request volume, successes and errors</span></article>
      <article className="panel empty"><h2>Webhook Delivery Health</h2><span>Delivery volume, retries and failures</span></article>
      <article className="panel empty"><h2>Endpoint Health</h2><span>No data available</span></article>
      <article className="panel empty"><h2>Event Stream</h2><span>Top event types and sources</span></article>
    </section>
  </div>
}
