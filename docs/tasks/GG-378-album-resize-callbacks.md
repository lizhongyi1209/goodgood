# GG-378 · 修复相册伸缩回调缺失

- 日期：2026-10-05；用户报告 `startResize is not defined`，要求修复。
- 基线：042ffdf4ad19bc2b3a611f50010e2313639625c0，GG-377源码f1119dd祖先已核验；集成目录F:/goodgood-worktrees/GG-116。
- 决策：修复GG-377遗漏，不改变已确认的ADR0135手动伸缩行为或样式，无新ADR。
- 原因：相册NodeResizeControl已引用startResize、finishResize和resizeWithKeyboard，但组件没有声明这些回调；选中后读取引用直接抛错。
- 范围：补齐三个处理函数，复用普通组稳定回调、历史捕获和手动尺寸保存；键盘继续10px/Shift50px及既有相册几何。
- 所有权：根agent单独实现codex/GG-378-album-resize-callbacks，C:/Users/Admin/.codex/worktrees/gg-378-album-resize-callbacks/goodgood；创建1，无子agent/依赖缓存。
- 验收：刷新原画布，选中旧/新/空相册不再出现未定义错误；四角连续伸缩、方向键/Shift、历史及保存刷新仍正常。
- 协作约定：沿GG-276仅源码开发和精确集成，不运行构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，不更新后台/服务/生产或提交生成/扣费；GG-374运行receipt保持未重查。
- 状态：源码已精确接入28431236bb8800a26fe5b7f26b8f5802908e103f，未自动验收、未部署。
- 下一步：用户刷新5173手验相册选中及四角伸缩、键盘与保存恢复。

## 当前交付

GG-378相册伸缩回调修复已精确接入28431236bb8800a26fe5b7f26b8f5802908e103f（隔离440879109a385c491adfb746a88e4074a3085109）。用户手验发现GG-377选中相册即startResize未定义，源码确认开始/结束/键盘三项回调均遗漏声明；本次补齐稳定原生回调、历史捕获、manual标记和结束宽高/style同步保存，方向键仍复用既有相册几何10px/Shift50px。不改变ADR0135决定或外观、素材及候选边界，无新后台字段。GG-377任务补缺陷更正，错误和用户手验记录同步。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费、服务或生产操作，GG-374运行receipt保持未重查。创建1/退役1，managed辅助已确认归档，无子agent/依赖缓存。源码已补齐、未自动验收、未部署；用户刷新5173手验相册选中、四角持续伸缩、键盘及保存恢复。下一源码任务从当时HEAD核验2843123祖先后隔离。

## GG-379后续事件

用户在GG-378交付后报告画布丢失。GG-379现场证据确认热更新随后171空状态误保存，并从浏览器170历史快照恢复独立17节点/5边副本；保存保护由GG-379补齐。前文未自动验收事实保持，见[GG-379](GG-379-canvas-data-loss.md)。
