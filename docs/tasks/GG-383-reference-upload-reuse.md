# GG-383 · 参考图上传重试与相同文件复用

- 日期：2026-10-05；用户在GG-381分析后要求优化，授权实现上传重试防重复与相同文件复用。
- 基线：干净1f848b26811621cf9431b1b6322b26e9365797e4，5f5e7fb祖先已核验；保留GG-379空图保护与恢复副本。
- 决策：ADR0142先记录，细化ADR0037/0108；同owner/workspace完整字节SHA-256复用，不限制主动多节点，编辑副本独立。
- 所有权：根agent，codex/GG-383-reference-upload-reuse，C:/Users/Admin/.codex/worktrees/gg-382-reference-upload-reuse/goodgood；创建1/退役1，managed归档已确认，无子agent/依赖缓存。
- 范围：客户端文件指纹/副本标记与本机待上传恢复，后端同操作/同内容创建串行复用、ready响应/完成指纹校验及并发完成恢复；新增0067只写未执行。
- 验收：重复原图返回同素材ID；网络未知结果/并发重试不多份入库；不同字节、身份或工作空间不复用；已删除/失败/过期素材不复活；编辑副本保留且自身重试复用；旧请求/旧后台兼容，原画布节点/连线/冻结任务不被合并。
- 授权：沿GG-276仅开发/精确集成；不自动编译/lint/typecheck/代码或diff检查/测试/浏览器验收，不迁移/重启后台，不HTTP/SQL/Provider/扣费/生产操作。真实旧资产不扫描或删除。
- 状态：源码已完成并接入当前GG-116；未自动验证/未部署/未后台启用。
- 登记调整：集成前发现另一窗口已占用GG-382（视频设计，e17ce66）；本任务改为GG-383，保留原managed辅助路径gg-382-reference-upload-reuse及另一窗口成果。
- 下一步：用户另行委托0067+必要Web更新，再手验重复原图/改名原图、未知上传结果重试、并发、编辑副本及刷新恢复；不扫描合并旧真实资产。

## 源码交接

GG-383参考图上传复用源码已接入a4caee5fd08c5e285044961de3b766cec220e31f（隔离9a0b5eef3533e4eeeec16402ae4284c05d0035c6，基线1f848b2，接入前e17ce66）。同owner/workspace完整字节SHA-256识别原图，同操作重试/同内容并发复用未过期pending或已校验ready记录；完成时核对实际文件哈希，第二次完成按同内容恢复。不同内容/身份/工作空间及显式编辑副本独立，副本自身重试复用，本机待上传副本标记可恢复；直接参考托盘相同ready ID保留首项，主动多画布节点/相册/冻结任务保持。新增0067仅写未应用，旧请求/旧后台上传路径兼容；后台更新前不宣称复用规则已运行。沿GG-276未编译/lint/typecheck/代码或diff检查/测试/浏览器验收，8项纯回归及1项具名隔离SQL回归仅写来源；无HTTP/SQL/Provider/生成/扣费、数据扫描合并/恢复写入、后台/服务或生产操作。GG-379空图保护和恢复画布保持，GG-374原66迁移及运行receipt未重查。编号避让GG-382视频设计，接入时保留其并行文档修正，b993e3c已由另一窗口记录来源。创建1/退役1，managed辅助归档已确认，无子agent/依赖缓存。源码交付、未自动验收/未后台启用/未部署；下一步用户另行委托0067与必要Web更新后手验，保留视频设计待反馈事项。

- 集成边界：应用源码按隔离提交接入。挑选期间另一窗口暂存了GG-382官方对照的任务卡/IMPLEMENTATION_PLAN/DEVELOPMENT_HANDOFF三份文档，因此a4caee5一并保留；BACKLOG任务登记冲突仅合并两条记录。没有回退或重写其历史，后续b993e3c已记录跨窗口来源。
- 回归来源：tests/gg383-reference-file-identity.test.mjs（8项）；tests/gg383-reference-upload-reuse-sql.test.mjs（1项具名隔离库），均未执行。SQL opt-in仅接受goodgood_gg383_reference_upload_reuse_test；必须另行受权并核实无真实Provider Worker。
- 后台待办：migrations/0067_gg383_reference_upload_reuse.sql及新Web代码尚未启用。本轮未运行数据库、构建或启动命令，不改变当前Worker和生产。
