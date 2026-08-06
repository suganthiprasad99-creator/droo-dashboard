'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Activity, Bolt, CheckCircle2, Code2, Columns3, Copy, Download, Eye, FileText, Filter, Gauge, Headphones, KeyRound, Link2, MoreHorizontal, Plus, RefreshCw, Search, Settings2, Trash2, TriangleAlert, Unplug, Webhook, X } from 'lucide-react'
import { fetchAuthenticated } from '@/hooks/use-api-data'

const metricDefinitions = [
  ['API Requests','api_requests',Code2,'blue'],['API Error Rate','api_error_rate',TriangleAlert,'rose'],['Avg API Latency','avg_api_latency_ms',Gauge,'amber'],['Webhook Success','webhook_success_rate',Webhook,'green'],
  ['Active API Keys','active_api_keys',KeyRound,'indigo'],['Active Webhooks','active_webhooks',CheckCircle2,'cyan'],['Webhook Failures','webhook_failures',Webhook,'rose'],['Events Emitted','events_emitted',Bolt,'indigo'],
] as const

const resources = [
  { icon: KeyRound, label: 'API Keys', view: 'api-keys' },
  { icon: Webhook, label: 'Webhooks', view: 'webhooks' },
  { icon: FileText, label: 'Request Logs', view: 'logs' },
  { icon: Bolt, label: 'Events', view: 'events' },
  { icon: Unplug, label: 'WebSockets', view: 'websockets' },
]

export function DevelopersPage() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  const [period,setPeriod] = useState('30d')
  const [customizing,setCustomizing] = useState(false)
  const [revision,setRevision] = useState(0)
  const [live,setLive] = useState<{metrics:Record<string,number>;traffic:ResourceRow[];health:ResourceRow[];activity:ResourceRow[];events:ResourceRow[]}>({metrics:{},traffic:[],health:[],activity:[],events:[]})
  const [loadError,setLoadError] = useState('')
  useEffect(()=>{let cancelled=false;Promise.all(['metrics','api-traffic','endpoint-health','activity','events'].map(async endpoint=>{const response=await fetchAuthenticated(`/v1/admin/developers/${endpoint}?period=${period}`);if(!response.ok)throw new Error(`Developers API failed (${response.status})`);return response.json()})).then(([metrics,traffic,health,activity,events])=>{if(!cancelled){setLive({metrics,traffic,health,activity,events});setLoadError('')}}).catch(error=>!cancelled&&setLoadError(error instanceof Error?error.message:'Unable to load developer metrics'));return()=>{cancelled=true}},[period,revision])
  if (view && ['api-keys','webhooks','websockets','logs','events'].includes(view)) return <DeveloperResourcePage key={view} view={view as ResourceView}/>
  const metrics=metricDefinitions.map(([label,key,Icon,tone])=>{const number=live.metrics[key];const value=number===undefined?'—':key.includes('rate')?`${number.toFixed(1)}%`:key==='avg_api_latency_ms'?`${number.toFixed(0)}ms`:String(number);return [label,value,Icon,tone] as const})
  return <div className={`dev-console ${customizing?'customizing':''}`}>
    <header className="dev-head"><div><h1>Developers Dashboard</h1><p>{loadError||'Developer dashboard and API health overview.'}</p></div><nav><label>Period <select value={period} onChange={e=>setPeriod(e.target.value)}><option>24h</option><option>7d</option><option>30d</option><option>90d</option></select></label><button onClick={()=>setRevision(value=>value+1)}><RefreshCw/>Refresh</button><button className={customizing?'primary':''} onClick={()=>setCustomizing(v=>!v)}><Settings2/>{customizing?'Done':'Customize'}</button></nav></header>
    <main className="dev-body">
      <section className="dev-kpis">{metrics.map(([label,value,Icon,tone])=><article className={`dev-kpi ${tone}`} key={label}><header><span>{label}</span><Icon/></header><strong>{value}</strong><footer><span>{period} · Current</span><small>Updated now</small></footer></article>)}</section>
      <section className="dev-grid charts"><Chart title="API Traffic" subtitle="Request volume, successes, and errors" points={live.traffic}/><Chart title="Webhook Delivery Health" subtitle="Delivery volume, retries, and failures" empty={!live.health.length}/></section>
      <section className="dev-grid">
        <Panel title="Endpoint Health" subtitle="Recent webhook endpoint reliability" icon={<Activity/>}>{live.health.length?<div className="dev-ranked">{live.health.map(row=><p key={String(row.endpoint_id)}><span>{String(row.url)}</span><b>{Number(row.success_rate||0).toFixed(1)}%</b></p>)}</div>:<Empty icon={<Webhook/>} title="No endpoint activity" text="Webhook delivery health will appear here."/>}</Panel>
        <Panel title="Event Stream" subtitle="Top event types and sources" icon={<Bolt/>}>{live.events.length?<div className="dev-ranked"><small>RECENT EVENTS</small>{live.events.slice(0,8).map(row=><p key={String(row.id)}><span>{String(row.event_type)}</span><b>{String(row.aggregate_type)}</b></p>)}</div>:<Empty icon={<Bolt/>} title="No events emitted" text="Business events will appear here."/>}</Panel>
        <Panel title="Developer Activity" subtitle="Recent logs, webhooks, and events" icon={<RefreshCw/>}><div className="dev-activity">{live.activity.map(row=><div key={String(row.id)}><i>{String(row.kind).toUpperCase()}</i><p><b>{String(row.description)}</b><span>{String(row.status)} · {new Date(String(row.occurred_at)).toLocaleString()}</span></p></div>)}</div></Panel>
        <Panel title="Quick Resources" subtitle="Jump into developer tools" icon={<Link2/>}><nav className="dev-links">{resources.map(({icon:Icon,label,view})=><Link key={label} href={`/developers?view=${view}`}><Icon/><span>{label}</span><b>→</b></Link>)}</nav></Panel>
      </section>
    </main>
  </div>
}

function Chart({title,subtitle,empty=false,points=[]}:{title:string;subtitle:string;empty?:boolean;points?:ResourceRow[]}) { const plotted=points.length?points.map((point,index)=>`${points.length===1?180:index*360/(points.length-1)},${130-Math.min(110,Number(point.requests||0)*5)}`).join(' '):'';return <article className="dev-widget dev-chart"><WidgetHeader title={title} subtitle={subtitle} icon={<MoreHorizontal/>}/><div className="dev-chart-body">{empty||!points.length?<Empty icon={<Activity/>} title="No activity data" text="Recorded activity will appear here."/>:<><div className="dev-legend"><span><i/>Requests</span><span><i/>Success</span><span><i/>Errors</span></div><svg viewBox="0 0 360 140" preserveAspectRatio="none">{[25,60,95,130].map(y=><line key={y} x1="0" x2="360" y1={y} y2={y}/>)}<polyline points={plotted}/></svg><footer><span>{new Date(String(points[0]?.bucket)).toLocaleDateString()}</span><span>{new Date(String(points.at(-1)?.bucket)).toLocaleDateString()}</span></footer></>}</div></article> }
function WidgetHeader({title,subtitle,icon}:{title:string;subtitle:string;icon:React.ReactNode}) { return <header className="dev-widget-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button aria-label={`${title} options`}>{icon}</button></header> }
function Panel({title,subtitle,icon,children}:{title:string;subtitle:string;icon:React.ReactNode;children:React.ReactNode}) { return <article className="dev-widget dev-panel"><WidgetHeader title={title} subtitle={subtitle} icon={icon}/><div className="dev-panel-body">{children}</div></article> }
function Empty({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="dev-empty">{icon}<b>{title}</b><span>{text}</span></div> }

type ResourceView = 'api-keys'|'webhooks'|'websockets'|'logs'|'events'
type ResourceRow = Record<string,unknown>

const fieldAliases: Record<string,string[]> = {
  Name:['name','label'], 'Public Key':['public_key','publicKey','key'], 'Secret Key':['secret_key','secretKey','secret'], Environment:['environment','mode'],
  Expiry:['expiry','expires_at','expiresAt'], 'Last Used':['last_used','lastUsed','last_used_at'], Created:['created','created_at','createdAt'],
  URL:['url','endpoint_url','endpointUrl'], Status:['status','active'], Mode:['mode','environment'], Version:['version','api_version'], Channel:['channel','name'],
  Description:['description','summary'], ID:['id','public_id','publicId'], 'API Credential':['api_credential','api_credential_name','apiCredentialName','credential_name'],
  'HTTP Method':['http_method','method'], Date:['date','created_at','createdAt','occurred_at'], Event:['event','description'], Code:['code','event_type','eventType'],
}

function displayValue(row:ResourceRow,column:string) {
  const candidates=[column,...(fieldAliases[column]||[])]
  for(const candidate of candidates){const value=row[candidate];if(value!==undefined&&value!==null&&value!==''){
    if(column==='Status'&&typeof value==='boolean')return value?'Enabled':'Disabled'
    if(typeof value==='object')return JSON.stringify(value)
    return String(value)
  }}
  return '—'
}

const resourceConfig: Record<ResourceView,{title:string;columns:string[];rows:ResourceRow[]}> = {
  'api-keys': { title:'API Keys', columns:['Name','Public Key','Secret Key','Environment','Expiry','Last Used','Created'], rows:[{Name:'Default API Key','Public Key':'droo_pk_live_71x9••••','Secret Key':'••••••••••••••••','Environment':'Live','Expiry':'Never','Last Used':'2 minutes ago','Created':'Aug 3, 2026'}] },
  webhooks: { title:'Webhooks', columns:['URL','Status','Mode','Version','Created'], rows:[{URL:'https://pharmacyecom.example/api/webhooks/droo',Status:'Enabled',Mode:'Live',Version:'2026-08-03',Created:'Aug 3, 2026'}] },
  websockets: { title:'WebSockets', columns:['','Channel'], rows:[{'':'Listen','Channel':'organization.ord_demo_shipment_0009'}] },
  logs: { title:'Logs', columns:['Description','Status','ID','API Credential','HTTP Method','Version','Date'], rows:[{Description:'List organization orders','Status':'200','ID':'log_8qk29x','API Credential':'Default API Key','HTTP Method':'GET','Version':'v1','Date':'Aug 6, 2026 10:42 AM'},{Description:'Create external order','Status':'201','ID':'log_5mh81a','API Credential':'Default API Key','HTTP Method':'POST','Version':'v1','Date':'Aug 6, 2026 10:39 AM'}] },
  events: { title:'Events', columns:['Event','Code','ID','Date'], rows:[{Event:'An order was updated via API','Code':'order.updated','ID':'evt_72xmk4','Date':'Aug 6, 2026 10:42 AM'},{Event:'A tracking status was created via API','Code':'tracking_status.created','ID':'evt_40qps9','Date':'Aug 6, 2026 10:31 AM'}] },
}

function DeveloperResourcePage({view}:{view:ResourceView}) {
  const config=resourceConfig[view]
  const [query,setQuery]=useState('')
  const [testMode,setTestMode]=useState(false)
  const [modal,setModal]=useState<'create'|'filter'|'columns'|'detail'|null>(null)
  const [selected,setSelected]=useState<ResourceRow|null>(null)
  const [rows,setRows]=useState(config.rows)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [revision,setRevision]=useState(0)
  useEffect(()=>{let cancelled=false;async function load(){setLoading(true);setError('');try{const endpoint=view==='api-keys'?'api-keys':view==='webhooks'?'webhooks':view==='logs'?'logs':view==='events'?'events':'events';const response=await fetchAuthenticated(`/v1/admin/developers/${endpoint}?limit=100`);if(!response.ok)throw new Error(`${config.title} API failed (${response.status})`);const body=await response.json() as ResourceRow[];const records=view==='websockets'?Array.from(new Set(body.map(row=>String(row.event_type||'')).filter(Boolean))).map(channel=>({'':'Listen',channel})):body;if(!cancelled)setRows(records)}catch(value){if(!cancelled)setError(value instanceof Error?value.message:`Unable to load ${config.title.toLowerCase()}`)}finally{if(!cancelled)setLoading(false)}}load();return()=>{cancelled=true}},[view,config.title,revision])
  const visibleRows=useMemo(()=>rows.filter(row=>Object.values(row).some(value=>String(value??'').toLowerCase().includes(query.toLowerCase()))),[rows,query])
  const createLabel=view==='api-keys'?'New':view==='webhooks'?'New Webhook':view==='websockets'?'Listen on custom channel':''
  function openDetail(row:ResourceRow){setSelected(row);setModal('detail')}
  async function addResource(){
    if(view==='api-keys'||view==='webhooks'){try{const response=await fetchAuthenticated(`/v1/admin/developers/${view}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(view==='api-keys'?{name:'Storefront API Key',scopes:['orders:read','orders:write','webhooks:write']}:{url:'https://example.com/webhooks/droo',events:['order.created','order.published','order.delivered','order.cancelled']})});if(!response.ok)throw new Error(`Create failed (${response.status})`);const created=await response.json() as ResourceRow;setSelected(created);setRevision(value=>value+1);setModal('detail');return}catch(value){setError(value instanceof Error?value.message:'Unable to create resource');return}}
    if(view==='websockets')setRows(current=>[{'':'Listen',Channel:'custom.events.channel'},...current])
    setModal(null)
  }
  return <div className="dev-resource-page">
    <header className="dev-resource-head"><h1>{config.title}</h1>{error&&<span className="dev-resource-error">{error}</span>}<div className="dev-resource-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}...`}/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</div><nav>
      {view==='api-keys'&&<label className="dev-toggle"><input type="checkbox" checked={testMode} onChange={e=>setTestMode(e.target.checked)}/><i/><span>View test data</span></label>}
      <button title="Reload data" onClick={()=>setRevision(value=>value+1)}><RefreshCw className={loading?'spin':''}/></button>
      {(view==='logs'||view==='events')&&<><button onClick={()=>setModal('filter')}><Filter/>Filters</button><button onClick={()=>setModal('columns')}><Columns3/>Columns</button></>}
      {createLabel&&<button className={view==='websockets'?'magic':'primary'} onClick={()=>setModal('create')}>{view==='websockets'?<Headphones/>:<Plus/>}{createLabel}</button>}
      {view==='api-keys'&&<button><Download/>Export</button>}
    </nav></header>
    <section className="dev-table-shell"><table><thead><tr>{view==='api-keys'&&<th><input type="checkbox" aria-label="Select all API keys"/></th>}{config.columns.map(column=><th key={column}>{column}</th>)}<th/></tr></thead><tbody>{visibleRows.map((row,index)=><tr key={`${view}-${String(row.id||row.ID||index)}`} onClick={()=>openDetail(row)}>{view==='api-keys'&&<td onClick={e=>e.stopPropagation()}><input type="checkbox" aria-label={`Select ${displayValue(row,'Name')}`}/></td>}{config.columns.map(column=>{const value=displayValue(row,column);return <td key={column}>{column==='Status'?<span className={`dev-status ${Number(value)>=400?'bad':'good'}`}>{value}</span>:column==='Environment'||column==='Mode'?<span className="dev-status neutral">{value}</span>:column==='Public Key'||column==='ID'?<button className="dev-copy" onClick={e=>{e.stopPropagation();navigator.clipboard?.writeText(value)}}>{value}<Copy/></button>:value}</td>})}<td><button className="dev-row-action" onClick={e=>{e.stopPropagation();openDetail(row)}}><MoreHorizontal/></button></td></tr>)}</tbody></table>{!visibleRows.length&&<Empty icon={view==='api-keys'?<KeyRound/>:view==='webhooks'?<Webhook/>:view==='websockets'?<Unplug/>:view==='logs'?<FileText/>:<Bolt/>} title={`No ${config.title.toLowerCase()} found`} text={query?'Try a different search.':'Developer resources will appear here.'}/>}<footer><span>Showing {visibleRows.length} of {rows.length}</span><nav><button disabled>‹</button><button className="active">1</button><button disabled>›</button></nav><select><option>20 per page</option><option>50 per page</option></select></footer></section>
    {modal&&<ResourceModal title={modal==='create'?createLabel:modal==='filter'?'Filter records':modal==='columns'?'Visible columns':`${config.title} details`} onClose={()=>setModal(null)} onAccept={modal==='create'?addResource:()=>setModal(null)} acceptLabel={modal==='create'?(view==='websockets'?'Listen':'Create'):'Apply'} hideAccept={modal==='detail'}>{modal==='create'?<CreateForm view={view}/>:modal==='filter'?<><label>Status<select><option>All statuses</option><option>Success</option><option>Failed</option></select></label><label>Date range<input type="date"/></label></>:modal==='columns'?<div className="dev-column-list">{config.columns.map(column=><label key={column}><input type="checkbox" defaultChecked/>{column}</label>)}</div>:<DetailView row={selected} view={view} onReplaced={setSelected} onChanged={()=>{setModal(null);setRevision(value=>value+1)}} onError={setError}/>}</ResourceModal>}
  </div>
}

function CreateForm({view}:{view:ResourceView}){if(view==='api-keys')return <><label>Name<input placeholder="My API key"/></label><label>Environment<select><option>Live</option><option>Test</option></select></label><label>Expires<select><option>Never</option><option>30 days</option><option>90 days</option></select></label></>;if(view==='webhooks')return <><label>Endpoint URL<input placeholder="https://example.com/webhooks/droo"/></label><label>Events<select><option>All events</option><option>Order events</option><option>Driver events</option></select></label><label>API version<select><option>2026-08-03</option></select></label></>;return <label>Channel<input placeholder="organization.events"/></label>}
function DetailView({row,view,onChanged,onReplaced,onError}:{row:ResourceRow|null;view:ResourceView;onChanged:()=>void;onReplaced:(row:ResourceRow)=>void;onError:(value:string)=>void}){async function act(action:'rotate'|'delete'){if(!row?.id)return;try{const path=view==='api-keys'?`/v1/admin/developers/api-keys/${row.id}${action==='rotate'?'/rotate':''}`:`/v1/admin/developers/webhooks/${row.id}`;const response=await fetchAuthenticated(path,{method:action==='rotate'?'POST':'DELETE'});if(!response.ok)throw new Error(`${action} failed (${response.status})`);if(action==='rotate')onReplaced(await response.json() as ResourceRow);else onChanged()}catch(value){onError(value instanceof Error?value.message:`Unable to ${action}`)}}return <div className="dev-detail">{row&&Object.entries(row).map(([key,value])=><p key={key}><span>{key}</span><b>{typeof value==='object'?JSON.stringify(value):String(value??'—')}</b></p>)}<div><button><Eye/>View full details</button>{view==='api-keys'&&<button onClick={()=>act('rotate')}><RefreshCw/>Rotate secret</button>}{(view==='api-keys'||view==='webhooks')&&<button className="danger" onClick={()=>act('delete')}><Trash2/>{view==='api-keys'?'Revoke':'Delete'}</button>}</div></div>}
function ResourceModal({title,onClose,onAccept,acceptLabel,children,hideAccept=false}:{title:string;onClose:()=>void;onAccept:()=>void;acceptLabel:string;children:React.ReactNode;hideAccept?:boolean}){return <div className="dev-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="dev-modal" role="dialog" aria-modal="true"><header><h2>{title}</h2><button onClick={onClose}><X/></button></header><div className="dev-modal-body">{children}</div><footer><button onClick={onClose}>{hideAccept?'Close':'Cancel'}</button>{!hideAccept&&<button className="primary" onClick={onAccept}>{acceptLabel}</button>}</footer></section></div>}
