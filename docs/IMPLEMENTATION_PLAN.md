# Production implementation plan

- Last synchronized: 2026-09-14
- Current phase: GG-082 discussion proposal; GG-081 local implementation preserved, no JCOIN issuance or deployment.
- Current objective: 从90a1d9a完整继承a73835f，评估仅充值消费挖矿一期，讨论用途/首期预算/奖励倍率。
- Previous objective: GG-081积分类型、真实充值登记与默认运营/现金/并发已本地实现验证。

## Current checkpoint

- Task [GG-082](tasks/GG-082-jcoin-minimum-issuance.md), feature/GG-082-jcoin-minimum-issuance, F:/goodgood-worktrees/GG-082；从精确 `90a1d9ac3cfcb0a2d1e64829ed16db7eddb5b31b`接续 `a73835fb7924ce1423196735a2b377a89dead256`，原GG-079/GG-080/GG-081和旧根目录不改。
- JCOIN名称、1亿固定上限、5000万用户回馈总池及早期仅充值消费、消费驱动速度、2026-09-18北京时间00:00结算起算已定；[ADR0079](decisions/0079-jcoin-reward-planning.md)仍Proposed，[方案](research/GG-080-jcoin-distribution-plan.md)更新条件子池/分类/创作安排。
- [ADR0080](decisions/0080-classified-admin-credit-grants-and-operations.md) Accepted；六类积分、充值凭证/正常支付账本及现金/并发看板已实现。历史备注不自动改来源，企业来源与正式视频结算不在本切片。
- 用户本轮仅讨论充值消费挖矿/发行能力/用途/倍率。仅发行累计可独立一期，兑换和创作激励可后上；当前无JCOIN账户/库存/流水/分发/退款/余额界面。[GG082讨论](research/GG-082-jcoin-minimum-issuance.md)首期100万、10枚/CNY、1000枚兑换500非充值积分均未接受。
- 20%分母/“创作利益”仍未明确，不锁定完整创作/消费子池。首期锁定额度是可讨论的独立切片，不默认全5000万给挖矿，不取消创作安排。倍率/兑换/成熟期/企业归属待定。
- GG081最终门禁531项（508通过/23跳过）、隔离SQL2/2及桌面/窄屏mock通过；记录见GG081任务。GG082仅文档，整数试算、文档/发布契约15/15、diff及a73835f/90a1d9a祖先检查通过；运行时代码不变，不跑完整构建或写数据库。
- 正式入口 `https://goodgood.o1key.com` 不变；`staging-goodgood.o1key.com` 仅历史名称。原预览状态仅沿用 GG-079 交接记录（32141/32142/32143 已停止、依赖健康），本轮未重新核验运行；CURRENT_STATE 不改，不把历史 session ID 当可恢复句柄。
- Next action: 讨论并接受首期锁定额度、倍率和是否先累计后兑换；再记录实施ADR，完成最小JCOIN账本/分发/退款/界面与9.18边界验证。下一批前确定完整消费预算/递减规则。当前不部署或改历史来源。
- Blockers: 讨论无阻碍；具体额度/倍率/兑换未接受，当前无发行运行时，未授权实际发币或部署。

## Verification sequence

1. GG082讨论仅内存整数试算、文档/发布契约和diff/祖先检查，不跑完整构建。
2. 后续实现先定向验证资格、幂等、库存、退款与起算边界；SQL写测试仅显式命名、无Worker可丢弃数据库。
3. 代码稳定后一次npm run check:local，更新任务/文档；生产事实以CURRENT_STATE为准。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M8 | 已完成基线 / controlled alpha 已开放 | 生产事实以 CURRENT_STATE 和发布收据为准 |
| GG-082 | 最小发行讨论，待参数确认 | 仅充值消费挖矿可独立一期；首期额度/倍率/用途均建议，未实现/发币 |
| GG-080 | 补充规划完成待澄清 | 消费驱动/9.18/分类方向已定，条件试算/文档通过，20%待澄清，未实施 |
| GG-081 | 本地实现/验证完成 | 积分类型、真实充值登记与默认运营/现金/并发；门禁508/23、隔离SQL2/2及模拟页面通过，未部署 |
| GG-023 | 本地安全候选已 CI 通过 | 尚未切生产，见任务卡 |
| GG-024—GG-032 | 本地完整基础组合已验证 | 账户、积分、直属关系、来源划拨、OTP、企业及成员额度 |
| GG-033 | 本地完成并真实验证 | 三个 GPT 图片模型，生产未发布 |
| GG-034—GG-039 | 本地图片/视频工作区已验证 | Seedance 参数、线路、预览、混排/详情、数量并发；正式视频结算待接 |
| GG-040—GG-043 | 本地完成并获页面检查 | 批量提示词、简化说明、抽屉与素材预览，未发布 |
| GG-044—GG-049 | 本地完成，验收记录见任务卡 | 企业/分销独立管理、划拨归位、概览；GG-046 模拟未获认可，原真实本地企业页保留 |
| GG-050 | 本地完成并获用户验收 | 删除五类常驻返回入口，不新增替代导航，未发布 |
| GG-051 | 研究方向获认可 | Runway 人民币按规格计价，等值分析与 ADR 0062 |
| GG-052 | 本地完成并验证 | 1 元/100 积分与站长模型面板；完整门禁、SQL/browser mock 验证通过，定价页已保留，未发布 |
| GG-053 | 本地完成并验证 | 模型名称一次、规格价格对齐、自动内部编号与折叠接入详情；完整门禁与桌面/窄屏验收通过，原页面已更新保留，未发布 |
| GG-054 | Pro 与通用功能本地完成并验证 | 原线路/定价候选完整验证；后续用户补齐 Banana 2 ID 接续 GG-056，未发布 |
| GG-055 | 官方调研与文档验证完成 | 六规格输出成本、整单公式与五参考图/长文本敏感性；文档测试 15/15、diff 检查通过；未改价/发布 |
| GG-056 | 本地完成并验证 | Banana 2 三线路、用户价格/历史保留、试价目录归档；门禁 427/16、SQL/运行/Chrome 通过，未发布 |
| GG-057 | 本地完成并验证 | 站长导航与 local 登录恢复；门禁 432/16、运行/Chrome 检查与配置/历史保留通过，未发布 |
| GG-058 | 本地调整与验证完成 | 站长字体/无页头退出；门禁 432/16、运行/Chrome 与历史保留通过，原 Windows 文字待用户复看，未发布 |
| GG-059 | 本地完成并验证 | 大厅统一站长管理/右侧切换/窄屏返回；最终门禁 437/16、浏览器与历史保留通过，未发布 |
| GG-060 | 本地完成并验证 | 顶部功能切换/唯一页面主标题；门禁 437/16、桌面窄屏与历史保留检查通过，未发布 |
| GG-061 | 本地完成并验证 | 独立审计/四功能；门禁 439/16、原浏览器/窄屏与历史保留通过，未发布 |
| GG-062 | 本地完成并验证 | GPT 图片三线路；门禁 445/16、隔离 SQL、原页面/窄屏与历史保留通过，未发布 |
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，进入 `F:/goodgood-worktrees/GG-082`，读GG082方案/任务及GG081/ADR0080、ADR0079，核验90a1d9a及a73835f是祖先。
2. 根 `F:/goodgood` 仍为旧 GG-024；GG-079 是原累计候选，main 也不能代替 a73835f。`.codex/` 与未跟踪用户文件保持原样；不用旧检查点退回历史版本。
3. GG081的32181模拟检查已停止/临时页面移除，不依赖聊天句柄。后续恢复先核验版本/端口及独立mock目标；GG079/GG077 helpers与依赖54449/56449/58049见原交接。六个命名测试库已清理；禁止对原预览fixture/重置，旧32140曾有真实Worker，不操作。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
