import type { TapeoutCircuit, TapeoutEvent, TapeoutMinerOwner, TapeoutProcessor, TapeoutSnapshot, TapeoutTask } from './tapeout.ts'
import type { EcosystemSnapshot, TapeoutAsset, NetworkSnapshot } from './ignix.ts'

const ECOSYSTEM_API_BASE = import.meta.env.VITE_ECOSYSTEM_API_BASE?.replace(/\/$/, '')

export type EntityKind = 'project' | 'processor' | 'circuit' | 'task' | 'participant' | 'event' | 'asset'
export type DataState = 'live' | 'cached' | 'stale' | 'degraded'

export type EcosystemEntity = {
  id: string
  kind: EntityKind
  chainId: number | null
  address: string | null
  name: string
  status: string | null
  metrics: Record<string, number | string | null>
  source: string
  observedAt: string | null
  dataState: DataState
  provenance: string[]
}

export type EcosystemEvent = EcosystemEntity & {
  kind: 'event'
  rule: 'circuit_burst' | 'processor_change' | 'participant_change' | 'taskbank_change' | 'asset_change' | 'source_stale'
  severity: 'high' | 'medium' | 'low'
  evidence: string[]
}

const liveState = (status: DataState | undefined): DataState => status ?? 'degraded'
const address = (value: string | null | undefined) => value && /^0x[0-9a-f]{40}$/i.test(value) ? value : null

export function entityFromProcessor(row: TapeoutProcessor, snapshot: TapeoutSnapshot): EcosystemEntity {
  return { id: `processor:${row.name}`, kind: 'processor', chainId: snapshot.chain.chainId, address: address(row.address), name: row.name, status: row.address ? 'registered' : 'unknown', metrics: { multiplier: row.multiplier, fromBlock: row.fromBlock }, source: snapshot.source, observedAt: snapshot.generatedAt, dataState: liveState(snapshot.sourceStatus), provenance: [snapshot.source, 'pod-mainnet.cpus'] }
}

export function entityFromCircuit(row: TapeoutCircuit, snapshot: TapeoutSnapshot): EcosystemEntity {
  return { id: `circuit:${row.circuitId ?? row.owner}`, kind: 'circuit', chainId: snapshot.chain.chainId, address: address(row.owner), name: row.circuitId === null ? 'Circuit 未命名' : `Circuit #${row.circuitId}`, status: row.mining === true ? 'mining' : row.mining === false ? 'complete' : 'unknown', metrics: { circuitId: row.circuitId, taskId: row.taskId, cpu: row.cpu }, source: snapshot.source, observedAt: snapshot.generatedAt, dataState: liveState(snapshot.sourceStatus), provenance: [snapshot.source, 'pod-mainnet.circuits'] }
}

export function entityFromTask(row: TapeoutTask, snapshot: TapeoutSnapshot): EcosystemEntity {
  return { id: `task:${row.id ?? row.name}`, kind: 'task', chainId: snapshot.chain.chainId, address: null, name: row.name, status: row.onchain === true ? 'onchain' : row.onchain === false ? 'offchain' : 'unknown', metrics: { taskId: row.id, kind: row.kind, tier: row.tier, gates: row.refGates, runGas: row.runGas, cycles: row.cycles }, source: `${snapshot.source.replace('pod-mainnet.json', 'pod-taskbank.json')}`, observedAt: snapshot.generatedAt, dataState: liveState(snapshot.sourceStatus), provenance: [snapshot.source, 'pod-taskbank.meta'] }
}

export function entityFromParticipant(row: TapeoutMinerOwner, snapshot: TapeoutSnapshot): EcosystemEntity {
  return { id: `participant:${row.address}`, kind: 'participant', chainId: snapshot.chain.chainId, address: address(row.address), name: row.address, status: 'active', metrics: { circuits: row.circuits, lastBlock: row.lastBlock, cpus: row.cpus.join(', ') }, source: `${snapshot.source.replace('pod-mainnet.json', 'pod-miners.json')}`, observedAt: snapshot.generatedAt, dataState: liveState(snapshot.sourceStatus), provenance: [snapshot.source, 'pod-miners.owners'] }
}

export function entityFromAsset(row: TapeoutAsset, snapshot: EcosystemSnapshot): EcosystemEntity {
  return { id: `asset:${row.contract}`, kind: 'asset', chainId: row.chainId, address: address(row.contract), name: row.name, status: row.graduated === true ? 'graduated' : row.graduated === false ? 'bonding' : 'unknown', metrics: { symbol: row.symbol, marketCapUsd: row.marketCapUsd, liquidityUsd: row.liquidityUsd, volumeUsd: row.volumeUsd, rank: row.rank }, source: 'IGNIX tapeout index', observedAt: snapshot.indexContext?.snapshotAt ?? snapshot.fetchedAt, dataState: liveState(snapshot.sourceStatus), provenance: ['https://api.ignix.bot', 'tokenType=tapeout'] }
}

export function normalizeEntities(tapeout: TapeoutSnapshot | null, ecosystem: EcosystemSnapshot | null): EcosystemEntity[] {
  if (!tapeout && !ecosystem) return []
  const entities: EcosystemEntity[] = []
  if (tapeout) {
    entities.push(...tapeout.processors.map((item) => entityFromProcessor(item, tapeout)))
    entities.push(...tapeout.circuits.map((item) => entityFromCircuit(item, tapeout)))
    entities.push(...tapeout.tasks.map((item) => entityFromTask(item, tapeout)))
    entities.push(...tapeout.minerOwners.map((item) => entityFromParticipant(item, tapeout)))
    entities.push(...tapeout.latestEvents.map((item) => eventEntity(item, tapeout)))
  }
  if (ecosystem) entities.push(...ecosystem.assets.map((item) => entityFromAsset(item, ecosystem)))
  return entities
}

function eventEntity(row: TapeoutEvent, snapshot: TapeoutSnapshot): EcosystemEntity {
  return { id: `event:${row.block}:${row.circuitId}`, kind: 'event', chainId: snapshot.chain.chainId, address: address(row.author), name: `Circuit #${row.circuitId}`, status: 'observed', metrics: { block: row.block, gates: row.gates, nState: row.nState, cpu: row.cpu }, source: `${snapshot.source.replace('pod-mainnet.json', 'pod-stats.json')}`, observedAt: snapshot.generatedAt, dataState: liveState(snapshot.sourceStatus), provenance: [snapshot.source, 'pod-stats.events'] }
}

export function buildEvents(tapeout: TapeoutSnapshot | null, ecosystem: EcosystemSnapshot | null, network: NetworkSnapshot | null): EcosystemEvent[] {
  const events: EcosystemEvent[] = []
  if (tapeout) {
    const burst = tapeout.latestEvents.length >= 5
    if (burst) events.push({ ...eventEntity(tapeout.latestEvents[0]!, tapeout), kind: 'event', rule: 'circuit_burst', severity: 'high', evidence: [`最近窗口有 ${tapeout.latestEvents.length} 个 Circuit 事件`, `最新区块 ${tapeout.block ?? 'unknown'}`] })
    if (tapeout.sourceStatus !== 'live') events.push({ id: 'event:source-tapeout', kind: 'event', chainId: tapeout.chain.chainId, address: null, name: `TapeOut 数据源${tapeout.sourceStatus === 'stale' ? '过期' : '降级'}`, status: tapeout.sourceStatus, metrics: {}, source: tapeout.source, observedAt: tapeout.generatedAt, dataState: tapeout.sourceStatus, provenance: tapeout.errors.length ? tapeout.errors : [tapeout.source], rule: 'source_stale', severity: 'high', evidence: tapeout.errors.length ? tapeout.errors : [`状态 ${tapeout.sourceStatus}`] })
  }
  if (ecosystem && ecosystem.sourceStatus !== 'live') events.push({ id: 'event:source-ignix', kind: 'event', chainId: null, address: null, name: 'IGNIX 数据源降级', status: 'degraded', metrics: {}, source: 'https://api.ignix.bot', observedAt: ecosystem.fetchedAt, dataState: ecosystem.sourceStatus, provenance: ecosystem.errors, rule: 'source_stale', severity: 'high', evidence: ecosystem.errors.length ? ecosystem.errors : ['快照未处于实时状态'] })
  if (network && !network.ok) events.push({ id: 'event:source-xlayer', kind: 'event', chainId: 196, address: null, name: 'X Layer RPC 未响应', status: 'degraded', metrics: {}, source: network.rpc ?? 'X Layer RPC', observedAt: network.checkedAt, dataState: 'degraded', provenance: [network.rpc ?? 'xlayer rpc'], rule: 'source_stale', severity: 'high', evidence: ['chainId 196 尚未读取'] })
  return events
}

export type AlphaScore = { entity: EcosystemEntity; score: number; factors: Array<{ label: string; value: number; evidence: string }> }

export function scoreAlpha(entity: EcosystemEntity, entities: EcosystemEntity[] = []): AlphaScore {
  const ageHours = entity.observedAt ? Math.max(0, (Date.now() - Date.parse(entity.observedAt)) / 3_600_000) : Number.POSITIVE_INFINITY
  const freshness = ageHours <= 1 ? 15 : ageHours <= 24 ? 11 : ageHours <= 168 ? 5 : 0
  const completeness = entity.dataState === 'live' || entity.dataState === 'cached' ? 10 : entity.dataState === 'stale' ? 5 : 0
  const circuits = entities.filter((item) => item.kind === 'circuit' && (item.metrics.cpu === entity.name || item.address === entity.address))
  const taskIds = new Set(circuits.map((item) => String(item.metrics.taskId ?? '')).filter(Boolean))
  const relatedTasks = entities.filter((item) => item.kind === 'task' && taskIds.has(String(item.metrics.taskId ?? '')))
  const hardTasks = relatedTasks.filter((item) => Number(item.metrics.gates ?? 0) >= 8 || Number(item.metrics.runGas ?? 0) >= 1_000_000)
  const growthEvidence = '需要至少两个历史快照；当前数据不计增长分'
  const factors = entity.kind === 'processor'
    ? [
      { label: 'multiplier', value: Math.min(30, Math.max(0, Number(entity.metrics.multiplier ?? 0) * 5)), evidence: `multiplier ${entity.metrics.multiplier ?? 'unknown'}` },
      { label: 'Circuit 覆盖', value: Math.min(20, circuits.length * 2), evidence: `${circuits.length} 个关联 Circuit` },
      { label: '任务难度', value: Math.min(15, hardTasks.length * 3), evidence: `${hardTasks.length} 个关联高门数 / 高 gas 任务` },
      { label: '活跃新鲜度', value: freshness, evidence: Number.isFinite(ageHours) ? `${Math.floor(ageHours)} 小时前观察` : '无观察时间' },
      { label: '参与增长', value: 0, evidence: growthEvidence },
      { label: '数据完整度', value: completeness, evidence: entity.dataState },
    ]
    : entity.kind === 'asset'
      ? [
        { label: '资产事实', value: entity.metrics.marketCapUsd !== null ? 12 : 0, evidence: entity.metrics.marketCapUsd === null ? '没有市值快照' : 'IGNIX market cap' },
        { label: '流动性事实', value: entity.metrics.liquidityUsd !== null ? 12 : 0, evidence: entity.metrics.liquidityUsd === null ? '没有流动性快照' : 'IGNIX liquidity' },
        { label: '状态覆盖', value: entity.status && entity.status !== 'unknown' ? 10 : 0, evidence: entity.status ?? '状态未知' },
        { label: '活跃新鲜度', value: freshness, evidence: Number.isFinite(ageHours) ? `${Math.floor(ageHours)} 小时前观察` : '无观察时间' },
        { label: '数据完整度', value: completeness, evidence: entity.dataState },
      ]
      : [
        { label: '任务难度', value: Math.min(20, Number(entity.metrics.gates ?? 0) + Math.floor(Number(entity.metrics.runGas ?? 0) / 100_000)), evidence: `gates ${entity.metrics.gates ?? 'unknown'} · runGas ${entity.metrics.runGas ?? 'unknown'}` },
        { label: 'Circuit 覆盖', value: Math.min(20, Number(entity.metrics.taskId ? 1 : 0) * 10 + Number(entity.metrics.circuits ?? 0)), evidence: entity.metrics.taskId || entity.metrics.circuits ? '存在关联 Circuit / Task' : '关联覆盖待确认' },
        { label: '活跃新鲜度', value: freshness, evidence: Number.isFinite(ageHours) ? `${Math.floor(ageHours)} 小时前观察` : '无观察时间' },
        { label: '参与增长', value: 0, evidence: growthEvidence },
        { label: '数据完整度', value: completeness, evidence: entity.dataState },
      ]
  return { entity, score: Math.round(factors.reduce((sum, factor) => sum + factor.value, 0)), factors }
}

export async function fetchEcosystemEvents(signal?: AbortSignal): Promise<EcosystemEvent[] | null> {
  if (!ECOSYSTEM_API_BASE) return null
  try {
    const response = await fetch(`${ECOSYSTEM_API_BASE}/api/ecosystem/events`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal })
    if (!response.ok) return null
    const payload = await response.json() as { events?: EcosystemEvent[] }
    return Array.isArray(payload.events) ? payload.events : null
  } catch {
    return null
  }
}
