# GG-062 — GPT 图片系列三线路

- Status: Implemented / verified locally; not deployed
- Date: 2026-09-13
- Branch: `feature/GG-062-gpt-image-lines`
- Worktree: `F:/goodgood-worktrees/GG-062`
- Baseline: GG-061 `a25cfe0`，已验证 main 为祖先。
- Decision: [ADR 0068](../decisions/0068-gpt-image-provider-lines.md)

## Scope / acceptance

三个 GPT 图片模型按 Banana 方式加入特价/优质/专线；默认特价，用户选线，站长独立线路价格/启禁。请求 ID 为 gpt-image-2、gpt-image-2.5-sunburst、gpt-image-2.5-flare 各自的 -sp/-sd/无后缀版本。保留已有价格、模型启用状态、Banana 配置、历史积分与生成/项目记录；旧空线路任务保留旧路由。质量/背景/格式、参考图、1/2/4 张仍用 GPT 编排。

## Verification / handoff

已实现：通用图片线路适用范围、三模型九个精确请求 ID、创作选择/报价/快照、站长分线路价格/启禁、批次与草稿/项目数据库约束。Banana 专属思考/search/逐张请求逻辑不变；GPT 仍单次请求 n=1/2/4。旧 GPT 空线路常量保留对象身份与版本，默认新任务持久化 special。无后缀专线使用新显式线路版本，与旧空线路区分。

- 定向 Banana/GPT 基线 16/16、新 GPT 接口/报价/恢复 4/4 与 SSR 2/2 通过；567 次注入 fetch 验证三个模型×三线路×七比例×三规格×三数量，五张参考图/5000 字提示词/高质量/透明 PNG 与错误线路在 POST 前拒绝。全部不调用真实模型。
- 显式新数据库 `goodgood_gg054_lines_test_gg062_v2` 在启用前确认无连接、无队列或 Worker；扩展 SQL 1/1 通过：原迁移/历史保留、GPT 三线路四张固定报价、默认特价路由、受理后改价/禁用仍保留价格快照、新请求拒绝、失败释放、草稿/项目恢复。v1 为测试状态未规范化的失败 fixture，保留隔离，未连接预览 Worker。
- 完整门禁首轮发现五条旧测试/交接断言仍限制 GPT 无线路或迁移 0032；更新相应断言与文档后定向 22/22。最终 `npm run check:local`（44124）461 项中 445 通过/16 opt-in 跳过/0 失败，lint/类型/构建通过，日志 ignored `.gg052-gg062-check-final.log`。门禁后仅文档更新。
- 停止原 Web 72111/Worker 36299/mock 62817，保留 Compose `goodgood-gg052` 数据服务。先创建 `.gg052-gg062-before.dump`，SHA-256 `7806a84fcca2c6bc529788b88f3f4fe40f5d1e317b02857156e5e440c7aec978`。原完整迁移入口因历史 0029 checksum 拒绝、未执行新迁移；随后按既有本地增量流程仅从独立目录执行 0033，不重跑/修改旧迁移 checksum。
- 更新后 Web 44103/Worker 29662/mock 71031 全部来自 GG-062。32141 `/api/health/ready`、32142/32143 `/health/ready` 均 200/ready，数据库/对象/队列/provider/runtime 检查 ok。仅 mock，无真实生图、试价保存或生产变更。
- 原 Chrome 1648144149 已打开 `/admin/models`：三个 GPT 各一个目录名称与三行独立价格；分别打开 GPT 2、sunburst、flare 编辑框，原特价三规格 ¥0.20，优质/专线为空且未启用，切线输入不继承特价。模型仍禁用。桌面与 390×844 窄屏编辑框检查通过，无横向溢出，viewport 已恢复；全部取消后保留模型页。
- 前后精确比较所有模型配置，仅三个空 GPT lines 按预期增加默认配置；其价格/启禁/版本/更新时间不变，Banana 全记录不变。十类历史 count/hash 全一致：账户审计 1、模型事件 12、价格版本 120、积分流水 4、积分账户 2，批次/任务/尝试/资产/项目各 1；活动任务/冻结仍 0。快照 ignored helper 沿用 `.gg052-gg057-before.json/after.json` 文件名。
- 最终交接文档定向 15/15 与 `git diff --check` 通过，无 secret、数据库备份、日志、构建物或用户资产进入 diff。

## 下一步 / limits

用户在 `http://127.0.0.1:32141/admin/models` 为三个模型分别设置线路价格与启禁后继续本地测试。线路就绪不等于自动启用：优质/专线初始未定价禁用，模型总开关保留禁用。无付费接口实测；真实线路响应、CI/main/image 与生产上线/迁移须使用后续独立范围。32140 真实 provider 栈与 production revision `65ceb168`/迁移 0019 不变。
