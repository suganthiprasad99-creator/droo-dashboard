'use client'

import { Bell, Car, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, Copy, MapPin, RefreshCw, Route, Truck, UserRound, Wrench, Zap } from 'lucide-react'

const orders = [
  ['ORD-2026-07-28-001', 'NovaPoshta Parcels', 'In Transit', '28 Jul, 11:45 AM'],
  ['ORD-2026-07-28-002', 'QuickShip Colombo', 'In Transit', '28 Jul, 10:30 AM'],
  ['ORD-2026-07-28-003', 'City Express', 'Pending Pickup', '28 Jul, 09:00 AM'],
  ['ORD-2026-07-28-004', 'Swift Logistics', 'Delivered', '27 Jul, 06:15 PM'],
]

function LineChart({ filled = false }: { filled?: boolean }) {
  return <svg className="shot-line-chart" viewBox="0 0 420 120" preserveAspectRatio="none"><defs><linearGradient id={filled ? 'fill-a' : 'fill-b'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff5258" stopOpacity=".28"/><stop offset="1" stopColor="#ff5258" stopOpacity="0"/></linearGradient></defs>{filled && <path d="M0 104 L35 94 L70 98 L105 78 L140 82 L175 57 L210 63 L245 42 L280 58 L315 74 L350 62 L385 88 L420 84 L420 120 L0 120Z" fill="url(#fill-a)"/>}<polyline points="0,104 35,94 70,98 105,78 140,82 175,57 210,63 245,42 280,58 315,74 350,62 385,88 420,84" fill="none" stroke="#ff4f55" strokeWidth="3"/></svg>
}

export function OverviewPage() {
  return <div className="shot-dashboard">
    <header className="shot-dashboard-head"><h1>Default Dashboard</h1><label><span>Select vehicle</span><button>Vehicle 01&nbsp; · &nbsp;WP CAB-4582 <ChevronDown /></button></label><div className="shot-dashboard-select"><button>Default Dashboard <ChevronDown /></button><button>•••</button></div></header>

    <section className="shot-map-card">
      <div className="shot-map-tabs"><button className="active">Tracking</button><button>Traffic</button><button>POI</button></div>
      <aside className="shot-route-stats"><div><Route/><span>Distance remaining<strong>12 <small>km</small></strong></span></div><div><CircleDollarSign/><span>ETA<strong>28 <small>min</small></strong></span></div><div><i className="progress-ring">68</i><span>Route progress<strong>68 <small>%</small></strong><em><b/></em></span></div></aside>
      <div className="shot-map-canvas"><span className="map-city city-colombo">COLOMBO</span><span className="map-city city-kaduwela">KADUWELA</span><span className="map-city city-kotte">KOTTE</span><span className="map-city city-malabe">MALABE</span><svg viewBox="0 0 900 300" preserveAspectRatio="none"><path d="M75 222 C170 210 180 155 278 160 S420 135 475 175 S610 205 680 150 S790 120 850 93"/><circle cx="75" cy="222" r="14"/><circle cx="278" cy="160" r="14"/><circle cx="680" cy="150" r="14"/><circle cx="850" cy="93" r="10"/></svg><span className="map-truck"><Truck/></span><span className="map-pin"><MapPin/></span></div>
      <div className="shot-map-tools"><button>+</button><button>−</button><button><RefreshCw/></button></div>
      <aside className="shot-alert"><header><Bell/> Alerts &amp; Notifications</header><div><Bell/><p><strong>Geofence alert <time>13:48</time></strong><span>Truck entered restricted zone near Warehouse B.</span></p></div><button>View all alerts <ChevronRight/></button></aside>
    </section>

    <section className="shot-kpis">{[[CircleDollarSign,'Earnings','₹0.00'],[ClipboardList,'Avg order value','₹0.00'],[Zap,'Active orders','5'],[UserRound,'Drivers online','2']].map(([Icon,label,value])=>{const I=Icon as React.ElementType;return <article key={String(label)}><header>{String(label)}<I/></header><strong>{String(value)}</strong>{String(label).includes('value')||String(label)==='Earnings'?<b>0%</b>:null}</article>})}</section>

    <section className="shot-orders-load">
      <article className="shot-active-orders"><h2>Active Orders</h2><div className="orders-columns"><div className="order-list"><h3>Orders</h3>{orders.map((order,index)=><button key={order[0]} className={index===0?'selected':''}><strong>{order[0]}</strong><span>{order[1]}</span><b className={order[2]==='Delivered'?'done':''}>{order[2]}</b><small>{order[3]}</small>{index===0&&<ChevronRight/>}</button>)}</div><div className="order-detail"><h3>Order Details</h3><small>ORDER ID</small><strong>ORD-2026-07-28-001 <Copy/></strong><small>CUSTOMER</small><strong>NovaPoshta Parcels</strong><small>PICKUP</small><strong>Kaduwela DC <MapPin/></strong><span>28 Jul, 09:15 AM</span><small>DROP-OFF</small><strong>Colombo Fort <MapPin/></strong><span>28 Jul, 11:45 AM</span><hr/><small>DRIVER</small><strong>Nimal Silva</strong><small>VEHICLE</small><strong>WP CAB-4582</strong><small>STATUS</small><b>In Transit</b><small>ESTIMATED ARRIVAL</small><em>28 Jul, 11:45 AM</em></div></div></article>
      <article className="shot-vehicle-load"><header><h2>Vehicle Load</h2><span>• Live</span></header><div className="truck-stage"><button><ChevronLeft/></button><div className="truck-art"><div className="truck-cab"/><div className="truck-box"><strong>68%</strong></div><i/><i/><i/></div><button><ChevronRight/></button></div><strong className="capacity">68%</strong><span>capacity</span><small>VEHICLE</small><b>WP CAB-4582</b><div className="load-numbers"><p><span>CURRENT LOAD</span><strong>6,120 KG</strong></p><p><span>MAX LOAD</span><strong>9,000 KG</strong></p></div><footer>Assigned to selected order<div><b/><i/><i/><i/><i/><span>1 of 6</span></div></footer></article>
    </section>

    <section className="shot-charts"><article><header>Delivery Trends <span>30d⌄</span></header><LineChart filled/></article><article className="efficiency"><header>Route Efficiency <span>30d⌄</span></header><strong>94<small>%</small></strong><p>vs previous 30 days</p><LineChart/><b>↑ 12%</b><small>The best road usage this month.</small></article><article><header>Revenue Trend <span>7d&nbsp;&nbsp; <b>30d</b>&nbsp;&nbsp; 90d</span></header><LineChart filled/></article></section>

    <section className="shot-small-widgets"><article className="top-drivers"><header>Top Drivers <span>Orders　 On-time　 Distance</span></header><div><b>1</b><i>N</i><p><strong>Nimal Silva</strong><span>2 orders · 78km</span></p><em>50%</em></div><div><b>2</b><i>A</i><p><strong>Arun Perera</strong><span>1 order · 22km</span></p><em>50%</em></div></article><article className="maintenance"><header>Maintenance Overview <Wrench/></header><div><p>OVERDUE<strong>0</strong></p><p>NEXT 7D<strong>0</strong></p><p>MTD<strong>₹0.00</strong></p></div><span>No upcoming maintenance.</span></article><article className="financial"><header>Recent Financial Activity <RefreshCw/></header><small>Latest journal entries posted to the ledger</small><div className="journal"><ClipboardList/><p><strong>Storefront sale · Order order_1m8xvhuacr</strong><span>Jul 28, 2026 · Cash / Sales Revenue</span></p><b>₹12.50</b></div><div className="finance-stats">{[['Revenue','₹12.50'],['Net income','₹12.50'],['Outstanding AR','₹0.00'],['Expenses','₹0.00']].map(v=><p key={v[0]}><span>{v[0]}</span><strong>{v[1]}</strong><small>vs previous period</small></p>)}</div></article></section>

    <section className="shot-bottom"><article><header>Fleetbase Blog <span>View all posts →</span></header><div className="featured-img"/><h3>The future of fleet operations is connected</h3><p>Explore how real-time visibility, automation, and AI are transforming modern fleet management.</p><small>Jul 24, 2026　·　5 min read</small></article><article className="developer-card"><h2>Built for developers.<br/>Backed by community.</h2><p>Droo is open, extensible, and stronger together. Join the conversation, contribute, and help shape the future.</p><a>Star us on GitHub　↗</a><a>Join our community　↗</a><div className="developer-art">&lt;/&gt;</div></article></section>
    <footer className="shot-footer">© 2026 Droo. All rights reserved.<span>Privacy Policy　 Terms of Service　 Status</span></footer>
  </div>
}
