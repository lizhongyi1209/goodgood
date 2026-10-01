# GG-244 — 画布资产 hover 按钮与视频预览

- 状态：实施中
- 用户需求：交给子 agent；画布打开资产后，图片与视频右上按钮仅 hover 出现并稍小，去掉视频下方文字，保留 hover 播放；预览样式参考画布视频节点。
- 最后更新：2026-10-01
- 分支 / worktree：`fix/GG-244-canvas-asset-hover` / `F:/goodgood-worktrees/GG-116`
- 基线：已通过共同代码门禁的 GG-242/GG-243 `86ee3b7fe1e496f4183fdfe1a175d1f480750916`

## 范围与验收

- 图片和视频资产卡右上查看按钮缩小，桌面仅指针 hover 显示；保留键盘 focus-visible 和无 hover 设备的可访问入口，鼠标点击后的普通 focus 不让按钮常驻。
- 去掉视频卡外侧「视频」文字；重命名输入、加载和错误/重试提示保留。
- 视频卡及明确打开的视频预览采用现有画布视频节点的完整比例、播放覆盖层/时长样式；hover 静音循环播放，离开、隐藏页面或卸载暂停，减少动态偏好不自动播放。
- 原图片查看器、拖入、改名、文件夹、私有素材 URL 和失败恢复保持既有路径。
- 决策影响：取代 GG-238 图片按钮常驻样式，接受 [ADR 0120](../decisions/0120-canvas-asset-hover-video-preview.md)；不修改节点、数据或路由契约。
- 分工：agent 完成开发、代码验证与集成，用户完成浏览器和预期验收；不发布、不代发上传/生成，不操作真实项目数据。

## 实现与证据

- 初始检查：资产面板图片按钮为 28px 常驻，视频只有静态首帧且下方显示「视频」；画布视频节点已有 hover 静音播放及播放/时长覆盖样式。
- 已完成：基线祖先及干净状态核对，独立任务分支，范围与 ADR。
- 验证：尚未执行本任务代码验证；集成后执行相关定向检查及一次 `npm run check:local`，不执行浏览器验收。
- 发布：未发布。

## 并行与 worktree 收口

- 子 agent：`asset_hover`，源码实现；根 agent 负责文档、集成目录、审查、验证及退役。
- 子分支 / 路径：`fix/GG-244-asset-hover-agent` / `F:/goodgood-worktrees/GG-244-asset-hover`，从登记后的本任务检查点创建。
- 文件边界：子 agent 拥有 `features/canvas/canvas-asset-panel.tsx` 与 `features/canvas/canvas-asset-panel.module.css`；如需小型视频组件/播放 helper 与行为测试，先报告具体文件。根 agent 拥有任务卡、ADR、专题文档和入口/交接文档。
- 依赖/构建缓存：子 worktree 默认不安装依赖、不构建、不启动服务，不进行浏览器/API/provider 验收；根复用唯一当前集成目录做代码验证。
- 退役条件：子提交已审查并精确集成，确认干净、无运行进程与缓存后使用 `git worktree remove`，再 prune；dirty 不强删。
- 收口：计划创建 1，实际创建/退役数待记录。

## 恢复工作

- 尚未完成：子实现、集成与代码验证、子 worktree 退役；用户后续浏览器验收。
- 阻塞/风险：无。
- 下一步：创建已登记子 worktree 并委托上述源码范围。
