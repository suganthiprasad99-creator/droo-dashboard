'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertCircle, Banknote, Box, CheckCircle2, ChevronDown, CircleDollarSign, Command, Download, FileCheck2, Gauge, Layers3, Map, Menu, Moon, Plug, Search, Settings2, Sun, Truck, Users, X } from 'lucide-react'
import { GoogleLiveMap } from './openstreet-live-map'

type Module = 'Overview'|'Live Operations'|'Orders'|'Drivers'|'Applications'|'Service Areas'|'Pricing'|'Earnings'|'Integrations'|'Issues'|'Organization Settings'
type ApiRecord = Record<string, unknown>
const nav: Array<[Module, React.ElementType]> = [['Overview',Gauge],['Live Operations',Activity],['Orders',Box],['Drivers',Truck],['Applications',FileCheck2],['Service Areas',Map],['Pricing',CircleDollarSign],['Earnings',Banknote],['Integrations',Plug],['Issues',AlertCircle],['Organization Settings',Settings2]]
const paths: Partial<Record<Module,string>> = {'Overview':'/admin/orders','Orders':'/admin/orders','Drivers':'/admin/drivers','Applications':'/admin/driver-applications','Service Areas':'/admin/service-areas','Pricing':'/admin/pricing-rules','Earnings':'/admin/earnings','Integrations':'/webhook-endpoints','Live Operations':'/admin/live-drivers'}
const ACCESS_TOKEN_KEY='droo.dev_access_token.v2'
const REFRESH_TOKEN_KEY='droo.dev_refresh_token.v2'

function useApi(module: Module) {
  const [rows,setRows]=useState<ApiRecord[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('')
  const [liveRevision,setLiveRevision]=useState(0)
  useEffect(()=>{if(module!=='Live Operations')return;const timer=window.setInterval(()=>setLiveRevision(value=>value+1),10_000);return()=>window.clearInterval(timer)},[module])
  useEffect(()=>{
    const path=paths[module]
    queueMicrotask(()=>{setRows([]);setError('');setLoading(Boolean(path))})
    if(!path)return
    let cancelled=false
    async function devLogin(){
      const challengeResponse=await fetch('/v1/auth/otp/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:'+916369487527',purpose:'login'})})
      if(!challengeResponse.ok)throw new Error(`Development login request failed (${challengeResponse.status})`)
      const challenge=await challengeResponse.json()
      const verification=await fetch('/v1/auth/otp/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenge_id:challenge.challenge_id,code:'000000'})})
      if(!verification.ok)throw new Error(`Development login verification failed (${verification.status})`)
      const session=await verification.json()
      if(typeof session.access_token!=='string')throw new Error('Development login returned no access token')
      sessionStorage.setItem(ACCESS_TOKEN_KEY,session.access_token)
      if(typeof session.refresh_token==='string')sessionStorage.setItem(REFRESH_TOKEN_KEY,session.refresh_token)
      return session.access_token as string
    }
    async function refreshLogin(){
      const refreshToken=sessionStorage.getItem(REFRESH_TOKEN_KEY)
      if(!refreshToken)return null
      const response=await fetch('/v1/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})})
      if(!response.ok){sessionStorage.removeItem(REFRESH_TOKEN_KEY);return null}
      const session=await response.json()
      if(typeof session.access_token!=='string')return null
      sessionStorage.setItem(ACCESS_TOKEN_KEY,session.access_token)
      if(typeof session.refresh_token==='string')sessionStorage.setItem(REFRESH_TOKEN_KEY,session.refresh_token)
      return session.access_token as string
    }
    ;(async()=>{
      if(module==='Integrations'){
        const response=await fetch('/api/dev/integrations',{cache:'no-store'})
        if(!response.ok)throw new Error(`Integration API request failed (${response.status})`)
        const value=await response.json()
        if(!cancelled)setRows(Array.isArray(value)?value:value.data||[])
        return
      }
      let token=sessionStorage.getItem(ACCESS_TOKEN_KEY)
      if(process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN==='true'){
        const sessionValid=token&&await fetch('/v1/me',{headers:{Authorization:`Bearer ${token}`}}).then(response=>response.ok).catch(()=>false)
        if(!sessionValid){sessionStorage.removeItem(ACCESS_TOKEN_KEY);token=await refreshLogin()||await devLogin()}
      }
      if(!token)throw new Error('Sign in to load live API data.')
      const headers={Authorization:`Bearer ${token}`}
      if(module==='Overview'){
        const [orders,drivers,earnings]=await Promise.all(['/admin/orders','/admin/drivers','/admin/earnings'].map(async endpoint=>{const response=await fetch(`/v1${endpoint}`,{headers});if(!response.ok)throw new Error(`Overview API request failed (${response.status})`);return response.json()}))
        if(!cancelled)setRows([...(orders.data||[]).map((x:ApiRecord)=>({...x,__kind:'order'})),...(drivers.data||[]).map((x:ApiRecord)=>({...x,__kind:'driver'})),...(earnings.data||[]).map((x:ApiRecord)=>({...x,__kind:'earning'}))])
        return
      }
      const response=await fetch(`/v1${path}`,{headers})
      if(!response.ok)throw new Error(`API request failed (${response.status})`)
      const value=await response.json()
      if(!cancelled)setRows(Array.isArray(value)?value:value.data||[])
    })().catch(e=>!cancelled&&setError(e.message)).finally(()=>!cancelled&&setLoading(false))
    return()=>{cancelled=true}
  },[module,liveRevision])
  return {rows,loading,error}
}

function Badge({value}:{value:string}){const good=['active','online','approved','delivered','available'].some(x=>value.includes(x));const bad=['failed','rejected','suspended','cancelled'].some(x=>value.includes(x));return <span className={`badge ${good?'good':bad?'bad':''}`}><i/>{value.replaceAll('_',' ')}</span>}
function Empty({loading,error}:{loading:boolean,error:string}){return <div className="empty"><div className="empty-icon">{loading?<Activity className="spin"/>:<Layers3/>}</div><strong>{loading?'Loading operational data':error||'No records found'}</strong><span>{error?'Configure authentication and confirm the Droo API is running.':'Records returned by the API will appear here.'}</span></div>}

export default function Dashboard(){const [module,setModule]=useState<Module>('Overview'),[dark,setDark]=useState(false),[mobile,setMobile]=useState(false);const {rows,loading,error}=useApi(module);useEffect(()=>{document.documentElement.classList.toggle('dark',dark)},[dark]);return <div className="app">
  <aside className={mobile?'sidebar open':'sidebar'}><div className="brand"><div className="logo"><Layers3/></div><div><strong>Droo</strong><span>Operations</span></div><button onClick={()=>setMobile(false)}><X/></button></div><div className="org"><div>DR</div><p><strong>Droo Operations</strong><span>Primary organization</span></p><ChevronDown/></div><nav>{nav.map(([name,Icon])=><button key={name} className={module===name?'active':''} onClick={()=>{setModule(name);setMobile(false)}}><Icon/><span>{name}</span></button>)}</nav><footer><div className="avatar">OP</div><p><strong>Operations user</strong><span>Authenticated session</span></p></footer></aside>
  {mobile&&<button className="overlay" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}<section className="workspace"><header className="topbar"><button className="mobile" onClick={()=>setMobile(true)}><Menu/>Menu</button><button className="search" onClick={()=>setModule('Orders')}><Search/><span>Search orders, drivers, references...</span><kbd><Command/>K</kbd></button><div><button aria-label="Toggle color theme" onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}</button></div></header><main>
    <div className="page-title"><div><h1>{module}</h1><p>{description(module)}</p></div></div>
    {module==='Overview'?<Overview open={setModule} rows={rows} loading={loading} error={error}/>:module==='Live Operations'?<Live rows={rows} loading={loading} error={error}/>:module==='Issues'||module==='Organization Settings'?<Unavailable module={module}/>:<Records module={module} rows={rows} loading={loading} error={error}/>} 
  </main></section></div>}

function description(module:Module){return ({'Overview':'Live operational health across your delivery network.','Live Operations':'Track available riders, active deliveries and stale locations.','Orders':'Create, dispatch and monitor every delivery.','Drivers':'Manage marketplace and salaried internal riders.','Applications':'Review rider profiles, vehicles and documents.','Service Areas':'Define operational coverage with polygon boundaries.','Pricing':'Manage delivery pricing and rider revenue share.','Earnings':'Review rider ledger entries and adjustments.','Integrations':'Manage webhook subscriptions and API connections.','Issues':'Review delivery incidents reported by riders.','Organization Settings':'Organization identity, memberships and access policy.'} as Record<Module,string>)[module]}
function Overview({open,rows,loading,error}:{open:(module:Module)=>void,rows:ApiRecord[],loading:boolean,error:string}){const orders=rows.filter(x=>x.__kind==='order'),drivers=rows.filter(x=>x.__kind==='driver'),earnings=rows.filter(x=>x.__kind==='earning');const active=orders.filter(x=>['assigned','enroute_pickup','arrived_pickup','picked_up','enroute_dropoff','arrived_dropoff'].includes(String(x.status))).length,pending=orders.filter(x=>['created','published'].includes(String(x.status))).length,completed=orders.filter(x=>x.status==='delivered').length,attention=orders.filter(x=>['failed','cancelled'].includes(String(x.status))).length,terminal=orders.filter(x=>['delivered','failed','cancelled'].includes(String(x.status))).length,rate=terminal?Math.round(completed/terminal*100):0,online=drivers.filter(x=>x.online===true).length,payouts=earnings.reduce((sum,x)=>sum+Number((x.amount as ApiRecord)?.amount_minor||0),0);const stages=[['Created','created'],['Published','published'],['Assigned','assigned'],['In transit','enroute'],['Delivered','delivered']];if(error)return <Empty loading={false} error={error}/>;return <><div className="metrics">{[[Activity,'Active orders',loading?'—':active,`${pending} waiting to dispatch`],[Truck,'Online drivers',loading?'—':online,`${drivers.length-online} unavailable`],[AlertCircle,'Requires attention',loading?'—':attention,attention?'Review operational exceptions':'No urgent exceptions'],[CheckCircle2,'Completion rate',loading?'—':`${rate}%`,`${completed} completed deliveries`]].map(([I,label,value,note])=>{const Icon=I as React.ElementType;return <article key={String(label)}><div className="metric-icon"><Icon/></div><p><span>{String(label)}</span><strong>{String(value)}</strong><small>{String(note)}</small></p></article>})}</div><div className="grid"><section className="panel"><header><div><h2>Order flow</h2><p>{orders.length} orders · Rider payouts ₹{(payouts/100).toLocaleString('en-IN')}</p></div></header><div className="bars">{stages.map(([label,status])=>{const count=status==='enroute'?orders.filter(x=>String(x.status).includes('enroute')||String(x.status).includes('arrived')||x.status==='picked_up').length:orders.filter(x=>x.status===status).length;return <div key={label}><span>{label}<b>{count}</b></span><i><em style={{width:`${orders.length?Math.max(3,count/orders.length*100):0}%`}}/></i></div>})}</div></section><section className="panel quick"><header><h2>Quick actions</h2></header>{[['Open orders',Box,'Orders'],['Open live operations',Activity,'Live Operations'],['Manage riders',Users,'Drivers']].map(([x,I,target])=>{const Icon=I as React.ElementType;return <button key={String(x)} onClick={()=>open(target as Module)}><div><Icon/></div><p><strong>{String(x)}</strong><span>Open operational workflow</span></p></button>})}</section></div></>}
function Records({module,rows,loading,error}:{module:Module,rows:ApiRecord[],loading:boolean,error:string}){const [search,setSearch]=useState(''),[status,setStatus]=useState('');const keys=rows.length?Object.keys(rows[0]).filter(k=>!['stops','items','documents','polygon','requirements','events'].includes(k)).slice(0,6):['id','status','name','type','updated_at'];const statuses=[...new Set(rows.map(row=>String(row.status||'')).filter(Boolean))];const filtered=rows.filter(row=>(!status||row.status===status)&&(!search||JSON.stringify(row).toLowerCase().includes(search.toLowerCase())));function exportRows(){const csv=[keys.join(','),...filtered.map(row=>keys.map(key=>JSON.stringify(typeof row[key]==='object'?JSON.stringify(row[key]):row[key]??'')).join(','))].join('\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));link.download=`droo-${module.toLowerCase().replaceAll(' ','-')}.csv`;link.click();URL.revokeObjectURL(link.href)}return <section className="panel data"><div className="tools"><label><Search/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder={`Search ${module.toLowerCase()}`}/></label><select aria-label="Filter by status" value={status} onChange={event=>setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(value=><option key={value}>{value}</option>)}</select><button className="secondary" disabled={!filtered.length} onClick={exportRows}><Download/>Export CSV</button></div>{rows.length?<div className="table-wrap"><table><thead><tr>{keys.map(k=><th key={k}>{k.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{filtered.map((row,i)=><tr key={String(row.id||i)}>{keys.map(k=><td key={k}>{k==='status'?<Badge value={String(row[k]||'unknown')}/>:typeof row[k]==='object'?JSON.stringify(row[k]):String(row[k]??'—')}</td>)}</tr>)}</tbody></table>{!filtered.length&&<Empty loading={false} error="No records match the current search and status filter."/>}</div>:<Empty loading={loading} error={error}/>}<div className="notice"><AlertCircle/><p><strong>OpenAPI-first module</strong><span>Only operations supported by droo-v1 are enabled. Unsupported actions are not rendered.</span></p></div></section>}
function Live({rows,loading,error}:{rows:ApiRecord[],loading:boolean,error:string}){const [search,setSearch]=useState(''),[selected,setSelected]=useState<string|null>(null),[clock,setClock]=useState(0);useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),1_000);return()=>window.clearInterval(timer)},[]);const filtered=rows.filter(row=>JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));const select=useCallback((id:string)=>setSelected(id),[]);return <div className="live"><section className="live-list"><div className="tools"><label><Search/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Driver, phone or order"/></label></div>{filtered.length?filtered.map((r,i)=>{const driver=(r.driver||{}) as ApiRecord,id=String(driver.id||r.id||i),position=(r.position||{}) as ApiRecord,stale=clock>0&&clock-new Date(String(position.recorded_at||0)).getTime()>120_000;return <button className={`live-driver ${selected===id?'selected':''}`} onClick={()=>setSelected(id)} key={id}><div className="avatar"><Truck/></div><p><strong>{String(driver.name||'Driver')}</strong><span>{String(r.active_order_id||'Available')} · {stale?'Location stale':'Updated live'}</span></p><Badge value={stale?'stale':'online'}/></button>}):<Empty loading={loading} error={error||'No live drivers match your search.'}/>}</section><section className="map"><GoogleLiveMap rows={filtered} selected={selected} onSelect={select}/></section></div>}
function Unavailable({module}:{module:Module}){return <section className="panel unavailable"><AlertCircle/><h2>{module} API operations are not available</h2><p>The current OpenAPI contract does not expose tenant-scoped operations for this module. No inactive controls are shown.</p></section>}
