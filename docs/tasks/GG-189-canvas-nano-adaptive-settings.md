# GG-189 — 画布 Nano 自适应设置、多图和向下弹层

- 日期：2026-09-29
- 工作区：`F:\goodgood-worktrees\GG-116`，现有未提交的 GG-116 画布检查点；不从停放的 C6 分支合并。
- 决策：[ADR 0108 GG-189 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-189-addendum--adaptive-nano-settings-and-media-ratio-wrapper-2026-09-29)。本次改变此前画布新生成器 1:1 默认、Pro 仅单张和设置向上展开的决策；大厅 `/create` 的默认比例不变。

## 范围与验收

1. 新画布生成器选择 Nano Banana 2 或 Nano Banana Pro 时，宽高比默认「自适应」。旧草稿保留原选项；GPT 模型继续使用现有固定比例。两款 Nano 都可选择 1、2、4 张，按钮从真实报价读取金额，提交、任务状态、其余图片节点和项目重开保持该选择。
2. 自适应在 GoodGood 领域中保存为 `adaptive`。Google [官方图像生成说明](https://ai.google.dev/gemini-api/docs/image-generation) 指出缺省比例会匹配输入参考图，无参考图时生成方图；O1Key Banana 请求省略 `aspect_ratio`，不向供应商发送未确认的 `adaptive`/`auto` 枚举。返回图以真实解码尺寸显示。
3. Pro 2/4 张沿用每张独立提交的现有 Banana 任务集合。0050 迁移从当前活跃单张版本按数量派生报价，各线路/分辨率独立；管理员以后修改单张规格价格时同时写入 1/2/4 版本。缺少活跃报价时禁用生成，不猜测价格或扣费。
4. 图片设置从触发器向下展开，关闭 Radix 自动翻转；底部空间不够时画布视角上移使面板可见。方向和容器封装在可供后续视频生成器复用的 `CanvasGeneratorSettingsContent`。
5. 已检查仓库现有 shadcn/ui `AspectRatio` 及源图片、结果图片、视频和生成器四类节点。它由宽度用 padding 计算高度，而当前节点宽高已由 React Flow 显式控制、元数据修正并按比例缩放。直接包裹会增加第二高度来源，引发选中框偏差或 ResizeObserver 反馈。本轮保留单一尺寸来源和现有真实媒体比例、直角图片与圆角生成器；不称已接入 AspectRatio。后续若有宽度驱动高度的新节点，可直接复用现有组件。

## 实施与边界

- 已修改画布草稿/项目校验、能力矩阵、O1Key 适配、隔离 mock 契约、Pro 报价读取及管理定价、0050 迁移、相关既有断言与画布设置面板。无新的浏览器凭据、付费请求或持久 schema 字段；迁移仅增报价行。
- 隔离本地运行树 `F:\goodgood-worktrees\GG-189-runtime` 从已验证 `7c224658` 摘取本任务所需后端、契约、启动器与 0050，提交 `76bfc50dbdf1d23d49fe79a813a7f7d4c00944a1`，没有合入 GG-116 未提交改动。锁定依赖已安装，`build:checkpoint` 和 `verify:checkpoint` 通过。隔离本地库 `127.0.0.1:54449/goodgood` 已事务应用 0050，关闭本地 fixture 重置；Pro 活跃 2/4 报价各增加 9 行。
- 32131 Web PID 16732 与唯一 32142 Worker PID 1516 均运行 `76bfc50`，五项 readiness 为 ok；5173 PID 25952 的全部 `/api` 已代理 32131，版本返回相同 revision 且 `build.verified=true`。原 32132 sidecar 在确认新项目路由和本地原有 1 项画布项目后停止。迁移账本为 0050，活跃任务、未派发 outbox 与 Redis ready/processing 均为 0。
- 本机 GG-164 的 Windows 端口保留仍使 Valkey 暂映射 56549；运行树只在 gitignored `dist/local-checkpoint-portfix.mjs` 中按既有做法覆盖启动器端口，不改跟踪源码或来源绑定构建。Web 使用仓库外既有云上传/SMTP 配置，Worker 使用仓库外既有云上传配置；任何密钥都未进入提交或日志。
- Google 官方说明支持省略比例的默认行为；O1Key 中转对省略字段的兼容性尚未经过站长的真实付费提交验证，因此不能把本次静态实现描述为上游已验收。
- 按站长要求未运行自动功能测试、浏览器复测或真实付费生成；仅执行运行时必要的受控检查点构建/来源核验、静态差异、只读健康/版本/队列/迁移核对。由站长在 `http://127.0.0.1:5173/canvas` 手验设置方向、无参考图/有参考图的自适应、1/2/4 报价及结果、刷新恢复和原比例缩放。
- 生产未变，未部署；O1Key 中转对省略比例字段的真实兼容性仍待站长手验。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
