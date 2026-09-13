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
- 验证：`node --test tests/documentation-continuity.test.mjs tests/m8-production-release.test.mjs` 15/15 通过，0 跳过、0 失败；`git -c core.safecrlf=false diff --check` 通过。文档专用任务不执行代码完整门禁，不安装依赖或重启预览。
- 发布：未推送/合 main/部署；32141 继续 GG-054 本地试价，CURRENT_STATE 生产事实不变。

## 恢复工作

向用户交付官方成本基准；下一步依据供应商固定价/折扣和 high 模式分项用量核算三线路实际整单成本，再确定按张积分售价。GG-054 Banana 2 优质/专线请求 ID 仍待补齐，本轮未获得这两个 ID。
