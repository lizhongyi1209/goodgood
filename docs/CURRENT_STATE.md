# GoodGood 当前状态

- 最后核对：2026-09-24 GG-106 OSS 应用切换完成。生产身份 `d04b727` / 迁移 `0044` / 配置契约 `5efd131a…8885`；公网与注册均开放。
- 产品阶段：已开放的 `controlled-alpha-v1`，不是完整 seed/付费生产就绪。
- 正式入口：https://goodgood.o1key.com
- 当前工作：**GG-106 已在固定 `goodgood-production` Compose 项目发布**；新应用对象按 `oss/` 键写入私有阿里云 OSS，历史对象仍从 R2 读取，数据库 Restic 备份仍在独立 R2 仓库。2026-09-22 的用户/资产计数是历史快照，不能当作当前实时计数。
- 充值：运营已按「登记已收到的充值款」录入 4 笔，共 15100 积分（支付宝 ×2、支付宝收款、微信）。这不是自动支付，支付/支付宝结算仍搁置。
- **已知缺口（站长 2026-09-15 明确授权接受）**：`controlled-alpha-operations` 未通过——主机无任何对外告警通道。**备份本身不是缺口**：生产备份 timer `enabled`/`active`，每 30 分钟一次，2026-09-24 最新隔离恢复演练通过。见发布记录。
- GG-100 单槽位主机迁移已完成。GG-106 候选 `d04b727` 的 CI、生产预检、同槽位替换及公网探测均通过；生产 Web/Worker 各一，健康且重启次数为 0。历史 R2 对象 HEAD、OSS 探针 HEAD、应用签发的 ESA HEAD 均为 200；两个素材域名匿名 HEAD 均为 403。切换后观察到 1 条 `succeeded` 生成素材使用 `oss/` 键，其 OSS HEAD 和应用签发的 ESA HEAD 均为 200、匿名 ESA HEAD 为 403；未读取图片内容、未由发布探测发起模型调用。真实账号的浏览器上传、页内预览和跨账号拒绝尚未在此版本实测。详见 [GG-106 发布记录](releases/2026-09-24-gg106-oss-cutover.md)。不要自动恢复搁置的 C6。

## GG-099 / GG-100 单槽位发布（2026-09-22）

- ADR 0091 取消 blue/green 和 Nginx 切流；生产已迁移为唯一 `goodgood-production` 项目（Web/Worker `3100/3101`），healthy、restarts 0。
- 旧容器、网络、槽位/动态 upstream 与 14 个无引用镜像已清理；生产状态、秘密、备份和卷保留。恢复点 `71e758c4`，活动任务/冻结积分/Valkey 均为 0。
- 后续只在同一项目原地替换，迁移只前进、schema 不降级。完整记录：[GG-100 主机清理](operations/2026-09-22-gg100-single-slot-host-cleanup.md)。

## GG-093 本地运行边界

- 当前仅保留goodgood-gg052的PostgreSQL/Valkey/RustFS、gg044 Mailpit及无关项目容器；全部34个卷保留。旧GoodGood应用容器、镜像、空网络和构建缓存已按任务卡清理，生产主机与数据未触碰。
- 新版本须运行`npm run build:checkpoint`和`npm run verify:checkpoint`；启动脚本拒绝源码、Git revision或产物指纹不匹配。Web的`/api/health/version`返回`build.verified`与revision，作为跨窗口页面来源核验。
- GG-097起本地 worker 默认调用**真实** O1Key（真实计费），令牌从仓库外
  `%USERPROFILE%\.claude\goodgood-local-secrets\o1key-api-key.txt` 读取；`.env.local-review` 可显式改为 mock。

## 已上线的能力与边界

- Authing Google/邮箱验证码登录；后端验证身份并使用 GoodGood 自有会话。新账户注册即
  `active`、立得 **200** 欢迎积分，可立即创作；准入收口唯一依赖
  `GOODGOOD_EMAIL_REGISTRATION_ENABLED`（ADR 0090，取代 ADR 0020 的 `pending` 审批模型）。
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
- 保持香港现有服务器；新应用对象用私有 OSS，历史对象和独立数据库备份继续用私有 R2。支付/支付宝、自动账户删除、举报界面、完整外部删除条款、
  Grafana/复杂监控与大规模上线配套仍搁置。
- 不设置用户任务数或生成并发上限。持久队列用于可靠投递/恢复；可用内存低于 500 MiB
  或根磁盘使用率达到 80% 时继续阻止新生成。
- 站长只激活已亲自确认测试边界的用户。不得宣传完整隐私删除、付费服务保障或完整
  seed readiness 已经完成。

## 生产身份与环境

| 项目 | 最近核验记录 |
| --- | --- |
| 源码 revision | `d04b72752065d3ecc31b7b5bc7ca7ecc0988ebfa` |
| 镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:d183628ba6335a7debc1b564088041b8ecb058d1e91819be7d8e693e6f903a6e` |
| 数据库迁移 | `0044_gg098_raise_manual_grant_ceiling.sql`（44 条，59 张 public 表） |
| 配置契约 checksum | `5efd131aa1f6243f987c97498ca5e99571e99c4d4da1d0bc2cff4c468bff8885` |
| 活跃进程 | 固定 `goodgood-production` Web + 1 个 Worker；PostgreSQL/Valkey 健康；旧 blue/green 应用项目不存在 |
| 发布回退 | GG-098 不认识新的 `oss/` 键；一旦产生 OSS 记录，不能只回退旧镜像。同一 GG-106 双读镜像可按 ADR 0098 显式临时恢复 R2 写入；不切换槽位或 Nginx upstream |
| 主机 | 香港 2 vCPU / 4 GiB / 50 GiB；Web、Worker、PostgreSQL、Valkey 同机 |
| 对象与备份 | 新对象私有 OSS `o1key-goodgood`；历史对象私有 R2；加密异机备份 Restic → `goodgood-postgres-backups/production`。timer `goodgood-production-postgres-backup.timer` **`enabled`/`active`**。2026-09-24 新恢复点 `3b0a7627`，隔离恢复演练通过（59 表 / 6817 行 / 44 迁移） |
| 本地 | Windows 开发；Compose 使用本地 PostgreSQL/Valkey/RustFS/mock |

没有常驻远程测试环境。`staging-goodgood.o1key.com` 仅保留名称，非当前测试入口。
SSH 别名 `goodgood-staging` 是历史命名，指向现有生产主机，不能据名字当作测试机。
生产目录 `/opt/goodgood-production`，受保护配置 `/etc/goodgood/production`；不得将生产
数据或凭据复制回本地。主机地址和密钥不在本文存放。

## GG-091 授权测试用户清理

- 2026-09-14按用户明确授权删全部10测试账户（含1站长）及关联15资产、13素材、37终态任务和29R2对象；用户/文件均0。事前加密备份及服务器命名无Worker隔离还原/清理演练通过，全局配置/迁移0019/现有镜像不变；Web/唯一Worker恢复healthy，公网首页/ready200，未登录Session401。
- 清理后最新加密备份dd8f7ce6；发布时旧备份不是当前恢复点。
- 当前生产站长账户为 `951565127@qq.com`（09-15 重建，邀请码 405513）；登录/注册入口为
  `https://goodgood.o1key.com/login` 与 `/register`，已上线开放。本地工作区测试服务仍为 32131
  （`http://127.0.0.1:32131/login`），邮件查看入口 `http://127.0.0.1:58045`。
  不自动注册或重置数据。完整记录：[GG091清理](operations/2026-09-14-gg091-test-user-cleanup.md)。

## GG-098 热修发布历史（2026-09-21）
**首次带迁移的热修发布**，用 `DEPLOYMENT.md` 的生产热修清单。完整记录见
[GG-098 发布记录](releases/2026-09-21-gg098-manual-grant-ceiling.md)。该流程仅为历史事实，
不作为新窗口的操作模板。

- 身份：`7888554` / `sha256:7deeab8c…3270` / 迁移 `0044` / 配置契约未变；CI run `35449483809`。
- `0044` 只把单次发放上限 `5000` → `1000000`，其余子句照抄 `0039`，不改既有行。
- 流程：恢复点 `36f2a437` → blue 候选 Web → 迁移 → 停 green Worker → 起 blue Worker →
  原子换上游 + `nginx -t` + reload。切流后公网 200、session 401、队列/活动任务/冻结均 0。
- 真实生图冒烟（单独授权）：真实邮箱验证码登录 → Nano Banana 2 / 1K / 1:1 / 1 张成功，
  reserve→settle 各 1 次、冻结归零；私有读取自有 200 / 未认证 401。
  **跨账户拒绝未实测**，该项不得写成 `pass`；本次未跑完整 `production:alpha-gate`。

## 发布中发现的主机隐患：旧的 compose.production.yaml（2026-09-21）

blue 候选**首次启动即崩溃**（`GOODGOOD_EMAIL_OTP_SECRET_FILE could not be read`）。根因是
主机 `/opt/goodgood-production/compose.production.yaml` **是旧版本**：web 只绑定 4 个 secret，
缺 `goodgood_email_otp_secret` 与 `goodgood_email_smtp_password`（由 `d1af9ca` 引入）。
green 正常只因它当初用较新 compose 起过后**再未重建**，故上次发布未暴露。

已用本次 revision 的 compose 覆盖（旧版留 `compose.production.yaml.pre-gg098-backup`）。
**未来发布前必须先核对主机 Compose 与候选 revision 一致，否则原地替换必崩。**
单槽位项目名和端口已固定在 `compose.production.yaml` 与 Nginx 配置中；主机上的生产配置仍以受保护目录为准。

## 首次生产恢复演练（2026-09-17）

「备份 timer `disabled`、无自动备份」的旧结论**是错的**：真正 `disabled` 的是历史 staging
timer；生产 `goodgood-production-postgres-backup.timer` **`enabled`/`active`，每 30 分钟一次**。
因此 `operations` 项 `fail` 的唯一原因就是缺少告警通道。

首轮演练（维护窗口约 66 秒）：快照 `ce191630`，**`restore_drill=passed`**、
`network=none`+`tmpfs`，还原 **59 表 / 2403 行 / 43 迁移**。`maintenance-control.sh`
**无 disable 动作**；关闭维护需手工移除 `/etc/goodgood/production/maintenance.enabled`。

## 待排查缺陷：参考图校验超时（2026-09-17 发现，未修）

当日 41 次 `/api/references/*` 上游超时，素材最终全部 `ready` 但校验最长 **5 分 56 秒**，
超过 nginx 70s 读超时——**用户看到失败提示，素材其实已入库**。未定位根因。
完整证据：[演练与缺陷记录](operations/2026-09-17-production-restore-drill.md)。

## 最近验证（2026-09-09发布证据，清理后事实见上节）

## 历史验证（2026-09-09，已被后续发布取代）

- 发布候选 `65ceb168` 的 CI run `34298537112` 通过，artifact evidence `10084128969` 匹配，
  preflight 23/23；迁移 0013—0019 后门禁 8/8 通过。公网首页/readiness 200、未登录 401。
- 获授权 1 次真实 Nano Banana 2 生图（1K、1:1、1 张）：reserve/settle 各 1 次、冻结归零、
  1 个私有 Asset；跨所有者读取拒绝。
- 当次备份 `production-auto-20260909T014459Z.dump`（106122 字节，SHA-256 `99a6a09a…`）
  隔离演练通过：22 表 / 140 行 / 19 迁移，无网络 + tmpfs。
- 同期发现并修复 Sharp `GHSA-rgj7-g3m4-5g8c`，GG-023 固定 0.35.4 后 CI 恢复
  （安全候选 `18fe779b`）。完整证据：
  [2026-09-09 记录](releases/2026-09-09-cumulative-alpha-release.md)。

## 仓库与搁置工作

- **main 现在包含全部累计功能**（GG-097 已把 `main` 快进到发布候选并推送）。旧文档所说
  「main 不包含 GG081—091」已过期。main 或分支名仍不等于生产版本，新会话必须核对上面的
  完整 revision、镜像摘要和迁移。
- alpha 发布门禁每次发布仍须生成新鲜、绑定精确候选的证据，不能复用上一次结果。
  2026-09-15 本次为五项 `pass` + `controlled-alpha-operations` `fail`（站长授权带缺口开站）。
- 历史 C6 保存在 `archive/c6-deletion-content-safety-20260907`、独立 worktree 和已校验
  bundle 中；其删除/举报/完整 seed 内容没有随本次候选发布。见 [GG-900](tasks/GG-900-deferred-c6.md)。
- 完整旧计划在 `docs/history/`，仅按需追溯。

## 更新规则

仅在实际状态改变或重新核验后更新，替换旧摘要而非不断追加。代码完成、本地通过、CI 通过、
已部署分别记录；未知写“未验证”。发布需同时更新本页和发布记录；任务进度写任务卡。
