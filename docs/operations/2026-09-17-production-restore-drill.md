# 生产恢复演练与参考图校验缺陷（2026-09-17）

- 授权：站长在 2026-09-17 明确授权「开短维护窗口，一次做完」执行生产恢复演练。
- 边界：只使用既有的维护控制与备份/演练脚本；未改动应用镜像、数据库迁移、生产数据或凭据。

## 一、更正：生产备份一直正常运行

发布记录、`CURRENT_STATE.md` 与 GG-097 任务卡此前断言「备份 timer 自 2026-09-05 起
`disabled`，无自动备份」。**该结论是查错对象导致的，不成立。**

| 对象 | 实际状态 |
| --- | --- |
| `goodgood-postgres-backup.timer` | 已退役的 **staging** timer（09-04 安装），`disabled` |
| `goodgood-production-postgres-backup.timer` | **生产在用**：`enabled`、`active`，`ActiveEnterTimestamp` = 2026-09-06 12:00:18 CST，`OnCalendar=*:00,30`、`RandomizedDelaySec=5m` |

两者名字只差 `production-`，是这次误判的根源。实测生产仓库当时有 **90 个快照**，
`restic check --read-data` 60/60 packs、`no errors were found`。
即 09-05 之后一直存在 RPO ≤ 60 分钟的持续恢复点保障。

**因此 `controlled-alpha-operations` 门禁项保持 `fail` 的唯一原因是缺少对外告警通道**，
与备份无关。该缺口的授权状态不变，但不应再被描述为「连备份都没有」。

## 二、首次生产恢复演练

演练脚本 `goodgood-production-postgres` 第 115 行强制要求生产维护标记存在，
因此必须在一个短暂的公网 503 窗口内执行。

- 维护窗口：**17:09:25 开启 → 17:10:31 关闭，约 66 秒**。
- 窗口内先触发一次新备份，取最新快照 `ce191630`（17:09:37）。
- `restore-latest-drill` 结果：

| 项 | 值 |
| --- | --- |
| `restore_drill` | **passed** |
| 还原内容 | **59 张 public 表 / 2403 行 / 43 个迁移**（与生产 schema 一致） |
| 隔离方式 | `network=none`、`storage=tmpfs`，未覆盖生产库 |
| 观察到的会话 | 29（ADR 0042 允许保留，只报计数） |
| 活动生成 job | 0 |
| 归档 SHA-256 | `70f5e737e2a31eaa9ee43409b35e5e8fa39e00409f812008d4534549e6db7b80` |
| 快照 ID | `ce1916304d5a8908cb8ffa15595c9339c68a8e4fe3325257d323b1da33003688` |

- 收尾：演练容器与临时归档已删除；维护标记移除后 `nginx -t` 通过、reload，
  公网 `/`、`/login`、`/register` 均恢复 **200**。

**运维注意**：`maintenance-control.sh` 明确**没有 disable 动作**。关闭维护当前靠手工移除
`/etc/goodgood/production/maintenance.enabled` 后 `nginx -t` + reload。这是一处流程缺口，
下次演练前应考虑补一个受审查的 disable 路径。

## 三、发现未修复的线上缺陷：参考图校验耗时过长

- 当日 nginx error log 有 **41 次 `upstream timed out`**，全部集中在 **15:48–16:12**
  （早于本次演练操作），模式固定为：

  ```text
  GET  /api/references/<id>/content   → 127.0.0.1:3200 超时
  POST /api/references/<id>/complete  → 127.0.0.1:3200 超时
  ```

- nginx `proxy_read_timeout` 为 70s。
- **数据未丢失**：日志涉及的 5 个参考图最终全部 `ready`，但创建到校验完成的耗时：

| 参考图 | 创建 (UTC) | 校验完成 (UTC) | 耗时 |
| --- | --- | --- | --- |
| `581a3b60…` | 07:38:31 | 07:44:27 | 5 分 56 秒 |
| `c334dc8b…` | 07:49:34 | 07:54:10 | 4 分 36 秒 |
| `4f8df510…` | 07:52:30 | 07:56:02 | 3 分 32 秒 |
| `01eb7345…` | 07:50:38 | 07:52:49 | 2 分 11 秒 |
| `0f526563…` | 07:45:44 | 07:46:04 | 20 秒 |

- **用户影响**：多数超过 70s 读超时，用户会看到上传失败并重复上传，而素材其实已经入库。
- 同时段 green Web 日志**无任何错误**、`restarts=0`；主机 `MemAvailable` 约 1.85 GiB、
  根盘 44%，均在阈值内；对象存储指向私有 R2（非本机 RustFS），配置正常。
- 另记：`reference_assets` 中 `rejected` 12 条，`error_code` 均为 `UPLOAD_DECODE_INVALID`。
- **未定位根因，未做任何修改。** 属独立缺陷，需单独任务卡排查。

## 四、本次的实时计数（供后续核对）

users 25（全部 `active`）、assets 79、`generation_jobs` 98（70 成功 / 28 失败）、
参考素材 94 `ready` / 7 `pending` / 12 `rejected`。
