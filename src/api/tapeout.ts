export const TAPEOUT = {
  website: 'https://tapeout.net',
  dataBase: import.meta.env.VITE_ECOSYSTEM_API_BASE || import.meta.env.VITE_TAPEOUT_DATA_BASE || (import.meta.env.DEV ? '/tapeout-api' : 'https://tapeout.net'),
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

export type TapeoutContracts = {
  factory: string | null
  lens: string | null
  lensNext: string | null
  mining: string | null
  token: string | null
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
  cycles: number | null
  nIn: number | null
  nOut: number | null
  refDepth: number | null
  refNand: number | null
  refLatch: number | null
  trivial: boolean | null
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
  sourceStatus: 'live' | 'cached' | 'stale' | 'degraded'
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
  contracts: TapeoutContracts
  token: { name: string | null; symbol: string | null }
  source: string
  taskBankMeta: {
    comb: number | null
    seq: number | null
    totalNand: number | null
    totalLatch: number | null
    onchainGates: number | null
    maxRunGas: number | null
    groups: string[]
  }
}

type TapeoutConfig = {
  chainId?: number
  explorer?: string
  rpc?: string
  cpus?: Record<string, { address?: string; multiplier?: number; fromBlock?: number }>
  circuits?: Array<Partial<TapeoutCircuit>>
  contracts?: Partial<Record<keyof TapeoutContracts, string>>
  tokenName?: string
  tokenSymbol?: string
  _meta?: { dataState?: 'live' | 'cached' | 'stale' | 'degraded'; error?: string | null }
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
  _meta?: { dataState?: 'live' | 'cached' | 'stale' | 'degraded'; error?: string | null }
}
type TapeoutTaskbank = { meta?: { onchain?: number; total?: number; comb?: number; seq?: number; totalNand?: number; totalLatch?: number; onchainGates?: number; maxRunGas?: number; groups?: string[] }; tasks?: Array<Partial<TapeoutTask>>; _meta?: { dataState?: 'live' | 'cached' | 'stale' | 'degraded'; error?: string | null } }
type TapeoutMiners = { count?: number; owners?: Record<string, Array<{ block?: number; cpu?: string; circuitId?: number; circuits?: string; taskId?: number }>>; _meta?: { dataState?: 'live' | 'cached' | 'stale' | 'degraded'; error?: string | null } }

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
  const id = numeric(row.id ?? (row as Partial<TapeoutTask> & { taskId?: number }).taskId)
  if (id === null && !row.name) return null
  return { id, name: String(row.name || `Task ${id ?? 'unknown'}`), kind: row.kind ? String(row.kind) : null, tier: row.tier ? String(row.tier) : null, group: row.group ? String(row.group) : null, onchain: typeof row.onchain === 'boolean' ? row.onchain : null, refGates: numeric(row.refGates), runGas: numeric(row.runGas), cycles: numeric(row.cycles), nIn: numeric(row.nIn), nOut: numeric(row.nOut), refDepth: numeric(row.refDepth), refNand: numeric(row.refNand), refLatch: numeric(row.refLatch), trivial: typeof row.trivial === 'boolean' ? row.trivial : null }
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
  const feedStates = [configData?._meta?.dataState, statsData?._meta?.dataState, taskData?._meta?.dataState, minerData?._meta?.dataState].filter((state): state is NonNullable<typeof state> => Boolean(state))
  errors.push(...[configData, statsData, taskData, minerData].flatMap((feed) => feed?._meta?.error ? [feed._meta.error] : []))
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
    sourceStatus: [config, stats, taskbank, miners].some((result) => result.status === 'rejected') || feedStates.includes('degraded') ? 'degraded' : feedStates.includes('stale') ? 'stale' : feedStates.includes('cached') ? 'cached' : 'live',
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
    contracts: {
      factory: configData?.contracts?.factory ?? null,
      lens: configData?.contracts?.lens ?? null,
      lensNext: configData?.contracts?.lensNext ?? null,
      mining: configData?.contracts?.mining ?? null,
      token: configData?.contracts?.token ?? null,
    },
    token: { name: configData?.tokenName ?? null, symbol: configData?.tokenSymbol ?? null },
    source: `${TAPEOUT.website}${TAPEOUT.endpoints.config}`,
    taskBankMeta: {
      comb: numeric(taskData?.meta?.comb),
      seq: numeric(taskData?.meta?.seq),
      totalNand: numeric(taskData?.meta?.totalNand),
      totalLatch: numeric(taskData?.meta?.totalLatch),
      onchainGates: numeric(taskData?.meta?.onchainGates),
      maxRunGas: numeric(taskData?.meta?.maxRunGas),
      groups: taskData?.meta?.groups ?? [],
    },
  }
}
