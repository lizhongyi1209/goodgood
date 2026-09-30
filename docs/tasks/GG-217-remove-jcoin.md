# GG-217 删除平台币功能

- 日期：2026-09-30
- 状态：本地实现、精确整合、专项及运行切换完成；全门禁有15项已复现基线失败，未部署生产。
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

- 运行整合：从画布GG-218 verified ba9a947建立隔离GG-217-runtime，只叠加本任务commit73526a2，运行提交05e90d2f6fff2b9062f4b9a8fcd1286eb246e956。保留GG-218多页契约/仓库/0055（相对ba9a947无源码差异），不执行迁移，仍55条。npm ci、build:checkpoint、verify:checkpoint通过；sourceHash7a0a1373e34845018d4ca343c1561b1fde21351eb51667fa24806a8364c5c968，artifactHash16e4688619ee67d8bab5c9b0337f6a07c6ec183bf6fe6d47aa02bf8b793c52f5。
- 两次零active/outbox/personal+organization reserved/Valkey ready+processing并核验旧PID/revision后串行替换Web31576/Worker29504；新Web32131 PID25808、唯一Worker32142 PID6240五项ready均ok，5173/34440未动且代理同verified版本。三条旧API实际no-store410 FEATURE_REMOVED；Worker启动来源绑定同revision，退役测试在整合runtime4/4通过。
- 六张历史币表、个人/企业积分账户整行count/fingerprint前后完全一致；两个画布项目保留。活跃画布会话同步v2，画布整行fingerprint随版本296/schemaVersion2更新，不能宣称其整行内容不变；本任务只读检查，不写用户素材或画布内容。证据%TEMP%/goodgood-gg217-runtime-{before,after}.json。服务日志%TEMP%/goodgood-local-services/gg217-{web,worker}.{out,err}.log；外部cloud环境及忽略Valkey56549 helper沿用。

## 恢复工作与下一步

[运行整合清单](GG-217-runtime-integration.md)已执行，当前后端必须从GG-217-runtime/05e90d2接续，不能再启动未退役的ba9a947/29e566d Worker。GG-116仅精确合入本任务，不整树合并旧UI。下一步站长刷新5173手验正常积分与创作，后续独立处理15项旧测试期望；本任务无待实现功能，生产发布另行授权。
