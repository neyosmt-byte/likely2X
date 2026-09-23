import { describe, expect, it } from 'vitest'

import { buildEvents, entityFromTask, scoreAlpha } from './ecosystem.ts'

const tapeout = {
  block: 10,
  circuits: [],
  errors: [],
  generatedAt: '2026-09-23T00:00:00Z',
  latestEvents: [],
  miners: { addresses: 2, slots: 4 },
  minerOwners: [],
  processors: [{ name: 'TapeOut', address: '', multiplier: 2, fromBlock: null }],
  sourceStatus: 'live' as const,
  stats: { currentRate: null, taskCount: 1, totalMined: null, totalVerifWeight: null, totalUnverWeight: null, unverifiedBps: null, verifMinerCount: null, minerCount: 4 },
  taskBank: { onchain: 2, total: 3 },
  taskBankMeta: { comb: null, seq: null, totalNand: null, totalLatch: null, onchainGates: null, maxRunGas: null, groups: [] },
  tasks: [],
  chain: { chainId: 56, explorer: null, rpc: null },
  contracts: { factory: null, lens: null, lensNext: null, mining: null, token: null },
  token: { name: null, symbol: null },
  source: 'https://tapeout.net/pod/pod-mainnet.json',
}

describe('unified ecosystem model', () => {
  it('keeps chain and provenance when normalizing task data', () => {
    const entity = entityFromTask({ id: 3, name: 'Adder', kind: 'comb', tier: null, group: null, onchain: true, refGates: 4, runGas: null, cycles: null, nIn: null, nOut: null, refDepth: null, trivial: null }, tapeout)
    expect(entity.chainId).toBe(56)
    expect(entity.provenance).toContain('pod-taskbank.meta')
  })

  it('does not award missing processor address as a high confidence score', () => {
    const score = scoreAlpha({ id: 'processor:TapeOut', kind: 'processor', chainId: 56, address: null, name: 'TapeOut', status: 'unknown', metrics: { multiplier: null }, source: tapeout.source, observedAt: tapeout.generatedAt, dataState: 'degraded', provenance: [tapeout.source] })
    expect(score.score).toBeLessThan(40)
  })

  it('does not report an unverified change from a single snapshot', () => {
    const events = buildEvents(tapeout, null, { ok: true, blockNumber: 1, chainId: 196, checkedAt: tapeout.generatedAt, rpc: 'xlayer' })
    expect(events.some((event) => event.rule === 'participant_change' || event.rule === 'taskbank_change')).toBe(false)
  })
})
