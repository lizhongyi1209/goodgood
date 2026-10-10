# Production implementation plan

- Last synchronized: 2026-10-10
- Current phase: GG-423 首页已实现；ADR 0144 已接受，分项验证/六截图完成，完整门禁因存量错误未通过。
- Current objective: 按用户确认的存量失败例外交付三提交与 PR 到 design/GG-422-design-system；只审阅，不合并/部署。
- Previous objective: GG-420 Seedance 线路参数与 GG-421 图标源码交付；最近运行收据仍是 GG-419，本轮不操作服务或数据。

## Current checkpoint

- [GG-423](tasks/GG-423-home-design-system.md)：F:/goodgood-worktrees/GG-423-home-design-system / feature/GG-423-home-design-system 从 5e404e2 建立；① 8b9601e、② 0dc2a22、③ 本分支 HEAD 的首页接线交付。其他页面不迁移，原运行栈保持。
- 本轮 lint 0 错误，全量 63→63；typecheck 15 个相同存量诊断；构建通过，测试 1145 通过 / 26 相同存量失败 / 26 跳过。详细证据与六截图见 [验证记录](design/home-verification.md)；[GG-424](tasks/GG-424-existing-check-errors.md) 只登记、暂不修。

- [GG-422](tasks/GG-422-design-system-docs.md)：根集成 worktree `F:/goodgood-worktrees/GG-422-design-system`，分支 `design/GG-422-design-system`，基线完整 `547022eadeb3888741c4ef7d0cbbe4931f04ad9d`。
- 来源 `336f24afde63297541ba3f25f7c696cffe75a18e`，来自 GitHub `design/GG-405-design-system-docs`，按 cherry-pick 接入；来源任务 GG-405 与现有分镜任务冲突，新任务编号 GG-422，ADR 0144 原本空闲并保持 Proposed。
- A 推送收据：GitHub fix/gg-421-seedance-model-icon 的 HEAD 精确等于 547022e；B 接入提交完整 a411892e979cb51f2cd3f101dca2f70582e2f2f5 已推送同名设计分支，远端核对一致，收据文档随分支继续保存。
- 现有组件/业务代码、React Flow 导入、变量值和视觉规则保留；新增 token 只定义，不替换任何页面引用。
- 原计划全文保留在 [2026-10-09 计划归档](history/2026-10-09-gg422-context/canvas-implementation-plan.md)，不丢失旧决定或证据；已交付任务的细节继续查原任务卡。
- 更早的实施证据继续保留在 [2026-09-07 历史实施记录](history/2026-09-07-implementation-log.md)；其中旧发布/转换指令仅供追溯，不构成本轮授权。
- 最新本地运行证据查 [GG-419](tasks/GG-419-local-seedance-activation.md) / [DEVELOPMENT_HANDOFF](DEVELOPMENT_HANDOFF.md)；本轮不更新生产或伪造运行 revision。
- 保留的部署边界：生产 `goodgood.o1key.com` 与历史预生产 `staging-goodgood.o1key.com` 分开；本地状态隔离，禁止复制生产数据或执行旧转换流程，具体以 DEPLOYMENT 和 ADR 0091 为准。
- Next action: 审阅 GG-423 的指定目标 PR 与六截图；后续按单独任务处理 GG-424，未获合并/部署授权。
- Blockers: 完整门禁仍因基线 lint 未通过；类型和全量测试也有既有失败。用户明确允许维持首页范围交付；不得当成发布绿灯。

## Verification sequence

GG-423 本轮明确委托完整 check:local 和 demo on/off 的 1440/1024/390 六张截图；下列 GG-422 已执行收据保留为历史，不当成本轮验证。

1. 执行 tests/documentation-continuity.test.mjs 与文档相关的 m8-production-release.test.mjs，检查所有编号、链接、索引、入口行数与历史保留。
2. 独立集成目录按相同 package-lock 安装锁定依赖，运行用户明确要求的 npm run build:local。
3. 与 547022e 比较全部应用源码：仅 globals 新增 import 和只定义 --ds 自定义属性的 CSS；原组件/样式数值与已运行服务不改。
4. 提交后普通推送 design/GG-422-design-system，并用 git ls-remote 核对完整 HEAD；不开 PR、不合并、不部署。

## Milestones

| 范围 | 状态 | 证据 |
| --- | --- | --- |
| 生产 | 继承原记录，本轮未操作或重新核验 | CURRENT_STATE / 原发布收据 |
| GG-116—421 累计画布 | 547022e 已完整备份 GitHub | GG-422 任务卡 A 收据 |
| GG-419 运行 | 最近已记录 90e0605 / 70 迁移 | 原 GG-419 任务卡，本轮无服务动作 |
| GG-422 设计文档 | 接入 a411892 已推送，文档测试 16/16、build:local 通过，页面不迁移 | GG-422 / ADR 0144 Proposed |

## New-session recovery

1. 读 AGENTS.md、CURRENT_STATE.md、WORKFLOW.md、本文件、BACKLOG.md 和 DEVELOPMENT_HANDOFF.md；不要全量加载历史归档。
2. 核对分支/worktree/HEAD 与 547022e 祖先，当前源码继续在 GG-422 设计分支；GG-219 是旧任务存档，main 不是最新画布开发基线。
3. 本任务只有一个根集成目录，无子 agent；用户运行中的 GG-116、其他 dirty 路径和根目录 skills/配置保持。
4. 文档/构建不改变实际 Web/Worker 构建身份；服务更新、迁移、真实生成和生产另按具体授权边界执行。
