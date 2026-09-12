# GG-033 — GPT IMAGE 2.5 模型扩展与真实验证

- 状态：实施中
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
- 尚未修改运行时代码、迁移或测试；尚未发起真实 provider 请求。

## 恢复工作

- 下一步：实现共享 GPT 能力族、三条 provider 路由、持久化约束与价格迁移，补齐 UI/服务端/适配器测试。
- 阻塞：当前无实现阻塞；真实请求前仍需验证专用栈目标、provider kind、账户余额、活动队列和密钥仅从受保护本地配置读取。

