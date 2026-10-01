# GG-262 · 统一资料行内编辑布局

- 日期：2026-10-01；状态：已登记，开发中，未部署。
- 范围与验收：修复用户名编辑滚动条/挤压，参考 CodeFronts Inline Edit Field 的稳定行内布局，使用透明背景和下划线；文字区域/图标占位固定，编辑/确认/加载图标统一 14px，沿用外部取消和明确确认保存、下方规则预留空间。
- 决定：GG-259 的布局修复，不改变内容编辑/取消/保存、随机 ID 或头像限制等已确认行为；无需新增 ADR。
- 参考：https://codefronts.com/components/tailwind-css-input-fields/tailwind-inline-edit-field/；详细页访问受限，已读取站点集合页的同组件说明（data-editing 控制统一状态）。不复用其 blur/Enter 自动保存行为。
- 分支 / worktree：根负责 `fix/GG-262-profile-inline-edit-layout` / `F:/goodgood-worktrees/GG-262-profile-inline-edit`，基线 `c0d8d08` 含 GG-260/261 已交付来源/明细；实际 5173 在 GG-116，不切换其分支。
- 文件边界：features/profile/personal-information.tsx / module.css、必要既有 SSR 断言和本卡；共享文档整合后收口，保护并行积分/免费额度源码。
- 实现与证据：现有 contenteditable 按文字收缩且 overflow-x:auto，使 Windows 滚动条占据高度；改稳定网格文字区/操作区，隐藏溢出但保持文字可编辑，无底部按钮或输入框。
- 验证：仅相关资料 SSR/编辑流程、局部 lint、diff 与实际 Vite 模块编译；不做浏览器验收、全量构建/门禁、数据库迁移或真实上传/生成。
- 恢复工作：创建 1 计划中/退役 0；辅助目录不安装依赖/产生构建缓存，精确整合后 clean/进程/路径核对并 Git 退役。
- 下一步：隔离实现、精确回放、定向验证和文档/目录收口，交用户刷新验收。
