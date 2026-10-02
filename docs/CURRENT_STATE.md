# GoodGood 当前状态

- 最后核对：2026-10-02（GG-274本地重启；生产身份沿用原发布证据）。
- 产品阶段：公开的 `controlled-alpha-v1`；已有真实用户，尚未达到完整 seed、自动支付或完整运营告警就绪。
- 正式入口：https://goodgood.o1key.com
- 最新文本布局：[GG-275](tasks/GG-275-text-editor-layout.md)外置生成器式小标题、完整圆角书写区及右下双斜线尺寸柄已进入5173；正文固定14px，移除删除线/引用/代码块工具栏入口，旧内容保持；真实调整尺寸保存已修正。读取GG-276手验约定前已执行45/45相关检查/局部lint/实际编译，之后停止自动检查；Web80b8c0f/Worker/0060保持，用户手验，未部署。
- 最新图片展示后继：[GG-276](tasks/GG-276-restore-reference-previews.md) `3920306`已在5173恢复图片生成器原参考图缩略/悬停预览，文本文件卡和唯一混合端口保持；创建1/退役1，Web/Worker/数据库不变，用户手动检查。后续按用户要求仅开发代码，不自动编译/检查。
- 最新纠正：[GG-273](tasks/GG-273-canvas-editor-inputs.md)文档式编辑器/H1-H3/一致输出圆点、生成器唯一图片文本接收端、160×52px统一文件附件卡已进入5173/Web，旧text边兼容，视频继续原流程。相关30项、类型/lint/模块/必要构建通过，创建1/退役1，0060/原Worker/生产保持；用户验收。
- 最新本地画布：[GG-268](tasks/GG-268-markdown-text-node.md)所见即所得Markdown文本节点、选中工具栏/缩放排版及生成器文本预览/前置合并；[GG-270](tasks/GG-270-canvas-asset-context-menu.md)创建编号文件夹和右键重命名/删除已进入5173。本次52/52、类型/局部lint/实际模块和必要构建通过，创建2/退役2；Web同步为`b1b3d1c` verified、0060/Worker保持，用户验收，生产无变更。后继资料/品牌及当前Web身份见GG-272。
- 最新账户/品牌：[GG-272](tasks/GG-272-account-created-and-brand-row.md) `c4b10b8`：个人信息新增真实只读创建时间（北京时间），桌面字标下移与项目标题同水平线、保留GG-271左侧对齐。22/22、局部lint/三个模块编译与必要Web构建通过，创建1/退役1、无子缓存；Web/5173为verified `c4b10b8`，0060/原云配置/唯一Worker保持，用户验收，未部署。
- 最新画布资产修复：[GG-265](tasks/GG-265-canvas-folder-move-membership.md) `b1f364c`已进入5173：确认移入文件夹后从原位置消失，目标显示同一素材；根层仅未归档/失效归属素材，失败和重新读取一致性保持。12/12、相关lint/两模块编译通过，创建1/退役1，未改变大厅全局集合或持久化，用户验收。
- 最新积分交付：[GG-260](tasks/GG-260-credit-details-and-free-quota.md) / [GG-261](tasks/GG-261-daily-free-image-quota.md) 明细余额、类型/项目/模型/任务 ID复制、20条分页、空心图标/普通选中文字已进入5173与Web `9f9d788`；67项相关代码/SQL检查、局部lint/编译完成，本地0060，创建2/退役2。免费图片政策待用户、未实现或启用，用户负责手验。
- 最新账户调整：[GG-262](tasks/GG-262-profile-inline-edit-layout.md) `2f0d8fd` 已进入5173：透明下划线行内编辑、固定文字/动作位置、无可见滚动条及统一14px图标；12/12、局部lint/模块编译通过，创建1/退役1，用户验收。[GG-259](tasks/GG-259-random-user-id-stable-edit.md) `c6f6bb9` 的固定随机六位ID和规则预留空间保持，Web/数据库无变化。
- 当前图片详情后继：[GG-264](tasks/GG-264-image-detail-fill-and-centered-rail.md) 澄清修正`5409cce`已进入5173：初次打开/换图/复位完整等比适配，放大可填满整个中间区域，无计数/缩略图动态居中保持；本轮16/16、相关lint/编译通过，累计创建2/退役2，用户验收。GG-258简洁信息和无缩放覆盖控件保持。
- 本地账户信息：[GG-254](tasks/GG-254-account-identity-editor.md) `422c32f` 已接入实际 5173/Web，仅保留用户名默认 mimi、稳定六位数字 ID；文字/头像旁侧确认保存、编辑区外取消和下方规则，撤去个人主页。20 项相关检查、资料 SQL 1/1、ID SQL 10/10、局部 lint、必要 Web 同步与本地 0058 完成，辅助目录退役。
- 当前本地画布检查点：[GG-253](tasks/GG-253-canvas-media-detail.md) `896bce2`，真实素材信息独立列、图片平移/滚轮缩放、原比例内容缩略列和选中轻微抽出，取代 GG-249/251 的画布滚轮切图及原位放大；25 项定向、lint 和模块编译通过。
- 当前画布子任务：[GG-255](tasks/GG-255-canvas-paste-image.md) `d4ea42c` 原生外部图片粘贴/进入页面直接粘贴，19/19；[GG-256](tasks/GG-256-canvas-folder-drop.md) `5183287` 图片拖入文件夹、状态动效与光标，8/8；[GG-257](tasks/GG-257-canvas-edge-hover-flow.md) `6f63a8f` 默认实线、hover 流动。相关代码/编译检查完成，三个辅助目录已退役，无子缓存；浏览器验收由用户负责。
- 当前本地运行：[GG-274](tasks/GG-274-local-restart-after-reboot.md)恢复后，Vite `127.0.0.1:5173` 从 `F:/goodgood-worktrees/GG-116` 提供前端；API代理verified Web `80b8c0f` / `127.0.0.1:32131`，唯一真实开发Worker `32142`保持原GG-226；两角色readiness正常，原云配置/数据卷/0060保持，生产未变。

## 生产身份

生产事实以 [GG-098 发布记录](releases/2026-09-21-gg098-manual-grant-ceiling.md) 为准。GG-100 后续只把同一应用迁移为单槽 `goodgood-production` Compose 并清理旧 blue/green 残留，没有更换应用镜像。

| 项目 | 当前值 |
| --- | --- |
| 源码 revision | `7888554a4650b1b06dbce4293c52e8c018e5c71b` |
| 镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:7deeab8c0257e9127326eb2fc14b5beecf370f5a22408361f613465a0b432270` |
| 数据库迁移 | `0044_gg098_raise_manual_grant_ceiling.sql` |
| Compose | 唯一 `goodgood-production` 项目；Web/Worker `3100/3101` |
| 注册 | 邮箱注册开放；新账户 `active`，欢迎积分 200 |
| 备份 | PostgreSQL Restic timer `enabled`/`active`，每 30 分钟；2026-09-17 恢复演练通过 |

生产应用支持真实身份、积分、图片生成、私有素材、资产库、项目保存恢复、站长运营能力。视频仍是临时文生视频预览，正式视频任务、积分结算和资产入库未接通。Nano Banana Pro 只展示价格，生成路由关闭。支付仍由人工登记，不是自动支付。

生产已知缺口只有对外告警通道；站长已于 2026-09-15 明确接受该 controlled-alpha 缺口。不得把本地 GG-101—239 的累计代码描述为已部署。

## 本地检查点

GG-239 收口了 5173 中 GG-116—238 的累计实现，包括统一资产工作区、独立画布、持久画布项目与页面、真实画布生成、模型路由与计费、项目管理、资产面板、导航和近期视觉修复。详细范围与各自验证边界保留在 [BACKLOG](BACKLOG.md) 所列任务卡；当前入口文档不再复制历史逐项日志。

当前 Web 来自 GG-116 已验证 revision `80b8c0f0b41aff4371e4673597bc4b483233e405`，Web 和5173代理的 `/api/health/version` 均为 `build.verified=true`；原 GG-226 Worker `70e10c6ae6bd83542ba870f54059b54b999e9fdf` 继续运行。本地 PostgreSQL 使用 `54449/goodgood`，迁移到 `0060`；Valkey为`56549`，RustFS为`58049/58050`，Mailpit为`58045/58046`。均为loopback开发资源，最新构建/恢复证据见GG-274；GG-275仅UI/客户端尺寸修正，未重建后端，免费quota未实现，届时必须升级Worker。

当前本地库包含云端 `local-dev/references/` 素材；Web/Worker 启动必须保留原仓库外云配置。GG-242 的 13 张既有图像只读抽查均预览 200、原图 Range 206；基础 readiness 不能证明云素材预览正常。

本地 Web/Worker 使用仓库外开发凭据调用真实 O1Key，请求可能计费。mock 只允许在显式隔离的 `mock-tests` 栈中运行；fixture 或合成任务不得进入真实 Worker 共用数据库或队列。生产数据库、R2、队列、密钥和真实用户数据不得复制到本地。

## 当前边界

- GG-239 之后的任务是本地代码/流程检查点，不是生产 release、CI 镜像或部署授权。
- 5173 是 Vite 热更新页面；提交后仍应以版本标签和 Git 状态判断源码，不能以端口或旧 PID 判断版本。
- GG-235 已恢复本地对象存储/Valkey 端口并验证只读媒体链路；GG-236 的默认项目外框已获用户确认。GG-237 四列项目布局和 GG-238 图片查看器仍待用户手验。
- C6 删除/内容安全分支继续停放，禁止自动恢复或批量合入。
- 任务编号与当前文档检查点以 IMPLEMENTATION_PLAN 为准；新任务创建隔离分支，只有并行写任务才按 WORKFLOW 创建并退役 worktree。
