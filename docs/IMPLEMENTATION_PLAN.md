# Production implementation plan

- Last synchronized: 2026-10-10
- Current phase: GG-424 已从 PR #8 合并检查点 ce86e66 完成本地清理，完整 check:local 通过；PR #9 的 npm 11.19.0 安装与质量门禁已通过，依赖扫描修复待 CI 复核。
- Current objective: 推送 4986aa4 的最低安全依赖版本及同步记录，确认 PR #9 的 Verify source and image 绿灯；不合并、不部署。
- Previous objective: GG-423 首页设计系统已由 PR #8 合并到 design/GG-422-design-system；最近运行收据仍是 GG-419，本轮不操作服务或数据。

## Current checkpoint

- [GG-424](tasks/GG-424-existing-check-errors.md)：F:/goodgood-worktrees/GG-424 / fix/GG-424-existing-check-errors 从 ce86e66 建立。307198c 初次重生成锁文件，CI 精确 npm 11.19.0 修正在 3d65ef0；同版本 npm ci 通过。16d35c0 将 27 文件 / 63 lint 错误、15 类型诊断和 26 陈旧测试失败清零，不改变产品行为或禁用规则。
- PR #9 第二轮 CI 已通过安装与质量门禁；Trivy 新漏洞库报告 8 个有修复版本的 HIGH/CRITICAL 依赖项。4986aa4 按当轮扫描给出的最低安全版本更新 5 个依赖及 1 个传递覆盖、锁文件和固定值测试；下一轮仅剩漏洞库新增的 Nodemailer 10.0.6 补丁要求，继续以单一补丁更新处理，不改业务代码。
- a2ff46c 对应 CI 的应用依赖扫描已清零，镜像构建与运行时导入通过；镜像扫描只剩固定 Debian 基础镜像中的 `perl-base` u3，按既有定向系统安全更新策略升级到仓库提供的 u4，不做全量系统升级。
- 完整 npm run check:local 通过：lint 0 错误 / 173 警告，typecheck 0，build:local 通过，测试 1197 项为 1171 通过 / 0 失败 / 26 跳过。忽略的本地日志不提交。
- [GG-423](tasks/GG-423-home-design-system.md)：F:/goodgood-worktrees/GG-423-home-design-system / feature/GG-423-home-design-system 从 5e404e2 建立；① 8b9601e、② 0dc2a22、③ f890c3c、④ 6828d06、⑤ 5f6f66e 保留；第 6 个字标尺寸修正为本提交，PR #8 是交付入口。其他页面不迁移，原运行栈保持。
- 第 6 提交验证：GG-423 源码 lint 0 / 18，CSS / JSON 解析及 token 契约通过；全量仍 63 / 172、27 文件错误明细相同；docs 16/16、build 与首页 / SSR 10/10。demo on 1440/1024 新整页已查看，字标 18px、图标栏 / 手机 G 20px，本轮 55124 预览已停止。详见验证记录。
- 第 5 提交追加全量复核已补进 PR：typecheck 15 个诊断的完整文本与 5e404e2 一致；test:local 1197 项，1145 通过 / 26 相同失败 / 26 跳过。本轮只重跑用户指定的尺寸修正检查。
- 第 5 提交修正验证：本轮 lint 0 / 18，全量 63 / 63 错误、172 / 172 警告，明细相同；docs 16/16、build 与首页 / 生产 SSR 10/10 通过，六张整页和菜单首屏图完成。菜单透底原因是继承淡入，现停用；八个侧栏项 500 / PingFangSC-Medium，字体栈保持。以下旧轮结果保留。
- 第 4 提交验证：本轮 lint 0 / 18，全量修正前后 63 / 63 错误、172 / 172 警告；文档 16/16、首页及生产 SSR 10/10、build 通过。390 截图及「我的」键盘 / 焦点核对完成；typecheck、全量测试与完整 check:local 本轮未重复，以下首次交付结果保留。
- 首次交付验证：lint 0 错误，全量 63→63；typecheck 15 个相同存量诊断；构建通过，测试 1145 通过 / 26 相同存量失败 / 26 跳过。详细证据与历史六截图见 [验证记录](design/home-verification.md)；[GG-424](tasks/GG-424-existing-check-errors.md) 只登记、暂不修。

- [GG-422](tasks/GG-422-design-system-docs.md)：根集成 worktree `F:/goodgood-worktrees/GG-422-design-system`，分支 `design/GG-422-design-system`，基线完整 `547022eadeb3888741c4ef7d0cbbe4931f04ad9d`。
- 来源 `336f24afde63297541ba3f25f7c696cffe75a18e`，来自 GitHub `design/GG-405-design-system-docs`，按 cherry-pick 接入；来源任务 GG-405 与现有分镜任务冲突，新任务编号 GG-422，ADR 0144 原本空闲并保持 Proposed。
- A 推送收据：GitHub fix/gg-421-seedance-model-icon 的 HEAD 精确等于 547022e；B 接入提交完整 a411892e979cb51f2cd3f101dca2f70582e2f2f5 已推送同名设计分支，远端核对一致，收据文档随分支继续保存。
- 现有组件/业务代码、React Flow 导入、变量值和视觉规则保留；新增 token 只定义，不替换任何页面引用。
- 原计划全文保留在 [2026-10-09 计划归档](history/2026-10-09-gg422-context/canvas-implementation-plan.md)，不丢失旧决定或证据；已交付任务的细节继续查原任务卡。
- 更早的实施证据继续保留在 [2026-09-07 历史实施记录](history/2026-09-07-implementation-log.md)；其中旧发布/转换指令仅供追溯，不构成本轮授权。
- 最新本地运行证据查 [GG-419](tasks/GG-419-local-seedance-activation.md) / [DEVELOPMENT_HANDOFF](DEVELOPMENT_HANDOFF.md)；本轮不更新生产或伪造运行 revision。
- 保留的部署边界：生产 `goodgood.o1key.com` 与历史预生产 `staging-goodgood.o1key.com` 分开；本地状态隔离，禁止复制生产数据或执行旧转换流程，具体以 DEPLOYMENT 和 ADR 0091 为准。
- Next action: 推送 GG-424 依赖扫描修复并等待 PR #9 CI 绿灯；不合并/部署。
- Blockers: 本地无阻塞；等待远端 PR 检查。

## Verification sequence

GG-424 按以下顺序完成并保留真实结果：

1. npm install --package-lock-only 后 npm ci，锁文件独立提交。
2. 全量 lint、typecheck 与原 26 个失败测试逐项修复，不禁用规则、不改产品行为。
3. npm run check:local 完整通过并检查 diff。
4. 推送功能分支、开 PR、等待 Verify source and image；不合并、不部署。

## Milestones

| 范围 | 状态 | 证据 |
| --- | --- | --- |
| 生产 | 继承原记录，本轮未操作或重新核验 | CURRENT_STATE / 原发布收据 |
| GG-116—421 累计画布 | 547022e 已完整备份 GitHub | GG-422 任务卡 A 收据 |
| GG-419 运行 | 最近已记录 90e0605 / 70 迁移 | 原 GG-419 任务卡，本轮无服务动作 |
| GG-422 设计文档 | 接入 a411892 已推送，文档测试 16/16、build:local 通过，页面不迁移 | GG-422 / ADR 0144 Proposed |
| GG-424 检查清理 | 本地 check:local 全绿；PR #9 依赖扫描修复待 CI 复核 | GG-424 任务卡 |

## New-session recovery

1. 读 AGENTS.md、CURRENT_STATE.md、WORKFLOW.md、本文件、BACKLOG.md 和 DEVELOPMENT_HANDOFF.md；不要全量加载历史归档。
2. 核对 fix/GG-424-existing-check-errors / ce86e66 祖先和 PR 状态；当前源码从已合并 GG-423 的设计分支接续，main 不是最新画布开发基线。
3. 本任务只有一个根集成目录，无子 agent；用户运行中的 GG-116、其他 dirty 路径和根目录 skills/配置保持。
4. 文档/构建不改变实际 Web/Worker 构建身份；服务更新、迁移、真实生成和生产另按具体授权边界执行。
