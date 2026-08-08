'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  BarChart3, Bell, BookOpen, BriefcaseBusiness, Calculator, Car, Check, ChevronDown, Code2, CreditCard, Gauge,
  FileText, Globe2, HelpCircle, IdCard, Inbox,
  CalendarDays, Home, Keyboard, KeyRound, Layers3, LogOut, Menu, MessageSquare, MoreHorizontal, Moon, Network, Package,
  Landmark, PanelLeft, Plus, Radio, ReceiptText, Rocket, Search, Settings2, Shield, SlidersHorizontal, Store,
  Sun, Truck, Unplug, UserRound, Users, UsersRound, WalletCards, Webhook, Workflow, Wrench, X,
} from 'lucide-react'
import { useApiData } from '@/hooks/use-api-data'
import type { ApiRecord } from '@/types/dashboard'

const sidebarGroups = [
  { name: 'Operations', icon: Workflow, items: [['Orders', '/orders'], ['Orchestrator', '/orchestrator'], ['Route Efficiency', '/route-efficiency'], ['Scheduler', '/scheduler'], ['Order Config', '/order-config'], ['Service Rates', '/fleet-ops/service-rates']] },
  { name: 'Resources', icon: Truck, items: [['Resources Hub', '/overview'], ['Drivers', '/drivers'], ['Vehicles', '/vehicles'], ['Fleets', '/fleets'], ['Vendors', '/integrations'], ['Contacts', '/settings'], ['Places', '/service-areas'], ['Fuel Reports', '/earnings'], ['Fuel Transactions', '/earnings'], ['Issues', '/issues']] },
  { name: 'Maintenance', icon: Wrench, items: [['Maintenance Hub', '/issues'], ['Schedules', '/issues'], ['Work Orders', '/issues'], ['Maintenances', '/issues'], ['Equipment', '/issues'], ['Parts', '/issues']] },
  { name: 'Connectivity', icon: Radio, items: [['Telematics', '/integrations'], ['Fuel Providers', '/integrations'], ['Devices', '/integrations'], ['Sensors', '/integrations'], ['Events', '/integrations']] },
  { name: 'Analytics', icon: BarChart3, items: [['Dashboard', '/overview'], ['Route Efficiency', '/route-efficiency'], ['Reports', '/earnings']] },
  { name: 'Settings', icon: Settings2, items: [['Settings Hub', '/settings'], ['Navigator App', '/settings'], ['Map', '/service-areas'], ['Payments', '/earnings'], ['Notifications', '/settings'], ['Routing', '/settings'], ['Orchestrator', '/settings'], ['Scheduling', '/settings'], ['Custom Fields', '/settings'], ['Avatars', '/settings']] },
] as const

const products = [
  ['Fleet-Ops', '/orchestrator', Workflow, 'Operations'],
  ['Storefront', '/storefront', BriefcaseBusiness, 'Storefront'],
  ['Ledger', '/ledger', Calculator, 'Ledger'],
  ['IAM', '/iam', Shield, 'IAM'],
  ['Developers', '/developers', Code2, 'Developers'],
] as const

const storefrontItems = [
  ['Dashboard', '/storefront', Home],
  ['Products', '/storefront?view=products', Package],
  ['Catalogs', '/storefront?view=catalogs', BookOpen],
  ['Customers', '/storefront?view=customers', UsersRound],
  ['Orders', '/storefront?view=orders', ReceiptText],
  ['Networks', '/storefront?view=networks', Network],
  ['Food Trucks', '/storefront?view=food-trucks', Truck],
  ['Promotions', '/storefront?view=promotions', Radio],
  ['Settings', '/storefront?view=settings', Settings2],
  ['Launch App', '/storefront?view=launch', Rocket],
] as const

const ledgerItems = [
  ['Dashboard', '/ledger', BarChart3],
  ['Billing', '/ledger/billing/invoices', ReceiptText],
  ['Payments', '/ledger/payments/transactions', CreditCard],
  ['Accounting', '/ledger/accounting/accounts', Calculator],
  ['Reports', '/earnings', Landmark],
  ['Settings', '/ledger?view=settings', Settings2],
] as const

const iamItems = [
  ['Dashboard', '/iam', Home],
  ['Users', '/iam?view=users', IdCard],
  ['Groups', '/iam?view=groups', UsersRound],
  ['Roles', '/iam?view=roles', ReceiptText],
  ['Policies', '/iam?view=policies', Shield],
] as const

const developerItems = [
  ['Dashboard', '/developers', Home],
  ['API Keys', '/developers?view=api-keys', KeyRound],
  ['Webhooks', '/developers?view=webhooks', Webhook],
  ['WebSockets', '/developers?view=websockets', Unplug],
  ['Logs', '/developers?view=logs', FileText],
  ['Events', '/developers?view=events', CalendarDays],
] as const

type OpenMenu = 'organization' | 'user' | 'notifications' | 'locale' | 'chat' | 'more' | 'customize' | 'shortcuts' | null
type ResourceTab = 'Fleets' | 'Drivers' | 'Vehicles'

function SidebarResources() {
  const [resourceTab, setResourceTab] = useState<ResourceTab>('Fleets')
  const [resourceFilter, setResourceFilter] = useState('')
  const { rows: drivers, loading: driversLoading, error: driversError } = useApiData('Drivers', 30_000)
  const { rows: vehicles, loading: vehiclesLoading, error: vehiclesError } = useApiData('Vehicles', 30_000)
  const { rows: fleets, loading: fleetsLoading, error: fleetsError } = useApiData('Fleets', 30_000)
  const { rows: liveDrivers, loading: liveLoading, error: liveError } = useApiData('Live Operations', 15_000)
  const onlineDriverIDs = new Set(liveDrivers.map(row => String(((row.driver || {}) as ApiRecord).id || row.id || '')))
  const onlineVehicleCount = vehicles.filter(vehicle => onlineDriverIDs.has(String(vehicle.driver_id || ''))).length
  const rows = resourceTab === 'Drivers' ? drivers : resourceTab === 'Vehicles' ? vehicles : fleets
  const loading = resourceTab === 'Drivers' ? driversLoading : resourceTab === 'Vehicles' ? vehiclesLoading : fleetsLoading
  const error = resourceTab === 'Drivers' ? driversError : resourceTab === 'Vehicles' ? vehiclesError : fleetsError
  const query = resourceFilter.trim().toLowerCase()
  const visibleRows = rows.filter(row => !query || JSON.stringify(row).toLowerCase().includes(query)).slice(0, 6)
  const href = resourceTab === 'Drivers' ? '/drivers' : resourceTab === 'Vehicles' ? '/vehicles' : '/fleets'
  const Icon = resourceTab === 'Fleets' ? Users : resourceTab === 'Drivers' ? Truck : Car

  function title(row: ApiRecord) {
    return String(resourceTab === 'Drivers' ? row.name || row.phone || row.id : resourceTab === 'Vehicles' ? row.registration_number || row.name || row.id : row.name || row.id)
  }
  function detail(row: ApiRecord) {
    if (resourceTab === 'Drivers') return onlineDriverIDs.has(String(row.id)) ? 'Online' : String(row.status || 'Offline')
    if (resourceTab === 'Vehicles') return `${String(row.assigned_driver || row.driver_uuid || 'Unassigned')} · ${onlineDriverIDs.has(String(row.driver_id || '')) ? 'Online' : String(row.status || 'Offline')}`
    return `${Number(row.drivers || 0)} drivers · ${Number(row.vehicles || 0)} vehicles`
  }

  return <>
    <div className="live-operations-summary"><strong>LIVE OPERATIONS</strong><span><i className="online" />{liveLoading ? '—' : liveError ? 'Unavailable' : liveDrivers.length} drivers online</span><span><i />{liveLoading || vehiclesLoading ? '—' : liveError || vehiclesError ? 'Unavailable' : onlineVehicleCount} vehicles online</span></div>
    <div className="resource-tabs">{(['Fleets', 'Drivers', 'Vehicles'] as const).map(tab => <button key={tab} className={resourceTab === tab ? 'active' : ''} onClick={() => { setResourceTab(tab); setResourceFilter('') }}>{tab}</button>)}</div>
    <label className="resource-filter"><Search /><input value={resourceFilter} onChange={event => setResourceFilter(event.target.value)} placeholder="Filter resources…" aria-label={`Filter ${resourceTab.toLowerCase()}`} /></label>
    {visibleRows.length ? <div className="sidebar-resource-list">{visibleRows.map((row, index) => <Link href={href} key={String(row.id || index)}><Icon /><span><strong>{title(row)}</strong><small>{detail(row)}</small></span></Link>)}</div> : <div className="resource-empty"><Icon /><strong>{loading ? `Loading ${resourceTab.toLowerCase()}…` : error ? `${resourceTab} unavailable` : query ? `No matching ${resourceTab.toLowerCase()}` : `No ${resourceTab.toLowerCase()} yet`}</strong><span>{error || (resourceTab === 'Fleets' ? 'Create fleets to organize drivers and vehicles.' : `Available ${resourceTab.toLowerCase()} will appear here.`)}</span></div>}
  </>
}

export function AppShell({ children, homeMode = false }: { children: React.ReactNode; homeMode?: boolean }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const menusRef = useRef<HTMLElement>(null)
  const [dark, setDark] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [locale, setLocale] = useState('English')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [currentSidebarGroup, setCurrentSidebarGroup] = useState<string | null>(null)
  const initialProduct = pathname.startsWith('/storefront') ? 'Storefront' : pathname.startsWith('/ledger') ? 'Ledger' : pathname.startsWith('/iam') ? 'IAM' : pathname.startsWith('/developers') ? 'Developers' : 'Fleet-Ops'
  const [activeSidebarGroup, setActiveSidebarGroup] = useState(initialProduct === 'Fleet-Ops' ? 'Operations' : initialProduct)
  const [activeProduct, setActiveProduct] = useState(initialProduct)

  useEffect(() => {
    const storedTheme = localStorage.getItem('droo-theme')
    const useDark = storedTheme ? storedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', useDark)
    const frame = requestAnimationFrame(() => {
      setDark(useDark)
      setCollapsed(localStorage.getItem('droo-sidebar-collapsed') === 'true')
      setLocale(localStorage.getItem('droo-locale') || 'English')
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        router.push('/orders')
      }
      if (event.key === 'Escape') {
        setOpenMenu(null)
        setMobile(false)
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (menusRef.current && !menusRef.current.contains(event.target as Node)) setOpenMenu(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [router])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('droo-theme', next ? 'dark' : 'light')
  }

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('droo-sidebar-collapsed', String(next))
  }

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => setOpenMenu((current) => current === menu ? null : menu)

  return <div className={`app ${collapsed ? 'sidebar-collapsed' : ''} ${homeMode ? 'dashboard-home' : ''}`}>
    {!homeMode && <aside className={mobile ? 'sidebar open' : 'sidebar'} aria-label="Primary navigation">
      <div className="brand">
        <div className="logo"><Layers3 /></div>
        <div className="brand-copy"><strong>Droo.</strong><span>Operations</span></div>
        <button className="mobile-close" onClick={() => setMobile(false)} aria-label="Close navigation"><X /></button>
      </div>
      {activeProduct === 'Storefront' ? <>
        <div className="storefront-sidebar-actions">
          <button className="store-selector"><Store /><span>Product Stationery Store</span><ChevronDown /></button>
          <label className="fleet-sidebar-search"><Search /><input value={sidebarSearch} onChange={(event) => setSidebarSearch(event.target.value)} placeholder="Search Storefront..." /><kbd>Cmd K</kbd></label>
        </div>
        <nav className="storefront-sidebar-nav" aria-label="Storefront navigation">
          {storefrontItems.filter(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(([label, href, Icon]) => {
            const currentView = searchParams.get('view')
            const targetView = href.includes('view=') ? href.split('view=')[1] : null
            const isActive = pathname === '/storefront' && (targetView ? currentView === targetView : !currentView)
            return <Link key={label} href={href} className={isActive ? 'active' : ''} aria-current={isActive ? 'page' : undefined} onClick={() => setMobile(false)}><Icon /><span>{label}</span>{['Products', 'Promotions', 'Settings'].includes(label) && <ChevronDown />}</Link>
          })}
        </nav>
        <footer className="storefront-sidebar-footer"><strong>Droo</strong><span>v1.0 · Legal</span></footer>
      </> : activeProduct === 'Ledger' ? <>
        <div className="ledger-sidebar-actions">
          <label className="fleet-sidebar-search"><Search /><input value={sidebarSearch} onChange={(event) => setSidebarSearch(event.target.value)} placeholder="Search Ledger..." /><kbd>Cmd K</kbd></label>
        </div>
        <nav className="ledger-sidebar-nav" aria-label="Ledger navigation">
          {pathname.startsWith('/ledger/billing') ? <>
            <Link href="/ledger" className="ledger-sidebar-back"><ChevronDown /><span>Billing</span></Link>
            <Link href="/ledger/billing/invoices" className={pathname.endsWith('/invoices') ? 'active' : ''} aria-current={pathname.endsWith('/invoices') ? 'page' : undefined} onClick={() => setMobile(false)}><ReceiptText /><span>Invoices</span></Link>
            <Link href="/ledger/billing/invoice-templates" className={pathname.endsWith('/invoice-templates') ? 'active' : ''} aria-current={pathname.endsWith('/invoice-templates') ? 'page' : undefined} onClick={() => setMobile(false)}><FileText /><span>Invoice Templates</span></Link>
          </> : pathname.startsWith('/ledger/payments') ? <>
            <Link href="/ledger" className="ledger-sidebar-back"><ChevronDown /><span>Payments</span></Link>
            <Link href="/ledger/payments/transactions" className={pathname.includes('/transactions') ? 'active' : ''} aria-current={pathname.includes('/transactions') ? 'page' : undefined} onClick={() => setMobile(false)}><CreditCard /><span>Transactions</span></Link>
            <Link href="/ledger/payments/wallets" onClick={() => setMobile(false)}><WalletCards /><span>Wallets</span></Link>
            <Link href="/ledger/payments/gateways" onClick={() => setMobile(false)}><Landmark /><span>Gateways</span></Link>
          </> : pathname.startsWith('/ledger/accounting') ? <>
            <Link href="/ledger" className="ledger-sidebar-back"><ChevronDown /><span>Accounting</span></Link>
            <Link href="/ledger/accounting/accounts" className={pathname.includes('/accounts') ? 'active' : ''} aria-current={pathname.includes('/accounts') ? 'page' : undefined} onClick={() => setMobile(false)}><Network /><span>Chart of Accounts</span></Link>
            <Link href="/ledger/accounting/journal" className={pathname.includes('/journal') ? 'active' : ''} aria-current={pathname.includes('/journal') ? 'page' : undefined} onClick={() => setMobile(false)}><BookOpen /><span>Journal Entries</span></Link>
            <Link href="/ledger/accounting/general-ledger" className={pathname.includes('/general-ledger') ? 'active' : ''} aria-current={pathname.includes('/general-ledger') ? 'page' : undefined} onClick={() => setMobile(false)}><FileText /><span>General Ledger</span></Link>
          </> : ledgerItems.filter(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(([label, href, Icon]) => {
            const isActive = label === 'Dashboard' && pathname === '/ledger'
            return <Link key={label} href={href} className={isActive ? 'active' : ''} aria-current={isActive ? 'page' : undefined} onClick={() => setMobile(false)}><Icon /><span>{label}</span>{label !== 'Dashboard' && <ChevronDown />}</Link>
          })}
        </nav>
        <footer className="ledger-sidebar-footer"><strong>Droo</strong><span>v1.0 · Legal</span></footer>
      </> : activeProduct === 'IAM' ? <>
        <div className="iam-sidebar-actions">
          <label className="fleet-sidebar-search"><Search /><input value={sidebarSearch} onChange={(event) => setSidebarSearch(event.target.value)} placeholder="Search IAM..." /><kbd>Cmd K</kbd></label>
        </div>
        <nav className="iam-sidebar-nav" aria-label="IAM navigation">
          {iamItems.filter(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(([label, href, Icon]) => {
            const isActive = label === 'Dashboard' && pathname === '/iam'
            return <Link key={label} href={href} className={isActive ? 'active' : ''} aria-current={isActive ? 'page' : undefined} onClick={() => setMobile(false)}><Icon /><span>{label}</span>{label === 'Users' && <ChevronDown />}</Link>
          })}
        </nav>
        <footer className="iam-sidebar-footer"><strong>Droo</strong><span>v1.0 · Legal</span></footer>
      </> : activeProduct === 'Developers' ? <>
        <div className="developers-sidebar-actions">
          <label className="fleet-sidebar-search"><Search /><input value={sidebarSearch} onChange={(event) => setSidebarSearch(event.target.value)} placeholder="Search Developers..." /><kbd>Cmd K</kbd></label>
        </div>
        <nav className="developers-sidebar-nav" aria-label="Developers navigation">
          {developerItems.filter(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(([label, href, Icon]) => {
            const view = searchParams.get('view')
            const hrefView = href.includes('view=') ? href.split('view=')[1] : null
            const isActive = pathname === '/developers' && (label === 'Dashboard' ? !view : view === hrefView)
            return <Link key={label} href={href} className={isActive ? 'active' : ''} aria-current={isActive ? 'page' : undefined} onClick={() => setMobile(false)}><Icon /><span>{label}</span></Link>
          })}
        </nav>
        <footer className="developers-sidebar-footer"><strong>Droo</strong><span>v1.0 · Legal</span></footer>
      </> : <>
      <div className="fleet-sidebar-actions">
        <Link href="/orders" className="create-order-action" onClick={() => setMobile(false)}><Plus /><span>Create new order</span></Link>
        <label className="fleet-sidebar-search"><Search /><input value={sidebarSearch} onChange={(event) => setSidebarSearch(event.target.value)} placeholder="Search Fleet-Ops..." /><kbd>Cmd K</kbd></label>
      </div>
      <nav className="fleet-sidebar-nav">
        {currentSidebarGroup ? <>
          <button className="sidebar-back" type="button" aria-label={`Back from ${currentSidebarGroup}`} onClick={() => { setCurrentSidebarGroup(null); setSidebarSearch('') }}><ChevronDown /><span>{currentSidebarGroup}</span></button>
          <div className="nested-sidebar-items">{sidebarGroups.find((group) => group.name === currentSidebarGroup)?.items.filter(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(([label, href]) => <Link key={label} href={href} className={pathname === href ? 'active' : ''} aria-current={pathname === href ? 'page' : undefined} onClick={() => setMobile(false)}><span>{label}</span></Link>)}</div>
        </> : sidebarGroups.filter(({ name, items }) => !sidebarSearch || name.toLowerCase().includes(sidebarSearch.toLowerCase()) || items.some(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase()))).map(({ name, icon: Icon }) => {
          const isActive = activeSidebarGroup === name
          return <button key={name} className={isActive ? 'group-trigger active' : 'group-trigger'} aria-current={isActive ? 'page' : undefined} onClick={() => {
            setActiveSidebarGroup(name)
            setSidebarSearch('')
            if (name === 'Operations') {
              setCurrentSidebarGroup('Operations')
              setMobile(false)
              router.push('/orders')
              return
            }
            setCurrentSidebarGroup(name)
          }} title={collapsed ? name : undefined}><Icon /><span>{name}</span><ChevronDown /></button>
        })}
      </nav>
      {(!currentSidebarGroup || currentSidebarGroup === 'Operations') && <footer className="fleet-sidebar-footer">
        <SidebarResources />
      </footer>}
      </>}
    </aside>}
    {!homeMode && mobile && <button className="overlay" aria-label="Close navigation" onClick={() => setMobile(false)} />}

    <section className="workspace">
      <header className="topbar console-navbar" ref={menusRef}>
        <div className="topbar-left">
          {!homeMode && <button className="mobile" onClick={() => setMobile((current) => !current)} aria-label={mobile ? 'Close navigation' : 'Open navigation'}>{mobile ? <X /> : <Menu />}</button>}
          <Link href="/" className="navbar-logo" aria-label="Droo home"><Layers3 /></Link>
          {!homeMode && <button className="desktop-sidebar-toggle" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><PanelLeft /></button>}
          <nav className="product-navigation" aria-label="Products">
            {products.map(([name, href, Icon, sidebarGroup]) => <Link key={name} href={href} className={activeProduct === name ? 'active' : ''} onClick={() => { setActiveProduct(name); setActiveSidebarGroup(sidebarGroup); setCurrentSidebarGroup(null); setSidebarSearch(''); setMobile(false) }}><Icon />{name}</Link>)}
            <div className="nav-menu-wrap">
              <button aria-label="More products" aria-expanded={openMenu === 'more'} onClick={() => toggleMenu('more')}><MoreHorizontal /></button>
              {openMenu === 'more' && <div className="nav-dropdown product-dropdown" role="menu">
                <div className="dropdown-heading"><strong>Applications</strong></div>
                {products.map(([name, href, Icon, sidebarGroup]) => <Link key={name} className="dropdown-item" href={href} onClick={() => { setActiveProduct(name); setActiveSidebarGroup(sidebarGroup); setCurrentSidebarGroup(null); setSidebarSearch(''); setMobile(false); setOpenMenu(null) }}><Icon />{name}</Link>)}
              </div>}
            </div>
            <div className="nav-menu-wrap">
              <button aria-label="Customize navigation" aria-expanded={openMenu === 'customize'} onClick={() => toggleMenu('customize')}><SlidersHorizontal /></button>
              {openMenu === 'customize' && <div className="nav-dropdown customize-dropdown" role="menu">
                <div className="dropdown-heading"><strong>Navigation</strong></div>
                <p className="dropdown-copy">Your available Droo modules are shown in the product bar and move into More on smaller screens.</p>
              </div>}
            </div>
          </nav>
        </div>

        <div className="header-actions">
          <div className="nav-menu-wrap">
            <button className="icon-action optional-action" aria-label={`Language: ${locale}`} aria-expanded={openMenu === 'locale'} onClick={() => toggleMenu('locale')}><Globe2 /></button>
            {openMenu === 'locale' && <div className="nav-dropdown compact-dropdown" role="menu">
              {['English', 'தமிழ்', 'हिन्दी'].map((language) => <button key={language} className="dropdown-item" onClick={() => { setLocale(language); localStorage.setItem('droo-locale', language); setOpenMenu(null) }}>{language === locale && <Check />}{language}</button>)}
            </div>}
          </div>
          <button className="icon-action optional-action" aria-label="Inbox" onClick={() => router.push('/issues')}><Inbox /></button>
          <div className="nav-menu-wrap">
            <button className="icon-action optional-action" aria-label="Chat" aria-expanded={openMenu === 'chat'} onClick={() => toggleMenu('chat')}><MessageSquare /></button>
            {openMenu === 'chat' && <div className="nav-dropdown notifications-dropdown" role="menu">
              <div className="dropdown-heading"><strong>Chat</strong></div>
              <div className="dropdown-empty"><MessageSquare /><strong>No active conversations</strong><span>Operational conversations will appear here.</span></div>
            </div>}
          </div>
          <div className="nav-menu-wrap">
            <button className="icon-action" aria-label="Notifications" aria-expanded={openMenu === 'notifications'} onClick={() => toggleMenu('notifications')}><Bell /><i /></button>
            {openMenu === 'notifications' && <div className="nav-dropdown notifications-dropdown" role="menu">
              <div className="dropdown-heading"><strong>Notifications</strong><button onClick={() => setOpenMenu(null)}>Mark all read</button></div>
              <div className="dropdown-empty"><Bell /><strong>You’re all caught up</strong><span>New operational alerts will appear here.</span></div>
            </div>}
          </div>

          <div className="nav-menu-wrap">
            <button className="organization-trigger" aria-expanded={openMenu === 'organization'} onClick={() => toggleMenu('organization')}><span>D</span><b>Droo Logistics</b><ChevronDown /></button>
            {openMenu === 'organization' && <div className="nav-dropdown organization-dropdown" role="menu">
              <div className="session-card"><span>D</span><p><strong>Droo Logistics</strong><small>Primary organization</small></p></div>
              <div className="dropdown-rule" />
              <button className="dropdown-item selected"><Check />Droo Logistics</button>
              <div className="dropdown-rule" />
              <Link className="dropdown-item" href="/" onClick={() => setOpenMenu(null)}><Gauge />Home</Link>
              <Link className="dropdown-item" href="/settings" onClick={() => setOpenMenu(null)}><Settings2 />Organization settings</Link>
            </div>}
          </div>

          <div className="nav-menu-wrap">
            <button className="user-trigger" aria-label="Open user menu" aria-expanded={openMenu === 'user'} onClick={() => toggleMenu('user')}>OP</button>
            {openMenu === 'user' && <div className="nav-dropdown user-dropdown" role="menu">
              <div className="session-card"><span>OP</span><p><strong>Operations user</strong><small>Administrator</small></p></div>
              <div className="dropdown-rule" />
              <Link className="dropdown-item" href="/settings" onClick={() => setOpenMenu(null)}><UserRound />View profile</Link>
              <button className="dropdown-item" onClick={() => toggleMenu('shortcuts')}><Keyboard />Keyboard shortcuts</button>
              <button className="dropdown-item" onClick={toggleTheme}>{dark ? <Sun /> : <Moon />}{dark ? 'Use light mode' : 'Use dark mode'}</button>
              <a className="dropdown-item" href="mailto:support@droo.com"><HelpCircle />Help &amp; support</a>
              <div className="dropdown-rule" />
              <button className="dropdown-item danger" onClick={() => setOpenMenu(null)}><LogOut />Log out</button>
            </div>}
          </div>
        </div>
        {openMenu === 'shortcuts' && <div className="shortcut-dialog" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="shortcut-card"><div className="dropdown-heading"><strong>Keyboard shortcuts</strong><button onClick={() => setOpenMenu(null)} aria-label="Close"><X /></button></div><div className="shortcut-row"><span>Open order search</span><kbd>⌘ / Ctrl + K</kbd></div><div className="shortcut-row"><span>Close menus</span><kbd>Esc</kbd></div></div>
        </div>}
      </header>
      <main>{children}</main>
    </section>
  </div>
}
