# GG-424 — 画布线存量检查错误清理

- 状态：已登记，尚未实施；GG-423 范围外，用户明确要求先不修。
- 最后更新：2026-10-10。
- 来源：[GG-423](GG-423-home-design-system.md) 验证与用户选择 1。
- 基线：design/GG-422-design-system / 5e404e2；未来实施需从当时已验证画布检查点另建分支。

## 63 个 lint 错误 / 27 个文件

同一锁定依赖和 ESLint 配置：改动前 63 错误 / 165 警告；GG-423 后 63 错误 / 172 警告。63 个错误的文件、规则及行号完全相同，下列文件源码均未修改。新增警告为展示图片使用普通 img 的 Next 提示；没有压低门禁或禁用规则。

| 文件 | 错误数 | 错误类型 |
| --- | --- | --- |
| `features/announcements/announcement-center.tsx` | 2 | `react-hooks/refs`、`react-hooks/set-state-in-effect` |
| `features/announcements/announcement-management.tsx` | 1 | `react-hooks/set-state-in-effect` |
| `features/announcements/use-announcements.ts` | 1 | `react-hooks/preserve-manual-memoization` |
| `features/assets/text-asset-preview.tsx` | 1 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-adaptive-image.tsx` | 3 | `react-hooks/refs`、`react-hooks/set-state-in-effect` |
| `features/canvas/canvas-asset-panel.tsx` | 1 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-folder-album-node.tsx` | 2 | `react-hooks/refs` |
| `features/canvas/canvas-group-emoji-picker.tsx` | 2 | `react-hooks/refs`、`react-hooks/set-state-in-effect` |
| `features/canvas/canvas-group-node.tsx` | 2 | `react-hooks/refs`、`react-hooks/set-state-in-effect` |
| `features/canvas/canvas-image-cleanup.tsx` | 4 | `react-hooks/refs`、`react-hooks/set-state-in-effect` |
| `features/canvas/canvas-image-color.tsx` | 7 | `react-hooks/set-state-in-effect`、`react-hooks/refs` |
| `features/canvas/canvas-image-compare.tsx` | 2 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-image-crop.tsx` | 2 | `react-hooks/refs`、`react-hooks/set-state-in-effect` |
| `features/canvas/canvas-image-download.ts` | 2 | `react-hooks/refs`、`react-hooks/set-state-in-effect` |
| `features/canvas/canvas-image-metadata.tsx` | 2 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-image-placement-picker.tsx` | 1 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-image-placement.tsx` | 3 | `react-hooks/set-state-in-effect`、`react-hooks/refs` |
| `features/canvas/canvas-image-region.tsx` | 3 | `react-hooks/refs`、`react-hooks/set-state-in-effect` |
| `features/canvas/canvas-image-view-button.tsx` | 1 | `react-hooks/refs` |
| `features/canvas/canvas-text-generator-node.tsx` | 2 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-text-node.tsx` | 1 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-video-generation-feedback.tsx` | 1 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-video-generator-node.tsx` | 12 | `react-hooks/refs`、`react-hooks/preserve-manual-memoization`、`react-hooks/set-state-in-effect` |
| `features/canvas/canvas-video-material-picker.tsx` | 1 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-video-storyboard-control.tsx` | 1 | `react-hooks/set-state-in-effect` |
| `features/canvas/canvas-workspace.tsx` | 2 | `react-hooks/set-state-in-effect` |
| `features/canvas/use-canvas-reference-reorder.ts` | 1 | `react-hooks/refs` |

- `react-hooks/refs`：渲染阶段读取或写入 ref.current。
- `react-hooks/set-state-in-effect`：effect 中同步 setState 导致级联渲染。
- `react-hooks/preserve-manual-memoization`：手写 memo/callback 的依赖与编译器推断不一致。

## 待处理范围与验收

- 单独任务修复以上存量问题，保持公告、资产与画布行为；不得为通过检查禁用规则、跳过文件或改生产数据。
- GG-423 单独 typecheck 同时发现 15 个存量类型诊断，位于公告 HTTP、画布页/文本与视频生成器、文本/视频 HTTP 和 creation/http-generation-boundary；本轮不修。实施前按当时基线复核，和测试失败分别记录。
- 同一锁定依赖的独立基线与本轮全量测试都有 26 个相同失败项；GG-423 没有新增失败。完整清单和两边输出在本地 baseline-tests.log / all-tests-final.log；后续复核这些存量测试，不能通过降低检查阈值掩盖。
- 未来验收：针对性行为回归、全量 lint、typecheck、测试与 check:local，分别保存真实结果。
- 本轮证据：outputs/gg423/lint-before.json、lint-after.json、typecheck.log（忽略的本地验证产物，不提交日志）。
- 下一步：用户启动 GG-424 后，从新的确认检查点建立隔离分支，先评估 27 文件的最小修复方案再实施。
