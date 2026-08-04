'use client'

import { useState } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { modules } from '@/lib/dashboard-config'
import { PageHeader } from '@/components/ui/page-header'

export function IssuesPage() {
  const [state, setState] = useState('open')
  return <><PageHeader config={modules.Issues} /><div className="grid"><section className="panel data"><div className="tools"><label><Search /><input placeholder="Search issues or order references" /></label><select value={state} onChange={event => setState(event.target.value)}><option value="open">Open issues</option><option value="resolved">Resolved issues</option><option value="all">All issues</option></select></div><div className="empty"><div className="empty-icon"><ShieldCheck /></div><strong>No {state === 'all' ? 'reported' : state} issues</strong><span>Safety, delivery and customer incidents reported by riders will be triaged here.</span></div></section><section className="panel quick"><header><div><h2>Incident workflow</h2><p>Operational response checklist</p></div></header>{['Confirm rider safety', 'Contact the customer', 'Record resolution', 'Close with an audit note'].map((item, index) => <button key={item}><div>{index + 1}</div><p><strong>{item}</strong><span>Required for incident resolution</span></p></button>)}</section></div></>
}
