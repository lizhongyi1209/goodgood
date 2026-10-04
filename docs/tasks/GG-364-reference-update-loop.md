# GG-364 · 修复多图参考连线的更新循环

- 日期：2026-10-04；用户报告Maximum update depth exceeded，要求继续修复当前画布。
- 基线：GG-116干净HEAD4663f7801a613d7852ea392292ae4c5c820768ea，已核验包含应用源码5cb456555b9af3e68933df302f03ab5a1e274fde。
- 范围：修复GG-363显示连线列表在graphRevision变化时产生新引用、React Flow回写再次触发图更新的循环；空画布/普通边与组计数均须稳定，实际连线内容或图片数量变化仍正常更新。
- 决策：纯实现缺陷修复，不改变GG-362/363已确认交互，无需新ADR。
- 证据：源码visibleEdges在每次graphRevision变化时map新数组；已安装React Flow StoreUpdater按edges引用回写，CanvasProjectChangeObserver又递增graphRevision。无组边或空数组同样形成反馈。
- 状态：源码修复完成并精确接入当前项目；未自动验收，未部署生产。
- 验证边界：沿GG-276只开发/修改/集成，不自动构建、lint/typecheck、代码检查、测试或浏览器验收。补必要纯回归来源但不执行；无HTTP/SQL/Provider/扣费、服务更新或生产操作。
- 下一步：用户刷新5173手验循环错误消失、计数和真实边变化正常，反馈实际效果。

## 实现

- canvas-reference-edge-view按原始边对象/当前组计数缓存显示边；无装饰时返回原数组，语义未变时复用既有数组及边，不以graphRevision制造新edges。
- canvas-page仍按现有来源/去重/目标排除计算计数，实际边编辑、数量变化、顺序变化和恢复仍更新；不屏蔽图观察或保存/历史通知。
- tests/gg364-reference-update-loop.test.mjs仅写回归来源：模拟受控边通知反馈的收敛，覆盖空/普通/组边、同计数重算、计数变化、实际编辑/排序/删除和恢复；未执行。
- 不改变产品决定，ADR0135/0108维持GG-363；无依赖或后台修改。

## 交付

- GG-364源码已精确接入56960a87115073a169c0800957a9ac7d0e076236（隔离a9a4f6818a712c3380506863b1f565fc4f28ae6e）。修复GG-363的graphRevision/受控edges引用反馈循环：空/普通边保留原数组，组边按实际原边/计数缓存并复用显示数组，计数和真实边变化仍正常更新，保存/历史观察保持。源码反馈链已定位，未做浏览器复现或自动验收。沿GG-276只写纯回归来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费、服务重启或生产操作，GG-358运行receipt未重查。用户刷新5173手验原画布/空画布、多图接入、移除计数/目标独立排除与保存刷新。
- 生命周期：创建1/退役1；list_artifacts已确认managed辅助为archived_worktree，归档完成。无子agent/辅助依赖缓存；没有改写本地运行身份。
