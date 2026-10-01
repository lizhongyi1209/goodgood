# GG-254 — 单一用户名、短数字 ID 与局部确认编辑

- 日期：2026-10-01；状态：子实现完成，待根集成和局部验证；未部署。
- 用户授权子 agent：移除旧 @用户名/handle 功能，昵称更名「用户名」默认 `mimi`；用户 ID 纯数字缩短，支持百万用户；用户名和头像编辑不使用底部按钮或输入框，点击外部取消，点击旁边确认图标保存；编辑下方提供规则；去掉个人主页。
- 最小实现：displayName 作为唯一展示/编辑名称，自定义显示名称保留，未设置默认 mimi；原 handle 作为历史字段兼容保存，不再展示/编辑。短数字 ID 使用后端分配且不可变的六位 000000–999999（容量 100 万），不截断/哈希 UUID，不影响原身份键/外键。
- 交互：文本就地可编辑，不用 input；编辑草稿点击外部即撤销，头像只确认后上传/绑定，取消不能写资料。确认旁边图标、pending/错误/规则/键盘和异步取消完整处理。头像沿用 2 MB JPG/PNG。
- 去主页：撤去账户管理个人主页入口及旧资料/作品页渲染，头像菜单「个人信息」直接打开既有账户管理；旧 `/profile` 退回 `/create` 并打开个人信息，不新增独立账户页/作品/公开路由，不删除用户数据。旧图片详情的 profile 历史来源回资产。
- 子负责人 `account_identity_editor`；独立分支 `feature/GG-254-account-identity-editor` / `F:/goodgood-worktrees/GG-254-account-edit`，基线 `8973e0c` 含 GG-252 `4fd9be3`；根负责审阅、精确整合、必要本地迁移/Web 同步和运行交接。
- 子文件边界：profile/billing/auth DTO（仅必要）、相关账户入口、profile policy、server/profile、前向迁移、相关定向测试、ADR 0075/0112 和本任务卡。app/page.tsx 与 canvas-page.tsx 仅账户入口/旧 profile 接线，不改画布资产/媒体/生成。不得修改共享 BACKLOG/PLAN/CURRENT_STATE/HANDOFF，根收口。
- 并行：GG-253 媒体详情由另一会话负责，保护其所有未提交内容。
- 实现：0058 前向迁移添加不可变数字列与事务计数器，重复 UUID/邮箱及 ON CONFLICT 不占号、回滚不占号；GET /api/profile 返回 `publicUserId`，旧 handle 历史列保留、接口写入不接受。编辑开始保存版本快照；用户名 contenteditable、IME/纯文本粘贴/焦点引导；头像 File/blob 预览、取消回收 URL，确认才上传并 PATCH，AbortSignal 防晚到绑定。确认 pending 阻止二次编辑、关闭/切换。
- 子验证：`node --test tests/gg254-profile-edit-transaction.test.mjs` 6/6；`git diff --check` 通过。辅助目录无依赖或构建缓存；原资料/面板/UI 契约测试已按新需求更新，SQL opt-in 测试保持隔离门控且未运行。根报告单独空临时库 `goodgood_gg254_identity_test` 的迁移/分配/并发/回滚/重复/不可变/满额 10 项通过，测试库已删除，活动库无合成写入。
- 待根验证：实际 GG-116 执行 `node --test tests/gg248-account-personal-information.test.mjs tests/gg072-personal-profile.test.mjs tests/gg254-profile-edit-transaction.test.mjs`，局部 eslint（变更 TSX/mjs/test）及必要 UI 契约测试。无全量 gate/typecheck/build、浏览器或真实头像/生成请求。
- 迁移/恢复：必须先在受准许本地目标应用 0058 再同步 Web 资料 API，迁移会短暂独占锁 users；百万范围不触碰 UUID/外键/原头像、handle、名称。失败整迁移回滚。后端回退可保留新列/计数器，禁止重排/再分配旧 ID；不要用旧脚本重置真实数据。应用恢复应前向修复，生产迁移未授权。
- 生命周期：创建 1，退役 0；子交付 commit 后根集成/检查/退役，未完成不得虚报。
- 下一步：根精确 cherry-pick、定向验证、在正确隔离本地目标应用 0058/同步 Web、退役辅助目录，交用户浏览器验收。
