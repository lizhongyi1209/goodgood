# GG-356 · Seedream数据库模型约束修复

- 日期：2026-10-04；状态：源码完成，待精确接入/本地应用，未部署生产。
- 用户授权：接续GG-355定位结果「帮我修复」，包含必要本地迁移应用；不自动重试/生成/扣费，不扩展为生产部署。
- 基线：GG-116干净5d6ee24442eed63754361614b5cdd6b93df1bddb，确认包含应用检查点cc31fcce862f127400ac5a65ef26bf55743ea969。保留GG-354及并行画布工具。
- 所有权：根agent，无子agent；managed隔离codex/GG-356-seedream-constraints，C:/Users/Admin/.codex/worktrees/gg-356-seedream-constraints/goodgood。
- 范围：新0066迁移将generation_batches/projects/creation_drafts的model_check与既有db/schema.ts模型ID格式约束对齐，放行Seedream；沿API能力及启用目录校验，不改其他限制/能力/价格/已应用迁移/用户记录。
- 决策：落实既有GG-214 Seedream接入及既有schema定义，不改变已确认产品决定，无需新增ADR。
- 验收：三处约束允许Seedream且保留格式限制，旧数据/模型目录/报价及积分不变；本地0066迁移有校验和记录，无新生成任务/上游请求、fixture、重启或生产操作。
- 开始事实：2026-10-04只读确认目标127.0.0.1:54449/goodgood，最后0065，三处仍是旧五模型约束，queued/running/refining任务均0。
- 验证边界：GG-276不运行构建/lint/typecheck/代码检查/测试/浏览器验收；新增隔离数据库回归来源不执行。必要迁移前后读取和迁移应用属于本次修复授权，不提交合成任务到真实Worker。
- 实现：新0066仅替换三处model_check为既有schema模型ID格式约束；未修改已应用SQL/schema定义/后台代码。新增显式专用数据库回归来源，可复现旧限制/升级后Seedream接受、旧行不变和非法ID拒绝，未执行。
- 下一步：精确接入后仅应用0066到已核验本地目标，回读迁移记录/约束及数据保留情况，记录结果并归档辅助工作区。
