/* Upstream public feeds have independent JSON schemas; these boundaries are narrowed at normalization. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Env = { SNAPSHOTS?: KVNamespace; DB?: D1Database }

const TAPEOUT = 'https://tapeout.net'
const IGNIX = 'https://api.ignix.bot'
const XLAYER_RPC = 'https://rpc.xlayer.tech'
const ALLOWED_FEEDS = new Map([
  ['/pod/pod-mainnet.json', `${TAPEOUT}/pod/pod-mainnet.json`],
  ['/pod/pod-stats.json', `${TAPEOUT}/pod/pod-stats.json`],
  ['/pod/pod-taskbank.json', `${TAPEOUT}/pod/pod-taskbank.json`],
  ['/pod/pod-miners.json', `${TAPEOUT}/pod/pod-miners.json`],
])

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin')
  const allowedOrigin = origin && (/^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(origin) || /^https:\/\/likely2x\./.test(origin)) ? origin : '*'
  return { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120', Vary: 'Origin' }
}

function json(value: unknown, request: Request, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...corsHeaders(request), 'content-type': 'application/json; charset=utf-8' } })
}

async function upstream(url: string, env: Env) {
  const cacheKey = `snapshot:${url}`
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`upstream ${response.status}`)
    const body = await response.text()
    await env.SNAPSHOTS?.put(cacheKey, body, { expirationTtl: 300 })
    return { body, state: 'live' as const }
  } catch (error) {
    const cached = await env.SNAPSHOTS?.get(cacheKey)
    if (cached) return { body: cached, state: 'stale' as const, error: error instanceof Error ? error.message : 'upstream unavailable' }
    throw error
  }
}

async function readFeed(path: string, request: Request, env: Env) {
  const url = ALLOWED_FEEDS.get(path)
  if (!url) return null
  try {
    const result = await upstream(url, env)
    const payload = JSON.parse(result.body) as Record<string, unknown>
    return json({ ...payload, _meta: { source: url, observedAt: new Date().toISOString(), dataState: result.state, error: result.error ?? null } }, request)
  } catch (error) {
    return json({ error: 'upstream_unavailable', message: error instanceof Error ? error.message : 'feed unavailable', dataState: 'degraded', source: url }, request, 502)
  }
}

type FeedBundle = { config: Record<string, any>; stats: Record<string, any>; taskbank: Record<string, any>; miners: Record<string, any>; states: Record<string, string>; errors: string[]; observedAt: string }

async function loadBundle(env: Env): Promise<FeedBundle> {
  const paths = [...ALLOWED_FEEDS.keys()]
  const results = await Promise.all(paths.map(async (path) => {
    const target = ALLOWED_FEEDS.get(path)!
    try {
      const item = await upstream(target, env)
      return { path, value: JSON.parse(item.body) as Record<string, any>, state: item.state, error: item.error }
    } catch (error) {
      return { path, value: {}, state: 'degraded', error: error instanceof Error ? error.message : 'upstream unavailable' }
    }
  }))
  const byPath = new Map(results.map((result) => [result.path, result]))
  const config = byPath.get('/pod/pod-mainnet.json')!
  const stats = byPath.get('/pod/pod-stats.json')!
  const taskbank = byPath.get('/pod/pod-taskbank.json')!
  const miners = byPath.get('/pod/pod-miners.json')!
  return {
    config: config.value,
    stats: stats.value,
    taskbank: taskbank.value,
    miners: miners.value,
    states: Object.fromEntries(results.map((result) => [result.path, result.state])),
    errors: results.flatMap((result) => result.error ? [`${result.path}: ${result.error}`] : []),
    observedAt: new Date().toISOString(),
  }
}

async function loadAssets(env: Env) {
  const base = `${IGNIX}/v1`
  const indexFeed = await upstream(`${base}/campaigns/current`, env)
  const currentResponse = JSON.parse(indexFeed.body) as { code?: number; data?: { campaign?: { id?: string } } }
  const indexId = currentResponse.data?.campaign?.id
  if (!indexId) return { assets: [], state: 'degraded', error: 'TapeOut asset index unavailable', observedAt: new Date().toISOString() }
  const [leaderboardResponse, launchesResponse] = await Promise.all([
    upstream(`${base}/campaigns/${encodeURIComponent(indexId)}/leaderboards/mcap?page=1&limit=100`, env),
    upstream(`${base}/launches?limit=100&page=1`, env),
  ])
  const leaderboard = JSON.parse(leaderboardResponse.body) as { code?: number; message?: string; data?: any }
  const launches = JSON.parse(launchesResponse.body) as { code?: number; message?: string; data?: any }
  if (leaderboard.code !== 200 || launches.code !== 200) throw new Error(leaderboard.message ?? launches.message ?? 'IGNIX asset feed unavailable')
  const rows = [...(leaderboard.data?.rows ?? []).map((row: any) => ({ ...row, tokenAddress: row.subject, marketCap: row.metricUsd })), ...(launches.data?.launches ?? [])]
  const addressPattern = /^0x[0-9a-f]{40}$/i
  const assets = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const address = String(row.tokenAddress ?? '').toLowerCase()
    if (row.tokenType !== 'tapeout' || !addressPattern.test(address) || assets.has(address)) continue
    assets.set(address, { contract: address, chainId: Number.isFinite(Number(row.chainId)) ? Number(row.chainId) : null, name: row.name ?? row.token?.name ?? 'TapeOut asset', symbol: row.symbol ?? row.token?.symbol ?? '—', marketCapUsd: Number.isFinite(Number(row.marketCap)) ? Number(row.marketCap) : null, liquidityUsd: Number.isFinite(Number(row.liquidityUsd)) ? Number(row.liquidityUsd) : null, volumeUsd: Number.isFinite(Number(row.vol)) ? Number(row.vol) : null, graduated: typeof row.graduated === 'boolean' ? row.graduated : null, rank: Number.isFinite(Number(row.rank)) ? Number(row.rank) : null, tokenType: 'tapeout' })
  }
  const stale = indexFeed.state === 'stale' || leaderboardResponse.state === 'stale' || launchesResponse.state === 'stale'
  return { assets: [...assets.values()], state: stale ? 'stale' : 'live', error: indexFeed.error ?? leaderboardResponse.error ?? launchesResponse.error ?? null, observedAt: new Date().toISOString() }
}

function normalized(bundle: FeedBundle, assets: Array<Record<string, any>> = [], assetState = 'live') {
  const chainId = Number(bundle.config.chainId ?? bundle.stats.chainId ?? 56)
  const sourceState = Object.values(bundle.states).includes('degraded') ? 'degraded' : Object.values(bundle.states).includes('stale') ? 'stale' : 'live'
  const observedAt = bundle.stats.generatedAt ?? bundle.observedAt
  const source = `${TAPEOUT}/pod/`
  const base = (id: string, kind: string, name: string, status: string | null, metrics: Record<string, unknown>, address: string | null, dataSource: string, provenance: string[], state = sourceState) => ({ id, kind, chainId, address, name, status, metrics, source: dataSource, observedAt, dataState: state, provenance })
  const processors = Object.entries(bundle.config.cpus ?? {}).map(([name, value]: [string, any]) => base(`processor:${name}`, 'processor', name, value.address ? 'registered' : 'unknown', { multiplier: value.multiplier ?? null, fromBlock: value.fromBlock ?? null }, value.address ?? null, `${source}pod-mainnet.json`, ['pod-mainnet.cpus']))
  const circuits = (bundle.config.circuits ?? []).map((row: any, index: number) => base(`circuit:${row.circuitId ?? index}`, 'circuit', `Circuit #${row.circuitId ?? 'unknown'}`, row.mining === true ? 'mining' : row.mining === false ? 'complete' : 'unknown', { cpu: row.cpu ?? null, taskId: row.taskId ?? null, mining: row.mining ?? null }, row.owner ?? null, `${source}pod-mainnet.json`, ['pod-mainnet.circuits']))
  const tasks = (bundle.taskbank.tasks ?? bundle.config.tasks ?? []).map((row: any) => { const id = row.id ?? row.taskId; return base(`task:${id ?? row.name}`, 'task', row.name ?? `Task ${id ?? 'unknown'}`, row.onchain === true ? 'onchain' : row.onchain === false ? 'offchain' : 'unknown', { taskId: id ?? null, kind: row.kind ?? null, tier: row.tier ?? null, gates: row.refGates ?? null, runGas: row.runGas ?? null }, null, `${source}pod-taskbank.json`, ['pod-taskbank.meta']) })
  const participants = Object.entries(bundle.miners.owners ?? {}).map(([owner, items]: [string, any]) => base(`participant:${owner}`, 'participant', owner, 'active', { circuits: items.length, lastBlock: items.reduce((last: number, item: any) => Math.max(last, Number(item.block ?? 0)), 0), cpus: [...new Set(items.map((item: any) => item.cpu))].join(', ') }, owner, `${source}pod-miners.json`, ['pod-miners.owners']))
  const events = (bundle.stats.events ?? []).map((row: any) => ({ ...base(`event:${row.block}:${row.circuitId}`, 'event', `Circuit #${row.circuitId}`, 'observed', { block: row.block, gates: row.gates ?? null, nState: row.nState ?? null, cpu: row.cpu }, row.author ?? null, `${source}pod-stats.json`, ['pod-stats.events']), observedAt }))
  const projects = assets.map((asset) => ({ ...base(`asset:${asset.contract}`, 'asset', String(asset.name), asset.graduated === true ? 'graduated' : asset.graduated === false ? 'bonding' : 'unknown', { symbol: asset.symbol, marketCapUsd: asset.marketCapUsd, liquidityUsd: asset.liquidityUsd, volumeUsd: asset.volumeUsd }, String(asset.contract), 'IGNIX tapeout index', ['https://api.ignix.bot', 'tokenType=tapeout'], assetState), chainId: Number.isFinite(Number(asset.chainId)) ? Number(asset.chainId) : null }))
  return { chainId, sourceState, observedAt, processors, circuits, tasks, participants, events, projects }
}

async function apiRoute(pathname: string, request: Request, env: Env) {
  const bundle = await loadBundle(env)
  let assets: Array<Record<string, any>> = []
  let assetError: string | null = null
  let assetState = 'live'
  if (pathname === '/api/ecosystem/summary' || pathname === '/api/ecosystem/projects' || pathname === '/api/ecosystem/events' || pathname === '/api/ecosystem/search') {
    try { const assetSnapshot = await loadAssets(env); assets = assetSnapshot.assets; assetState = assetSnapshot.state; assetError = assetSnapshot.error } catch (error) { assetError = error instanceof Error ? error.message : 'IGNIX unavailable'; assetState = 'degraded' }
  }
  const data = normalized(bundle, assets, assetState)
  const all = [...data.processors, ...data.circuits, ...data.tasks, ...data.participants, ...data.events, ...data.projects]
  const query = new URL(request.url).searchParams.get('q')?.toLowerCase().trim()
  const entity = pathname.endsWith('/processors') ? data.processors : pathname.endsWith('/circuits') ? data.circuits : pathname.endsWith('/tasks') ? data.tasks : pathname.endsWith('/participants') ? data.participants : pathname.endsWith('/events') ? data.events : pathname.endsWith('/projects') ? data.projects : pathname.endsWith('/search') ? all.filter((item) => !query || `${item.name} ${item.address ?? ''} ${item.kind}`.toLowerCase().includes(query)) : all
  const health = Object.entries(bundle.states).map(([id, state]) => ({ id, state, source: ALLOWED_FEEDS.get(id), observedAt: bundle.observedAt, currentBlock: bundle.stats.block ?? null, error: bundle.errors.find((error) => error.startsWith(id)) ?? null }))
  let xlayerBlock: number | null = null
  let xlayerState = 'degraded'
  let xlayerError: string | null = null
  try {
    const requestRpc = (method: string) => fetch(XLAYER_RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }) })
    const [chainResponse, blockResponse] = await Promise.all([requestRpc('eth_chainId'), requestRpc('eth_blockNumber')])
    const [chainBody, blockBody] = await Promise.all([chainResponse.json(), blockResponse.json()]) as Array<{ result?: string; error?: { message?: string } }>
    if (!chainResponse.ok || !chainBody.result) throw new Error(chainBody.error?.message ?? `chainId RPC ${chainResponse.status}`)
    const chainId = Number.parseInt(chainBody.result, 16)
    if (chainId !== 196) throw new Error(`unexpected X Layer chainId ${chainId}`)
    if (!blockResponse.ok || !blockBody.result) throw new Error(blockBody.error?.message ?? `block RPC ${blockResponse.status}`)
    xlayerBlock = Number.parseInt(blockBody.result, 16)
    xlayerState = Number.isFinite(xlayerBlock) ? 'live' : 'degraded'
  } catch (error) { xlayerError = error instanceof Error ? error.message : 'X Layer RPC unavailable' }
  health.push({ id: 'xlayer', state: xlayerState, source: XLAYER_RPC, observedAt: bundle.observedAt, currentBlock: xlayerBlock, error: xlayerError })
  if (pathname === '/api/ecosystem/summary' || pathname === '/api/ecosystem/projects' || pathname === '/api/ecosystem/events' || pathname === '/api/ecosystem/search') health.push({ id: 'ignix', state: assetState, source: IGNIX, observedAt: bundle.observedAt, currentBlock: null, error: assetError })
  const ruleEvents: Array<Record<string, any>> = []
  if (pathname.endsWith('/events')) {
    const state = Object.values(bundle.states).includes('degraded') ? 'degraded' : Object.values(bundle.states).includes('stale') ? 'stale' : 'live'
    if (data.events.length >= 5) ruleEvents.push({ id: `anomaly:circuit-burst:${bundle.stats.block ?? 'unknown'}`, kind: 'event', rule: 'circuit_burst', severity: 'high', name: 'Circuit burst', chainId: data.chainId, address: null, status: 'observed', metrics: { eventCount: data.events.length, block: bundle.stats.block ?? null }, source: `${TAPEOUT}/pod/pod-stats.json`, observedAt: bundle.stats.generatedAt ?? bundle.observedAt, dataState: state, provenance: [`${TAPEOUT}/pod/pod-stats.json`, 'pod-stats.events'], evidence: [`最近窗口有 ${data.events.length} 个 Circuit 事件`, `最新区块 ${bundle.stats.block ?? 'unknown'}`] })
    const currentMetrics: Record<string, number> = { processorCount: data.processors.length, minerCount: Number(bundle.stats.minerCount ?? 0), participantCount: data.participants.length, taskCount: Number(bundle.taskbank.meta?.total ?? 0), onchainTasks: Number(bundle.taskbank.meta?.onchain ?? 0), projectCount: assets.length, projectLiquidity: assets.reduce((sum, asset) => sum + Number(asset.liquidityUsd ?? 0), 0) }
    if (env.DB) for (const [metric, current] of Object.entries(currentMetrics)) {
      const sourcePath = metric === 'processorCount' ? '/pod/pod-mainnet.json' : metric === 'minerCount' || metric === 'participantCount' ? '/pod/pod-miners.json' : metric === 'taskCount' || metric === 'onchainTasks' ? '/pod/pod-taskbank.json' : null
      if ((sourcePath && bundle.states[sourcePath] === 'degraded') || (metric.startsWith('project') && assetState === 'degraded')) continue
      const previous = await env.DB.prepare('SELECT value, observed_at FROM metric_snapshots WHERE metric = ? ORDER BY observed_at DESC LIMIT 1').bind(metric).first<{ value: number; observed_at: string }>()
      if (previous && Number(previous.value) !== current) {
        const rules: Record<string, string> = { processorCount: 'processor_change', minerCount: 'participant_change', participantCount: 'participant_change', taskCount: 'taskbank_change', onchainTasks: 'taskbank_change', projectCount: 'asset_change', projectLiquidity: 'asset_change' }
        ruleEvents.push({ id: `anomaly:${metric}:${previous.observed_at}:${current}`, kind: 'event', rule: rules[metric], severity: metric === 'projectLiquidity' ? 'medium' : 'low', name: `${metric} changed`, chainId: metric.startsWith('project') ? null : data.chainId, address: null, status: 'changed', metrics: { previous: Number(previous.value), current }, source: 'TapeOut / IGNIX history index', observedAt: bundle.observedAt, dataState: 'live', provenance: ['D1 metric_snapshots', `previous snapshot ${previous.observed_at}`], evidence: [`${metric}: ${previous.value} → ${current}`, `基线快照 ${previous.observed_at}`] })
      }
    }
    if (env.DB) {
      for (const processor of data.processors) {
        const previous = await env.DB.prepare('SELECT status FROM entities WHERE id = ?').bind(processor.id).first<{ status: string | null }>()
        if (!previous) ruleEvents.push({ id: `anomaly:processor-new:${processor.id}`, kind: 'event', rule: 'processor_change', severity: 'medium', name: `新 Processor · ${processor.name}`, chainId: processor.chainId, address: processor.address, status: processor.status, metrics: processor.metrics, source: processor.source, observedAt: bundle.observedAt, dataState: processor.dataState, provenance: ['D1 entities', ...processor.provenance], evidence: [`Processor ${processor.name} 首次出现在同步索引`, `地址 ${processor.address ?? 'unknown'}`] })
        else if (previous.status !== processor.status) ruleEvents.push({ id: `anomaly:processor-status:${processor.id}:${processor.status}`, kind: 'event', rule: 'processor_change', severity: 'medium', name: `Processor 状态变化 · ${processor.name}`, chainId: processor.chainId, address: processor.address, status: processor.status, metrics: processor.metrics, source: processor.source, observedAt: bundle.observedAt, dataState: processor.dataState, provenance: ['D1 entities', ...processor.provenance], evidence: [`${previous.status ?? 'unknown'} → ${processor.status ?? 'unknown'}`] })
      }
      const previousProjects = await env.DB.prepare('SELECT assets_json, observed_at FROM project_snapshots ORDER BY observed_at DESC LIMIT 1').first<{ assets_json: string; observed_at: string }>()
      if (previousProjects) {
        const oldAssets = new Map((JSON.parse(previousProjects.assets_json) as Array<Record<string, any>>).map((asset) => [String(asset.contract).toLowerCase(), asset]))
        for (const asset of assets) {
          const old = oldAssets.get(String(asset.contract).toLowerCase())
          if (!old) ruleEvents.push({ id: `anomaly:asset-new:${asset.contract}:${previousProjects.observed_at}`, kind: 'event', rule: 'asset_change', severity: 'medium', name: `新 TapeOut 项目 · ${asset.name}`, chainId: asset.chainId ?? null, address: asset.contract, status: 'new', metrics: { marketCapUsd: asset.marketCapUsd, liquidityUsd: asset.liquidityUsd }, source: 'IGNIX tapeout index', observedAt: bundle.observedAt, dataState: assetState, provenance: ['D1 project_snapshots', previousProjects.observed_at, 'tokenType=tapeout'], evidence: [`合约 ${asset.contract} 首次进入当前项目快照`] })
          else if (old.graduated !== asset.graduated || Number(old.liquidityUsd ?? 0) !== Number(asset.liquidityUsd ?? 0)) ruleEvents.push({ id: `anomaly:asset-update:${asset.contract}:${asset.graduated}:${asset.liquidityUsd}`, kind: 'event', rule: 'asset_change', severity: 'low', name: `项目资产状态变化 · ${asset.name}`, chainId: asset.chainId ?? null, address: asset.contract, status: asset.graduated === true ? 'graduated' : asset.graduated === false ? 'bonding' : 'unknown', metrics: { previousLiquidityUsd: old.liquidityUsd ?? null, liquidityUsd: asset.liquidityUsd ?? null }, source: 'IGNIX tapeout index', observedAt: bundle.observedAt, dataState: assetState, provenance: ['D1 project_snapshots', previousProjects.observed_at, 'tokenType=tapeout'], evidence: [`毕业状态 ${old.graduated ?? 'unknown'} → ${asset.graduated ?? 'unknown'}`, `流动性 ${old.liquidityUsd ?? 'unknown'} → ${asset.liquidityUsd ?? 'unknown'}`] })
        }
      }
    }
    if (state !== 'live') ruleEvents.push({ id: `anomaly:source-stale:${bundle.observedAt}`, kind: 'event', rule: 'source_stale', severity: 'high', name: '数据源状态变化', chainId: null, address: null, status: state, metrics: {}, source: 'TapeOut feed', observedAt: bundle.observedAt, dataState: state, provenance: bundle.errors, evidence: bundle.errors.length ? bundle.errors : [`feed state ${state}`] })
    if (xlayerState !== 'live') ruleEvents.push({ id: `anomaly:xlayer:${bundle.observedAt}`, kind: 'event', rule: 'source_stale', severity: 'high', name: 'X Layer RPC 降级', chainId: 196, address: null, status: 'degraded', metrics: {}, source: XLAYER_RPC, observedAt: bundle.observedAt, dataState: 'degraded', provenance: [XLAYER_RPC], evidence: [xlayerError ?? 'chainId 196 block height unavailable'] })
  }
  const payload = pathname.endsWith('/health') ? { sources: health } : pathname.endsWith('/summary') ? { counts: { processors: data.processors.length, circuits: data.circuits.length, tasks: data.tasks.length, participants: data.participants.length, events: data.events.length, projects: data.projects.length }, metrics: bundle.stats, taskbank: bundle.taskbank.meta ?? {}, sources: health } : pathname.endsWith('/projects') ? { entities: entity, assets } : pathname.endsWith('/events') ? { entities: entity, events: ruleEvents } : { entities: entity }
  const bundleState = Object.values(bundle.states).includes('degraded') ? 'degraded' : Object.values(bundle.states).includes('stale') ? 'stale' : 'live'
  const dataState = bundleState === 'degraded' || assetState === 'degraded' ? 'degraded' : bundleState === 'stale' || assetState === 'stale' ? 'stale' : 'live'
  return json({ ...payload, dataState, provenance: [...ALLOWED_FEEDS.values(), IGNIX], observedAt: bundle.observedAt, errors: [...bundle.errors, ...(assetError ? [assetError] : [])] }, request)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(request) })
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, request, 405)
    const url = new URL(request.url)
    const feedResponse = await readFeed(url.pathname, request, env)
    if (feedResponse) return feedResponse
    if (url.pathname.startsWith('/api/ecosystem/')) {
      const allowed = new Set(['/api/ecosystem/summary', '/api/ecosystem/projects', '/api/ecosystem/processors', '/api/ecosystem/circuits', '/api/ecosystem/tasks', '/api/ecosystem/participants', '/api/ecosystem/events', '/api/ecosystem/health', '/api/ecosystem/search'])
      if (!allowed.has(url.pathname)) return json({ error: 'path_not_allowed' }, request, 404)
      try { return await apiRoute(url.pathname, request, env) } catch (error) { return json({ error: 'ecosystem_unavailable', message: error instanceof Error ? error.message : 'upstream unavailable', dataState: 'degraded', provenance: [] }, request, 502) }
    }
    return json({ error: 'path_not_allowed' }, request, 404)
  },
  async scheduled(_controller: ScheduledController, env: Env) {
    const bundle = await loadBundle(env)
    await env.SNAPSHOTS?.put('snapshot:ecosystem:latest', JSON.stringify(bundle), { expirationTtl: 86400 })
    const now = new Date().toISOString()
    const assetSnapshot = await loadAssets(env).catch((error) => ({ assets: [], state: 'degraded', error: error instanceof Error ? error.message : 'IGNIX unavailable' }))
    const data = normalized(bundle, assetSnapshot.assets, assetSnapshot.state ?? 'degraded')
    const entities = [...data.processors, ...data.circuits, ...data.tasks, ...data.participants, ...data.events, ...data.projects]
    for (const entity of entities) {
      await env.DB?.prepare('INSERT OR REPLACE INTO entities (id, kind, chain_id, address, name, status, metrics_json, source, observed_at, data_state, provenance_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(entity.id, entity.kind, entity.chainId, entity.address, entity.name, entity.status, JSON.stringify(entity.metrics), entity.source, entity.observedAt, entity.dataState, JSON.stringify(entity.provenance)).run()
    }
    for (const event of data.events) {
      await env.DB?.prepare('INSERT OR IGNORE INTO events (id, chain_id, address, name, metrics_json, source, observed_at, provenance_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(event.id, event.chainId, event.address, event.name, JSON.stringify(event.metrics), event.source, event.observedAt, JSON.stringify(event.provenance)).run()
    }
    if (assetSnapshot.state !== 'degraded') {
      await env.DB?.prepare('INSERT INTO project_snapshots (observed_at, project_count, total_market_cap_usd, total_liquidity_usd, assets_json) VALUES (?, ?, ?, ?, ?)')
        .bind(now, assetSnapshot.assets.length, assetSnapshot.assets.reduce((sum: number, asset: any) => sum + Number(asset.marketCapUsd ?? 0), 0), assetSnapshot.assets.reduce((sum: number, asset: any) => sum + Number(asset.liquidityUsd ?? 0), 0), JSON.stringify(assetSnapshot.assets)).run()
    }
    const syncRows = [
      ['tapeout-config', bundle.states['/pod/pod-mainnet.json'], bundle.config.fromBlock, bundle.errors.find((error) => error.includes('pod-mainnet')) ?? null],
      ['tapeout-stats', bundle.states['/pod/pod-stats.json'], bundle.stats.block, bundle.errors.find((error) => error.includes('pod-stats')) ?? null],
      ['tapeout-taskbank', bundle.states['/pod/pod-taskbank.json'], bundle.stats.block, bundle.errors.find((error) => error.includes('pod-taskbank')) ?? null],
      ['tapeout-miners', bundle.states['/pod/pod-miners.json'], bundle.miners.block, bundle.errors.find((error) => error.includes('pod-miners')) ?? null],
      ['ignix-assets', assetSnapshot.state ?? 'degraded', null, assetSnapshot.error ?? null],
    ]
    for (const [source, state, block, error] of syncRows) {
      await env.DB?.prepare('INSERT INTO sync_runs (source, observed_at, block_number, status, error) VALUES (?, ?, ?, ?, ?)').bind(source, now, block ?? null, error ? 'degraded' : state, error).run()
    }
    const metrics: Record<string, number> = { processorCount: data.processors.length, minerCount: Number(bundle.stats.minerCount ?? 0), participantCount: data.participants.length, taskCount: Number(bundle.taskbank.meta?.total ?? 0), onchainTasks: Number(bundle.taskbank.meta?.onchain ?? 0) }
    if (assetSnapshot.state !== 'degraded') Object.assign(metrics, { projectCount: assetSnapshot.assets.length, projectLiquidity: assetSnapshot.assets.reduce((sum: number, asset: any) => sum + Number(asset.liquidityUsd ?? 0), 0) })
    for (const [metric, value] of Object.entries(metrics)) await env.DB?.prepare('INSERT INTO metric_snapshots (metric, observed_at, value) VALUES (?, ?, ?)').bind(metric, now, value).run()
  },
}
