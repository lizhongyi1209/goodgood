# GG-231 · 画布选框实线与图片外侧轮廓重合

- 日期：2026-09-30。
- 状态：隔离实现 `a4b2928` 已精确回放 GG-116/5173，静态审阅/diff 检查通过；待站长手验，未部署。
- 用户需求：完成框选后的点状外框改为实线，线宽与图片选中轮廓相同；共用外侧直边准确重合。
- 来源：站长截图 `ScreenShot_2026-09-30_175945_799.png`；位置根因以实际 React Flow/CSS 源码确认。
- 隔离：从 verified `05e90d2f6fff2b9062f4b9a8fcd1286eb246e956` 新建 `F:/goodgood-worktrees/GG-231` / `fix/GG-231-canvas-selection-border`，已核验 `ba9a947` 为其祖先。复制当前 CSS/设计/ADR 三个相关文件为明确基线 `2fc5712`，只回放此基线之后的精确任务差异。
- 决策：实施前补充 [ADR 0110](../decisions/0110-canvas-image-selection-frame.md#gg-231-addendum--solid-selection-outline-at-the-media-edge-2026-09-30)；仅更新选框绘制方式。

## 范围与验收

最终多选外框使用 `1px solid #3b82f6`、零偏移外侧 outline，与已选中媒体在共同直边处重合；取得焦点时仍显示。拖动中的临时框也为 1px 实线，保持原有颜色和半透明填充。外框继续包含上方 metadata 与可见批次，因此顶部不必与图片顶边重合。

媒体宽高、圆角、metadata/批次几何与过渡并集、React Flow 原生范围框 transform/useDrag/键盘及工具栏位置沿用现有实现。只修改局部 CSS 绘制，不增加几何 padding、状态或菜单。

## 静态根因

`node_modules/@xyflow/react/dist/style.css` 默认选框是 `1px dotted rgba(0, 89, 220, 0.8)`。`app/globals.css` 全局 `box-sizing: border-box` 使选框的 1px border 画在范围框内；媒体 `outline: 1px solid #3b82f6; outline-offset: 0` 画在媒体范围外，同一几何直边的描边中心相差 1px。GG-222 写入的可见范围宽高已经与媒体/metadata 的范围一致，不应改其算法。

React Flow `NodesSelection` 挂载即 focus，并以 vendor `:focus`/`:focus-visible` 规则清除 outline；局部规则须显式覆盖这两个状态。其父节点仍承担 pan/zoom 与 body 位移 transform，子范围框继续使用原 width/height 和 `useDrag`，外侧 outline 不参与盒尺寸。

## 验证与交接

沿用站长持续限制，只允许静态源码审阅和精确 diff 检查；不运行 tests/check:local/typecheck/build/浏览器/CUA/provider/上传或服务操作。本次低影响样式不编写镜像样式测试。尚未进行运行或视觉验收；隔离基线来自 verified05e90d2，本任务未改后端。交付时另一窗口已接续 GG-226 verified70e10c6、56 迁移，当前运行事实以 DEVELOPMENT_HANDOFF 顶部为准，生产未变。

实现：CSS 只新增九行，临时框仅覆盖 `border-style: solid`，最终框在默认、`:focus` 和 `:focus-visible` 状态下统一零边框及一像素外侧 outline。未改 controls 或其他 React Flow 行为源。设计仅增加一个 GG-231 段落，ADR 0110 仅追加本次决定。

静态验证：隔离差异限定为 CSS/设计/ADR/本任务四文件；`git diff --check` 通过。最终描边与媒体描边使用同一 `1px solid #3b82f6` / `outline-offset: 0`；焦点选择器含局部 canvas 前缀，优先级高于 vendor 清除规则。无运行验证。

交付：仅 `2fc5712` → `a4b2928` 的四文件任务增量经 `git apply --check` 后精确回放 GG-116。实际预览 CSS 与隔离实现一致；反向 patch 预检及回放后的限定 diff 检查通过，其他窗口改动保留。未重启服务、改写数据库或部署。

下一步：站长手验缩放、框选完成/焦点、共同直边重合，以及原整体拖动和排列工具栏。
