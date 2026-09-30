# GG-213 · 自适应、自动质量与透明背景开关

- 日期：2026-09-30。
- 状态：实施中，未部署；站长手验，不运行自动测试、浏览器复测或真实生成。
- 请求：自适应取消图标并居中文字，GPT自适应传auto；质量默认自动并按自动/低/中/高/超高/极高展示；透明背景变为默认关闭的开关，开启PNG与transparent。
- 决策：更新[ADR0108 GG-213](../decisions/0108-standalone-canvas-image-generation.md#gg-213-addendum--adaptive-gpt-size-auto-quality-and-transparency-switch-2026-09-30)，替代GG-211新节点medium默认和背景双选项。O1Key文档明确size auto，quality auto，background transparent（非trans）。GPT2只有auto/low/medium/high，2.5有全部六档，保持已核实能力。
- 范围：canvas专属比例选择/resolver，生成器默认与质量标签，复用shadcn Switch，响应式无滚动参数面板；服务端接受新画布GPT adaptive并发送size auto，旧大厅比例选择和已存手选值不重置。分辨率继续用于路由/报价，自适应结果真实像素来自输出解码。
- 工作区：GG-116/efb72d9保留全部现有未提交画布；独立本地运行从已验证99e645c提取任务增量，不批量合并。UI交给canvas_gpt_auto_settings_ui子agent；根处理后端、静态定义、文档和必要运行同步。
- 验收：新生成器默认自适应/质量auto/透明关；GPT自适应上游size auto，固定比例仍具体像素；透明开为background transparent +output_format png，关为background auto；草稿保存/复制/刷新保持选择。未代发生成或生产操作。
- 下一步：完成前后端整合，检查真实运行边界后同步保留的本地Web/Worker，再交站长手验。
