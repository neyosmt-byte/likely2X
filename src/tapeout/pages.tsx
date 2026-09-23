import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchEcosystem, fetchNetwork, IGNIX_API, XLAYER, type EcosystemSnapshot, type NetworkSnapshot, type TapeoutAsset } from '../api/ignix.ts'
import { fetchTapeout, TAPEOUT, type TapeoutEvent, type TapeoutProcessor, type TapeoutSnapshot } from '../api/tapeout.ts'
import '../styles.css'

type TapeoutData = { ecosystem: EcosystemSnapshot | null; network: NetworkSnapshot | null; tapeout: TapeoutSnapshot | null; loading: boolean; refresh: () => void }

function useTapeoutData(): TapeoutData {
  const [ecosystem, setEcosystem] = useState<EcosystemSnapshot | null>(null)
  const [network, setNetwork] = useState<NetworkSnapshot | null>(null)
  const [tapeout, setTapeout] = useState<TapeoutSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    const controller = new AbortController()
    void Promise.all([fetchEcosystem(controller.signal), fetchNetwork(controller.signal), fetchTapeout(controller.signal)])
      .then(([nextEcosystem, nextNetwork, nextTapeout]) => {
        if (controller.signal.aborted) return
        setEcosystem(nextEcosystem); setNetwork(nextNetwork); setTapeout(nextTapeout)
      })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return controller
  }, [])
  const refresh = useCallback(() => {
    setLoading(true)
    load()
  }, [load])
  useEffect(() => {
    const controller = load()
    return () => controller.abort()
  }, [load])
  return { ecosystem, network, tapeout, loading, refresh }
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function dateText(value: string | null | undefined) {
  if (!value) return '未读取'
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toLocaleString('zh-CN') : value
}

function short(value: string | null | undefined) {
  if (!value) return '—'
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
}

function Signal({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="signal-card"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>
}

function SourceState({ ecosystem, tapeout, network }: Pick<TapeoutData, 'ecosystem' | 'tapeout' | 'network'>) {
  const errors = [...(ecosystem?.errors ?? []), ...(tapeout?.errors ?? [])]
  return <div className="source-state"><span className={network?.ok ? 'pill green' : 'pill amber'}>{network?.ok ? 'X Layer 在线' : 'X Layer 待校验'}</span><span className={tapeout?.sourceStatus === 'live' ? 'pill green' : 'pill amber'}>{tapeout?.sourceStatus === 'live' ? 'TapeOut feed live' : 'TapeOut feed degraded'}</span><span className={ecosystem?.sourceStatus === 'live' ? 'pill green' : 'pill amber'}>{ecosystem?.sourceStatus === 'live' ? 'IGNIX live' : 'IGNIX degraded'}</span>{errors.length ? <small>{errors.slice(0, 2).join(' · ')}</small> : null}</div>
}

function ProcessorTable({ processors }: { processors: TapeoutProcessor[] }) {
  return <div className="table-scroll"><table><thead><tr><th>Processor</th><th>Multiplier</th><th>起始区块</th><th>地址</th><th>证据</th></tr></thead><tbody>{processors.map((processor) => <tr key={`${processor.name}-${processor.address}`}><td><strong>{processor.name}</strong><small>官方配置 registry</small></td><td className="mono">{processor.multiplier === null ? '—' : `${processor.multiplier}×`}</td><td className="mono">{processor.fromBlock?.toLocaleString() ?? '—'}</td><td className="mono">{short(processor.address)}</td><td><span className="pill green">已发现</span></td></tr>)}</tbody></table></div>
}

function AssetTable({ assets }: { assets: TapeoutAsset[] }) {
  return <div className="table-scroll"><table><thead><tr><th>项目</th><th>市值</th><th>流动性</th><th>状态</th><th>合约</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.contract}><td><strong>{asset.name}</strong><small>{asset.symbol} · IGNIX TapeOut token</small></td><td>{money(asset.marketCapUsd)}</td><td>{money(asset.liquidityUsd)}</td><td><span className={asset.graduated ? 'pill green' : 'pill amber'}>{asset.graduated ? '已毕业' : '曲线中'}</span></td><td><a className="mono link" href={`${XLAYER.explorer}/address/${asset.contract}`} target="_blank" rel="noreferrer">{short(asset.contract)} ↗</a></td></tr>)}</tbody></table></div>
}

function EventList({ events }: { events: TapeoutEvent[] }) {
  return <div className="event-list">{events.length ? events.map((event) => <div className="event-row" key={`${event.block}-${event.circuitId}-${event.author}`}><span className="event-badge">{event.cpu}</span><strong>Circuit #{event.circuitId}</strong><span>{event.gates ?? '—'} gates</span><span className="mono">block {event.block.toLocaleString()}</span><span className="mono">{short(event.author)}</span></div>) : <div className="notice empty inline"><strong>暂无可展示的流片事件</strong><span>官方 feed 当前没有返回可验证事件，页面不会补造 Circuit。</span></div>}</div>
}

function PageHeader({ eyebrow, title, copy, data, onRefresh }: { eyebrow: string; title: string; copy: string; data: TapeoutData; onRefresh?: () => void }) {
  return <><div className="tapeout-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div><div className="heading-actions"><SourceState ecosystem={data.ecosystem} tapeout={data.tapeout} network={data.network} />{onRefresh ? <button className="button ghost small" type="button" onClick={onRefresh} disabled={data.loading}>{data.loading ? '同步中…' : '刷新数据'}</button> : null}</div></div></>
}

export function TapeoutDiscoveryPage() {
  const data = useTapeoutData()
  const assets = data.ecosystem?.assets ?? []
  const processors = data.tapeout?.processors ?? []
  const events = data.tapeout?.latestEvents ?? []
  return <div className="app-shell tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · DISCOVERY" title="TapeOut 生态发现" copy="把 Processor、Circuit、Proof-of-Design、参与地址与 IGNIX TapeOut 项目放在同一张可验证的发现台。每张卡都标注来源、链和快照时间。" data={data} onRefresh={data.refresh} /><div className="signal-grid"><Signal label="X LAYER" value={data.network?.ok ? `在线 · ${data.network.blockNumber?.toLocaleString()}` : '校验中'} hint={`chainId ${XLAYER.chainId}`} /><Signal label="PROCESSORS" value={String(processors.length)} hint="TapeOut 官方 registry" /><Signal label="CIRCUIT SLOTS" value={data.tapeout?.miners.slots?.toLocaleString() ?? '—'} hint={`${data.tapeout?.miners.addresses?.toLocaleString() ?? '—'} 个参与地址`} /><Signal label="PROOF TASKS" value={`${data.tapeout?.taskBank.onchain ?? '—'} / ${data.tapeout?.taskBank.total ?? '—'}`} hint="已上链 / 题库总量" /><Signal label="TAPEOUT ASSETS" value={String(assets.length)} hint="IGNIX 明确标注 tokenType=tapeout" /></div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">01 · OPPORTUNITY FEED</span><h2>值得跟进的生态入口</h2><p>发现页负责把生态事实组织成入口，不执行交易、不猜测未知项目类型。</p></div><span className="source-tag">TapeOut · IGNIX · X Layer</span></div><div className="entry-grid"><Link className="entry-card" to="/radar"><strong>Processor / Circuit 雷达</strong><span>按处理器、流片事件、矿工参与和题库状态浏览。</span><b>打开雷达 →</b></Link><Link className="entry-card" to="/alpha"><strong>TapeOut Alpha</strong><span>把 multiplier、任务覆盖、事件新鲜度和资产事实转成候选评分。</span><b>进入 Alpha →</b></Link><Link className="entry-card" to="/market"><strong>协议与资产行情</strong><span>查看 TapeOut 资产、发行状态和协议统计快照。</span><b>查看行情 →</b></Link><Link className="entry-card" to="/data"><strong>数据源健康</strong><span>对照 TapeOut feed、IGNIX API 和 X Layer RPC 的新鲜度。</span><b>检查数据 →</b></Link></div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">02 · PROCESSOR REGISTRY</span><h2>当前 Processor</h2></div><span className="source-tag">{TAPEOUT.website}/pod/pod-mainnet.json</span></div>{processors.length ? <ProcessorTable processors={processors} /> : <div className="notice empty"><strong>Processor registry 尚未读取</strong><span>刷新后会显示官方配置的处理器和 multiplier。</span></div>}</section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">03 · PROJECT SURFACE</span><h2>IGNIX TapeOut 项目</h2><p>只展示 API 明确标记为 TapeOut 的资产；无法验证的 launch 会留在未知层，不会混入榜单。</p></div><span className="source-tag">{IGNIX_API}</span></div>{assets.length ? <AssetTable assets={assets.slice(0, 10)} /> : <div className="notice empty"><strong>当前快照没有可验证 TapeOut 资产</strong><span>这代表公开接口没有返回 tokenType=tapeout 的资产，不代表生态不存在项目。</span></div>}</section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">04 · LATEST WINDOW</span><h2>最近流片事件</h2></div><span className="source-tag">{dateText(data.tapeout?.generatedAt)}</span></div><EventList events={events} /></section></div></div>
}

export function TapeoutRadarPage() {
  const data = useTapeoutData()
  const [view, setView] = useState<'processors' | 'events' | 'miners' | 'tasks'>('processors')
  const processors = data.tapeout?.processors ?? []
  const events = data.tapeout?.latestEvents ?? []
  const tabs = [{ id: 'processors', label: 'Processor' }, { id: 'events', label: 'Circuit events' }, { id: 'miners', label: '参与地址' }, { id: 'tasks', label: 'Proof tasks' }] as const
  return <div className="app-shell tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · ECO RADAR" title="TapeOut 生态雷达" copy="雷达面向整个 TapeOut 项目生态：处理器能力、流片事件、题库覆盖和参与地址。公开 feed 是观察窗口，任何缺失都保留为未知状态。" data={data} onRefresh={data.refresh} /><div className="radar-tabs">{tabs.map((tab) => <button key={tab.id} type="button" className={view === tab.id ? 'radar-tab active' : 'radar-tab'} onClick={() => setView(tab.id)}>{tab.label}</button>)}</div><div className="signal-grid compact"><Signal label="PROCESSORS" value={String(processors.length)} hint="registry" /><Signal label="EVENT WINDOW" value={String(events.length)} hint="latest feed window" /><Signal label="MINER SLOTS" value={data.tapeout?.miners.slots?.toLocaleString() ?? '—'} hint="公开统计" /><Signal label="TASK COVERAGE" value={`${data.tapeout?.taskBank.onchain ?? '—'} / ${data.tapeout?.taskBank.total ?? '—'}`} hint="onchain / total" /></div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">RADAR VIEW · {tabs.find((tab) => tab.id === view)?.label.toUpperCase()}</span><h2>{view === 'processors' ? 'Processor 能力与部署线索' : view === 'events' ? '最新 Circuit / tapeout 事件' : view === 'miners' ? '参与地址与挖矿容量' : 'Proof-of-Design 题库状态'}</h2></div><span className="source-tag">source provenance enabled</span></div>{view === 'processors' ? <ProcessorTable processors={processors} /> : null}{view === 'events' ? <EventList events={events} /> : null}{view === 'miners' ? <div className="radar-detail-grid"><div className="detail-stat"><span>参与地址</span><strong>{data.tapeout?.miners.addresses?.toLocaleString() ?? '—'}</strong><small>pod-miners owner keys</small></div><div className="detail-stat"><span>矿工槽位</span><strong>{data.tapeout?.miners.slots?.toLocaleString() ?? '—'}</strong><small>pod-stats minerCount</small></div><div className="detail-stat"><span>验证矿工</span><strong>{data.tapeout?.stats.verifMinerCount?.toLocaleString() ?? '—'}</strong><small>官方统计</small></div><div className="detail-stat"><span>当前速率</span><strong>{data.tapeout?.stats.currentRate ?? '—'}</strong><small>公开 feed</small></div></div> : null}{view === 'tasks' ? <div className="radar-detail-grid"><div className="detail-stat"><span>题库总量</span><strong>{data.tapeout?.taskBank.total ?? '—'}</strong><small>taskbank meta</small></div><div className="detail-stat"><span>已上链</span><strong>{data.tapeout?.taskBank.onchain ?? '—'}</strong><small>onchain tasks</small></div><div className="detail-stat"><span>统计任务数</span><strong>{data.tapeout?.stats.taskCount ?? '—'}</strong><small>stats feed</small></div><div className="detail-stat"><span>未验证比例</span><strong>{data.tapeout?.stats.unverifiedBps === null || data.tapeout?.stats.unverifiedBps === undefined ? '—' : `${(data.tapeout.stats.unverifiedBps / 100).toFixed(2)}%`}</strong><small>basis points</small></div></div> : null}</section><section className="panel provenance-panel"><div className="panel-heading"><div><span className="eyebrow">PROVENANCE</span><h2>读数边界</h2></div></div><ul className="provenance-list"><li><strong>TapeOut protocol feed</strong><span>当前公开 feed 标注为 chainId {data.tapeout?.chain.chainId ?? '56'}；这是协议生态来源。</span></li><li><strong>X Layer target</strong><span>参赛目标链为 chainId {XLAYER.chainId}；factory 和 Processor 部署事实必须由 X Layer RPC 或官方活动输入确认。</span></li><li><strong>latest window</strong><span>事件列表是公开 feed 最近窗口，不宣称完整历史；客户端抓取 {dateText(data.tapeout?.generatedAt)}。</span></li></ul></section></div></div>
}

export function TapeoutAlphaPage() {
  const data = useTapeoutData()
  const [tab, setTab] = useState<'processor' | 'projects' | 'proof' | 'deploy'>('processor')
  const processorRows = data.tapeout?.processors
  const assets = data.ecosystem?.assets ?? []
  const scores = useMemo(() => (processorRows ?? []).map((processor) => ({ processor, score: Math.round((processor.multiplier ?? 0) * 18 + (processor.address ? 25 : 0) + (processor.fromBlock ? 20 : 0)) })), [processorRows])
  const tabs = [{ id: 'processor', label: 'Processor Alpha' }, { id: 'projects', label: 'TapeOut 项目' }, { id: 'proof', label: 'Proof-of-Design' }, { id: 'deploy', label: 'X Layer 适配' }] as const
  return <div className="app-shell tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · ALPHA DESK" title="TapeOut Alpha 研究台" copy="Alpha 的对象从普通代币换成 TapeOut 生态事实：Processor 乘数、Circuit 活跃度、题库覆盖、IGNIX 资产和 X Layer 部署状态。" data={data} onRefresh={data.refresh} /><nav className="radar-tabs">{tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? 'radar-tab active' : 'radar-tab'} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav><section className="alpha-summary"><div><span>ALPHA INPUTS</span><strong>4</strong><small>Processor · Circuit · Proof · X Layer</small></div><div><span>DATA FRESHNESS</span><strong>{data.tapeout?.generatedAt ? 'LIVE' : 'WAIT'}</strong><small>{dateText(data.tapeout?.generatedAt)}</small></div><div><span>ASSET GUARD</span><strong>STRICT</strong><small>只接受 tokenType=tapeout</small></div><div><span>TRADE ACTIONS</span><strong>OFF</strong><small>研究和发现，不自动下单</small></div></section><section className="panel">{tab === 'processor' ? <><div className="panel-heading"><div><span className="eyebrow">01 · PROCESSOR CANDIDATES</span><h2>Processor 候选排序</h2><p>分数只用于研究排序，证据来自官方配置，不代表投资建议。</p></div><span className="source-tag">multiplier · address · fromBlock</span></div><div className="candidate-list">{scores.length ? scores.sort((a, b) => b.score - a.score).map(({ processor, score }) => <article className="candidate-card" key={processor.name}><div><span className="eyebrow">{processor.name}</span><h3>{processor.multiplier === null ? '能力待确认' : `${processor.multiplier}× processor`}</h3><p>fromBlock {processor.fromBlock?.toLocaleString() ?? '—'} · {short(processor.address)}</p></div><strong>{score}<small>alpha score</small></strong></article>) : <div className="notice empty"><strong>暂无 Processor 候选</strong><span>等待 TapeOut 官方 registry feed。</span></div>}</div></> : null}{tab === 'projects' ? <><div className="panel-heading"><div><span className="eyebrow">02 · PROJECT LAUNCHES</span><h2>IGNIX TapeOut 项目</h2><p>来源必须明确标注 TapeOut；Unknown launch 单独处理。</p></div><span className="source-tag">{IGNIX_API}</span></div>{assets.length ? <AssetTable assets={assets} /> : <div className="notice empty"><strong>没有可验证 TapeOut 项目</strong><span>不使用名称、地址后缀或 creator 猜测类型。</span></div>}</> : null}{tab === 'proof' ? <><div className="panel-heading"><div><span className="eyebrow">03 · PROOF OF DESIGN</span><h2>题库与流片活跃度</h2></div><span className="source-tag">{TAPEOUT.website}/pod/*.json</span></div><div className="radar-detail-grid"><div className="detail-stat"><span>已上链题目</span><strong>{data.tapeout?.taskBank.onchain ?? '—'}</strong><small>taskbank meta</small></div><div className="detail-stat"><span>题库总量</span><strong>{data.tapeout?.taskBank.total ?? '—'}</strong><small>taskbank meta</small></div><div className="detail-stat"><span>最近 Circuit</span><strong>{data.tapeout?.latestEvents[0]?.circuitId ? `#${data.tapeout.latestEvents[0].circuitId}` : '—'}</strong><small>latest feed window</small></div><div className="detail-stat"><span>挖矿容量</span><strong>{data.tapeout?.miners.slots?.toLocaleString() ?? '—'}</strong><small>公开统计</small></div></div><EventList events={data.tapeout?.latestEvents ?? []} /></> : null}{tab === 'deploy' ? <><div className="panel-heading"><div><span className="eyebrow">04 · X LAYER ADAPTER</span><h2>参赛部署适配</h2><p>把 TapeOut 生态雷达与 X Layer 目标链分开记录，避免把 BSC 协议 feed 误写成 X Layer 资产。</p></div><span className="source-tag">chainId {XLAYER.chainId}</span></div><ul className="requirements"><li className="requirement"><span className="requirement-mark">1</span><span><strong>Processor factory</strong><small>在 X Layer 记录真实部署地址；未配置时显示 unknown。</small></span></li><li className="requirement"><span className="requirement-mark">2</span><span><strong>Circuit tapeout</strong><small>记录 transaction hash、circuit id 和可验证事件。</small></span></li><li className="requirement"><span className="requirement-mark">3</span><span><strong>资产关联</strong><small>IGNIX 资产必须带 tokenType=tapeout provenance。</small></span></li></ul><div className="network-check"><span className={data.network?.ok ? 'check-icon green' : 'check-icon'}>{data.network?.ok ? '✓' : '!'}</span><div><strong>{data.network?.ok ? 'X Layer RPC 已验证' : '等待 X Layer RPC'}</strong><small>chainId {data.network?.chainId ?? XLAYER.chainId} · {data.network?.rpc ?? XLAYER.rpc}</small></div></div></> : null}</section></div></div>
}

export function TapeoutMarketPage() {
  const data = useTapeoutData()
  const assets = data.ecosystem?.assets ?? []
  return <div className="app-shell tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · MARKET" title="TapeOut 协议与资产行情" copy="行情页只聚合已验证的 TapeOut 资产和协议指标。价格、市值和流动性来自 IGNIX；Processor、矿工和题库来自 TapeOut feed；X Layer 只作为参赛目标链状态。" data={data} onRefresh={data.refresh} /><div className="signal-grid compact"><Signal label="ASSET COUNT" value={String(assets.length)} hint="tokenType=tapeout" /><Signal label="MARKET CAP" value={assets.length ? money(assets.reduce((sum, asset) => sum + (asset.marketCapUsd ?? 0), 0)) : '—'} hint="IGNIX snapshot" /><Signal label="LIQUIDITY" value={assets.length ? money(assets.reduce((sum, asset) => sum + (asset.liquidityUsd ?? 0), 0)) : '—'} hint="已验证资产" /><Signal label="PROTOCOL RATE" value={data.tapeout?.stats.currentRate ?? '—'} hint="TapeOut feed" /></div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">01 · VERIFIED ASSETS</span><h2>IGNIX TapeOut 资产</h2><p>未知 launch、Agent 和缺少 tokenType 的记录不会进入这张表。</p></div><span className="source-tag">{IGNIX_API}</span></div>{assets.length ? <AssetTable assets={assets} /> : <div className="notice empty"><strong>当前没有可验证资产</strong><span>公开接口没有返回 tokenType=tapeout 的资产，页面保留空态以避免误导。</span></div>}</section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">02 · PROTOCOL METRICS</span><h2>TapeOut 协议指标</h2></div><span className="source-tag">{TAPEOUT.website}/pod/pod-stats.json</span></div><div className="radar-detail-grid"><div className="detail-stat"><span>miner slots</span><strong>{data.tapeout?.miners.slots?.toLocaleString() ?? '—'}</strong><small>公开容量</small></div><div className="detail-stat"><span>参与地址</span><strong>{data.tapeout?.miners.addresses?.toLocaleString() ?? '—'}</strong><small>owner keys</small></div><div className="detail-stat"><span>total mined</span><strong>{data.tapeout?.stats.totalMined ?? '—'}</strong><small>累计读数</small></div><div className="detail-stat"><span>task count</span><strong>{data.tapeout?.stats.taskCount?.toLocaleString() ?? '—'}</strong><small>统计 feed</small></div></div></section></div></div>
}

export function TapeoutAnomalyPage() {
  const data = useTapeoutData()
  const events = data.tapeout?.latestEvents ?? []
  const anomalyCount = events.length
  return <div className="app-shell tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · ANOMALY" title="TapeOut 生态异动" copy="异动模块关注 Circuit 流片窗口、Processor 活跃度、矿工容量和题库状态变化。这里展示来源事实，不把普通交易市场波动包装成 TapeOut 异动。" data={data} onRefresh={data.refresh} /><div className="signal-grid compact"><Signal label="EVENTS" value={String(anomalyCount)} hint="latest feed window" /><Signal label="PROCESSOR STATE" value={data.tapeout?.processors.length ? 'REGISTRY LIVE' : 'WAIT'} hint="官方配置" /><Signal label="TASK BANK" value={`${data.tapeout?.taskBank.onchain ?? '—'} / ${data.tapeout?.taskBank.total ?? '—'}`} hint="onchain / total" /><Signal label="SOURCE AGE" value={data.tapeout?.generatedAt ? dateText(data.tapeout.generatedAt) : '未读取'} hint="client visible timestamp" /></div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">01 · ANOMALY STREAM</span><h2>最新生态事件</h2><p>事件是 feed 最近窗口；没有历史索引时不会推断趋势。</p></div><span className="source-tag">TapeOut events</span></div><EventList events={events} /></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">02 · RULES</span><h2>异动判定口径</h2></div></div><ul className="provenance-list"><li><strong>circuit_burst</strong><span>在同一公开窗口出现多个可验证 Circuit 事件，标记为流片活跃度变化。</span></li><li><strong>miner_capacity</strong><span>minerCount、owner 数量或验证矿工读数发生变化时，标记为参与容量变化。</span></li><li><strong>source_stale</strong><span>RPC、TapeOut feed 或 IGNIX API 失败时只显示降级状态，不生成伪造事件。</span></li></ul></section></div></div>
}

export function TapeoutDataPage() {
  const data = useTapeoutData()
  const rows = [
    { name: 'X Layer RPC', status: data.network?.ok ? 'live' : 'degraded', detail: data.network?.rpc ?? XLAYER.rpc, observed: data.network?.checkedAt },
    { name: 'TapeOut protocol feed', status: data.tapeout?.sourceStatus ?? 'waiting', detail: `${TAPEOUT.dataBase}${TAPEOUT.endpoints.config}`, observed: data.tapeout?.generatedAt },
    { name: 'IGNIX indexer', status: data.ecosystem?.sourceStatus ?? 'waiting', detail: IGNIX_API, observed: data.ecosystem?.fetchedAt },
  ]
  return <div className="app-shell tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · DATA HEALTH" title="数据源健康与快照" copy="这一页替代旧控制面的数据同步页，展示浏览器当前能读取的公开源状态。持久化缓存、定时抓取和历史索引应部署在 Worker、KV/D1 或 GitHub Actions，不要求本机跑节点。" data={data} onRefresh={data.refresh} /><section className="panel"><div className="panel-heading"><div><span className="eyebrow">01 · SOURCE HEALTH</span><h2>公开数据源</h2></div><span className="source-tag">read-only</span></div><div className="health-list">{rows.map((row) => <div className="health-row" key={row.name}><span className={row.status === 'live' ? 'health-dot live' : 'health-dot'} /><div><strong>{row.name}</strong><small>{row.detail}</small></div><span className="mono">{row.status} · {dateText(row.observed)}</span></div>)}</div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">02 · DEPLOYMENT BOUNDARY</span><h2>后端能力放在哪里</h2></div></div><ul className="provenance-list"><li><strong>静态前端</strong><span>页面可直接部署到 Pages，调用公共 RPC、TapeOut feed 和 IGNIX API。</span></li><li><strong>轻量边缘后端</strong><span>Worker / Pages Function 负责 CORS、allow-list、短 TTL 缓存和可选 KV/D1 快照。</span></li><li><strong>X Layer 链上</strong><span>Processor、Circuit 与确定性评分可以上链；HTTP、爬虫、数据库和定时任务不能部署到 TapeOut。</span></li></ul></section></div></div>
}

export function TapeoutAccountPage() {
  const [wallet, setWallet] = useState(() => typeof window === 'undefined' ? '' : window.localStorage.getItem('likely2x-wallet') ?? '')
  const [saved, setSaved] = useState(false)
  const save = () => { window.localStorage.setItem('likely2x-wallet', wallet.trim()); setSaved(true) }
  return <div className="app-shell tapeout-embedded"><div className="tapeout-main"><div className="tapeout-heading"><div><span className="eyebrow">LIKELY2X · ACCOUNT</span><h1>账户与参赛配置</h1><p>Likely2X 是公开只读生态雷达。钱包地址、Processor 地址和参赛资料先保存在本机，连接钱包或签名动作由用户主动完成。</p></div></div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">01 · LOCAL PROFILE</span><h2>本机参赛身份</h2><p>不会向 Likely2X 上传私钥，也不会自动发起交易。</p></div><span className="source-tag">localStorage only</span></div><div className="form-grid"><label className="wide"><span>部署钱包地址</span><input value={wallet} onChange={(event) => { setWallet(event.target.value); setSaved(false) }} placeholder="0x…" /></label></div><div className="form-footer"><span>{saved ? '已保存到当前浏览器' : '尚未保存'}</span><button className="button primary small" type="button" onClick={save}>保存配置</button></div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">02 · CONNECTIONS</span><h2>外部连接边界</h2></div></div><ul className="provenance-list"><li><strong>X Layer RPC</strong><span>{XLAYER.rpc} · chainId {XLAYER.chainId}</span></li><li><strong>TapeOut feed</strong><span>{TAPEOUT.website} · 公开协议数据源，当前 feed 自报 chainId 56。</span></li><li><strong>钱包签名</strong><span>本版本不托管私钥，不自动签名、不自动部署、不自动提交黑客松表单。</span></li></ul></section></div></div>
}

export function TapeoutNotificationsPage() {
  const data = useTapeoutData()
  const events = data.tapeout?.latestEvents ?? []
  return <div className="app-shell tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · NOTIFICATIONS" title="生态通知" copy="通知来自公开 TapeOut feed 的最近事件和数据源状态。当前版本只读，不向外部服务发送通知。" data={data} onRefresh={data.refresh} /><section className="panel"><div className="panel-heading"><div><span className="eyebrow">01 · EVENT NOTICES</span><h2>最近可验证事件</h2></div><span className="source-tag">read-only</span></div>{events.length ? <div className="candidate-list">{events.map((event) => <article className="candidate-card" key={`${event.block}-${event.circuitId}-${event.author}`}><div><span className="eyebrow">{event.cpu}</span><h3>Circuit #{event.circuitId} tapeout</h3><p>block {event.block.toLocaleString()} · author {short(event.author)}</p></div><strong>NEW<small>feed event</small></strong></article>)}</div> : <div className="notice empty"><strong>暂无通知</strong><span>当前公开窗口没有返回事件，页面不会补造通知。</span></div>}</section></div></div>
}
