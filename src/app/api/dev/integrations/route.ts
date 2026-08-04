import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.hostname
  const localHost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (process.env.NODE_ENV !== 'development' || process.env.DROO_ENABLE_LOCAL_INTEGRATION_PROXY !== 'true' || !localHost) {
    return new NextResponse(null, { status: 404 })
  }
  const apiKey = process.env.DROO_INTEGRATIONS_API_KEY
  if (!apiKey) return NextResponse.json({ title: 'Local integration API key is not configured' }, { status: 503 })
  const apiBase = process.env.DROO_API_BASE_URL || 'http://localhost:18080/v1'
  const response = await fetch(`${apiBase}/webhook-endpoints`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null)
  return NextResponse.json(body, { status: response.status })
}
