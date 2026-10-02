# GG-300 · 本地启用文本生成预设

- 日期：2026-10-02。
- 用户授权：启用预设功能，不增加额外积分消耗；必要的本地构建/迁移及Web重启属于启用范围。浏览器和真实生成由用户手验。
- 基线/所有权：GG-116/5173源码d3a4717，含GG-297预设、GG-298取消、GG-299图片hover；当前Web767e6db/数据库0061。根agent，chore/GG-300-preset-activation，F:/goodgood-worktrees/GG-300-preset-activation；仅启用记录/计费说明，无子agent。
- 决策：预设使用文本生成既有统一接口/20积分结算，无预设附加费；沿ADR0129中断10/失败0。没有新计费策略，不新增ADR。
- 范围：将当前已开发源码构建启用至本地32131 Web，让preset-stream及项目预设保存校验生效；其依赖的GG-296新0062一并应用至已核对的127.0.0.1:54449/goodgood，不运行fixtures或修改历史取消费用。保留5173 Vite、唯一图片Worker、原数据库/资产/积分及cloud-development配置。
- 验收：5173代理Web为新verified构建；匿名preset-stream路由为鉴权拒绝而非404；未发起任何真实provider生成；预设与普通文本生成仅一次20积分预留，取消依原策略。
- 状态：登记a708816精确接入b3844d2；当前源码构建成功，本地0062/新版Web已启用预设与GG-296中断规则，用户手验，未部署。
- 构建：npm run build:checkpoint成功；revision b3844d25a7a4328d71bf79e9196ecdbbc18a504e，sourceHash 99049e1e0c26442750a9acf3e9812ccfd43b29876c2b439a9f33712b7c970c6e，artifactHash b569e8b3edf4ba48e6ffbee230d24af47cf7f83ec9e487c085dec0f91f6d208a，288产物，builtAt 2026-10-02T09:59:57.845Z。
- 迁移：核对127.0.0.1:54449/goodgood，唯一待应用0062_gg296_text_cancellation_half_credit.sql，活动文本任务0，图片任务9成功/1取消；直接applyMigrations只新增0062，不运行fixtures，历史取消不追扣。
- 运行：仅替换已核对的Web33072→33840；32131与5173/api/health/version均为上述revision、build.verified=true。启动保留cloud-development/local-mailpit；Vite27464/5173及唯一Worker31280/32142保持。匿名POST preset-stream带合法Origin返回401 SESSION_EXPIRED，未进入积分预留或provider；缺Origin先被403拒绝。
- 验证边界：仅必要运行身份/本地迁移目标/路由响应，不运行lint、类型检查、测试、全面检查或浏览器验收。
- 生命周期：创建1/退役1，核对指定根内目录/Git及忽略项/使用进程后Git remove/prune退役，保留分支提交，无辅助依赖/缓存。构建前备份既有两个忽略启动器，完成后原样恢复；临时备份/迁移启动脚本已删除，未复制或输出凭据。
- 下一步：用户刷新5173手验结构化反推、可空附加输入、保存恢复及一次20积分计费/中断10；图片hover放大预览和素材取消已在同一构建。真实生成和浏览器效果未验收；文档后继不改变运行构建身份，后续重启仍需按新HEAD构建。
