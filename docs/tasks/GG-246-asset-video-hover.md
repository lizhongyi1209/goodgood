# GG-246 — 大厅资产页视频 hover 预览

- 日期：2026-10-01
- 状态：已登记子 agent 实施中；尚未接入实际 5173、尚未完整验证、未部署。
- 用户要求：资产页视频默认不播放，仅鼠标 hover 时播放，画面中央默认显示播放图标；代码开发与验证由 agent 完成，浏览器及产品验收由用户完成。
- 决策：ADR 0121 修订 ADR 0106 的可见即播放规则；本任务只调整大厅 `/assets` 的视频卡片。

## 范围与验收

1. 网格与列表视频缩略图默认暂停，并有居中播放图标。
2. 真实鼠标进入视频预览区域后静音循环；移开、离屏、页面隐藏、禁用或卸载时暂停。减少动态效果设置继续抑制自动预览。
3. 仅在视频真正播放时隐藏图标；加载、暂停及播放失败时保留图标，不泄露未处理的 play Promise。
4. 保留尺寸比例、选择、菜单、点击打开明确预览、触屏及键盘交互；不修改独立画布资产组件、上传接口或数据模型。
5. 测试覆盖默认状态、进入/离开、延迟加载/异步播放、失败与清理等适用生命周期；最终运行一次 `npm run check:local`。

## 协作与目录登记

- 根负责人：`/root`；分支 `fix/GG-246-asset-video-hover`；目录 `F:/goodgood-worktrees/GG-246-assets`。
- verified 基线：`86ee3b7fe1e496f4183fdfe1a175d1f480750916`，已核验为当前实际 5173 HEAD 的祖先；不从旧根目录或 parked C6 起步。
- 子负责人：`/root/asset_video_hover`（已启动）；分支 `fix/GG-246-asset-video-hover-agent`；目录 `F:/goodgood-worktrees/GG-246-assets-agent`。
- 子文件边界：`features/assets/asset-workspace.tsx`、`features/assets/asset-workspace.module.css`；必要的小型资产预览生命周期模块及其声明、`tests/gg246-asset-video-hover.test.mjs`。不得改 `features/canvas/`、共享文档、其他测试或依赖。
- 根负责 ADR、相关文档、审查、真实 5173 集成、代码验证与目录退役。另一会话 GG-244/GG-245 当前拥有画布源码及活动目录中的未提交文档，根不得覆盖。
- 子 worktree 默认不安装依赖、不完整构建、不启动服务；完整门禁仅在活动集成目录运行。
- 退役条件：已提交且精确集成，状态干净，无进程使用目录；以 `git worktree remove` 无 force 退役并保留分支历史。辅助根目录也在收口后退役。

## 当前证据与下一步

- 实际预览源：`F:/goodgood-worktrees/GG-116`，Vite 5173；GG-244 画布会话 HEAD `9d7d18c`，其门禁与文档收口进行中。
- 当前大厅视频组件由 IntersectionObserver 可见性直接触发播放；默认中心图标缺失。
- 下一步：子实现 hover 生命周期、默认图标与定向测试；根已审阅原接线并补相关文档，随后将本任务差异精确接入实际运行目录并验证。
- 本任务创建辅助目录 2，退役 0；未产生依赖/构建缓存。F 盘创建根目录后可用 `75,707,498,496` bytes。
- 未执行浏览器验收、真实 provider 调用、数据写入或生产部署。
