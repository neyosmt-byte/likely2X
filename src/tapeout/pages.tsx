import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { buildEvents, fetchEcosystemEvents, normalizeEntities, scoreAlpha, type EcosystemEntity, type EcosystemEvent } from "../api/ecosystem.ts"
import { fetchEcosystem, fetchNetwork, IGNIX_API, XLAYER, type EcosystemSnapshot, type NetworkSnapshot, type TapeoutAsset } from "../api/ignix.ts"
import { fetchTapeout, TAPEOUT, type TapeoutEvent, type TapeoutSnapshot } from "../api/tapeout.ts"
import "../styles.css"

type TapeoutData = { ecosystem: EcosystemSnapshot | null; network: NetworkSnapshot | null; tapeout: TapeoutSnapshot | null; workerEvents: EcosystemEvent[] | null; loading: boolean; refresh: () => void }

function useTapeoutData(): TapeoutData {
  const [ecosystem, setEcosystem] = useState<EcosystemSnapshot | null>(null)
  const [network, setNetwork] = useState<NetworkSnapshot | null>(null)
  const [tapeout, setTapeout] = useState<TapeoutSnapshot | null>(null)
  const [workerEvents, setWorkerEvents] = useState<EcosystemEvent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const activeRequest = useRef<AbortController | null>(null)
  const execute = useCallback((controller: AbortController) => {
    void Promise.all([fetchEcosystem(controller.signal), fetchNetwork(controller.signal), fetchTapeout(controller.signal), fetchEcosystemEvents(controller.signal)])
      .then(([nextEcosystem, nextNetwork, nextTapeout, nextEvents]) => {
        if (controller.signal.aborted) return
        setEcosystem(nextEcosystem)
        setNetwork(nextNetwork)
        setTapeout(nextTapeout)
        setWorkerEvents(nextEvents)
      })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    activeRequest.current = controller
    execute(controller)
    return () => controller.abort()
  }, [execute])
  const refresh = useCallback(() => {
    activeRequest.current?.abort()
    setLoading(true)
    const controller = new AbortController()
    activeRequest.current = controller
    execute(controller)
  }, [execute])
  return { ecosystem, network, tapeout, workerEvents, loading, refresh }
}

type NotificationRule = "processor" | "circuit" | "participant" | "taskbank" | "asset" | "source"
type LocalNotification = { id: string; title: string; body: string; source: string; href: string; createdAt: string; read: boolean; ignored: boolean; rule: NotificationRule }
type WorkspaceState = { watchlist: string[]; tags: Record<string, string>; rules: Record<NotificationRule, boolean>; density: "comfortable" | "compact"; sourcePreference: "all" | "tapeout" | "ignix" | "xlayer"; notifications: LocalNotification[] }
const workspaceKey = "likely2x:workspace:v2"
const defaultRules: Record<NotificationRule, boolean> = { processor: true, circuit: true, participant: true, taskbank: true, asset: true, source: true }

function readWorkspace(): WorkspaceState {
  const empty = { watchlist: [], tags: {}, rules: defaultRules, density: "comfortable" as const, sourcePreference: "all" as const, notifications: [] }
  if (typeof window === "undefined") return empty
  try {
    const parsed = JSON.parse(window.localStorage.getItem(workspaceKey) || "{}") as Partial<WorkspaceState>
    return { watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [], tags: parsed.tags || {}, rules: { ...defaultRules, ...(parsed.rules || {}) }, density: parsed.density === "compact" ? "compact" : "comfortable", sourcePreference: parsed.sourcePreference === "tapeout" || parsed.sourcePreference === "ignix" || parsed.sourcePreference === "xlayer" ? parsed.sourcePreference : "all", notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [] }
  } catch { return empty }
}
function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(readWorkspace)
  useEffect(() => { window.localStorage.setItem(workspaceKey, JSON.stringify(state)); window.dispatchEvent(new CustomEvent("likely2x:workspace", { detail: state })) }, [state])
  const toggleWatch = (id: string) => setState((current) => ({ ...current, watchlist: current.watchlist.includes(id) ? current.watchlist.filter((item) => item !== id) : [...current.watchlist, id] }))
  const setTag = (id: string, value: string) => setState((current) => ({ ...current, tags: { ...current.tags, [id]: value } }))
  const markNotification = (id: string, mode: "read" | "ignore") => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, [mode === "read" ? "read" : "ignored"]: true } : item) }))
  const updateRule = (rule: NotificationRule, enabled: boolean) => setState((current) => ({ ...current, rules: { ...current.rules, [rule]: enabled } }))
  return { state, setState, toggleWatch, setTag, markNotification, updateRule }
}
type Workspace = ReturnType<typeof useWorkspace>

function short(value: string | null | undefined) { return value ? (value.length > 14 ? value.slice(0, 6) + "…" + value.slice(-5) : value) : "—" }
function dateText(value: string | null | undefined) { if (!value) return "未读取"; const time = Date.parse(value); return Number.isFinite(time) ? new Date(time).toLocaleString("zh-CN", { hour12: false }) : value }
function money(value: number | string | null | undefined) { if (value === null || value === undefined || value === "") return "—"; const number = Number(value); return Number.isFinite(number) ? "$" + number.toLocaleString("en-US", { maximumFractionDigits: 0 }) : String(value) }
function statusLabel(value: string | null | undefined) { return value === "live" ? "实时" : value === "cached" ? "缓存" : value === "stale" ? "过期" : value === "degraded" ? "降级" : value || "未知" }
function Signal({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="signal-card"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div> }
function SourceState({ data }: { data: TapeoutData }) {
  const errors = [...(data.ecosystem?.errors || []), ...(data.tapeout?.errors || [])]
  return <div className="source-state"><span className={data.network?.ok ? "pill green" : "pill amber"}>{data.network?.ok ? "X Layer 在线" : "X Layer 待校验"}</span><span className={data.tapeout?.sourceStatus === "live" ? "pill green" : "pill amber"}>TapeOut {statusLabel(data.tapeout?.sourceStatus)}</span><span className={data.ecosystem?.sourceStatus === "live" ? "pill green" : "pill amber"}>IGNIX {statusLabel(data.ecosystem?.sourceStatus)}</span>{errors.length ? <small>{errors.slice(0, 2).join(" · ")}</small> : null}</div>
}
function PageHeader({ eyebrow, title, copy, data, onRefresh }: { eyebrow: string; title: string; copy: string; data: TapeoutData; onRefresh?: () => void }) {
  return <div className="tapeout-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div><div className="heading-actions"><SourceState data={data} />{onRefresh ? <button className="button ghost small" type="button" onClick={onRefresh} disabled={data.loading}>{data.loading ? "同步中…" : "刷新数据"}</button> : null}</div></div>
}
function PanelHeading({ eyebrow, title, copy, source }: { eyebrow: string; title: string; copy?: string; source?: string }) {
  return <div className="panel-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy ? <p>{copy}</p> : null}</div>{source ? <span className="source-tag">{source}</span> : null}</div>
}
function EmptyState({ title, body }: { title: string; body: string }) { return <div className="notice empty"><strong>{title}</strong><span>{body}</span></div> }
function WatchButton({ id, workspace }: { id: string; workspace: Workspace }) { const active = workspace.state.watchlist.includes(id); return <button className="watch-button" type="button" aria-pressed={active} onClick={() => workspace.toggleWatch(id)}>{active ? "已关注" : "关注"}</button> }
function EntityStatus({ state }: { state: string }) { return <span className={state === "live" ? "pill green" : state === "degraded" || state === "stale" ? "pill amber" : "pill"}>{statusLabel(state)}</span> }
function Filters({ query, setQuery, kind, setKind, state, setState, source, setSource, chain, setChain, time, setTime }: { query: string; setQuery: (value: string) => void; kind: string; setKind: (value: string) => void; state: string; setState: (value: string) => void; source: string; setSource: (value: string) => void; chain: string; setChain: (value: string) => void; time: string; setTime: (value: string) => void }) {
  return <div className="filter-bar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、地址、Task、Circuit…" aria-label="搜索实体" /><select value={source} onChange={(event) => setSource(event.target.value)} aria-label="数据来源"><option value="all">全部来源</option><option value="tapeout">TapeOut</option><option value="ignix">IGNIX</option><option value="xlayer">X Layer</option></select><select value={chain} onChange={(event) => setChain(event.target.value)} aria-label="链筛选"><option value="all">全部链</option><option value="56">chainId 56</option><option value="196">chainId 196</option><option value="unknown">链未知</option></select><select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="实体类型"><option value="all">全部类型</option><option value="processor">Processor</option><option value="circuit">Circuit</option><option value="task">Task</option><option value="participant">参与地址</option><option value="asset">项目资产</option><option value="event">事件</option></select><select value={state} onChange={(event) => setState(event.target.value)} aria-label="数据状态"><option value="all">全部状态</option><option value="live">实时</option><option value="stale">过期</option><option value="degraded">降级</option></select><select value={time} onChange={(event) => setTime(event.target.value)} aria-label="时间范围"><option value="all">全部时间</option><option value="24h">最近 24 小时</option><option value="7d">最近 7 天</option><option value="30d">最近 30 天</option></select></div>
}
function filterEntities(entities: EcosystemEntity[], query: string, kind: string, state: string, source = "all", chain = "all", time = "all") {
  const needle = query.trim().toLowerCase()
  const windowMs = time === "24h" ? 24 * 60 * 60 * 1000 : time === "7d" ? 7 * 24 * 60 * 60 * 1000 : time === "30d" ? 30 * 24 * 60 * 60 * 1000 : null
  return entities.filter((entity) => (kind === "all" || entity.kind === kind) && (state === "all" || entity.dataState === state) && (source === "all" || entity.source.toLowerCase().includes(source)) && (chain === "all" || (chain === "unknown" ? entity.chainId === null : entity.chainId === Number(chain))) && (!windowMs || !entity.observedAt || Date.now() - Date.parse(entity.observedAt) <= windowMs) && (!needle || [entity.id, entity.name, entity.address, entity.status, ...Object.values(entity.metrics).map(String)].join(" ").toLowerCase().includes(needle)))
}
function DetailPanel({ entity, onClose, workspace }: { entity: EcosystemEntity | null; onClose: () => void; workspace: Workspace }) {
  if (!entity) return null
  return <aside className="detail-panel"><div className="detail-panel-heading"><div><span className="eyebrow">{entity.kind.toUpperCase()}</span><h3>{entity.name}</h3></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭详情">×</button></div><div className="detail-status"><EntityStatus state={entity.dataState} /><span className="mono">{entity.chainId ? "chainId " + entity.chainId : "协议源"}</span></div><dl className="detail-list"><dt>地址</dt><dd className="mono">{entity.address || "—"}</dd><dt>状态</dt><dd>{entity.status || "—"}</dd><dt>数据源</dt><dd>{entity.source}</dd><dt>观察时间</dt><dd>{dateText(entity.observedAt)}</dd><dt>证据</dt><dd>{entity.provenance.join(" · ")}</dd></dl><div className="detail-metrics">{Object.entries(entity.metrics).map(([key, value]) => <span key={key}><small>{key}</small><strong>{value === null ? "—" : String(value)}</strong></span>)}</div><label className="detail-tag"><span>本地标签</span><input value={workspace.state.tags[entity.id] || ""} onChange={(event) => workspace.setTag(entity.id, event.target.value)} placeholder="例如：重点观察" /></label><WatchButton id={entity.id} workspace={workspace} /></aside>
}
function EntityTable({ entities, workspace, onSelect }: { entities: EcosystemEntity[]; workspace: Workspace; onSelect: (entity: EcosystemEntity) => void }) {
  if (!entities.length) return <EmptyState title="当前筛选没有实体" body="调整搜索或筛选条件；公开源无数据时会保留明确空态。" />
  return <div className="table-scroll"><table><thead><tr><th>实体</th><th>类型</th><th>状态</th><th>链</th><th>指标</th><th>观察时间</th><th /></tr></thead><tbody>{entities.map((entity) => <tr key={entity.id}><td><button className="table-link" type="button" onClick={() => onSelect(entity)}><strong>{entity.name}</strong><small>{short(entity.address)}{workspace.state.tags[entity.id] ? " · " + workspace.state.tags[entity.id] : ""}</small></button></td><td><span className="pill">{entity.kind}</span></td><td><EntityStatus state={entity.dataState} /></td><td className="mono">{entity.chainId ? "chainId " + entity.chainId : "—"}</td><td className="mono">{Object.entries(entity.metrics).slice(0, 2).map(([key, value]) => key + ": " + (value === null ? "—" : String(value))).join(" · ") || "—"}</td><td className="mono">{dateText(entity.observedAt)}</td><td><WatchButton id={entity.id} workspace={workspace} /></td></tr>)}</tbody></table></div>
}
function EntityCards({ entities, workspace, onSelect }: { entities: EcosystemEntity[]; workspace: Workspace; onSelect: (entity: EcosystemEntity) => void }) {
  if (!entities.length) return <EmptyState title="当前筛选没有实体" body="调整搜索或筛选条件；公开源无数据时会保留明确空态。" />
  return <div className="entity-card-grid">{entities.map((entity) => <article className="entity-card" key={entity.id}><div className="entity-card-top"><span className="pill">{entity.kind}</span><EntityStatus state={entity.dataState} /></div><button className="card-title" type="button" onClick={() => onSelect(entity)}>{entity.name}</button><span className="mono">{short(entity.address)} · {entity.chainId ? "chainId " + entity.chainId : "协议源"}</span><p>{Object.entries(entity.metrics).slice(0, 3).map(([key, value]) => key + ": " + (value === null ? "—" : String(value))).join(" · ")}</p><div className="entity-card-actions"><WatchButton id={entity.id} workspace={workspace} /><span className="mono">{dateText(entity.observedAt)}</span></div></article>)}</div>
}


function EventList({ events, workspace, onSelect }: { events: TapeoutEvent[]; workspace?: Workspace; onSelect?: (event: EcosystemEntity) => void }) {
  if (!events.length) return <EmptyState title="暂无可展示的生态事件" body="公开 feed 当前没有返回可验证事件，页面不会补造历史。" />
  return <div className="event-list">{events.map((event) => { const entity: EcosystemEntity = { id: "event:" + event.block + ":" + event.circuitId, kind: "event", chainId: 56, address: event.author, name: "Circuit #" + event.circuitId, status: "observed", metrics: { cpu: event.cpu, gates: event.gates, block: event.block }, source: TAPEOUT.website + TAPEOUT.endpoints.stats, observedAt: null, dataState: "live", provenance: ["pod-stats.events"] }; return <div className="event-row" key={entity.id}><span className="event-badge">{event.cpu}</span><button className="event-title" type="button" onClick={() => onSelect?.(entity)}><strong>Circuit #{event.circuitId}</strong><small>{short(event.author)} · {event.gates || "—"} gates</small></button><span className="mono">block {event.block.toLocaleString()}</span>{workspace ? <WatchButton id={entity.id} workspace={workspace} /> : null}</div> })}</div>
}

export function TapeoutDiscoveryPage() {
  const data = useTapeoutData()
  const workspace = useWorkspace()
  const entities = useMemo(() => normalizeEntities(data.tapeout, data.ecosystem), [data.tapeout, data.ecosystem])
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState("all")
  const [state, setState] = useState("all")
  const [source, setSource] = useState(workspace.state.sourcePreference)
  const [chain, setChain] = useState("all")
  const [time, setTime] = useState("all")
  const [view, setView] = useState<"featured" | "all" | "events" | "quiet">("featured")
  const [layout, setLayout] = useState<"table" | "cards">("table")
  const [selected, setSelected] = useState<EcosystemEntity | null>(null)
  const filtered = useMemo(() => filterEntities(entities, query, kind, state, source, chain, time), [entities, query, kind, state, source, chain, time])
  const shown = view === "featured" ? filtered.filter((entity) => entity.kind === "processor" || entity.kind === "asset" || entity.kind === "event").slice(0, 24) : view === "events" ? filtered.filter((entity) => entity.kind === "event") : view === "quiet" ? filtered.filter((entity) => entity.kind === "participant" && Number(entity.metrics.circuits || 0) < 2) : filtered
  return <div className="tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · DISCOVERY" title="发现总览" copy="把 TapeOut Processor、Circuit、Task、参与地址、协议事件和 IGNIX TapeOut 项目组织成一个可检索的生态工作台。每条记录都带有链、来源、快照时间和数据状态。" data={data} onRefresh={data.refresh} /><div className="signal-grid"><Signal label="PROCESSORS" value={String(data.tapeout?.processors.length || 0)} hint="TapeOut registry" /><Signal label="CIRCUITS" value={String(data.tapeout?.circuits.length || 0)} hint="公开配置与事件" /><Signal label="PARTICIPANTS" value={String(data.tapeout?.miners.addresses || 0)} hint="owner keys" /><Signal label="PROOF TASKS" value={String(data.tapeout?.taskBank.onchain || "—") + " / " + String(data.tapeout?.taskBank.total || "—")} hint="上链 / 总量" /><Signal label="PROJECT ASSETS" value={String(data.ecosystem?.assets.length || 0)} hint="IGNIX tokenType=tapeout" /></div><section className="panel"><PanelHeading eyebrow="01 · OPPORTUNITY WORKSPACE" title="生态入口" copy="重点候选、全部项目、最近事件和低活跃度参与者共享同一套筛选与详情体验。" source="TapeOut · IGNIX · X Layer" /><div className="workspace-tabs">{[["featured", "重点候选"], ["all", "全部项目"], ["events", "最近事件"], ["quiet", "低活跃度"]].map(([id, label]) => <button key={id} type="button" className={view === id ? "workspace-tab active" : "workspace-tab"} onClick={() => setView(id as typeof view)}>{label}</button>)}</div><Filters query={query} setQuery={setQuery} kind={kind} setKind={setKind} state={state} setState={setState} source={source} setSource={(value) => { setSource(value as typeof source); workspace.setState((current) => ({ ...current, sourcePreference: value as WorkspaceState["sourcePreference"] })) }} chain={chain} setChain={setChain} time={time} setTime={setTime} /><div className="toolbar-row"><span className="mono">{shown.length} 条记录 · 快照 {dateText(data.tapeout?.generatedAt || data.ecosystem?.fetchedAt)}</span><div><button className={layout === "table" ? "view-button active" : "view-button"} type="button" onClick={() => setLayout("table")}>表格</button><button className={layout === "cards" ? "view-button active" : "view-button"} type="button" onClick={() => setLayout("cards")}>卡片</button></div></div>{layout === "table" ? <EntityTable entities={shown} workspace={workspace} onSelect={setSelected} /> : <EntityCards entities={shown} workspace={workspace} onSelect={setSelected} />}</section><section className="panel"><PanelHeading eyebrow="02 · RECENT WINDOW" title="最近 Circuit 事件" copy="事件窗口来自官方 stats feed，无法证明完整历史时保持窗口边界。" source={TAPEOUT.website + TAPEOUT.endpoints.stats} /><EventList events={data.tapeout?.latestEvents || []} workspace={workspace} onSelect={setSelected} /></section>{selected ? <DetailPanel entity={selected} onClose={() => setSelected(null)} workspace={workspace} /> : null}</div></div>
}

export function TapeoutRadarPage() {
  const data = useTapeoutData()
  const workspace = useWorkspace()
  const [view, setView] = useState<"processors" | "circuits" | "participants" | "tasks">("processors")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<EcosystemEntity | null>(null)
  const entities = useMemo(() => normalizeEntities(data.tapeout, null), [data.tapeout])
  const viewKind = view === "processors" ? "processor" : view === "circuits" ? "circuit" : view === "participants" ? "participant" : "task"
  const rows = filterEntities(entities.filter((entity) => entity.kind === viewKind), query, viewKind, "all")
  const labels = { processors: "Processor", circuits: "Circuit", participants: "参与地址", tasks: "Task / Proof-of-Design" }
  return <div className="tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · ECO RADAR" title="生态雷达" copy="按 Processor 能力、Circuit 流片、参与地址和 Proof-of-Design 题库浏览 TapeOut 生态。选中任意实体即可查看详情、证据和本地标签。" data={data} onRefresh={data.refresh} /><div className="radar-tabs">{Object.entries(labels).map(([id, label]) => <button key={id} type="button" className={view === id ? "radar-tab active" : "radar-tab"} onClick={() => setView(id as typeof view)}>{label}</button>)}</div><div className="signal-grid compact"><Signal label="PROCESSORS" value={String(data.tapeout?.processors.length || 0)} hint="能力与 multiplier" /><Signal label="CIRCUITS" value={String(data.tapeout?.circuits.length || 0)} hint="配置关联" /><Signal label="PARTICIPANTS" value={String(data.tapeout?.miners.addresses || 0)} hint="参与地址" /><Signal label="TASK COVERAGE" value={String(data.tapeout?.taskBank.onchain || "—") + " / " + String(data.tapeout?.taskBank.total || "—")} hint="onchain / total" /></div><section className="panel"><PanelHeading eyebrow={"RADAR · " + labels[view].toUpperCase()} title={labels[view] + " 工作台"} copy="来源、链、快照和状态都保留在同一张详情视图。" source={data.tapeout?.source} /><div className="filter-bar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={"搜索 " + labels[view] + "…"} aria-label="搜索雷达实体" /></div><EntityTable entities={rows} workspace={workspace} onSelect={setSelected} /></section><section className="panel"><PanelHeading eyebrow="RADAR NOTES" title="数据边界" /><ul className="provenance-list"><li><strong>TapeOut feed</strong><span>当前公开协议 feed 自报 chainId {data.tapeout?.chain.chainId || 56}，用于生态观察和历史事实。</span></li><li><strong>X Layer</strong><span>chainId {XLAYER.chainId} 只在有 RPC 或合约事件证据时显示为关联网络，未配置的 Processor 地址保持 unknown。</span></li><li><strong>本地工作区</strong><span>Watchlist 和地址标签只保存于当前浏览器，不上传地址、不托管凭证。</span></li></ul></section>{selected ? <DetailPanel entity={selected} onClose={() => setSelected(null)} workspace={workspace} /> : null}</div></div>
}

function AssetTable({ assets, workspace }: { assets: TapeoutAsset[]; workspace: Workspace }) {
  return <div className="table-scroll"><table><thead><tr><th>项目</th><th>资产事实</th><th>流动性</th><th>状态</th><th>链 / 合约</th><th /></tr></thead><tbody>{assets.map((asset) => { const id = "asset:" + asset.contract; return <tr key={asset.contract}><td><strong>{asset.name}</strong><small>{asset.symbol} · tokenType=tapeout</small></td><td>{money(asset.marketCapUsd)}</td><td>{money(asset.liquidityUsd)}</td><td><span className={asset.graduated ? "pill green" : "pill amber"}>{asset.graduated ? "已毕业" : asset.graduated === false ? "进行中" : "未知"}</span></td><td>{asset.chainId === XLAYER.chainId ? <a className="mono link" href={XLAYER.explorer + "/address/" + asset.contract} target="_blank" rel="noreferrer">196 · {short(asset.contract)} ↗</a> : <span className="mono">{asset.chainId ? "chainId " + asset.chainId : "链未标注"} · {short(asset.contract)}</span>}</td><td><WatchButton id={id} workspace={workspace} /></td></tr> })}</tbody></table></div>
}

export function TapeoutMarketPage() {
  const data = useTapeoutData()
  const workspace = useWorkspace()
  const assets = data.ecosystem?.assets || []
  const totalMcap = assets.reduce((sum, asset) => sum + (asset.marketCapUsd || 0), 0)
  const totalLiquidity = assets.reduce((sum, asset) => sum + (asset.liquidityUsd || 0), 0)
  return <div className="tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · PROJECTS & ASSETS" title="项目与资产" copy="项目页把 IGNIX 明确标记为 TapeOut 的资产，与协议速率、miner capacity、total mined、task count 和流片数量放在同一张事实面板里。没有历史快照时明确显示空态。" data={data} onRefresh={data.refresh} /><div className="signal-grid compact"><Signal label="PROJECT ASSETS" value={String(assets.length)} hint="strict tokenType=tapeout" /><Signal label="MARKET CAP" value={assets.length ? money(totalMcap) : "—"} hint="IGNIX snapshot" /><Signal label="LIQUIDITY" value={assets.length ? money(totalLiquidity) : "—"} hint="没有数据不补造" /><Signal label="MINER CAPACITY" value={data.tapeout?.miners.slots?.toLocaleString() || "—"} hint="TapeOut stats" /></div><section className="panel"><PanelHeading eyebrow="01 · VERIFIED PROJECTS" title="TapeOut 生态项目" copy="Unknown、Agent 和缺少 tokenType 的记录不会进入列表；资产地址按合约去重。" source={IGNIX_API} />{assets.length ? <AssetTable assets={assets} workspace={workspace} /> : <EmptyState title="当前快照没有可验证项目资产" body="公开接口没有返回 tokenType=tapeout 的记录，页面保留空态而不猜测。" />}</section><section className="panel"><PanelHeading eyebrow="02 · PROTOCOL FACTS" title="协议指标中心" source={TAPEOUT.website + TAPEOUT.endpoints.stats} /><div className="radar-detail-grid"><div className="detail-stat"><span>协议速率</span><strong>{data.tapeout?.stats.currentRate || "—"}</strong><small>公开 stats 快照</small></div><div className="detail-stat"><span>total mined</span><strong>{data.tapeout?.stats.totalMined || "—"}</strong><small>累计读数</small></div><div className="detail-stat"><span>task count</span><strong>{data.tapeout?.stats.taskCount?.toLocaleString() || "—"}</strong><small>统计任务数</small></div><div className="detail-stat"><span>流片数量</span><strong>{data.tapeout?.latestEvents.length || "—"}</strong><small>最近公开窗口</small></div></div><div className="trend-empty"><strong>历史趋势等待快照索引</strong><span>当前公开 feed 提供最新快照，尚未提供连续历史。接入 Worker + KV/D1 后，趋势图会使用真实观察点。</span></div></section></div></div>
}


export function TapeoutAnomalyPage() {
  const data = useTapeoutData()
  const events = useMemo(() => data.workerEvents ?? buildEvents(data.tapeout, data.ecosystem, data.network), [data.workerEvents, data.tapeout, data.ecosystem, data.network])
  const [selected, setSelected] = useState<EcosystemEvent | null>(null)
  return <div className="tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · ANOMALY" title="生态异动" copy="异动由 Circuit burst、Processor 状态、参与容量、题库变化、项目资产变化和数据源状态构成。每条异动都能展开规则、证据和时间边界。" data={data} onRefresh={data.refresh} /><div className="signal-grid compact"><Signal label="SIGNALS" value={String(events.length)} hint="当前快照推导" /><Signal label="CIRCUIT BURST" value={String(events.filter((event) => event.rule === "circuit_burst").length)} hint="事件窗口" /><Signal label="CAPACITY" value={String(events.filter((event) => event.rule === "participant_change").length)} hint="参与地址与 miner" /><Signal label="SOURCE STATE" value={String(events.filter((event) => event.rule === "source_stale").length)} hint="降级 / 过期" /></div><section className="panel"><PanelHeading eyebrow="01 · SIGNAL SCANNER" title="异动扫描器" copy="没有历史索引时只输出当前快照可证明的信号，不推测过去的变化。" source="rule engine · read-only" /><div className="anomaly-list">{events.length ? events.map((event) => <button className="anomaly-row" type="button" key={event.id} onClick={() => setSelected(event)}><span className={"severity " + event.severity}>{event.severity}</span><span><strong>{event.name}</strong><small>{event.rule} · {event.evidence[0] || "无额外证据"}</small></span><EntityStatus state={event.dataState} /></button>) : <EmptyState title="暂无异动信号" body="等待下一次公开源快照。" />}</div></section><section className="panel"><PanelHeading eyebrow="02 · METHOD" title="规则与证据" /><ul className="provenance-list"><li><strong>Circuit burst</strong><span>在同一公开窗口出现多个 Circuit 事件，记录窗口长度、区块和来源。</span></li><li><strong>参与容量变化</strong><span>使用 minerCount、参与地址数量和验证矿工读数，不将单个地址猜测成趋势。</span></li><li><strong>数据源状态</strong><span>RPC、TapeOut 或 IGNIX 不可用时标记降级，提醒用户数据边界。</span></li></ul></section>{selected ? <aside className="detail-panel"><div className="detail-panel-heading"><div><span className="eyebrow">{selected.rule}</span><h3>{selected.name}</h3></div><button className="icon-button" type="button" onClick={() => setSelected(null)} aria-label="关闭详情">×</button></div><div className="detail-status"><EntityStatus state={selected.dataState} /><span>{dateText(selected.observedAt)}</span></div><h4>触发规则证据</h4><ul className="evidence-list">{selected.evidence.map((item) => <li key={item}>{item}</li>)}</ul><p className="detail-boundary">来源：{selected.provenance.join(" · ")}</p></aside> : null}</div></div>
}

function healthRows(data: TapeoutData) {
  const now = Date.now()
  const rows = [{ id: "tapeout", name: "TapeOut feed", state: data.tapeout?.sourceStatus || "degraded", success: data.tapeout?.generatedAt, snapshot: data.tapeout?.generatedAt, block: data.tapeout?.block, entities: (data.tapeout?.processors.length || 0) + (data.tapeout?.circuits.length || 0) + (data.tapeout?.tasks.length || 0), error: data.tapeout?.errors[0] || "—", source: data.tapeout?.source || TAPEOUT.website }, { id: "ignix", name: "IGNIX TapeOut index", state: data.ecosystem?.sourceStatus || "degraded", success: data.ecosystem?.fetchedAt, snapshot: data.ecosystem?.fetchedAt, block: null, entities: data.ecosystem?.assets.length || 0, error: data.ecosystem?.errors[0] || "—", source: IGNIX_API }, { id: "xlayer", name: "X Layer RPC", state: data.network?.ok ? "live" : "degraded", success: data.network?.ok ? data.network.checkedAt : null, snapshot: data.network?.checkedAt, block: data.network?.blockNumber, entities: 1, error: data.network?.ok ? "—" : "未读取", source: data.network?.rpc || XLAYER.rpc }]
  return rows.map((row) => ({ ...row, latency: row.success ? Math.max(0, Math.round((now - Date.parse(row.success)) / 1000)) : null }))
}
export function TapeoutDataPage() {
  const data = useTapeoutData()
  const rows = healthRows(data)
  return <div className="tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · DATA SYNC" title="数据同步" copy="同步工作台展示每个来源的最近成功、当前快照、延迟、区块、实体数量和错误。公共页面只读，重试与定时抓取留在边缘后端。" data={data} onRefresh={data.refresh} /><section className="panel"><PanelHeading eyebrow="01 · SOURCE HEALTH" title="来源状态" copy="状态来自本次浏览器快照；接入 Worker 后可从 KV/D1 保留历史。" source="read-only" /><div className="health-list">{rows.map((row) => <div className="health-row" key={row.id}><span className={"health-dot " + (row.state === "live" ? "live" : "")} /><div><strong>{row.name}</strong><small>{row.source}</small><small>最近成功 {dateText(row.success)} · 当前快照 {dateText(row.snapshot)}</small></div><span className="health-meta"><EntityStatus state={row.state} /><small>延迟 {row.latency === null ? "—" : row.latency + "s"} · 区块 {row.block?.toLocaleString() || "—"} · {row.entities} entities</small><small>错误 {row.error}</small></span></div>)}</div></section><section className="panel"><PanelHeading eyebrow="02 · DEPLOYMENT BOUNDARY" title="后端与链上边界" /><ul className="provenance-list"><li><strong>Cloudflare Worker / Pages Function</strong><span>负责 allow-list、CORS、短缓存、失败降级和定时同步入口。</span></li><li><strong>KV / D1</strong><span>KV 保存最新快照和健康状态，D1 保存实体历史、事件和趋势点。</span></li><li><strong>个人机器</strong><span>只负责前端开发和构建，不运行节点、爬虫或持续任务。</span></li></ul></section></div></div>
}
function notificationFromEvent(event: EcosystemEvent): LocalNotification {
  const rule: NotificationRule = event.rule === "circuit_burst" ? "circuit" : event.rule === "participant_change" ? "participant" : event.rule === "taskbank_change" ? "taskbank" : event.rule === "source_stale" ? "source" : event.rule === "asset_change" ? "asset" : "processor"
  return { id: "notice:" + event.id, title: event.name, body: event.evidence.join(" · "), source: event.source, href: event.kind === "event" ? "/anomaly" : "/radar", createdAt: event.observedAt || new Date().toISOString(), read: false, ignored: false, rule }
}
export function TapeoutNotificationsPage() {
  const data = useTapeoutData()
  const workspace = useWorkspace()
  const events = useMemo(() => data.workerEvents ?? buildEvents(data.tapeout, data.ecosystem, data.network), [data.workerEvents, data.tapeout, data.ecosystem, data.network])
  const generated = useMemo(() => events.map(notificationFromEvent), [events])
  const updateWorkspace = workspace.setState
  useEffect(() => { if (!generated.length) return; updateWorkspace((current) => ({ ...current, notifications: [...current.notifications.filter((item) => !generated.some((next) => next.id === item.id)), ...generated.map((item) => ({ ...item, read: current.notifications.find((saved) => saved.id === item.id)?.read ?? false, ignored: current.notifications.find((saved) => saved.id === item.id)?.ignored ?? false })), ...current.notifications.filter((item) => generated.every((next) => next.id !== item.id))].slice(0, 100) })) }, [generated, updateWorkspace])
  const [filter, setFilter] = useState<"all" | NotificationRule>("all")
  const visible = workspace.state.notifications.filter((item) => !item.ignored && (filter === "all" || item.rule === filter) && workspace.state.rules[item.rule])
  return <div className="tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · NOTIFICATIONS" title="通知收件箱" copy="通知保存在当前浏览器，用于跟踪新 Processor、Circuit burst、参与地址、题库、资产状态和数据源降级。" data={data} onRefresh={data.refresh} /><section className="panel"><PanelHeading eyebrow="01 · LOCAL INBOX" title={String(visible.filter((item) => !item.read).length) + " 条未读"} copy="规则开关和已读/忽略状态都属于本地工作区。" source="localStorage" /><div className="workspace-tabs"><button className={filter === "all" ? "workspace-tab active" : "workspace-tab"} type="button" onClick={() => setFilter("all")}>全部</button>{Object.keys(defaultRules).map((rule) => <button key={rule} className={filter === rule ? "workspace-tab active" : "workspace-tab"} type="button" onClick={() => setFilter(rule as NotificationRule)}>{rule}</button>)}</div><div className="notification-list">{visible.length ? visible.map((item) => <article className={item.read ? "notification-row read" : "notification-row"} key={item.id}><div><span className="eyebrow">{item.rule}</span><strong>{item.title}</strong><p>{item.body}</p><small>{dateText(item.createdAt)} · {item.source}</small></div><div className="notification-actions"><Link className="button ghost small" to={item.href}>查看详情</Link>{!item.read ? <button className="button ghost small" type="button" onClick={() => workspace.markNotification(item.id, "read")}>标记已读</button> : null}<button className="button ghost small" type="button" onClick={() => workspace.markNotification(item.id, "ignore")}>忽略</button></div></article>) : <EmptyState title="收件箱为空" body="打开通知规则或刷新数据后，新的公开事件会进入这里。" />}</div></section></div></div>
}


export function TapeoutAlphaPage() {
  const data = useTapeoutData()
  const workspace = useWorkspace()
  const [tab, setTab] = useState<"processor" | "projects" | "new" | "proof" | "watchlist">("processor")
  const entities = useMemo(() => normalizeEntities(data.tapeout, data.ecosystem), [data.tapeout, data.ecosystem])
  const scores = useMemo(() => entities.filter((entity) => ["processor", "asset", "circuit", "participant", "task"].includes(entity.kind)).map((entity) => scoreAlpha(entity, entities)).sort((a, b) => b.score - a.score), [entities])
  const current = tab === "processor" ? scores.filter((item) => item.entity.kind === "processor") : tab === "projects" ? scores.filter((item) => item.entity.kind === "asset") : tab === "new" ? scores.filter((item) => item.entity.kind === "circuit" || item.entity.kind === "participant") : tab === "proof" ? scores.filter((item) => item.entity.kind === "task") : scores.filter((item) => workspace.state.watchlist.includes(item.entity.id))
  const labels = { processor: "Processor Alpha", projects: "TapeOut 项目 Alpha", new: "新 Circuit / 新参与者", proof: "Proof-of-Design 覆盖", watchlist: "本地 Watchlist" }
  return <div className="tapeout-embedded"><div className="tapeout-main"><PageHeader eyebrow="LIKELY2X · ALPHA DESK" title="生态 Alpha" copy="Alpha 是研究排序模块，不是交易工具。分数由 multiplier、Circuit 覆盖、任务难度、活跃新鲜度、参与增长、资产事实和数据完整度组成，并逐条展示证据。" data={data} onRefresh={data.refresh} /><nav className="radar-tabs">{Object.entries(labels).map(([id, label]) => <button key={id} type="button" className={tab === id ? "radar-tab active" : "radar-tab"} onClick={() => setTab(id as typeof tab)}>{label}</button>)}</nav><section className="alpha-summary"><div><span>RANKED ENTITIES</span><strong>{current.length}</strong><small>当前子模块</small></div><div><span>DATA STATE</span><strong>{statusLabel(data.tapeout?.sourceStatus).toUpperCase()}</strong><small>{dateText(data.tapeout?.generatedAt)}</small></div><div><span>SCORING</span><strong>EXPLAINED</strong><small>每项带组成因素</small></div><div><span>ACTIONS</span><strong>READ ONLY</strong><small>不连接交易或凭证</small></div></section><section className="panel"><PanelHeading eyebrow="01 · RESEARCH RANKING" title={labels[tab]} copy="缺失字段只贡献零分或低置信度；增长维度需要历史快照后才会计分。" source="multiplier · coverage · freshness · provenance" /><div className="candidate-list">{current.length ? current.slice(0, 30).map((item) => <article className="candidate-card" key={item.entity.id}><div><span className="eyebrow">{item.entity.kind} · {item.entity.dataState}</span><h3>{item.entity.name}</h3><p>{item.factors.map((factor) => factor.label + " " + Math.round(factor.value) + " · " + factor.evidence).join(" / ")}</p></div><div className="candidate-score"><strong>{item.score}</strong><small>alpha score</small><WatchButton id={item.entity.id} workspace={workspace} /></div></article>) : <EmptyState title="当前子模块没有可排序实体" body="刷新公开数据，或在发现页加入 Watchlist。" />}</div></section></div></div>
}
export function TapeoutAccountPage() {
  const workspace = useWorkspace()
  const [tagTarget, setTagTarget] = useState("")
  const [tag, setTag] = useState("")
  const exportConfig = () => { const blob = new Blob([JSON.stringify(workspace.state, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "likely2x-workspace.json"; link.click(); URL.revokeObjectURL(url) }
  const importConfig = (file: File | undefined) => { if (!file) return; void file.text().then((text) => { try { const next = JSON.parse(text) as WorkspaceState; workspace.setState({ watchlist: Array.isArray(next.watchlist) ? next.watchlist : [], tags: next.tags || {}, rules: { ...defaultRules, ...(next.rules || {}) }, density: next.density === "compact" ? "compact" : "comfortable", sourcePreference: next.sourcePreference || "all", notifications: Array.isArray(next.notifications) ? next.notifications : [] }) } catch { /* keep local state */ } }) }
  return <div className="tapeout-embedded"><div className="tapeout-main"><div className="tapeout-heading"><div><span className="eyebrow">LIKELY2X · MY SPACE</span><h1>我的空间</h1><p>这里管理本地 Watchlist、地址标签、来源偏好、通知规则、主题和显示密度。浏览器只保存工作区配置，不保存 API key、私钥或交易凭证。</p></div></div><section className="panel"><PanelHeading eyebrow="01 · WATCHLIST" title="本地关注" copy={String(workspace.state.watchlist.length) + " 个实体保存在此浏览器。"} source="localStorage only" />{workspace.state.watchlist.length ? <div className="watchlist-grid">{workspace.state.watchlist.map((id) => <div className="watchlist-item" key={id}><span className="mono">{id}</span><button className="watch-button" type="button" onClick={() => workspace.toggleWatch(id)}>移除</button></div>)}</div> : <EmptyState title="还没有关注实体" body="在发现、雷达或 Alpha 页面点击关注即可添加。" />}</section><section className="panel"><PanelHeading eyebrow="02 · ADDRESS LABELS" title="地址标签" copy="标签只作为浏览器本地注释。" /><div className="form-grid"><label><span>实体 ID</span><input value={tagTarget} onChange={(event) => setTagTarget(event.target.value)} placeholder="participant:0x…" /></label><label><span>标签</span><input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="核心参与者" /></label></div><div className="form-footer"><span>{Object.keys(workspace.state.tags).length} 个标签</span><button className="button primary small" type="button" onClick={() => { if (tagTarget.trim()) workspace.setTag(tagTarget.trim(), tag.trim()) }}>保存标签</button></div></section><section className="panel"><PanelHeading eyebrow="03 · NOTIFICATION RULES" title="通知规则" copy="按来源规则在本地收件箱生成通知。" /><div className="rule-grid">{Object.keys(defaultRules).map((rule) => <label className="rule-toggle" key={rule}><input type="checkbox" checked={workspace.state.rules[rule as NotificationRule]} onChange={(event) => workspace.updateRule(rule as NotificationRule, event.target.checked)} /><span>{rule}</span><small>公开快照规则</small></label>)}</div></section><section className="panel"><PanelHeading eyebrow="04 · PREFERENCES" title="显示与配置" /><div className="preference-row"><span>显示密度</span><button className={workspace.state.density === "comfortable" ? "view-button active" : "view-button"} type="button" onClick={() => workspace.setState((current) => ({ ...current, density: "comfortable" }))}>舒适</button><button className={workspace.state.density === "compact" ? "view-button active" : "view-button"} type="button" onClick={() => workspace.setState((current) => ({ ...current, density: "compact" }))}>紧凑</button><span>默认来源</span><select className="preference-select" value={workspace.state.sourcePreference} onChange={(event) => workspace.setState((current) => ({ ...current, sourcePreference: event.target.value as WorkspaceState["sourcePreference"] }))}><option value="all">全部</option><option value="tapeout">TapeOut</option><option value="ignix">IGNIX</option><option value="xlayer">X Layer</option></select><button className="button ghost small" type="button" onClick={exportConfig}>导出配置</button><label className="button ghost small file-button">导入配置<input type="file" accept="application/json" onChange={(event) => importConfig(event.target.files?.[0])} /></label></div></section></div></div>
}
