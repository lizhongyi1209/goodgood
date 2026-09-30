# GG-212 — 画布生图数量加减输入与 12 上限

- 日期：2026-09-30
- 工作区：`F:\goodgood-worktrees\GG-116`，延续 dirty 画布检查点，保留其他任务改动。
- 请求：所有画布图片模型的生图数量使用简洁减号 / 输入 / 加号组件，可手动输入，最高 12，默认 1。
- 决策：[ADR 0108 GG-212 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-212-addendum--canvas-count-stepper-through-twelve-2026-09-30) 已先记录；覆盖 GG-203 的 Nano 1/2/4/8 与 GPT 1/2/4 画布上限，大厅仍 1/2/4。

## 范围与验收

1. 复用已有 shadcn Button / Input；整数 1–12，边界按钮禁用，允许短暂清空编辑，失焦/回车规范为合法值，Escape 恢复。
2. 所有五个画布图片模型同步请求能力、报价数量、canvas 保存/恢复与生成批次约束。大厅原数量选项保持不变。
3. 新数量从同模型/分辨率/线路/质量的有效单图报价派生不可变 count-specific 版本；保留已有有效报价与历史版本，缺单图报价继续禁止提交。
4. 多图按完整批次处理和结算；根 agent 负责 GPT 单图 fan-out 与真实运行时整合，本子任务不调用 provider 或实际数据库。

## 实施状态

- 独立 `CanvasGenerationCountControl` 已写：复用 shadcn Button / Input，108×32px 圆角单排控件、纯数字输入、边界按钮禁用、合法值实时变更、空值/超界值在失焦或回车规范、Escape 还原、方向键加减；无新依赖。
- 前后端数量契约、所有五个图片模型 capability、画布数量 resolver、canvas JSON、价格计算和 batch/price schema 已同步整数 1–12；大厅 `GENERATION_COUNTS` 与旧 draft/project 约束保持 1/2/4。现有管理员出版与真实报价读取由 capability 自动覆盖新数量。
- Additive migration `0052_gg212_canvas_twelve_outputs.sql` 已写；根agent已执行于保留的本地54449库：按同 catalog model / resolution / 完整 line-quality context 的有效单图报价派生缺失 2–12 份额；继承 credit unit 和原失效日期，仅从启用线路读取，不覆盖已有有效多图报价或历史价格，不改余额/账本/素材/项目。
- 根 agent 负责在 `canvas-page.tsx` 替换原 ToggleGroup、调整响应式测量、GG-211 的路由策略与 GPT 单图 fan-out，以及必要真实本地运行同步。本子任务不碰 provider router/adapter、真实数据库或服务。
- 已静态审阅输入边界、数量保存、报价与管理员循环；相关 tracked 源码 `git diff --check` 无空白错误（仅既有 LF/CRLF 提示）。自动测试定义与集成由根 agent 统一。
- 按站长持续要求未运行自动测试、构建、浏览器复测或真实生图；未提交、切分支、启动服务或部署。主界面整合与真实运行同步完成后由站长手动验收。

## 根agent整合完成

- canvas-page已使用数量控件（按generator ID隔离输入，编辑锁定时禁用），向下参数面板计数行缩为一行。新画布所有模型多图通过canvas-image-v1逐张n=1任务集合处理，保留完整批次结算及同一节点展开/收起；旧GPT accepted jobs仍原生1/2/4，无marker的新非法数量API拒绝。
- 子agent补10个测试文件的定义：capability/画布与大厅边界、0/13/小数/字符串、精确及缺失报价、管理员数量出版、项目12保存/恢复、spinbutton边界、3个GPT模型12任务/n=1/原序结果、7/12恢复只补5次、未知提交不重发。静态diff check通过，全部未执行。
- 与GG-211共用隔离运行99e645c；启动必要npm ci、build/verify完成，本地0052/0053至53条；五模型活跃数量1..12、原画布项目1保留。Web34080/Worker34712ready，5173/34440代理版本一致。详见[GG-211](GG-211-canvas-gpt-routing-options.md)。本段完成状态替代上方子任务阶段的待整合/未运行描述；未做功能复测、付费请求或生产发布。
- 下一步由站长在5173手验每个模型加减/输入/边界、数字摘要、报价与按需真实批次生成、保存刷新恢复。
