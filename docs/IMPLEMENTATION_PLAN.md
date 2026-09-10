# Production implementation plan

- Last synchronized: 2026-09-10
- Current phase: 已开放 controlled alpha；累计候选已发布，Sharp 安全候选等待新发布授权。
- Current objective: GG-030 企业工作区阶段 0—4 已在独立 worktree 完成并通过完整本地验收，
  下一步是基于届时 main 复核并规划集成；当前线上 `65ceb168` 保持不变。

## Current checkpoint

- 生产入口 `https://goodgood.o1key.com` 当前部署源码
  `65ceb16823138dd220813fbc3ae5672234fd1f43`、不可变镜像
  `sha256:40ebfc40ced1963f02250bd8518823567e25692f82c31793817760cdb58db2cb`、迁移 0019；
  完整身份、能力边界与发布后证据见 [CURRENT_STATE.md](CURRENT_STATE.md)。
- `staging-goodgood.o1key.com` 仍只是历史名称，不是常驻测试入口；生产与本地数据继续隔离。
- main CI、artifact evidence、23 项生产 preflight、8 项精确候选 controlled-alpha 门禁均通过。
  维护解除后公网首页/readiness 为 200，登录跳转与未登录 401 边界正常。
- blue Web 与唯一 blue Worker 健康，队列、活动 job/attempt 和冻结积分均为 0；旧 green Web
  保留为应用层回退候选，旧 Worker 已停止。回退不包含 schema 降级。
- 授权的数据修复严格匹配 1 条历史孤立 attempt，只改为失败终态；授权的唯一真实 Nano
  Banana 2 请求成功生成 1 个 Asset，积分 115→105，冻结归零，没有重复 provider 提交。
- 最新备份、异机 restic 快照和隔离恢复演练均通过。恢复工具允许正常有效 session 存在，
  但继续要求受审维护标记、零活动 generation job、无网络、tmpfs 和逐表计数。
- GG-003 发布门禁和 GG-022 恢复修复已在这次真实发布中闭环；GG-011 是无需部署的流程契约。
- GG-004—GG-021 的功能已经部署。Nano Banana Pro 当前只上线每张 15 积分报价，provider
  路由仍关闭；GPT 透明输出的额外人工验收并未由本次 Nano 冒烟代替。
- 文档收尾 main run `34302821815` 的源码门禁通过，但 Trivy 在发布镜像中发现
  `sharp 0.35.0` 的 HIGH 漏洞并要求 0.35.4；这是 GG-023 的最小依赖修复，不改变产品行为。
- GG-023 已完成 Sharp 0.35.4 锁定和本地验证：定向 16/16、完整门禁 252 项（246 通过、
  6 个 opt-in 跳过、0 失败）；跨平台锁记录经 npm 11.8 修复。PR/main CI 均通过，安全镜像
  `sha256:b441e16685c77842e18cefcdbcae00c2e50d25350fe598ea2e462dd61758f152` 已发布但未部署。
- GG-030 从 `origin/main@42fc8d81` 建立独立 `feature/GG-030-enterprise-workspace` /
  `F:/goodgood-worktrees/GG-030`。ADR 0046 已接受平台/企业角色分离、企业积分池加成员额度、
  个人/企业资产隔离和按验证邮箱接受邀请；GG-027 的永久积分转移与 GG-029 的邮箱验证码
  均保持为外部并行边界，不复制其未合入源码。
- 支付、自动账户删除、举报、完整外部删除条款与完整 seed readiness 仍在 GG-900—GG-902
  搁置范围，本次发布没有恢复它们。
- GG-030 阶段 0 文档连续性 8/8 与 diff 检查通过；入口/检查点文件保持行数上限，未读取
  生产数据或触发任何外部服务。
- GG-030 阶段 1 迁移/Drizzle schema 与 organization repository 已完成；静态/纯逻辑 3/3、
  ESLint、TypeScript 通过，显式临时 PostgreSQL `goodgood_gg030_stage1` 的完整用例 4/4 通过，
  容器已移除。未改认证代码、未触发邮件/生图/生产。
- GG-030 阶段 2 迁移/Drizzle schema 与 enterprise credit repository 已完成；默认定向 5/5、
  ESLint、TypeScript 通过，显式临时 PostgreSQL `goodgood_gg030_stage2` 的阶段 1—2 用例 7/7
  通过。企业积分池、可回收成员额度和生成预留/结算/释放保持原子、幂等、零和；并发不透支，
  个人积分账户未改动，临时容器已移除。
- GG-030 阶段 3 创作作用域迁移、repositories 与企业生成计费已完成；静态 1/1、相关旧功能
  16/16、ESLint、TypeScript 通过，显式临时 PostgreSQL `goodgood_gg030_stage3` 企业创作用例
  2/2 通过。六类创作记录已回填并受同域约束，成功/失败生成正确结算/释放，管理读模型不跨域，
  成员移除不删除企业资产。阶段 1—3 联合集成 9/9、扩展旧功能回归 47/47 通过（另 3 个显式
  环境用例按设计跳过），临时容器已移除。
- GG-030 阶段 4 已完成 Workspace 选择传递、企业总览/成员/额度/用量/团队资产 API 与响应式页面、
  站长创建企业入口和管理者 Asset 下载审计。显式 PostgreSQL 集成 14/14、完整本地门禁 266 项中
  257 通过/9 个 opt-in 跳过/0 失败；隔离 Compose 与桌面/390px 浏览器验收通过并已删除测试栈。
  模拟 provider 未收到生成请求，真实邮件、真实 provider 与生产均未触发。
- Next action: GG-030 阶段 4 检查点已提交；随后基于届时 main 独立审阅迁移编号与 GG-027/GG-029
  接口交点，取得明确集成/发布授权前不合入或部署。
- Blockers: GG-030 本地范围无阻塞；最终集成必须等待 main 明确吸收哪些并行结果后复核，不能整分支覆盖。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M2 | 已完成基线 | 产品/设计契约、前端与容器/CI 基础 |
| M3—M6 | 已完成核心链路 | 持久任务、身份边界、真实模型、积分、资产与项目 |
| M7 | 已完成 | 香港链路、备份/恢复及兼容切换验证 |
| M8 / controlled alpha | 已开放并完成本次累计发布 | 审核账户、核心生图、恢复与发布门禁 |
| GG-004—GG-022 | 已部署或完成 | 累计功能、可靠性、恢复工具和生产发布 |
| GG-023 | 实施中 | Sharp 0.35.4 安全修复与 main CI 恢复 |
| GG-030 | 阶段 0—4 本地完成 | 企业成员、额度、创作归属、管理 API/页面与完整本地闭环已验证；未部署 |
| 完整 C6 / full seed | 搁置 | 删除、举报、外部条款与进一步配套，见 GG-900/901 |
| M9 | 搁置 | 支付/支付宝，见 GG-902 |

## New-session recovery

1. 读根 AGENTS、[CURRENT_STATE](CURRENT_STATE.md)、[WORKFLOW](WORKFLOW.md)、本页和
   [BACKLOG](BACKLOG.md)，检查 Git 分支/worktree/未提交改动。
2. 不把最新 main 自动当作线上版本；以 CURRENT_STATE 的完整 revision、镜像摘要和迁移为准。
3. 本 worktree 只恢复 GG-030；GG-024—GG-029 属于并行任务，不混合 worktree 或整分支覆盖。
4. 本次 alpha 证据只绑定 `65ceb168`，后续候选必须重新生成新鲜证据并通过门禁。
5. 真实 provider 请求可能计费，必须与测试 fixture 隔离并取得对具体调用的明确授权。

## History and update policy

- [提炼后的历史经验](history/2026-09-07-development-lessons.md)。
- [完整原始开发日志](history/2026-09-07-implementation-log.md)仅供追溯。
- [本次发布记录](releases/2026-09-09-cumulative-alpha-release.md)。
- 本文只保留一个检查点和下一步；细节写任务卡，发布事实写 CURRENT_STATE。
