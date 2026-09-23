import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchTapeout } from './tapeout.ts'

describe('TapeOut protocol adapter', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('normalizes processor, circuit, task and miner owner feeds', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('pod-mainnet.json')) return Promise.resolve(new Response(JSON.stringify({ chainId: 56, cpus: { TapeOut: { address: '0xabc', multiplier: 2, fromBlock: 10 } }, circuits: [{ circuitId: 7, owner: '0xowner', cpu: 'TapeOut' }] })))
      if (url.endsWith('pod-stats.json')) return Promise.resolve(new Response(JSON.stringify({ generatedAt: '2026-09-23T00:00:00Z', block: 22, minerCount: 4, taskCount: 3, events: [{ circuitId: 7, block: 22, author: '0xowner', cpu: 'TapeOut' }] })))
      if (url.endsWith('pod-taskbank.json')) return Promise.resolve(new Response(JSON.stringify({ meta: { onchain: 2, total: 3 }, tasks: [{ id: 1, name: 'Adder', kind: 'comb', onchain: true, refGates: 4 }] })))
      return Promise.resolve(new Response(JSON.stringify({ count: 4, owners: { '0xowner': [{ block: 22, cpu: 'TapeOut', circuitId: 7 }] } })))
    }))

    const snapshot = await fetchTapeout()
    expect(snapshot.processors[0]).toMatchObject({ name: 'TapeOut', multiplier: 2, fromBlock: 10 })
    expect(snapshot.circuits[0]?.circuitId).toBe(7)
    expect(snapshot.tasks[0]).toMatchObject({ name: 'Adder', onchain: true })
    expect(snapshot.minerOwners[0]).toMatchObject({ address: '0xowner', circuits: 1 })
    expect(snapshot.latestEvents[0]?.circuitId).toBe(7)
  })
})
