# GG-211 · 画布 GPT 分辨率路由与质量背景

- 日期：2026-09-30。
- 状态：实施中，未部署；由站长手动验收，不运行自动测试、浏览器复测或真实生成。
- 工作区：保留 GG-116 / `feature/GG-116-asset-history-actions` / `efb72d9` 的现有画布改动；本任务后端从已验证运行检查点 `3733ced` 独立提取，不批量合并。
- 请求：1K/2K 使用特价模型，4K 使用优质模型，无后缀模型作为 4K 备用；增加质量及背景参数。
- 决策：[ADR 0108 GG-211](../decisions/0108-standalone-canvas-image-generation.md#gg-211-addendum--canvas-gpt-resolution-routing-and-options-2026-09-30)。新画布提交携带 `canvas-image-v1`，大厅显式线路及旧任务路由不改变。质量默认中档；已存值保留。GPT 2.5 五档、GPT Image 2 按文档三档。
- 来源：[O1Key 文档](https://cf-api.o1key.com/docs/#image-gpt-image)，2026-09-30 无鉴权只读获取：GPT Image 2 的完整 ID 为 `gpt-image-2-c-sp` / `gpt-image-2-c-sd`；背景 `auto / transparent`，透明需 PNG/WebP。
- 验收：质量、背景属于各自生成器，保存/复制/历史/刷新可恢复；报价使用对应质量；透明请求使用 PNG；4K 仅明确未接单的无渠道错误可备用一次，未知提交绝不重复。
- 边界：不修改生产、不代发付费请求、不自行改零售单价；完成本地运行同步所需编译与检查点核验区别于功能复测。
- 下一步：源码、持久化与安全备用实现后同步隔离本地 Web/Worker，保持正在执行的真实任务。
