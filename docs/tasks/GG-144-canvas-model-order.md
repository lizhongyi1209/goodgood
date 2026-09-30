# GG-144 — 画布模型菜单顺序

- 状态：本地界面已修改，待站长手动验收；沿用 `F:/goodgood-worktrees/GG-116` 当前分支，未提交、未部署。
- 请求：画布模型列表依次展示 Nano Banana Pro、Nano Banana 2、GPT Image 2.5 Sunburst、GPT Image 2.5 Flare、GPT Image 2。
- 决策关系：改变 GG-142 模型菜单的展示顺序与 GPT 名称大小写；默认模型、报价、可用性与生成行为不变。画布文案决定见 [ADR 0108 补充](../decisions/0108-standalone-canvas-image-generation.md)。

## 范围与验收

- 画布模型菜单按 GoodGood 稳定适配器 ID 排序，不依赖后端目录返回顺序或展示名称。
- 已禁用、无报价的模型继续隐藏；同一适配器下若有多条目录模型，保持这些条目的原相对顺序。
- Nano Banana 2 仍为初始选中模型；不更改其他页面的模型顺序。
- 站长手动检查发现 sunburst 在画布列表里缺少 `GPT` 前缀；三个 GPT 型号在画布统一显示为 `GPT Image 2.5 Sunburst`、`GPT Image 2.5 Flare`、`GPT Image 2`。Banana 名称仍沿用后端。

## 实施与验证

调整 `CanvasPage` 可用模型列表的显示排序与三个 GPT 型号的画布展示名。后端目录 ID、报价映射与其他页面名称不变。站长要求后续改动不复测；本次未运行自动测试或浏览器检查，待站长在 5173 `/canvas` 手动验收；未触发真实生成、未替换 32131 或部署生产。

## 下一步

站长手动打开画布模型菜单，确认三个 GPT 名称的大小写、五个模型顺序与原选择功能。
