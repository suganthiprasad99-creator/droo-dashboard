'use client'

import { useMemo, useState } from 'react'
import { Activity, ArrowLeft, Check, ChevronRight, Link2, Plug, Radio, RefreshCw, Satellite, ShieldCheck, Truck, X } from 'lucide-react'

type Provider = { name: string; description: string; tokenLabel: string; tokenPlaceholder: string }

const providers: Provider[] = [
  { name: 'Flespi', tokenLabel: 'Flespi Token', tokenPlaceholder: 'Enter your Flespi API token', description: 'Flespi is a robust telematics platform offering device management, data processing, and API integration.' },
  { name: 'Geotab', tokenLabel: 'Geotab API Key', tokenPlaceholder: 'Enter your Geotab API key', description: 'Geotab provides fleet management solutions with GPS tracking, driver safety, and compliance features.' },
  { name: 'Samsara', tokenLabel: 'Samsara Token', tokenPlaceholder: 'Enter your Samsara API token', description: 'Samsara offers IoT solutions for fleet operations, including GPS tracking, dashcams, and asset monitoring.' },
  { name: 'AFAQY', tokenLabel: 'AFAQY API Token', tokenPlaceholder: 'Enter your AFAQY API token', description: 'AFAQY AVL REST integration for unit discovery, live position, speed, heading, odometer, fuel, and signal data.' },
  { name: 'Safee Tracking', tokenLabel: 'Safee API Token', tokenPlaceholder: 'Enter your Safee Tracking API token', description: 'Safee Tracking REST integration for vehicle discovery, last state, live positions, odometer, fuel, and sensor data.' },
]

export function TelematicsPage() {
  const [selected, setSelected] = useState<Provider | null>(null)
  const [step, setStep] = useState(1)
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')
  const [connections, setConnections] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const metrics = useMemo(() => [
    { label: 'Provider count', value: connections.length, detail: 'Connected provider accounts', action: 'Connect a provider', icon: Plug },
    { label: 'Synced Devices', value: 0, detail: 'Discovered from providers', action: 'Review synced devices', icon: Satellite },
    { label: 'Unattached devices', value: 0, detail: 'No open attachment count', action: 'Attach to vehicles', icon: Truck },
    { label: 'Health warnings', value: 0, detail: 'No warnings', action: 'Review health', icon: Activity },
  ], [connections.length])

  function begin(provider = providers[0]) { setSelected(provider); setStep(1); setToken(''); setSecret(''); setNotice('') }
  function close() { setSelected(null); setStep(1) }
  function finish() { if (!selected) return; setConnections(old => old.includes(selected.name) ? old : [...old, selected.name]); setNotice(`${selected.name} connected successfully.`); close() }

  if (selected) return <main className="telematics-setup">
    <header><div><span>Connectivity setup</span><h1>Connect Provider</h1><p>Create a provider connection, test credentials, and prepare device sync.</p></div><button className="secondary" onClick={close}><X />Cancel</button></header>
    <nav aria-label="Connection steps">{['Provider', 'Credentials', 'Test', 'Webhook', 'Review'].map((label, index) => <button key={label} className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} onClick={() => index + 1 <= step && setStep(index + 1)}><b>{step > index + 1 ? <Check /> : index + 1}</b><span>{label}</span></button>)}</nav>
    <section className="telematics-form">
      <div className="telematics-fields">
        {step === 1 && <><h2>Select provider</h2><p>Choose the telematics platform you want to connect.</p><div className="provider-choice">{providers.map(provider => <button className={provider.name === selected.name ? 'selected' : ''} onClick={() => setSelected(provider)} key={provider.name}><Radio /><span><strong>{provider.name}</strong><small>Native integration</small></span><Check /></button>)}</div></>}
        {step === 2 && <><h2>Credentials</h2><p>Fleet-Ops uses these credentials to test the connection and sync devices.</p><label>{selected.tokenLabel}*<input autoFocus value={token} onChange={e => setToken(e.target.value)} placeholder={selected.tokenPlaceholder} /></label><label>Webhook Secret (Optional)<input value={secret} onChange={e => setSecret(e.target.value)} placeholder="Enter webhook secret for signature validation" /></label></>}
        {step === 3 && <><h2>Test connection</h2><p>Verify that Fleet-Ops can securely reach {selected.name}.</p><div className="test-result"><ShieldCheck /><span><strong>Credentials ready</strong><small>Your credentials are formatted correctly and ready to test.</small></span></div></>}
        {step === 4 && <><h2>Webhook</h2><p>Use this endpoint to receive live telemetry updates from {selected.name}.</p><label>Webhook URL<input readOnly value={`https://api.droo.test/v1/telematics/${selected.name.toLowerCase().replaceAll(' ', '-')}/events`} /></label><div className="test-result"><Radio /><span><strong>Live events enabled</strong><small>Location and device health events will be processed automatically.</small></span></div></>}
        {step === 5 && <><h2>Review connection</h2><p>Confirm the provider details before saving the connection.</p><dl><div><dt>Provider</dt><dd>{selected.name}</dd></div><div><dt>Device discovery</dt><dd>Enabled</dd></div><div><dt>Webhooks</dt><dd>{secret ? 'Signed' : 'Enabled'}</dd></div></dl></>}
      </div>
      <aside><strong>{selected.name}</strong><p>{selected.description}</p><div><span>Discovery</span><span>Webhooks</span></div></aside>
    </section>
    <footer><p>Save the connection, then open it to sync devices and attach them to vehicles.</p><div><button className="secondary" onClick={close}>Cancel</button><button className="secondary" disabled={step === 1} onClick={() => setStep(s => s - 1)}><ArrowLeft />Back</button>{step < 5 ? <button className="primary" disabled={step === 2 && !token.trim()} onClick={() => setStep(s => s + 1)}>Continue<ChevronRight /></button> : <button className="primary" onClick={finish}><Check />Save connection</button>}</div></footer>
  </main>

  return <main className="telematics-hub">
    <header><div><h1>Connectivity Hub</h1><span>{0} warnings</span><p>Connect telematics providers, sync devices, attach them to vehicles, and monitor telemetry health from one workflow.</p></div><div><button className="icon-button" aria-label="Refresh providers" onClick={() => setNotice('Provider status refreshed.')}><RefreshCw /></button><button className="primary" onClick={() => begin()}><Link2 />Connect Provider</button></div></header>
    {notice && <div className="telematics-notice" role="status"><Check />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X /></button></div>}
    <section className="telematics-metrics connectivity-metrics">{metrics.map((metric, index) => <article className={`connectivity-metric connectivity-metric-${index + 1}`} key={metric.label}><header><span>{metric.label}</span><b><metric.icon /></b></header><strong>{metric.value}</strong><footer><p title={metric.detail}>{metric.detail}</p><button onClick={() => metric.label === 'Provider count' ? begin() : setNotice(`${metric.action}: no devices are available yet.`)}>{metric.action}<ChevronRight /></button></footer></article>)}</section>
    <section className="native-providers"><header><h2>Native Providers</h2><p>Start with a provider connection, then sync devices and attach them to vehicles.</p></header><div>{providers.map(provider => <button key={provider.name} onClick={() => begin(provider)}><header><span className="provider-logo"><Truck /></span><span><strong>{provider.name}</strong><small>native</small></span><em>{connections.includes(provider.name) ? 'Connected' : 'Available'}</em></header><p>{provider.description}</p><footer>{connections.includes(provider.name) ? 'Manage provider' : 'Connect provider'}<ChevronRight /></footer></button>)}</div></section>
  </main>
}
