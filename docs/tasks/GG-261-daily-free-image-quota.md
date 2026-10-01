# GG-261 · 每日免费图片额度与明细来源契约

- 日期：2026-10-01；状态：来源契约已整合、代码/隔离SQL验证并进入5173/Web；免费规则待用户补充，未部署。
- 基线：`c6f6bb9`；后端复用 `/root/canvas_paste_image` 子agent，分支 `feat/GG-261-daily-free-quota` 保留；`F:/goodgood-worktrees/GG-261-daily-free-quota` 已精确整合并Git remove/prune退役，创建1/退役1，无子依赖/缓存/服务。
- 目标：每天每用户图片免费次数（用户示例 2 张）进入实际鉴权/计费/任务幂等与失败恢复；规则澄清期间不自行决定适用模型/规格。额度不是可转让充值积分；避免并发超额、重复请求、跨工作区重复享受和跨日错误释放。
- 后端范围：billing summary/activities 的数据契约、真实任务 ID/项目/模型、可分页只读查询；计费预留/结算/释放与最小 quota 持久化迁移及对应定向测试。前端由 GG-260 拥有；后端提交独立，不改账户 profile/0059、画布样式或无关运行。
- 预议契约：活动增加 taskId/projectName/projectId/modelName（非生成或不可恢复历史为 null），保留 batchReference 兼容；每页 20 上限。免费字段通过独立 dailyFreeQuota 摘要返回，UI 不合并货币积分余额。契约在实现前通知根/UI。
- 隔离：无真实 provider/上传或 Worker 共用数据库/队列写测试；SQL 写测试只可在明确命名临时库且无 Worker，先核对有效目标。子树不安装依赖、不生成缓存或启动长期服务。根统一集成和必要 verified Web/迁移同步。
- 下一步：每日数量与适用模型/规格明确后补免费ADR并实现quota/预留/终态返还，Web/Worker同时同步；已交付来源无待完成代码/运行步骤。

## 政策无关的明细来源（已实现、子树代码验证）

- 已同步登记基线 `62f4e26`。根负责 ADR0112 的来源/分页补充；当前子任务仅修改后台 gateway、generation API/repository、shared billing/generation contracts、0060、定向测试及此卡。
- 活动新增可选 `taskId/projectId/projectName/modelName`；新响应明确 string/null。taskId 仅来自同 owner 的真实 generation_jobs，旧 batchReference 保留。模型名读 batch 已冻结 catalog_model_name；项目名只读同 owner/workspace 的经典 projects 或明确关联 canvas_projects，不推断历史画布项目。
- 新任务在 batch.source_project_name 冻结受权项目的创建时名称，明细优先此真实快照；历史经典项目可显示受权行名，历史画布不反推。经典archive及canvas墓碑均保留原行，新scope FK不会改变现有删除流程，改名/删除不丢新任务的已记录出处。
- `canvasProjectId` 与经典 projectId 分开且互斥，限 canvas-image-v1；事务按 owner/workspace 检查真实持久项目和删除墓碑，hash 仅有值时新增键，不改变旧输入hash；恢复与重试保留关联。0060 只加复合 scope FK/来源列，不触碰0059、旧账本或真实数据。
- `view=usage` 在 SQL LIMIT 前排除 released/refunded、最多20条、cursor绑定filter+view。默认ledger旧视图保留50上限、旧cursor与return筛选；新前端由GG260兼容旧Web。
- 根接线当前 canvas sync ID；本地首次同步未完成前不得提交来源不存在的任务，输入保留。旧画布没有关联字段的历史任务显示 null。
- 子树定向 `gg261-credit-activity-source` + `m6-credit-activity` 15/15 通过；来源类型/API参数、保持旧hash、恢复/重试关联、owner/cursor隔离及usage分页投影已覆盖。9个相关源/类型/测试文件lint 0错误/警告，diff检查通过，均借用根唯一依赖、无子缓存。
- 定义 `gg261-activity-source-postgres`，默认隔离跳过，等待根创建空的 `goodgood_gg261_source_test*` 一次性库。开启需 `GOODGOOD_GG261_INTEGRATION=1`、`GOODGOOD_GG261_DATABASE_URL=<显式loopback目标>`、`GOODGOOD_GG261_NO_WORKER=1`；先断言空public schema和无其他client，测试自行应用完整迁移。真实repository验证合法classic/canvas冻结、外owner/workspace/不存在/墓碑拒绝且jobs/batches/ledger/outbox不变、复合FK/互斥check、改名/删除保留来源、20+8条visible分页及跨owner/view游标拒绝。仅一次性库生成合成任务/outbox，没有Worker或provider调用；不得用活动goodgood库。
- 未执行实际SQL、全量typecheck/build/gate、浏览器验收或真实API/provider写。父统一来源迁移/verified Web接线，不改变生产。

- 根证据：子 `936da92` 精确回放为 `d9e5aff`；来源/M6 15/15、相关 lint 完成。新空白 `goodgood_gg261_source_test_20261001` 无 Worker，全迁移后真实 repository SQL 1/1通过并删除。初次 SQL 发现旧公共毫秒 cursor 无法匹配 PG 微秒时间；根改为按同 owner/digest/毫秒区间查找、SQL text 保留完整时间作排序界限，同一微秒25条跨页不丢不重。未改历史流水或活动库数据。
- 运行交付：根 `9f9d788e31d6a671bf9b79a4f3294d6179310b06` checkpoint build/verify通过，sourceHash `e256cd039753a58f596e876f901db5201c9a5ad41a637e6f4b2b61e298be50e6`，artifactHash `498acdf8272bb7f75d3cf480beaee17d0766420733a79636215a5f20b29bea2f`、283 artifacts。本地54449/goodgood仅新增0060，users/jobs/ledger行数前后一致；迁移/重启前活动任务/outbox/冻结及两队列0。Web及5173代理verified同revision、activities未登录401，原cloud-development保留；Worker70e10c6仍ready，仅来源功能无需新关闭hook，免费尚未实现。

## 每日免费额度调查与待定规则

- 货币 ledger 强制非零；完全免费任务必须用独立图片配额/任务预留，不写0积分或可转让grant。建议(ownerId,上海day)锁、jobId唯一、冻结原日与gross/net；success在资产终态事务消费、failure/未知提交按既有customer释放在终态事务返还原日，重试新job重新预留。
- 混合费用建议精确 `ceil(grossBatchQuote * paidCount / requestedCount)`，不拿单张报价假设批次价格。提交带expectedFreeImageCount/expectedCharge，实际分配变化409且job/quota/ledger/outbox全回滚；保留原priceVersion guard。
- 预议独立 dailyFreeQuota: day/timeZone/resetAt字符串，limit/used/reserved/remaining有界number，eligible描述模型/规格。读取不向货币余额发放。模型/规格/每天数量政策尚未确认，不实际发放、不实现默认政策。
- Seedream requested_count=1但允许实际1–17输出；免费按次数还是实际图片张数必须明确，不能假装已解决。完全免费亦需保留原活动账户/工作区授权门禁。
- 当前GG226 Worker不懂新增quota关闭hook；真实free交付须一起同步Web与Worker，只有Web会造成额度悬挂。后续quota迁移分配0061；0124留给政策确认后的免费ADR。
