# GG-012 — Nano Banana 2 思考程度与谷歌搜索

- 状态：已上线；思考 UI 已由 GG-016 取代
- 用户需求：Nano Banana 2 请求同时接收文本与图片；增加仅该模型可见的思考程度和谷歌搜索参数
- 最后更新：2026-09-09
- 分支：`feature/GG-012-banana-thinking-search`
- 依赖基线：本地组合候选 `44535d7`，包含 GG-004—GG-011；最终随累计候选 `65ceb168` 上线
- 决策：[ADR 0033](../decisions/0033-banana-thinking-and-google-search.md)

> 2026-09-08：GG-016 修订了其中的思考交互——新 Nano 请求固定为隐藏的高思考；
> 本卡以下低/高可选内容仅保留为当时实现与历史证据。

## 范围与验收

- 仅当模型为 Nano Banana 2 时，在参数抽屉动态显示“思考程度”和“谷歌搜索”。
- 思考程度为 `低 / 高`，默认低；低不向 O1Key 传字段，高发送顶层
  `thinking_level: "high"`。
- 谷歌搜索默认关闭；关闭不向 O1Key 传字段，开启发送顶层
  `google_search: true`。
- Nano Banana 2 固定发送 `response_modalities: ["TEXT", "IMAGE"]`；GPT IMAGE 2
  请求不增加上述字段。
- 冻结到每次生成快照，并随根草稿和项目保存/恢复；旧记录以低/关闭兼容读取。
- API 拒绝未知值及非 Nano Banana 2 的启用值；重试复用原始不可变快照。
- 覆盖默认省略、高/开启转发、模型隔离、UI 动态显示、持久化和兼容迁移测试。
- 不包含 Nano Banana Pro、上游文本结果展示、生产部署或真实付费生图。

## 实现与证据

- 相关文件/专题文档：`PRODUCT.md`、`UX_FLOWS.md`、`DATA_MODEL.md`、
  `ERROR_HANDLING.md`、`TESTING.md`、生成契约、草稿/项目仓储、O1Key adapter、创作 UI。
- 已完成：契约与模型能力归一、不可变快照、API 校验、批次/项目/草稿持久化、
  迁移 0017、O1Key v4 请求映射、动态 UI、详情元数据和相关专题文档。
- 验证：定向测试 64/64；最终 `npm run check:local` 共 222 项（216 通过、6 个
  opt-in 跳过、0 失败），构建、Lint 与类型检查通过；3010 Compose 六项
  readiness 均通过，最新迁移为 0017。根据站长截图复核后，将低对比度开关改为
  清晰的“关闭 / 开启”双选按钮；浏览器已验证默认关闭、开启/关闭均可点击且选中态
  可见，并保留切到 GPT 后隐藏及切回 Banana 后归一为低/关闭的行为。
- 发布：随 `65ceb168` 上线；生产真实 Nano 冒烟确认 `TEXT + IMAGE` 与隐藏高思考快照。

## 恢复工作

- 尚未完成：Google Search 开启态的真实调用未包含在本次授权；发布已完成。
- 阻塞/风险：O1Key 返回的文本内容不在当前资产模型内，本任务只请求该模态，不展示或持久化文本结果。
- 下一步：生产观察；Google Search 真实验收须另行明确授权。
