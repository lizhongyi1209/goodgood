# GG-055 — Gemini 官方单张图片成本

- 状态：本地调研文档完成，官方核对/算术/文档验证通过，未修改产品费率或发布。
- 用户需求：调查 Nano Banana Pro / Nano Banana 2 官方 API 价格，按张折算人民币与积分。
- 最后更新：2026-09-13
- 分支/worktree：`chore/GG-055-gemini-image-costs` / `F:/goodgood-worktrees/GG-055`
- 基线：GG-054 `5cc0963`，main `bab17fd` 已验证为祖先。

## 范围与验收

核对 Google 官方 Standard 图片 tokens/各项价格，区分最终图片成本和整单账单，明确测算汇率、积分取整及假设。保存可引用分析；不改变已接受 ADR 0063/0064，暂无新 ADR。仅本地调研文档授权；没有付费 API、价格保存、数据库/队列写入或生产操作。

## 实现与证据

- [研究记录](../research/GG-055-gemini-image-costs.md) 给出六个规格的输出成本、整单公式、示例及线路折扣应用边界。
- 已于当日访问 Google 官方 pricing/image-generation/models 页面；数值按官方图片 tokens × 单价程序精算。1 USD=7 CNY 是测算假设，不是实时汇率；未实测 high thinking 完整账单。
- 最终图片输出成本 Pro 1K/2K≈0.94 元、4K=1.68 元；Banana 2 1K≈0.47 元、2K≈0.71 元、4K≈1.06 元；整单另计输入/思考/工具。
- 同任务追问已补五张参考图与长提示词敏感性表：Pro 图输入明确 560 tokens/张；Banana 2 暂以通用 Gemini 3 high 的 1120 tokens/张假设预算，不冒充模型专用定额。五图增量 0.0392/0.0196 元；加 5000 文本 tokens 后输入增量 0.1092/0.0371 元。输出尺寸、输入处理分辨率和 thinking level 分开；小计不包含思考输出或重试。后续需真实 usage 校准。
- 验证：`node --test tests/documentation-continuity.test.mjs tests/m8-production-release.test.mjs` 15/15 通过，0 跳过、0 失败；`git -c core.safecrlf=false diff --check` 通过。文档专用任务不执行代码完整门禁，不安装依赖或重启预览。
- 发布：未推送/合 main/部署；32141 继续 GG-054 本地试价，CURRENT_STATE 生产事实不变。

## 下一步与恢复工作

已交付官方成本基准；实际成本仍需供应商固定价/折扣和 high 模式分项用量。用户后续已保存 Banana 价格并提供 Banana 2 优质/专线 ID，接续实现与本地测试准备见 [GG-056](GG-056-banana2-lines.md)；本研究没有改价或确认实测账单。
