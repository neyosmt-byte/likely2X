import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchEcosystem, fetchNetwork } from './ignix.ts'

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TapeOut/X Layer adapters', () => {
  it('keeps TapeOut rows, excludes Agent rows, and merges duplicate contracts', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/v1/campaigns/current')) {
        return Promise.resolve(response({ code: 200, data: { campaign: { id: 'campaign-1', name: 'Genesis', phase: 'live' } } }))
      }
      if (url.includes('/leaderboards/mcap')) {
        return Promise.resolve(response({ code: 200, data: {
          snapshot: { createdAt: '2026-09-22T08:00:00Z' },
          rows: [
            { rank: 1, subject: '0x1111111111111111111111111111111111111111', tokenType: 'agent', token: { name: 'Agent' } },
            { rank: 2, subject: '0x2222222222222222222222222222222222222222', tokenType: 'tapeout', metricUsd: 1234, token: { name: 'Circuit', symbol: 'CIR' } },
          ],
        } }))
      }
      return Promise.resolve(response({ code: 200, data: { launches: [
        { tokenAddress: '0x2222222222222222222222222222222222222222', tokenType: 'tapeout', name: 'Duplicate' },
        { tokenAddress: '0x3333333333333333333333333333333333333333', tokenType: 'agent', name: 'Agent' },
      ] } }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchEcosystem()

    expect(result.sourceStatus).toBe('live')
    expect(result.assets).toHaveLength(1)
    expect(result.assets[0]).toMatchObject({ contract: '0x2222222222222222222222222222222222222222', name: 'Circuit', symbol: 'CIR' })
    expect(result.campaign?.snapshotAt).toBe('2026-09-22T08:00:00Z')
  })

  it('reports a partial feed failure as degraded', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/v1/campaigns/current')) return Promise.resolve(response({ code: 200, data: { campaign: { id: 'campaign-1' } } }))
      if (url.includes('/leaderboards/mcap')) return Promise.reject(new Error('leaderboard timeout'))
      return Promise.resolve(response({ code: 200, data: { launches: [] } }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchEcosystem()

    expect(result.sourceStatus).toBe('degraded')
    expect(result.errors).toContain('leaderboard timeout')
  })

  it('uses the X Layer fallback RPC only after validating chain id', async () => {
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('rpc.xlayer.tech')) return Promise.resolve(response({ error: { message: 'offline' } }, 503))
      const request = JSON.parse(String(init?.body)) as { method: string }
      return Promise.resolve(response({ result: request.method === 'eth_chainId' ? '0xc4' : '0x1234' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchNetwork()

    expect(result).toMatchObject({ ok: true, chainId: 196, blockNumber: 0x1234 })
    expect(result.rpc).toContain('xlayerrpc.okx.com')
  })
})
