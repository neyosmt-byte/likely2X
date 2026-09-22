# Likely2X

Likely2X 是为 IGNIX × X Layer TapeOut Genesis Transistor Hackathon 单独制作的 TapeOut 生态雷达与参赛工作台。它不迁移原 Likely 的网格、订单、BSC Alpha、Binance 扫描或其它业务模块，只保留 TapeOut 生态发现与 X Layer 参赛所需的产品闭环。

## 当前能力

- 通过 X Layer 主网 RPC 验证 chainId `196`、最新区块与备用 RPC 状态。
- 读取 TapeOut 官方公开 feed：Processor 配置、Proof-of-Design 统计、任务题库、参与地址和最近流片事件。
- 清楚区分 TapeOut 协议生态源（当前公开 feed 标注 BSC chainId `56`）与黑客松要求的 X Layer 部署目标（chainId `196`）。
- 读取 IGNIX 当前 campaign、mcap leaderboard 和 launch feed，作为生态的资产发行层视图。
- IGNIX 资产层只接收 API 明确标记 `tokenType=tapeout` 的资产，排除 Agent 和未知类型，并按合约地址去重。
- 对索引器部分失败显示降级状态，不把空列表解释成“没有项目”之外的确定事实。
- 在浏览器 `localStorage` 保存 Processor 合约、部署钱包、供应量、单价、cap、Circuit、用例、Demo 和项目说明草稿。
- 展示黑客松硬性门槛与实时完成度；不会自动部署合约、签名交易、交易或提交外部表单。

## 后端边界

TapeOut 的 Processor / Circuit 是链上可部署和可流片的协议对象，但传统后端服务不能“部署到 TapeOut”里。TapeOut 合约负责确定性电路求值、流片、资产与事件；HTTP 聚合、定时刷新、搜索索引、用户资料和告警仍然属于链下应用层。

本项目默认把 TapeOut feed 通过 Vite 开发代理读取，方便本地预览；生产环境可把 `VITE_TAPEOUT_DATA_BASE` 指向一个轻量的 Cloudflare Worker / Pages Function 代理。这样不需要在个人机器上跑全节点、保存大索引或持续运行重服务。当前仓库已把数据边界和降级状态写入产品，代理部署是后续发布步骤，不会伪装成已完成。

仓库里的 `worker/tapeout-proxy.ts` 和 `wrangler.toml` 是这个边缘代理的最小模板，只允许四个公开 JSON feed，默认没有数据库、队列或私钥。部署到 Cloudflare 后，把前端构建环境变量设为该 Worker URL，例如 `VITE_TAPEOUT_DATA_BASE=https://likely2x-tapeout-proxy.<account>.workers.dev`。

## 本地运行

```bash
npm install
npm run dev
```

验证：

```bash
npm test
npm run build
```

## 参赛前仍需人工完成

1. 通过 TapeOut factory 在 X Layer 主网部署 Processor。
2. 在活动窗口结束前完成至少一次真实 Circuit tapeout。
3. 用 X Layer Explorer 核验部署和流片交易，把真实地址与交易事实填入页面。
4. 在活动页面提交 Processor 合约地址、部署钱包、Demo 和项目说明。

## 关键链接

- 活动：<https://ignix.bot/x_campaign>
- IGNIX API：<https://api.ignix.bot>
- X Layer Explorer：<https://www.oklink.com/xlayer>
