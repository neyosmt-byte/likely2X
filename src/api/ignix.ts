export const XLAYER = {
  chainId: 196,
  name: 'X Layer Mainnet',
  nativeCurrency: 'OKB',
  rpc: 'https://rpc.xlayer.tech',
  fallbackRpc: 'https://xlayerrpc.okx.com',
  explorer: 'https://www.oklink.com/xlayer',
} as const

export const IGNIX_API = 'https://api.ignix.bot'
const ECOSYSTEM_API_BASE = import.meta.env.VITE_ECOSYSTEM_API_BASE?.replace(/\/$/, '')

export type TapeoutAsset = {
  chainId: number | null
  contract: string
  graduated: boolean | null
  liquidityUsd: number | null
  marketCapUsd: number | null
  name: string
  rank: number | null
  reason: string | null
  symbol: string
  volumeUsd: number | null
}

export type IgnixIndexContext = {
  id: string | null
  snapshotAt: string | null
}

export type EcosystemSnapshot = {
  assets: TapeoutAsset[]
  indexContext: IgnixIndexContext | null
  fetchedAt: string
  sourceStatus: 'live' | 'cached' | 'stale' | 'degraded'
  errors: string[]
}

export type NetworkSnapshot = {
  blockNumber: number | null
  chainId: number | null
  checkedAt: string
  rpc: string | null
  ok: boolean
}

type Envelope<T> = { code?: number; data?: T; message?: string }
type CurrentData = {
  index?: {
    id?: string | null
  } | null
  campaign?: { id?: string | null } | null
}
type LeaderboardData = {
  rows?: Array<{
    rank?: number
    subject?: string
    chainId?: number
    tokenType?: string
    metricUsd?: number
    liquidityUsd?: number
    graduated?: boolean
    reason?: string | null
    token?: { name?: string; symbol?: string }
  }>
  snapshot?: { createdAt?: string | null }
}
type LaunchData = {
  launches?: Array<{
    tokenAddress?: string
    chainId?: number
    tokenType?: string
    name?: string
    symbol?: string
    marketCap?: number | string
    vol?: number | string
    graduated?: boolean
  }>
}

function numberOrNull(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function addressOrEmpty(value: unknown) {
  const address = String(value ?? '').trim().toLowerCase()
  return /^0x[0-9a-f]{40}$/.test(address) ? address : ''
}

async function getIgnix<T>(path: string, signal?: AbortSignal) {
  const response = await fetch(`${IGNIX_API}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })
  const body = await response.json() as Envelope<T>
  if (!response.ok || body.code !== 200 || body.data === undefined) {
    throw new Error(body.message || `IGNIX API ${response.status}`)
  }
  return body.data
}

function indexContextFrom(data: CurrentData | null): IgnixIndexContext | null {
  const source = data?.index ?? data?.campaign
  if (!source) return null
  return { id: source.id ?? null, snapshotAt: null }
}

function fromLeaderboard(row: NonNullable<LeaderboardData['rows']>[number]): TapeoutAsset | null {
  if (row.tokenType !== 'tapeout') return null
  const contract = addressOrEmpty(row.subject)
  if (!contract) return null
  return {
    chainId: numberOrNull(row.chainId),
    contract,
    graduated: typeof row.graduated === 'boolean' ? row.graduated : null,
    liquidityUsd: numberOrNull(row.liquidityUsd),
    marketCapUsd: numberOrNull(row.metricUsd),
    name: row.token?.name || 'TapeOut asset',
    rank: numberOrNull(row.rank),
    reason: row.reason ?? null,
    symbol: row.token?.symbol || '—',
    volumeUsd: null,
  }
}

function fromLaunch(row: NonNullable<LaunchData['launches']>[number]): TapeoutAsset | null {
  if (row.tokenType !== 'tapeout') return null
  const contract = addressOrEmpty(row.tokenAddress)
  if (!contract) return null
  return {
    chainId: numberOrNull(row.chainId),
    contract,
    graduated: typeof row.graduated === 'boolean' ? row.graduated : null,
    liquidityUsd: null,
    marketCapUsd: numberOrNull(row.marketCap),
    name: row.name || 'TapeOut asset',
    rank: null,
    reason: null,
    symbol: row.symbol || '—',
    volumeUsd: numberOrNull(row.vol),
  }
}

export async function fetchEcosystem(signal?: AbortSignal): Promise<EcosystemSnapshot> {
  const fetchedAt = new Date().toISOString()
  if (ECOSYSTEM_API_BASE) {
    try {
      const response = await fetch(`${ECOSYSTEM_API_BASE}/api/ecosystem/projects`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal })
      const payload = await response.json() as { assets?: TapeoutAsset[]; dataState?: string; observedAt?: string; errors?: string[] }
      if (!response.ok || !Array.isArray(payload.assets)) throw new Error(`Ecosystem API ${response.status}`)
      return { assets: payload.assets.filter((asset) => asset.contract && /^0x[0-9a-f]{40}$/i.test(asset.contract) && (asset as TapeoutAsset & { tokenType?: string }).tokenType === 'tapeout'), indexContext: { id: null, snapshotAt: payload.observedAt ?? null }, fetchedAt: payload.observedAt ?? fetchedAt, sourceStatus: payload.dataState === 'live' || payload.dataState === 'cached' || payload.dataState === 'stale' || payload.dataState === 'degraded' ? payload.dataState : 'degraded', errors: payload.errors ?? [] }
    } catch (error) {
      return { assets: [], indexContext: null, fetchedAt, sourceStatus: 'degraded', errors: [error instanceof Error ? error.message : 'Ecosystem API unavailable'] }
    }
  }
  try {
    const current = await getIgnix<CurrentData>('/v1/campaigns/current', signal)
    const indexContext = indexContextFrom(current)
    const indexId = indexContext?.id
    const [leaderboard, launches] = await Promise.allSettled([
      indexId
        ? getIgnix<LeaderboardData>(`/v1/campaigns/${encodeURIComponent(indexId)}/leaderboards/mcap?page=1&limit=50`, signal)
        : Promise.resolve(null),
      getIgnix<LaunchData>('/v1/launches?limit=50&page=1', signal),
    ])
    const errors = [leaderboard, launches]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason instanceof Error ? result.reason.message : 'IGNIX feed unavailable')
    const snapshotAt = leaderboard.status === 'fulfilled' ? leaderboard.value?.snapshot?.createdAt ?? null : null
    const resolvedIndex = indexContext && snapshotAt ? { ...indexContext, snapshotAt } : indexContext
    const assets = new Map<string, TapeoutAsset>()
    if (leaderboard.status === 'fulfilled') {
      for (const row of leaderboard.value?.rows ?? []) {
        const asset = fromLeaderboard(row)
        if (asset) assets.set(asset.contract, asset)
      }
    }
    if (launches.status === 'fulfilled') {
      for (const row of launches.value?.launches ?? []) {
        const asset = fromLaunch(row)
        if (asset && !assets.has(asset.contract)) assets.set(asset.contract, asset)
      }
    }
    return {
      assets: [...assets.values()].sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)),
      indexContext: resolvedIndex,
      fetchedAt,
      sourceStatus: errors.length === 0 ? 'live' : 'degraded',
      errors,
    }
  } catch (error) {
    return {
      assets: [],
      indexContext: null,
      fetchedAt,
      sourceStatus: 'degraded',
      errors: [error instanceof Error ? error.message : 'IGNIX API unavailable'],
    }
  }
}

async function rpc(url: string, method: 'eth_chainId' | 'eth_blockNumber', signal?: AbortSignal) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }),
    signal,
  })
  const body = await response.json() as { result?: string; error?: { message?: string } }
  if (!response.ok || typeof body.result !== 'string') throw new Error(body.error?.message || `X Layer RPC ${response.status}`)
  return body.result
}

async function readNetwork(url: string, signal?: AbortSignal) {
  const chainId = Number.parseInt(await rpc(url, 'eth_chainId', signal), 16)
  if (chainId !== XLAYER.chainId) throw new Error(`chain mismatch: ${chainId}`)
  const blockNumber = Number.parseInt(await rpc(url, 'eth_blockNumber', signal), 16)
  return { chainId, blockNumber }
}

export async function fetchNetwork(signal?: AbortSignal): Promise<NetworkSnapshot> {
  for (const rpcUrl of [XLAYER.rpc, XLAYER.fallbackRpc]) {
    try {
      const result = await readNetwork(rpcUrl, signal)
      return { ...result, checkedAt: new Date().toISOString(), rpc: rpcUrl, ok: true }
    } catch (error) {
      if (signal?.aborted) throw error
    }
  }
  return { blockNumber: null, chainId: null, checkedAt: new Date().toISOString(), rpc: null, ok: false }
}
