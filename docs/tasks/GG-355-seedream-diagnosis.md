# GG-355 · Seedream调用失败只读定位

- 日期：2026-10-03；状态：诊断完成；后继GG-356已于2026-10-04本地修复，未部署生产。
- 用户请求：刚才尝试调用Seedream报错，查看原因；本次范围只定位，不自动提交模型/重放/修改运行数据。
- 基线：GG-116干净16321f417c944ca1f9a4d88620b9aff94cb14065；应用源码检查点cc31fcce862f127400ac5a65ef26bf55743ea969。
- 所有权：根agent，无子agent；隔离codex/GG-355-seedream-diagnosis，C:/Users/Admin/.codex/worktrees/gg-355-seedream-diagnosis/goodgood，只改诊断/交接文档。
- 证据：只读连接已核验127.0.0.1:54449/goodgood；数据库连接设置default_transaction_read_only并使用BEGIN READ ONLY/ROLLBACK。Seedream目录enabled且1K30/2K60，所有Seedream任务查询为空；三处model_check均只有原五模型。Web错误与请求ID对应22:14:49/22:14:52两次POST /api/generations 503，均generation_batches_model_check失败。只取任务元信息/白名单诊断，没有提示词/图片/邮箱/凭据进入diff。
- 原因：0054仅插入模型目录/报价，漏扩展0028模型约束；db/schema.ts已有通用ID格式限制但迁移未同步。API未知SQL异常通用映射503，失败在批次插入处，早于任务创建/预留积分/派发Worker，源码事务回滚。
- 决策：不改变产品决定/模型能力/价格；无需新ADR。后续修复新增迁移同步三处约束，不能修改已经应用的0054或重置真实数据。
- 验证：执行用户委托的只读日志与SQL诊断、定向源码读取；未构建/lint/typecheck/代码检查/测试/浏览器验收，无SQL写入/Provider请求/扣费/重启或生产操作。
- 下一步：本轮诊断可交付；后续修复与本地迁移应用另行委托，应用后仅由用户自行触发真实生成，不自动重放两次失败请求。
- 结论：GG-355只读诊断完成：2026-10-03 22:14:49/22:14:52两次POST /api/generations返回503，Web日志均为generation_batches_model_check约束失败。已验证127.0.0.1:54449/goodgood（连接/事务只读）：Seedream目录启用且1K30/2K60报价存在，但generation_batches/projects/creation_drafts模型约束只含五个原有模型、缺seedream-5.0-pro；源码0054只加目录/价格未扩展约束。Seedream任务未落库，未到Worker/上游；按事务代码在预留积分前失败并回滚。当前请求仅诊断，未改代码/迁移/真实数据/服务或触发生成；后续修复应新增迁移放行三处约束，不重写已应用0054。GG-354源码检查点cc31fcce862f127400ac5a65ef26bf55743ea969及现有功能/运行保持；GG-350Worker原因采集待办继续。 另已确认db/schema.ts三处采用模型ID格式约束，与已应用SQL的五模型枚举不一致。

- 交付：诊断文档隔离e163349b3fa84e70c261b84c38ff6917d200d778精确接入23e686d0115ecb04f1893e64e5dd1516774a722e；应用源码检查点cc31fcc保持。创建1/退役1，managed辅助已确认归档，无子agent/缓存；仅用户委托的只读SQL/日志，不运行自动验收或后台更新。
