const UPSTREAM = 'https://tapeout.net'
const ALLOWED_PATHS = new Set([
  '/pod/pod-mainnet.json',
  '/pod/pod-stats.json',
  '/pod/pod-taskbank.json',
  '/pod/pod-miners.json',
])

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin')
  const allowedOrigin = origin && /^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(origin) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=30',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const headers = corsHeaders(request)
    if (request.method === 'OPTIONS') return new Response(null, { headers })
    const url = new URL(request.url)
    if (request.method !== 'GET' || !ALLOWED_PATHS.has(url.pathname)) {
      return new Response(JSON.stringify({ error: 'path_not_allowed' }), { status: 404, headers: { ...headers, 'content-type': 'application/json' } })
    }
    const upstream = await fetch(`${UPSTREAM}${url.pathname}`, { headers: { Accept: 'application/json' } })
    return new Response(upstream.body, { status: upstream.status, headers: { ...headers, 'content-type': 'application/json' } })
  },
}
