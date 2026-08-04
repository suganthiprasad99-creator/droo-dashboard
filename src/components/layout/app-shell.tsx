'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, AlertCircle, Banknote, Box, ChevronDown, CircleDollarSign, Command, FileCheck2, Gauge, Layers3, Map, Menu, Moon, Plug, Search, Settings2, Sun, Truck, X } from 'lucide-react'

const navigation = [
  ['Overview', '/overview', Gauge], ['Live Operations', '/live-operations', Activity], ['Orders', '/orders', Box],
  ['Drivers', '/drivers', Truck], ['Applications', '/applications', FileCheck2], ['Service Areas', '/service-areas', Map],
  ['Pricing', '/pricing', CircleDollarSign], ['Earnings', '/earnings', Banknote], ['Integrations', '/integrations', Plug],
  ['Issues', '/issues', AlertCircle], ['Organization Settings', '/settings', Settings2],
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [dark, setDark] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); router.push('/orders') } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  return <div className="app">
    <aside className={mobile ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="logo"><Layers3 /></div><div><strong>Droo.</strong><span>Operations</span></div><button onClick={() => setMobile(false)}><X /></button></div>
      <div className="org"><div>DR</div><p><strong>Droo Operations</strong><span>Primary organization</span></p><ChevronDown /></div>
      <nav>{navigation.map(([name, href, Icon]) => <Link key={href} href={href} className={pathname === href ? 'active' : ''} onClick={() => setMobile(false)}><Icon /><span>{name}</span></Link>)}</nav>
      <footer><div className="avatar">OP</div><p><strong>Operations user</strong><span>Authenticated session</span></p></footer>
    </aside>
    {mobile && <button className="overlay" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <section className="workspace">
      <header className="topbar"><button className="mobile" onClick={() => setMobile(true)}><Menu />Menu</button><button className="search" onClick={() => router.push('/orders')}><Search /><span>Search orders, drivers, references...</span><kbd><Command />K</kbd></button><div><button aria-label="Toggle color theme" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</button></div></header>
      <main>{children}</main>
    </section>
  </div>
}
