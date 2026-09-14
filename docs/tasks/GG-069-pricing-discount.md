# GG-069 — 定价整体折扣

- Status: Implemented and locally verified; owner review pending; not deployed.
- Date: 2026-09-14
- Branch: feature/GG-069-pricing-discount
- Worktree: F:/goodgood-worktrees/GG-069
- Baseline: verified main bab17fd ancestor + GG-068 262c498.
- Decision: [ADR 0072](../decisions/0072-pricing-discount.md)

## Scope and acceptance

模型定价增加当前线路整体折扣；98=98%=9.8折，80=8折，100=原价。覆盖全部分辨率、质量以及视频两档费率。以该线路本次首次应用前的价格为基准，重复应用不叠加，线路状态独立保留。空白不补价，非法折扣/价格不改输入；人民币两位小数四舍五入，正价最低0.01元。仍通过已有保存/版本/审计持久化最终价格，无自动修改现有价格、正式视频扣款或发布。

## Implementation and verification / next action

- 共享pricing-discount.mjs以整数分精确计算，批量验证后返回新矩阵；不修改来源对象。PricingDiscountEditor复用于图片与视频，当前线路独立保留百分比/首次应用基准/错误反馈，试算沿用更新后的草稿。
- 定向测试12/12通过；一次npm run check:local通过lint/typecheck/build，477 tests：460 passed、17 opt-in skipped、0 failed。测试覆盖全规格/质量/两档费率、舍入/最低分、空白/非法原子拒绝和可访问控件。
- 更新32141 Web为GG-069 session32488（GG-068 Web74757已停）；mock42311/Worker72412及goodgood-gg052数据卷保留，无迁移/容器重建。ignored .gg052-local.mjs web可恢复；32140真实栈与生产未改。
- Chrome验证2.5 1080p：98得到75.46/45.08，80得到61.60/36.80，重复重算不叠加；备用单独98，标准仍80。非法0保留价格，100恢复77/46，可继续手动改62，取消恢复已存原价。
- GPT flare专线80覆盖15档质量价格：1K low0.04/max1.18、4K max2.25；特价仍0.10且折扣100。取消未保存。390px无横向溢出，折扣按钮可用；恢复桌面。
- 只读前后：39个非模型表hash/count、全部managed_models记录及审计事件hash/count均相同；没有任何价格/账本/任务写入，不发付费生成请求。原试价归档状态不变。
- 交接文档更新后documentation-continuity 8/8、git diff --check通过；未再改运行时代码。

下一步：站长在http://127.0.0.1:32141/admin/models尝试折扣，应用后检查数值，再通过“保存并生效”保存最终价格。原tab1648144383保留在2.5标准定价面板，默认100。无阻塞，未push/main merge/部署。
