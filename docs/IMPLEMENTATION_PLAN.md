# Production implementation plan

- Last synchronized: 2026-09-14
- Current phase: GG-081 verified local candidate; no deployment or JCOIN issuance.
- Current objective: 从e7e6b6a完整继承a73835f，落实积分类型下拉、真实充值登记、默认运营看板及并发口径。
- Previous objective: GG-080补充JCOIN消费驱动/9.18起算、结构化积分来源与条件子池规划。

## Current checkpoint

- Task [GG-081](tasks/GG-081-credit-types-operations.md), feature/GG-081-credit-types-operations, F:/goodgood-worktrees/GG-081；从e7e6b6a接续精确 `a73835fb7924ce1423196735a2b377a89dead256`，原GG-079/GG-080和根目录不改。
- JCOIN名称、1亿固定上限、5000万用户回馈总池及早期仅充值消费、消费驱动速度、2026-09-18北京时间00:00结算起算已定；[ADR0079](decisions/0079-jcoin-reward-planning.md)仍Proposed，[方案](research/GG-080-jcoin-distribution-plan.md)更新条件子池/分类/创作安排。
- [ADR0080](decisions/0080-classified-admin-credit-grants-and-operations.md) Accepted；六类积分、充值凭证/正常支付账本及现金/并发看板已实现。历史备注不自动改来源，企业来源与正式视频结算不在本切片。
- 20%分母/“创作利益”已征询，尚无明确口径，不锁定1000万或2000万创作子池或收益权；倍率/用途/企业归属待定。早期只消费奖励。默认看板/充值/并发要求已实现，JCOIN未发币。
- npm ci、定向29/29、更新验收后24/24、文档/发布/CI契约19/19及最终隔离SQL2/2通过；桌面1280/窄屏390模拟表单及看板通过。旧导航/三个下拉断言按新范围更新，菜单保留既有定位约束；最终完整门禁531项（508通过/23按规则跳过），diff检查通过。32181/临时页面与六个独立SQL测试库已清理。
- 正式入口 `https://goodgood.o1key.com` 不变；`staging-goodgood.o1key.com` 仅历史名称。原预览状态仅沿用 GG-079 交接记录（32141/32142/32143 已停止、依赖健康），本轮未重新核验运行；CURRENT_STATE 不改，不把历史 session ID 当可恢复句柄。
- Next action: 验收GG081本地候选；JCOIN先锁定20%分母/含义和倍率，再实施消费奖励账本及9.18起算验证。当前不部署或改历史来源。
- Blockers: 不影响GG081；JCOIN子池/用途/倍率待明确，未授权部署或真实支付登记。

## Verification sequence

1. 定向验证权限、分类、凭证/幂等、支付来源、现金账期与运行区间峰值。
2. SQL写测试仅显式命名、无Worker的可丢弃数据库；不修改原预览或真实数据。
3. 稳定后一次npm run check:local，更新任务/文档；生产事实以CURRENT_STATE为准。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M8 | 已完成基线 / controlled alpha 已开放 | 生产事实以 CURRENT_STATE 和发布收据为准 |
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

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，进入 `F:/goodgood-worktrees/GG-081`，读GG081/ADR0080与GG080方案，核验a73835f是祖先。
2. 根 `F:/goodgood` 仍为旧 GG-024；GG-079 是原累计候选，main 也不能代替 a73835f。`.codex/` 与未跟踪用户文件保持原样；不用旧检查点退回历史版本。
3. GG081的32181模拟检查已停止/临时页面移除，不依赖聊天句柄。后续恢复先核验版本/端口及独立mock目标；GG079/GG077 helpers与依赖54449/56449/58049见原交接。六个命名测试库已清理；禁止对原预览fixture/重置，旧32140曾有真实Worker，不操作。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
