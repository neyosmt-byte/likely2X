export const TAPEOUT = {
  website: 'https://tapeout.net',
  dataBase: import.meta.env.VITE_TAPEOUT_DATA_BASE || (import.meta.env.DEV ? '/tapeout-api' : 'https://tapeout.net'),
  endpoints: {
    config: '/pod/pod-mainnet.json',
    stats: '/pod/pod-stats.json',
    taskbank: '/pod/pod-taskbank.json',
    miners: '/pod/pod-miners.json',
  },
} as const

export type TapeoutProcessor = {
  address: string
  fromBlock: number | null
  multiplier: number | null
  name: string
}

export type TapeoutEvent = {
  author: string
  block: number
  circuitId: number
  circuits: string
  cpu: string
  gates: number | null
  nState: number | null
}

export type TapeoutSnapshot = {
  block: number | null
  errors: string[]
  generatedAt: string | null
  latestEvents: TapeoutEvent[]
  miners: { addresses: number | null; slots: number | null }
  processors: TapeoutProcessor[]
  sourceStatus: 'live' | 'degraded'
  stats: {
    currentRate: string | null
    taskCount: number | null
    totalMined: string | null
    totalVerifWeight: string | null
    totalUnverWeight: string | null
    unverifiedBps: number | null
    verifMinerCount: number | null
    minerCount: number | null
  }
  taskBank: { onchain: number | null; total: number | null }
  chain: { chainId: number | null; explorer: string | null; rpc: string | null }
}

type TapeoutConfig = {
  chainId?: number
  explorer?: string
  rpc?: string
  cpus?: Record<string, { address?: string; multiplier?: number; fromBlock?: number }>
}
type TapeoutStats = {
  generatedAt?: string
  block?: number
  chainId?: number
  minerCount?: number
  verifMinerCount?: number
  totalVerifWeight?: string
  totalUnverWeight?: string
  currentRate?: string
  totalMined?: string
  taskCount?: number
  unverifiedBps?: number
  events?: Array<Partial<TapeoutEvent>>
}
type TapeoutTaskbank = { meta?: { onchain?: number; total?: number } }
type TapeoutMiners = { count?: number; owners?: Record<string, unknown[]> }

async function getTapeout<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${TAPEOUT.dataBase}${path}`, { cache: 'no-store', signal })
  if (!response.ok) throw new Error(`TapeOut ${response.status}: ${path}`)
  return await response.json() as T
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function eventFrom(row: Partial<TapeoutEvent>): TapeoutEvent | null {
  const block = numeric(row.block)
  const circuitId = numeric(row.circuitId)
  if (block === null || circuitId === null) return null
  return {
    author: String(row.author || ''),
    block,
    circuitId,
    circuits: String(row.circuits || ''),
    cpu: String(row.cpu || 'TapeOut'),
    gates: numeric(row.gates),
    nState: numeric(row.nState),
  }
}

export async function fetchTapeout(signal?: AbortSignal): Promise<TapeoutSnapshot> {
  const [config, stats, taskbank, miners] = await Promise.allSettled([
    getTapeout<TapeoutConfig>(TAPEOUT.endpoints.config, signal),
    getTapeout<TapeoutStats>(TAPEOUT.endpoints.stats, signal),
    getTapeout<TapeoutTaskbank>(TAPEOUT.endpoints.taskbank, signal),
    getTapeout<TapeoutMiners>(TAPEOUT.endpoints.miners, signal),
  ])
  const errors = [config, stats, taskbank, miners]
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => result.reason instanceof Error ? result.reason.message : 'TapeOut feed unavailable')
  const configData = config.status === 'fulfilled' ? config.value : null
  const statsData = stats.status === 'fulfilled' ? stats.value : null
  const taskData = taskbank.status === 'fulfilled' ? taskbank.value : null
  const minerData = miners.status === 'fulfilled' ? miners.value : null
  const processors = Object.entries(configData?.cpus ?? {}).map(([name, processor]) => ({
    address: String(processor.address || ''),
    fromBlock: numeric(processor.fromBlock),
    multiplier: numeric(processor.multiplier),
    name,
  }))
  const latestEvents = (statsData?.events ?? []).map(eventFrom).filter((event): event is TapeoutEvent => event !== null).slice(-8).reverse()
  return {
    block: numeric(statsData?.block),
    errors,
    generatedAt: statsData?.generatedAt ?? null,
    latestEvents,
    miners: { addresses: minerData?.owners ? Object.keys(minerData.owners).length : null, slots: numeric(statsData?.minerCount ?? minerData?.count) },
    processors,
    sourceStatus: configData && statsData ? (errors.length === 0 ? 'live' : 'degraded') : 'degraded',
    stats: {
      currentRate: statsData?.currentRate ?? null,
      taskCount: numeric(statsData?.taskCount),
      totalMined: statsData?.totalMined ?? null,
      totalVerifWeight: statsData?.totalVerifWeight ?? null,
      totalUnverWeight: statsData?.totalUnverWeight ?? null,
      unverifiedBps: numeric(statsData?.unverifiedBps),
      verifMinerCount: numeric(statsData?.verifMinerCount),
      minerCount: numeric(statsData?.minerCount),
    },
    taskBank: { onchain: numeric(taskData?.meta?.onchain), total: numeric(taskData?.meta?.total) },
    chain: { chainId: numeric(configData?.chainId ?? statsData?.chainId), explorer: configData?.explorer ?? null, rpc: configData?.rpc ?? null },
  }
}
