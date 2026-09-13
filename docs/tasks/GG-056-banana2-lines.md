# GG-056 — Banana 2 三线路与试价条目移除

- 状态：本地实现/完整门禁/SQL/运行与浏览器检查完成，用户价格原样保留；未发布或调用真实 provider。
- 日期：2026-09-13
- 分支/worktree：`feature/GG-056-banana2-lines` / `F:/goodgood-worktrees/GG-056`
- 基线：GG-055 `52a808e`，main `bab17fd` 已验证为祖先；接续 GG-054 本地候选，不使用搁置 C6。

## 范围与验收

用户已手动设置 Banana 两组线路价格，并补充 Banana 2 特价/优质/专线请求 ID：`gemini-3.1-flash-image-c-sp` / `gemini-3.1-flash-image-c-sd` / `gemini-3.1-flash-image`。补齐已接受 ADR 0064 的映射，不更改固定按张积分售价；默认特价，保留旧特价 provider route/version。移除明确指定 `banana-pricing-demo` 试价条目，保留关联历史结果/项目/不可变报价与账本，不重置测试库。移除语义记录于 ADR 0065。

线上版本正在本地测试准备；本轮授权为本地实现、验证与指定条目移除，不等于 CI/main 合并或生产部署。32141 仍是独立 mock 栈，不将模拟出图当作真实线路验收，不自动发付费请求。

## 数据保护检查点

- 已从显式 `goodgood-gg052-postgres-1` / `goodgood` 读取，非 32140 真实 provider 栈。现有唯一 generation job 为 succeeded，没有活动生成。
- 用户当前价格（积分，1K/2K/4K）：Pro 特价 30/30/30、优质 60/60/60、专线 96/96/170，模型总开关 false、三线路 true、v3；Banana 2 特价 20/20/20、优质 40/40/40、专线 48/72/108，模型 true、特价 true/其余 false、v2。仅价格/状态核对，不含秘密或资产。
- 不自动启用用户禁用的模型/线路，不复制价格作为生产迁移默认值。更新运行前后精确比较这两条配置与价格版本，保留用户测试设置。
- 试价条目 v3 有 append-only 审计外键及一份历史结果，需归档目录而非删除审计/报价/项目。

## 验证与交接

- 定向 27/27 通过，包含原价格/线路契约和 126 次注入 fetch 的 Banana 2 ID/14 比例/3 规格校验，不发 HTTP；high/search/5000 字符请求/五引用参数保留。新测试初次仅误用了 quote 返回类型/缺 mediaType 和 session code，修正 fixture 后通过，无产品代码失败。
- 显式 `goodgood_gg054_lines_test_gg056_v1` 在启用前查询无连接，未接队列或 Worker；新增扩展 SQL 1/1 通过（迁移、专线四图 288 报价/失败释放、归档冲突/一次审计、目录隐藏、禁止保存/新生成、项目/价格/账本不变）。不写 32141 用户数据做 fixture。
- `npm run check:local` 一次完整执行通过：lint/TypeScript/构建通过，443 项中 427 通过、16 opt-in 跳过、0 失败；ignored `.gg056-check.log`。没有借用先前候选门禁。
- 使用 ignored 本地 launcher、Windows 实际内存/磁盘探针和只作用显式 loopback mock 目标的更新脚本，比较两组用户模型完整配置和八类历史表 count/hash；不保存秘密或资产到提交。
- 停止已核对的旧 Web/Worker/mock 会话 3926/43261/29023，确认 32141/32142/32143 无监听后，仅在显式 `goodgood-gg052` / `goodgood` 添加 0032 并站长归档指定条目。仅以独立 0032 目录运行新增迁移，不重新执行旧迁移或修改 checksum。试价条目归档禁用、v3→v4，一次 append-only 审计；没有发布新价格版本。
- 更新脚本对两条 canonical Banana 模型完整行（去除新增 null archived_at）前后精确比较通过；价格/启禁/version/时间不变。八类历史表 count/hash 全部一致：price_versions 120、credit_ledger_entries 4、generation_batches/jobs/attempts/assets/projects/creation_drafts 各 1。个人余额 179、冻结 0；历史项目/资产未删除。
- 当前三角色均来自 GG-056：Web 会话 50998、mock Worker 94043、mock provider 24724；Web `/api/health/ready` 和 Worker `/health/ready` 五项全部 ok，mock readiness ok。仍用 loopback mock，不调用 O1Key、不创建新测试生成任务；原 32140/生产状态不变。
- Chrome 原 32141 tab 检查：列表图片模型 6→5，试价条目消失；两条 Banana 名称/全部规格价格原样展示。Banana 2 优质/专线编辑里的启用控件可操作，已保存 40/40/40 和 48/72/108 积分，试算 40/48 对应所选线路；只切换查看并取消，没有保存或启用。页面回列表并标记保留，正常视口未改动。
- 最终交接文档连续性/发布边界 15/15、diff 检查通过；交接期间仅 GG-055 恢复段丢失“下一步”结构字样的文档测试失败，修正标题后定向复验，不重跑未受影响代码门禁。

## 下一步与发布边界

用户在 `http://127.0.0.1:32141/admin/models` 继续候选本地测试：Pro 总开关仍关闭，Banana 2 优质/专线仍关闭；可由用户按需要启用，默认特价不变。用户费率已记录为当前本地测试准备设置，不覆盖为官方成本、不作为未经审查的生产 migration 默认价格。本次归档不提供批量删除或 browser delete route。

真实线路请求/付费冒烟、视频正式结算、CI/main/image 与生产迁移/单位兑换/价格激活是后续独立范围；本地 mock 完成不能冒充真实线路或已上线。后续发布需保护既有线上数据、审查候选依赖与用户费率、获取精确候选新鲜证据，不运行旧转换 reset 脚本。
