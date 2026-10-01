# GG-261 · 每日免费图片额度与明细来源契约

- 日期：2026-10-01；状态：调查中，免费规则待用户补充，未部署。
- 基线：`c6f6bb9`；后端复用 `/root/canvas_paste_image` 子 agent，分支 `feat/GG-261-daily-free-quota` / `F:/goodgood-worktrees/GG-261-daily-free-quota` 已创建，创建 1/退役待集成。
- 目标：每天每用户图片免费次数（用户示例 2 张）进入实际鉴权/计费/任务幂等与失败恢复；规则澄清期间不自行决定适用模型/规格。额度不是可转让充值积分；避免并发超额、重复请求、跨工作区重复享受和跨日错误释放。
- 后端范围：billing summary/activities 的数据契约、真实任务 ID/项目/模型、可分页只读查询；计费预留/结算/释放与最小 quota 持久化迁移及对应定向测试。前端由 GG-260 拥有；后端提交独立，不改账户 profile/0059、画布样式或无关运行。
- 预议契约：活动增加 taskId/projectName/projectId/modelName（非生成或不可恢复历史为 null），保留 batchReference 兼容；每页 20 上限。免费字段通过独立 dailyFreeQuota 摘要返回，UI 不合并货币积分余额。契约在实现前通知根/UI。
- 隔离：无真实 provider/上传或 Worker 共用数据库/队列写测试；SQL 写测试只可在明确命名临时库且无 Worker，先核对有效目标。子树不安装依赖、不生成缓存或启动长期服务。根统一集成和必要 verified Web/迁移同步。
- 下一步：先读现有实现和决策，提出最小计费方案/文件边界；收到明确免费政策后补 ADR 并开发。记录精确验证/提交后停止写入，根收口/退役。
