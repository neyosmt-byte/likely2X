import { useCallback, useEffect, useMemo, useState } from 'react'

import { fetchEcosystem, fetchNetwork, HACKATHON, IGNIX_API, XLAYER, type Campaign, type EcosystemSnapshot, type NetworkSnapshot, type TapeoutAsset } from './api/ignix.ts'

import './styles.css'

type Draft = {
  processor: string
  wallet: string
  supply: string
  unitPrice: string
  cap: string
  circuit: string
  useCase: string
  demoUrl: string
  description: string
}

const DRAFT_KEY = 'likely2x-submission-draft'
const EMPTY_DRAFT: Draft = {
  processor: '', wallet: '', supply: '', unitPrice: '', cap: '', circuit: '', useCase: '', demoUrl: '', description: '',
}

function readDraft(): Draft {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || '{}') as Partial<Draft>
    return Object.fromEntries(Object.keys(EMPTY_DRAFT).map((key) => [key, String(parsed[key as keyof Draft] ?? '')])) as Draft
  } catch {
    return EMPTY_DRAFT
  }
}

function address(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim())
}

function ready(field: keyof Draft, draft: Draft) {
  const value = draft[field].trim()
  if (!value) return false
  if (field === 'processor' || field === 'wallet') return address(value)
  if (field === 'demoUrl') {
    try { return new URL(value).protocol === 'https:' } catch { return false }
  }
  return true
}

function money(value: number | null) {
  return value === null ? '—' : `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function dateText(value: string | null | undefined) {
  if (!value) return '未读取'
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toLocaleString('zh-CN') : value
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function networkLabel(network: NetworkSnapshot | null) {
  if (!network) return '读取中'
  return network.ok ? `在线 · block ${network.blockNumber?.toLocaleString()}` : '暂不可用'
}

function Requirement({ done, number, title, copy }: { done: boolean; number: number; title: string; copy: string }) {
  return (
    <li className={done ? 'requirement done' : 'requirement'}>
      <span className="requirement-mark">{done ? '✓' : number}</span>
      <span><strong>{title}</strong><small>{copy}</small></span>
    </li>
  )
}

function AssetTable({ assets }: { assets: TapeoutAsset[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Rank</th><th>项目</th><th>市值</th><th>流动性</th><th>状态</th><th>合约</th></tr></thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.contract}>
              <td className="mono">{asset.rank ?? '—'}</td>
              <td><strong>{asset.name}</strong><small>{asset.symbol}</small></td>
              <td>{money(asset.marketCapUsd)}</td>
              <td>{money(asset.liquidityUsd)}</td>
              <td><span className={asset.graduated ? 'pill green' : 'pill amber'}>{asset.graduated ? '已毕业' : '曲线中'}</span></td>
              <td><a className="mono link" href={`${XLAYER.explorer}/address/${asset.contract}`} target="_blank" rel="noreferrer">{shortAddress(asset.contract)} ↗</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CampaignMeta({ campaign, fetchedAt }: { campaign: Campaign | null; fetchedAt: string | null }) {
  return (
    <div className="meta-line">
      <span>Campaign · {campaign?.name || '未读取'}</span>
      <span>窗口 · {dateText(campaign?.startAt)} → {dateText(campaign?.endAt)}</span>
      <span>服务端快照 · {dateText(campaign?.snapshotAt)}</span>
      <span>客户端抓取 · {dateText(fetchedAt)}</span>
    </div>
  )
}

export function App() {
  const [ecosystem, setEcosystem] = useState<EcosystemSnapshot | null>(null)
  const [network, setNetwork] = useState<NetworkSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft>(() => readDraft())
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const [nextEcosystem, nextNetwork] = await Promise.all([fetchEcosystem(signal), fetchNetwork(signal)])
      if (!signal?.aborted) {
        setEcosystem(nextEcosystem)
        setNetwork(nextNetwork)
      }
    } catch (error) {
      if (!signal?.aborted) setNetwork({ blockNumber: null, chainId: null, checkedAt: new Date().toISOString(), rpc: null, ok: false })
      console.warn('Likely2X refresh failed', error)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft])

  const update = (field: keyof Draft, value: string) => setDraft((current) => ({ ...current, [field]: value }))
  const required = useMemo<Array<keyof Draft>>(() => ['processor', 'wallet', 'supply', 'unitPrice', 'circuit', 'useCase', 'demoUrl', 'description'], [])
  const completed = required.filter((field) => ready(field, draft)).length
  const assets = ecosystem?.assets ?? []

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Likely2X home"><span className="brand-mark">2X</span><span><b>LIKELY</b><em>for X Layer</em></span></a>
        <div className="topbar-right"><span className="network-chip"><i className={network?.ok ? 'dot online' : 'dot'} /> {XLAYER.name} · {XLAYER.chainId}</span><a href={HACKATHON} target="_blank" rel="noreferrer">Genesis Transistor ↗</a></div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-kicker">IGNIX × X LAYER · TAPEOUT GENESIS TRANSISTOR</div>
          <h1>把 TapeOut 生态<br /><span>变成可验证的参赛产品。</span></h1>
          <p>Likely2X 只聚焦 X Layer：读取 IGNIX 的 TapeOut 资产快照，校验主网状态，并把 Processor、Circuit 和产品 Demo 的参赛事实收敛到一张工作台。</p>
          <div className="hero-actions"><button className="button primary" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? '同步中…' : '同步 TapeOut 生态'} <span>↗</span></button><a className="button ghost" href={HACKATHON} target="_blank" rel="noreferrer">查看活动规则 ↗</a></div>
        </section>

        <section className="signal-grid" aria-label="X Layer live signals">
          <div className="signal-card"><span>NETWORK</span><strong>{networkLabel(network)}</strong><small>{network?.rpc || XLAYER.rpc}</small></div>
          <div className="signal-card"><span>TAPEOUT ASSETS</span><strong>{assets.length.toString().padStart(2, '0')}</strong><small>{ecosystem?.sourceStatus === 'degraded' ? '索引降级' : 'IGNIX 当前快照'}</small></div>
          <div className="signal-card"><span>CAMPAIGN</span><strong>{ecosystem?.campaign?.phase || '读取中'}</strong><small>{dateText(ecosystem?.campaign?.snapshotAt)}</small></div>
          <div className="signal-card"><span>SUBMISSION</span><strong>{completed}/{required.length}</strong><small>本机草稿完成度</small></div>
        </section>

        <section className="panel ecosystem-panel">
          <div className="panel-heading"><div><span className="eyebrow">01 · LIVE INDEX</span><h2>TapeOut 生态雷达</h2><p>只接受 API 明确标记 <code>tokenType=tapeout</code> 的资产。Agent、普通 Launch 和未知类型永远不会混入列表。</p></div><span className="source-tag">{IGNIX_API}</span></div>
          {ecosystem?.sourceStatus === 'degraded' ? <div className="notice warning"><strong>索引数据不完整</strong><span>{ecosystem.errors.join(' · ') || 'IGNIX feed unavailable'}</span></div> : null}
          {ecosystem?.sourceStatus === 'live' && assets.length === 0 ? <div className="notice empty"><strong>当前公开快照没有 TapeOut 资产</strong><span>当前接口返回的候选可能全部是 Agent，Likely2X 不会猜测或伪造 TapeOut 项目。</span></div> : null}
          {assets.length > 0 ? <AssetTable assets={assets} /> : null}
          <CampaignMeta campaign={ecosystem?.campaign ?? null} fetchedAt={ecosystem?.fetchedAt ?? null} />
        </section>

        <section className="work-grid">
          <div className="panel form-panel">
            <div className="panel-heading"><div><span className="eyebrow">02 · SUBMISSION KIT</span><h2>处理器参赛资料</h2><p>先把部署后必须提交的事实整理好。字段只保存在当前浏览器，不会上传或签名交易。</p></div><span className="completion">{completed} / {required.length}</span></div>
            <div className="form-grid">
              <label><span>Processor 合约地址 <b>*</b></span><input value={draft.processor} onChange={(event) => update('processor', event.target.value)} placeholder="0x…" /></label>
              <label><span>部署钱包 <b>*</b></span><input value={draft.wallet} onChange={(event) => update('wallet', event.target.value)} placeholder="0x…" /></label>
              <label><span>晶体管供应量 <b>*</b></span><input value={draft.supply} onChange={(event) => update('supply', event.target.value)} placeholder="例如 1,000,000" /></label>
              <label><span>单价（OKB） <b>*</b></span><input value={draft.unitPrice} onChange={(event) => update('unitPrice', event.target.value)} placeholder="例如 0.01" /></label>
              <label><span>Cap（如有）</span><input value={draft.cap} onChange={(event) => update('cap', event.target.value)} placeholder="unlimited / 数量" /></label>
              <label><span>已流片 Circuit <b>*</b></span><input value={draft.circuit} onChange={(event) => update('circuit', event.target.value)} placeholder="交易哈希或电路地址" /></label>
              <label className="wide"><span>清晰用例 <b>*</b></span><textarea value={draft.useCase} onChange={(event) => update('useCase', event.target.value)} rows={2} placeholder="谁会使用这个 Processor，它解决什么问题？" /></label>
              <label><span>产品 Demo <b>*</b></span><input value={draft.demoUrl} onChange={(event) => update('demoUrl', event.target.value)} placeholder="https://…" /></label>
              <label className="wide"><span>项目说明 <b>*</b></span><textarea value={draft.description} onChange={(event) => update('description', event.target.value)} rows={3} placeholder="产品、TapeOut 经济模型与 X Layer 集成说明" /></label>
            </div>
            <div className="form-footer"><span>{savedAt ? `已保存 ${savedAt}` : '自动保存到本机 localStorage'}</span><button className="button primary small" type="button" onClick={() => { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); setSavedAt(new Date().toLocaleTimeString('zh-CN')) }}>保存草稿</button></div>
          </div>

          <div className="panel requirements-panel">
            <div className="panel-heading"><div><span className="eyebrow">03 · GATE CHECK</span><h2>参赛门槛</h2><p>状态来自上面的本机草稿，不代表已经完成链上动作。</p></div></div>
            <ol className="requirements">
              <Requirement number={1} done={ready('processor', draft)} title="X Layer + TapeOut factory" copy="通过 TapeOut 工厂部署 Processor。" />
              <Requirement number={2} done={ready('supply', draft) && ready('unitPrice', draft)} title="公开发行参数" copy="供应量、单价和 cap（如有）在部署时披露。" />
              <Requirement number={3} done={ready('circuit', draft)} title="至少一次 Circuit tapeout" copy="活动窗口结束前完成一条真实电路流片。" />
              <Requirement number={4} done={ready('useCase', draft) && ready('demoUrl', draft)} title="清晰用例与 Demo" copy="提交 Processor、部署钱包、Demo 和项目说明。" />
            </ol>
            <div className="network-check"><span className={network?.ok ? 'check-icon green' : 'check-icon'}>{network?.ok ? '✓' : '!'}</span><div><strong>{network?.ok ? 'X Layer 主网已验证' : '等待 X Layer RPC 校验'}</strong><small>chainId {network?.chainId ?? XLAYER.chainId} · {network?.blockNumber ? `block ${network.blockNumber.toLocaleString()}` : XLAYER.rpc}</small></div></div>
            <div className="links"><a href={`${XLAYER.explorer}`} target="_blank" rel="noreferrer">X Layer Explorer ↗</a><a href={`${IGNIX_API}/v1/campaigns/current`} target="_blank" rel="noreferrer">IGNIX API ↗</a></div>
          </div>
        </section>

        <footer><span>Likely2X · participant build</span><span>Read-only index · no trading · no auto-submit</span></footer>
      </main>
    </div>
  )
}
