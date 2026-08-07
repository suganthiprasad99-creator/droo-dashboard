'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  BarChart3, Bell, BookOpen, BriefcaseBusiness, Calculator, Car, Check, ChevronDown, Code2, CreditCard, Gauge,
  FileText, Globe2, HelpCircle, IdCard, Inbox,
  CalendarDays, Home, Keyboard, KeyRound, Layers3, LogOut, Menu, MessageSquare, MoreHorizontal, Moon, Network, Package,
  Landmark, PanelLeft, Plus, Radio, ReceiptText, Rocket, Search, Settings2, Shield, SlidersHorizontal, Store,
  Sun, Truck, Unplug, UserRound, Users, UsersRound, Webhook, Workflow, Wrench, X,
} from 'lucide-react'
import { listDashboardState, putDashboardState } from '@/lib/dashboard-state'

const sidebarGroups = [
  { name: 'Operations', icon: Workflow, items: [['Orders', '/orders'], ['Orchestrator', '/orchestrator'], ['Route Efficiency', '/route-efficiency'], ['Scheduler', '/scheduler'], ['Order Config', '/order-config'], ['Service Rates', '/fleet-ops/service-rates']] },
  { name: 'Resources', icon: Truck, items: [['Resources Hub', '/overview'], ['Drivers', '/drivers'], ['Vehicles', '/vehicles'], ['Fleets', '/fleets'], ['Vendors', '/integrations'], ['Contacts', '/settings'], ['Places', '/service-areas'], ['Fuel Reports', '/earnings'], ['Fuel Transactions', '/earnings'], ['Issues', '/issues']] },
  { name: 'Maintenance', icon: Wrench, items: [['Maintenance Hub', '/issues?view=maintenance'], ['Schedules', '/issues?view=schedules'], ['Work Orders', '/issues?view=work-orders'], ['Maintenances', '/issues?view=maintenances'], ['Equipment', '/issues?view=equipment'], ['Parts', '/issues?view=parts']] },
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
  ['Billing', '/ledger?view=billing', ReceiptText],
  ['Payments', '/ledger?view=payments', CreditCard],
  ['Accounting', '/ledger?view=accounting', Calculator],
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
  const maintenanceLabels: Record<string, string> = { maintenance: 'Maintenance Hub', schedules: 'Schedules', 'work-orders': 'Work Orders', maintenances: 'Maintenances', equipment: 'Equipment', parts: 'Parts' }
  const initialMaintenanceItem = pathname === '/issues' ? maintenanceLabels[searchParams.get('view') || ''] ?? null : null
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [currentSidebarGroup, setCurrentSidebarGroup] = useState<string | null>(initialMaintenanceItem ? 'Maintenance' : null)
  const [, setSelectedSidebarItem] = useState<string | null>(initialMaintenanceItem)
  const initialProduct = pathname === '/storefront' ? 'Storefront' : pathname === '/ledger' ? 'Ledger' : pathname === '/iam' ? 'IAM' : pathname === '/developers' ? 'Developers' : 'Fleet-Ops'
  const [activeSidebarGroup, setActiveSidebarGroup] = useState(initialMaintenanceItem ? 'Maintenance' : initialProduct === 'Fleet-Ops' ? 'Operations' : initialProduct)
  const [activeProduct, setActiveProduct] = useState(initialProduct)
  const [resourceTab, setResourceTab] = useState<'Fleets' | 'Drivers' | 'Vehicles'>('Fleets')
  const sidebarItemActive = (href: string) => {
    const [targetPath, query = ''] = href.split('?')
    if (pathname !== targetPath) return false
    const target = new URLSearchParams(query)
    return Array.from(target.entries()).every(([key, value]) => searchParams.get(key) === value)
  }

  useEffect(() => {
    let cancelled = false
    listDashboardState<{ dark: boolean; collapsed: boolean; locale: string }>('ui-preferences').then(entries => {
      if (cancelled) return
      const saved = entries.find(entry => entry.key === 'preferences')?.value
      const useDark = saved?.dark ?? window.matchMedia('(prefers-color-scheme: dark)').matches
      setDark(useDark); setCollapsed(Boolean(saved?.collapsed)); setLocale(saved?.locale || 'English'); document.documentElement.classList.toggle('dark', useDark)
    }).catch(() => { const useDark = window.matchMedia('(prefers-color-scheme: dark)').matches; setDark(useDark); document.documentElement.classList.toggle('dark', useDark) })
    return () => { cancelled = true }
  }, [])

  const savePreferences = (next: { dark: boolean; collapsed: boolean; locale: string }) => { void putDashboardState('ui-preferences', 'preferences', next).catch(() => {}) }

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
    savePreferences({ dark: next, collapsed, locale })
  }

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    savePreferences({ dark, collapsed: next, locale })
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
          {ledgerItems.filter(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(([label, href, Icon]) => {
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
          <div className="nested-sidebar-items">{sidebarGroups.find((group) => group.name === currentSidebarGroup)?.items.filter(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(([label, href]) => { const selected = sidebarItemActive(href); return <Link key={label} href={href} className={selected ? 'active' : ''} aria-current={selected ? 'page' : undefined} onClick={() => { setSelectedSidebarItem(label); setMobile(false) }}><span>{label}</span></Link> })}</div>
        </> : sidebarGroups.filter(({ name, items }) => !sidebarSearch || name.toLowerCase().includes(sidebarSearch.toLowerCase()) || items.some(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase()))).map(({ name, icon: Icon }) => {
          const isActive = activeSidebarGroup === name
          return <button key={name} className={isActive ? 'group-trigger active' : 'group-trigger'} aria-current={isActive ? 'page' : undefined} onClick={() => {
            setActiveSidebarGroup(name)
            setSidebarSearch('')
            setSelectedSidebarItem(null)
            if (name === 'Operations') {
              setCurrentSidebarGroup('Operations')
              setMobile(false)
              router.push('/orders')
              return
            }
            setCurrentSidebarGroup(name)
            if (name === 'Maintenance') {
              setSelectedSidebarItem('Maintenance Hub')
              setMobile(false)
              router.push('/issues?view=maintenance')
            }
          }} title={collapsed ? name : undefined}><Icon /><span>{name}</span><ChevronDown /></button>
        })}
      </nav>
      {(!currentSidebarGroup || currentSidebarGroup === 'Operations') && <footer className="fleet-sidebar-footer">
        <div className="live-operations-summary"><strong>LIVE OPERATIONS</strong><span><i className="online" />10 drivers online</span><span><i />10 vehicles online</span></div>
        <div className="resource-tabs">{(['Fleets', 'Drivers', 'Vehicles'] as const).map((tab) => <button key={tab} className={resourceTab === tab ? 'active' : ''} onClick={() => setResourceTab(tab)}>{tab}</button>)}</div>
        <div className="resource-filter"><Search />Filter resources...</div>
        <div className="resource-empty">{resourceTab === 'Fleets' ? <Users /> : resourceTab === 'Drivers' ? <Truck /> : <Car />}<strong>No {resourceTab.toLowerCase()} yet</strong><span>{resourceTab === 'Fleets' ? 'Create fleets to organize drivers and vehicles.' : `Available ${resourceTab.toLowerCase()} will appear here.`}</span></div>
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
              {['English', 'தமிழ்', 'हिन्दी'].map((language) => <button key={language} className="dropdown-item" onClick={() => { setLocale(language); savePreferences({ dark, collapsed, locale: language }); setOpenMenu(null) }}>{language === locale && <Check />}{language}</button>)}
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
