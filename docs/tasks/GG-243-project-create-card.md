# GG-243 — 项目页首位新建画布卡片

- 状态：已整合实际 5173 源码，运行目录定向检查通过，共同完整门禁进行中；待用户验收，未部署
- 用户需求：大厅优化由本会话负责；首项交给子 agent，将项目页新建按钮改为首位卡片，点击直接进入新画布。
- 最后更新：2026-10-01
- 实现分支：`feature/GG-243-home-project-card`；实际运行/整合分支与 worktree：`fix/GG-242-canvas-image-preview` / `F:/goodgood-worktrees/GG-116`
- 基线：GG-241 `f1570de8f96690b72981ae974ed12fc941531429`；GG-239 标签和 GG-240 均已核验为祖先。

## 范围与验收

- 项目网格的第一项固定为「新建项目」卡片；复用当前 4/3/2/1 列、浅灰外框及圆角，原页头新建按钮撤下。
- 点击通过现有 `/canvas` 进入一个新的空白画布，由既有画布初始化分配项目 ID、自动保存；不先打开命名弹框或大厅创作。
- 空列表、读取中、列表读取失败时仍提供首位新建入口；现有重试、项目恢复、重命名与删除保留。
- 键盘可聚焦/激活入口，视觉继续使用无彩色界面；不触发上传、生成或计费。
- 决策影响：[ADR 0119](../decisions/0119-project-create-card.md) 取代项目页页头「新建创作」入口，不改变大厅其它入口。
- 授权边界：本地实现和验证；生产发布独立授权。

## 实现与证据

- 初始源码：`ProjectLibrary` 页头按钮调用大厅 `requestNewCreation`；现有 `/canvas` 可建立新的空白、持久画布。
- 相关文件/专题文档：项目 TSX/CSS、调用方与相关 UI 测试；DESIGN_SYSTEM、UX_FLOWS、ROUTES。
- 已完成：首位卡片、四种列表状态保留入口、撤下页头按钮和旧 onCreate 绑定；现有卡片/管理逻辑沿用。
- 子提交 `0ff9243` 已精确 cherry-pick 为根集成 `bafb988`，只包含登记的四个文件。
- 定向验证：`node --test tests/project-create-card.test.mjs tests/gg226-project-library.test.mjs tests/documentation-continuity.test.mjs` 23/23 通过；新 UI 渲染测试覆盖普通/空/加载/错误。
- 首次完整门禁在 lint 阶段发现新原生链接违反 `@next/next/no-html-link-for-pages`，尚未运行后续阶段；根 agent 改用现有 `next/link`（关闭 prefetch），新 UI 渲染测试再次 4/4 通过。代码修正后重跑完整门禁。
- 最终代码提交：`f647e13`（包含 `bafb988`）；2026-10-01 `npm run check:local` exit 0，lint 0 errors / 129 既有 warnings、TypeScript、完整构建通过，687 项测试：665 通过 / 22 按既有规则隔离跳过 / 0 失败。
- 用户补充：由用户完成浏览器和视觉/预期验收；agent 只负责代码开发与代码层验证。已停止浏览器操作，仅曾查询可用浏览器，未打开应用页面或执行交互。
- 共同运行目录：2026-10-01 代码交付时 GG-242 的 `F:/goodgood-worktrees/GG-116` 正在改动四份入口文档和自身任务卡；本任务不向该目录写入，不抢占分支或运行服务。已验证任务增量待拥有该目录的会话整合。
- 交付修正：用户刷新仍见旧页头按钮，根因是未把独立分支接入真实 5173。确认 GG-242 已提交 `00f7568` 且运行目录干净后，整合大厅分支，按双方实际事实解决入口文档冲突；不改变画布源码、原运行配置或服务进程。
- 实际运行目录定向：`node --test tests/project-create-card.test.mjs tests/gg226-project-library.test.mjs` 14/14 通过；5173 提供的新项目模块 HTTP 200，旧 props.onCreate 绑定已移除，入口链接为 `/canvas`。共同门禁待记录。
- 发布：未发布。

## 并行与 worktree 收口

- 根 agent：大厅隔离实现及代码检查完成后，确认 GG-242 收口且目录干净，负责本次共同运行目录整合及门禁。
- 子 agent/worktree 清单：`project_create_card` / `feature/GG-243-project-card-agent` / `F:/goodgood-worktrees/GG-243-project-card-agent`；从 GG-243 预登记提交创建。
- 子文件边界：`features/projects/project-library.tsx`、`features/projects/project-library.module.css`、`app/page.tsx` 中仅 ProjectLibrary 的 onCreate 绑定、一个项目页入口 UI 回归测试文件。禁止修改 `features/canvas/**`、服务、数据库和入口文档。
- 另一会话：GG-242 画布预览，活动目录 `F:/goodgood-worktrees/GG-116`；本任务不切换该目录分支、不操作其运行服务、不更改画布源码。整合交付以任务增量为边界。
- 依赖/构建缓存：子 worktree 不安装、不构建、不启动服务；根集成目录首次按原 lockfile 执行 `npm ci`，用于独立验收，避免干扰 GG-242 活动目录的缓存。根集成目录是本会话继续大厅工作的活动目录，安装仅此一份。
- 退役条件：子 commit 已审阅/集成，目录干净且无使用进程后 `git worktree remove`，再 prune；根集成目录作为本会话大厅工作目录保留。
- 交付与集成：子 commit 已审阅/集成；子目录无改动、依赖副本或运行进程。
- 收口：创建数 2（根集成目录和已登记子目录）；退役数 1（子目录已用 `git worktree remove` 退役并 prune）；根目录作为本会话活动大厅目录保留，无本任务所属 dirty 子目录和残留子缓存。没有生成第二份子依赖，磁盘前后值不作为验收要求。

## 恢复工作

- 尚未完成：共同完整门禁、辅助目录退役与用户验收；运行页面已接入大厅源码。
- 阻塞/风险：无；本次整合从 GG-242 干净收口提交开始。
- 下一步：完成共同运行目录门禁、记录合并提交并退役已整合大厅辅助目录；用户验收首位新建卡片与新画布。
