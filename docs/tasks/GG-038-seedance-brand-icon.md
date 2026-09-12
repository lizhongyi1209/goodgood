# GG-038 — Seedance 使用 ByteDance 图标

- 状态：本地完成并验证；未发布
- 最后更新：2026-09-13
- 分支：`feature/GG-038-seedance-brand-icon`
- 工作目录：`F:/goodgood-worktrees/GG-037`（同一工作树顺序切换新分支，无并行编辑）
- 基线：GG-037 已验证提交 `256bafd`；依赖候选堆叠，不是生产或 main

## 范围与决策

- 用户确认 GG-037 混排样式，并指定视频模型使用 ByteDance 图标。
- 沿用 Banana 使用的 `@lobehub/icons-static-svg@1.94.0`，选择 `bytedance-color.svg`。
- 只替换 Seedance 模型选择器/选项/本地实测模型标识；保留媒体类型和创建素材的 Film 功能图标。
- 不改变参数、线路、接口、计费、持久化或已确认布局；符合现有品牌图标规范，无需新 ADR。

## 验证与交接

- 已完成共享 SeedanceModelIcon，选择器、全部模型选项与本地实测标识使用同一静态 SVG。
- 定向测试 1/1 通过；`npm run check:local` 通过：355 项中 341 通过、14 个 opt-in 跳过、0 失败。
- 现有 Chrome computer use 已检查展开模型列表，Seedance 2.5 / 2.0 / Fast / Mini 均显示 ByteDance
  彩色图标，透明背景、26px 标识，不影响控件布局；未使用 Playwright。
- 不请求真实 provider、不推送、不合入、不部署。
- 下一步：用户检查现有 32139 模拟页；正式媒体数据链路按后续需求处理。
