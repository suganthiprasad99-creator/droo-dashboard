const metrics = [
  ['Active users', '11', 'Current access'], ['Pending invites', '10', 'Awaiting access'],
  ['Inactive users', '0', 'Disabled access'], ['Dormant users', '10', 'No recent login'],
  ['MFA coverage', 'N/A', 'Org enforcement shown'], ['Roles', '0', 'Organization managed'],
  ['Policies', '0', 'Organization managed'],
]

export default function IamPage() {
  return <div>
    <header className="page-title"><div><h1>IAM Dashboard</h1><p>Manage identities, roles and organization access policies.</p></div></header>
    <section className="metrics">
      {metrics.map(([label, value, detail]) => <article key={label}><p><span>{label}</span><strong>{value}</strong><small>{detail}</small></p></article>)}
    </section>
    <section className="grid">
      <article className="panel empty"><h2>Users by Type Created Over Time</h2><span>New identities grouped by user type</span></article>
      <article className="panel empty"><h2>Access Risk</h2><span>Privileged exposure requiring review</span></article>
      <article className="panel empty"><h2>Policy Surface</h2><span>Policies by service</span></article>
      <article className="panel empty"><h2>Recent IAM Activity</h2><span>Latest identity and access changes</span></article>
    </section>
  </div>
}
