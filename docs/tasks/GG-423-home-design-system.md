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

- 原三个提交：① ADR / AGENTS / 任务卡等文档；② features/design-system 组件与 token；③ 首页、现有功能接线、相关测试及最终验收记录。用户随后要求追加第 4 个 token 修正及第 5 个截图审查修正提交，所有已有提交保持。
- npm run check:local；新增验证开关默认/开发/生产组合、IME/Enter/Shift+Enter、素材状态与权限菜单，现有业务回归保留。
- 六张截图：demo on/off × 1440/1024/390；键盘 Tab、方向键、Escape、焦点返回、名称和 reduced motion 核对。
- 截图与合成验证不连接真实 Provider Worker 的数据库/队列、不提交计费请求；不修改生产数据或服务。
- 完成后推送，开 PR 目标 design/GG-422-design-system，不合并、不部署；完成汇报逐条列出新增/修改 token 名称和值。
- 提交 ① 8b9601e（决策文档）；② 0dc2a22（共享组件及 token）；③ f890c3c（首页/接线/首次记录）；④ 6828d06（token 与手机底栏修正）；⑤ 本分支最新 HEAD（截图审查修正）。只追加，不 amend 或重写历史。
- 交付分支 feature/GG-423-home-design-system；[PR #8](https://github.com/lizhongyi1209/goodgood/pull/8) 目标 design/GG-422-design-system，只更新说明，不合并。
- 累计新增 33 个 token，既有值无修改：[逐项分组、名称、值与用途](../design/home-token-changes.md)。

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

- 第二轮截图审查修正（从 6828d06 追加，不重写历史）：手机菜单透底已复现为继承的 150ms 淡入动画中途 opacity<1，白底与 shadow-md 原本正确；本轮停用设计系统菜单淡入淡出，菜单键盘高亮改为 fill-hover、无外框，添加素材使用 Plus。底栏补顶部 line、当前项无底色块；触屏隐藏卡片悬停动作、保留格子预览/整卡使用及失败重试，模板宽按 2.3 张视区。上一轮 token 修正已在基线，全部核对保留，不重复新增。
- DevTools 最终记录：八个侧栏导航项均为 500、14px / 22px；CSS.getPlatformFontsForNode 报告实际中文字体 PingFangSC-Medium（本机安装字体、非 Web font）。Medium 字形和 Windows 栅格化差异是视觉偏粗的候选原因，尚未做跨平台字体对照；建议后续单独统一中文 500 字面并比对 Windows / macOS。本轮不改字体栈或字重。
- 第二轮验证：GG-423 lint 0 错误 / 18 警告；全量前后 63 / 63 错误、172 / 172 警告，27 文件错误明细完全一致；docs 16/16、build 与首页 / 生产 SSR 10/10 通过，七张新截图和点按 / 菜单键盘检查完成。精确记录见 [验证记录](../design/home-verification.md)。推送后更新 PR #8，不合并；不重复全量 typecheck、全量测试或完整 check:local，存量失败记录保留。

- 合并前修正（2026-10-10）：新增 space-14=56px、control-check=22px，移除 JSON 的 homepage 分组并逐项说明用途；Tooltip 同步从 motion 读取延迟，prompt-line-height 保持与 prompt 行高一致。rail/mobile 的三个区块上间距使用 space-14，媒体选择使用 control-check，隐藏标签直接使用 1px；底栏自动均分列并补齐 myTab。未改变已接受的 ADR 或功能行为，不新增 ADR。
- 修正验证由用户明确委托并已完成：GG-423 文件 lint 0 错误 / 18 警告；全量修正前后 63 / 63 错误、172 / 172 警告，27 文件错误明细一致；文档测试 16/16、build 通过、首页及生产 SSR 回归 10/10，390 截图与「我的」Enter/Escape/焦点返回通过，中屏/手机三个区块间距均为 56px。详见 [验证记录](../design/home-verification.md)。本轮不重复全量 typecheck、全量测试或完整 check:local，上一轮存量失败记录保留。第 4 提交正常推送后更新 PR #8 说明，SHA 和远端核对随最终交付回报。

- 根 agent 单独拥有上述目录，创建 1、退役 0；无子 agent，根 skills/配置、GG-116 运行目录及其他未提交路径不动。
- 本根集成目录 npm ci 安装锁定依赖，用于用户要求的完整门禁与截图；保留这个当前集成目录及依赖供 PR 审阅。基线归档只用于独立对照检查，临时目录和依赖 junction 验证后清理，不保留备份副本。
- 两个隔离 UI 预览使用 55123/55124，所有 API 由浏览器本地拦截；交付前停止本轮预览。原 5173/32131/32142 运行目录、服务与数据不动；不复制凭据或用户资产。
- 2026-10-10 门禁：首次 check:local 在全量 lint 停止，63 个存量错误分布于 27 个未修改文件。用户确认 GG-423 不修这些文件，另建任务卡记录；交付必须单独验证本轮 lint 为 0 错误、全量前后仍 63，并分别报告 typecheck 和测试结果。
- 下一步：审阅 GG-423 PR 和六截图；合并/部署需另行委托。GG-424 只登记，后续单独安排存量检查错误修复。
