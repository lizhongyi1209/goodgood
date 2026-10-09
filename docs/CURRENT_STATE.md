# GoodGood 当前状态

- 最后同步：2026-10-09，仅分支备份与设计文档集成；本轮未探测或修改生产、本地 Web/Worker、数据库或队列。
- 最新累计画布源码：GG-421 `547022e`，`fix/gg-421-seedance-model-icon` 已完整推送 GitHub，远端 HEAD 精确一致。
- 当前文档任务：[GG-422](tasks/GG-422-design-system-docs.md)，`design/GG-422-design-system` 从 547022e 建立，接入 336f24a 的文档/并存 --ds token；[ADR 0144](decisions/0144-design-system-v3.md) 保持提议中，页面不迁移。
- 最近本地运行记录仍是 [GG-419](tasks/GG-419-local-seedance-activation.md) 的 verified `90e0605fb620e2ee0a052efc5a125bcdf4273ac8` 与 70 条迁移；本轮仅按用户委托执行文档测试和 build:local，不启动或重启服务，不以源码 HEAD 冒充运行 revision。
- GG-420/421 的 UI 手验仍由用户完成；分支备份或构建不等于生产部署、真实生成或手动视觉验收。
- 原入口全文、全部任务进度和当时的生产/运行记录保留在 [2026-10-09 画布状态归档](history/2026-10-09-gg422-context/canvas-current-state.md)。历史“当前”不是本轮重新核验的事实。

## 生产身份（继承记录，本轮未重新核验）


生产事实以 [GG-098 发布记录](releases/2026-09-21-gg098-manual-grant-ceiling.md) 为准。GG-100 后续只把同一应用迁移为单槽 `goodgood-production` Compose 并清理旧 blue/green 残留，没有更换应用镜像。

| 项目 | 当前值 |
| --- | --- |
| 源码 revision | `7888554a4650b1b06dbce4293c52e8c018e5c71b` |
| 镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:7deeab8c0257e9127326eb2fc14b5beecf370f5a22408361f613465a0b432270` |
| 数据库迁移 | `0044_gg098_raise_manual_grant_ceiling.sql` |
| Compose | 唯一 `goodgood-production` 项目；Web/Worker `3100/3101` |
| 注册 | 邮箱注册开放；新账户 `active`，欢迎积分 200 |
| 备份 | PostgreSQL Restic timer `enabled`/`active`，每 30 分钟；2026-09-17 恢复演练通过 |

生产应用支持真实身份、积分、图片生成、私有素材、资产库、项目保存恢复、站长运营能力。视频仍是临时文生视频预览，正式视频任务、积分结算和资产入库未接通。Nano Banana Pro 只展示价格，生成路由关闭。支付仍由人工登记，不是自动支付。

生产已知缺口只有对外告警通道；站长已于 2026-09-15 明确接受该 controlled-alpha 缺口。不得把本地 GG-101—239 的累计代码描述为已部署。


## 当前开发与数据边界

- 现行白色、无彩色界面与画布例外继续有效；设计目标仅在 docs/design 中登记，未接受新配色方案。
- 本地真实 O1Key 开发 Worker 可能计费。文档/构建不提交任务、上传或调用 Provider；fixture 与合成任务不得进入真实 Worker 共用数据库/队列。
- 当前 5173 使用 GG-116 工作树；本轮独立 GG-422 集成目录不替换该预览或实际运行构建。
- 生产数据、密钥、用户资产与日志不进入 Git；本轮只推送明确授权的两条分支，不开 PR、不合并、不部署。
- parked C6、完整 seed 和支付继续搁置；详情查 BACKLOG 和原任务卡。
