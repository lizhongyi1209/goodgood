# Production implementation plan

- Last synchronized: 2026-09-15
- Current phase: GG-097 累计功能生产发布——**已执行完成，公网停留维护页**。
- Current objective: 解决 alpha 门禁未通过的两项（member-journey 契约冲突、operations 通知通道），再决定是否解除维护开放公网。
- Previous objective: 本地全功能测试 → 合并 main → CI 镜像 → 迁移 0043 → 切流 → 站长初始化。

## Current checkpoint

- Task [GG-097](tasks/GG-097-production-release-0019-to-0043.md)：**已部署但未开放**。
  生产身份 `89afedb` / 镜像 `sha256:72ac3253…` / 迁移 `0043` / **green 接流**。
- 已完成：阶段 1—5（含一次真实生图 reserve→settle、私有限读、跨账户拒绝 404）、阶段 6.1—6.4。
- 门禁 `production:alpha-gate` **`ok: false`**，两项如实 `fail`：
  - `controlled-alpha-member-journey`——门禁硬要求 `welcomeCredits === 100` 且
    `pendingBeforeApproval === true`；产品实际 200 积分且 email 注册直接 `active`
    （GG-090/ADR 0089 已取代 ADR 0020 的 pending 模型）。**门禁契约与产品行为不一致。**
  - `controlled-alpha-operations`——主机不存在任何对外通知通道，`notificationDelivered: false`。
- 公网 503 维护中；`GOODGOOD_EMAIL_REGISTRATION_ENABLED=false`。
- 线上入口仍为 `goodgood.o1key.com`（当前返回维护页）；`staging-goodgood.o1key.com` 仅保留名称，不是测试入口。
- 生产数据：users 2（站长 951565127@qq.com、lizhongyi1209@gmail.com，均 active）、assets 1（private）。
- 附带修复：`c343351`（Next 16.3.3）、`89afedb`（Debian libpcre2）——两者都是 main CI
  发布镜像的硬阻断，非顺手改动。
- 独立缺口（已记录未处理）：备份 timer `disabled`；blue Web 闲置占用；本地 32131/32142 未恢复。
- Next action: 站长在三选一中定夺（接入通知渠道 / 更新门禁契约 / 维持维护态）。
- Blockers: 上述两项门禁未通过。

## Verification sequence

1. 先按DEVELOPMENT_HANDOFF核验当前检查点、Git祖先与实际端口；文档整理只跑文档/链接契约与diff检查。
2. SQL恢复命令只创建命名空库且无Worker，原goodgood与生产不写fixtures；新功能按对应任务做最小定向验证。
3. 代码稳定后一次npm run check:local，更新任务/文档；生产事实以CURRENT_STATE.md为准。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M8 | 已完成基线 / controlled alpha 已开放 | 生产事实以 CURRENT_STATE 和发布收据为准 |
| GG-090 | 本地实现/验证完成 | 双码active注册、站长单人邀请码；525/26、隔离SQL/邮件UI通过，32141已更新；历史M6价格断言见任务；未部署 |
| GG-089 | 本地实现/验证完成 | 指定8项站长导航顺序/用户反馈标签；522/25、桌面/390px通过，32141已更新，未部署 |
| GG-088 | 本地实现/验证完成 | 问题类型首次及改选后向下、桌面/390px和门禁522/25通过，32141已更新，未部署 |
| GG-087 | 本地实现/验证完成 | 私有反馈5图/类型/状态/回复，522通过/25跳过、SQL/UI通过，原32141更新；未部署 |
| GG-086 | 本地实现/验证完成 | 发行进度与15秒只读刷新、桌面/390px通过，原32141已更新；门禁详情见任务，未部署 |
| GG-085 | 本地实现/验证完成 | 按期卡片、门禁515/24及桌面/390px通过，原32141已更新，未部署 |
| GG-084 | 本地实现/验证完成 | 个人仅自己统计/记录，站长计划/一期生命周期；门禁515/24、SQL1/1、UI通过，未部署 |
| GG-083 | 结构/首批参数规划完成 | 第一批100万枚/系数2、正常50万元有效消费、无期限/仅累计；GG084接续一期运行时 |
| GG-082 | 历史最小发行讨论 | GG083接续；原兑换/服务面值建议否决，首期数值未确认，未实现/发币 |
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

1. 打开F:/goodgood；读AGENTS/CURRENT_STATE/WORKFLOW/本页/BACKLOG与DEVELOPMENT_HANDOFF。核验本地标记、bb782c0/a73835f祖先，当前chore/GG-092-development-handoff；main不能代替此检查点。
2. GG091 worktree及旧GG024/C6分支均保留；新窗口不bulk merge/reset旧版本，不覆盖.codex/未提交用户内容。
3. 当前mock工作区32131/32142/32143及邮箱表单32191；依赖54449/56449/58049见交接。运行代码f68ba81，PID只是记录，先核验再停；根目录.env.local-review忽略，不打印凭据。
4. 使用交接中的启动/定向SQL命令；不fixture原用户数据、不进入真实provider32140栈、不重放线上清理。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
