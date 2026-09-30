# GG-217 删除平台币功能

- 日期：2026-09-30
- 状态：代码实现/专项验证完成，已精确合入GG-116；运行整合中，未部署生产。
- 分支 / worktree：`feature/GG-217-remove-jcoin` / `F:/goodgood-worktrees/GG-217`
- 基线：GG-214 `29e566d`，已核验GG-213 `257f959`为祖先；画布GG-218最新运行`ba9a947`接续。
- 决策：[ADR0117](../decisions/0117-retire-jcoin.md)

## 范围与验收

移除个人/站长平台币入口与页面、工作区路由、API、自动奖励任务和专属模块。旧API纯no-store410，不初始化平台币资源；历史0040迁移/六张账本表保留，不清空数据。正常积分、充值、消费结算、退款和画布保持。

前端/导航与后端/Worker两个子agent独立实施，审计子agent核对积分依赖与基线失败；根负责ADR、精确整合、验证和运行交接。未触发上传、生图或生产操作。

## 实现与证据

- 删除个人/管理页、features/jcoin、server/jcoin及两份DTO，移除桌面/手机/管理导航和Worker奖励导入、15秒timer、shutdown等待；保留生成恢复/处理/成败ack/drain。
- 三条App API与Node Web旧URL返回410 FEATURE_REMOVED，无平台币鉴权/SQL。正常credits/billing/generation入口与事务保持，0040无修改。
- GG-116精确合入共享主页/runtime差异，保留GG-215 G品牌、canvas-only guard、画布GG-216/218所有文件。不得整树合入旧UI。
- 验证：退役/导航8项、受影响GG-117路由及原正常导航/画布路由通过；类型检查、构建、Seedream相关7项通过。文档连续性8项通过。
- check:local：614项，577通过、15失败、22跳过；lint0错误/109警告，typecheck/build通过。15个同名失败全部在未改GG-214源码复现，无新增失败；日志%TEMP%/goodgood-gg217-check-final.log及goodgood-gg217-baseline-failures.log（UTF16LE）。全门禁尚未绿。
- 首次门禁暴露GG-214 Seedream报价返回string与金额模板类型不兼容；仅补精确整数JSDoc类型，不改计算逻辑，15项定向验证通过后重跑全门禁。

## 恢复工作与下一步

[运行整合清单](GG-217-runtime-integration.md)列明最小后端同步。GG-218已完成ba9a947/0055本地运行切换，GG-217接续准备隔离候选；核对零活跃/冻结/队列及最新PID后串行替换同一Web/唯一Worker，不新开第二个Worker。不做数据库迁移/数据删除，未部署生产。下一步记录实际verified revision、旧API410及就绪，更新检查点。
