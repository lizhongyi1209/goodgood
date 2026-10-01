# GG-257 — 画布连线仅悬停时流动

- 最后更新：2026-10-01
- 状态：已实施、精确集成及代码验收完成，辅助目录退役；浏览器视觉验收由用户负责，未部署。
- 用户需求：完成的画布参考图连线默认静止实线，仅 hover 时流动。
- 分支 / worktree：`fix/GG-257-canvas-edge-hover-flow` / `F:/goodgood-worktrees/GG-257-canvas-edge-hover-flow`。
- 基线：父集成树当前 HEAD `41df2dcad421aa90bfbccf86a6a0a51d30bda4a0`，已核对祖先；入口文档的 GG-252 检查点尚待父 agent 同步。

## 范围与验收

- 完成连线默认关闭虚线和动画，覆盖 React Flow 的原生 `animated` 样式。
- 在线条及对应剪刀按钮的共享 hover 区域内启用原 `7 4` 虚线、1.3 秒线性流动；离开后立即恢复静止实线。
- reduced motion 下 hover 也保持静止实线。既有曲率、颜色、线宽、命中范围、剪刀延时和断线逻辑保留。
- 决策影响：取代 GG-171 默认持续流动的决定，见 [ADR 0108 的 GG-257 补充](../decisions/0108-standalone-canvas-image-generation.md)。
- 授权范围：CSS 本地实施和代码验收；浏览器、部署及真实上传/生成/数据库写入均未授权。

## 实现与证据

- 文件边界：`features/canvas/canvas-workspace.module.css`、ADR 0108 最小追加和本任务卡。共享 BACKLOG、IMPLEMENTATION_PLAN、CURRENT_STATE 由父 agent 更新。
- 已检查既有 TSX hover 标记：进入连线时设置 `data-canvas-edge-hovered=true`，移到剪刀保留，离开两者/删除/卸载清理；不需要修改 TSX。
- 已检查 React Flow 样式：原生 `.react-flow__edge.animated path` 默认设虚线及动画，工作区作用域选择器具有更高 specificity，可在默认状态显式覆盖。
- 已实施：默认显式 `stroke-dasharray: none; animation: none`；仅在 `prefers-reduced-motion: no-preference` 内为 `:hover` 和既有临时 hover 标记启用原流动。原 reduced-motion 规则保留，无更高 specificity 的 hover 动画绕过偏好。
- 验证：2026-10-01 源码与 diff 审阅通过；`git -c core.safecrlf=false diff --check` 通过。只改上述三文件，没有 TSX/图数据或删除路径变化。
- 根交付：子 `53f1934` 精确回放为 `6f63a8f`；核对当前连线 animated 来源、React Flow 原生样式 specificity 和 hover 标记生命周期。实际 Vite workspace CSS 编译 HTTP 200，静止基态/no-preference hover 接线通过。当前交互/视觉规范与任务索引已同步。
- 未执行：浏览器/Playwright、镜像 CSS 测试、全量 typecheck/build/check:local；无依赖安装、真实上传/生成或数据库/队列写入。
- 发布：未部署。

## 并行与 worktree 收口

- 负责人：GG-257 子 agent；只在上述独立 worktree 写入，不操作父集成目录。
- 创建数：1；整合数：1；退役数：1。父核对绝对所有权路径、clean（含 ignored）、无 reparse point/缓存/服务后使用 Git worktree remove/prune；目录已不存在，其余 worktree 保留。
- 依赖/构建缓存：无；未启动服务。无缓存清理或有意义的磁盘变化。
- 交付：上述三文件形成独立 commit，由父 agent 审查与精确整合；commit hash 通过交接消息提供。

## 恢复工作

- 下一步：用户刷新 5173 手验；开发/集成/代码验证/目录退役已完成，无待完成代码或运行步骤。
- 用户手验：默认实线、进入连线流动、剪刀出现及按钮 hover 持续流动、离开恢复实线、reduced motion 全程静止实线。
