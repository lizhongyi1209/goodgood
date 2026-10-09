# GG-404 · 分镜菜单状态变量声明修复

- 日期：2026-10-06；用户报告storyboardMenuOpen is not defined。
- 基线：GG-116干净fix/gg-403-canvas-load-recovery，HEAD9b3a60b；GG-403修复源码5156fb7祖先已核验。分支fix/gg-404-storyboard-menu-state。
- 原因：GG-401字符串编辑没有匹配CRLF的两行声明，引用已更名但声明旧名仍在。此错误属于客户端实际执行，GG-403页面/模块HTTP200不能证明该客户端状态已经可用。
- 修复：用定点补丁替换声明为storyboardMenuOpen/setStoryboardMenuOpen，移除旧storyboardSession，声明与已有菜单render及关闭回调一致；新session由CanvasVideoStoryboardControl局部维护。
- 范围：最小语法/声明修复，无产品决定变化/新ADR；保存/计费/冻结任务/Provider/数据与运行进程保持。
- 验证：遵从用户源码开发模式，未运行构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP或真实生成；手验归用户。未增加镜像式测试。
- 发布：在既有GitHub设计快照正常fast-forward同步缺陷修复，不force/main/PR/部署。
- 生命周期：创建0/退役0，无子agent/新依赖缓存，复用集成目录。
- 状态：源码修复完成，修复已提交并推送b3233fec00a94075e3f405a92ca45ed59035ca77，git push回执9b3a60b→b3233fe成功；用户刷新5173手验。

- 下一步：按本卡原有状态和当前 IMPLEMENTATION_PLAN 接续；未授权的手验/运行操作仍由用户决定，已撤回或被取代内容不自动恢复。
