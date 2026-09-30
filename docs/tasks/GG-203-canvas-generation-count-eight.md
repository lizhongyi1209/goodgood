# GG-203 — 画布生成数量纯数字与 8 张

- 日期：2026-09-30
- 工作区：`F:\goodgood-worktrees\GG-116`，继续现有未提交的画布检查点，保留无关改动。
- 请求：图像设置的生成数量去掉「张」，新增 `8`。
- 决策：[ADR 0108 GG-203 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-203-addendum--canvas-eight-image-nano-batches-2026-09-30)，修改 GG-189 的画布 Nano 1/2/4 数量上限。

## 范围与验收

1. 画布 Nano Banana 2/Pro 的数量按钮仅显示 `1`、`2`、`4`、`8`，默认仍为 1。GPT 保留 1/2/4，大厅控件不新增 8。
2. 8 必须贯通生成请求校验、项目草稿保存/恢复、每张独立 provider task 集合、真实 count-specific 报价、积分预留与完整结果集合；仅用户明确点击才提交。
3. 新价格按相同 Nano catalog model、分辨率和已启用线路的活跃单张报价乘 8 派生，新增不可变版本。无活跃报价时继续禁止提交，不在浏览器猜价。
4. 沿用原子批次：全部 8 张成功后统一存资产与结算；任一失败按原失败/释放流程，不引入部分结果或部分结算。
5. 不改变单节点堆叠和显式展开，不增加 provider 原生 `n=8`，不改其他模型能力、默认参数或生产。

## 实施状态

- 源码已完成：画布专用数量选项和 resolver、生成/报价类型、服务器能力、任务集合解码、报价读取与管理员发布、canvas JSON 和 batch/price schema 同步支持8。既有单节点堆叠按真实 outputs.length 渲染，无4张硬限。默认、其他模型和大厅选项不变。
- 画布提交 `projectId:null`，旧大厅 `projects` / `creation_drafts` 不保存该生成器草稿；本次只扩展 canvas JSON 和 generation batch/price 数量边界。
- 契约、精确/缺失报价、GPT拒绝8、canvas数量保存及八任务集合回归断言已补；未执行。静态审阅确认无 GenerationCount exhaustive Record 遗漏、无 provider 原生多图参数，`git diff --check`通过。按站长持续指令，不运行自动测试、浏览器复测或真实 provider 请求；必要运行编译不作为功能验证。
- 主 agent 从已验证 `94ec17f` 创建隔离运行树 `F:\goodgood-worktrees\GG-203-runtime` / `feature/GG-203-canvas-count-eight-runtime`，只摘本任务10个后端/契约增量、0051与记录，提交 `3733ced4b9d60bccbad41510e16645124dd3eff9`；锁定依赖安装与启动所需 `build:checkpoint` / `verify:checkpoint`完成。GG-116前端及其他改动未提交。
- 在数据库零活跃任务、零未派发outbox、零冻结和Valkey空队列条件下停止旧Web33820 / Worker28064；本地54449事务应用0051，`localFixturesEnabled=false`，新增Nano2 active count-eight报价12行、Pro9行，原画布项目1保留。生产数据未改。
- 当前Web32131 PID3044 / 唯一Worker32142 PID29328同为该verified版本，两者五项readiness均ok；Vite5173 PID34440未动，代理版本一致。日志为 `%TEMP%\goodgood-local-services\gg203-{web,worker}.{out,err}.log`；本任务增量patch在 `%TEMP%\goodgood-gg203-backend-only.patch`。
- 未运行功能测试、浏览器复测、真实上传或生图，未部署；下一步由站长在5173手动验收数字选项、真实8张报价/结果、批次展开收起和刷新恢复。
