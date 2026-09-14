# GoodGood 当前状态

- 最后核对：2026-09-14测试用户清理后健康；部署身份仍为2026-09-09记录，不是实时监控。
- 产品阶段：已开放的 `controlled-alpha-v1`，不是完整 seed/付费生产就绪。
- 正式入口：https://goodgood.o1key.com
- 当前工作：GG-091邀请码/简洁登录本地实现验证完成，32141已更新，授权线上测试清理已完成；功能未部署。GG-023安全镜像仍未切生产。
- 下一个普通产品需求从 GG-092 分配，以BACKLOG核验占用；不要自动恢复搁置的 C6。

## 已上线的能力与边界

- Authing Google/邮箱验证码登录；后端验证身份并使用 GoodGood 自有会话。新账户为
  `pending`、获得 100 欢迎积分，由站长在 `/admin/users` 审核后才能创作。
- Nano Banana 2 支持 14 种宽高比、`1K / 2K / 4K`、每批 `1 / 2 / 4` 张与
  `10 / 20 / 40` 积分。新请求固定但不展示高思考，O1Key 顶层发送
  `thinking_level: "high"`；Google Search 可选，响应模态为 `TEXT + IMAGE`。
- GPT IMAGE 2 使用 `gpt-image-2-c-sd`，支持 7 种比例对应的精确像素尺寸、
  `1 / 2 / 4` 张和每张 10 积分；质量为自动/低/中/高，背景为自动/透明，输出格式
  默认为 JPEG 并支持 PNG/WebP。透明背景会禁用 JPEG。
- Nano Banana Pro 的 `1K / 2K / 4K` 单张标准报价均为 15 积分；provider 生成路由仍关闭，
  当前只展示价格，不能生成。
- 生成批次提交即形成稳定网格槽位，完成后原位替换；显示实际像素尺寸，不对原始结果
  调色。创作卡片和图片详情不显示收藏图标；下载按 Asset ID 获取新签名并直接交给
  浏览器下载管理器，使用短文件名。
- 上传并校验的参考图成为所有者隔离的持久素材，可从资产库复用；托盘最多 10 张，
  显示连续图号并支持拖拽或键盘调序。大图预览支持裁剪、画笔、贴图、箭头和 bbox，
  编辑结果另存为新素材并替换当前引用，原素材保留。
- 真实后端任务、原子积分预留/结算/释放、可靠队列、私有结果读取、资产库、项目保存恢复、
  创作草稿均已上线。GG-004 的重复派发/同 Worker 重入竞态已修复。
- 侧栏只显示积分余额；当前模型的单张和批次价格仍在创作器内显示。
- 保持香港现有服务器和私有 R2。支付/支付宝、自动账户删除、举报界面、完整外部删除条款、
  Grafana/复杂监控与大规模上线配套仍搁置。
- 不设置用户任务数或生成并发上限。持久队列用于可靠投递/恢复；可用内存低于 500 MiB
  或根磁盘使用率达到 80% 时继续阻止新生成。
- 站长只激活已亲自确认测试边界的用户。不得宣传完整隐私删除、付费服务保障或完整
  seed readiness 已经完成。

## 生产身份与环境

| 项目 | 最近核验记录 |
| --- | --- |
| 源码 revision | `65ceb16823138dd220813fbc3ae5672234fd1f43` |
| 镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:40ebfc40ced1963f02250bd8518823567e25692f82c31793817760cdb58db2cb` |
| 数据库迁移 | `0019_gg021_nano_banana_pro_prices.sql` |
| 配置契约 checksum | `98b82bc6760206c1316b3d6ca44db519dd3843c0aae74e9aff16d711d8618da6` |
| 活跃进程 | blue Web + 1 个 blue Worker；PostgreSQL/Valkey 健康 |
| 回退候选 | 旧 green Web 健康并停止接流；旧 green Worker 已停止，不做 schema 降级 |
| 主机 | 香港 2 vCPU / 4 GiB / 50 GiB；Web、Worker、PostgreSQL、Valkey 同机 |
| 对象与备份 | 私有 R2；加密异机数据库备份，目标 RPO 1h / RTO 4h |
| 本地 | Windows 开发；Compose 使用本地 PostgreSQL/Valkey/RustFS/mock |

没有常驻远程测试环境。`staging-goodgood.o1key.com` 仅保留名称，非当前测试入口。
SSH 别名 `goodgood-staging` 是历史命名，指向现有生产主机，不能据名字当作测试机。
生产目录 `/opt/goodgood-production`，受保护配置 `/etc/goodgood/production`；不得将生产
数据或凭据复制回本地。主机地址和密钥不在本文存放。

## GG-091 授权测试用户清理

- 2026-09-14按用户明确授权删全部10测试账户（含1站长）及关联15资产、13素材、37终态任务和29R2对象；用户/文件均0。事前加密备份及服务器命名无Worker隔离还原/清理演练通过，全局配置/迁移0019/现有镜像不变；Web/唯一Worker恢复healthy，公网首页/ready200，未登录Session401。
- 当前无站长测试账户；本地邀请码/新登录界面尚未部署。完整记录：[GG091清理](operations/2026-09-14-gg091-test-user-cleanup.md)。

## 最近验证

- 发布候选 `65ceb168` 的 GitHub main CI run `34298537112` 全部通过；不可变镜像与
  artifact evidence `10084128969` 匹配，生产 preflight 23/23 通过。
- 迁移 0013—0019 后，精确候选 controlled-alpha 门禁 8/8 通过；公网维护只在门禁通过后
  解除。公网首页/readiness 为 200，未登录资产/账单为 401，登录入口为 302。
- 获授权的历史修复只更新 1 条孤立 attempt 为 failed；修复前后均无活动 job、无冻结积分，
  未修改 provider task、资产、积分或错误证据。
- 获授权且仅执行 1 次真实 Nano Banana 2 生图：1K、1:1、1 张，约 23 秒成功；余额
  115→105，1 次 reserve、1 次 settle、冻结归零，生成 1 个私有 Asset。持久快照确认
  隐藏高思考、Google Search 关闭与 O1Key v4 路由；参考素材和生成资产跨所有者读取均拒绝。
- 最新备份 `/var/backups/goodgood-production/production-auto-20260909T014459Z.dump`
  为 106122 字节，SHA-256 为
  `99a6a09a1570fbf93ee69c27f27f3e2df324225b983c45f17bbb6854fd1211a3`；隔离恢复演练
  通过，22 个 public 表、140 行、19 个迁移，无网络、tmpfs 存储，实际约 12.7 秒。
- 切流后只有 1 个 Worker，队列为 0，活动 job/attempt 为 0，冻结积分为 0；blue Web/Worker
  重启计数均为 0，近期日志无错误。维护标记已移除。
- 可见 Chrome 标签页成功打开并显示 `GoodGood · AI 视觉创作`；后续页面树读取两次超时，
  因此没有把本次验证误写成完整浏览器 UI 流程。HTTP、数据库、队列、对象与真实 provider
  验证均已完成。
- 发布记录合并后的 main 镜像在 2026-09-09 新 Trivy 数据库中检出 Sharp 0.35.0 的
  `GHSA-rgj7-g3m4-5g8c`（HIGH，0.35.4 修复）；源码校验通过、镜像发布失败。线上仍是上表
  已通过原候选门禁的镜像；GG-023 负责升级依赖并恢复 CI，部署新候选前不得额外复用已耗尽的
  单次真实生图授权。
- GG-023 随后将 Sharp 固定到 0.35.4；PR run `34303864503` 和 main run `34304055572`
  均通过完整质量门禁及实际运行时 HIGH/CRITICAL 扫描。安全候选为 main `18fe779b`、镜像
  `sha256:b441e16685c77842e18cefcdbcae00c2e50d25350fe598ea2e462dd61758f152`；它没有自动部署，
  上表仍是当前生产身份。
- 完整非敏感证据：[本次累计发布记录](releases/2026-09-09-cumulative-alpha-release.md)。

## 仓库与搁置工作

- `main` 是经核验的集成基线，可以因文档提交领先线上；分支名或最新 main 不等于生产版本，
  新会话必须核对上面的完整 revision、镜像摘要和迁移。
- alpha 发布门禁已在干净基线恢复并于本次精确候选通过；每次后续发布仍须生成新鲜、绑定
  精确候选的证据，不能复用本次结果。
- 历史 C6 保存在 `archive/c6-deletion-content-safety-20260907`、独立 worktree 和已校验
  bundle 中；其删除/举报/完整 seed 内容没有随本次候选发布。见 [GG-900](tasks/GG-900-deferred-c6.md)。
- 完整旧计划在 `docs/history/`，仅按需追溯。

## 更新规则

仅在实际状态改变或重新核验后更新，替换旧摘要而非不断追加。代码完成、本地通过、CI 通过、
已部署分别记录；未知写“未验证”。发布需同时更新本页和发布记录；任务进度写任务卡。
