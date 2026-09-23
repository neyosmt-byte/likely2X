import { afterEach, describe, expect, it, vi } from 'vitest'

import worker from './tapeout-proxy.ts'

function memoryKv() {
  const values = new Map<string, string>()
  return {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { values.set(key, value) }),
  }
}

describe('ecosystem Worker boundary', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects methods and paths outside the public allow-list', async () => {
    const request = new Request('https://api.example/private', { method: 'POST' })
    const method = await worker.fetch(request, {})
    const path = await worker.fetch(new Request('https://api.example/private'), {})
    expect(method.status).toBe(405)
    expect(path.status).toBe(404)
  })

  it('adds provenance and CORS headers to allowed feeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ chainId: 56, cpus: {} }))))
    const response = await worker.fetch(new Request('https://api.example/pod/pod-mainnet.json', { headers: { Origin: 'https://likely2x.pages.dev' } }), { SNAPSHOTS: memoryKv() as never })
    const body = await response.json() as { _meta: { source: string; dataState: string } }
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://likely2x.pages.dev')
    expect(body._meta).toMatchObject({ source: 'https://tapeout.net/pod/pod-mainnet.json', dataState: 'live' })
  })

  it('serves a cached stale feed when the upstream fails', async () => {
    const cache = memoryKv()
    await cache.put('snapshot:https://tapeout.net/pod/pod-stats.json', JSON.stringify({ block: 123 }))
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('upstream offline') }))
    const response = await worker.fetch(new Request('https://api.example/pod/pod-stats.json'), { SNAPSHOTS: cache as never })
    const body = await response.json() as { block: number; _meta: { dataState: string; error: string } }
    expect(body.block).toBe(123)
    expect(body._meta.dataState).toBe('stale')
    expect(body._meta.error).toBe('upstream offline')
  })
})
