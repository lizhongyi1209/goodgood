# GG-067 — Seedance tokens 定价配置

- Status: Implemented, verified and filled on local mock preview; not deployed.
- Date: 2026-09-14
- Branch: feature/GG-067-seedance-token-pricing
- Worktree: F:/goodgood-worktrees/GG-067
- Baseline: verified main bab17fd ancestor, fast-forward local GG-066 28dc0ed.
- Decision: [ADR 0070](../decisions/0070-seedance-token-pricing.md)

## Scope and acceptance

后台按模型/分辨率设置无参考视频、含参考视频的人民币/百万 tokens 售价。列表明确单位，编辑器支持实际 tokens 和响应 JSON 试算。保存版本、权限、失败保留输入沿用现有机制。识别用户给出的 metadata.usage.completion_tokens，不重复计算 total_tokens。保留图片价格、启禁、历史和真实 provider 32140。

仅在 32141 本地 mock 栈填 Seedance 常规官方原价。当前目录支持范围：2.0 480p/720p 46/28、1080p 51/31、4K 26/16；2.5 480p/720p 70/42；Fast 37/22；Mini 23/14（均为人民币/百万 tokens，无/有参考视频）。2.5 官方 1080p 77/46 仅记录，不扩大当前生成功能。

来源：[火山方舟模型价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)，2026-09-14 核对；不使用限时折扣。

## Verification and handoff / 下一步

定价配置、试算与 JSON 用量读取完成。定向测试 17/17 通过。一次完整 npm run check:local 的 lint、类型、构建及功能测试通过，469 项中 451 通过 / 17 opt-in 跳过 / 1 文档索引失败；补齐 BACKLOG 后文档契约 8/8 复验通过。没有运行会连接真实 Worker 的 opt-in 写测试。

原测试服务已停止，恢复 Docker Desktop 和原 goodgood-gg052 依赖容器，既有卷和数据保留；未重建/迁移/重置。GG-067 本机 Web 56576、mock 42311、Worker 72412，provider kind 固定 mock，分别使用 32141/32143/32142。最初 Worker 启动因 mock 尚未启动失败；mock 启动后正常恢复。Docker Desktop 自身启动了既有自动重启容器，没有手动修改真实 provider 栈或向其提交任务。

站长通过正常本地登录进入原 Chrome 页面 1648144383。四个视频模型各保存一次：版本 1→2、4 个追加模型事件、原价共 20 个费率；刷新后全部保留。保存前后 39 张非模型表的 count/hash 完全一致，全部图片模型记录（含自定义名称/价格/线路/启禁）、所有模型启禁及归档试价条目完全一致。

Chrome 验证 JSON 语法错误后输入保留，解析 metadata.usage.completion_tokens 成功；Mini 50638 无参考视频显示 ¥1.164674 / 117 积分，含参考视频显示 ¥0.708932 / 71 积分，不重复计算 total_tokens。390×844 页面宽 390、弹窗宽/scrollWidth 373，无横向溢出，滚动后的取消按钮可点击；恢复桌面。

下一步：用户检查 http://127.0.0.1:32141/admin/models，原标签页留在 Seedance 2.0 定价弹窗，试算设为 1080p、含参考视频、826200 tokens，浏览器确认 ¥25.6122 / 2562 积分。没有未保存价格修改。正式预扣、任务持久化、价格快照与实际扣款尚未接入；生产未部署，没有付费调用、推送或 main 合并。
