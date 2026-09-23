# Likely2X

Likely2X 是面向 TapeOut 生态的项目发现、链上雷达、协议数据和研究工作台。它沿用 Likely 的工作台壳、导航、筛选、详情、状态和通知体验，但业务语义全部围绕 TapeOut 与 X Layer 生态事实。

## 产品模块

- 发现：Processor、Circuit、Task、参与地址、生态事件和 TapeOut 项目统一检索，支持重点、全部、事件、低活跃度视图。
- 生态雷达：Processor 能力、Circuit、参与地址和 Proof-of-Design 题库的列表、筛选、详情、证据和本地标签。
- 项目与资产：严格接受 IGNIX 明确标注 tokenType=tapeout 的资产，并展示协议速率、miner capacity、total mined、task count 和流片窗口。
- 生态异动：Circuit burst、参与容量、题库、资产和数据源状态规则，展示触发证据和时间边界。
- 生态 Alpha：Processor、TapeOut 项目、新 Circuit/参与者、Proof-of-Design 覆盖和 Watchlist 研究排序。分数显示组成因素和数据状态。
- 数据同步：展示来源最近成功、快照时间、延迟、区块、实体数量、错误和实时/缓存/过期/降级状态。
- 通知：浏览器本地收件箱，支持规则开关、已读、忽略和跳转详情。
- 我的空间：本地 Watchlist、地址标签、通知规则、显示密度和配置导入/导出。

网格、订单、下单、撤单、旧交易数据源、Binance 和 Pancake 语义不在本项目范围内。

## 数据边界

TapeOut 公开 feed 当前标注协议来源链 chainId 56，提供 Processor registry、Circuit、Task、taskbank metadata、统计、事件和参与地址。X Layer 使用 chainId 196，页面只在 RPC 或真实合约事件提供证据时显示关联状态，未配置的地址保持 unknown。IGNIX 只保留 tokenType=tapeout 且合约地址合法的资产，并按合约地址去重。

每个统一实体都包含 id、kind、chainId、address、name、status、metrics、source、observedAt、dataState 和 provenance。缺少历史快照时，趋势和变化只显示空态或当前可证明的信号。

## 边缘后端

前端适合部署到 Cloudflare Pages。worker/tapeout-proxy.ts 提供 feed allow-list、CORS、短缓存、KV 失败回退和数据源健康入口。Cloudflare Worker / Pages Function 负责 HTTP 聚合、定时抓取、缓存和 D1 历史；TapeOut 和 X Layer 负责链上协议与事件。个人机器只需开发和构建，不需要运行节点或爬虫。

公开入口包括：

- /api/ecosystem/summary
- /api/ecosystem/projects
- /api/ecosystem/processors
- /api/ecosystem/circuits
- /api/ecosystem/tasks
- /api/ecosystem/participants
- /api/ecosystem/events
- /api/ecosystem/health
- /api/ecosystem/search

## 本地运行

    npm install
    npm run dev

检查：

    npm test
    npm run build
    npm run lint

本地开发通过 Vite 代理读取 tapeout.net，默认地址是 http://127.0.0.1:5173。生产构建配置 `VITE_ECOSYSTEM_API_BASE` 指向 Worker 后，TapeOut feed、IGNIX 项目索引和生态异动会统一通过边缘 API 读取。

部署 Worker 前，在 Cloudflare 创建 KV 和 D1 资源，将返回的 ID 配置为 `SNAPSHOTS` 与 `DB` 绑定，并执行 `worker/schema.sql`。`wrangler.toml` 已配置五分钟 Cron；未绑定 KV/D1 时，公开 API 仍可读取上游，但不会保留跨请求快照和历史比较。

## 公开数据源

- TapeOut feed：https://tapeout.net
- IGNIX indexer：https://api.ignix.bot
- X Layer RPC：https://rpc.xlayer.tech
- X Layer explorer：https://www.oklink.com/xlayer
