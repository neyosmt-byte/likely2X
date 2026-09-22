# Likely2X 调研与适配边界

## 活动要求

活动页面要求参赛 Processor 通过 TapeOut factory 部署到 X Layer；部署时公开 transistor supply、unit price 和 cap（如有）；活动窗口结束前至少完成一次 circuit tapeout；项目需要有清晰 use case，并提交 Processor 合约地址、部署钱包、Demo 和项目说明。评审关注应用创新、TapeOut 生态集成深度、产品完整度、资产发行设计、X Layer 集成、增长潜力、合约安全与经济模型。

## 协议生态与 X Layer 网络事实

- 主网 chainId：`196`
- 原生资产：`OKB`
- RPC：`https://rpc.xlayer.tech`
- 备用 RPC：`https://xlayerrpc.okx.com`
- Explorer：`https://www.oklink.com/xlayer`

TapeOut 的公开协议 feed 当前提供：

- `https://tapeout.net/pod/pod-mainnet.json`：官方 Processor / CPU 配置、链与合约入口。
- `https://tapeout.net/pod/pod-stats.json`：Proof-of-Design 统计、参与槽位、任务数量和最新 `TapedOut` 事件。
- `https://tapeout.net/pod/pod-taskbank.json`：题库总量、已上链题目和退化题说明。
- `https://tapeout.net/pod/pod-miners.json`：参与地址与挖矿槽位索引。

这些官方 feed 当前标注 BSC 主网 `chainId 56`，并不等于黑客松目标链。黑客松要求新 Processor 通过 TapeOut factory 部署到 X Layer `chainId 196`。因此 Likely2X 将两条链分成两个明确的产品上下文：TapeOut 协议生态源用于发现 Processor / Circuit / 任务 / 事件，X Layer 用于参赛部署校验。

Likely2X 会先读取 `eth_chainId`，确认确实是 196，再读取区块高度；主 RPC 失败后才尝试备用 RPC。链 ID 不匹配不会被当作 X Layer 在线。

## IGNIX 数据策略

当前实现读取：

- `GET /v1/campaigns/current`
- `GET /v1/campaigns/{campaignId}/leaderboards/mcap?page=1&limit=50`
- `GET /v1/launches?limit=50&page=1`

列表只保留 `tokenType === "tapeout"`，并验证合约地址是 40 位十六进制 EVM 地址。leaderboard 优先，launch feed 只补充未出现的合约。leaderboard 的 `snapshot.createdAt` 被展示为服务端快照时间；客户端请求时间单独展示。

如果某个 feed 失败，页面显示降级状态并保留成功 feed 的可验证数据；如果当前 campaign 请求失败，页面显示错误和空列表。Agent 数据不会因为列表为空而被改名成 TapeOut。

## 后端是否能部署到 TapeOut

不能把传统 HTTP 后端直接部署成 TapeOut 的 Processor。TapeOut 的链上对象是 Processor、Circuit、晶体管和相关协议资产；其 Circuit 能被协议合约按 `eval` / `step` 这类确定性接口执行。它不是通用容器、虚拟机、数据库、HTTP server 或任务调度平台。

适合 TapeOut 的是 Likely2X 的“协议内核”方向，例如：

- 用 Circuit 表达可验证的评分、过滤、规则计算或状态机；
- 通过真实 Circuit tapeout 形成可验证的链上组件；
- 在 X Layer 部署 Processor，并在产品中引用 Circuit 地址与测试向量；
- 让外部后端只负责索引、展示、缓存、通知和用户工作流。

不适合放进 TapeOut 的是 API 网关、数据库、网页渲染、全量事件索引、定时任务和密钥管理。这些应放在链下，优先使用静态前端 + 公共 RPC / feed；需要代理时使用 Cloudflare Worker、Pages Function、GitHub Actions 定时快照或托管数据库。这样弱机器也不需要运行 X Layer / BSC 全节点。

Likely2X 随仓库提供一个最小 Cloudflare Worker 代理模板，只允许四个 TapeOut JSON feed，并添加浏览器所需的 CORS 与短缓存。它不做钱包托管、签名、交易或数据库写入。开发环境使用 Vite proxy；生产部署时把 `VITE_TAPEOUT_DATA_BASE` 指向 Worker。这个边缘代理是 Likely2X 的链下后端边界，不能也不需要部署到 TapeOut Processor 里。

## 产品边界

Likely2X 是只读生态雷达和参赛资料整理器。它不包含原 Likely 的网格、订单、BSC、Binance 或其它生产业务，也不自动发起钱包交易、部署合约、上传密钥或提交黑客松表单。
