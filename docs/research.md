# Likely2X 数据与架构说明

Likely2X 是 TapeOut 生态的长期聚合器。研究工作台关注项目发现、Processor 与 Circuit 雷达、Proof-of-Design 任务、参与地址、协议指标、资产事实和数据源状态。

## 数据来源

TapeOut 的四个公开 feed 分别提供：

- pod-mainnet：chainId、Processor registry、合约地址、Circuit 配置和任务摘要。
- pod-stats：当前区块、协议速率、矿工容量、累计产出、任务数量和最近事件。
- pod-taskbank：题库总量、上链/离链、comb/seq、门数、锁存器、runGas 和任务元数据。
- pod-miners：参与地址、Processor、Circuit、Task 与区块观察记录。

当前 TapeOut feed 的协议来源链是 chainId 56。X Layer 的网络状态使用 chainId 196 的 RPC 读取。两种链上下文在实体模型中分开，避免把协议来源和网络状态合并为未经证明的部署事实。

IGNIX 作为项目资产索引，只接受 tokenType=tapeout 且通过地址校验的记录。leaderboard 与 launch feed 按合约地址去重，Agent、Unknown 和缺少类型的记录不进入项目表。用于定位 leaderboard 的公开索引入口属于内部数据路径，产品不会展示其活动或运营语义。

## 统一实体

前端和后端都围绕以下实体字段工作：

    {
      id,
      kind,
      chainId,
      address,
      name,
      status,
      metrics,
      source,
      observedAt,
      dataState,
      provenance
    }

dataState 用 live、cached、stale、degraded 区分实时、缓存、过期和降级。provenance 保存源 URL、feed 字段和过滤条件。缺少字段时使用 null，并在列表和 Alpha 中显示证据边界。

## 异动与 Alpha

异动规则包括 Circuit burst、Processor 新增或状态变化、参与容量变化、题库变化、项目资产状态或流动性变化和数据源降级。除公开事件窗口与数据源健康外，前后值比较依赖定时历史快照；缺少基线时不报告变化。每个信号包含规则标识、证据事件、观察窗口和来源。

Alpha 只做研究排序。Processor 分数参考 multiplier、关联覆盖和数据完整度；项目资产参考资产事实、流动性和数据完整度；Circuit、参与地址和 Task 参考新鲜度、关联覆盖和数据完整度。缺失字段不补造数值，分数面板始终显示因素和证据。

## 边缘部署

前端静态资源部署到 Pages。Worker 对上游 feed 进行路径 allow-list、CORS、短缓存和 KV stale fallback。KV 保存最新快照与健康状态，D1 保存实体、事件、项目快照、指标历史和同步记录，Cron Trigger 每五分钟抓取一次。D1 首次部署前需要执行 `worker/schema.sql` 并绑定 Cloudflare 生成的资源 ID。普通浏览器只读访问，重试和运维动作不暴露给公共页面。
