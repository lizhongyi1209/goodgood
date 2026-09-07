# Production implementation plan

- Last synchronized: 2026-09-07
- Current phase: 已开放 controlled alpha；转入按需求的高频小步迭代。
- Current objective: 完成 GG-006 参考图预览与参数顺序调整，在真实 O1Key 本地栈交付站长验收。

## Current checkpoint

- 生产入口 `https://goodgood.o1key.com`；最近已部署源 `94cecb0`，迁移 0012。
  完整身份、能力边界及最近证据只维护在 [CURRENT_STATE.md](CURRENT_STATE.md)。
- C6-3 / C7 的小范围用户开站已完成。ADR 0025 全宽高比/分辨率已上线。
  这不是完整 seed/paid 就绪，仍需站长审核账户，支付不开放。
- GG-001：旧 C6 的 118 个改动文件已提交/推送到独立 archive 分支，另有 worktree
  与校验通过的 bundle；原 stash 保留。旧计划归档，入口/任务协议已整理。
  本轮完整本地门禁通过，交接结果见 [任务卡](tasks/GG-001-project-continuity.md)。
- GG-004 与 GG-005 已在各自独立分支完成本地验证，均未上线；GG-006 从 `main`
  独立实施，最终只在本地联调分支组合三项，避免把并行任务混入单项交付分支。
- 生产与本地分开：文档整理不部署、不迁移、不修改真实账户/素材/积分。
  历史记录中的开站、轮换、清空等许可不继承，旧转换流程不是新的执行计划。
- Next action: 完成 GG-006 契约测试、实现和完整本地门禁；随后合入真实 O1Key
  本地联调候选，浏览器核验后交给站长实测。
- Blockers: 新功能本地开发无外部阻塞；下次 alpha 发布前须处理 GG-003 的独立
  门禁工具提取。完整删除、举报、外部删除条款与付费要求留在搁置项，不自动恢复。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0–M2 | 已完成基线 | 产品/设计契约、前端与容器/CI 基础 |
| M3–M6 | 已完成核心链路 | 持久任务、身份边界、真实模型路径、积分与资产/项目 |
| M7 | 历史验证完成 | 香港链路与备份/恢复等验证；原主机现已转生产 |
| M8 / C6-3 / C7 | controlled alpha 已开放 | 账户审核、生产数据隔离、核心生图、最小恢复/观测 |
| 完整 C6 / full seed | 搁置 | 删除/举报/进一步配套未部署，见 GG-900/901 |
| M9 | 搁置 | 支付/国内支付宝，见 GG-902 |
| ADR 0025 / GG-002 | 已上线 | Nano Banana 2 全 14 宽高比 × 三档分辨率 |
| GG-001 | 已完成（不需部署） | 项目记忆、历史精简、分支隔离与交接协议 |

## New-session recovery

1. 读根 AGENTS、CURRENT_STATE、[WORKFLOW](WORKFLOW.md)、本文和
   [BACKLOG](BACKLOG.md)，检查 Git 分支/worktree/未提交改动。
2. 有明确新需求就创建新任务卡并读相关专题；“继续”匹配当前任务的下一步。
3. 不要从旧 C6 或归档末尾猜下一阶段；不把 `main` 最新提交当作线上已部署。
4. 本地开发验证后形成干净候选，经明确范围批准再发布。
5. `staging-goodgood.o1key.com` 非现行测试入口；本机为日常测试环境。
   现有生产主机/候选槽验证不是生产数据隔离的独立 staging。

## History and update policy

- [提炼后的历史经验](history/2026-09-07-development-lessons.md)。
- [完整原始开发日志](history/2026-09-07-implementation-log.md)：仅需追溯时读取。
- [搁置源码恢复卡](tasks/GG-900-deferred-c6.md)。
- 本文保持短小、一个检查点/下一步；细节写任务卡，发布事实写 CURRENT_STATE。
  不再追加每次命令结果、所有旧阻塞或聊天记录。
