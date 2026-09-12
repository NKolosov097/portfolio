const HEADERS = { 'Cache-Control': 'private, no-store' }

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ status: 'ok' }, { headers: HEADERS })
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: HEADERS })
}
