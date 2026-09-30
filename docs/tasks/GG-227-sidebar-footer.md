# GG-227 删除侧栏帮助和问题反馈

- 日期：2026-09-30
- 状态：子agent完成，已精确合入本地5173并随GG226验证，待手验，未部署
- 分支 / worktree：fix/GG-227-remove-sidebar-support / F:/goodgood-worktrees/GG-227-sidebar-footer
- 基线：3d7fe5e，verified05e90d2祖先核验，主页与当时GG116相同。
- 源提交：7df8e96，仅app/page.tsx三个删除行。
- 决策：[ADR0118补记](../decisions/0118-expanded-desktop-sidebar-home.md)，补记先于实施。

## 实现与验证

删除左下角帮助、问题反馈两按钮及闲置HelpCircle导入；账户头像/菜单/积分用量/登录保持。MessageSquare与handleFeedbackNav仍被其他入口使用，保留；反馈历史/后台/URL不变。未覆盖画布或项目区，整合树只加入三个删除行。

与GG226共同40/40专项/文档与build:local通过，lint0错误；check:local被原画布缓存两处类型错误阻塞。5173主页模块HTTP200，源码无footer支持按钮；静态差异已核验，无镜像实现测试。GG227无后端/服务/数据操作，GG226的运行变化独立记录在其卡。

## 下一步

刷新5173手验左下角仅账户功能、菜单和登录交互。未登录浏览器视觉验收或生产部署。
