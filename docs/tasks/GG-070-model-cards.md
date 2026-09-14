# GG-070 — 模型卡片与右侧定价面板

- Status: Implemented and locally verified; owner review pending; not deployed.
- Date: 2026-09-14
- Branch: feature/GG-070-model-cards
- Worktree: F:/goodgood-worktrees/GG-070
- Baseline: verified main bab17fd ancestor + GG-069 bc7d466.
- Decision: [ADR 0073](../decisions/0073-model-cards-and-pricing-sheet.md)

## Scope and acceptance

模型目录改紧凑响应式卡片，图片/视频分类、搜索/筛选、2.5排序和快速启禁保留。卡片只显示名称、状态、默认线路价格摘要、规格/线路数量；不铺开全部价格。点击卡片右侧打开完整定价编辑面板，复用既有价格、线路、质量、折扣、试算与保存/添加能力，面板内滚动、底部保存固定；手机全宽。清理重复文案，必要单位、折扣基准、自动质量计价和未接视频结算保留。无数据库/模型配置自动修改或生产发布。

## Implementation and verification / next action

- 目录改自动适应宽度的紧凑卡片；默认线路跨支持规格的价格范围，禁用默认线路显式标注，视频两档费率分开。分类/搜索/筛选、快速启禁和2.5优先保留；60条内存模型SSR验证每模型仅一个卡片，不铺价格表。
- 原编辑/添加复用右侧Radix Sheet，桌面760px、手机全宽；字段区域独立滚动，标题与保存固定。取消/Esc回原触发按钮焦点，保存期间保持禁关/禁编辑；原持久化接口未改。
- 删除页面计费副标题/脚注、图片规格介绍和双份线路说明；缩短折扣、自动质量、tokens计费/试算和内部编号介绍。必要单位、当前线路折扣基准与不叠加、视频结算未接仍保留。
- 定向22/22；预览build通过。第一次完整门禁在类型检查发现摘要矩阵推断unknown，补显式现有契约类型后重跑npm run check:local全通过lint/types/build，480 tests：463 passed、17 opt-in skipped、0 failed。
- GG-070 Web session6035取代已停GG-069 Web32488，沿用mock42311/Worker72412和goodgood-gg052数据卷。ignored .gg052-local.mjs web可恢复；无迁移/reset/容器重建，未改32140真实栈。
- Chrome桌面第一屏展示9模型，右面板x1033/right1793/width760；2.5备用80折1080p61.60，标准仍77，取消未保存。Esc焦点回“Seedance 2.5 价格详情”。搜索seedance与无匹配状态验证，清空恢复全部。
- GPT flare专线完整15质量值可见，4K max2.81；添加入口在同一Sheet、折扣默认100、保存可达，均取消。390px面板width390/right390，内部1194px内容在682px区域滚动，保存bottom828<844；无水平溢出。恢复桌面、原tab1648144383停卡片目录并保留。
- 只读前后39非模型表hash/count、全部managed_models记录及审计事件hash/count相同。现有名称/价格/线路/模型启禁和试价归档保留。无账本/任务写入或付费请求、push/main merge/部署。
- 最终交接文档更新后documentation-continuity 8/8与git diff --check通过，未再改运行时代码。

下一步：用户检查http://127.0.0.1:32141/admin/models卡片与右侧价格面板。无阻塞；正式视频积分结算仍为后续独立切片。
