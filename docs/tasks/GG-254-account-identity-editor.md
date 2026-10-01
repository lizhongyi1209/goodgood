# GG-254 — 单一用户名、短数字 ID 与局部确认编辑

- 日期：2026-10-01；状态：已整合实际 5173/Web，代码验证与本地运行同步完成；浏览器验收交用户，未部署生产。
- 用户授权子 agent：移除旧 @用户名/handle 功能，昵称更名「用户名」默认 `mimi`；用户 ID 纯数字缩短，支持百万用户；用户名和头像编辑不使用底部按钮或输入框，点击外部取消，点击旁边确认图标保存；编辑下方提供规则；去掉个人主页。
- 最小实现：displayName 作为唯一展示/编辑名称，自定义显示名称保留，未设置默认 mimi；原 handle 作为历史字段兼容保存，不再展示/编辑。短数字 ID 使用后端分配且不可变的六位 000000–999999（容量 100 万），不截断/哈希 UUID，不影响原身份键/外键。
- 交互：文本就地可编辑，不用 input；编辑草稿点击外部即撤销，头像只确认后上传/绑定，取消不能写资料。确认旁边图标、pending/错误/规则/键盘和异步取消完整处理。头像沿用 2 MB JPG/PNG。
- 去主页：撤去账户管理个人主页入口及旧资料/作品页渲染，头像菜单「个人信息」直接打开既有账户管理；旧 `/profile` 退回 `/create` 并打开个人信息，不新增独立账户页/作品/公开路由，不删除用户数据。旧图片详情的 profile 历史来源回资产。
- 子负责人 `account_identity_editor`；独立分支 `feature/GG-254-account-identity-editor` / `F:/goodgood-worktrees/GG-254-account-edit`，基线 `8973e0c` 含 GG-252 `4fd9be3`；根负责审阅、精确整合、必要本地迁移/Web 同步和运行交接。
- 子文件边界：profile/billing/auth DTO（仅必要）、相关账户入口、profile policy、server/profile、前向迁移、相关定向测试、ADR 0075/0112 和本任务卡。app/page.tsx 与 canvas-page.tsx 仅账户入口/旧 profile 接线，不改画布资产/媒体/生成。不得修改共享 BACKLOG/PLAN/CURRENT_STATE/HANDOFF，根收口。
- 并行：GG-253 媒体详情由另一会话负责，保护其所有未提交内容。
- 实现：0058 前向迁移添加不可变数字列与事务计数器，重复 UUID/邮箱及 ON CONFLICT 不占号、回滚不占号；GET /api/profile 返回 `publicUserId`，旧 handle 历史列保留、接口写入不接受。编辑开始保存版本快照；用户名 contenteditable、IME/纯文本粘贴/焦点引导；头像 File/blob 预览、取消回收 URL，确认才上传并 PATCH，AbortSignal 防晚到绑定。确认 pending 阻止二次编辑、关闭/切换。
- 子验证：`node --test tests/gg254-profile-edit-transaction.test.mjs` 6/6；`git diff --check` 通过。辅助目录无依赖或构建缓存；原资料/面板/UI 契约测试已按新需求更新，SQL opt-in 测试保持隔离门控且未运行。根报告单独空临时库 `goodgood_gg254_identity_test` 的迁移/分配/并发/回滚/重复/不可变/满额 10 项通过，测试库已删除，活动库无合成写入。
- 根验证：上述三个资料测试文件 19/19，加 UI-components 直接相关 invariant 1/1；局部 eslint 0 错误、18 项原有 app/canvas 警告，diff 检查通过。单独空数据库 `goodgood_gg072_profile_test_gg254` 的资料持久化、版本、头像归属及清理保护 SQL 测试 1/1，随后删除；前述 ID 分配 SQL 10/10 的临时库同样已删除。未运行全量 gate/typecheck、浏览器、真实上传/生成或活动库 fixture。
- 迁移/恢复：必须先在受准许本地目标应用 0058 再同步 Web 资料 API，迁移会短暂独占锁 users；百万范围不触碰 UUID/外键/原头像、handle、名称。失败整迁移回滚。后端回退可保留新列/计数器，禁止重排/再分配旧 ID；不要用旧脚本重置真实数据。应用恢复应前向修复，生产迁移未授权。
- 集成：子 `bbf26d5` 精确回放为实际 `422c32f`，保留并行 GG-253 `896bce2` 与随后 GG-255 `41df2dc`。本地 `127.0.0.1:54449/goodgood` 仅应用新迁移 0058，全部已有用户 ID 唯一且六位，未添加测试账户、未改 UUID/外键。
- 运行：必要 checkpoint 构建通过；初次构建后的并行 GG-255 提交使 receipt 不匹配，保持旧 Web 后按新 HEAD 重建。当前 verified Web `41df2dcad421aa90bfbccf86a6a0a51d30bda4a0`，sourceHash `8f9034811555e0ee82f1cbf8c33774e222966d21a83e828cc22d77508b799255`，artifactHash `bc1c7ecdc4c3d04f36081c9271002806e5641a479ce356a6b8c70ec3b1766795`，283 artifacts。5173 API 代理同版本，三个资料/弹框模块 HTTP 200 含新接线；Web 云参考图配置保留，唯一 Worker readiness ready。
- 生命周期：创建 1，退役 1；辅助目录已核对干净、无 Node 进程、路径在 worktree 根下并用 Git remove/prune 退役，分支/提交保留；零辅助依赖/构建缓存，未删除活动目录或并行目录。
- 文档：共享入口、数据模型、交互和 ADR 索引同步；并行 GG-255 后继 `d4ea42c` 仅前端热更新，现有 Web 构建身份保持。文档契约初次 8/9 因该会话英文任务卡缺少固定「下一步」标记失败，仅补兼容标记后最终 9/9；未改其实现或交接范围。
- 下一步：用户刷新 5173 验收单一用户名、六位 ID、文字/头像局部确认和外部取消；没有本任务待完成开发或运行步骤。生产发布另立授权任务。
