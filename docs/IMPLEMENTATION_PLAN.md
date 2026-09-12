# Production implementation plan

- Last synchronized: 2026-09-12
- Current phase: GG-034 图片 / 视频创作模式、统一上传、显式素材创建前端流程与统一媒体资产选择已完成本地实现和验证；等待用户检查。
- Current objective: 保持 32136 专用预览可检查；真实视频接口待用户后续提供。

## Current checkpoint

- 当前工作树：`feature/GG-034-video-creation-frontend`（`F:/goodgood-worktrees/GG-034`），基于 GG-033 已验证提交 `dea84c0`。其他 worktree 保持不变。
- 正式入口仍为 `https://goodgood.o1key.com`；`staging-goodgood.o1key.com` 只是历史名称，不是本任务的测试入口。
- 组合来源：完整基础框架 `07e9ea5`，再合入 GG-029、GG-030、GG-031；不使用旧页面另起测试版本，也不恢复旧 C6。
- 代码范围同时包含账户管理、积分记录/账本、企业/分销身份、直属上下级、充值来源积分划拨、邮箱 OTP、企业 Workspace、成员额度、消费记录、资产审阅和管理审计。
- 迁移顺序连续覆盖 `0020`—`0028`，当前发布元数据断言使用最终迁移 `0028_gg033_gpt_image_25_models.sql`。
- 线上入口与生产数据保持原状（生产 revision `65ceb168`，迁移 `0019`）；本任务不连接生产、不发送真实邮件，只在隔离本地栈按 GG-033 授权调用三次真实生图 provider，不推送或合入 main。
- `git diff --check` 与 `npm run check:local` 通过，完整门禁 339 项中 325 通过、14 个 opt-in 跳过、0 失败。
- 隔离 Compose `goodgood-gg032` 已完成全栈验收：Web、Mailpit、PostgreSQL、Valkey、对象存储与 mock generation 全部只绑定 loopback，迁移执行到 `0027`；验收后容器和网络已删除，专用数据卷保留。
- Computer Use 失败根因是 CUA 子进程丢失 Windows 代理环境；本机 CUA 启动器注入 `NODE_USE_ENV_PROXY` 与 `127.0.0.1:10808` 后，新会话初始化成功。当前只可用 Chrome extension provider，因此按用户要求只控制一个专用测试标签；未使用 Playwright。
- 完整浏览器流程通过：老板 OTP/pending/欢迎积分、站长 bootstrap、建企业、`500` 测试积分、邀请员工、员工 OTP/pending、站长审核、接受邀请、分配 `200` 额度、一次 `10` 积分 mock 生成、消费与资产审阅、成员暂停/恢复均符合预期；`390×844` 窄屏检查无横向溢出。
- 结算后员工剩余额度 `190`、企业可用 `490`；数据库任务与尝试各 1 条且均为 `succeeded`，Valkey 活跃生成队列为 `0`。Web/Worker 均为 mock provider，没有真实邮件、真实 provider 或生产访问。
- GG-033 使用 ADR 0047：模型顺序为 sunburst、GPT IMAGE 2、flare；三者共享 GPT 参数与每张 10 积分规则，provider ID 分别为 `gpt-image-2.5-sunburst`、`gpt-image-2`、`gpt-image-2.5-flare`。
- 真实栈第一次预检发现默认 fixture owner 后，在 0 任务状态删除栈和数据卷；重建时关闭 fixture，确认初始用户/任务/尝试均为 0，迁移到 0028，Worker provider 为 `o1key`。
- 现有 Chrome 中仅新建并控制 `http://127.0.0.1:32133/` 专用标签页，未使用 Playwright。sunburst、GPT IMAGE 2、flare 各完成一次 1K/1 张/JPEG 真实生成，页面显示三张 1024×1024 结果。
- 最终 3 个 job、3 个 attempt、3 个 Asset 均成功；三条 provider model 与 route version 精确匹配；余额 70、预留 0、活动任务 0、pending outbox 0、Valkey DB size 0。隔离栈和测试页保留供用户检查。
- GG-034 已完成常驻图片/视频切换、独立会话草稿、Seedance 2.0—2.5 能力参数、本地图片/视频/
  音频素材，以及 `全部 / 图片 / 视频 / 音频` 统一资产选择器。当前图片数据来自真实生成资产与
  上传素材，视频/音频保持接口待接入空态。视频生成模式默认多模态；首尾帧只开放两张图片，
  上传菜单和资产筛选随模式禁用；托盘只保留一个左下角模式化标签，多模态显示紧凑媒体序号，
  首尾帧只显示帧用途。完整门禁 339 项中 325 通过、
  14 个 opt-in 跳过、0 失败；现有 Chrome 单页已完成两种模式、容量、禁用状态与标签归一化验证。
- 视频本地上传已合并为一个只接受图片/视频/音频且不带右侧类型备注的 `上传素材` 入口；
  `创建素材` 是显式零预选流程，普通上传不会触发。界面记录后续并发创建与历史素材提交前
  有效性复检，接口到达前不伪造
  素材 ID 或成功状态。
- Next action: 用户检查 `http://127.0.0.1:32136/create`；提供视频接口后另建后端接入任务。
- Blockers: 前端无阻塞；视频上传、生成、计费、持久化和资产结果等待接口契约，不属于本阶段完成项。

## Verification sequence

1. 用户在保留的 Chrome 专用页检查视频模式、Seedance 参数和资产库选图入口。
2. 用户提供视频接口后另建后端接入任务；本阶段不提交视频请求或上传新的视频模式素材。
3. 推送、main 合入和生产部署必须获得新的明确授权；部署前按 ADR 0047 排空旧 GPT route 的活动 attempt。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M2 | 已完成基线 | 产品、设计、前端与容器/CI 基础 |
| M3—M6 | 已完成核心链路 | 持久任务、身份、模型、积分、资产与项目 |
| M7—M8 | 已完成并已开放 controlled alpha | 香港链路、恢复与发布门禁 |
| GG-023 | 实施中 | Sharp 0.35.4 安全修复；未获新生产授权 |
| GG-024—GG-027 | 已合入本地完整基础框架 | 账户/积分/业务身份/直属关系/来源划拨，GG-032 组合验收通过 |
| GG-029 | 本地候选已验证 | 自建邮箱 OTP；生产外部证据与演练未完成 |
| GG-030 | 阶段 0—4 本地完成 | 企业成员、额度、创作归属、管理 API/页面 |
| GG-031 | 自动化完成 | 邮箱与企业集成已在 GG-032 完整基线上复验通过 |
| GG-032 | 待用户确认 | 完整基础 + OTP + 企业的本地组合验收完成 |
| GG-033 | 本地完成，待用户检查 | GPT IMAGE 2.5 模型扩展、GPT IMAGE 2 provider ID 更新与三模型真实本地验证均完成 |
| GG-034 | 本地完成，待用户检查 | 图片 / 视频切换、Seedance 参数、默认多模态/首尾帧、模式化素材上限与统一媒体资产选择；不接真实接口 |
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 阅读根 `AGENTS.md`、[CURRENT_STATE](CURRENT_STATE.md)、[WORKFLOW](WORKFLOW.md)、本页和 [BACKLOG](BACKLOG.md)，检查分支/worktree/未提交改动。
2. 从 `feature/GG-034-video-creation-frontend` 恢复；先读 GG-034 任务卡和 ADR 0048，不恢复旧 C6。
3. 本任务不得提交视频 provider 请求；main 合入和生产部署仍需要新的明确授权。

## History and update policy

- 完整历史日志仅供追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写入对应任务卡，发布事实写入 `docs/CURRENT_STATE.md`。
- 本页只维护一个当前检查点、验证顺序和下一步；不得把未执行的线上动作写成已完成。
