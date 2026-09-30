# GG-223 展开侧栏取消额外悬停文字

- 日期：2026-09-30
- 状态：本地实现/精确合入完成；专项与构建通过，全门禁保留原画布类型缺口，未部署。
- 分支 / worktree：`fix/GG-223-expanded-sidebar-hover` / `F:/goodgood-worktrees/GG-223-sidebar-hover`
- 基线：当前共享壳层adb0ca0，verified05e90d2为祖先；基线主页与当前GG-116相同。
- 决策：[ADR0118补记](../decisions/0118-expanded-desktop-sidebar-home.md)

## 范围与验收

展开侧栏鼠标hover不显示额外文字浮层；常驻名称、ARIA、键盘焦点、Home、点击/角色权限、资产提醒及账户菜单保持。只编辑app/page.tsx，不改公共Tooltip组件/CSS、独立画布GG222或服务。当前无折叠状态，不新增开关/偏好。

## 实现与证据

- 前端子agent删除仅侧栏SidebarTooltip包装/函数、TooltipProvider及闲置导入，保留原button/link/DropdownMenuTrigger。根审阅后精准patch单文件到GG-116，未整树合入；回放前备份%TEMP%/goodgood-gg223-integration。
- 导航/权限/积分/平台币退役与文档检查20/20通过；build:local、diff检查通过。当前5173主页模块200，无SidebarTooltip或sidebar-tooltip残留，Home保持。未浏览器视觉验收、provider请求、数据库写入或服务重启。
- 一次check:local：lint0错误/116警告，类型检查仍受原canvas-project-local.ts:21,35 Promise类型错误阻塞。该文件与修改前adb0ca0完全一致，未编辑画布；不宣称完整门禁通过。日志%TEMP%/goodgood-gg223-{check,build}.log（UTF16LE）。
- 应用户询问已只读核对图标来源：主要功能与发送图标使用lucide-react，积分为Zap的样式封装，G与模型Logo为独立品牌素材；UI组件复用shadcn/Radix。本任务未调整任何图标尺寸或线宽。

## 恢复工作与下一步

下一步站长刷新5173手验展开侧栏hover及账户菜单。画布会话独立处理原IDB类型缺口后再恢复全门禁。本任务无待实现功能，后端verified05e90d2/55迁移不变，生产未部署。
