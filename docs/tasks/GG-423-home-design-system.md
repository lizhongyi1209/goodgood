# GG-423 — 首页设计系统实现

- 状态：已实现；分项验证与截图完成，按用户确认的存量失败例外交付。完整 check:local 未通过；未合并、未部署。
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
- 提交 ① 8b9601e（决策文档）；② 0dc2a22（共享组件及 token）；③ 首页/接线/最终记录，最终 SHA 以本分支 HEAD 与 GitHub PR 提交列表为准，保持恰好三提交。
- 交付分支 feature/GG-423-home-design-system；PR 目标 design/GG-422-design-system。[分支对比](https://github.com/lizhongyi1209/goodgood/compare/design/GG-422-design-system...feature/GG-423-home-design-system)，实际推送和 PR 链接随本次交付回报核对。
- 新增 31 个 token，既有值无修改：[逐项名称和值](../design/home-token-changes.md)。

## 验证结果（2026-10-10）

| 检查 | 结果 |
| --- | --- |
| 本轮新增/修改代码单独 lint | 0 错误 / 18 警告（含改动前 app/page 的既有警告）；未禁用规则 |
| 全量 lint 前后 | 63 / 63 错误；165 / 172 警告；27 文件及错误规则/行号完全一致，源码未修改 |
| npm run check:local | 未通过，在存量 lint 停止；用户确认本轮不修，见 [GG-424](GG-424-existing-check-errors.md) |
| npm run typecheck | 未通过，15 个存量诊断；与 5e404e2 的独立基线检查完全一致，本轮无新增诊断 |
| npm run build:local | 通过；即使 VITE_GG_HOME_DEMO=true，生产 SSR 仍为 off、不显示演示内容 |
| node --test tests/*.test.mjs（构建后） | 总计 1197：1145 通过 / 26 失败 / 26 跳过；基线 1188：1136 / 26 / 26；同一 26 个失败项，无新增失败 |
| 首页针对性及 SSR 回归 | 10/10 通过（其中 9 个 GG-423 检查和 1 个 SSR 首页/现有生成/登录回归） |
| 浏览器与截图 | 11 组真实键盘/接线检查通过；六截图无横向溢出、破图或页面运行异常；未向真实 Provider 发请求 |

- 详细证据与截图文件名：[首页验证记录](../design/home-verification.md)。图片比例按示例文件实际尺寸核对；模板封面按设计采用 4:3。
- 库存 lint、类型与测试失败分别记录，不把构建成功或用户的例外交付确认写成完整门禁通过。

## worktree 与恢复

- 根 agent 单独拥有上述目录，创建 1、退役 0；无子 agent，根 skills/配置、GG-116 运行目录及其他未提交路径不动。
- 本根集成目录 npm ci 安装锁定依赖，用于用户要求的完整门禁与截图；保留这个当前集成目录及依赖供 PR 审阅。基线归档只用于独立对照检查，临时目录和依赖 junction 验证后清理，不保留备份副本。
- 两个隔离 UI 预览使用 55123/55124，所有 API 由浏览器本地拦截；交付前停止本轮预览。原 5173/32131/32142 运行目录、服务与数据不动；不复制凭据或用户资产。
- 2026-10-10 门禁：首次 check:local 在全量 lint 停止，63 个存量错误分布于 27 个未修改文件。用户确认 GG-423 不修这些文件，另建任务卡记录；交付必须单独验证本轮 lint 为 0 错误、全量前后仍 63，并分别报告 typecheck 和测试结果。
- 下一步：审阅 GG-423 PR 和六截图；合并/部署需另行委托。GG-424 只登记，后续单独安排存量检查错误修复。
