# GG-424 — 画布线存量检查错误清理

- 状态：已实现并完成本地门禁；PR #9 的依赖扫描修复待 GitHub CI 复核，不合并、不部署。
- 最后更新：2026-10-10。
- 来源：[GG-423](GG-423-home-design-system.md) 验证与用户选择 1。
- 基线：design/GG-422-design-system / ce86e66447324956c7eb50e41bf011425ad07d1b（已合并 PR #8）。
- 分支 / worktree：fix/GG-424-existing-check-errors / F:/goodgood-worktrees/GG-424。
- 交付：[PR #9](https://github.com/lizhongyi1209/goodgood/pull/9)，目标 design/GG-422-design-system；不合并。

## 63 个 lint 错误 / 27 个文件

ce86e66 同一锁定依赖和 ESLint 配置下为 63 错误 / 172 警告。下列 27 个文件以最小改动修复渲染期 ref、effect 同步状态更新和无法保留的手写 memo；未加入 eslint-disable、未跳过文件、未降低门禁。完成后全量为 0 错误 / 173 警告。

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

## 实施与验收

- 代码与测试提交：16d35c0。63 个 lint 错误清零；15 个类型诊断通过 unknown 响应收窄、可选签名和等价 DOM/BigInt 类型写法清零。
- 原 26 个失败均为已实现能力后的陈旧夹具或断言：Nano Banana 2.1 默认、MOV/WAV、四角缩放、恢复轮询冻结 job、公告运行依赖、首页账户文案等。只同步测试契约，未为测试改变产品行为；全量失败 26 → 0。
- 锁文件提交：307198c 先按本机 npm 11.6.2 执行 lock-only，本机 npm ci 成功；PR CI 的 npm 11.19.0 仍报告缺失两个 1.10.0 节点。随后用 CI 精确版本重跑，同步提交 3d65ef0，明确新增 `@rolldown/binding-wasm32-wasi` 下的 `@emnapi/core@1.10.0` 与 `@emnapi/runtime@1.10.0`，并完成同版本 npm ci。
- CI 依赖扫描修复：1dd180b 对应的第二轮 CI 已通过 `npm ci` 与仓库质量门禁，Trivy 随后报告 8 个已提供修复版本的 HIGH/CRITICAL 项。4986aa4 将 `next` / `eslint-config-next` 提升到 16.3.8、`sharp` 到 0.35.5、`fast-uri` 到 3.1.7，并覆盖 `source-map-js` 1.2.2；同步安全版本固定测试与 npm 11.19.0 锁文件。该提交按当轮报告将 `nodemailer` 提升到 10.0.5，下一轮漏洞库新增 10.0.6 修复要求后再提升一个补丁版本；全程未改业务代码。
- npm run check:local：最终锁文件下复跑通过。lint 0 错误 / 173 警告；typecheck 0 诊断；build:local 通过；测试 1197 项，1171 通过 / 0 失败 / 26 跳过。
- 本地证据在忽略的 outputs/gg424-* 日志中，不提交构建、测试输出或凭据；未操作运行服务、数据库、Provider 或生产。
- 下一步：推送 4986aa4 及本任务记录，等待 PR #9 的 Verify source and image 复核依赖扫描；不合并。
