# 当前开发版本与跨窗口交接

GG-423 当前任务：从已推送 5e404e2 新建 feature/GG-423-home-design-system，用户接受 ADR 0144 并确认首页计划；先界面后接现有功能，完整门禁/六截图后开 PR 到 design/GG-422-design-system、不合并。详见 [任务卡](tasks/GG-423-home-design-system.md)。下方为此前交付记录。

## GG-422（2026-10-09 · 设计文档接入）

GG-421 最新源码 547022e 已完整备份 GitHub，远端 HEAD 核对一致。新分支 `design/GG-422-design-system` / `F:/goodgood-worktrees/GG-422-design-system` 从该提交接续，按 cherry-pick 接入来源 336f24a；来源 GG-405 任务编号改为 GG-422，ADR 0144 保持提议中。本轮明确授权文档测试和 build:local，只定义并存 --ds token，不迁移页面或修改业务组件；5173 的 GG-116 源码分支和现有服务/数据保持。验证和推送结果见 [GG-422 任务卡](tasks/GG-422-design-system-docs.md)。下方是各任务当时记录，不以旧 PID 或旧“当前”作为新的启动依据。


> [GG-421](tasks/GG-421-seedance-model-icon.md) 用户指定doubao.svg已加入静态模型图标，Seedance共享图标替换为与Kling一致的16px固定黑色mask，按钮和列表同步，去掉原26px彩色图标。源码完成，分支fix/gg-421-seedance-model-icon，基线干净a00272c祖先核验；仅源码/静态SVG/文档，未构建/检查/测试/浏览器、HTTP/SQL/Provider、生成/扣费、重启或GitHub/生产。原GG-419运行receipt保持且本轮未重新探测，创建0/退役0，无子agent/依赖变动；用户刷新5173手验。

> [GG-420](tasks/GG-420-seedance-line-settings.md) Seedance线路UI源码完成：左侧视频参数新增「线路」Doubao/Dreamina，并在参数摘要及无障碍名称显示当前值；Kling隐藏此参数。模型菜单全部统一图标/型号/选中标记行，去掉HC/MAX标签及内嵌线路切换；同一后台能力禁用规则覆盖各型号，换型号沿现有草稿保留线路。standard/backup、Provider ID、报价/保存/冻结任务和既有素材处理不变。分支feature/gg-420-seedance-line-settings，基线干净2e14ad6含90a46ea祖先，ADR0143已记录该显示决定。仅源码及文档，按用户要求未运行构建/检查/测试/浏览器/HTTP/SQL/Provider或生成/扣费、重启、GitHub/生产；原GG-419构建90e0605和70迁移未更新或重新探测。创建0/退役0、无子agent/依赖变动。用户刷新5173手验，运行验收未声明通过。

> [GG-419](tasks/GG-419-local-seedance-activation.md) Seedance已本地启用、项目启动完成：用户授权0070增量迁移/必要构建及恢复服务，最终verified构建90e0605fb620e2ee0a052efc5a125bcdf4273ac8（含GG-418源码90a46ea及GG-416进度），总70迁移，历史69校验和匹配，原用户/画布/资产/任务/账本计数和余额保持。Web32320/32131、唯一Worker35040/32142（隐藏启动器33768/19948）和Vite30048/5173（入口23488、启动器32000）跨命令在线；Web/Worker readiness五项ok，5173版本代理同revision/verified，原画布HTTP200。初次开发密钥401已在用户明确授权后从剪贴板仅更新外部专用开发文件解决，密钥无输出/入库/入Git；随后无任务readiness认证通过。原容器/卷/云开发上传/Mailpit/Kling价格保持，Seedance沿已接受的临时每秒默认价；启动前活动任务/预留/outbox/两队列均0。只做启动必需构建/迁移/运行核对，未生成/扣费、fixture、lint/typecheck/check:local/测试/浏览器验收、GitHub或生产操作。创建0/退役0，无子agent/新依赖/自启；用户打开5173手验UI及实际生成，后续纯文档提交不改写实际运行revision。

> [GG-418](tasks/GG-418-canvas-seedance.md) 持久画布 Seedance 源码 90a46ea19b31b9b341883616b9f67f5f7c9df5d1 已提交：2.5/2.0/Fast/Mini×Doubao MAX/Dreamina HC，复用三块chat、1/2/4独立插槽、冻结输入/失败重试、实际进度与0估算及手动播放器。型号可自由切换，保留兼容素材/移除超量引用；模式按图/视频/音频点亮，单条合并文本和显式角色，2.5特殊 -1/adaptive 按官方有效约束。音频Handle、WAV和MOV输入/私有原始URL，实际fps/尺寸/时长及合计在POST前检查，不重复O1Key素材预上传。临时每秒价格经用户确认，支持线路/规格覆盖，自动时长预留上限、实际秒数向上取整在原结算事务退差，个人/企业及付费来源保持；0070和Drizzle声明同步。旧后台未报告的新型号禁用，防止旧保存接口拒绝新草稿。分支feature/gg-418-canvas-seedance，基线d4d1b3e，原F:/goodgood-worktrees/GG-116；十三项新回归来源和GG-035预期仅写未运行，未构建/检查/测试/浏览器/HTTP/SQL/Provider/生成/扣费或迁移/服务/GitHub/生产操作。未确认当下进程健康；上次已确认运行仍GG-414/1dc37ee及69迁移，本轮未改变。创建0/退役0、无子agent/缓存副本。下一步用户另行委托仅本地0070及必要Web/唯一Worker更新后手验；不宣称功能已运行验收。


> [GG-417](tasks/GG-417-seedance-api-research.md) 最新O1Key Seedance文档复核完成，8模型分辨率/-1/2.5的30/10/10与纯音频已补齐。2.5编辑示例duration8/ratio16:9、延长ratio16:9仍与官方约束冲突；请求应edit:-1+adaptive、extend:adaptive，输入片段下限按官方。封装文本必填且只取首条、省略图role为参考、preparing/error/回调ID及结果TTL已明示；合并文本、显式角色、真实状态优先。预上传model只接受Doubao2.0，旧adapter传所选model需改，优先URL避免无谓预上传。仅公开文档GET/官方检索与定向源码阅读，未改应用/运行或生成、未构建/检查/测试/浏览器/数据/服务/GitHub/生产操作；应用仍GG-416 d7d31fb，后台GG-414/1dc37ee及69迁移。创建0/退役0、无子agent/缓存；下一步交付差异并继续按明确范围接入。

> [GG-416](tasks/GG-416-video-progress-zero.md) 视频进度源码 d7d31fb0890d924194588f00bede608b7b374b32 已提交：最近有效0/未知继续有界预计条，不展示估算百分比；每次最新有效正数即采用，允许低于旧值，新的0恢复估算、缺值保持最近有效报告。frame estimated只在前端，成功才100%；请求隔离、隐藏页/减少动态/卸载清理保持。分支fix/gg-416-video-progress-zero，基线1b325e9；ADR0143覆盖GG-409零值/最大值规则，七项纯回归来源更新但未运行。未构建/检查/测试/浏览器/HTTP/SQL/Provider/生成/扣费或服务操作，后台仍GG-414/1dc37ee及69迁移；不改Provider/API/计费/轮询/图片链路。创建0/退役0，无子agent/依赖副本；用户刷新5173手验。

> [GG-415](tasks/GG-415-generation-progress-audit.md) 进度源码检查完成，未改应用：图片adapter解析顶层progress，但router只通知refining，Worker/API/GenerationJob未向前端转交真实进度；视频只识别顶层number，字符串/嵌套不识别，0被记为真实值后关闭估算且后续缺值保留旧0。最近O3任务成功而最终progress为null，仅归一化结果，不能断言上游是否给进度/字段格式或还原中间回包。已询问节点范围；仅源码及具名本地READ ONLY近期任务元信息，无HTTP/Provider/新生成、构建/检查/测试/浏览器、写数据/迁移/服务/生产操作。应用源码仍556ec9e、运行仍GG-414/1dc37ee，创建0/退役0、无子agent。下一步按用户确认的节点范围修复，先核对实际字段，保留真实0/未知/估算区别。

> [GG-414](tasks/GG-414-nano-banana-21-activation.md) Nano Banana 2.1 已本地启用：用户明确授权更新，GG-413 源码556ec9e随必要checkpoint构建1dc37ee3a7a9d0ee839bf9ca78e004409d96f500启用；Web38980/32131、唯一Worker37240/32142（隐藏启动器34140/37308）替换，Vite14404/5173保持。仅0069应用到127.0.0.1:54449/goodgood，历史68迁移匹配，总69；新目录enabled、仅special线路，1K/2K/4K均20积分每张，1–12数量36条报价及6处约束validated。原用户/画布/资产/任务/流水计数、余额聚合、旧目录及旧报价指纹保持。两角色readiness五项ok，前端代理同verified新revision、原画布HTTP200；运行事件确认两角色一致。启动前活动生成/预留/outbox/两队列均0；原云开发/Mailpit/视频价格配置保持。未发生成/扣费、fixture、lint/typecheck/测试/浏览器验收、GitHub/生产操作。创建0/退役0，无子agent/新依赖副本；用户刷新5173手验新默认及本人实际生成。

> [GG-413](tasks/GG-413-nano-banana-21.md) Nano Banana 2.1 默认图片模型源码 556ec9e89385f007fe3dd1d037774cc4100f0ed6 已提交：产品 nano-banana-2.1/唯一 special 调用 gemini-nano-banana-2.1-sp，复用 Nano 图标，画布/批量及空创作默认同步，显式旧选择与冻结任务保持。补齐能力/选项/目录/报价模板、项目/草稿/生成持久化；新增 0069 从原 2 当前 special cent 单图价初始化独立目录及 1–12 数量报价，完整三档才启用，原配置/价格/用户记录不变，schema 约束同步。分支 feature/gg-413-nano-banana-21，基线 af1f755；四项合成回归仅写未运行。未构建/检查/测试/浏览器或 HTTP/SQL/Provider/生成/扣费、迁移应用/服务/发布操作。源码完成、未运行启用，GG-412 e6fa39f 及已应用 68 迁移保持；下一步用户另行委托 0069 和必要 Web/Worker 更新后手验。创建 0/退役 0，无子 agent 或缓存副本，不更新 GitHub 设计快照。

> [GG-412](tasks/GG-412-local-restart-after-reboot.md) 2026-10-07电脑重启恢复完成：原PG54449被Windows54358–54457保留范围覆盖，经管理员执行原方法重连同一容器网络，原卷/54449映射恢复、WinNAT Running。必要当前checkpoint构建verified e6fa39fa648c3991edb71a845b8b2f5e0a50cf63；Web33512/32131、唯一Worker37036/32142、Vite14404/5173（入口35068；隐藏启动器40168/40720/14832）恢复并跨命令保持。Web与Worker readiness五项ok，5173版本代理同revision/verified，首页及原画布HTTP200。最新GG-411及既有源码启用，原68迁移、云开发/Mailpit与外部视频临时价格保持；启动前图片/文本活动、未派发outbox、两队列均0，原视频1成功/0活动。无迁移/重置/fixture、主动生成/扣费或生产操作，仅必要启动构建/运行核对，无lint/typecheck/测试/浏览器验收。创建0/退役0，无子agent/依赖副本或自启；用户打开5173手验。

> [GG-411](tasks/GG-411-video-player-controls.md) 视频画面拖动及唯一操作入口源码f4ebfc71f1efbcfab0f59ba275cab0cc4bdbc94a已提交：画布/详情共用轻量手动播放器，画面不再nodrag或拦Pointer，只有底部播放/暂停/进度/时间/静音控制条及原操作按钮隔离拖拽。关闭原生controls和画中画/远程播放，节点保留唯一查看/下载，详情没有嵌套查看或额外下载。复用播放器manualOnly模式，hover无影响、暂停后可拖时间轴、隐藏页/大图/换源和卸载停止，参考hover默认保持。分支codex/gg-411-video-player-controls，基线d4e2c64；三项生命周期回归来源仅写未运行，未自动构建/检查/测试/浏览器或HTTP、SQL/Provider/生成/服务操作。原私有源刷新/尺寸/下载/生成进度/计费保持，GG-391运行receipt及GG-404设计快照保持；创建0/退役0，无子agent/缓存。用户刷新5173手验画面拖节点、控制条拖进度、单一入口及生命周期。

> [GG-410](tasks/GG-410-video-result-playback.md) 生成视频手动播放源码276a5cc194a7a8fe29736b2e791c4fd660eb792f已提交：结果默认暂停，鼠标移入/移出不再播放或暂停，开放原生播放/暂停/进度拖动/音量控制，不再循环或叠加中央播放按钮。播放器隔离画布拖拽与按键，标题仍可拖动节点；隐藏页/大图打开/换源或scope及卸载暂停，不自动恢复。参考素材hover预览及资产页保持。分支codex/gg-410-video-result-playback，基线f3cbb29；低影响展示未新增测试，未自动构建/检查/测试/浏览器或HTTP、Provider/数据/服务操作。GG-409生成进度、后台及计费保持；设计快照仍GG-404，创建0/退役0，无子agent/缓存。用户刷新5173手验播放/暂停/拖动进度、离开保持播放和标题拖动。

> [GG-409](tasks/GG-409-video-generation-progress.md) 视频生成进度源码06d2f2250bff38ab463e359e96c74faa966e332a已提交：待处理/提交/生成/保存均显示生成中，优先既有API真实进度并显示百分比；缺失时仅缓慢推进估算条，阶段上限14/22/90/99%，不伪造百分比、未成功不100%。后续缺值保持最新真实数值、低回包不回退；请求/身份/页面隔离，失败/未知受理保留原入口，隐藏页及减少动态暂停估算时钟，卸载清理。分支codex/gg-409-video-generation-progress，基线781d10c；五项纯回归只写未运行，未构建/检查/测试/浏览器或HTTP/生成，未修改后台/费用/轮询/数据/服务。GG-391运行receipt及GG-404设计快照保持；创建0/退役0，无子agent/缓存。用户刷新5173手验真实生成与状态反馈。

> [GG-408](tasks/GG-408-video-dimension-visibility.md) 视频尺寸展示源码de79e960dcd508c77976512e13c827357edc0510已提交：去掉视频未知尺寸的「—」，生成节点仅有视频预览且实际宽高已知时显示尺寸；名称/图片元信息/生成逻辑保持。分支codex/gg-408-video-dimension-visibility，基线25af663；未自动构建/检查/测试/浏览器或HTTP验收，无服务/Provider/数据操作。GG-391本地运行与临时定价沿既有receipt，用户刷新手验空节点/生成中/结果尺寸及实际视频生成；设计快照仍GG-404。创建0/退役0，无子agent/缓存。

> [GG-407](tasks/GG-407-free-video-model-selection.md) 视频模型自由切换源码e381dd6ad8dc73b0a7433c1fef303008d18d60ff已提交，分支codex/gg-407-free-video-model-selection：模型项不按素材禁用，后续素材适配只在所选模型内进行，缺料保留Kling3.0而非跳回O3。显式换模型按托盘顺序保留文字/兼容媒体：3.0首图+首视频，O3首视频+最多4图或无视频7图；只删除超量直接引用/连接，不删源节点或资产。模式/角色/清晰度/音频/分镜随模型适配，O3返回智能，报价清除后重读；批量边移除一次进入原历史/保存流程。冻结任务/数量/提示词和生成中锁定保持。五项纯回归来源和一处旧预期只写未运行，未构建/检查/测试/浏览器/HTTP/Provider/数据/迁移/服务或生产操作。功能仅本地分支，GitHub设计快照保持GG-404；创建0/退役0，无子agent/缓存。

> [GG-406](tasks/GG-406-remove-unspecified-camera.md) 源码a5a48b785e6f7afbf19192dc58ec3584cadcce53已提交，分支codex/gg-406-remove-unspecified-camera；已移除单镜头子菜单「不指定运镜」及其无入口处理分支，仅保留7项运镜参考。无匹配参考的历史单镜头不显示虚假选项，仍可选参考或切智能；智能默认/自定义/旧保存与冻结输入保持。仅本地源码，未构建/检查/测试/浏览器或HTTP/服务/数据操作，不更新其他AI设计快照。

> [GG-405](tasks/GG-405-storyboard-menu-options.md) 分镜菜单源码已提交f00738bc518da4c8fc35542917e802b05f0afd78，功能分支codex/gg-405-storyboard-menu-options：新增可选且新节点默认的「智能分镜」，触发按钮直接显示当前方式；将运镜列表并入「单镜头」子菜单，移除独立运镜参考入口及添加到提示词标题，子菜单保留不指定运镜及7个参考。模式/参考有选中标记；回智能或不指定运镜只清理完整匹配的插入参考行，保留其他文字，自定义确认/取消与素材/锁定限制保持。ADR0143替代GG-401隐藏自动展示的决定，无新API字段或后台变化。按用户要求未构建/检查/测试/浏览器/HTTP/生成/服务操作；新UI仅本地功能分支，已交付GitHub设计快照保持GG-404修复基线供其他AI。创建0/退役0，无子agent/缓存。

> [GG-404](tasks/GG-404-storyboard-menu-state.md) 修复源码b3233fec00a94075e3f405a92ca45ed59035ca77已提交并同步GitHub设计快照，修复视频节点storyboardMenuOpen未定义：GG-401将菜单引用改名但useState声明仍保留旧storyboardOpen/session，统一为storyboardMenuOpen/setStoryboardMenuOpen并移除已迁入独立控件的旧session。仅声明修正，菜单打开/互斥关闭/取消选中及任务锁定沿既有引用；后台/价格/保存/数据不变。按用户要求仅修改源码，无构建/代码或diff检查/测试/浏览器验收及服务/数据/生成操作。修复同步授权GitHub设计快照，正常fast-forward不覆盖其他AI。创建0/退役0，无子agent/缓存。

> [GG-403](tasks/GG-403-canvas-load-recovery.md) 画布加载已恢复，修复源码5156fb7b03390a79d32af285485e882880a92378已提交并推送GitHub设计快照：GG-401分镜摘要join字符串被写入实际换行导致Vite解析失败，修正为显式\n分隔。原画布GET500恢复200，视频节点模块GET200；Vite26448/5173、Web30256/32131及唯一Worker24668/32142均原进程健康，不需重启/构建。Web/Worker readiness五项ok，backend仍GG-391 verified4ecd1db，数据/价格/原卷保持。修复同时同步已授权GitHub设计快照，仅fast-forward、main不变。仅必要只读HTTP运行核对，无自动编译命令/检查/测试/浏览器验收或SQL/生成/迁移/生产操作。创建0/退役0，无子agent/依赖缓存。

> [GG-402](tasks/GG-402-frontend-github-snapshot.md) 当前前端已按用户授权推送GitHub独立设计分支[design/gg-402-frontend-snapshot](https://github.com/lizhongyi1209/goodgood/tree/design/gg-402-frontend-snapshot)，首次上传提交41584264baaf7da5cebbbfddf11a3fb73db4486e经ls-remote确认；包含最新应用源码GG-401 e401e86及[重构交接说明](FRONTEND_DESIGN_HANDOFF.md)。其他AI从该快照创建设计分支，原会话从本地codex/gg-402-frontend-handoff继续功能需求。源码保持，未运行构建/检查/测试/浏览器或main CI/部署；无数据/Provider/迁移/服务操作，GG-391运行receipt保持。创建0/退役0，无子agent/缓存。

> [GG-401](tasks/GG-401-storyboard-scene-editor.md) 默认自动分镜与场景编辑源码已提交e401e8658bb899a13418899f891973ec136ad5c8，分支codex/gg-401-storyboard-scene-editor，基线0c9d936（GG-399源码1b4b98f祖先已核验）。新节点默认自动且无重复选择项，单镜头可取消；官方六类运镜词汇（变焦分拉近/拉远）作为可见可编辑提示词参考，未添加camera_control参数。自定义按截图采用开关/场景卡/卡内秒数/底部总长滑块/取消确定，3–15秒、1–6场景，整数分配始终合计一致；关闭丢弃本轮编辑，主chat展示已应用摘要，手动时隐藏外部时长避免冲突。无新持久字段，旧显式选项及缺省旧字段/冻结请求保持兼容；计价和生成仍沿原接口。纯回归来源仅写，未自动编译/代码或diff检查/测试/浏览器验收；仅官方公开GET，无应用HTTP/SQL/Provider生成/扣费/迁移/服务/生产操作，GG-391运行receipt保持。创建0/退役0，无子agent/依赖缓存；用户刷新5173手验。

> [GG-400](tasks/GG-400-storyboard-simplification.md) 智能分镜简化方案已记录，待用户反馈，尚未实施/改变accepted决定。建议轻量模式选择＋按需编辑、紧凑镜头卡、合计驱动手动时长/报价、主chat镜头摘要及切换保留草稿。现自动分镜只是任务multi_shot，无预先AI脚本调用。核对官方与O1Key契约；仅公开GET，无自动构建/检查/测试/浏览器或应用/数据/服务/生产操作。应用源码GG-399 1b4b98f和GG-391运行receipt保持；创建0/退役0，无子agent/缓存。

> [GG-399](tasks/GG-399-video-remove-add.md) 视频chat加号移除源码已提交1b4b98f6002094e2fc2982f1aa4b2772614780cc，基线496591b，GG-116分支codex/gg-399-video-remove-add。删除加号/专属菜单及无入口控件，参数摘要置首、不留空槽；已有素材恢复/预览/删除和生成保持。纯UI，无自动构建/检查/测试/浏览器或HTTP/SQL/Provider/服务/生产操作，GG-391运行receipt保持。创建0/退役0，无子agent/依赖缓存，用户刷新5173手验。

> [GG-398](tasks/GG-398-video-parameter-preview.md) 完整参数摘要源码已提交9687ffe085228f68cc16b502465249e47554eada，基线c02eba7，GG-116分支codex/gg-398-video-parameter-preview。补时长/数量/音频图标与hover说明，固定静音和动作随视频准确展示；已有比例隐藏/设置/计价/提交保持。纯UI，无自动构建/检查/测试/浏览器或HTTP/SQL/Provider/服务/生产操作；GG-391运行receipt保持。创建0/退役0，无子agent/依赖缓存，用户刷新5173手验。

> [GG-397](tasks/GG-397-video-mode-parameters.md) 全能参考/参数简化源码已提交c232385a4916652574cedb7f22cba3b7c75e5ca6，基线f9e512d，GG-116分支codex/gg-397-video-mode-parameters。更名排序/短规则/10px标记；隐藏继承宽高比和参考视频固定音频/分镜，保留独立清晰度和既有自动模式偏好。按官方及O1Key附件纠正宽高比与分辨率区分；仅公开文档GET。三项纯回归来源及旧预期仅写未执行，无自动构建/检查/测试/浏览器或应用HTTP/SQL/Provider/服务/生产操作，GG-391运行receipt保持。创建0/退役0，无子agent/依赖缓存，用户刷新5173手验。

> [GG-396](tasks/GG-396-video-frame-overlay.md) 首尾帧标签源码已提交dc71b6584a413275c3c1aa09fc09e103f97f145d，基线4d96581，GG-116分支codex/gg-396-video-frame-overlay。标签移至缩略图内左下角，近黑底白字/半粗体、不占外部高度、不拦截预览。纯样式调整，无自动构建/检查/测试/浏览器或数据/Provider/服务/生产操作；GG-391运行receipt保持。创建0/退役0，无子agent/依赖缓存，用户刷新5173手验。

> [GG-395](tasks/GG-395-video-material-labels.md) 素材用途简化源码已提交d4a8a72a0fe32bc7f1bbdb5b4d84faee1ecbf653，基线02429cb，GG-116分支codex/gg-395-video-material-labels。移除所有用途菜单，仅首尾帧展示纯文字；可编辑草稿按托盘图片顺序自动分配，额外参考及冻结任务/重试保持。简洁交互原则已写入AGENTS/ADR/产品及设计。三项纯回归来源与旧预期只写未执行；未自动构建/检查/测试/浏览器或HTTP/SQL/Provider/服务/生产操作，GG-391运行receipt保持。创建0/退役0，无子agent/依赖或缓存副本；用户刷新5173手验。

> [GG-394](tasks/GG-394-video-type-rule-hints.md) 视频类型规则Tooltip及单图首帧入口源码已提交d0b05ea5dc4d1bf78e5e4b54f4eb4972c548b659，基线c11cb8d，GG-116分支codex/gg-394-video-type-rule-hints。菜单图标/名称、150ms右侧灰阶Tooltip，可选/禁用均可hover，保留ARIA规则与选择保护。图生仅1图/无视频/首帧用途，多图转兼容类型不丢素材；首尾/参考/编辑/动作既有规则保持。核对官方Omni实际组合能力，不将当前UI入口限制伪称为上游唯一能力；已将资料依据规则写入AGENTS/PRODUCT/ADR。四项纯回归来源仅写未执行，无自动构建/检查/测试/浏览器或应用HTTP/SQL/Provider/生成/扣费/迁移/服务/生产操作，GG-391运行receipt保持。创建0/退役0，无子agent或缓存副本，用户刷新5173手验。

> [GG-393](tasks/GG-393-video-first-frame-options.md) 视频类型列表/单首帧源码已提交41c6fe88fcab8a7fc5c92e248162c79df65b0bf8，基线d2b8eb0，GG-116分支codex/gg-393-video-first-frame-options。菜单只保留名称；一图启用首尾帧，移除尾帧保留类型；首帧必需、尾帧可选。2026-10-06已只读获取Kling官方Omni.md，明确支持first-only/first+last，不支持last-only；不实测付费接口。只有首帧的冻结新请求沿image_to_video兼容现有Web/Worker，实际同Omni first_frame内容、路由与价格。三项纯回归来源及GG-392预期更新只写未执行，无自动构建/检查/测试/浏览器或数据/生成/扣费/服务/生产操作。GG-391运行receipt保持，用户刷新5173手验，创建0/退役0，无子agent/缓存副本。

> [GG-392](tasks/GG-392-video-material-modes.md) 源码已精确接入31a666c69587700707681b3964fe3ce1d23588d0（隔离717d17c，基线4bb862c），GG-116分支codex/gg-392-video-material-modes。Kling O3 / Kling 3.0与用户黑色可灵SVG；类型/模型按连接或直接素材启用，空媒体仅文生，有图图生/参考、两图首尾、有视频参考/编辑、一图一视频动作模仿。当前选择失效时自动适配类型/用途，保留有效选择；未就绪和超量禁止生成，任务/冻结重试保持。沿impeccable及图片chat样式，只写五项纯回归来源，未自动构建/代码检查/测试/浏览器验收或HTTP/SQL/Provider/生成/扣费/迁移/服务/生产操作。GG-391运行receipt保持，用户刷新5173手验。创建1/退役1，辅助已干净归档，无子agent/新依赖缓存。

> [GG-391](tasks/GG-391-local-restart-after-reboot.md) 电脑重启恢复完成：原PG54449被Windows54411–54510保留范围覆盖；系统管理员授权后沿GG-366短停WinNAT并重连原网络，原容器/卷/54449映射恢复、WinNAT Running。必要当前checkpoint构建4ecd1db987725dda0ad238648453a776e8f73ae6；Web30256/32131、唯一Worker24668/32142、Vite26448/5173（入口31156；隐藏启动器29680/32256/31188）恢复。Web/Worker readiness五项ok，5173 API代理同revision/verified，首页及原画布HTTP200。最新GG-389数量与GG-390智能分镜源码已随本次重启启用；原68迁移、数据、cloud-development/local-mailpit和外部临时视频价格保持。启动前图片/文本任务仅终态，视频任务0、未派发outbox/预留/两队列均0。未迁移/重置/写fixture/发真实生成或生产操作，未代码检查/测试/浏览器交互验收。创建0/退役0，无子agent/新依赖副本；用户刷新5173手验。

> [GG-390](tasks/GG-390-video-storyboard-dialog.md) GG-390智能分镜弹框源码已提交a61c381360501f1a38f1ac5627a2005aaef8d5ad，分支codex/gg-390-video-storyboard-dialog，基线da34445/GG-389。生成类型右侧同款入口，参数内旧镜头/编辑移到独立Dialog；单镜头/自动/手动、镜头增删排序/秒数/描述/合计与字符引导，确认应用、取消/外部点击/Escape丢弃本轮草稿。参考视频固定自动，Motion/视频编辑隐藏，任务中禁用。手动生成将连接文本合入首镜头、主描述保留用于切回；子结果冻结有效分镜，沿旧API/费用/保存字段。三项纯合成来源仅写，未自动构建、检查、测试、浏览器/接口/数据库/Provider/生成/扣费/服务或生产操作，GG-385运行保持。GG-389数量Web授权继续待答复，本次不重复请求；用户刷新5173手验分镜。创建0/退役0，无子agent/新缓存。

> [GG-389](tasks/GG-389-video-generation-count.md) GG-389视频生成数量1/2/4源码已提交4e3f6d60ff77a4ea1bf34f6c28619e659f03fb35，默认1，分支codex/gg-389-video-generation-count，基线3b7460e/GG-388。复用数量胶囊，按钮显示单价×数量；预建相邻独立视频卡片/冻结ID，再并发调用旧单视频API。失败位置保留并单项重试；确定未受理与网络不明分离，后者只查原ID。数量/有界拒绝说明随草稿保存，复制清理提交状态；新Web能力声明后才允许选择数量，旧后台继续单条兼容。四项纯合成来源仅写未执行，无自动构建、检查、测试、浏览器/HTTP/SQL/Provider/生成/扣费/服务或生产操作。GG-385运行保持，新字段尚未启用，需要用户单独授权Web构建更新；Worker/DB不变。创建0/退役0，无子agent或新缓存。

> [GG-388](tasks/GG-388-video-settings-resize.md) GG-388视频参数尺寸循环修复与时长简化源码已提交66c204c99ec52a2abae1109f1f96f2d5ebae01bc，分支codex/gg-388-video-settings-resize，基线edb031b/GG-387。弹层高度从按钮位置/可视窗口独立计算、动画帧按变化写入并卸载取消，解除Radix观察结果反向控制被观察元素高度的反馈；保留定位翻转和内部滚动。秒数只在时长行显示，去掉端点和摘要中的重复值，3–15秒/报价/保存/锁定/Motion保持。只源码开发，未自动构建、检查、测试或浏览器验收，未调用HTTP/SQL/Provider或操作服务/生产。GG-385运行身份保持，用户刷新5173手验。创建0/退役0，无子agent或新增缓存。

> [GG-387](tasks/GG-387-video-duration-slider.md) GG-387视频时长滑块源码已提交7bd8698596cff3e8f7179cecf0f84b9436a4f5c9，GG-116当前分支codex/gg-387-video-duration-slider，基线9da08ad/GG-386。复用Shadcn Slider，3–15秒/1秒步长/当前秒数及端点提示，原duration/摘要/报价联动、锁定与Motion来源时长保持。未自动编译/lint/typecheck/检查/测试/浏览器/HTTP/SQL/Provider/生成/扣费/服务或生产操作，GG-385后台运行5fd584d保持。用户刷新5173手验；复用小改集成目录，创建0/退役0，无子agent或额外依赖缓存。

> [GG-386](tasks/GG-386-video-chat-consistency.md) GG-386视频chat源码已精确接入a63f5dabd5213c24a9756fb30b123f4dea7445f9（隔离c09431148406ee19033fd0c88c3a4e820300c91e，基线298d8ec/9a34a1a）。以图片chat实际实现为准：660px视口受限宽度/12px节点间距，空托盘隐藏、工具行添加素材，54px Attachment/编号/移除/180ms预览；左侧参数与类型、右侧同款模型Select和CreditIcon积分生成按钮。参数采用同款Portal/胶囊/比例卡，保留紧凑时长及手动分镜滚动；长输入八行滚动/展开收起、菜单互斥/输入关闭，空描述不显示冗余校验，真实错误保留。图片chat及视频六类型/素材用途/计价/持久任务与后台保持。用户刷新5173手验；未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider/生成/扣费/迁移/重启或生产操作，运行仍GG-385/5fd584d。创建1/退役1，辅助已提交并归档；无子agent/依赖或构建缓存。

> [GG-385](tasks/GG-385-local-kling-video-activation.md) GG-385已本地启用：用户授权临时定价及更新；Omni720p/1080p/4k每秒10/20/40积分，动作模仿720p/1080p每秒10/20积分，默认Omni720p五秒50积分。配置在仓库外LOCALAPPDATA/GoodGood/local-video-generation/video-pricing.env，以Node --env-file传给Web/唯一Worker。0067/0068已顺序应用到127.0.0.1:54449/goodgood，历史校验和匹配、总68迁移、原用户/画布/资产/任务/流水及余额聚合保持，视频任务0。必要checkpoint构建5fd584da7c1dad3ed5154fad05bdd94cf32c10a1；Web20564/32131、唯一Worker16116/32142，隐藏启动器35248/26392，Vite17388/5173保持。两角色readiness五项ok、API代理同构建身份、画布HTTP200；未登录探测新视频能力接口401符合保护规则，不创建登录或任务。默认报价读取50积分，真实生成、扣费、代码检查/测试及浏览器交互验收未执行，生产未操作；UI由用户刷新手验。创建0/退役0，无子agent/新依赖缓存。

> [GG-384](tasks/GG-384-canvas-kling-video-generation.md) 最新源码checkpoint为6181bdf306cc85a2c59313e41b34d4d760fbf941（GG-116/fix/GG-275-text-editor-layout），从b993e3c隔离a401316、保留并行1bb3b1e GG-383文档。按用户O1Key附件完成视频节点/一致三块chat/六类型/私有素材与结果/持久队列、预留结算释放/刷新恢复/原输入单卡重试、保存失败不再生成，ADR0143/0068。用户选择模型+分辨率+时长，五档每秒整数积分尚未提供；GOODGOOD_VIDEO_CREDIT_RATES_JSON未配置会闭锁。不读取或改变现有外部凭据/价格文件；需后续明确委托确认0067/0068与Web/唯一Worker更新，旧后台能力探测会阻止创建不支持的视频节点。十四项合成来源仅写，未自动构建/检查/测试/浏览器、SQL/应用请求/Provider/扣费/迁移/重启/生产操作；本轮不要自动执行验证。GG-374实际运行receipt沿用、未重查，源码不代表运行版本。独立managed工作区已提交并确认归档，创建1/退役1，无子agent/依赖或构建缓存。

> [GG-383](tasks/GG-383-reference-upload-reuse.md) GG-383参考图上传复用源码已接入a4caee5fd08c5e285044961de3b766cec220e31f（隔离9a0b5eef3533e4eeeec16402ae4284c05d0035c6，基线1f848b2，接入前e17ce66）。同owner/workspace完整字节SHA-256识别原图，同操作重试/同内容并发复用未过期pending或已校验ready记录；完成时核对实际文件哈希，第二次完成按同内容恢复。不同内容/身份/工作空间及显式编辑副本独立，副本自身重试复用，本机待上传副本标记可恢复；直接参考托盘相同ready ID保留首项，主动多画布节点/相册/冻结任务保持。新增0067仅写未应用，旧请求/旧后台上传路径兼容；后台更新前不宣称复用规则已运行。沿GG-276未编译/lint/typecheck/代码或diff检查/测试/浏览器验收，8项纯回归及1项具名隔离SQL回归仅写来源；无HTTP/SQL/Provider/生成/扣费、数据扫描合并/恢复写入、后台/服务或生产操作。GG-379空图保护和恢复画布保持，GG-374原66迁移及运行receipt未重查。编号避让GG-382视频设计，接入时保留其并行文档修正，b993e3c已由另一窗口记录来源。创建1/退役1，managed辅助归档已确认，无子agent/依赖缓存。源码交付、未自动验收/未后台启用/未部署；下一步用户另行委托0067与必要Web更新后手验，保留视频设计待反馈事项。

> [GG-382](tasks/GG-382-canvas-video-generator-design.md) GG-382官方对照完成：官方新版与附件核心结构/主要参数和大小/时长一致；补齐参考图组合数量、Omni视频像素/比例/帧率及分镜限制。O1Key另有/kling路由前缀、模型路径查询、状态/结果封装及cost，按附件契约适配，未实测。模型展示建议明确Omni/动作模仿身份，设计和价格仍待用户反馈。只读公开官网文档GET，无应用/Provider生成API、编译/检查/测试/浏览器、数据/服务或生产操作；源码仍5f5e7fb，GG-374运行receipt保持，创建0/退役0，无子agent/缓存副本。

> [GG-381](tasks/GG-381-canvas-reference-duplication-audit.md) GG-381完成用户要求的画布原始参考图重复创建源码路径分析；应用源码仍为GG-380 5f5e7fb8048db8f5b8b9537f6d37f078f70bc83f，本轮基线5e1d3054748f067475a0ce4f8fed9402f19390e2。资产重复拖入/节点复制/相册重复拖入会新增节点但复用assetId；文件夹内按kind+id去重，独立图片与相册可同时引用同图。重复本地文件/外部粘贴/直链上传可新增reference资产，未按文件内容复用；完整重试重新POST上传意向时后台仍随机新ID，clientId仅关联返回，存在原请求已成功但前端未确认后的重复风险。同一次PUT重试/complete状态轮询沿原ID；生成图转参考则有客户端按源assetId共享缓存及后台稳定ID/事务锁复用。送图按参考ID去重，不识别不同ID的相同文件。恢复/撤销替换节点，结果按runKey upsert；未见这些路径无故追加原始源图。建议优先同操作上传幂等，再做同授权范围内完整文件字节复用，保留主动多节点与编辑副本；仅建议，未改变产品决定或实现去重。只读源码分析/文档，无测试/编译/浏览器/HTTP/SQL/Provider、数据/服务或生产操作；当前真实画布是否已有重复资产未读取核验。创建0/退役0，无子agent/缓存。


> [GG-380](tasks/GG-380-batch-empty-port.md) GG-380动态素材组端点修复已精确接入5f5e7fb8048db8f5b8b9537f6d37f078f70bc83f（隔离8e492256c877ac3d5c547929dd7c2769e649000c，基线4546f5a）。逐张移除/整条参考边删除使候选桶清空时同步减少组数与端口，后续组前移，边ID/成员转换键保留，至少保留默认1组；新增未连接空组、仍有素材的组及加载/失败输入保持。chat改读实时native节点配置，组标题删除/模式切换共用端口重排。ADR0108及产品/交互/数据/错误/手验文档同步，8项合成回归来源只写未运行。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、数据恢复写入、服务或生产操作；GG-379空图保护与恢复副本保持，GG-374运行receipt不重写。复用中断前干净managed辅助，累计创建1/退役1，归档已确认，无子agent/依赖缓存。源码已交付、未自动验收/未部署；用户刷新恢复画布手验最后素材删除、后组前移、部分删除、新加空组及撤销/刷新。下一源码任务从当时HEAD核验5f5e7fb祖先后隔离。


> [GG-379](tasks/GG-379-canvas-data-loss.md) GG-379画布误保存保护已精确接入5941c82596840a18347bf98eda46aeef5a9aea20（隔离1f54025567e01785296db92028a6b008fe91130d）。用户丢失排查确认原画布48ad1462版本171于17:50:30变为0节点/0边；Vite17:50:27相册热更新及React Flow卸载reset与其一致，自动保存缺少临时空图保护。已备份原localhost5173 IndexedDB日志和服务器行，提取170干净快照（17:26:59，17节点/5逻辑边）；沿现有文档适配、校验与owner/workspace授权仓库创建独立恢复画布78d3d798-6bdb-45f5-b472-8995fdbf1955「开发画布（恢复副本）」版本1，只读落库/解码核对17节点/5边（云存储8条成员展开边），原171空记录保留，不改浏览器存储/原素材/原任务。同步器写本机前阻止同页非空变空，显式末节点删除或历史空帧给按页一次许可；新建空页/部分删除/删页保持，许可成功后消费/恢复时清理。无新产品决定/字段/迁移。回归来源覆盖六类场景，仅写未执行；沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，Computer Use两次内核退出、未发UI动作。只进行本次丢失诊断和独立恢复的本机数据操作；无provider/生成/扣费、服务或生产操作，GG-374运行身份不重写。创建1/退役1，managed辅助已确认归档，无子agent/依赖缓存，真实快照在仓库外TEMP/goodgood-canvas-recovery。源码已交付、恢复副本已落库，UI待用户手验、未部署；用户打开恢复副本继续工作并手验主动清空/撤销。下一源码任务从当时HEAD核验5941c82祖先后隔离。

> [GG-378](tasks/GG-378-album-resize-callbacks.md) GG-378相册伸缩回调修复已精确接入28431236bb8800a26fe5b7f26b8f5802908e103f（隔离440879109a385c491adfb746a88e4074a3085109）。用户手验发现GG-377选中相册即startResize未定义，源码确认开始/结束/键盘三项回调均遗漏声明；本次补齐稳定原生回调、历史捕获、manual标记和结束宽高/style同步保存，方向键仍复用既有相册几何10px/Shift50px。不改变ADR0135决定或外观、素材及候选边界，无新后台字段。GG-377任务补缺陷更正，错误和用户手验记录同步。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费、服务或生产操作，GG-374运行receipt保持未重查。创建1/退役1，managed辅助已确认归档，无子agent/依赖缓存。源码已补齐、未自动验收、未部署；用户刷新5173手验相册选中、四角持续伸缩、键盘及保存恢复。下一源码任务从当时HEAD核验2843123祖先后隔离。

> [GG-377](tasks/GG-377-album-resize.md) GG-377文件夹相册手动伸缩源码已精确接入f1119dd16fc756f91ee58ea97c102ed377337762（隔离e184625cf6c9fd911e2ee43f4ed9c4b31a27fca9）。选中相册沿媒体透明四角原生调整，宽高独立/最小200×120，保留360×300初始尺寸；稳定回调复用历史和保存，方向键10px/Shift50px沿既有组几何。预览列按56px最小宽自适应、超高内部滚动，说明不压缩；外置名称/数量/圆点、快照成员/原始图片及候选/10图边界保持。现有手动group宽高保存/复制/刷新恢复，无新字段或后台更新。ADR0135及产品/设计/交互/手验资料同步，gg371回归补收紧高度/50成员保持、固定对边/现有云wire尺寸、空相册及无效尺寸来源，仅写未运行。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费、服务或生产操作，GG-374运行receipt保持未重查。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存。已实现、未自动验收、未部署；用户刷新5173手验四角调整和保存恢复。下一源码任务从当前HEAD核验f1119dd祖先后隔离。

> [GG-376](tasks/GG-376-batch-node-polish.md) GG-376图片批量生成节点源码已精确接入93780cefc17d4446bfd5b0979a31e661e9fc0aee（隔离0717805f0acc4fe5d215eac7456067a01c258166）。节点/右键入口/连接提示统一名称，接收端复用媒体输入圆点，素材和组合预览共用18px黑圆白字编号；用户确认保留右上移除，以圆形黑底X/hover/键盘/触控统一。chat直接显示现有计划首组实际图序的一行横向预览，移除查看组合按钮/分页Dialog/关闭入口；完整执行/任务数/报价/公共参考/1–5组/10图及持久化保持。顺带补足PrivateObjectImage可选draggable转发，修正GG-375已有拖动设置未传达的问题。ADR0108及产品/设计/交互/手验资料同步。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费或后台/服务/生产更新，GG-374运行receipt保持未重查。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存。已实现、未自动验收、未部署；用户刷新5173手验。下一源码任务从当前HEAD核验93780ce祖先后隔离。

> [GG-375](tasks/GG-375-album-node-polish.md) GG-375相册节点源码已精确接入8d06014f1de118007359ded030f18d62d7ccd977（隔离5964debffd59c892ffd859f92803ea6229e18048）。仅相册接收鼠标事件，整框/缩略图/外置标题使用原生拖动，点击预览和内部滚轮浏览保持。左上文件夹图标/名称、右上数量直接复用图片元信息；右侧复用媒体圆点及已连接/键盘焦点样式；左下黑底圆形编号，底部精确为「连接到节点，一次性载入所有图片」。ADR0135和设计/交互/手验资料同步，快照/候选端口/请求上限/保存模型保持。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费、服务/后台或生产更新，GG-374运行receipt保持未重查。创建1/退役1，managed辅助已确认归档，无子agent/依赖缓存。已实现、未自动验收、未部署；用户刷新5173手验旧/新相册移动及外观。下一源码任务从当前HEAD核验8d06014祖先后隔离。

> [GG-374](tasks/GG-374-local-restart-after-reboot.md) GG-374按用户要求完成本地重启：原PG54449/Valkey56549/对象存储58049/Mailpit及原卷均健康，三个应用角色原本已停。必要构建verified d183b918ea139c429630a7177905fd2c60cbee93，复用原外部cloud-development/local-mailpit配置，独立隐藏CIM启动Web29548/32131、唯一Worker28916/32142、Vite17388/5173（启动器33100/27976/13896，父WMI7984）。跨命令仍监听；首页/原画布HTTP200，前端API代理同revision/verified，Web与Worker readiness五项均ok。启动前活动图片/文本任务、未派发outbox、个人/工作区/成员预留及两队列均0；原66迁移保持。未迁移/重置/写fixture、发起或重放真实生成/扣费或操作生产；仅必要启动构建与运行核对，未lint/typecheck/代码或diff检查/测试/浏览器交互验收。GG-373及既有应用源码保持，创建0/退役0，无子agent或新依赖副本。用户刷新原画布继续使用，下次重启按届时HEAD构建；纯交付文档提交不改写此运行receipt。

> [GG-373](tasks/GG-373-asset-menu-spacing.md) GG-373资产右键菜单排版源码已精确接入0b5d1a8ac913eeafeca6a0b0400bcafd3a581d8c（隔离4330226a6f6918d6c8e1aae8ded1c2459057583a）。两级菜单统一12px常规字重/20px行高/36px行与8px图标文字间距，目录名显式继承；移动至目录列表按内容宽度、140–260px及视口上限夹取，移除固定260px留白，原滚动/长名省略/触控44px保持。仅改局部CSS、设计与手验记录，不改功能决定/文案/归档或API。已按用户指定Impeccable读取SKILL、polish及craft-floor，沿GG-276未运行引擎、构建/lint/typecheck/代码或diff检查/测试/浏览器验收或HTTP/SQL/Provider；纯样式无新测试。GG-372/371源码和GG-366运行receipt保持，无服务/后台/生产更新。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存；未自动验收/未部署，用户刷新5173手验菜单。

> [GG-372](tasks/GG-372-asset-move-menu.md) GG-372画布资产右键移动至源码已精确接入59a6dec0d4b87431759af85cf838bd17561ca291（隔离b9dc2eefe425d5acf8962ed8759b0e290b1ffafe）。素材右键有界子菜单列出现有文件夹，当前位置禁用、无目录提示；复用原确认后归档/刷新/失败重试及提交门控，保持名称/标签/真实素材。生成/上传图、视频、音频与提示词模板均支持，拖放类型同步；已拖入相册快照保持。ADR0120与产品/交互/设计/错误/手验文档同步，既有gg256回归仅更新来源未运行。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费/运行或生产更新；GG-371源码及GG-366运行receipt保持未重查。创建1/退役1，managed辅助确认归档，无子agent/新依赖缓存；未验收/未部署，用户刷新5173先整理素材再手验相册。

> [GG-371](tasks/GG-371-folder-album-batch.md) GG-371文件夹相册与紧凑组合查看源码已精确接入d433fbf4633a1b162af926a787be0dd79cc47136（前置67dd0f5/b3a2d24；隔离bedcaf0/cdcd881/085ce0e，子agent原始e7c62e7/2ed7c38）。资产文件夹完整授权图片集可一次拖入一个360×300相册，5列内部滚动预览全部图/大图查看/失败重试；只接批量候选端口，整集合参与候选，保持公共参考及单请求10图边界。使用album组wire+隐藏真实sourceImage成员，拖入时快照；整体移动/复制/删除/历史/刷新恢复及普通组尺寸保持。chat仅显示查看组合入口，独立有界Dialog每页12组、翻页/跳页/真实图序，巨大组合直接定位目标页。沿GG-276回归只写来源，未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、运行更新或生产操作；GG-366运行receipt保持未重查。创建3/退役3，全部managed辅助已确认归档；两个写入子agent完成，未建立依赖缓存。未验收/未部署，用户刷新5173手验。

> [GG-370](tasks/GG-370-batch-reference-generator.md) GG-370独立画布「批量生成」源码已精确接入8e3e45b4d14fdec3d02044f9bb693826c9ff2bd7（前置aa68728/0aa2a23/23310e2；隔离c000b4a/4d90638/613c521/ae5fbb3）。公共参考+1–5候选组，画布源图/多选共用端点/参考组接入，全部组合或顺序配对，实际单请求去重≤10；chat共享提示词/模型/参数、实际总额与折叠前6图序预览。逐组合冻结输入复用并发slot/恢复/独立失败重试，逐实际引用数报价；沿1MiB文档容量预检及保存后门控，超额不静默截断或提交。独立组件+既有imageGenerator wire/批量ID/handle适配，不新增后台未知字段；本机batchConfiguration保存空组/空模式并在远端剥离，云按有效端口恢复。普通节点原路径保持。沿GG-276只写回归来源，未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、运行更新或生产操作；GG-366运行receipt保持未重查。创建4/退役4，全部managed辅助确认归档，两个写入子agent完成，无依赖缓存。用户刷新5173手验；未验收/未部署。

> [GG-369](tasks/GG-369-batch-reference-html-demo.md) 独立单文件HTML演示已交付：四类案例、候选选择、两种组合规则、图序/数量预览、共用chat参数及本地并发模拟/取消。离线绘图素材，不实际生成或扣费。浏览器打开请求queued；沿GG-276未自动检查/测试/浏览器验收，用户手验。未改应用，源码d8197c1/运行GG-366保持；创建0/退役0，1个纯文案子agent完成。

> [GG-368](tasks/GG-368-batch-reference-composition-design.md) 批量参考组合设计建议已形成，未实施/未成为产品决定。推荐批量生成节点复用chat，公共参考+自定义素材组、全部组合/按序配对、生成前数量/报价预览；复用现有多快照并发/幂等/失败重试，候选池与单任务10图限制分开。保存契约/报价需明确适配；沿GG-276无自动验收或运行/生产操作。应用源码d8197c1与GG-366运行receipt保持，创建0/退役0，2个只读子agent完成。

- 历史源码交接：[GG-367](tasks/GG-367-reference-sort-motion.md) 缩略图移位动效已精确接入d8197c137a834bacb40ba65ea2b300efdf6e94b4（隔离52b800e7f022d51eeab5db3a185c45837f3ffb7e）；拖动跟随/邻图160ms让位、缩放与滚动同步，取消/列表和几何变化不保存，有效释放沿原排序单次提交。沿GG-276仅写回归来源，未构建/检查/测试或浏览器验收，无服务/HTTP/SQL/Provider/生成/扣费或生产操作；GG-366运行receipt保持。创建1/退役1，辅助归档。用户刷新5173手验；下一任务从当前HEAD核验祖先隔离开发。

- 历史运行交接：[GG-366](tasks/GG-366-local-restart-after-reboot.md) GG-366电脑重启恢复完成：原PG54449落入Windows54385–54484保留范围、发布映射缺失；经Windows管理员授权短停WinNAT、重连原网络/别名并启动同一PG，原卷及54449映射恢复、WinNAT Running。必要构建verified 1dde20e6c08346d26c3d3d4dd97431605d057fe8；Web34716/32131、唯一Worker32420/32142、Vite30460/5173（启动器8232）通过独立隐藏launcher恢复。首页/原画布200、API代理同revision/verified，两角色readiness五项ok、cloud-development/local-mailpit保持。启动前活动图片/文本任务、未派发outbox、个人/工作区预留及两队列均0，原66迁移保留。未迁移/重置/写fixture/发真实生成/扣费或生产操作；仅必要构建和运行核对，未lint/typecheck/代码检查/测试/浏览器验收。GG-365/364源码保持，创建0/退役0，无子agent/新依赖副本。 GG-366恢复时源码检查点为c905455；GG-367前端源码已接入，运行receipt不改写，下方旧运行身份为历史。

- 历史源码功能交接：[GG-365](tasks/GG-365-reference-tray-reorder.md) GG-365拖动排序源码已接入c90545528347ecb729b19a5a9e3cacabc25e089c；隔离3378aee15c17a6e071718570eedf3258df152ec4精确接入023d76c5a49cb0f8fbfd47e6a1c0a2eae3517cb6，随后小修Tooltip仅隐藏内容，避免切换受控模式。chat直接/连线/组成员缩略图统一拖动插入排序，源淡化/目标灰边、横向滚动、取消/Escape及Alt方向键；cursor保持。只改当前目标，编号/新提交顺序一致，上传ID替换、移除、保存恢复、历史及复制保持。云层按已有直接数组和排名边ID可逆适配，无后台更新或迁移。GG-364稳定edges修复及既有功能保持。沿GG-276仅写回归来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、服务更新或生产操作；GG-358运行receipt未重查。 用户刷新5173手验；辅助已归档。

- 历史交接：[GG-364](tasks/GG-364-reference-update-loop.md) GG-364源码已精确接入56960a87115073a169c0800957a9ac7d0e076236（隔离a9a4f6818a712c3380506863b1f565fc4f28ae6e）。修复GG-363的graphRevision/受控edges引用反馈循环：空/普通边保留原数组，组边按实际原边/计数缓存并复用显示数组，计数和真实边变化仍正常更新，保存/历史观察保持。源码反馈链已定位，未做浏览器复现或自动验收。沿GG-276只写纯回归来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费、服务重启或生产操作，GG-358运行receipt未重查。用户刷新5173手验原画布/空画布、多图接入、移除计数/目标独立排除与保存刷新。

- 历史交接：[GG-363](tasks/GG-363-batch-reference-connection.md) GG-363源码已精确接入5cb456555b9af3e68933df302f03ab5a1e274fde（隔离68f697243acd7965ad5d02ccb758fbf71a45d6cb）。多选两张以上可用图片的外框右侧共用端点，一次有效连接后原位保留参考图组/一条线；组端点复用、连线计数/点击查看、逐张目标排除、去重/10图整批预检、上传等待失败/重试、取消/Escape防迟到提交、解散/重组输入保留及跨页复制/历史已接入。浏览器顺序/排除与导入键经可逆云子边/节点顺序适配，跨页ID唯一，兼容现有Web校验，无后台更新或迁移。 沿GG-276回归只写来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费、服务重启或生产操作。GG-358运行receipt保持未重查，GG-361/360/359源码保持；用户刷新5173手验5图一次接入、两个目标独立移除/刷新、取消/超额及原功能。创建1/退役1，managed辅助已归档，无子agent/依赖缓存。


- 历史设计分析：[GG-362](tasks/GG-362-batch-reference-design.md) 方案已获接受并由GG-363实现；当前GG-364修复其更新循环，实际交互仍待用户手验。

- 最新框选交接：[GG-361](tasks/GG-361-region-toolbar-spacing.md) 框选细化源码完成：隔离ba8d5f249a62ff3225a34278dfea2a063cdf511e精确接入b7d8dbf6c1e7050a940dc2f8558605ce5165a937。删除左上标签/Scan及对应CSS；右侧取消确认面板按内容适应宽度，8px内距/6px间距，按实测宽度重新定位、保留156px上限及窄屏夹取，正常不再有固定宽度左侧空白。红框/副本/取消及加载错误处理保持；ADR0141/产品/交互/设计/手验说明同步，已有几何断言仅更新来源未运行。创建1/退役1，无子agent/依赖缓存，managed辅助归档。沿GG-276未编译/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费/服务/后台或生产操作；保留GG-360公告布局及GG-358运行receipt，本轮未重查。用户刷新5173手验。

- 最新右上布局：[GG-360](tasks/GG-360-canvas-announcement-order.md) GG-360源码35ed5209501c331994af7f2fbeb72d6689048aca：画布右上顺序为保存状态/公告/积分，公告仅图标及原未读/弹层保持，积分事件和会话条件不变。保留GG-359及GG-358运行receipt，未重查/重启。当前集成目录小改创建0/退役0，无子agent/缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider或生产操作，用户刷新手验。

- 最新框选交接：[GG-359](tasks/GG-359-image-region-copy.md) 红框编辑/副本源码完成：隔离7522b6beeb889169d0349a5b697dff06393d3c88精确接入34709d4a78f7c881fd23fc8720d96cc5ab5ee7ab。原图默认居中红框/四角柄、图内编辑提示/浅遮罩，支持重画/移动/调节及画布缩放；bbox/复制移除，右侧正常仅取消/确认。确认共同标注几何导出原尺寸PNG并走已有旁置副本/上传/资产/项目保存，原图保留，提示/遮罩/柄不导出。selected/来源ID/页/身份/取消和资源释放保持，贴图原流程保持。ADR0141及AGENTS标注红色例外、产品/交互/设计/手验说明同步。沿GG-276合成回归仅写来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费/后台/服务或生产操作；GG-358运行receipt未重查。创建1/退役1，managed辅助归档，无子agent/依赖缓存。用户刷新5173手验。

- 最新运行交接：[GG-358](tasks/GG-358-local-runtime-recovery.md) 2026-10-04连接拒绝再恢复：原应用进程已停止，Docker依赖healthy，日志无明确退出原因。必要构建verified 3b7393a16fc013d867c9be35904b1f61eb5bc0ee；通过Windows CIM/隐藏launcher独立启动Web7704/32131、唯一Worker15844/32142、Vite35552/5173（启动器23288）。launcher父进程为WmiPrvSE，跨命令仍运行；首页/原画布200、API代理verified、readiness五项ok。原66迁移/外部cloud-development/local-mailpit保留，启动前任务/outbox/预留/队列均0，无迁移/重置/fixture/真实请求/扣费或生产操作。创建0/退役0，未测试/lint/typecheck/浏览器验收；用户刷新手验。未确认前次退出根因，不声称根治，若再退出查本次退出日志；下方旧PID为历史。

- 最新重启恢复：[GG-357](tasks/GG-357-local-restart-after-reboot.md) 2026-10-04已恢复GG-116本地项目；verified构建d066a241f385c52ef0032d3aca91f2e1bf614079，Web31140/32131、唯一Worker2624/32142、Vite28824/5173（启动器13756）。原E盘healthy依赖/66迁移/外部cloud-development/local-mailpit保留，启动前活动任务/outbox/预留/队列均0，首页/原画布200、API代理verified、readiness五项ok。GG-350随当前Worker启用，下面Worker待启用/旧运行身份为历史。创建0/退役0，无测试/lint/typecheck/浏览器验收、迁移/fixture/真实生成/扣费或生产操作；用户刷新原画布。纯文档提交不改变运行receipt，下次重启仍按届时HEAD构建；适配器/日志备份见任务卡。

- Seedream本地修复：[GG-356](tasks/GG-356-seedream-constraints.md) GG-356已修复并本地启用：隔离4dbdaa4c7a53ffaff3cffb9440fe7e285e8b85b5精确接入6ba2d0d57ae15a4a77a6f3e01810dc0e72f96151。新增0066仅对齐generation_batches/projects/creation_drafts模型ID约束至既有schema，修复Seedream提交前503。2026-10-04 00:15:02通过直接迁移模块只应用0066到127.0.0.1:54449/goodgood；历史65条内容校验和匹配，迁移总数66，新校验和记录匹配，三处约束validated。迁移前后账户/资产/参考图/任务/项目/草稿及积分流水数量、个人/工作区可用及预留余额、Seedream目录/全部报价均不变，开始活动任务0。未改旧迁移/运行JS，不需构建或重启；Web/唯一Worker/Vite沿既有运行，GG-350Worker更新待办保持。专用数据库回归仅写来源，沿GG-276未构建/lint/typecheck/代码检查/测试/浏览器验收；无合成任务/Provider/扣费/自动重放或生产操作。创建1/退役1，managed辅助确认归档，无子agent/缓存。用户现在可自行重试Seedream，真实生成效果待手验。

- Seedream诊断历史（已按GG-356修复）：[GG-355](tasks/GG-355-seedream-diagnosis.md) GG-355只读诊断完成：2026-10-03 22:14:49/22:14:52两次POST /api/generations返回503，Web日志均为generation_batches_model_check约束失败。已验证127.0.0.1:54449/goodgood（连接/事务只读）：Seedream目录启用且1K30/2K60报价存在，但generation_batches/projects/creation_drafts模型约束只含五个原有模型、缺seedream-5.0-pro；源码0054只加目录/价格未扩展约束。Seedream任务未落库，未到Worker/上游；按事务代码在预留积分前失败并回滚。当前请求仅诊断，未改代码/迁移/真实数据/服务或触发生成；后续修复应新增迁移放行三处约束，不重写已应用0054。GG-354源码检查点cc31fcce862f127400ac5a65ef26bf55743ea969及现有功能/运行保持；GG-350Worker原因采集待办继续。 另已确认db/schema.ts三处采用模型ID格式约束，与已应用SQL的五模型枚举不一致。

- 最新框选：[GG-354](tasks/GG-354-inline-bbox.md) GG-354源码完成：隔离f6362fa868c019653695ba7a801f1753fec4aad1精确接入cc31fcce862f127400ac5a65ef26bf55743ea969；框选直接在画布原图拖框/移动/四角调整，无遮罩或独立弹框，右侧正常只显示原图像素bbox与取消/复制，复制仅一行坐标。浮层随原图/画布缩放移动，原图滚轮交现有画布；取消/Escape、空/加载/失败、切页/身份/源图守卫、键盘/触屏与资源释放已写。旧弹框框选状态/UI移除，贴图保留。保留GG-353连续工具栏008562243cd64a3d2f7fe57f618b9c4c36668ae2、GG-351顶部工具区及GG-346/350/349。GG-354合成回归仅写来源，沿GG-276未构建/lint/typecheck/代码检查/测试/浏览器验收，无应用HTTP/SQL/Provider/扣费/运行/后台或生产操作，既有receipt未重查。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存。用户刷新5173手验原图框选/坐标复制/取消/画布缩放及原有贴图；GG-350仍待独立委托更新唯一Worker。

- 最新左下工具：[GG-353](tasks/GG-353-canvas-control-colors.md) GG-353源码008562243cd64a3d2f7fe57f618b9c4c36668ae2：左下四个入口合为连续白色底板，浅灰细边/12px圆角、3px内距/2px间距；图标及缩放文字固定黑色#111，悬停/焦点/按下/开启仅改浅灰背景。原32px按钮、弹层/资产到达/焦点保持，地图上移8px保持10px间隙。创建0/退役0，无子agent/缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider/服务或生产操作，receipt未重查。用户刷新5173手验；GG-352/351/346及GG-350待独立启用Worker保持。

- 先前图片工具（框选已按GG-354更新）：[GG-352](tasks/GG-352-image-region-sticker.md) GG-352源码完成：隔离3ac2e5b精确接入1847f2e7d5834f416f7efd30546e15a021499f06；图片快捷栏新增框选和贴图，单区域拖动/四角/数值及原图像素/0–1000 bbox提示词复制，最多10层本地/资产贴图移动/等比缩放/旋转/层序/删除，原图视图缩放平移不改坐标，确认原尺寸PNG旁置副本。独立context/几何/加载导出及资源取消已写，无新后台/计费/生成。保留GG-346操作排布、GG-351顶部工具区9e7b975efd0bd6599528ba47d278356f6484cd07和GG-350/349。合成回归仅写来源，沿GG-276未编译/lint/typecheck/代码diff检查/测试或浏览器验收，无应用HTTP/SQL/Provider/扣费/服务或生产操作，既有后台receipt保持未重查。创建1/退役1，managed辅助已确认归档（原目录gg-351，实际任务改号352），无依赖缓存/子agent。用户刷新5173手验框选坐标和复制、贴图透明/变换/层序、视图缩放、原尺寸副本及失败取消。

- 最新顶部工具区：[GG-351](tasks/GG-351-canvas-header-design.md) GG-351源码9e7b975efd0bd6599528ba47d278356f6484cd07：顶部左导航/右状态两组不透明白底、细灰边和12px圆角，无阴影；原字号/桌面25px中心、侧栏避让及事件保持，980px内左组两行/名称收缩/页签滚动。中间指针透传，画布viewport/节点坐标不变。ADR0140 Accepted。干净GG-116小改创建0/退役0，无子agent/辅助缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider/扣费/服务或生产操作，原运行receipt保持未重查。用户刷新5173手验图片顶部混叠、宽窄屏/多页/名称/侧栏及公告/账户/保存；GG-350新原因采集仍待独立委托更新唯一Worker。

- 最新调色操作：[GG-346](tasks/GG-346-color-grade.md) GG-346操作排布6cd79e205e2c7c08cb73269c2ee18d812b07c03c：查看变化/恢复自动放右侧参数下方同一行靠右，同尺寸/间距；查看按压切换与恢复默认参数保持，原预览底部工具行移除，图面及加载/失败遮罩同步扩展。ADR0139同步。当前GG-116小改创建0/退役0，无子agent/缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider/扣费/服务或生产操作，既有运行保持未重查。用户刷新手验布局/切换/恢复；GG-350新原因采集仍待另行委托更新唯一Worker。

- 最新失败说明：[GG-350](tasks/GG-350-generation-response-reasons.md) GG-350源码已接入df97afd7bc3a307fd73dbc65b8bb5d60c7880964（隔离d0277e0）：后台逐项解释base64无链接、URL、MIME、数量、任务字段与状态冲突，保留HTTP上下文和图片序号/数量；旧格式错误明确未记录具体异常字段，不推断或回填base64。合成回归来源已写未运行，沿GG-276未构建/lint/typecheck/代码检查/测试或浏览器验收，无新Provider请求、数据改写、服务重启或生产部署。创建1/退役1，无子agent/辅助依赖缓存。当前Web67ffde7/唯一Worker94bee535保持；用户刷新5173手验旧提示，新原因采集待另行委托更新唯一Worker。

- 最新随机填写：[GG-349](tasks/GG-349-random-parameters.md) GG-349源码完成：隔离a7a8cac精确接入7fb9a329875f44cab8b6304b807ff6cf28e6ab19；添加数据新增「随机生成」，100组不同示例填入11项拍摄参数、清空4项图片信息/旧粘贴草稿，每轮无重复并避免轮间紧邻重复，可手改。确认添加只需任一可编辑字段trim后非空，原加载/处理锁定、格式校验及旁置副本保持。暂不新增EXIF字段/后台/收费；保留GG-346调色。合成回归仅写来源，沿GG-276未构建/lint/typecheck/代码diff检查/测试或浏览器验收，无应用API/SQL/Provider/扣费/迁移/服务或生产操作；GG-342既有后台receipt保持未重查。创建1/退役1，managed辅助已确认归档，无依赖缓存/子agent；用户刷新5173手验随机填入、图片信息清空、单项非空/全空和确认副本。

- 最新自动调色：[GG-346](tasks/GG-346-color-grade.md) GG-346已交付源码：隔离7bf093305645d4d7de15687ef7bcafc9ea556235精确接入72083c594ed4fffbaa1b8927ff71bb7e943a5e6a。图片快捷栏对比之后新增调色，当前输出冻结参考首张打开即自动匹配；实际参考/资产切换、仅手动、六项参数、调整前/恢复、原尺寸PNG/JPEG新副本完成。OKLab有界色度匹配默认保明度，共用LUT的WebGL预览/Worker导出及取消/失败处理；不调用生成或新增收费，不需新API/迁移/后台重启。GG-347/348添加数据更新保留。创建1/退役1，独立Git工作树干净无依赖/构建缓存，分支保留；Windows当前目录句柄只留下空目录，已从外部正常移除空目录，无强制删除文件。未构建/lint/typecheck/代码diff检查/测试/浏览器验收，合成回归仅写源码，无应用API/SQL/Provider/扣费/服务或生产操作；GG-342既有后台receipt保持，本轮未重查。用户刷新5173手验自动参考质量、参数/对比/重置、无参考/失败、透明/格式/尺寸、新副本上传及关闭/身份切页取消。

- 最新字段范围：[GG-348](tasks/GG-348-remove-location.md) GG-348源码完成：隔离600bdbb精确接入7be483f77183e4852f4a8feb65f24d66be2b3f72，添加数据仅11项拍摄参数/4项图片信息；位置输入及inputMode移除，读入/复制/粘贴过滤坐标，写副本仅合并当前目标原有可读取成对坐标，不隐藏添加新位置。核对CIPA标准与实现：现有15项是EXIF常用子集，未支持白平衡/闪光灯/测光/曝光模式等，当前重建写入不完整保留未知EXIF。未新增字段/完整标签迁移；未构建/检查/测试/浏览器验收，无后台/数据/Provider/扣费或生产操作，GG-342receipt保持。创建1/退役1，managed辅助归档，无依赖缓存/子agent，保留GG-346并行开发；用户刷新手验。

- 最新移除还原：[GG-347](tasks/GG-347-remove-reset.md) GG-347已交付源码：隔离eec8527精确接入021921b9abfecfd4aff6421ac1019186ecf20d11，删除添加数据的还原按钮、restore处理与RotateCcw导入；关闭丢弃草稿，重新打开重新读取当前图片，复制/粘贴/确认添加保持。未构建/检查/测试/浏览器验收，无后台/数据/Provider/扣费或生产操作，GG-342运行receipt保持。创建1/退役1，managed辅助归档，无依赖缓存/子agent；GG-346未提交登记保持，不混入本任务。用户刷新手验。

- 最新弹框简化：[GG-345](tasks/GG-345-add-data-dialog.md) GG-345已交付源码：隔离ae3489d精确接入62589eeb7f458ca01d6ce947cc67e867e2268602。添加数据移除参考图提取/关联读取、全部C2PA技术说明、左下清理提示及下载副本；底部唯一「确认添加」靠右，处理中「正在添加…」。当前图预填、复制/粘贴/还原、原副本保存及内部容器/凭证保留保持，无新API/存储/计费。未构建/检查/测试/浏览器验收，无迁移/服务/Provider/扣费或生产操作；GG-342后台receipt保持，本轮未重查。创建1/退役1，managed辅助已归档，无依赖缓存/子agent；用户刷新手验。

- 最新添加数据：[GG-344](tasks/GG-344-metadata-entry.md) GG-344源码完成：隔离2b4e2f2精确接入68373374d91f173e2b1cde0e0b7ba3b2cc491870，按钮/悬停/无障碍名称及弹框统一「添加数据」。入口依据受权素材能力独立启用，共享上下文移到独立模块以保持热刷新实例一致；原项目/切页/身份与源图匹配、副本写入校验保持。未构建/lint/检查/测试/浏览器验收，无迁移/重启/Provider/扣费或生产操作；GG-342后台receipt67ffde7保持，本轮未重查。创建1/退役1，辅助工作区managed归档，无依赖缓存/子agent；用户刷新手验入口、预填及副本保存/下载。

- 最新提示文案：[GG-343](tasks/GG-343-cleanup-tooltip.md) GG-343已完成：隔离c8ce90c精确接入f09439732eeca6f8e28bc7e18adb6e5485cf5288；去除AI的title/aria-label仅为「去除AI识别」，移除积分、技术说明与该UI未使用常量导入。按钮短标签/处理中状态、即时执行及10积分服务端结算保持。仅源码/文档，未构建/检查/测试/浏览器验收，无迁移/服务/扣费或生产操作；GG-342既有后台启用receipt67ffde7保持，本轮未重查。创建1/退役1，辅助工作区managed归档，无依赖缓存/子agent；用户刷新5173手验。

- 当前开发源码/运行：[GG-342](tasks/GG-342-cleanup-activation.md) GG-342已完成源码与受权本地启用：隔离ffe0ab3精确接入67ffde7161f51ec3c4f73ae9dedabe210156a138；按钮只显示「去除AI」，每次10积分放入悬停提示/无障碍名称，点击立即处理，无确认弹框。必要构建通过，0064公告与0065清理按序应用到127.0.0.1:54449/goodgood（65段迁移），现有账户/资产/积分流水总数迁移前后相同，无fixture或数据重置。仅Web9448替换为34460/32131，唯一Worker23800/32142与Vite33440/5173保持；Web/Worker readiness五项ok、首页200、API代理verified67ffde7，新清理/公告/公告管理接口未登录返回401 SESSION_EXPIRED。功能、收费与公告实时效果仍待用户手验；未运行lint/typecheck/测试/浏览器验收、真实处理/扣费/Provider请求、公告发布/统计fixture或生产部署。创建1/退役1，managed辅助工作区已确认归档，无子agent/依赖缓存。

- 活跃目录F:/goodgood-worktrees/GG-116，分支fix/GG-275-text-editor-layout；当前Web构建receipt绑定67ffde7，后续纯交接文档提交不改变已启动进程的版本。cloud-development/local-mailpit及外部配置保持；dist两份忽略启动适配器已恢复，旧日志/manifest备份留在仓库外。未来重启必须先按届时HEAD构建，勿使用旧Worker启动新副本；完整hash与操作记录见GG-342。下方待启用描述是当时历史，GG-342已完成公告和清理的本地启用。

- 最新源码交付：GG-341「去除AI · 10积分」源码已精确接入3579444（隔离3c23d13，基线1c9ecbf，接入前8aaa0f9），保留GG-340铃铛及全部此前功能。JPEG/PNG内C2PA、EXIF/GPS及ComfyUI文本等统一清理；受权原图/幂等操作、个人充值来源/企业预算、ready副本和10积分同事务提交，失败回滚不收费；相邻画布副本/资产与余额刷新、跨页身份及未知结果原键恢复完成。元数据弹框移出清理按钮。ADR0138/0065及合成回归来源已写，未自动编译/lint/typecheck/代码diff检查/测试或浏览器验收，未SQL迁移/应用HTTP/Provider/后台/服务或生产操作；0064与0065和新Web需用户另行委托启用。创建1/退役1，managed辅助工作区已归档，干净无依赖缓存/子agent。运行receipt沿GG-330 verified94bee535/原Web/唯一Worker/Vite/数据/SMTP未重查。

- GG-340入口细化：从核验1c9ecbf/40a67bb隔离codex/GG-340-announcement-icon，972303e→d4c1e80已接入GG-116。共享入口新增iconOnly、画布开启/大厅保持标签，34px按钮与未读点右上定位，aria-label/到达动效/提示/阅读保留；ADR0137同步。累计创建2/退役2，干净无Node的后续目录正常移除、分支保留，无自动验证/服务或数据操作；0064迁移与Web仍待用户委托。

- 最新公告源码：[GG-340](tasks/GG-340-announcements.md)从核验c09d623隔离登记2b9c5e7/实现6ce5f38，归并f4bd4ff精确接入b25d670，最终52px大厅顶部预留55c9424→40a67bb。初始编号与另一窗口下载/反推UI登记相撞，公告最终GG-340，保留其GG-337/338/339及所有冲突文档内容；没有整体合并功能分支。首页/画布右上共享入口、非模态帖子流及有限到达提醒，站长`/admin/announcements`完整草稿/发布更新/重要/置顶/撤回/删除；实时SSE/Redis与断线ID快照、CAS稳定操作键、隐藏阅读/点赞指标。新增`0064_gg340_announcements.sql`未执行，新Web未启用，当前后台仍沿GG-330 receipt，单靠刷新不能使用完整公告。后续用户委托时先确认本地独立目标，再迁移并构建/重启Web，公告无需Worker重启；本轮无数据/服务/通知/Provider或生产操作。创建1/退役1，旧隔离目录已正常移除，codex/GG-340-announcements/55c9424保留；无依赖缓存/子agent、编译/lint/typecheck/代码diff检查、测试运行或浏览器验收。用户负责手验，定向回归只写在tests/gg340-announcements.test.mjs，当前应用源码检查点40a67bb。

- 最新命名/模型布局：[GG-339](tasks/GG-339-prompt-reverse-ui.md)基于干净36542d8，8087311→655213b已接入GG-116/5173。右键/自动标题/连接名称与无障碍入口改提示词反推，预设目录/菜单/Badge改结构化提示词；模型及设置组按内容宽度，箭头紧邻名称、预设相邻，窄屏省略/换行/发送靠右保持。仅文案/样式及既有目录预期来源，内部ID/隐藏指令/API/计费/保存不改，无后台激活需求。创建1/退役1，辅助已managed归档，无子agent/依赖缓存；未编译检查/测试/浏览器验收，无应用API/SQL/Provider/服务/生产操作，用户刷新手验。GG-338/337及GG-330运行receipt保持，本轮未重查运行。

- 最新原始凭证分析：[GG-337](tasks/GG-337-original-download.md)第二份用户JPEG含6335字节C2PA，原始声明Google生成式AI创建/添加SynthID水印，claim生成器Google C2PA Core Generator Library。原始JUMBF/APP11及完整解码JSON在仓库外c2pa-114712目录交付；独立本地图片/三条声明哈希及随附公钥claim签名匹配，未验证根信任/撤销/时间戳或像素水印。未修改/外传/入Git用户图片、无应用代码或运行变化。此前清理副本无内嵌C2PA，二者未确认同图配对；GG-338源码/未运行应用检查和GG-330运行receipt保持。

- 最新下载文案：[GG-338](tasks/GG-338-download-label.md)基于干净17fae8a，08f3387→98c82d4已接入GG-116/5173。画布图片与资产侧栏图片右键「下载原图」改为「下载」，仅文案及对应说明，原始文件下载行为不变。创建1/退役1，managed辅助已归档，无子agent/缓存；未编译检查/测试/浏览器验收，无后台或运行更新，用户刷新手验；GG-337实际文件核验及GG-330运行receipt保持。

- 最新实际文件核验：[GG-337](tasks/GG-337-original-download.md)用户提交下载的无元数据副本，独立只读JPEG全结构/尾部检查与Pillow解码成功，1792×2390、3,120,501字节，仅APP0/JFIF基本信息；无内嵌C2PA/EXIF/XMP/IPTC/注释及EOI后数据。完整SHA256/标记receipt见任务卡，原文件未提供，不判定原图是否曾有C2PA或前后像素/压缩流一致。未修改/上传用户图片或入Git，无应用回归、编译检查、浏览器或服务/数据/Provider操作。下一步仅在用户需要前后对比并提供原文件时继续只读分析，原运行receipt保持。

- 最新原图下载：[GG-337](tasks/GG-337-original-download.md)基于干净c09d623，隔离18cb9aa→33525ab已接入GG-116/5173。画布图片/画布内资产图片右键新增「下载原图」，生成批次实际点击定位；受权原图/本地原始File Blob不额外压缩、转码或改元数据，清理副本下载自身。MIME扩展名、进行中/失败重试及切换取消，原菜单保持。创建1/退役1，managed辅助已归档，无依赖缓存/子agent；合成回归只写未运行，无编译检查/测试/浏览器验收、后台更新或应用API/SQL/Provider/服务/生产操作。用户刷新下载刚清理副本后发送实际文件，目前未收到，元数据独立核验待文件；GG-336/335/334及此前源码和GG-330 verified94bee535/原Web/唯一Worker/Vite/数据/SMTP receipt保持，本轮未重查运行。

- 最新内嵌凭证：[GG-336](tasks/GG-336-c2pa-metadata.md)基于干净242765d，隔离fe750a6→4f686a1已接入GG-116/5173，关联组窗口idle。元数据弹框识别JPEG C2PA JUMBF多片/XLBox与PNG caBX，原清除动作生成去除凭证副本；未知结构/分片序号歧义不宣称已清干净，不误删其他APP11，坏EXIF保留原凭证状态。普通编辑保留凭证字节并提示可能失效，识别存在不验签/判定AI，不处理水印/外部凭证；原参数/源图/副本路径保持。创建1/退役1，managed辅助已归档，无依赖缓存/子agent；合成回归只写未运行，无编译检查/测试/浏览器验收、后台更新或应用API/SQL/Provider/服务/生产操作。用户刷新重开弹框，手验提示/清除副本与独立读取、还原取消；GG-335/334及此前源码和GG-330 verified94bee535/原Web/唯一Worker/Vite/数据/SMTP receipt保持，本轮未重查运行。

- 最新元数据入口：[GG-335](tasks/GG-335-remove-photo-extraction.md)从干净8bfa266隔离30f1a62→f411a48已接入GG-116/5173，关联组窗口idle。移除「从照片提取」/隐藏本地文件选择器及引用，更新当前图编辑/空状态/损坏提示；自动预填、实际参考图提取、参数复制粘贴/手填、清除/还原及副本下载保存保持。ADR0136/产品/交互/错误/手验说明同步；创建1/退役1，managed辅助已归档，无依赖缓存/子agent。未编译检查、测试或浏览器验收，无后台更新或HTTP/SQL/Provider/服务/生产操作；用户刷新并重开弹框手验。AI检测只调研说明，不新增功能；GG-334及此前源码保留，GG-330 verified94bee535和原Web/唯一Worker/Vite/数据/SMTP receipt保持，本轮未重查运行。

- 最新透明缩放入口：[GG-334](tasks/GG-334-invisible-resize-corners.md)核验982a460含GG-333，从managed隔离cf79e22精确接入5c32b19。组/共享Markdown四角复用图片resizeControl与空白resizeHotspot，无SVG角标、悬停/拖动底色；原生定位/斜向cursor/缩放补偿及仅键盘focus-visible轮廓保持。文本左/上键盘角点固定对边，尺寸夹限按实际变化补偿位置，旧右下size API兼容；组稳定回调/内容约束/自动居中与手动留白保持，关联窗口idle、GG-331面板及此前改动保留。创建1/退役1，managed辅助工作区已归档，保留分支/提交，无依赖缓存/子agent。回归源码只写，未编译/lint/typecheck/代码diff检查/测试或浏览器验收，无HTTP/SQL/Provider/服务/生产操作，无新后台启用。用户刷新5173手验四角光标/拖动/键盘对边固定/夹限、组边框移动及保存恢复；运行身份沿GG-330 verified94bee535和原Web9448/唯一Worker23800/Vite33440/数据/SMTP receipt，本轮未重查运行。

- 最新组居中修复：[GG-333](tasks/GG-333-group-auto-centering.md)核验2e5b6d0，隔离a4b59bf精确接入7baf03b；旧框内标题60px上预留改为与下方相同28px，自动最小120px高度额外留白按可见内容中心分配，沿原标题/叠层测量，左右不变。实际content envelope与自动理想尺寸分离，手动框只包围实际内容/间距，不因自动居中移动或增长；父框拟合重算成员相对坐标以保持绝对位置，GG-325稳定读写和死区保持。仅组helper、必要回归来源/ADR及说明，无新持久/API/后台需求；创建1/退役1、managed辅助工作区已归档，零依赖缓存，未编译/lint/typecheck/代码diff检查/测试或浏览器验收，无HTTP/SQL/Provider/运行/生产操作。用户刷新5173手验自动上下等距/小组/展开与手动留白及切换适应内容，保留GG-332/331；运行沿GG-330 verified94bee535及原Web/唯一Worker/Vite/数据/SMTP记录，本轮未重查运行。

- 最新分组视觉：[GG-332](tasks/GG-332-group-toolbar-layout.md)核验f86dd1b及GG-330/326祖先后隔离20d29a3/cc1a86b，保留另一窗口1c74ff8后精确接入a06a1fd/2d44a19。四角文本节点式16px双斜线/32px命中、框内4px及对应角落旋转/缩放原点；外置imageMetadata标题/emoji，原双击/Enter/F2编辑和标题移动保持；原生NodeToolbar上方emoji/适应内容/解散、固定屏幕尺寸与14px图标，取消选中清理emoji弹层。仅组TSX/CSS和必要ADR/设计/交互/手验说明，无几何/存储/后台变化。创建1/退役1，managed辅助工作区已归档，零依赖缓存；未编译、lint/typecheck、代码/diff检查、测试或浏览器验收，无HTTP/SQL/Provider/服务或生产操作。用户刷新5173手验三个位置与原操作，保留GG-331文本面板和此前源码；运行身份沿GG-330 Web9448/唯一Worker23800/Vite33440及verified94bee535 receipt，本轮未重查运行。组云校验此前已启用，无需新后台激活。

- 最新文本输入细化：[GG-331](tasks/GG-331-text-composer-spacing.md)基线核验184458f，隔离12ac96d/cd5fe3d精确接入GG-116/5173为f241059/f86dd1b。chat加宽480–640px并保留视口/边栏收缩，参数间距/内距增大；非模态受控模型单选菜单、点击/聚焦输入关闭且不抢焦点，切走节点/锁定关闭，预设同为非模态。无新依赖、API、计费、持久字段或后台更新；创建1/退役1，辅助目录干净正常Git移除，无依赖/缓存/Node进程。未构建、lint/typecheck、代码/diff检查、测试/浏览器验收、HTTP/SQL/Provider或运行/生产操作，用户刷新手验。GG-330 Web9448/唯一Worker23800/Vite33440及94bee535后台receipt身份沿原记录保持，本轮未重查运行；未来重启仍按最新HEAD构建。

- 最新本地运行：[GG-330](tasks/GG-330-local-connection-recovery.md)连接拒绝恢复完成；原5173/后台/Docker已停，日志未明确退出原因。Desktop初启回到C盘空目录，正常stop、备份设置并只恢复CustomWslDistroDir原E盘后原依赖healthy，无数据盘/卷或数据库重置。必要构建94bee5354e5b1a77516235ee894a19a42767610e，Web9448/32131、唯一Worker23800/32142和Vite监听33440/5173（启动器29228）可用；首页200/API代理verified、readiness均ok，启动前任务/冻结/队列只读均0。源码包括GG-329/328/326/327及组云校验，无迁移或新功能变更，用户刷新手验；创建0/退役0，无测试/lint/typecheck/浏览器/真实请求或部署，cloud-development/local-mailpit及原数据保留。两份忽略适配器构建后已恢复，临时备份清理，旧日志及设置备份保留仓库外。严格receipt绑定94bee5354e5b1a77516235ee894a19a42767610e，下方0b5744d/419b097及待激活为历史状态；再次启动先确认Docker原E盘路径/唯一Worker并按当前HEAD构建。

- 最新上下文修复：[GG-329](tasks/GG-329-reactflow-context.md)从核验8c2997f隔离，7f0efdc/14ffdef精确接入GG-116/5173为47fd0b8/efe7aa6。CanvasWorkspace单一ReactFlowProvider覆盖工具Provider与ReactFlow，修复图片元数据hook祖先错误；已安装xyflow复用同一store，初始edges/空节点/缩放保持。保留GG-328文本UI/GG-326组框/GG-327元数据及前序源码；创建1/退役1，零依赖/缓存，未编译、lint/typecheck、代码/diff检查、测试或浏览器验收，无HTTP/SQL/provider/运行/生产操作。用户刷新后选中文本生成结果并打开图片元数据手验，无后台更新；原GG-322 Web0b5744d/唯一Worker419b097/Vite/数据/SMTP身份保持。

- 最新文本生成细化：[GG-328](tasks/GG-328-text-generation-ui.md)根从b8e8916隔离，809d86b登记在并行5745472交接期间入当前HEAD，保留双方记录并3eb685d补BACKLOG，698544b精确接入a9952d7。紧凑360–520px/视口composer、上部滚动和固定底栏/八行输入，模型预设/生成停止与禁用原因、真实阶段/文档等待和编辑提示完成；合并输入/素材/pending/长度与快捷键共用条件。共享Markdown仅可选展示参数，原双击/编辑/模板、模型/计费/停止/流式/恢复保持，无新API/持久/后端更新。创建1/退役1，根辅助目录干净正常Git移除，零依赖缓存；未编译/lint/类型/代码检查/测试、浏览器/HTTP/SQL/provider或服务/生产操作，用户刷新5173手验。保留GG-32637eef68、GG-327及前序源码；组云字段仍待独立Web激活，运行身份仍沿GG-322 Web0b5744d/唯一Worker419b097/Vite和原数据/SMTP。

- 最新分组排版：[GG-326](tasks/GG-326-group-frame-controls.md)独立b8e8916→f1fc6a0，保留并行已接入GG-327 c751455后精确接入37eef68；共享文档保留双方新增段落。完整本地按需emoji分类/搜索/最近使用/肤色，中文灰阶弹层/失败重试，既有锁定包只转直接依赖；中央透传/默认光标，四边/标题移动，选中四角原生缩放/内容约束与方向键，手动留白只扩展不缩回、可恢复适应内容，持久groupSizing/明确恢复尺寸完成。保留元数据/对比与GG-325完整测量/分帧/过期计划保护，另窗F:/goodgood-worktrees/GG-328-text-generation-ui仍独立。创建1/退役1，managed辅助工作区已归档，零依赖安装或构建缓存；未编译/lint/测试/代码检查或浏览器验收，用户刷新5173手验。组云字段仍需另行授权Web激活，无SQL/Worker更新；当前Web0b5744d/唯一Worker419b097/Vite及数据/SMTP保持，无服务/provider/生产操作。

- 最新元数据工具：[GG-327](tasks/GG-327-image-metadata.md)独立8e9eeb8→ae12b1c精确接入27ec47a/5a488cc；工具栏保持裁剪→对比→增加元数据，已自动预填/提取照片或实际参考图/复制粘贴与清除，并可下载或保存旁置私有新副本。新文件参数不改真实生成记录；JPEG/PNG20MiB及常用字段，MakerNote/拍摄原图缩略不复制，色彩显示所需信息保留。复用既有上传/重试/项目状态，无新后台激活需求。创建1/退役1，辅助工作区已归档，零依赖缓存；未编译/检查/测试/浏览器，未操作服务/数据/provider/生产。用户刷新5173手验；b8e8916分组修复与GG-324保留，另窗GG-326组框/emoji在独立目录开发，当前Web0b5744d/唯一Worker419b097/Vite及数据/SMTP保持。

- 最新建组修复：[GG-325](tasks/GG-325-group-resize-loop.md)从8e9eeb8隔离d6aadee，精确接入GG-116/5173为faaad8a，保留另窗已完成GG-324图片对比da10928/3e34fa7/d92830e。组框明确整像素width/height、框内容独立布局，完整原生measure后按持久坐标拟合；读写分帧、过期计划取消和一像素容差避免重复布局。不屏蔽错误，截图真实observer堆栈缺失，未浏览器复现/编译检查或运行测试，用户刷新再试建组；创建1/退役1，零依赖缓存。Web0b5744d/唯一Worker419b097及原Vite/数据/SMTP保持，新组云字段仍需另行受权更新Web，无SQL迁移。

- 最新图片对比：[GG-324](tasks/GG-324-canvas-image-compare.md)基线ba73fea，根隔离cdf6c02/97fd038精确接入GG-116/5173为da10928/3e34fa7，保留另窗GG-323分组2fa0486；三类图片共享裁剪右侧对比入口，所选output真实参考优先、资产真实名称搜索/选取、hover分界与键盘触屏完成。当前图右侧/对比左侧、居中等比适配，受权最高2048读图/原512缩略，独立临时Dialog/有界池，关闭/页身份清理和局部错误重试；无上传/生成/保存字段或后端更新。Impeccable沿既有Operate样式，创建1/退役1、零依赖缓存，未运行构建/检查/测试、浏览器/HTTP/SQL/provider或运行/生产操作，用户刷新手验。GG-323云组字段仍待独立授权Web激活；实际GG-322 Web0b5744d/唯一Worker419b097及原Vite/数据/SMTP保持。

- 最新分组源码：[GG-323](tasks/GG-323-canvas-groups.md)从0b5744d隔离并保留另窗ba73fea，2d51561精确接入当前GG-116/5173为2fa0486。Shift框选工具栏建组/Ctrl-Cmd-G、拖标题整体移动、双击或Enter/F2改名及emoji选择移除，解散/删除框保留成员，复制/裁剪/封面与本机恢复及每页历史适配完成。ADR0135/云group-parentId校验源码已补，无SQL或Worker更新；新云字段待用户另行委托Web激活。创建1/退役1，辅助工作区已归档，零依赖/缓存；未编译、检查、测试运行或浏览器验收，没有服务/provider/数据/生产操作。用户刷新手验；现有GG-322 Web0b5744d/唯一Worker419b097及原Vite/数据/SMTP保持。

- 当前修复/运行：[GG-322](tasks/GG-322-image-slot-sync-compatibility.md)子9920bde→0ce2360接入GG-116；同步失败显示实际平台错误及本机已保存/尚未云同步，不再猜测服务版本。截图由旧Web419b097缺imageSlots校验触发，远端保存失败不会阻断单槽提交。用户授权必要构建及仅Web重启，Web25664/32131、5173代理verified0b5744d，Web readiness五项ok，GG-321云字段已生效；唯一Worker28236/32142仍419b097，Vite33312/5173及原数据0063/cloud-development/local-mailpit保持，无迁移/真实请求/检查或测试。创建1/退役1，辅助目录干净正常移除；用户刷新手验。运行receipt绑定0b5744d，下次启动先构建当前HEAD，不启动旧GG-226 Worker；下方待激活是历史阶段。

- 最新图片插槽：[GG-321](tasks/GG-321-image-result-slots.md)基线ca54019/登记aa4967f，子`/root/image_result_slots`隔离4398d08精确接入当前4489d1d。总数先固定槽/本机flush后逐张并发count1，逐槽合并状态，失败中央重试只一个位置且成功图/输出ID/展开状态保持；未知提交复用key，旧count4失败单槽新submit count1，Seedream原生层保持。15文件，imageSlots云冻结规范输入/任务引用受权及恢复完成，旧Web拒绝时明确仅本机保存。创建1/退役1、子结束/辅助零依赖缓存正常移除，无构建/检查/测试运行、浏览器、SQL/provider或运行操作；用户刷新手验。新云字段须以后更新Web，无迁移/Worker更新，当前GG-319 Web/唯一Worker419b097和原Vite/数据/SMTP保持。

- 最新邮件核对：[GG-320](tasks/GG-320-local-email-delivery-audit.md)只读确认当前local-mailpit；11:18验证码请求202、邮件已进入http://127.0.0.1:58045/，真实QQ邮箱不会收到。没有重发/读取正文或切换SMTP，GG-319运行不变。

- 最新本地运行：[GG-319](tasks/GG-319-local-restart-after-reboot.md)：GG-319电脑重启恢复完成：Docker原E盘数据目录恢复，原依赖healthy；构建419b097，Web28248/32131、唯一Worker28236/32142和Vite33312/5173可用，API代理verified、readiness均ok。GG-318已启用，无迁移/数据重置/测试/真实请求或部署，用户继续手验。

- 最新失败诊断：[GG-318](tasks/GG-318-generation-failure-diagnostics.md)基于ea71443，登记4a2017f→9121d32、隔离4443b25→当前a627d7f。HTTP/网络/JSON/协议/上游失败/超时和输出错误元信息脱敏，Worker关联阶段/尝试/路由，随既有最终失败/备用切换事务保存；站长总日志任务详情最多50条再次脱敏读取，普通用户错误/积分/请求策略保持。创建1/退役1，辅助工作区干净退役；仅写代码/回归来源和文档，未编译、检查、测试/浏览器或运行/生产操作，无迁移/真实请求。当前Web287c4ca/0063、原Vite/唯一Worker70e10c6保持；须用户另行委托同步更新Web和唯一Worker才开始捕获新失败，旧HTTP详情无法回填，不自动重试。

- 最新排查：[GG-317](tasks/GG-317-canvas-three-prompt-audit.md)只读核对当前分组/提交及127.0.0.1:54449/goodgood真实记录，22:34批次确有3条有序任务，摸头/坐着成功1张、半蹲CAPACITY_BUSY失败0张/无上游任务ID；失败账本reserve -20/release +20净0。不是两组上限；原始HTTP状态未留存，不断言具体限流状态。创建0/退役0，无代码改动、自动重试、provider请求、测试/编译、迁移或重启，临时审计脚本清理。GG-316/315及前序源码、GG-309 Web287c4ca/0063、原Vite/唯一Worker保持；用户可选中生成器仅重试失败第2段。

- 最新查看图标修正：[GG-316](tasks/GG-316-canvas-view-icon-consistency.md)登记5b05e92→fd69d74，隔离04aa7e0精确接入GG-116/5173为3a823d8；共用查看按钮逆向补偿zoom，24px/14px/7px圆角/5px边距按屏幕固定，共享expand白底#fff，原hover/focus/触屏和大图详情保持。创建1/退役1，无依赖/辅助缓存，未编译、检查、HTTP/浏览器或真实请求，无后端/运行变化；用户刷新手验。GG-315文字误报修正、GG-312的300%高清门槛及前序源码保持，Web287c4ca/0063和原Vite/唯一Worker沿GG-309证据。

- 最新模板修复：[GG-315](tasks/GG-315-text-template-media-error.md)登记42d1c62，隔离c42ef94精确接入GG-116/5173为5be1e21；AssetMedia原仅排除audio，导致text没有媒体URL时误报图片失败，改为明确image/video才显示媒体错误/重试。正常1:1文字缩略/全文及真实文本错误、图片/视频回退保持，无API/存储变化。创建1/退役1，零依赖/辅助缓存，未编译或验证、HTTP/浏览器、运行或生产操作；用户刷新既有资产手验，无需重存模板或更新Web。GG-314/313/312/311及GG-309 Web287c4ca/0063、原Vite/唯一Worker保持。

- 最新图片入口：[GG-314](tasks/GG-314-canvas-image-view-button.md)登记b423afd→349070a，隔离3294d11精确接入GG-116/5173为0a66ee3；三类图片节点复用资产24px/14px hover查看按钮和现有canvas ImageViewer。上传/资产图用私有content/本地源；生成批次按job顺序和实际input展示，展开逐张入口/收起最前图，未就绪/裁剪中禁用，按钮事件独立，关闭/Escape回按钮，叠图绝对定位保持。创建1/退役1，无依赖/辅助缓存，未编译、检查、HTTP/浏览器或真实请求，无后端/运行变化；用户刷新手验，无需重启Web。并行GG-313命名及GG-312的300%门槛保持，Web287c4ca/0063和原Vite/唯一Worker沿GG-309运行证据。

- 最新命名参考：[GG-313](tasks/GG-313-prompt-template-name-guidance.md)登记a04caf9，隔离215422f精确接入GG-116/5173为024e139；ADR0133先补命名决定，共享保存弹窗名称初始空白，placeholder显示「用途_主题_风格，例如：商品主图_护肤品_极简白底」。仅参考不强制三段，示例不是字段值，原空名禁用/冻结全文/重试保存及成功动效保持。创建1/退役1，零依赖/辅助缓存，未编译或验证、运行/数据或生产变化；用户刷新重开手验，GG-312/311及GG-309 Web287c4ca/0063、原Vite/唯一Worker保持。

- 最新预览门槛：[GG-312](tasks/GG-312-canvas-preview-zoom-threshold.md)登记19aad19→2992b99，隔离0921ca9精确接入GG-116/5173为aeff94d；ADR0132先补用户300%门槛，统一实际zoom>=3才允许最高2048，向上稳定180ms、缩回立即512，节点尺寸/像素密度不提前加载。保留视野/隐藏叠图/身份缓存/加载失败小图层，移除无用途的尺寸观察。创建1/退役1，未编译、检查、HTTP/浏览器或真实请求，无后端/运行/生产变化，无需重启后端；用户刷新手验299%/300%边界。并行GG-310/311及GG-309已启用Web287c4ca/0063、原Vite/唯一Worker保持。

- 最新交互源码：[GG-311](tasks/GG-311-prompt-template-save-and-asset-filter.md)登记07d867d，隔离232ce8e精确接入GG-116/5173为6e089c3；共享弹窗「保存提示词模板」/名称/保存，无预览，GG-310前景色保持。受权成功事件携带新增ID，资产入口短暂灰阶接收动效/提示，减少动态效果静态；面板右上×改全部/图片/视频/音频/提示词模板筛选，联合原文件夹身份、空结果恢复和焦点返回，列表1:1文字缩略保持。创建1/退役1，零依赖/辅助缓存，未编译或验证、API/迁移/运行及生产操作；用户刷新手验，本地Web287c4ca/0063与原Vite/唯一Worker沿GG-309证据保持。

- 最新弹窗修复源码：[GG-310](tasks/GG-310-text-template-dialog-copy-color.md)登记a19be42，隔离45bbba9精确接入GG-116/5173为c3ba0d2，保留GG-309 f5b0b59；设置模板重复说明仅供无障碍读取，操作区显式取消ink/保存action-fg，覆盖两类文本节点及保存中文字。创建1/退役1，无依赖/辅助缓存，未编译或验证、运行/数据或生产变化，用户刷新并重开弹窗手验；已启用Web/本地0063的事实沿下条GG-309记录。

- 当前本地运行：[GG-309](tasks/GG-309-canvas-preview-activation.md)按用户重启请求，已构建并启用verified 287c4ca、本地Web40244/必要0063；动态最高2048预览、GG-303云端批量校验及GG-308文本API生效，用户手验。仅修复实际构建阻塞的重复zoom声明，Vite27464/唯一Worker31280、cloud-development/local-mailpit及数据保持；创建2/退役2，无测试、浏览器、真实provider请求或生产操作。两版本端点均verified，匿名两类canvas-preview均401。运行receipt仍绑定287c4ca，下次重启先构建当前HEAD；下方原任务待启用为历史交付状态，构建指纹见GG-309。

- 最新文本资产源码：[GG-308](tasks/GG-308-canvas-text-template-assets.md)基于e7e1f6f，登记61895c5、隔离e95c52c→GG-116/5173源码4317bdb。单击两类文本节点显示设置模板快捷栏、双击/键盘编辑才显示格式栏；冻结当前完整内容/UUID保存私有text资产，两处资产列表1:1裁切文字缩略/全文查看、资产页Markdown下载和原整理删除、画布重命名及拖入独立文本节点完成。创建1/退役1，必要回归来源只写未运行，无依赖/构建缓存、编译/验证或运行/生产操作。新的text-assets API和0063迁移须后续明确委托更新Web/应用本地迁移，旧Web的媒体列表可读且模板保存明确失败；可连同GG-303云端批量校验/GG-306高清接口一起启用，不增加Worker或provider请求。当前GG-300 Web b3844d2/本地0062/唯一Worker沿原运行证据保持，本轮未探测或激活。

- 最新显示源码：[GG-306](tasks/GG-306-canvas-adaptive-preview.md)从5a4fb15隔离3e75204精确接入GG-116/5173为f004e5f，保留并行GG-307 ebd8ace。资产拖入默认512，上传/生成结果共用视野/显示需求的按需2K组件，最长边2048，保留小图层，3并发/8闲置URL身份缓存，原实际尺寸不改为预览尺寸。新canvas-preview私有固定2K接口无SQL/存储写入；当前Web b3844d2未启用该接口，失败保留512，远程高清须后续用户委托构建/更新Web，可与GG-303云端批量校验一并启用。创建1/退役1，无编译/检查、浏览器或真实请求/运行变化，用户手验，原Worker/本地0062/配置数据及生产保持。

- 最新详情修正：[GG-307](tasks/GG-307-hide-banana-thinking-details.md)基于09dbe13，登记e3fdb6d、隔离0e6d4f2→GG-116/5173所用源码ebd8ace；Banana 2大图思考条目始终隐藏，包括high记录，生成快照/请求与其他GG-305规则保持。ADR0123先补覆盖要求，既有回归断言只改未运行；创建1/退役1，无依赖/构建缓存、编译/验证或后端/运行变化，用户刷新手验。GG-306独立工作区未动；GG-303待更新Web及GG-300原运行保持。

- 最新详情修复：[GG-305](tasks/GG-305-canvas-viewer-used-parameters.md)基于1387b4c，登记ea78337、隔离167e864→GG-116/5173所用源码5a4fb15；大图只显示该job.input对应模型支持且使用的参数，Banana/Seedream隐藏GPT默认项，关闭搜索/低思考占位/空参考图隐藏，GPT实际记录值及型号质量范围保留。用户确认暂不处理预设。创建1/退役1，无依赖/构建缓存、编译/验证、生成请求或后端/运行变化；回归来源只写未执行，用户刷新手验。无需后端启用；GG-303云端批量校验待更新Web及GG-300 b3844d2/本地0062/唯一Worker状态保持。

- 最新拖线样式：[GG-304](tasks/GG-304-canvas-connection-drag-flow.md)基于31be3bd，登记a91b200、隔离30790ea→GG-116/5173源码0ad78b0；拖线预览与hover共用亮蓝/7 4/1.3s流动，reduce亮色静止实线，原连接几何/完成线条/剪刀与保存保持。创建1/退役1，无依赖/构建缓存、编译/验证/运行或后端变化；用户刷新手验，当前GG-300运行及GG-303云端批量校验待更新Web状态保持。

- 最新批量源码：[GG-303](tasks/GG-303-canvas-prompt-batches.md)基于03e1b43，隔离88ddc4f精确接入GG-116/5173为b4a5d6e，保留93d731a清晰度排查。中英文独占分隔行/原生分割线、并发单段任务、图片/积分乘积、顺序结果/单段重试及jobIds保存恢复完成。创建1/退役1，回归来源只写未执行，无编译/验证、依赖缓存、迁移、构建、重启或生产变化。当前GG-300 Webb3844d2/本地0062/原唯一Worker保持；旧Web不接受jobIds，云端批量保存待用户更新Web后启用，不自动处理。用户手验并发、数量/报价、状态/裁剪及恢复，原有单段接口门禁保留且不新增批量上限。

- 最新排查：[GG-302](tasks/GG-302-canvas-image-quality-audit.md)确认画布生成器/结果节点显示output.previewUrl→私有preview端点，最长边512px、WebP quality80，放大不切原图。生成存储保留上游bytes，2K请求与解码实际尺寸分别保存。仅排查/文档，无编译/检查、用户图片读取或运行改动；后续画布清晰度修复范围应保留资产/附件预览策略，当前GG-301源码及GG-300运行保持。

- 最新编辑快捷源码：[GG-301](tasks/GG-301-text-divider.md)从b3844d2隔离6b56d36，在GG-300后继d174d54后精确接入GG-116/5173为9217c10：有序列表旁分割线原生命令入口、1px细灰hr、撤销分组位置保持。创建1/退役1，无依赖/构建缓存，未编译/验证、后端/迁移/服务或生产变化；用户刷新双击编辑后手验。GG-300的verified b3844d2/本地0062/Web33840及唯一Worker保持，本任务未构建或运行探测。

- 最新本地启用：[GG-300](tasks/GG-300-preset-activation.md)按用户委托构建b3844d25a7a4328d71bf79e9196ecdbbc18a504e，应用仅本地0062并将Web33072替换为33840；GG-297预设/保存校验及GG-296中断10规则已启用，预设仍一次20积分无额外费。32131/5173版本均verified，匿名preset-stream合法Origin返回401；GG-299图片hover及GG-298取消在同一构建。创建1/退役1，无测试/全面检查/浏览器或真实生成，原Vite27464/Worker31280及配置数据保持；用户刷新手验。文档后继不改变receipt，重启前仍按新HEAD构建。

- 最新源码：[GG-299](tasks/GG-299-text-image-preview.md)d8b40d7已接入GG-116/5173，文本生成图片hover改为放大图，直接复用图片生成referencePreview样式，保留取消按钮。创建1/退役1，无编译/检查，用户手验。用户随后委托启用GG-297预设，明确无额外积分收费，待本地启用任务。

- 最新源码：[GG-298](tasks/GG-298-text-input-remove.md)从e8b26df隔离884ffdd精确接入GG-116/5173；文本生成chat图片/文本/视频缩略可取消，沿图片生成右上角圆形X，复用removeLinkedReference取消对应连线及撤销/图保存，保留源节点/资产。生成及恢复请求时锁定；创建1/退役1，无编译/检查/后端/服务变化。用户刷新手验取消、撤销及保存恢复；GG-296/297后端待启用状态保持。

- 预设源码：[GG-297](tasks/GG-297-text-generation-presets.md)从7230935隔离448c1ed精确接入GG-116/5173；模型旁结构化反推、可移除Badge、额外提示词可空，后台隐藏指令及复制/保存恢复。原开发创建1/退役1，未自动编译/检查；后继GG-300已按用户委托构建/本地0062/Web启用，20积分无额外费，用户手验。

- 中断源码：[GG-296](tasks/GG-296-text-cancel-half-credit.md)从9a122fd隔离c16e3bd精确接入GG-116；中断扣10退10/成功20/系统失败0，退款来源/额度和净额统计一致，停止无左下角解释。原开发创建1/退役1，未自动编译/检查；后继GG-300构建/本地0062/Web已一并启用，历史取消不追扣。该0062独立于GG-292撤回，唯一Worker及生产保持。

- 最新修复：[GG-295](tasks/GG-295-text-generation-tooltip.md)从d7147c5隔离2cd651c精确接入GG-116/5173；文本生成节点根部补TooltipProvider，修复选中带连接输入节点时报错，180ms延迟沿用已有预览。创建1/退役1，无编译/检查/服务或数据库变化；用户刷新后点击已有节点复验，无需重新生成。当前Web仍verified 767e6db，本地0061与唯一Worker保持。

- 当前交付：[GG-294](tasks/GG-294-text-generation-test.md)基于a15f636，隔离79db1ed→实际GG-116 767e6db，菜单为文本编辑→文本生成→图片生成。用户明确委托构建，checkpoint构建成功，本地0061已应用，32131 Web/5173代理均verified 767e6db；仅Web4552→33072，原Worker31280/32142、Vite27464/5173和云配置/数据保持。创建1/退役1，无依赖安装/子缓存、测试/浏览器验收或真实生成，未部署。构建完整指纹及本地迁移边界见任务卡。

- 当前文本源码：[GG-291](tasks/GG-291-canvas-text-generation.md)三类名称/双击编辑、五模型/Claude默认/high/唯一混合端口、流式/停止/Markdown结果与保存恢复、固定20积分交易已随GG-294构建及本地0061/Web启用；视频以最多6帧处理，不含音轨。原源码交付当轮创建1/退役1/零缓存，后继激活另记GG-294，实际生成/视觉效果待用户手验。

- 当前撤回源码：[GG-293](tasks/GG-293-revert-prompt-limits.md)登记`ea7915e`、隔离`70302b3`→实际GG-116/5173源码`fdd13ae`。用户取消GG-292，恢复此前实现/原有4,000组合与16,000文本规则，新模型策略/计数/预览排序与未执行0062源码已移除；ADR0128已Withdrawn。创建1/退役1，零依赖/构建缓存，未编译/验证或服务变更，Web/Worker/0060保持，未部署。当前不激活GG-292，用户刷新手验。

- GG-291已在GG-293恢复后的fdd13ae上精确接入；0061归其独立文本任务，辅助目录已退役。GG-293未触碰其未提交内容。此前要求保留GG-292共享策略/32,000容量/预览排序的指引已撤销；不要通过旧cherry-pick重新引入已取消方案或应用已移除0062。前序文本编号/选择/粘贴/裁剪保持。

- 最新裁剪尺寸：[GG-288](tasks/GG-288-canvas-crop-preset-pixels.md) `bd04081`→`4017ceb`已接入当前GG-116/5173源码，带具体尺寸的预设按像素设置居中选区，超出原图等比缩小，通用比例保持最大区域。创建1/退役1，无依赖/服务变化，未编译/验证；用户刷新重开裁剪手验W/H、遮罩及导出。此前GG-286/287、原Web/Worker/0060保持，未部署。

- 最新裁剪细化：[GG-286](tasks/GG-286-canvas-crop-action-color.md) `7a7933d`→`dcfa3ce`已接入当前GG-116/5173源码，默认自由裁剪、通用移除自由/原始比例并补3:4、完成及处理中使用action-fg浅色文字。创建1/退役1，无依赖/服务变化，未编译/验证；用户刷新并关闭旧裁剪会话后重开手验。并行GG-285/287、原Web/Worker/0060保持，未部署。

- 最新读取修复：[GG-284](tasks/GG-284-canvas-crop-image-fetch.md) `592c3e6`→`07e1ba3`，修复生成图片裁剪的Failed to fetch；受权原图直链读取、请求取消和中文连接错误完成。隔离RustFS桶CORS备份见任务卡，仅补5173；源码与两个忽略local-checkpoint-portfix启动器均让Worker保留5173。7/7针对性回归及GET预检200，无局部编译/服务重启，创建1/退役1；真实浏览器连接器不可用，用户刷新复验。并行GG-283参考复用的服务器待构建状态保留，Web80b8c0f/原Worker/0060/生产不变。

- 最新裁剪：[GG-280](tasks/GG-280-canvas-image-crop.md)，子`7c35dac/7af5bce`精确接入5173为`34f10b0/80a7e5e`；元信息上方快捷栏/展开批次定位、图上选区与W/H/比例锁/分组预设、真实PNG File及原上传/本机恢复/快照接线完成。五组国内/电商预设、无LinkedIn；创建2/退役2，零缓存/新服务，未运行任何编译或检查。当前源码与并行GG-279/281/282保持，原Web80b8c0f/唯一Worker/0060不变；下一步用户刷新画布手动验收，未部署。

- 最新文本布局：[GG-275](tasks/GG-275-text-editor-layout.md)，从`3bbf42e`隔离至`fix/GG-275-text-editor-layout`；外置元信息、完整书写区、右下双斜线柄，精简三项工具栏/内置页脚，正文固定14px，真实尺寸保存已修正。读取GG-276约定前已完成45/45相关检查、局部lint/实际编译，此后不自动检查；子agent只读，创建0/退役0，无后端/依赖/数据/服务变化。并行GG-276`3920306`/`f9965da`及用户手验约定保持。

- 最新恢复：[GG-274](tasks/GG-274-local-restart-after-reboot.md)，2026-10-02电脑重启后恢复原依赖、5173、Web和唯一Worker；Web严格核验要求必要构建至`80b8c0f`，原GG-273源码指纹不变。Windows动态保留范围覆盖56549，经管理员临时停止WinNAT恢复原Valkey端口并恢复WinNAT Running；原卷/0060/云配置保持，无迁移或生成。

- 最新画布修正：[GG-273](tasks/GG-273-canvas-editor-inputs.md) `e7ae650/f51b6ba/b9ce4bf`：文档编辑器/H1-H3/一致圆点，生成器唯一接收端兼容图片文本和旧边；统一文件附件卡复用既有视频附件。30项相关检查、类型/lint/模块与必要构建通过；创建1/退役1，无新依赖/缓存。当前Web verified `b9ce4bf`，0060/云配置/唯一Worker保持，未部署，用户验收。

- 最新账户/品牌：[GG-272](tasks/GG-272-account-created-and-brand-row.md) `c4b10b8`：个人信息新增真实只读创建时间（北京时间），桌面字标下移与项目标题同水平线、保留GG-271左侧对齐。22/22、局部lint/三个模块编译与必要Web构建通过，创建1/退役1、无子缓存；Web/5173为verified `c4b10b8`，0060/原云配置/唯一Worker保持，用户验收，未部署。

- 日期：2026-10-02。
- 最新画布：[GG-268](tasks/GG-268-markdown-text-node.md)文本编辑器与提示词输入、[GG-270](tasks/GG-270-canvas-asset-context-menu.md)文件夹创建及右键管理已进入5173；52/52、类型/局部lint、六个Vite模块和必要构建通过。两个隔离目录均退役，根锁解析缓存48675253字节已清理。本次Web为`b1b3d1c` verified/readiness200，0060/原cloud配置/唯一Worker保持。后继GG-272及当前Web身份见其任务卡。
- 品牌历史：[GG-269](tasks/GG-269-wordmark-only.md) `f51777b`→`c30ccb3`，大厅桌面/移动仅展示108px Good Good字标，移除独立G及占位；源码/diff与5173页面/CSS编译通过，创建1/退役1，无缓存/服务变更；后续对齐见GG-271/272。
- 最新比例：[GG-267](tasks/GG-267-compact-lobby-wordmark.md) `0dfd499`，字标收小至108px/约14px、间距8px，侧栏Logo按内容宽度展示、移动组合142px；只改三个CSS样式和两处尺寸，源码/diff与5173页面/CSS编译通过，创建0/退役0、无缓存/服务变更。
- 最新字标：[GG-266](tasks/GG-266-geometric-good-good-wordmark.md) `b7f27e8`→`4756c7b`，大厅桌面/移动品牌图标右侧使用Good Good本地矢量字标，G沿用图标几何、o/d匹配笔画。SVG/局部lint（零错误、11既有警告）/页面与CSS编译及字标HTTP200通过；创建1/退役1，无依赖/构建缓存，约11.7MiB辅助目录及临时PNG已清理。ADR0116/DESIGN_SYSTEM已同步，无Web重建或数据库变化。
- 最新移动修复：[GG-265](tasks/GG-265-canvas-folder-move-membership.md) 子`fb7cc90`→根`b1f364c`，画布根层仅未归档/失效归属素材，移动确认后原位置消失、目标保留同一素材，失败/重读规则保持。子与根12/12、局部lint/两模块编译通过，创建1/退役1、零缓存；无API/数据库/服务变更。
- 最新积分交付：GG-260 UI `e1d7f61`、GG-261来源 `d9e5aff` 与根接线/分页修复 `9f9d788` 已进入5173及verified Web，当前余额/类型/项目/模型/任务ID复制、20条前后分页、空心图标和普通选中字重完成。67项相关检查、必要构建/0060与创建2/退役2完成；免费政策待用户，尚未实现或启用。
- 最新账户交付：[GG-262](tasks/GG-262-profile-inline-edit-layout.md) `3338fa9`→`2f0d8fd` 透明下划线编辑、固定网格/动作位置、无可见滚动条和14px图标已进入5173，保留明确确认/外部取消与规则预留。12/12、局部lint及两模块编译通过，创建1/退役1、无缓存；GG-259随机六位ID保持，无数据库/服务变动。
- 当前详情后继：[GG-264](tasks/GG-264-image-detail-fill-and-centered-rail.md) 澄清修正`c48e68e`→`5409cce`已进入5173：默认完整适配，放大可填满整个中间区，保留无计数和当前缩略图含首尾动态居中。本轮16/16、相关lint/两个模块编译通过，累计创建2/退役2、无缓存；无Web/数据库变更。
- 最新画布交付：GG-253 `896bce2` 图片自由预览与真实信息、GG-255 `d4ea42c` 原生图片粘贴、GG-256 `5183287` 文件夹拖入及动效、GG-257 `6f63a8f` 默认实线/hover 流动均进入 5173；定向 25/25、19/19、8/8 及相关 lint/模块编译完成。三个子 worktree 创建 3/退役 3，无依赖/构建缓存残留，浏览器验收交用户。
- 最新追加：[GG-254](tasks/GG-254-account-identity-editor.md) `422c32f` 单一用户名默认 mimi、六位 ID 和局部确认/外部取消已进入 5173 与 verified Web；20 项相关检查、资料 SQL 1/1、ID SQL 10/10、局部 lint 通过，本地迁移到 0058，辅助目录退役。并行 GG-253 `896bce2` 与 GG-255 `41df2dc` 保留，文档后继不改变实际 Web 构建身份。
- 当前追加：[GG-250](tasks/GG-250-inline-personal-information.md) `99fb14a` 已在个人信息内直接编辑头像、昵称/用户名并保存/取消，13 项功能、局部 lint 和最终文档 9/9；辅助目录退役，GG-249 后继 `8ee22d8` 保留。
- 当前代码：GG-239累计及GG-242—282已集成源码；实际GG-116当前HEAD为下一任务基线，最新裁剪`34f10b0/80a7e5e`与并行任务保留，各历史验证证据保留，免费quota未实现。
- 当前交接检查点分支：`fix/GG-275-text-editor-layout`，实际目录GG-116；当前HEAD是下一任务基线，当前verified Web为GG-309 `287c4ca`。文档后继不改变运行receipt，下一次重启前需构建当前HEAD，不伪造构建身份。
- 当前 worktree：`F:/goodgood-worktrees/GG-116`。目录名是历史名称，不能再用来判断版本。
- 状态：当前画布请求已开发并精确集成；2026-10-02用户要求后不自动执行编译或检查，最新任务明确未验证，由用户手验。子目录经clean/路径/进程条件后以Git remove/prune退役，未部署生产。

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

当前分支也须包含 GG-245 `7ddb78d`、GG-248 `520b452`、GG-254 `422c32f` 和 GG-260/261 `9f9d788`。构建receipt严格绑定Git提交；HEAD与receipt不同时，Web重启前先按 `npm run build:checkpoint` 构建并核对，不伪造revision。现有Web为已验证287c4ca，指纹见GG-309；文档后继不需要立即重启服务。

## 当前本地运行

| 组件 | 入口 | 当前来源/用途 |
| --- | --- | --- |
| Vite 页面 | `http://127.0.0.1:5173` | GG-116当前分支含GG-242—276已交付范围，热更新 |
| Node Web | `http://127.0.0.1:32131` | GG-116 verified419b097；见GG-319 |
| Worker | `http://127.0.0.1:32142/health/ready` | GG-116 verified419b097唯一真实Worker，GG-318已启用；旧GG-226不再启动 |
| PostgreSQL | `127.0.0.1:54449/goodgood` | 原隔离数据/本地0063保持，GG-319无迁移 |
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

本机 Valkey 为 56549。GG-116 的两个忽略启动器用于 Web `dist/local-checkpoint-portfix.mjs start workspace` 和 Vite `dist/local-live-dev-portfix.mjs --port 5173`；GG-319后唯一Worker也使用GG-116的 `dist/local-checkpoint-portfix.mjs start worker`，旧GG-226不再启动。先核对构建和任务/队列，再启动所需角色，不重复启动 Worker，不用仍断言 56449 的旧入口。日志固定复用 `%TEMP%/goodgood-local-services/current-{web,worker,vite}.{out,err}.log`。

checkpoint 构建会清空 dist 中忽略的启动器。构建后从 scripts 对应原脚本仅适配 `./local-*` 导入到 `../scripts/local-*`、允许旧本机`56449/0`配置并将有效REDIS_URL统一为现有`56549/0`（不能只替换断言），每种入口只保留一个副本；不能把适配器或环境文件纳入提交。

**当前本机有已保存的云参考图，Web 启动不可遗漏云配置。**在 GG-116 目录启动所需 Web；若Worker停止，核对GG-116当前构建/队列后在同一目录启动唯一Worker，两个角色使用原仓库外配置：

~~~powershell
$taskCloudEnvironment = Join-Path $env:LOCALAPPDATA 'GoodGood/local-cloud-upload/cloud-upload.env'
$taskVideoPricing = Join-Path $env:LOCALAPPDATA 'GoodGood/local-video-generation/video-pricing.env'
node --env-file="$taskVideoPricing" dist/local-checkpoint-portfix.mjs start workspace --cloud-env-file "$taskCloudEnvironment"
~~~

GG-385后Web和唯一Worker都须保留Node `--env-file`外部视频价格参数；Worker入口仅将上例workspace换为worker。外部文件只配置五档临时积分，不能扩充仅允许六项的cloud-upload.env。启动器及环境/价格文件保持忽略或仓库外。

核对角色 banner 的 `referenceStorage=cloud-development`；readiness 200 只覆盖基础依赖，仍须只读核对现有云参考图预览。缺少配置时保留数据并恢复原文件，禁止重传、改对象键或回退假图片。

并行任务必须按 [WORKFLOW](WORKFLOW.md) 先登记再创建。子 worktree 默认不重复安装依赖或执行完整构建；根 agent 完成集成验证后，退役所有已整合的干净目录，并逐项记录不能删除的 dirty worktree。禁止以文件系统强删代替 `git worktree remove`。

本地开发凭据只从仓库外文件读取，禁止写入仓库或聊天。生产数据库、R2、队列、密钥和用户数据不得进入本地。不要运行旧转换脚本重置现有数据。

## 生产边界

生产仍是 [CURRENT_STATE](CURRENT_STATE.md) 记录的 GG-098 应用和 GG-100 单槽 `goodgood-production` Compose。GG-239 之后的任务是本地代码/流程检查点，没有 CI 不可变镜像、生产预检或部署授权。未来发布只能按 ADR 0091 的单槽策略原地替换，不恢复历史 blue/green、双 Compose 项目或 Nginx upstream 切换。

## 下一步

用户刷新5173手动测试文本生成、可编辑结果/停止/保存与每次20积分；构建及本地0061/Web已启用，实际提供商响应/视觉效果尚未验收。后续仍默认仅开发代码，不自动编译/代码检查；GG-294辅助目录已退役。免费政策待用户明确后再开发quota/升级Web与Worker，新需求以当前HEAD核对祖先，生产另获授权。

