# 当前开发版本与跨窗口交接

- 日期：2026-10-01。
- 最新画布交付：GG-253 `896bce2` 图片自由预览与真实信息、GG-255 `d4ea42c` 原生图片粘贴、GG-256 `5183287` 文件夹拖入及动效、GG-257 `6f63a8f` 默认实线/hover 流动均进入 5173；定向 25/25、19/19、8/8 及相关 lint/模块编译完成。三个子 worktree 创建 3/退役 3，无依赖/构建缓存残留，浏览器验收交用户。
- 最新追加：[GG-254](tasks/GG-254-account-identity-editor.md) `422c32f` 单一用户名默认 mimi、六位 ID 和局部确认/外部取消已进入 5173 与 verified Web；20 项相关检查、资料 SQL 1/1、ID SQL 10/10、局部 lint 通过，本地迁移到 0058，辅助目录退役。并行 GG-253 `896bce2` 与 GG-255 `41df2dc` 保留，文档后继不改变实际 Web 构建身份。
- 当前追加：[GG-250](tasks/GG-250-inline-personal-information.md) `99fb14a` 已在个人信息内直接编辑头像、昵称/用户名并保存/取消，13 项功能、局部 lint 和最终文档 9/9；辅助目录退役，GG-249 后继 `8ee22d8` 保留。
- 当前代码：GG-239 累计基线加 GG-242—257；画布详情滚轮现为缩放，缩略图直接展示资产内容，旧 GG-249/251 轮播为历史规则。GG-245 链接读取与 GG-254 后端保留，最新前端以当前 HEAD 为准。
- 当前交接检查点分支：`feat/GG-253-canvas-media-detail`，源码检查点 `6f63a8f`，包含 GG-253—257 与此前功能；后继交接文档提交不改变 verified Web `41df2dc` 身份。
- 当前 worktree：`F:/goodgood-worktrees/GG-116`。目录名是历史名称，不能再用来判断版本。
- 状态：当前画布请求均已开发、精确集成并代码验证；子目录经 clean/缓存/服务核对后以 Git remove/prune 退役。用户负责浏览器视觉、交互及预期验收，未部署生产。

## GG-245 公开图片链接交付

受鉴权同源 `POST /api/references/read-link` 读取公开 JPEG/PNG，保留原 File 上传与归档；公开 DNS 逐跳固定，时间/字节/真实解码及取消边界见 [ADR 0122](decisions/0122-authenticated-public-image-link-read.md)。34/34、定向 lint/typecheck、必要 checkpoint 构建通过；所给 cafe24 图片为 900×1190，已只读解码，未导入真实资产。Web 和代理健康身份/未登录 401、编译组件接线通过。子目录创建 1/退役 1，零子缓存，详见 [任务卡](tasks/GG-245-canvas-image-link-read.md)。

## GG-246 大厅资产视频交付

大厅 `/assets` 视频的独立提交 `ec51488` 已共同整合为 `83a4306`，默认中心播放提示、真实鼠标 hover 才播放，网格与列表共用。定向 31/31、共同完整门禁 685/22/0，编译模块 HTTP 200 确认新接线；辅助目录创建 2/退役 2，无辅助依赖或构建缓存。仅修改大厅资产模块，GG-244 画布文件和 GG-245 后续范围保留。见 [任务卡](tasks/GG-246-asset-video-hover.md)。

## GG-244 当前交付

子 agent 的五文件提交已精确接入当前 5173，24px 查看入口、无视频外置标签、节点式视频卡内 hover/明确预览完成。子与根定向 9/9、完整门禁 674/22/0，子目录创建 1/退役 1、无子依赖或构建缓存。修改规范见 [ADR 0120](decisions/0120-canvas-asset-hover-video-preview.md)，证据见 [任务卡](tasks/GG-244-canvas-asset-hover.md)。不由 agent 进行浏览器验收。

## GG-243 大厅并行工作

独立大厅实现 `f647e13` 已在 GG-242 收口 `00f7568` 后整合为共同提交 `dec0025`，源码进入下表实际 5173 目录。保留双方源码和记录，不切换目录分支、不替换 Vite/Web/Worker。项目入口按 [ADR 0119](decisions/0119-project-create-card.md) 改为首位新建卡片，点击 `/canvas`。共同完整门禁 665/22/0、定向 14/14；编译模块已确认包含新卡片。子目录与独立大厅辅助目录已退役，分支/提交保留。[任务卡](tasks/GG-243-project-create-card.md) 保留完整证据。用户负责浏览器和预期验收。

## 先确认源码

~~~powershell
Set-Location F:/goodgood-worktrees/GG-116
git status --short --branch
git show goodgood-local-2026-09-30-gg239 --no-patch --oneline
git merge-base --is-ancestor goodgood-local-2026-09-30-gg239 HEAD
git worktree list --porcelain
~~~

新窗口以 IMPLEMENTATION_PLAN 指向的共同运行分支 HEAD 为检查点，并确认 GG-242 `00f7568` 与 GG-243 `f647e13` 都是其祖先。`main`、旧 GG-116 分支、其它 GG worktree 和 parked C6 都不是替代来源。新任务先核对未占用编号，只在并行写任务时建立独立 worktree，不要让两个窗口编辑同一目录。

当前分支也须包含 GG-245 `7ddb78d`、GG-248 `520b452` 和 GG-254 `422c32f`。构建 receipt 严格绑定 Git 提交；若当前 HEAD 与 receipt 不同，Web 重启前先按 `npm run build:checkpoint` 构建并核对，不伪造 revision。现有 Web 是已验证 `41df2dc`，指纹见 GG-254；纯前端后继通过 Vite 热更新，文档后继不需要重启服务。

## 当前本地运行

| 组件 | 入口 | 当前来源/用途 |
| --- | --- | --- |
| Vite 页面 | `http://127.0.0.1:5173` | GG-116 当前分支含 GG-242—257，热更新 |
| Node Web | `http://127.0.0.1:32131` | GG-116 verified `41df2dcad421aa90bfbccf86a6a0a51d30bda4a0`；Vite `/api` 代理目标 |
| Worker | `http://127.0.0.1:32142/health/ready` | GG-226 `70e10c6` 的唯一真实开发 Worker；O1Key 请求可能计费 |
| PostgreSQL | `127.0.0.1:54449/goodgood` | 本地隔离数据库，迁移 `0058`；稳定数字 ID，不改 UUID/外键 |
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
- GG-242：补回 Web 云参考图配置；13 张既有图像预览/原图只读抽查通过，子 agent 的单行生成图片恢复修复已整合。

## 启动和验证边界

首次设置或切换检查点后使用锁文件安装依赖：

~~~powershell
npm ci
npm run dev:local
~~~

当前依赖已安装时无需为了恢复页面重复安装。按 GG-247 默认只执行相关定向验证，完整门禁用于批次/发布收口、确需全面回归或用户要求；后端运行改变才进行必要的 checkpoint 构建。agent 负责代码开发、代码验证和集成；浏览器交互、视觉效果及是否符合预期由用户验收，除非用户明确委托。真实 provider 请求必须由用户明确授权该次生成；自动测试不得写入真实 Worker 共用数据库或队列。数据库写测试只允许显式命名的空白隔离栈且无真实 Worker。

本机 Valkey 为 56549。GG-116 的两个忽略启动器用于 Web `dist/local-checkpoint-portfix.mjs start workspace` 和 Vite `dist/local-live-dev-portfix.mjs --port 5173`；GG-226 原 `dist/local-checkpoint-portfix.mjs start worker` 继续服务唯一 Worker。先核对构建和任务/队列，再启动所需角色，不重复启动 Worker，不用仍断言 56449 的旧入口。日志固定复用 `%TEMP%/goodgood-local-services/current-{web,worker,vite}.{out,err}.log`。

checkpoint 构建会清空 dist 中忽略的启动器。构建后从 scripts 对应原脚本仅适配 `./local-*` 导入到 `../scripts/local-*`、将原 Redis 断言替换为现有 `56549/0`，每种入口只保留一个副本；不能把适配器或环境文件纳入提交。

**当前本机有已保存的云参考图，Web 启动不可遗漏云配置。**在 GG-116 目录启动所需 Web；若原 GG-226 Worker 停止，核对其构建/队列后才在该目录启动 Worker，两个角色使用原仓库外配置：

~~~powershell
$taskCloudEnvironment = Join-Path $env:LOCALAPPDATA 'GoodGood/local-cloud-upload/cloud-upload.env'
node dist/local-checkpoint-portfix.mjs start workspace --cloud-env-file "$taskCloudEnvironment"
~~~

核对角色 banner 的 `referenceStorage=cloud-development`；readiness 200 只覆盖基础依赖，仍须只读核对现有云参考图预览。缺少配置时保留数据并恢复原文件，禁止重传、改对象键或回退假图片。

并行任务必须按 [WORKFLOW](WORKFLOW.md) 先登记再创建。子 worktree 默认不重复安装依赖或执行完整构建；根 agent 完成集成验证后，退役所有已整合的干净目录，并逐项记录不能删除的 dirty worktree。禁止以文件系统强删代替 `git worktree remove`。

本地开发凭据只从仓库外文件读取，禁止写入仓库或聊天。生产数据库、R2、队列、密钥和用户数据不得进入本地。不要运行旧转换脚本重置现有数据。

## 生产边界

生产仍是 [CURRENT_STATE](CURRENT_STATE.md) 记录的 GG-098 应用和 GG-100 单槽 `goodgood-production` Compose。GG-239 之后的任务是本地代码/流程检查点，没有 CI 不可变镜像、生产预检或部署授权。未来发布只能按 ADR 0091 的单槽策略原地替换，不恢复历史 blue/green、双 Compose 项目或 Nginx upstream 切换。

## 下一步

用户刷新 5173，验收 GG-253 图片平移/滚轮缩放/素材信息、GG-255 外部复制图片直接粘贴、GG-256 图片拖入文件夹及状态动效、GG-257 连线默认实线/hover 流动；原有未确认功能验收保留。无待完成代码或运行步骤。后续需求从当前 HEAD 核对祖先；只有并行编辑才新增 worktree，并在完成后退役。
