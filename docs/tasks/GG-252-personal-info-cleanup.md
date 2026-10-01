# GG-252 — 简洁个人信息与默认用户名

- 日期：2026-10-01；状态：开发、实际 5173/Web 同步及定向验证完成，待用户验收，未部署；根 `/root`，无子 agent。
- 用户要求：移除「只读」、复制按钮和无用解释；昵称/用户名不常驻输入框；默认用户名 `goder`；收紧头像限制、整理空隙与布局。
- 范围：文字展示昵称/用户名，点击或键盘激活后就地编辑；仅修改后出现保存/取消；移除说明/复制相关代码；紧凑中性布局。未设置用户名显示 `goder`，已自定义值保留，不自动覆盖真实资料。
- 默认名：现有用户名唯一约束需对 `goder` 例外，否则多人保存默认名会冲突；新增前向迁移，仅共享默认值允许重复，自定义用户名保持唯一，不改历史迁移或用户记录。
- 头像：参考 GitHub 小于 1 MB、X 2 MB，选 2 MB JPG/PNG；前端上传与后端资料绑定均校验。
- 决策：修改 ADR 0112/0075 的已确认入口/用户名规则。
- 分支/目录：`feature/GG-252-personal-info-cleanup` / `F:/goodgood-worktrees/GG-252-personal-info`，基线 `4152490` 含 `99fb14a`；并行 GG-251 由另一会话负责，不修改其媒体文件。
- 验证：信息渲染、默认名/保存/头像边界与原资料接口定向测试、相关 lint、文档/diff；默认名与头像后端变动需完成必要本地 Web 同步，浏览器验收交用户。无真实上传/生成或测试数据写入活动 Worker 数据库。
- 整合：独立源码 `2feef8c` 精确回放为 `4fd9be3`，保留并行 GG-251 `3e2add5`；仅 BACKLOG 的相邻任务新增行冲突，按两项均保留解决，未修改画布源码。
- 验证：信息渲染/输入校验/头像边界 6 项、原资料与默认名接口 7 项、文档 9 项，共 22/22；六份相关源码/测试 lint exit 0。无全量门禁、全项目 typecheck、浏览器验收、真实上传或 provider 请求。
- 本地运行：必要 `build:checkpoint`/verify 通过，Web `32131` 和代理使用 verified `4fd9be3ee6050d14c7e035a17e3a24555b2f1770`，sourceHash `f9c40f728564cc8503e67164af28d062884c4ae34aaaa2bff18382060c3e6708`、artifactHash `bc400f0ee4b932db1e747200c97d43400511bfa8689ac4e3a53c41e831d973cb`，283 产物；原云配置保留，5173 模块 HTTP 200，Worker readiness ready，未重启 Worker。
- 数据：核实目标为 `127.0.0.1:54449/goodgood`、56 个既有迁移，仅追加 0057；实际元数据确认 57、默认名排除于唯一索引，旧全局唯一约束已替换。直接调用 applyMigrations，无 fixture/种子数据或真实资料改写。一次检查误将其返回的全部迁移文件当作新增列表，迁移已成功提交，随后只读确认成功。
- 启动器：构建清理了两份忽略的 portfix 脚本，按现有 56549 端口重建；初次 Web 启动因旧 env 仍指向 56449 失败，补齐解析后端口映射后实际健康身份验证成功。固定 current-web 日志复用，不新增凭据或日志进入 diff。
- 生命周期：辅助目录创建 1、退役 1，零辅助依赖/构建缓存；确认源码等价、干净、路径及无 Node 进程后无 force 退役并 prune，分支保留。无本任务 dirty 保留目录。
- 下一步：用户刷新 5173 验收文字资料、就地编辑、默认 goder 与紧凑布局。文档后继不是新的 Web 构建身份，重启需按 checkpoint 规则核对。
- 调研依据：[GitHub 头像限制](https://docs.github.com/en/account-and-profile/reference/profile-reference)、[X 头像限制](https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo)。
