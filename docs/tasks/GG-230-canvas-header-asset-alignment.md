# GG-230 · 画布头部与资产标题对齐

- 日期：2026-09-30。
- 状态：隔离实现 8e2201e 已精确回放 GG-116/5173；静态检查通过，待站长手验，未部署。
- 来源：站长截图 ScreenShot_2026-09-30_174510_143.png 显示左侧资产标题高于右侧画布头部，明确要求右侧整体上移。
- 决策：修复既有紧凑头部的垂直坐标缺陷，保留 GG-219 尺寸及 GG-151 资产侧栏规则，无新 ADR。
- 隔离：从已验证运行检查点 05e90d2f6fff2b9062f4b9a8fcd1286eb246e956 建立 F:/goodgood-worktrees/GG-230-header / fix/GG-230-canvas-header-asset-alignment；ba9a947 和当前预览 HEAD efb72d9 祖先已核验。仅将 GG-116 当前 page CSS 与设计文档保存为明确基线 908f1ba，不整树合并。

## 范围与验收

静态盒模型：全局 border-box；资产侧栏顶端为 y=0，标题栏 height:51px、上下 padding:0、仅底边框 1px，因此 align-items:center 的内容中心为 (51−1)/2=25px。画布默认头部 top:20px、min-height:36px、align-items:center，现有控件均不超过最小高度，因此单行中心为 20+36/2=38px。默认 top 改为 7px，将 Logo、画布名、页签、保存状态和积分整排上移 13px，中心为 25px。

只改默认头部 top，打开/关闭资产侧栏不切换垂直位置，侧栏宽度只继续影响既有横向避让。字体、图标、入口尺寸、页面功能、侧栏拉伸、GG-228 文本选择保护及 GG-229 排列样式保持。980px 换行规则及 560px 手机 top:12px 覆盖原样保留。

## 验证与交接

按站长持续指示不复测：仅静态源码、单项差异与 git diff --check；未运行测试/check:local/类型检查/构建/浏览器或 CUA/真实请求。纯位置 CSS 修复不新增镜像实现的测试。服务、数据库、provider 及生产不变，verified05e90d2/55 迁移保持。

实现差异仅 canvas-page.module.css 默认 header 的 top:20px→7px；设计只追加 GG-219 段下的一段中心线规则。git diff --check 通过，仅换行提示。908f1ba→8e2201ed70b0db157bf2572ab93f496b713bb822 的三文件增量经 git apply --check 后精确回放至 F:/goodgood-worktrees/GG-116，当前源码 top:7px 已静态读取确认，其它窗口改动保留。根 agent 汇总 BACKLOG/IMPLEMENTATION_PLAN/DEVELOPMENT_HANDOFF/CURRENT_STATE/TESTING。

下一步：站长手验桌面资产标题与画布头部的水平中心线，以及资产侧栏开关/拉伸时头部位置稳定。未声称浏览器视觉验收通过。
