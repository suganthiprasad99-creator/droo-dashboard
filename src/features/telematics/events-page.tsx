'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Check, ChevronLeft, ChevronRight, ExternalLink, Funnel, ListFilter, MoreHorizontal, RefreshCw, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'

const eventColumns = ['Event','Device','Provider','Severity','Message','Code','IDENT','Protocol','State','Processed','Occurred','Created','Updated'] as const
type EventColumn = typeof eventColumns[number]
type ConnectivityEvent = Record<EventColumn,string> & { id:string }

const defaultColumns = Object.fromEntries(eventColumns.map(column => [column, !['IDENT','Protocol','State','Updated'].includes(column)])) as Record<EventColumn,boolean>
const blankFilters = () => ({ event:'', device:'', provider:'', severity:'', code:'', processed:'', occurred:'', created:'', updated:'' })

export function EventsPage() {
  const [events] = useState<ConnectivityEvent[]>([])
  const [search,setSearch] = useState('')
  const [filtersOpen,setFiltersOpen] = useState(false)
  const [columnsOpen,setColumnsOpen] = useState(false)
  const [filters,setFilters] = useState(blankFilters)
  const [draftFilters,setDraftFilters] = useState(blankFilters)
  const [visibleColumns,setVisibleColumns] = useState<Record<EventColumn,boolean>>(defaultColumns)
  const [notice,setNoticeState] = useState('')
  const [guideOpen,setGuideOpen] = useState(false)
  const setNotice = (message:string) => message==='The events guide explains provider signals, severity, and processing status.' ? setGuideOpen(true) : setNoticeState(message)

  const filtered = useMemo(() => events.filter(event => {
    const needle=search.trim().toLowerCase()
    return (!needle || JSON.stringify(event).toLowerCase().includes(needle)) &&
      event.Event.toLowerCase().includes(filters.event.toLowerCase()) &&
      (!filters.device || event.Device===filters.device) &&
      (!filters.provider || event.Provider===filters.provider) &&
      (!filters.severity || event.Severity===filters.severity) &&
      event.Code.toLowerCase().includes(filters.code.toLowerCase()) &&
      (!filters.processed || event.Processed===filters.processed) &&
      event.Occurred.includes(filters.occurred) && event.Created.includes(filters.created) && event.Updated.includes(filters.updated)
  }),[events,search,filters])

  function clearFilters(){const empty=blankFilters();setDraftFilters(empty);setFilters(empty);setFiltersOpen(false)}
  function refresh(){setNotice('Connectivity events refreshed.');setFiltersOpen(false);setColumnsOpen(false)}

  return <div className="maintenance-list-page work-orders-page devices-page events-page">
    <header className="maintenance-list-header"><h2>Connectivity Events</h2><div className="maintenance-list-search"><Search/><input aria-label="Search" placeholder="Search Connectivity Events" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="maintenance-list-actions events-actions">
      <button aria-label="Filter connectivity events" className={filtersOpen?'active':''} onClick={()=>{setDraftFilters(filters);setFiltersOpen(v=>!v);setColumnsOpen(false)}}><Funnel/></button>
      <button aria-label="Customize columns" className={columnsOpen?'active':''} onClick={()=>{setColumnsOpen(v=>!v);setFiltersOpen(false)}}><SlidersHorizontal/></button>
      <button aria-label="Refresh" onClick={refresh}><RefreshCw/></button>
      {filtersOpen&&<div className="maintenance-filter-panel work-order-filter event-filter-panel"><header>Filters</header><div className="maintenance-filter-grid">
        <Filter label="Event" value={draftFilters.event} onChange={event=>setDraftFilters(current=>({...current,event}))}/>
        <SelectFilter label="Device" placeholder="Select device" value={draftFilters.device} options={['Unassigned']} onChange={device=>setDraftFilters(current=>({...current,device}))}/>
        <SelectFilter label="Provider" placeholder="Select telematic" value={draftFilters.provider} options={['Flespi','Geotab','Samsara','AFAQY','Safee Tracking']} onChange={provider=>setDraftFilters(current=>({...current,provider}))}/>
        <SelectFilter label="Severity" value={draftFilters.severity} options={['Info','Warning','Critical']} onChange={severity=>setDraftFilters(current=>({...current,severity}))}/>
        <Filter label="Code" value={draftFilters.code} onChange={code=>setDraftFilters(current=>({...current,code}))}/>
        <SelectFilter label="Processed" value={draftFilters.processed} options={['Yes','No']} onChange={processed=>setDraftFilters(current=>({...current,processed}))}/>
        <Filter label="Occurred" type="date" value={draftFilters.occurred} onChange={occurred=>setDraftFilters(current=>({...current,occurred}))}/>
        <Filter label="Created" type="date" value={draftFilters.created} onChange={created=>setDraftFilters(current=>({...current,created}))}/>
        <Filter label="Updated" type="date" value={draftFilters.updated} onChange={updated=>setDraftFilters(current=>({...current,updated}))}/>
      </div><footer><button onClick={clearFilters}><Trash2/>Clear</button><button className="apply" onClick={()=>{setFilters(draftFilters);setFiltersOpen(false)}}><Check/>Apply</button></footer></div>}
      {columnsOpen&&<div className="maintenance-columns-menu device-columns-menu event-columns-menu"><strong>Customize Columns</strong><div>{eventColumns.map(column=><label key={column}><input aria-label={column} type="checkbox" checked={visibleColumns[column]} onChange={e=>setVisibleColumns(current=>({...current,[column]:e.target.checked}))}/>{column}</label>)}</div><button className="columns-done" onClick={()=>setColumnsOpen(false)}>Done</button></div>}
    </div></header>
    {notice&&<div className="maintenance-list-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={()=>setNotice('')}><X/></button></div>}
    <section className="maintenance-table-panel"><div className="table-wrap"><table className="maintenance-schedules-table work-orders-table events-table"><thead><tr><th><input aria-label="Select all connectivity events" type="checkbox"/></th>{eventColumns.filter(column=>visibleColumns[column]).map(column=><th key={column}>{column}{column!=='Message'&&<span>↕</span>}</th>)}<th/></tr></thead><tbody>{filtered.map(event=><tr key={event.id}><td><input aria-label={`Select ${event.Event}`} type="checkbox"/></td>{eventColumns.filter(column=>visibleColumns[column]).map(column=><td key={column}>{column==='Severity'?<span className={`event-severity ${event.Severity.toLowerCase()}`}>{event[column]}</span>:event[column]}</td>)}<td className="schedule-row-actions"><button aria-label={`Actions for ${event.Event}`}><MoreHorizontal/></button></td></tr>)}</tbody></table></div>
      {!filtered.length&&<div className="work-orders-empty"><span><ListFilter/></span><h3>{search?'No matching connectivity events':'No connectivity events yet'}</h3><p>{search?'Try changing your search.':'Events appear here after connected devices or providers begin sending telemetry signals.'}</p>{!search&&<div><button onClick={refresh}><RefreshCw/>Refresh</button><button className="guide" onClick={()=>setNotice('The events guide explains provider signals, severity, and processing status.')}><BookOpen/>Events guide</button></div>}</div>}
      <footer><p>Showing <b>{filtered.length?1:0}</b> to <b>{filtered.length||1}</b> of <b>{filtered.length}</b> results</p><div><button disabled><ChevronLeft/></button><button className="active">1</button><button disabled><ChevronRight/></button></div></footer>
    </section>
    {guideOpen&&<EventsGuide onClose={()=>setGuideOpen(false)}/>} 
  </div>
}

const eventTypes=[['Position Update','GPS tracker or telematics modem','Latitude, longitude, speed, heading, altitude'],['OBD-II Reading','OBD-II scanner','RPM, fuel level, coolant temperature, engine hours, fault codes'],['Temperature Reading','Temperature sensor','Temperature value, timestamp'],['Door Event','Door sensor','Open / Closed state, timestamp'],['Motion Event','Motion/vibration sensor','G-force, impact severity'],['Speed Alert','GPS or OBD-II','Speed exceeded threshold'],['Geofence Event','Geofence service','Entry / Exit for a service area or zone'],['Fault Code','OBD-II scanner','DTC (Diagnostic Trouble Code) with severity'],['Device Heartbeat','Any device','Connectivity status check']]
const payload=`{
  "id": "event_01H...",
  "device_id": "device_01H...",
  "vehicle_id": "vehicle_01H...",
  "event_type": "position_update",
  "timestamp": "2025-04-30T08:42:15Z",
  "location": {
    "type": "Point",
    "coordinates": [103.8198, 1.3521]
  },
  "data": {
    "speed": 42.5,
    "heading": 225,
    "altitude": 15.2,
    "accuracy": 4.0
  }
}`
function EventsGuide({onClose}:{onClose:()=>void}){return <div className="device-guide-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className="device-guide-panel" role="dialog" aria-modal="true" aria-labelledby="events-guide-title"><header><h2 id="events-guide-title">Events guide</h2><div><button aria-label="Open documentation in a new tab" onClick={()=>window.open('/integrations?view=events#events-guide','_blank','noopener,noreferrer')}><ExternalLink/></button><button aria-label="Close documentation" onClick={onClose}><X/></button></div></header><article id="events-guide"><span className="guide-kicker">Events</span><h1>Device Events</h1><p>View and inspect raw device and sensor events — GPS readings, OBD-II data, sensor values, and system events from connected fleet hardware.</p><h2>Device Events</h2><p><strong>Device Events</strong> are the raw data points received from connected fleet hardware. Every time a device or sensor sends data to Fleet-Ops, a DeviceEvent is recorded.</p><p>Navigate to <strong>Fleet-Ops → Connectivity → Events</strong>.</p><EventsGuideTable title="Event Types" headings={['Event Type','Source','Data Captured']} rows={eventTypes}/><h2>Viewing Events</h2><p>The Events list shows all recent device events across your fleet. Filter by:</p><ul><li><strong>Device</strong> — events from a specific GPS tracker or modem</li><li><strong>Vehicle</strong> — all events associated with a vehicle</li><li><strong>Event Type</strong> — position updates, OBD readings, alerts, and more</li><li><strong>Date Range</strong> — events from a specific period</li></ul><p>Click any event row to see the full event payload, including raw data and exact coordinates.</p><h2>Event Payload</h2><p>Each event record contains:</p><pre>{payload}</pre><h2>Event Inspection</h2><p>Clicking an event opens the <strong>Event Detail</strong> view, which shows:</p><ul><li>Device and vehicle linked to the event</li><li>Full event payload with all data fields</li><li>Map showing the event location</li><li>Link to the vehicle position history for context</li></ul><h2>Using Events for Investigations</h2><p>Device events are useful for post-incident investigations:</p><ul><li><strong>Accident reconstruction</strong> — replay position events before impact</li><li><strong>Unauthorized use</strong> — check activity outside driver hours</li><li><strong>Cold chain breach</strong> — find readings that exceeded thresholds</li><li><strong>Excessive idling</strong> — identify zero-speed, engine-on periods</li></ul><h2>Programmatic Access</h2><p>Device events can be accessed through the internal API:</p><pre>GET /int/v1/fleet-ops/devices/{'{device_id}'}/events</pre><p>The response includes paginated events with full payload data, suitable for external analytics or compliance systems.</p></article></aside></div>}
function EventsGuideTable({title,headings,rows}:{title:string;headings:string[];rows:string[][]}){return <><h2>{title}</h2><table><thead><tr>{headings.map(heading=><th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row[0]}>{row.map((cell,index)=><td key={cell}>{index===0?<strong>{cell}</strong>:cell}</td>)}</tr>)}</tbody></table></>}

function Filter({label,value,onChange,type='text'}:{label:string;value:string;onChange:(value:string)=>void;type?:string}){return <label><strong>{label}</strong><span><input aria-label={label} placeholder={label} type={type} value={value} onChange={e=>onChange(e.target.value)}/>{value&&type!=='date'&&<button aria-label={`Clear ${label} filter`} onClick={()=>onChange('')}><X/></button>}</span></label>}
function SelectFilter({label,placeholder,value,options,onChange}:{label:string;placeholder?:string;value:string;options:string[];onChange:(value:string)=>void}){return <label><strong>{label}</strong><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}><option value="">{placeholder||label}</option>{options.map(option=><option key={option}>{option}</option>)}</select></label>}
