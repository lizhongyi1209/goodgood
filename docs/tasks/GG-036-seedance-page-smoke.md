# GG-036 — Seedance 页面真实接口实测

- 状态：本地实现与自动化通过，现有 Chrome 已打开接口可用页面；待用户发起页面实测
- 用户需求：打开创作页面的 Seedance 接口可用状态，供站长从页面完成一次真实测试。
- 最后更新：2026-09-12
- 分支 / worktree：`feature/GG-036-seedance-page-smoke` / `F:/goodgood-worktrees/GG-036`
- 基线：GG-035 已验证提交 `ff37d16`；这是依赖接口适配候选的堆叠分支，不代表已合入 main。
- 决策：[ADR 0050](../decisions/0050-enable-local-seedance-page-smoke.md)

## 范围与验收

- 要做：仅在本机显式启用一个服务端 Seedance 页面实测入口；密钥只从站长指定文件读取。
- 要做：页面显示接口可用，按现有线路/模型/模式/比例/清晰度/时长/声音提交一次任务，随后只
  轮询该任务并展示进度、失败或可播放结果。
- 不做：不接视频定价、积分、数据库、队列、资产库或生产配置；不改变图片链路；本切片不处理
  provider 无法访问的本地/私有参考素材。
- 验收点：默认和 production 失败关闭；loopback 与同源写入保护；无密钥泄漏；定向测试与完整
  本地门禁通过；使用现有 Chrome、未使用 Playwright，打开专用测试端口并显示“接口可用”。
- 授权边界：用户已明确要求页面真实接口测试并指定临时密钥文件；未授权部署或生产变更。

## 实现与证据

- 已完成：新增 `/api/video/preview` 本地路由、页面可用状态、单次提交/同任务轮询，以及加载、
  失败、完成播放界面。视频按钮不进入现有图片 `/api/generations`。
- 已完成：外部仍只接受显式密钥文件路径。Vite 宿主进程读取该文件后，把密钥作为仅本地 RSC
  Worker 绑定传入；浏览器和响应均不包含密钥，production 与未显式开启时失败关闭。
- 验证：接口状态 `GET http://127.0.0.1:32138/api/video/preview` 返回
  `200 / {"available":true,"persistence":false}`；没有创建 provider 任务。
- 验证：`npm run check:local` 通过，352 项测试中 338 通过、14 个 opt-in 跳过、0 失败；
  lint、TypeScript 和本地构建均通过。
- 验证：使用 computer use 在用户现有 Chrome 新建并保留专用
  `http://127.0.0.1:32138/create` 标签；切到视频后可访问状态明确显示“接口可用”，生成按钮可用。
  未使用 Playwright，未填写提示词、未点击生成、未新增计费任务。
- 运行时排查：最初 RSC Worker 无法直接读取 Windows 下载目录；改为 Vite 宿主按文件路径读取后
  注入仅服务端绑定。另发现跨 worktree 的 `node_modules` 联接会让 Vite RSC 混入旧绝对路径，
  已改为 GG-036 独立锁定依赖，页面恢复 200。
- 发布：未发布；正式入口与生产配置未变化。

## 恢复工作

### 2026-09-13 最新候选站长全排查入口

- 用户要求启动含真实接口的最新版本，由用户以站长身份排查；代理只启动和进行只读就绪检查，不代提交生成。
- 从 GG-043 已验证候选 `0899962` 的现有构建启动原生 Node Web，loopback 地址 `http://127.0.0.1:32140/admin/users`；不使用假数据预览参数。进程使用 development 环境，以保留仅本地 Seedance 实测入口，不改生产关闭规则。
- 恢复已有 `goodgood-gg033-real` 隔离依赖与真实 O1Key Worker；数据库仅有原测试用户，fixture owner 为 0；历史任务 3 条、未完成 0，未写入新任务或运行 fixture 测试。
- Windows 重启后将旧 PostgreSQL 宿主端口 `55443` 纳入 `55348—55447` 保留范围，导致容器健康但端口映射为空。仅重建该数据库容器、保留同名数据卷与网络，宿主端口改为 `55448`；Valkey/Object Storage 恢复为 `56443/59043`。
- Web 使用已有邮箱 OTP 配置；新增本地 Mailpit 辅助容器 `goodgood-gg044-mailpit`，收件箱 `http://127.0.0.1:58045`，SMTP 仅 loopback `58046`。SMTP verify 成功，代理未发送邮件。
- 图片密钥沿用已有服务端文件，Seedance 读取站长先前指定文件；不输出密钥、不连接生产。Worker readiness 全部 ok，`GET /api/video/preview` 返回 `available:true,persistence:false`，创作页 HTTP 200。
- computer use 已将现有专用 Chrome 标签切换到 32140 并确认显示站长工作台、账户管理、已有站长 `gg033-models@local.goodgood` 与 70 可用积分。使用原有有效登录会话，没有伪造 Cookie 或新增角色。32138 历史结果页未操作。
- 边界：视频仍不接积分、持久任务、素材创建/校验及视频资产库；用户真实调用可能计费。本次启动不等于全功能通过或部署完成。
- 下一步：用户在 32140 完成功能排查并反馈具体问题；未推送、合入 main 或部署。

- 下一步：用户在已打开页面输入提示词并提交一次真实文生视频；确认后再决定正式定价、持久任务、
  素材和资产链路。
