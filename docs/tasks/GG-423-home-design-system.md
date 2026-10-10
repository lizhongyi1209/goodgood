# GG-423 — 首页设计系统实现

- 状态：需求与计划已确认；决策/范围记录完成，界面和接线实施中。
- 最后更新：2026-10-10。
- 基线：design/GG-422-design-system / 5e404e267cc7e1b3692ca7fe29704923e8a25b76。
- 分支 / 根集成 worktree：feature/GG-423-home-design-system / F:/goodgood-worktrees/GG-423-home-design-system。
- 决策：[ADR 0144](../decisions/0144-design-system-v3.md) 已接受，ADR 0002 被取代，ADR 0105 的积分配色限制更新。

## 范围与顺序

1. 先界面：14 个可复用展示组件、首页桌面/图标侧栏/手机底栏、无参数 Composer、模板/灵感预览。
2. 后功能：同一任务接回已有导航、账户菜单、素材上传/重试、图片及视频生成；图片/视频侧栏进入现有生成视图并切换模式。
- 新首页在已有 / 入口，生成视图继续 /create；不新增批量/对话路由，不改变画布、资产、项目、站长等其他页面样式，不新增后端接口。
- 首页参数来自现有默认/最近设置，提交后进入现有生成视图；素材在提示词上方，向上箭头发送，不展示参数抽屉。
- 手机「我的」沿用账户菜单，按身份收入站长、企业及分销管理。

## 开关与既有功能核查

- 单开关 VITE_GG_HOME_DEMO；默认 false，仅 import.meta.env.DEV 且值为 true 时开启，生产构建强制 false。
- 关闭：常用模板、灵感示例、批量/对话入口及 Composer 对话模式完全不渲染。
- 开启：本地独立 home-demo-data.ts 的模板/灵感及批量/对话展示；只做本地浏览、筛选、填入提示词，不自动生成、不调用不存在的接口。文件注明以后替换为真实接口。
- 灵感检查：GG-073 已由 GG-117/ADR 0104 退役，当前无可执行组件/API；沿确认计划用开发开关示例，不恢复旧系统。
- 公告检查：GG-340 已实现 AnnouncementCenter 和真实公告 API；沿用现有权限与行为，不加入开关。
- 本地打开：PowerShell 设置 $env:VITE_GG_HOME_DEMO = "true" 后 npm run dev:local；改 false 并重启关闭，不提交 .env 文件。

## 提交与验收

- 三个提交：① ADR / AGENTS / 任务卡等文档；② features/design-system 组件与 token；③ 首页、现有功能接线、相关测试及最终验收记录。
- npm run check:local；新增验证开关默认/开发/生产组合、IME/Enter/Shift+Enter、素材状态与权限菜单，现有业务回归保留。
- 六张截图：demo on/off × 1440/1024/390；键盘 Tab、方向键、Escape、焦点返回、名称和 reduced motion 核对。
- 截图与合成验证不连接真实 Provider Worker 的数据库/队列、不提交计费请求；不修改生产数据或服务。
- 完成后推送，开 PR 目标 design/GG-422-design-system，不合并、不部署；完成汇报逐条列出新增/修改 token 名称和值。
- 验证结果、截图路径、提交和 PR 收据待实施后填写。

## worktree 与恢复

- 根 agent 单独拥有上述目录，创建 1、退役 0；无子 agent，根 skills/配置、GG-116 运行目录及其他未提交路径不动。
- 本根集成目录安装锁定依赖用于明确要求的完整门禁与截图，结束后记录缓存收口；不复制凭据或用户资产。
- 下一步：提交决策文档，完成共享组件，然后接首页和既有行为，验证后交付三个提交与 PR。
