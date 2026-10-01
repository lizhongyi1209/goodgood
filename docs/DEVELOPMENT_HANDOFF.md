# 当前开发版本与跨窗口交接

- 日期：2026-10-01。
- 当前运行时代码版本：`goodgood-local-2026-09-30-gg239`。
- 当前交接检查点分支：`chore/GG-241-local-startup`（基于 GG-240）。
- 当前 worktree：`F:/goodgood-worktrees/GG-116`。目录名是历史名称，不能再用来判断版本。
- 状态：GG-241 已恢复 5173、Web/Worker 与原依赖。GG-239 累计源码和 GG-240 工作流规范均保留；未部署生产。GG-237 与 GG-238 待用户手验。

## GG-243 大厅并行工作

本会话大厅目录为 `F:/goodgood-worktrees/GG-243-home`，分支 `feature/GG-243-home-project-card`，基于 GG-241 `f1570de`；[任务卡](tasks/GG-243-project-create-card.md) 登记子 agent、文件边界、验证和退役。项目页入口按 [ADR 0119](decisions/0119-project-create-card.md) 改为首位新建卡片，点击现有 `/canvas`。GG-242 画布会话继续拥有下表 5173 目录和运行配置，本会话只在大厅目录实现/验收。独立 UI 验收不更改原数据、Web/Worker 或生产。

## 先确认源码

~~~powershell
Set-Location F:/goodgood-worktrees/GG-116
git status --short --branch
git show goodgood-local-2026-09-30-gg239 --no-patch --oneline
git merge-base --is-ancestor goodgood-local-2026-09-30-gg239 HEAD
git worktree list --porcelain
~~~

新窗口以 IMPLEMENTATION_PLAN 指向的 GG-241 分支 HEAD 为检查点，并确认 GG-239 标签、GG-240 提交是其祖先。`main`、旧 GG-116 分支、其它 GG worktree 和 parked C6 都不是替代来源。新任务从 GG-242 分配；只在并行写任务时建立独立 worktree，不要让两个窗口编辑同一目录。

## 当前本地运行

| 组件 | 入口 | 当前来源/用途 |
| --- | --- | --- |
| Vite 页面 | `http://127.0.0.1:5173` | GG-239 源码目录，热更新 |
| Node Web | `http://127.0.0.1:32131` | verified `70e10c6ae6bd83542ba870f54059b54b999e9fdf`；Vite `/api` 代理目标 |
| Worker | `http://127.0.0.1:32142/health/ready` | 唯一真实开发 Worker；O1Key 请求可能计费 |
| PostgreSQL | `127.0.0.1:54449/goodgood` | 本地隔离数据库，迁移 `0056` |
| Valkey | `127.0.0.1:56549/db0` | 本地队列/缓存 |
| RustFS | `127.0.0.1:58049/58050` | 本地素材对象存储 |
| Mailpit | `127.0.0.1:58045/58046` | 本地邮件开发 |

进程 ID 可能变化，恢复时重新查询端口和健康接口。`32131/api/health/version` 必须返回 `build.verified=true`；Worker readiness 的 runtime/database/objectStorage/provider/queue 必须均为 `ok`。

GG-241 在 2026-10-01 已核对上述健康状态及 5173 首页、`/canvas`、API 代理。启动前活动任务/outbox/冻结/两队列均为 0；迁移仍为 56。Windows 重启后可能把 54449 划入动态保留范围，不能因此重置数据；具体端口恢复证据见 [GG-241](tasks/GG-241-local-startup.md)。

## 当前功能边界

GG-239 包含 5173 中 GG-116—238 的累计本地实现。核心包括统一资产工作区、独立画布、图片/视频/音频节点、参考连接、生成器、批次、模型参数、持久项目与页面、项目管理、导航、积分明细和近期资产/项目视觉调整。每个任务的范围、被取代关系和验证证据都在 [BACKLOG](BACKLOG.md) 链接的任务卡中。

近期状态：

- GG-235：本地 RustFS/Valkey 发布端口已恢复，媒体只读抽查通过；UI 瀑布流与视频首帧待手验。
- GG-236：项目卡片默认浅灰外框已获用户确认。
- GG-237：内容宽度达到 960px 时项目四列、封面 4:3；待手验。
- GG-238：画布资产方形添加卡、图片显式查看器和竖向图片 rail；待手验。
- GG-239：只固化当前代码、清理入口文档和临时浏览器日志，不改变产品决定或生产运行。
- GG-240：只增加子 agent/worktree 生命周期、缓存与退役规范和文档契约测试，不改变产品决定或运行时。
- GG-241：恢复原本地服务和数据卷，复用已验证后端；没有安装依赖、构建、迁移、上传或生成。

## 启动和验证边界

首次设置或切换检查点后使用锁文件安装依赖：

~~~powershell
npm ci
npm run dev:local
~~~

当前依赖已安装时无需为了恢复页面重复安装。代码稳定后只运行一次 `npm run check:local`。真实 provider 请求必须由用户明确授权该次生成；自动测试不得写入真实 Worker 共用数据库或队列。数据库写测试只允许显式命名的空白隔离栈且无真实 Worker。

本机现有 Valkey 端口为 56549，当前运行使用两个忽略的端口适配启动器：GG-226 的 `dist/local-checkpoint-portfix.mjs start workspace/worker`，以及 GG-116 的 `dist/local-live-dev-portfix.mjs --port 5173`。先验证后端构建并检查任务/队列，再启动 Web、单个 Worker、Vite；不要直接用仍断言 56449 的旧启动脚本。日志固定复用 `%TEMP%/goodgood-local-services/current-{web,worker,vite}.{out,err}.log`，不按任务积累副本。

并行任务必须按 [WORKFLOW](WORKFLOW.md) 先登记再创建。子 worktree 默认不重复安装依赖或执行完整构建；根 agent 完成集成验证后，退役所有已整合的干净目录，并逐项记录不能删除的 dirty worktree。禁止以文件系统强删代替 `git worktree remove`。

本地开发凭据只从仓库外文件读取，禁止写入仓库或聊天。生产数据库、R2、队列、密钥和用户数据不得进入本地。不要运行旧转换脚本重置现有数据。

## 生产边界

生产仍是 [CURRENT_STATE](CURRENT_STATE.md) 记录的 GG-098 应用和 GG-100 单槽 `goodgood-production` Compose。GG-239—241 只是本地检查点，没有 CI 不可变镜像、生产预检或部署授权。未来发布只能按 ADR 0091 的单槽策略原地替换，不恢复历史 blue/green、双 Compose 项目或 Nginx upstream 切换。

## 下一步

用户刷新 5173，先验收 GG-237 的 4/3/2/1 列响应布局，再验收 GG-238 的方形添加卡、图片查看器、滚轮/方向键/rail 切换和关闭后焦点返回。新代码任务从 GG-241 检查点新建 GG-242+ 分支；只有并行编辑才新增 worktree，并在完成后退役。
