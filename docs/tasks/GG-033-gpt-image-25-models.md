# GG-033 — GPT IMAGE 2.5 模型扩展与真实验证

- 状态：本地实现与真实验证完成；未推送、未合入、未部署
- 用户需求：在 GPT IMAGE 2 上方新增 `GPT IMAGE 2.5 sunburst`，下方新增 `GPT IMAGE 2.5 flare`；三者使用相同接口与参数，并把 GPT IMAGE 2 的实际 provider 模型改为 `gpt-image-2`。完成本地真实出图验证。
- 最后更新：2026-09-12
- 分支 / worktree：`feature/GG-033-gpt-image-25-models` / `F:/goodgood-worktrees/GG-033`
- 基线：从已核验的 `origin/main` `42fc8d8` 建分支，再快进到已完成本地组合验收的 GG-032 `0642c87`；不恢复旧 C6。
- 决策：[ADR 0047](../decisions/0047-add-gpt-image-25-routes.md)

## 范围与验收

- 模型选择顺序保持 Nano 两项在前，随后为 `GPT IMAGE 2.5 sunburst`、`GPT IMAGE 2`、`GPT IMAGE 2.5 flare`。
- 产品模型 ID 与实际 provider 模型分别为：`gpt-image-2.5-sunburst` → `gpt-image-2.5-sunburst`、`gpt-image-2` → `gpt-image-2`、`gpt-image-2.5-flare` → `gpt-image-2.5-flare`。
- 三个 GPT 模型共用现有 GPT IMAGE 2 的 7 种比例与精确像素、`1K / 2K / 4K`、`1 / 2 / 4` 张、质量、背景和输出格式规则；透明背景与 JPEG 仍互斥。
- 三个 GPT 模型沿用每张 10 积分的现有产品定价；新增不可变价格记录，不改写历史 GPT IMAGE 2 价格或已生成记录。
- 草稿、项目、批次、重试、账单摘要、mock provider 与真实 O1Key 路由均接受新产品模型 ID；非法组合仍在计费和上游提交前拒绝。
- 定向测试与 `npm run check:local` 通过后，启动独立本地栈；真实 provider 与 fixture 数据严格隔离。
- 用户已明确授权本任务的真实出图测试。每个变更后的 provider ID 最多执行 1 次合成提示词、`1K / 1 张 / 自动 / 自动 / JPEG` 请求，分别验证 sunburst、GPT IMAGE 2 与 flare；不自动增加调用次数。
- 不连接生产数据，不推送、不合入 main、不部署。

## 决策检查

本任务改变根契约中固定的模型目录与 GPT IMAGE 2 provider 路由，因此先新增 ADR 0047；不把 provider ID 硬编码为 UI 中文标签，也不改变现有资产归属、积分结算或发布边界。

## 当前实现与证据

- 已建立独立 GG-033 worktree，并确认 `origin/main` 是 GG-032 的祖先；新分支从远端 main 建立后快进到 GG-032 已验证候选。
- 模型目录已按 sunburst、GPT IMAGE 2、flare 排序；前端与服务端统一使用 GPT 图片模型族判断，三个模型共享比例/尺寸、数量、质量、背景、格式、草稿、项目、重试和详情展示契约。
- O1Key provider 路由分别冻结为 `o1key-gpt-image-2.5-sunburst-v1`、`o1key-gpt-image-2-v3`、`o1key-gpt-image-2.5-flare-v1`，对应 provider model 均与产品 ID 完全一致。
- 迁移 `0028_gg033_gpt_image_25_models.sql` 已扩展四类持久化模型约束、三类 GPT 参数约束，并为两个新模型加入 18 条不可变 10/20/40 积分价格；新库实跑迁移到 0028。
- 新增 GG-033 能力、路由、payload、顺序、迁移和价格测试，并更新既有契约测试。`npm run check:local` 通过：331 项，317 通过、14 个 opt-in 跳过、0 失败；`git diff --check` 通过。
- 第一次真实栈预检发现基础 Compose 默认写入两个 fixture owner；在任务/尝试仍为 0 时立即删除该隔离栈及其卷。随后以 `localFixturesEnabled=false` 重建 `goodgood-gg033-real`，确认初始 `users=0`、任务/尝试为 0、Worker 为 `o1key` 且仅绑定 loopback 后才开始测试。
- 通过现有 Chrome 的单一专用标签页 `http://127.0.0.1:32133/` 完成真实测试，未使用 Playwright。三个模型各提交一次 `1K / 1 张 / 自动 / 自动 / JPEG / 无参考图` 请求，均为 `succeeded`，页面显示三张 1024×1024 图像且模型标注正确。
- 最终数据库为 1 个合成测试用户、3 个 job、3 个 attempt、3 个 Asset；三条 provider model/route 均精确匹配，账本为 1 次 grant、3 次 reserve、3 次 settle，可用积分 70、预留 0；活动任务 0、pending outbox 0、Valkey DB size 0，Worker readiness 全部为 `ok`。
- 测试页与隔离栈保留供用户检查；生产事实未变化，`docs/CURRENT_STATE.md` 未改。

## 恢复工作

- 下一步：用户检查专用测试页；如接受候选，再单独决定是否推送、合入 main 或进入部署流程。
- 阻塞：本地无阻塞；推送、main 合入和生产部署均未授权。
