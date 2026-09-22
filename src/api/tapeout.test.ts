import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchTapeout } from './tapeout.ts'

function response(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TapeOut ecosystem adapter', () => {
  it('combines processors, proof-of-design stats, tasks, miners and events', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('pod-mainnet.json')) return Promise.resolve(response({ chainId: 56, explorer: 'https://bscscan.com', rpc: '/rpc', cpus: { TapeOut: { address: '0x1', multiplier: 1, fromBlock: 2 } } }))
      if (url.endsWith('pod-stats.json')) return Promise.resolve(response({ generatedAt: '2026-09-22T08:00:00Z', block: 123, chainId: 56, minerCount: 7, taskCount: 267, events: [{ block: 122, circuitId: 9, cpu: 'TapeOut', gates: 4 }] }))
      if (url.endsWith('pod-taskbank.json')) return Promise.resolve(response({ meta: { total: 306, onchain: 267 } }))
      return Promise.resolve(response({ count: 7, owners: { '0xabc': [] } }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchTapeout()

    expect(result.sourceStatus).toBe('live')
    expect(result.chain.chainId).toBe(56)
    expect(result.processors[0]).toMatchObject({ name: 'TapeOut', multiplier: 1 })
    expect(result.taskBank).toEqual({ total: 306, onchain: 267 })
    expect(result.miners).toEqual({ addresses: 1, slots: 7 })
    expect(result.latestEvents[0]).toMatchObject({ circuitId: 9, gates: 4 })
  })

  it('keeps partial data visible while marking a missing feed degraded', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('pod-mainnet.json')) return Promise.resolve(response({ chainId: 56, cpus: {} }))
      if (url.endsWith('pod-stats.json')) return Promise.reject(new Error('stats timeout'))
      return Promise.resolve(response({ meta: { total: 306, onchain: 267 }, count: 0, owners: {} }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchTapeout()

    expect(result.sourceStatus).toBe('degraded')
    expect(result.errors).toContain('stats timeout')
    expect(result.taskBank.onchain).toBe(267)
  })
})
