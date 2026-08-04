'use client'

import { useEffect, useState } from 'react'
import type { ApiRecord, ModuleName } from '@/types/dashboard'
import { modules } from '@/lib/dashboard-config'

const ACCESS_TOKEN_KEY = 'droo.dev_access_token.v2'
const REFRESH_TOKEN_KEY = 'droo.dev_refresh_token.v2'

async function devLogin() {
  const challengeResponse = await fetch('/v1/auth/otp/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '+916369487527', purpose: 'login' }) })
  if (!challengeResponse.ok) throw new Error(`Development login request failed (${challengeResponse.status})`)
  const challenge = await challengeResponse.json()
  const verification = await fetch('/v1/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_id: challenge.challenge_id, code: '000000' }) })
  if (!verification.ok) throw new Error(`Development login verification failed (${verification.status})`)
  const session = await verification.json()
  if (typeof session.access_token !== 'string') throw new Error('Development login returned no access token')
  sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token)
  if (typeof session.refresh_token === 'string') sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)
  return session.access_token as string
}

async function refreshLogin() {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null
  const response = await fetch('/v1/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }) })
  if (!response.ok) { sessionStorage.removeItem(REFRESH_TOKEN_KEY); return null }
  const session = await response.json()
  if (typeof session.access_token !== 'string') return null
  sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token)
  if (typeof session.refresh_token === 'string') sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)
  return session.access_token as string
}

export function useApiData(module: ModuleName, refreshMs?: number) {
  const [rows, setRows] = useState<ApiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!refreshMs) return
    const timer = window.setInterval(() => setRevision(value => value + 1), refreshMs)
    return () => window.clearInterval(timer)
  }, [refreshMs])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      if (module === 'Integrations') {
        const response = await fetch('/api/dev/integrations', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Integration API request failed (${response.status})`)
        const value = await response.json()
        if (!cancelled) setRows(Array.isArray(value) ? value : value.data || [])
        return
      }
      let token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
      if (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true') {
        const valid = token && await fetch('/v1/me', { headers: { Authorization: `Bearer ${token}` } }).then(response => response.ok).catch(() => false)
        if (!valid) { sessionStorage.removeItem(ACCESS_TOKEN_KEY); token = await refreshLogin() || await devLogin() }
      }
      if (!token) throw new Error('Sign in to load live API data.')
      const headers = { Authorization: `Bearer ${token}` }
      if (module === 'Overview') {
        const [orders, drivers, earnings] = await Promise.all(['/admin/orders', '/admin/drivers', '/admin/earnings'].map(async endpoint => {
          const response = await fetch(`/v1${endpoint}`, { headers })
          if (!response.ok) throw new Error(`Overview API request failed (${response.status})`)
          return response.json()
        }))
        if (!cancelled) setRows([...(orders.data || []).map((x: ApiRecord) => ({ ...x, __kind: 'order' })), ...(drivers.data || []).map((x: ApiRecord) => ({ ...x, __kind: 'driver' })), ...(earnings.data || []).map((x: ApiRecord) => ({ ...x, __kind: 'earning' }))])
        return
      }
      const path = modules[module].apiPath
      if (!path) { setRows([]); return }
      const response = await fetch(`/v1${path}`, { headers })
      if (!response.ok) throw new Error(`API request failed (${response.status})`)
      const value = await response.json()
      if (!cancelled) setRows(Array.isArray(value) ? value : value.data || [])
    }
    load().catch(value => !cancelled && setError(value instanceof Error ? value.message : 'API request failed')).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [module, revision])

  return { rows, loading, error }
}
