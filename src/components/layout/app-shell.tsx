'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3, Bell, BriefcaseBusiness, Calculator, Car, Check, ChevronDown, Code2, Gauge,
  Globe2, HelpCircle, Inbox,
  Keyboard, Layers3, LogOut, Menu, MessageSquare, MoreHorizontal, Moon, PanelLeft,
  Plus, Radio, Search, Settings2, Shield, SlidersHorizontal, Sun, Truck, UserRound,
  Users, Workflow, Wrench, X,
} from 'lucide-react'

const sidebarGroups = [
  { name: 'Operations', icon: Workflow, items: [['Orders', '/orders'], ['Orchestrator', '/live-operations'], ['Scheduler', '/live-operations'], ['Order Config', '/settings'], ['Service Rates', '/pricing']] },
  { name: 'Resources', icon: Truck, items: [['Resources Hub', '/overview'], ['Drivers', '/drivers'], ['Vehicles', '/drivers'], ['Fleets', '/drivers'], ['Vendors', '/integrations'], ['Contacts', '/settings'], ['Places', '/service-areas'], ['Fuel Reports', '/earnings'], ['Fuel Transactions', '/earnings'], ['Issues', '/issues']] },
  { name: 'Maintenance', icon: Wrench, items: [['Maintenance Hub', '/issues'], ['Schedules', '/issues'], ['Work Orders', '/issues'], ['Maintenances', '/issues'], ['Equipment', '/issues'], ['Parts', '/issues']] },
  { name: 'Connectivity', icon: Radio, items: [['Telematics', '/integrations'], ['Fuel Providers', '/integrations'], ['Devices', '/integrations'], ['Sensors', '/integrations'], ['Events', '/integrations']] },
  { name: 'Analytics', icon: BarChart3, items: [['Dashboard', '/overview'], ['Reports', '/earnings']] },
  { name: 'Settings', icon: Settings2, items: [['Settings Hub', '/settings'], ['Navigator App', '/settings'], ['Map', '/service-areas'], ['Payments', '/earnings'], ['Notifications', '/settings'], ['Routing', '/settings'], ['Orchestrator', '/settings'], ['Scheduling', '/settings'], ['Custom Fields', '/settings'], ['Avatars', '/settings']] },
] as const

const products = [
  ['Fleet-Ops', '/live-operations', Workflow],
  ['Storefront', '/orders', BriefcaseBusiness],
  ['Ledger', '/earnings', Calculator],
  ['IAM', '/settings', Shield],
  ['Developers', '/integrations', Code2],
] as const

type OpenMenu = 'organization' | 'user' | 'notifications' | 'locale' | 'chat' | 'more' | 'customize' | 'shortcuts' | null

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const menusRef = useRef<HTMLElement>(null)
  const [dark, setDark] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [locale, setLocale] = useState('English')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [currentSidebarGroup, setCurrentSidebarGroup] = useState<string | null>(null)
  const [resourceTab, setResourceTab] = useState<'Fleets' | 'Drivers' | 'Vehicles'>('Fleets')

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

  return <div className={`app ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className={mobile ? 'sidebar open' : 'sidebar'} aria-label="Primary navigation">
      <div className="brand">
        <div className="logo"><Layers3 /></div>
        <div className="brand-copy"><strong>Droo.</strong><span>Operations</span></div>
        <button className="mobile-close" onClick={() => setMobile(false)} aria-label="Close navigation"><X /></button>
      </div>
      <div className="fleet-sidebar-actions">
        <Link href="/orders" className="create-order-action" onClick={() => setMobile(false)}><Plus /><span>Create new order</span></Link>
        <label className="fleet-sidebar-search"><Search /><input value={sidebarSearch} onChange={(event) => setSidebarSearch(event.target.value)} placeholder="Search Fleet-Ops..." /><kbd>Cmd K</kbd></label>
      </div>
      <nav className="fleet-sidebar-nav">
        {currentSidebarGroup ? <>
          <button className="sidebar-back" onClick={() => { setCurrentSidebarGroup(null); setSidebarSearch('') }}><ChevronDown /><span>{currentSidebarGroup}</span></button>
          <div className="nested-sidebar-items">{sidebarGroups.find((group) => group.name === currentSidebarGroup)?.items.filter(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(([label, href]) => <Link key={label} href={href} className={pathname === href ? 'active' : ''} aria-current={pathname === href ? 'page' : undefined} onClick={() => setMobile(false)}><span>{label}</span></Link>)}</div>
        </> : sidebarGroups.filter(({ name, items }) => !sidebarSearch || name.toLowerCase().includes(sidebarSearch.toLowerCase()) || items.some(([label]) => label.toLowerCase().includes(sidebarSearch.toLowerCase()))).map(({ name, icon: Icon, items }) => {
          const isActive = items.some(([, route]) => route === pathname)
          return <button key={name} className={isActive ? 'group-trigger active' : 'group-trigger'} aria-current={isActive ? 'page' : undefined} onClick={() => { setCurrentSidebarGroup(name); setSidebarSearch('') }} title={collapsed ? name : undefined}><Icon /><span>{name}</span><ChevronDown /></button>
        })}
      </nav>
      {(!currentSidebarGroup || currentSidebarGroup === 'Operations') && <footer className="fleet-sidebar-footer">
        <div className="live-operations-summary"><strong>LIVE OPERATIONS</strong><span><i className="online" />10 drivers online</span><span><i />10 vehicles online</span></div>
        <div className="resource-tabs">{(['Fleets', 'Drivers', 'Vehicles'] as const).map((tab) => <button key={tab} className={resourceTab === tab ? 'active' : ''} onClick={() => setResourceTab(tab)}>{tab}</button>)}</div>
        <div className="resource-filter"><Search />Filter resources...</div>
        <div className="resource-empty">{resourceTab === 'Fleets' ? <Users /> : resourceTab === 'Drivers' ? <Truck /> : <Car />}<strong>No {resourceTab.toLowerCase()} yet</strong><span>{resourceTab === 'Fleets' ? 'Create fleets to organize drivers and vehicles.' : `Available ${resourceTab.toLowerCase()} will appear here.`}</span></div>
      </footer>}
    </aside>
    {mobile && <button className="overlay" aria-label="Close navigation" onClick={() => setMobile(false)} />}

    <section className="workspace">
      <header className="topbar console-navbar" ref={menusRef}>
        <div className="topbar-left">
          <button className="mobile" onClick={() => setMobile((current) => !current)} aria-label={mobile ? 'Close navigation' : 'Open navigation'}>{mobile ? <X /> : <Menu />}</button>
          <Link href="/overview" className="navbar-logo" aria-label="Droo home"><Layers3 /></Link>
          <button className="desktop-sidebar-toggle" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><PanelLeft /></button>
          <nav className="product-navigation" aria-label="Products">
            {products.map(([name, href, Icon]) => <Link key={href} href={href} className={pathname === href ? 'active' : ''}><Icon />{name}</Link>)}
            <div className="nav-menu-wrap">
              <button aria-label="More products" aria-expanded={openMenu === 'more'} onClick={() => toggleMenu('more')}><MoreHorizontal /></button>
              {openMenu === 'more' && <div className="nav-dropdown product-dropdown" role="menu">
                <div className="dropdown-heading"><strong>Applications</strong></div>
                {products.map(([name, href, Icon]) => <Link key={href} className="dropdown-item" href={href} onClick={() => setOpenMenu(null)}><Icon />{name}</Link>)}
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
              <Link className="dropdown-item" href="/overview" onClick={() => setOpenMenu(null)}><Gauge />Home</Link>
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
