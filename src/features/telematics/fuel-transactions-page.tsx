'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Fuel, RefreshCw, X } from 'lucide-react'

export function FuelTransactionsPage() {
  const router = useRouter()
  const [notice, setNotice] = useState('')

  return <main className="fuel-transactions-page">
    <header>
      <div><span>Fuel transaction ledger</span><h1>Fuel Transactions</h1><p>Imported fuel card bills and provider purchase records are reviewed here before, during, and after they match to vehicles, trips, and linked Fuel Reports.</p></div>
      <button className="secondary" onClick={() => setNotice('Fuel transactions refreshed.')}><RefreshCw />Refresh</button>
    </header>
    <section>
      <Fuel />
      <h2>No fuel transactions imported yet</h2>
      <p>Connect PetroApp or another fuel integration, then run a transaction sync. Imported provider bills appear here before linked Fuel Reports are created.</p>
      <button className="primary" onClick={() => router.push('/integrations?view=fuel-Integrations')}><Fuel />Open Fuel Integrations</button>
    </section>
    {notice && <div className="telematics-notice" role="status"><Check />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X /></button></div>}
  </main>
}
