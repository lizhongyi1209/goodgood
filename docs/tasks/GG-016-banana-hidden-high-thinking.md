# GG-016 — Nano Banana 2 隐藏并固定高思考

- 状态：本地浏览器已验证；未发布
- 用户需求：移除 Nano Banana 2 的“思考程度”参数，内部默认使用高思考且不向用户展示
- 最后更新：2026-09-08
- 分支：`feature/GG-016-banana-hidden-high-thinking`
- 依赖基线：本地组合候选 `60b56a9`，包含 GG-004—GG-015；生产仍为 `94cecb0`
- 决策：[ADR 0033 修订](../decisions/0033-banana-thinking-and-google-search.md)

## 范围与验收

- 创作参数抽屉和图片详情不再显示“思考程度”或低/高选项。
- 新 Nano Banana 2 创作状态固定归一为内部 `high`，每个 O1Key 单图任务顶层发送
  `thinking_level: "high"`。
- 谷歌搜索的关闭/开启控件和 `google_search: true` 映射保持不变。
- GPT IMAGE 2 继续使用非 Nano 的中性内部值，不接收或转发 `thinking_level`。
- 不批量改写数据库；历史生成任务保留原始 `low/high` 快照，历史低思考重试仍按原始
  请求省略 provider 字段。旧项目/草稿恢复为活动创作器时归一为新的内部 `high`。
- 自动化测试使用 stub，不点击生成、不调用真实付费 provider；不包含生产发布。

## 实现与证据

- 已完成：创作器与图片详情移除思考 UI；新 Nano 快照、API、草稿/项目状态和 O1Key
  适配器统一缺省为 `high`；历史低思考任务重试仍省略上游字段；谷歌搜索保持原行为。
- 验证：定向测试 55/55；最终 `npm run check:local` 共 235 项（229 通过、6 项 opt-in
  跳过、0 失败）。重建前数据库无 queued/running job，也无 created/submitted/running
  attempt；3010 Web/Worker 重建后 readiness 全部为 `ok`。真实 Chrome 验证 Nano 参数
  抽屉只显示谷歌搜索，Nano 图片详情也无思考字段；代理未点击生成。
- 发布：未发布，生产环境未变。

## 恢复工作

- 下一步：站长可在 3010 按需执行真实 Nano 生成，确认上游高思考表现；若决定发布，
  另行完成 GG-003 发布门禁提取和发布授权。
- 阻塞/风险：本地实现无外部阻塞；真实高思考调用可能计费，本任务未由代理触发。
