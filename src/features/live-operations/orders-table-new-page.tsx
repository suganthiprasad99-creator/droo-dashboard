'use client'

import { useRouter } from 'next/navigation'
import { Check, MoreHorizontal, Upload, X } from 'lucide-react'
import { OrderCreateForm } from '@/components/ui/compose-dialog'
import styles from './orders-table-new.module.css'

export function OrdersTableNewPage() {
  const router = useRouter()
  const close = () => router.push('/orders?layout=table')

  return <div className={styles.backdrop}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-label="Create a new order">
      <header>
        <div><h1>Create a new order</h1><p>Enter the order details below.</p></div>
        <nav aria-label="New order actions">
          <button className={styles.create} type="submit" form="order-compose-form"><Check />Create Order</button>
          <label className={styles.import}><Upload />Import<input type="file" accept=".csv,.json,application/json,text/csv" /></label>
          <button className={styles.more} type="button" aria-label="More order options"><MoreHorizontal /></button>
          <button className={styles.close} type="button" aria-label="Close new order" onClick={close}><X /></button>
        </nav>
      </header>
      <OrderCreateForm onCancel={close} onValid={close} />
    </section>
  </div>
}
