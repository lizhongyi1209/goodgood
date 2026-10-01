# GG-244 — 画布资产 hover 按钮与视频预览

- 状态：开发与代码验证完成，待用户浏览器验收
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
- 已完成：子源提交 `b3f41ea`、测试补充 `b80fa64` 精确回放为 `be84c53`、`9d7d18c`，五个代码文件与子分支一致；24px hover 查看入口、无视频外置标签、节点式卡内/明确视频预览已进入当前 5173。
- 验证：子与根集成目录的播放生命周期定向检查均 9/9；源码/差异审阅通过。稳定源码一次 `npm run check:local` 通过：lint 0 错误/129 条已有警告，类型/构建通过，696 项测试中 674 通过、22 隔离跳过、0 失败。5173 编译模块 HTTP 200 且包含节点式视频预览；没有执行浏览器验收。
- 发布：未发布。

## 并行与 worktree 收口

- 子 agent：`asset_hover`，源码实现；根 agent 负责文档、集成目录、审查、验证及退役。
- 子分支 / 路径：`fix/GG-244-asset-hover-agent` / `F:/goodgood-worktrees/GG-244-asset-hover`，从登记后的本任务检查点创建。
- 文件边界：子 agent 拥有 `features/canvas/canvas-asset-panel.tsx` 与 `features/canvas/canvas-asset-panel.module.css`，另经根批准新增 `features/canvas/canvas-video-preview-playback.mjs`、同名 `.d.mts` 与 `tests/gg244-canvas-video-preview-playback.test.mjs`，用于纯播放生命周期及隔离事件测试。根 agent 拥有任务卡、ADR、专题文档和入口/交接文档。
- 依赖/构建缓存：子 worktree 默认不安装依赖、不构建、不启动服务，不进行浏览器/API/provider 验收；根复用唯一当前集成目录做代码验证。
- 退役条件：子提交已审查并精确集成，确认干净、无运行进程与缓存后使用 `git worktree remove`，再 prune；dirty 不强删。
- 收口：创建 1，退役 1；子目录源码精确集成、完整门禁通过，确认干净、无忽略缓存/运行进程后以 `git worktree remove` 退役并 prune。历史 branch/commit 保留，未安装子依赖或构建。

## 恢复工作

- 尚未完成：用户浏览器验收；代码开发、验证、集成与子 worktree 退役均完成。
- 阻塞/风险：无。
- 下一步：用户刷新资产栏验收 hover 小按钮及节点式视频预览；后续开发保留本检查点。
