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

export type TapeoutCircuit = {
  circuitId: number | null
  cpu: string
  circuits: string
  mining: boolean | null
  note: string | null
  owner: string
  ownerName: string | null
  taskId: number | null
}

export type TapeoutTask = {
  id: number | null
  name: string
  kind: string | null
  tier: string | null
  group: string | null
  onchain: boolean | null
  refGates: number | null
  runGas: number | null
}

export type TapeoutMinerOwner = {
  address: string
  circuits: number
  lastBlock: number | null
  cpus: string[]
}

export type TapeoutSnapshot = {
  block: number | null
  circuits: TapeoutCircuit[]
  errors: string[]
  generatedAt: string | null
  latestEvents: TapeoutEvent[]
  miners: { addresses: number | null; slots: number | null }
  minerOwners: TapeoutMinerOwner[]
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
  tasks: TapeoutTask[]
  chain: { chainId: number | null; explorer: string | null; rpc: string | null }
}

type TapeoutConfig = {
  chainId?: number
  explorer?: string
  rpc?: string
  cpus?: Record<string, { address?: string; multiplier?: number; fromBlock?: number }>
  circuits?: Array<Partial<TapeoutCircuit>>
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
type TapeoutTaskbank = { meta?: { onchain?: number; total?: number }; tasks?: Array<Partial<TapeoutTask>> }
type TapeoutMiners = { count?: number; owners?: Record<string, Array<{ block?: number; cpu?: string; circuitId?: number; circuits?: string; taskId?: number }>> }

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

function circuitFrom(row: Partial<TapeoutCircuit>): TapeoutCircuit | null {
  const circuitId = numeric(row.circuitId)
  if (circuitId === null && !row.owner) return null
  return { circuitId, cpu: String(row.cpu || 'TapeOut'), circuits: String(row.circuits || ''), mining: typeof row.mining === 'boolean' ? row.mining : null, note: row.note ? String(row.note) : null, owner: String(row.owner || ''), ownerName: row.ownerName ? String(row.ownerName) : null, taskId: numeric(row.taskId) }
}

function taskFrom(row: Partial<TapeoutTask>): TapeoutTask | null {
  const id = numeric(row.id)
  if (id === null && !row.name) return null
  return { id, name: String(row.name || `Task ${id ?? 'unknown'}`), kind: row.kind ? String(row.kind) : null, tier: row.tier ? String(row.tier) : null, group: row.group ? String(row.group) : null, onchain: typeof row.onchain === 'boolean' ? row.onchain : null, refGates: numeric(row.refGates), runGas: numeric(row.runGas) }
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
  const circuits = (configData?.circuits ?? []).map(circuitFrom).filter((circuit): circuit is TapeoutCircuit => circuit !== null)
  const tasks = (taskData?.tasks ?? []).map(taskFrom).filter((task): task is TapeoutTask => task !== null)
  const minerOwners = Object.entries(minerData?.owners ?? {}).map(([address, entries]) => ({
    address,
    circuits: entries.length,
    lastBlock: entries.reduce<number | null>((latest, entry) => Math.max(latest ?? 0, numeric(entry.block) ?? 0) || latest, null),
    cpus: [...new Set(entries.map((entry) => String(entry.cpu || '')).filter(Boolean))],
  }))
  const latestEvents = (statsData?.events ?? []).map(eventFrom).filter((event): event is TapeoutEvent => event !== null).slice(-8).reverse()
  return {
    block: numeric(statsData?.block),
    circuits,
    errors,
    generatedAt: statsData?.generatedAt ?? null,
    latestEvents,
    miners: { addresses: minerData?.owners ? Object.keys(minerData.owners).length : null, slots: numeric(statsData?.minerCount ?? minerData?.count) },
    minerOwners,
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
    tasks,
    chain: { chainId: numeric(configData?.chainId ?? statsData?.chainId), explorer: configData?.explorer ?? null, rpc: configData?.rpc ?? null },
  }
}
