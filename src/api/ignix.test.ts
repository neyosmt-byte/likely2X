import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchEcosystem } from './ignix.ts'

const json = (value: unknown) => new Response(JSON.stringify({ code: 200, data: value }), { status: 200, headers: { 'content-type': 'application/json' } })

describe('IGNIX TapeOut adapter', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps only explicitly typed TapeOut leaderboard rows and deduplicates launches', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/v1/campaigns/current')) return Promise.resolve(json({ index: { id: 'index-1' } }))
      if (url.includes('/leaderboards/mcap')) return Promise.resolve(json({ snapshot: { createdAt: '2026-09-23T00:00:00Z' }, rows: [
        { rank: 1, subject: '0x1111111111111111111111111111111111111111', tokenType: 'agent', token: { name: 'Agent', symbol: 'AGENT' } },
        { rank: 2, subject: '0x2222222222222222222222222222222222222222', tokenType: 'tapeout', metricUsd: 1234, token: { name: 'TapeOut project', symbol: 'TOP' } },
      ] }))
      return Promise.resolve(json({ launches: [
        { tokenAddress: '0x2222222222222222222222222222222222222222', tokenType: 'tapeout', name: 'duplicate', symbol: 'DUP' },
        { tokenAddress: '0x3333333333333333333333333333333333333333', name: 'untyped launch', symbol: 'UNKNOWN' },
      ] }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const snapshot = await fetchEcosystem()
    expect(snapshot.assets).toHaveLength(1)
    expect(snapshot.assets[0]?.contract).toBe('0x2222222222222222222222222222222222222222')
    expect(snapshot.assets[0]?.name).toBe('TapeOut project')
    expect(snapshot.indexContext?.snapshotAt).toBe('2026-09-23T00:00:00Z')
  })
})
