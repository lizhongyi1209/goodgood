# GG-068 — Seedance 双线路定价与 2.5 1080p

- Status: Implemented and locally verified; owner review pending; not deployed.
- Date: 2026-09-14
- Branch: feature/GG-068-seedance-line-pricing
- Worktree: F:/goodgood-worktrees/GG-068
- Baseline: verified main bab17fd ancestor + GG-067 97df1ea.
- Decision: [ADR 0071](../decisions/0071-seedance-line-prices-and-1080p.md)

## Scope and acceptance

标准/备用独立定价与启禁、列表两线路价格、切换编辑/试算和持久化。保留当前原价、图片记录、模型启禁与历史。Seedance 2.5 置视频首位，补 1080p 创作及后台/请求校验；两线路填 77/46 元/百万 token 原价。删除指定副标题、简化规格单位。不做正式视频扣款或付费验证/发布。

来源：[官方价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)，2026-09-14 浏览器核对 2.5 1080p、原价 77/46；不采用限时折扣。

## 实现与证据 / 下一步

- 共享 Seedance 能力定义：2.5 首位、480p/720p/1080p；创作选项与两线路请求校验同步，4K 仍拒绝。未发付费请求验证上游。
- API 使用 videoLines，复用现有 managed_models.lines JSON 保存标准/备用的 enabled 与 prices；旧单矩阵首次编辑投影为两个独立副本。保存原子更新两路与审计事件，无迁移。
- 列表两路价格对齐展示；编辑器切换保留输入，试算随所选线路；支持直接填折扣后的人民币售价。删除视频分组指定副标题，规格单位改为元/百万token；保留自适应宽度。
- 定向测试 35/35；一次 npm run check:local 全通过 lint/typecheck/build，473 tests：456 passed、17 opt-in skipped、0 failed。
- 交接文档更新后，documentation-continuity 8/8 与 git diff --check 通过；未再改运行时代码。
- 更新 32141 mock Web 为本工作树，session 74757；沿用 mock 42311、Worker 72412 与 goodgood-gg052 数据卷，未改 32140 real-provider 服务。使用 ignored .gg052-local.mjs web 恢复，无生产发布。
- 站长在原页面正常保存四模型两线路配置，版本 2→3；2.5 1080p 两路补 77/46 原价，其他原价保持。临时备用 61.6 与标准 77 切换保留验证后恢复 77 再保存，未采用任何折扣。
- 刷新及读库确认两路持久化；39 个非模型表计数/hash、图片完整记录、所有模型启禁状态均不变。无账本/生成写入，保留试价归档状态。
- Chrome 创作页默认 2.5，1080p 点击后 aria-pressed=true；390px 列表与定价面板无横向溢出，备用 1080p 保存值可见，保存按钮可用。恢复桌面，原 tab 1648144383 保留在 2.5 标准定价面板。

下一步：站长检查 http://127.0.0.1:32141/admin/models 并尝试独立线路价格。正式视频预扣、报价快照和实际 tokens 账本结算仍为下一实施切片，不包含在本任务中。无阻塞。
