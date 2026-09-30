# GG-211 · 画布 GPT 分辨率路由与质量背景

- 日期：2026-09-30。
- 状态：本地实现与运行同步完成，待站长手动验收，未部署；不运行自动测试、浏览器复测或真实生成。
- 工作区：保留 GG-116 / `feature/GG-116-asset-history-actions` / `efb72d9` 的现有画布改动；本任务后端从已验证运行检查点 `3733ced` 独立提取，不批量合并。
- 请求：1K/2K 使用特价模型，4K 使用优质模型，无后缀模型作为 4K 备用；增加质量及背景参数。
- 决策：[ADR 0108 GG-211](../decisions/0108-standalone-canvas-image-generation.md#gg-211-addendum--canvas-gpt-resolution-routing-and-options-2026-09-30)。新画布提交携带 `canvas-image-v1`，大厅显式线路及旧任务路由不改变。质量默认中档；已存值保留。GPT 2.5 五档、GPT Image 2 按文档三档。
- 来源：[O1Key 文档](https://cf-api.o1key.com/docs/#image-gpt-image)，2026-09-30 无鉴权只读获取：GPT Image 2 的完整 ID 为 `gpt-image-2-c-sp` / `gpt-image-2-c-sd`；背景 `auto / transparent`，透明需 PNG/WebP。
- 验收：质量、背景属于各自生成器，保存/复制/历史/刷新可恢复；报价使用对应质量；透明请求使用 PNG；4K 仅明确未接单的无渠道错误可备用一次，未知提交绝不重复。
- 边界：不修改生产、不代发付费请求、不自行改零售单价；完成本地运行同步所需编译与检查点核验区别于功能复测。
- 下一步：由站长在5173手验数量、GPT质量/背景、实际请求路由及刷新恢复；保留既有待验项，不代发请求。

## 实施与运行证据

- GPT质量/背景控件复用ToggleGroup，新节点medium、旧auto有效值保留；透明PNG，GPT2只显示三档。生成器草稿、复制/历史、项目JSON保存、提交快照、质量报价与服务端输入hash同步。响应式向下设置测量包含新组，保持无滚动完整布局。
- 新canvas-image-v1持久化到可空provider_routing_policy；旧输入无policy hash不变。GPT1K/2K-sp、4K-sd，GPT2实际-c-sp/-c-sd；没有把UI标签当provider ID。
- 4K明确no-channel且未获taskID时，原submitted attempt记失败，再事务创建ordinal+1、不同pinned route的备用attempt。备用只有一次，reservation不动；重启识别已固定备用，不重发unknown或部分已接单批次。GG-212新画布全部模型多图单次n=1任务集合，旧GPT原生1/2/4保留。
- 隔离树GG-211-runtime从3733ced摘取本次18文件，提交99e645ce5aec3c0ede5fe7936d60e1627ffd5808。npm ci及启动所需build/verify:checkpoint完成。切换前确认活跃任务/outbox/冻结/Valkey队列均0，本地54449仅0052/0053前进至53条，原画布项目1保留；五模型活跃报价数量均1..12。
- 32131 Web PID34080、唯一32142 Worker PID34712的五项ready均ok；5173 PID34440不动，代理同一verified版本。启动沿用外部cloud env与忽略的Valkey56549 portfix；日志%TEMP%/goodgood-local-services/gg211-{web,worker}.{out,err}.log。未用生产数据。
- 静态源码审阅与diff check通过。新gg211测试定义覆盖路由/旧任务、no-channel边界、quality/background/pixel payload、policy历史与hash、独立fallback attempt；GG212数量与fanout定义由子agent补。测试定义未执行，未运行check:local、浏览器复测、实际上传或付费生成；运行编译/readiness不是产品验收。当前手验状态未确认。
