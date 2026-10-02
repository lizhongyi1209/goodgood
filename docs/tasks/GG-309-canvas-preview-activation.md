# GG-309 · 本地启用画布动态2K预览

- 日期：2026-10-02；用户请求：重启本地版本，手动测试画布放大后的清晰度。
- 基线/所有权：GG-116/5173当前干净检查点c32d13a，含GG-306 f004e5f及并行GG-308 4317bdb；根agent，chore/GG-309-canvas-preview-activation，F:/goodgood-worktrees/GG-309-canvas-preview-activation；仅运行启用记录，无子agent。
- 决策：执行既有ADR0132，不改变预览规格或产品决定，无新ADR。
- 范围：精确集成登记后构建当前源码并只重启32131 Web，启用最高2048的canvas-preview与GG-303项目批量校验。保留5173、唯一32142图片Worker、cloud-development/local-mailpit、用户数据及积分。当前集成版含GG-308文本资产，仅应用该版本必需的本地新增0063（新空表/扩展类型约束，不改历史记录），先核对127.0.0.1:54449/goodgood与待迁移列表；不运行fixtures。
- 验收：32131及5173代理均返回新verified构建；原Vite/Worker保持。必要运行身份与匿名鉴权响应即可，浏览器与真实素材效果由用户手验。
- 验证边界：仅用户请求启用必需的一次checkpoint构建、迁移目标/活动任务确认、Web重启及版本身份，不运行lint、类型检查、测试、全面检查、浏览器或真实provider请求，不部署生产。
- 状态：登记6bf6efe→70a7abc；首次构建发现文本生成节点zoom重复声明，隔离4dec257→287c4ca移除重复行并沿用既有缩放订阅；重新构建成功，已启用本地Web/0063，用户手验，未部署。
- 构建：npm run build:checkpoint成功；revision 287c4ca3bd14ba6bb56f03b6c5f812fc9e0a37da，sourceHash bcdbcdf66a9de4af119eb86cfe741ed994479433a345c652b44a5772bca7bef8，artifactHash 3afb46e5872471217f08ef14c340110825b700090eb579b80cf0dd1d20292270，294产物，builtAt 2026-10-02T13:04:47.388Z。首次失败后仅修复实际阻塞再构建，无额外门禁。
- 迁移：核对127.0.0.1:54449/goodgood，唯一待应用0063_gg308_text_template_assets.sql；活动文本0、图片10成功/1取消。直接applyMigrations只新增0063，无fixtures/历史数据改写；完成后待迁移为空。
- 运行：只替换已核对Web33840→40244；32131/5173均返回上述revision、build.verified=true；cloud-development/local-mailpit保持，Vite27464/5173及唯一图片Worker31280/32142保持。匿名两类canvas-preview均401 SESSION_EXPIRED，无素材读取或provider调用。GG-306高清、GG-303云端批量校验及GG-308文本API随当前集成源码启用。
- 生命周期：创建2/退役2，修复实际构建阻塞时重新创建同一分支工作区，均核对clean/忽略项/解析路径/使用进程后Git remove/prune，保留分支提交，无辅助依赖/缓存。两个既有忽略启动器已原样恢复，临时备份及迁移脚本清理；无凭据输出或复制。
- 下一步：用户刷新5173，手验资产拖入/上传/生成图片默认512、放大按需最高2048及缩回；浏览器/真实图片效果未由agent验收。文档后继不改变运行receipt，下次重启前仍构建当前HEAD，默认继续只开发代码。
