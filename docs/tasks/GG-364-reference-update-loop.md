# GG-364 · 修复多图参考连线的更新循环

- 日期：2026-10-04；用户报告Maximum update depth exceeded，要求继续修复当前画布。
- 基线：GG-116干净HEAD4663f7801a613d7852ea392292ae4c5c820768ea，已核验包含应用源码5cb456555b9af3e68933df302f03ab5a1e274fde。
- 范围：修复GG-363显示连线列表在graphRevision变化时产生新引用、React Flow回写再次触发图更新的循环；空画布/普通边与组计数均须稳定，实际连线内容或图片数量变化仍正常更新。
- 决策：纯实现缺陷修复，不改变GG-362/363已确认交互，无需新ADR。
- 证据：源码visibleEdges在每次graphRevision变化时map新数组；已安装React Flow StoreUpdater按edges引用回写，CanvasProjectChangeObserver又递增graphRevision。无组边或空数组同样形成反馈。
- 状态：已定位源码反馈链，待隔离修复与精确集成。
- 验证边界：沿GG-276只开发/修改/集成，不自动构建、lint/typecheck、代码检查、测试或浏览器验收。补必要纯回归来源但不执行；无HTTP/SQL/Provider/扣费、服务更新或生产操作。
- 下一步：在当前注册提交的managed辅助区修复稳定投影，精确接入、归档并更新交接；用户刷新手验。
