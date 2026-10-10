# GG-423 首页验证记录

2026-10-10；从 design/GG-422-design-system / 5e404e2 接续。完整 check:local 未通过，用户确认保持首页范围，将存量错误登记 [GG-424](../tasks/GG-424-existing-check-errors.md) 先不修。

## 第二轮截图审查修正（追加第 5 个提交）

从 6828d06 接续，所有已有提交保持。本轮用户再次委托定向门禁、六张整页与手机菜单首屏截图，不改变其他页面或后端。

- 透底诊断：修改前菜单计算背景 rgb(255,255,255)、阴影 rgba(0,0,0,0.06) 0px 8px 24px，均已正确；继承 DropdownMenuContent 的 enter / fade-in-0，持续 0.15s，采样时 opacity 从 0.610395 过渡到 1。旧截图只等待 visible，未等待动画结束。
- 修正：设计系统菜单 opacity=1、animation=none，停用这段淡入淡出；菜单项 focus-visible 不画 outline，data-highlighted 和普通菜单按钮的键盘焦点都用 fill-hover。其余控件的焦点环保留。
- 添加素材按钮为 lucide Plus。手机底栏白底、顶部 line / 1px、固定底部且保留安全区；四项等宽，20px 图标、11px / 16px tab 文字，当前 ink，其余 muted，所有项背景透明；myTab 与其他项共用布局。
- 触屏隐藏 MediaTile 的做同款 / 放大按钮与 TemplateCard 的使用模板覆盖文字；点按格子仍打开预览、预览内保留做同款，整卡使用仍填提示词；失败重试仍显示。390 模板宽 150.42px，按 (358 - 12) / 2.3 计算，下一张部分可见，横向滚动通过。
- 上一轮 token 修正全部保留；33 个新增 token 的名称 / 数值没有变化。home-columns-narrow 的用途更新为手机灵感列数，模板宽独立计算；prompt 行高与 prompt-line-height 仍均为 24px。

| 检查 | 最新结果 |
| --- | --- |
| GG-423 代码 ESLint | 0 错误 / 18 警告 |
| 全量 npm run lint:local | 修正前 / 后均 63 错误、172 警告；27 文件的错误明细完全一致 |
| npm run build:local | 通过，构建时 VITE_GG_HOME_DEMO=true；生产演示区块仍关闭 |
| 首页 / 生产 SSR | 10/10 通过（6 个组件、3 个首页、1 个 SSR） |
| 浏览器与截图 | 六整页 + 一菜单首屏；无页面运行异常、破图或横向溢出；触屏预览 / 整卡使用 / 横滑、菜单 Enter / ArrowDown / Escape / 焦点返回通过 |
| 文档 / diff | documentation-continuity + m8-production-release，16/16 通过；diff 检查通过 |

菜单首屏使用 no-preference 动效环境，等待 document.getAnimations() 中实际有限动画完成及两帧布局稳定，再采集 fullPage=false；菜单及父级 opacity 均为 1，菜单无运行中动画，键盘高亮背景 rgb(239,239,239)、outline-style=none。全部 API 仍在命名的本地浏览器验证中拦截，没有真实生成 / 上传请求，未连接真实数据库或 Worker。

Windows Chrome DevTools（DOM / CSS 协议）逐个核对首页、项目、资产、图片、视频、批量、对话、站长管理：计算 font-weight=500、font-size=14px、line-height=22px；实际中文字体均为 PingFang SC / PingFangSC-Medium，isCustomFont=false，来自本机安装字体。测量符合设计 500；Medium 字形与平台栅格化是视觉偏粗的候选原因（视觉推断，未完成跨平台对照）。建议另行统一包含中文 500 字面的字体资产并比较 Windows / macOS，不在本轮调整字体栈或字重。

最新文件在 outputs/gg423/screenshots/，旧截图保留为历史：

| 宽度 | 开关关闭整页 | 开关开启整页 |
| --- | --- | --- |
| 1440 | home-review-demo-off-1440.png | home-review-demo-on-1440.png |
| 1024 | home-review-demo-off-1024.png | home-review-demo-on-1024.png |
| 390 | home-review-demo-off-390.png | home-review-demo-on-390.png |

手机菜单首屏：home-review-my-menu-first-screen-390.png（390 × 1000）。证据使用 review- 前缀，诊断原始采样为 review-diagnosis-before.json。截图是忽略的本地产物，不提交图片或日志。

本轮没有重复全量 typecheck、全量测试或完整 check:local，首次交付的存量失败记录继续保留。完整门禁仍被 63 个 lint 错误阻止；推送后更新 PR #8，目标 design/GG-422-design-system，不合并。

## 合并前修正（追加第 4 个提交）

2026-10-10，修正前 HEAD 为 f890c3c。原三个提交保留，在同一功能分支追加；不改变功能行为或其他页面。

| 检查 | 本次修正结果 |
| --- | --- |
| GG-423 改动文件 ESLint | 0 错误 / 18 警告；检查首页、共享组件及既有 GG-423 测试，无规则变更 |
| 全量 npm run lint:local | 修正前 / 后均 63 错误、172 警告；27 个文件的规则、行号和错误消息完全一致 |
| 文档测试 | documentation-continuity + m8-production-release，16/16 通过 |
| npm run build:local | 通过，构建时 VITE_GG_HOME_DEMO=true；生产 SSR 仍不显示演示区块 |
| 首页及 SSR 测试 | gg423-design-system 6/6、gg423-home 3/3、rendered-html 1/1，共 10/10 |
| 390 手机截图与键盘 | 四个底栏按钮等宽、高 56px、同字体和布局；myTab 样式生效，2px 焦点 / 2px 偏移保留，Enter 打开账户菜单、Escape 恢复焦点 |
| 响应间距 | 手机 390 与中屏 1024 的 start、templates、discovery 上间距均为 56px，无横向溢出或破图 |
| JSON / CSS token | 新增 2 个、累计 33 个；全部既有值保留，无重复名称；prompt-line-height 与 prompt 文字样式均为 24px |

新截图在同一忽略的本地 outputs/gg423/screenshots/：home-correction-on-390.png（带「我的」键盘焦点）、home-correction-my-menu-390.png（账户菜单打开）。使用全新浏览器上下文与隔离 Vite 55124，全部 API 本地拦截，未请求真实生成或上传；原始六截图仍保留。证据文件使用 correction- 前缀，与首次交付记录分开保存。

本轮只重跑用户指定的 lint、文档、build、首页测试与截图，不重复全量 typecheck、全量测试或完整 check:local。完整门禁仍因存量 lint 未通过；以下首次交付的类型与全量测试失败记录继续有效，不将其写成通过。正常推送第 4 提交后更新 PR #8 说明，目标 design/GG-422-design-system，不合并。

## 首次交付分项结果

- 改动代码单独 ESLint：0 错误 / 18 警告。全量：改前 63 错误 / 165 警告，改后 63 / 172。27 文件的错误规则、行号与源码均相同；没有忽略文件、禁用规则或降低阈值。
- npm run typecheck：15 个诊断，和独立基线检查逐字相同；本轮无新增诊断。
- npm run build:local：通过。构建时额外设置 VITE_GG_HOME_DEMO=true，生产 SSR 仍为 off；首页演示不显示。
- 构建后 node --test tests/*.test.mjs：1197 项，1145 通过 / 26 失败 / 26 跳过；独立基线 1188 项，1136 / 26 / 26。失败名称集合完全一致，没有新增失败。9 个 GG-423 检查和 1 个 SSR 首页、/create、登录回归通过。
- 文档测试 16/16 与 diff 检查通过；AGENTS 166 行、BACKLOG 89 行，均在上限内。

## 浏览器验收

使用本任务独立 Vite 55123/55124 与全新无用户数据浏览器上下文；所有 /api 请求由浏览器测试拦截，不接数据库、队列或真实 Provider，生成/上传故障均为命名的本地验证结果。账户为 example.test 合成身份，图片为独立示例图库；来源和许可记录在 public/home-demo/provenance.json。没有生产访问或真实计费请求。

- Enter 只提交一次，Shift+Enter 换行、IME Enter 不提交；图片模型、分辨率、数量、比例沿原默认值，失败保留输入。
- 图片/视频导航进入原生成视图并切换模式；视频走既有视频预览接口，不走图片 API。
- 账户和素材菜单支持 Enter、方向键、Escape，关闭后焦点返回；个人信息继续打开原账户管理弹框。
- 上传失败禁用生成、支持重试和移除；素材选择/链接沿原资产与上传边界。
- 手机「我的」分别核对站长、企业、分销商、普通成员权限与焦点；没有增加管理权限。
- 模板只填提示词，灵感按分类筛选/打开预览；Escape 返回原卡片焦点，做同款回到输入；对话只在本地记录，不请求生成。
- 所有图标按钮保留无障碍名称；预览使用 Radix 焦点管理。另核对手机连续 10 次 Tab 的控件名称、2px 焦点描边与 reduced motion 的 0s 过渡；触控下图片动作可用。11 组浏览器检查通过，无页面运行异常。

## 六张截图

文件在本 worktree 的 outputs/gg423/screenshots/（忽略的本地验收产物，不提交日志或截图）。1440/1024/390 三种宽度均无横向溢出或破图；390 以触控移动上下文检查。长页面截图中的固定底栏位于采集时视口底部。

| 宽度 | 关闭 | 开启 |
| --- | --- | --- |
| 1440 | home-demo-off-1440.png | home-demo-on-1440.png |
| 1024 | home-demo-off-1024.png | home-demo-on-1024.png |
| 390 | home-demo-off-390.png | home-demo-on-390.png |

视觉复核按 Impeccable 收尾清单由根 agent 执行，最终 disposition: ship。以已确认的 home.md 与组件规格为准；中性界面、黑色主操作、蓝色积分、真实图片比例和响应布局保持，未迁移其他页面。

## 核查结果与下一步

- GG-073 灵感已在 GG-117 / ADR 0104 退役，当前无真实灵感组件/API；沿确认计划开发开关展示独立示例，不恢复旧后端。模板数据也在单独文件，并注明后续换接口。
- GG-340 公告仍有真实功能，不放进演示开关；沿原认证和权限显示。
- GitHub design/GG-405-design-system-docs 已不存在，本轮无需再删。
- 完整门禁失败、类型失败、测试失败均为独立状态。PR 目标 design/GG-422-design-system，当前仅交付代码与验证，不合并/部署；随后单独安排 GG-424。
