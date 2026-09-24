# GG-106 生产发布记录：应用对象存储切换至私有 OSS（2026-09-24）

## 身份与范围

| 项 | 记录 |
| --- | --- |
| 站长授权 | 同意将独立候选合入 `main`，在 CI 不可变镜像、生产预检、单槽检查通过后发布 |
| 生产 revision | `d04b72752065d3ecc31b7b5bc7ca7ecc0988ebfa` |
| 镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:d183628ba6335a7debc1b564088041b8ecb058d1e91819be7d8e693e6f903a6e` |
| 迁移 / 配置契约 | `0044_gg098_raise_manual_grant_ceiling.sql` / `5efd131aa1f6243f987c97498ca5e99571e99c4d4da1d0bc2cff4c468bff8885` |
| CI | [run 35983011527](https://github.com/lizhongyi1209/goodgood/actions/runs/35983011527)：`Verify source and image`、`Publish immutable image` 均 success |
| 工件证据 | artifact `10801121979`，SHA-256 `0d8796187195274352910b87af24f944fc1c1d0c0c302c09ca34364b41fdcbb4`；仓库验证器五项全通过 |

候选从 GG-100 基线隔离，只包含 GG-106 应用、配置、ESA 和文档变更；未把开发分支 GG-101—105 的其他应用功能一并发布。新对象按 `oss/` 前缀路由到广州私有 OSS，旧前缀对象保留在 R2 并继续读取；Restic 数据库备份仍使用独立 R2 仓库。正常运行的 `OBJECT_STORAGE_EMERGENCY_R2_WRITES` 为 `false`。

## 发布前门槛

- 候选本地 `npm run check:local`：542 通过、26 隔离跳过、0 失败；OSS/预检定向 13/13，文档连续性 8/8。
- 云端专用 RAM 签名 PUT 200、ESA 签名 GET/HEAD 200；匿名、伪造、过期和错误路径被拒绝。随机写入探针精确删除；用户另建的 `oss/gg106-probe/Probe.txt` 保留用于发布核对。
- CI 产物的原始工件字节经 GitHub API 验证；镜像标签与提交、迁移、配置契约一致。主机受保护的三份新密钥文件均为 root:986、0640；旧 R2 凭据保留。`production:preflight` 所有检查通过（2026-09-24T09:50:05Z），包括 SMTP 连接及鉴权，不发送邮件。
- 发布前活动生成任务、未完成参考图上传、冻结积分账户均为 0。新 Restic 快照 `3b0a7627641e8238777bac8078493903b29eab000f398ae7f2aa97822e8dcf7f`；仓库完整性检查通过。进入维护后从该快照恢复到无网络、tmpfs 目标，核对 59 张 public 表、6817 行、44 个迁移；活动任务 0。归档中观察到 37 个有效会话，未复制到本地、撤销或使用会话。

## 单槽切换

1. 生产 `release.env`、`runtime.env` 做 root-only 备份后更新；原件备份后缀为 `pre-gg106.20260924T094954Z`。旧 R2 API endpoint 从原运行文件沿用为 `LEGACY_R2_ENDPOINT`，不触碰独立备份配置。
2. 固定维护页返回 503；再次核对三类活动量为 0，停止唯一旧 Worker，再停止旧 Web。
3. 主机 `compose.production.yaml` 用精确候选版本原子替换；旧版备份为 `compose.production.yaml.pre-gg106.20260924T095337Z`。Compose 配置解析通过；仅运行当前已应用的 44 个迁移，未重置或倒退 schema。
4. 在同一 `goodgood-production` 项目启动新 Web，再启动唯一 Worker。两者 live/ready 均 200、镜像 revision 相同、重启次数 0；队列/未完成上传/冻结账户仍为 0，`MemAvailable` 2472 MiB、根盘 43%。
5. `nginx -t` 通过，移除维护标记并 reload；主机源站和外部公网 `/`、`/login`、`/register` 均 200，未登录 `/api/auth/session` 为 401。备份 timer 仍 `enabled`/`active`。

## 发布后只读核验与限制

- 从生产候选代码的对象路由，历史 R2 参考素材 HEAD 200；OSS 探针 HEAD 200；应用签发的 ESA 签名 HEAD 200。ESA 读取域名及 OSS 上传域名对该私有对象的匿名 HEAD 均为 403。探测不输出对象键、内容、签名 URL 或密钥。
- 切换后观察到 1 条新生成素材的 `oss/` 数据库记录，对应任务为 `succeeded`；仅对该对象执行 HEAD，OSS 200、应用签发的 ESA 200、匿名 ESA 403。未读取用户图片内容，也未由本次发布探测发起模型调用。这证明新生成结果实际写入 OSS 且该对象的域名访问受签名限制；不证明浏览器或跨账号体验。
- 浏览器自动化连接失败，尚未核验真实账号的浏览器直传、页内预览及跨账号拒绝。用户资产不作为自动内容探针。模型生成可能计费，本次没有单独授权，故**我们**未调用模型。这些是明确的验收余项，不算已通过。
- 完整 `production:alpha-gate` 未重新执行：本次未重做真实会员/模型调用和跨账号旅程；历史 manifest 不可充当当前 revision 的新鲜证据。`controlled-alpha-operations` 无对外告警通道仍为已获站长接受的 `fail`，不可改写为通过。
- GG-098 镜像不能读取 `oss/` 键。出现新 OSS 对象后不能单独回退 GG-098。故障时只在当前双读 GG-106 镜像上按 [ADR 0098](../decisions/0098-emergency-dual-read-r2-write-recovery.md) 显式临时启用 R2 写入，并在同一单槽项目内切换 Web/Worker；原 R2 历史素材不迁移、不删除。

下一步最小验收：由已登录的正式账号上传一张非私人测试图，核对 `oss/` 记录、OSS 私有对象、本人预览与未登录拒绝；另用不同账号核对所有者隔离。若要由发布人员主动触发新的真实模型调用，须另获计费测试授权。
