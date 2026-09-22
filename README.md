# Likely2X

Likely2X 是为 IGNIX × X Layer TapeOut Genesis Transistor Hackathon 单独制作的参赛工作台。它不迁移原 Likely 的网格、订单、BSC Alpha、Binance 扫描或其它业务模块，只保留 X Layer / TapeOut 参赛所需的最小产品闭环。

## 当前能力

- 通过 X Layer 主网 RPC 验证 chainId `196`、最新区块与备用 RPC 状态。
- 读取 IGNIX 当前 campaign、mcap leaderboard 和 launch feed。
- 只接收 API 明确标记 `tokenType=tapeout` 的资产，排除 Agent 和未知类型，并按合约地址去重。
- 对索引器部分失败显示降级状态，不把空列表解释成“没有项目”之外的确定事实。
- 在浏览器 `localStorage` 保存 Processor 合约、部署钱包、供应量、单价、cap、Circuit、用例、Demo 和项目说明草稿。
- 展示黑客松硬性门槛与实时完成度；不会自动部署合约、签名交易、交易或提交外部表单。

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
