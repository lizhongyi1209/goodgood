# GG-021 — Nano Banana Pro 单张定价

- 状态：报价已上线；provider 生成路由仍关闭
- 用户需求：Nano Banana Pro 定价为每张 15 积分
- 最后更新：2026-09-09
- 分支：`feature/GG-021-nano-banana-pro-pricing`
- 依赖基线：本地组合候选 `6c7c45e`（GG-020）；最终随 `65ceb168` 上线
- 决策：[ADR 0041](../decisions/0041-price-nano-banana-pro-at-fifteen-credits.md)

## 范围与验收

- 服务端为 Nano Banana Pro 的 `1K / 2K / 4K` 单张输出分别提供 15 积分的不可变价格行。
- 鉴权后的积分摘要及本地 UI 预览均返回该价格；创作器选中 Pro 时显示 `15 积分/张`。
- 浏览器不提交价格，Nano Banana 2 与 GPT IMAGE 2 现有价格不变。
- 本任务不开放 Nano Banana Pro 的 provider 路由，也不发起真实、可能计费的生图请求。
- 数据库迁移、快速单元测试、PostgreSQL 定向集成和 `npm run check:local` 均须通过。

## 实现与证据

- 迁移 `0019_gg021_nano_banana_pro_prices.sql` 为三档分辨率追加单张 15 积分的
  version-1 标准价格，不修改既有价格历史。
- 鉴权积分摘要加入 Nano Banana Pro 单张报价；本地预览使用同一 15 积分产品规则。
- 计费/UI 定向覆盖 25 通过、1 个 opt-in 跳过；独立临时 PostgreSQL 集成 5/5 通过，临时库已删除。
- 最终 `npm run check:local` 共 246 项（240 通过、6 个 opt-in 跳过、0 失败）。
- 3010 已应用迁移 0019 并重建 Web。数据库和鉴权 API 均确认 `1K / 2K / 4K` 为
  单张 15 积分；真实 Chrome 切换 Pro 后显示 `15 积分/张` 和本批 15 积分，2/4 张保持禁用。
- 核验后草稿已恢复 Nano Banana 2；活动 generation job/attempt 均为 0，账户积分
  仍为可用 470、冻结 0，未点击生成、未产生真实 provider 请求。

## 恢复工作

- 发布：15 积分报价和迁移 0019 随 `65ceb168` 上线。
- 未完成：Nano Banana Pro provider 生成路由仍关闭，不属于本任务。
- 阻塞/风险：无报价实现阻塞；不得因价格上线而声称 Pro 已可生成。
- 下一步：如需开放 Pro 生成，另开任务验证 provider 路由并取得真实调用授权。
