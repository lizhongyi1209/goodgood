# GG-213 · 自适应、自动质量与透明背景开关

- 日期：2026-09-30。
- 状态：前后端本地实现与运行同步完成，待站长手验，未部署；不运行自动测试、浏览器复测或真实生成。
- 请求：自适应取消图标并居中文字，GPT自适应传auto；质量默认自动并按自动/低/中/高/超高/极高展示；透明背景变为默认关闭的开关，开启PNG与transparent。
- 决策：更新[ADR0108 GG-213](../decisions/0108-standalone-canvas-image-generation.md#gg-213-addendum--adaptive-gpt-size-auto-quality-and-transparency-switch-2026-09-30)，替代GG-211新节点medium默认和背景双选项。O1Key文档明确size auto，quality auto，background transparent（非trans）。GPT2只有auto/low/medium/high，2.5有全部六档，保持已核实能力。
- 范围：canvas专属比例选择/resolver，生成器默认与质量标签，复用shadcn Switch，响应式无滚动参数面板；服务端接受新画布GPT adaptive并发送size auto，旧大厅比例选择和已存手选值不重置。分辨率继续用于路由/报价，自适应结果真实像素来自输出解码。
- 工作区：GG-116/efb72d9保留全部现有未提交画布；独立本地运行从已验证99e645c提取任务增量，不批量合并。UI交给canvas_gpt_auto_settings_ui子agent；根处理后端、静态定义、文档和必要运行同步。
- 验收：新生成器默认自适应/质量auto/透明关；GPT自适应上游size auto，固定比例仍具体像素；透明开为background transparent +output_format png，关为background auto；草稿保存/复制/刷新保持选择。未代发生成或生产操作。
- 下一步：站长在5173手验新节点自适应文字、自动质量、透明开关和保存恢复，按需自行发起实际请求。

## 实施与运行证据

- 子agent改四个前端文件，使用canvas专属ratio options/resolver，使GPT adaptive保留；ratio卡片单行居中无图标。新quality:auto，旧草稿不重置，max文案极高；透明Switch复用现有shadcn，on写transparent+png/off写auto并保留格式，生成中禁用。完整向下弹框高度包含新增auto质量项和32px开关行，无新增依赖/滚动。
- API只放行canvas-image-v1 GPT adaptive，adapter按持久化policy与canvas route校验，size函数返回auto；固定比例具体像素不变。原batch字段/JSON已支持adaptive，无新迁移/报价。同步记录型mock的size直接校验（上游GPT无独立aspect_ratio）；不启用mock运行。
- 根从verified99e645c创建GG-213-runtime/feature/GG-213-canvas-gpt-auto-settings-runtime，只提8个任务源码/定义/卡片（包括GG211既有4K像素断言改为正确2880x2880），提交257f9596261147f94e1d0f8587b26e8bdface854。npm ci、启动必要build/verify:checkpoint完成。
- 在zero active/outbox/reserved/Valkey queues时替换旧Web34080/Worker34712；新Web32131 PID27492、唯一Worker32142 PID10032均五项ready ok，5173 Vite34440不变、代理同verified revision。53条迁移/原canvas项目1保留；外部cloud env与忽略Valkey56549 portfix沿用，日志%TEMP%/goodgood-local-services/gg213-{web,worker}.{out,err}.log。生产未变。
- 静态审阅/diff check通过；新增GG213测试定义覆盖auto、旧入口限制、quality默认、透明格式与能力差异，未执行。未运行check:local、浏览器复测、上传或付费生成；必要编译与readiness不是功能验收。人工验收待站长确认。
