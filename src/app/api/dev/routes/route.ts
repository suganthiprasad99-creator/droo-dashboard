import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type OSRMResponse = {
  code?: string
  routes?: Array<{
    distance?: number
    duration?: number
    geometry?: { coordinates?: Array<[number, number]> }
  }>
}

function coordinate(value: string | null, minimum: number, maximum: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null
}

export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.hostname
  if (process.env.NODE_ENV !== 'development' || (hostname !== 'localhost' && hostname !== '127.0.0.1')) {
    return new NextResponse(null, { status: 404 })
  }

  const originLat = coordinate(request.nextUrl.searchParams.get('originLat'), -90, 90)
  const originLng = coordinate(request.nextUrl.searchParams.get('originLng'), -180, 180)
  const destinationLat = coordinate(request.nextUrl.searchParams.get('destinationLat'), -90, 90)
  const destinationLng = coordinate(request.nextUrl.searchParams.get('destinationLng'), -180, 180)
  if ([originLat, originLng, destinationLat, destinationLng].some((value) => value === null)) {
    return NextResponse.json({ title: 'Valid origin and destination coordinates are required.' }, { status: 422 })
  }

  const coordinates = `${originLng},${originLat};${destinationLng},${destinationLat}`
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`, {
    headers: { 'User-Agent': 'Droo-Dashboard-Development/1.0' },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null) as OSRMResponse | null
  const route = body?.routes?.[0]
  const coordinatesList = route?.geometry?.coordinates
  if (!response.ok || body?.code !== 'Ok' || !coordinatesList?.length) {
    return NextResponse.json({ title: 'No drivable route is available from the development routing provider.' }, { status: 502 })
  }

  return NextResponse.json({
    provider: 'OSRM/OpenStreetMap development server',
    distance_meters: route?.distance,
    duration_seconds: route?.duration,
    path: coordinatesList.map(([lng, lat]) => ({ lat, lng })),
  })
}
