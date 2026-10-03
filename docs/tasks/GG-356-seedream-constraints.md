# GG-356 · Seedream数据库模型约束修复

- 日期：2026-10-04；状态：源码完成/本地0066已应用，真实生成待用户手验，未部署生产。
- 用户授权：接续GG-355定位结果「帮我修复」，包含必要本地迁移应用；不自动重试/生成/扣费，不扩展为生产部署。
- 基线：GG-116干净5d6ee24442eed63754361614b5cdd6b93df1bddb，确认包含应用检查点cc31fcce862f127400ac5a65ef26bf55743ea969。保留GG-354及并行画布工具。
- 所有权：根agent，无子agent；managed隔离codex/GG-356-seedream-constraints，C:/Users/Admin/.codex/worktrees/gg-356-seedream-constraints/goodgood。
- 范围：新0066迁移将generation_batches/projects/creation_drafts的model_check与既有db/schema.ts模型ID格式约束对齐，放行Seedream；沿API能力及启用目录校验，不改其他限制/能力/价格/已应用迁移/用户记录。
- 决策：落实既有GG-214 Seedream接入及既有schema定义，不改变已确认产品决定，无需新增ADR。
- 验收：三处约束允许Seedream且保留格式限制，旧数据/模型目录/报价及积分不变；本地0066迁移有校验和记录，无新生成任务/上游请求、fixture、重启或生产操作。
- 开始事实：2026-10-04只读确认目标127.0.0.1:54449/goodgood，最后0065，三处仍是旧五模型约束，queued/running/refining任务均0。
- 验证边界：GG-276不运行构建/lint/typecheck/代码检查/测试/浏览器验收；新增隔离数据库回归来源不执行。必要迁移前后读取和迁移应用属于本次修复授权，不提交合成任务到真实Worker。
- 实现：新0066仅替换三处model_check为既有schema模型ID格式约束；未修改已应用SQL/schema定义/后台代码。新增显式专用数据库回归来源，可复现旧限制/升级后Seedream接受、旧行不变和非法ID拒绝，未执行。
- 下一步：用户自行重试Seedream，确认生成及正常保存/积分结算；不自动重放原失败请求。

- 交付与必要迁移核对：GG-356已修复并本地启用：隔离4dbdaa4c7a53ffaff3cffb9440fe7e285e8b85b5精确接入6ba2d0d57ae15a4a77a6f3e01810dc0e72f96151。新增0066仅对齐generation_batches/projects/creation_drafts模型ID约束至既有schema，修复Seedream提交前503。2026-10-04 00:15:02通过直接迁移模块只应用0066到127.0.0.1:54449/goodgood；历史65条内容校验和匹配，迁移总数66，新校验和记录匹配，三处约束validated。迁移前后账户/资产/参考图/任务/项目/草稿及积分流水数量、个人/工作区可用及预留余额、Seedream目录/全部报价均不变，开始活动任务0。未改旧迁移/运行JS，不需构建或重启；Web/唯一Worker/Vite沿既有运行，GG-350Worker更新待办保持。专用数据库回归仅写来源，沿GG-276未构建/lint/typecheck/代码检查/测试/浏览器验收；无合成任务/Provider/扣费/自动重放或生产操作。创建1/退役1，managed辅助确认归档，无子agent/缓存。用户现在可自行重试Seedream，真实生成效果待手验。
