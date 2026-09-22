# Likely2X 调研与适配边界

## 活动要求

活动页面要求参赛 Processor 通过 TapeOut factory 部署到 X Layer；部署时公开 transistor supply、unit price 和 cap（如有）；活动窗口结束前至少完成一次 circuit tapeout；项目需要有清晰 use case，并提交 Processor 合约地址、部署钱包、Demo 和项目说明。评审关注应用创新、TapeOut 生态集成深度、产品完整度、资产发行设计、X Layer 集成、增长潜力、合约安全与经济模型。

## X Layer 网络事实

- 主网 chainId：`196`
- 原生资产：`OKB`
- RPC：`https://rpc.xlayer.tech`
- 备用 RPC：`https://xlayerrpc.okx.com`
- Explorer：`https://www.oklink.com/xlayer`

Likely2X 会先读取 `eth_chainId`，确认确实是 196，再读取区块高度；主 RPC 失败后才尝试备用 RPC。链 ID 不匹配不会被当作 X Layer 在线。

## IGNIX 数据策略

当前实现读取：

- `GET /v1/campaigns/current`
- `GET /v1/campaigns/{campaignId}/leaderboards/mcap?page=1&limit=50`
- `GET /v1/launches?limit=50&page=1`

列表只保留 `tokenType === "tapeout"`，并验证合约地址是 40 位十六进制 EVM 地址。leaderboard 优先，launch feed 只补充未出现的合约。leaderboard 的 `snapshot.createdAt` 被展示为服务端快照时间；客户端请求时间单独展示。

如果某个 feed 失败，页面显示降级状态并保留成功 feed 的可验证数据；如果当前 campaign 请求失败，页面显示错误和空列表。Agent 数据不会因为列表为空而被改名成 TapeOut。

## 产品边界

Likely2X 是只读生态雷达和参赛资料整理器。它不包含原 Likely 的网格、订单、BSC、Binance 或其它生产业务，也不自动发起钱包交易、部署合约、上传密钥或提交黑客松表单。
