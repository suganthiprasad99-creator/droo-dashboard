'use client'

import { Suspense } from 'react'
import { StorefrontPage } from '@/features/storefront/storefront-page'

export default function Page() {
  return <Suspense fallback={<div className="storefront-loading">Loading Storefront…</div>}><StorefrontPage /></Suspense>
}
