# 当前任务与优先级

> [GG-399](tasks/GG-399-video-remove-add.md) 视频chat加号移除源码已实现，待记录提交，基线496591b，GG-116分支codex/gg-399-video-remove-add。删除加号/专属菜单及无入口控件，参数摘要置首、不留空槽；已有素材恢复/预览/删除和生成保持。纯UI，无自动构建/检查/测试/浏览器或HTTP/SQL/Provider/服务/生产操作，GG-391运行receipt保持。创建0/退役0，无子agent/依赖缓存，用户刷新5173手验。

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

> [GG-385](tasks/GG-385-local-kling-video-activation.md) 用户已授权代理选择临时价格并启用本地更新供画布UI手验。Omni720p/1080p/4k每秒10/20/40积分，动作模仿720p/1080p每秒10/20积分，默认5秒50积分。核验本地66历史迁移匹配，仅0067/0068待应用；准备必要构建与Web/唯一Worker替换，保留Vite及数据。执行中，尚未宣称启用成功；不运行自动代码检查/测试/浏览器验收或生成/扣费/生产操作。

> [GG-386](tasks/GG-386-video-chat-consistency.md) GG-386视频chat源码已精确接入a63f5dabd5213c24a9756fb30b123f4dea7445f9（隔离c09431148406ee19033fd0c88c3a4e820300c91e，基线298d8ec/9a34a1a）。以图片chat实际实现为准：660px视口受限宽度/12px节点间距，空托盘隐藏、工具行添加素材，54px Attachment/编号/移除/180ms预览；左侧参数与类型、右侧同款模型Select和CreditIcon积分生成按钮。参数采用同款Portal/胶囊/比例卡，保留紧凑时长及手动分镜滚动；长输入八行滚动/展开收起、菜单互斥/输入关闭，空描述不显示冗余校验，真实错误保留。图片chat及视频六类型/素材用途/计价/持久任务与后台保持。用户刷新5173手验；未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider/生成/扣费/迁移/重启或生产操作，运行仍GG-385/5fd584d。创建1/退役1，辅助已提交并归档；无子agent/依赖或构建缓存。

> [GG-384](tasks/GG-384-canvas-kling-video-generation.md) 已实现按用户O1Key附件的画布Kling视频节点/一致chat、六种生成用途、私有素材与输出、持久Worker任务/刷新恢复/独立重试及模型分辨率时长报价。ADR0143，增量0068待应用，用户尚未提供五档每秒积分，未定价闭锁。十四项合成来源仅写未运行，沿GG-276无自动构建/代码检查/测试/浏览器验收/运行或生产操作；已精确接入6181bdf306cc85a2c59313e41b34d4d760fbf941并归档辅助（创建1/退役1），待用户另行委托启用。GG-383/380/379与GG-374receipt保持。


> [GG-383](tasks/GG-383-reference-upload-reuse.md) GG-383参考图上传复用源码已接入a4caee5fd08c5e285044961de3b766cec220e31f（隔离9a0b5eef3533e4eeeec16402ae4284c05d0035c6，基线1f848b2，接入前e17ce66）。同owner/workspace完整字节SHA-256识别原图，同操作重试/同内容并发复用未过期pending或已校验ready记录；完成时核对实际文件哈希，第二次完成按同内容恢复。不同内容/身份/工作空间及显式编辑副本独立，副本自身重试复用，本机待上传副本标记可恢复；直接参考托盘相同ready ID保留首项，主动多画布节点/相册/冻结任务保持。新增0067仅写未应用，旧请求/旧后台上传路径兼容；后台更新前不宣称复用规则已运行。沿GG-276未编译/lint/typecheck/代码或diff检查/测试/浏览器验收，8项纯回归及1项具名隔离SQL回归仅写来源；无HTTP/SQL/Provider/生成/扣费、数据扫描合并/恢复写入、后台/服务或生产操作。GG-379空图保护和恢复画布保持，GG-374原66迁移及运行receipt未重查。编号避让GG-382视频设计，接入时保留其并行文档修正，b993e3c已由另一窗口记录来源。创建1/退役1，managed辅助归档已确认，无子agent/依赖缓存。源码交付、未自动验收/未后台启用/未部署；下一步用户另行委托0067与必要Web更新后手验，保留视频设计待反馈事项。

> [GG-382](tasks/GG-382-canvas-video-generator-design.md) GG-382官方对照完成：官方新版与附件核心结构/主要参数和大小/时长一致；补齐参考图组合数量、Omni视频像素/比例/帧率及分镜限制。O1Key另有/kling路由前缀、模型路径查询、状态/结果封装及cost，按附件契约适配，未实测。模型展示建议明确Omni/动作模仿身份，设计和价格仍待用户反馈。只读公开官网文档GET，无应用/Provider生成API、编译/检查/测试/浏览器、数据/服务或生产操作；源码仍5f5e7fb，GG-374运行receipt保持，创建0/退役0，无子agent/缓存副本。

> [GG-381](tasks/GG-381-canvas-reference-duplication-audit.md) GG-381完成用户要求的画布原始参考图重复创建源码路径分析；应用源码仍为GG-380 5f5e7fb8048db8f5b8b9537f6d37f078f70bc83f，本轮基线5e1d3054748f067475a0ce4f8fed9402f19390e2。资产重复拖入/节点复制/相册重复拖入会新增节点但复用assetId；文件夹内按kind+id去重，独立图片与相册可同时引用同图。重复本地文件/外部粘贴/直链上传可新增reference资产，未按文件内容复用；完整重试重新POST上传意向时后台仍随机新ID，clientId仅关联返回，存在原请求已成功但前端未确认后的重复风险。同一次PUT重试/complete状态轮询沿原ID；生成图转参考则有客户端按源assetId共享缓存及后台稳定ID/事务锁复用。送图按参考ID去重，不识别不同ID的相同文件。恢复/撤销替换节点，结果按runKey upsert；未见这些路径无故追加原始源图。建议优先同操作上传幂等，再做同授权范围内完整文件字节复用，保留主动多节点与编辑副本；仅建议，未改变产品决定或实现去重。只读源码分析/文档，无测试/编译/浏览器/HTTP/SQL/Provider、数据/服务或生产操作；当前真实画布是否已有重复资产未读取核验。创建0/退役0，无子agent/缓存。

> [GG-380](tasks/GG-380-batch-empty-port.md) GG-380动态素材组端点修复已精确接入5f5e7fb8048db8f5b8b9537f6d37f078f70bc83f（隔离8e492256c877ac3d5c547929dd7c2769e649000c，基线4546f5a）。逐张移除/整条参考边删除使候选桶清空时同步减少组数与端口，后续组前移，边ID/成员转换键保留，至少保留默认1组；新增未连接空组、仍有素材的组及加载/失败输入保持。chat改读实时native节点配置，组标题删除/模式切换共用端口重排。ADR0108及产品/交互/数据/错误/手验文档同步，8项合成回归来源只写未运行。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、数据恢复写入、服务或生产操作；GG-379空图保护与恢复副本保持，GG-374运行receipt不重写。复用中断前干净managed辅助，累计创建1/退役1，归档已确认，无子agent/依赖缓存。源码已交付、未自动验收/未部署；用户刷新恢复画布手验最后素材删除、后组前移、部分删除、新加空组及撤销/刷新。下一源码任务从当时HEAD核验5f5e7fb祖先后隔离。

> [GG-379](tasks/GG-379-canvas-data-loss.md) GG-379画布误保存保护已精确接入5941c82596840a18347bf98eda46aeef5a9aea20（隔离1f54025567e01785296db92028a6b008fe91130d）。用户丢失排查确认原画布48ad1462版本171于17:50:30变为0节点/0边；Vite17:50:27相册热更新及React Flow卸载reset与其一致，自动保存缺少临时空图保护。已备份原localhost5173 IndexedDB日志和服务器行，提取170干净快照（17:26:59，17节点/5逻辑边）；沿现有文档适配、校验与owner/workspace授权仓库创建独立恢复画布78d3d798-6bdb-45f5-b472-8995fdbf1955「开发画布（恢复副本）」版本1，只读落库/解码核对17节点/5边（云存储8条成员展开边），原171空记录保留，不改浏览器存储/原素材/原任务。同步器写本机前阻止同页非空变空，显式末节点删除或历史空帧给按页一次许可；新建空页/部分删除/删页保持，许可成功后消费/恢复时清理。无新产品决定/字段/迁移。回归来源覆盖六类场景，仅写未执行；沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，Computer Use两次内核退出、未发UI动作。只进行本次丢失诊断和独立恢复的本机数据操作；无provider/生成/扣费、服务或生产操作，GG-374运行身份不重写。创建1/退役1，managed辅助已确认归档，无子agent/依赖缓存，真实快照在仓库外TEMP/goodgood-canvas-recovery。源码已交付、恢复副本已落库，UI待用户手验、未部署；用户打开恢复副本继续工作并手验主动清空/撤销。下一源码任务从当时HEAD核验5941c82祖先后隔离。

> [GG-378](tasks/GG-378-album-resize-callbacks.md) GG-378相册伸缩回调修复已精确接入28431236bb8800a26fe5b7f26b8f5802908e103f（隔离440879109a385c491adfb746a88e4074a3085109）。用户手验发现GG-377选中相册即startResize未定义，源码确认开始/结束/键盘三项回调均遗漏声明；本次补齐稳定原生回调、历史捕获、manual标记和结束宽高/style同步保存，方向键仍复用既有相册几何10px/Shift50px。不改变ADR0135决定或外观、素材及候选边界，无新后台字段。GG-377任务补缺陷更正，错误和用户手验记录同步。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费、服务或生产操作，GG-374运行receipt保持未重查。创建1/退役1，managed辅助已确认归档，无子agent/依赖缓存。源码已补齐、未自动验收、未部署；用户刷新5173手验相册选中、四角持续伸缩、键盘及保存恢复。下一源码任务从当时HEAD核验2843123祖先后隔离。

> [GG-374](tasks/GG-374-local-restart-after-reboot.md) GG-374按用户要求完成本地重启：原PG54449/Valkey56549/对象存储58049/Mailpit及原卷均健康，三个应用角色原本已停。必要构建verified d183b918ea139c429630a7177905fd2c60cbee93，复用原外部cloud-development/local-mailpit配置，独立隐藏CIM启动Web29548/32131、唯一Worker28916/32142、Vite17388/5173（启动器33100/27976/13896，父WMI7984）。跨命令仍监听；首页/原画布HTTP200，前端API代理同revision/verified，Web与Worker readiness五项均ok。启动前活动图片/文本任务、未派发outbox、个人/工作区/成员预留及两队列均0；原66迁移保持。未迁移/重置/写fixture、发起或重放真实生成/扣费或操作生产；仅必要启动构建与运行核对，未lint/typecheck/代码或diff检查/测试/浏览器交互验收。GG-373及既有应用源码保持，创建0/退役0，无子agent或新依赖副本。用户刷新原画布继续使用，下次重启按届时HEAD构建；纯交付文档提交不改写此运行receipt。

> [GG-373](tasks/GG-373-asset-menu-spacing.md) GG-373资产右键菜单排版源码已精确接入0b5d1a8ac913eeafeca6a0b0400bcafd3a581d8c（隔离4330226a6f6918d6c8e1aae8ded1c2459057583a）。两级菜单统一12px常规字重/20px行高/36px行与8px图标文字间距，目录名显式继承；移动至目录列表按内容宽度、140–260px及视口上限夹取，移除固定260px留白，原滚动/长名省略/触控44px保持。仅改局部CSS、设计与手验记录，不改功能决定/文案/归档或API。已按用户指定Impeccable读取SKILL、polish及craft-floor，沿GG-276未运行引擎、构建/lint/typecheck/代码或diff检查/测试/浏览器验收或HTTP/SQL/Provider；纯样式无新测试。GG-372/371源码和GG-366运行receipt保持，无服务/后台/生产更新。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存；未自动验收/未部署，用户刷新5173手验菜单。

> [GG-372](tasks/GG-372-asset-move-menu.md) GG-372画布资产右键移动至源码已精确接入59a6dec0d4b87431759af85cf838bd17561ca291（隔离b9dc2eefe425d5acf8962ed8759b0e290b1ffafe）。素材右键有界子菜单列出现有文件夹，当前位置禁用、无目录提示；复用原确认后归档/刷新/失败重试及提交门控，保持名称/标签/真实素材。生成/上传图、视频、音频与提示词模板均支持，拖放类型同步；已拖入相册快照保持。ADR0120与产品/交互/设计/错误/手验文档同步，既有gg256回归仅更新来源未运行。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费/运行或生产更新；GG-371源码及GG-366运行receipt保持未重查。创建1/退役1，managed辅助确认归档，无子agent/新依赖缓存；未验收/未部署，用户刷新5173先整理素材再手验相册。

> [GG-371](tasks/GG-371-folder-album-batch.md) GG-371文件夹相册与紧凑组合查看源码已精确接入d433fbf4633a1b162af926a787be0dd79cc47136（前置67dd0f5/b3a2d24；隔离bedcaf0/cdcd881/085ce0e，子agent原始e7c62e7/2ed7c38）。资产文件夹完整授权图片集可一次拖入一个360×300相册，5列内部滚动预览全部图/大图查看/失败重试；只接批量候选端口，整集合参与候选，保持公共参考及单请求10图边界。使用album组wire+隐藏真实sourceImage成员，拖入时快照；整体移动/复制/删除/历史/刷新恢复及普通组尺寸保持。chat仅显示查看组合入口，独立有界Dialog每页12组、翻页/跳页/真实图序，巨大组合直接定位目标页。沿GG-276回归只写来源，未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、运行更新或生产操作；GG-366运行receipt保持未重查。创建3/退役3，全部managed辅助已确认归档；两个写入子agent完成，未建立依赖缓存。未验收/未部署，用户刷新5173手验。

> [GG-370](tasks/GG-370-batch-reference-generator.md) GG-370独立画布「批量生成」源码已精确接入8e3e45b4d14fdec3d02044f9bb693826c9ff2bd7（前置aa68728/0aa2a23/23310e2；隔离c000b4a/4d90638/613c521/ae5fbb3）。公共参考+1–5候选组，画布源图/多选共用端点/参考组接入，全部组合或顺序配对，实际单请求去重≤10；chat共享提示词/模型/参数、实际总额与折叠前6图序预览。逐组合冻结输入复用并发slot/恢复/独立失败重试，逐实际引用数报价；沿1MiB文档容量预检及保存后门控，超额不静默截断或提交。独立组件+既有imageGenerator wire/批量ID/handle适配，不新增后台未知字段；本机batchConfiguration保存空组/空模式并在远端剥离，云按有效端口恢复。普通节点原路径保持。沿GG-276只写回归来源，未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、运行更新或生产操作；GG-366运行receipt保持未重查。创建4/退役4，全部managed辅助确认归档，两个写入子agent完成，无依赖缓存。用户刷新5173手验；未验收/未部署。

> [GG-369](tasks/GG-369-batch-reference-html-demo.md) 独立单文件HTML演示已交付：四类案例、候选选择、两种组合规则、图序/数量预览、共用chat参数及本地并发模拟/取消。离线绘图素材，不实际生成或扣费。浏览器打开请求queued；沿GG-276未自动检查/测试/浏览器验收，用户手验。未改应用，源码d8197c1/运行GG-366保持；创建0/退役0，1个纯文案子agent完成。

> [GG-368](tasks/GG-368-batch-reference-composition-design.md) 批量参考组合设计建议已形成，未实施/未成为产品决定。推荐批量生成节点复用chat，公共参考+自定义素材组、全部组合/按序配对、生成前数量/报价预览；复用现有多快照并发/幂等/失败重试，候选池与单任务10图限制分开。保存契约/报价需明确适配；沿GG-276无自动验收或运行/生产操作。应用源码d8197c1与GG-366运行receipt保持，创建0/退役0，2个只读子agent完成。

> [GG-367](tasks/GG-367-reference-sort-motion.md) 移位动效源码已精确接入d8197c137a834bacb40ba65ea2b300efdf6e94b4（隔离52b800e7f022d51eeab5db3a185c45837f3ffb7e）。拖动源图跟随，邻图160ms让位，固定槽位中点/缩放与滚动计算；有效释放提交一次，取消/列表和几何变化不改顺序，cursor保持。沿GG-276回归只写未运行，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、服务或生产操作。GG-366运行身份保持；创建1/退役1，辅助归档。用户刷新5173手验。

> [GG-366](tasks/GG-366-local-restart-after-reboot.md) GG-366电脑重启恢复完成：原PG54449落入Windows54385–54484保留范围、发布映射缺失；经Windows管理员授权短停WinNAT、重连原网络/别名并启动同一PG，原卷及54449映射恢复、WinNAT Running。必要构建verified 1dde20e6c08346d26c3d3d4dd97431605d057fe8；Web34716/32131、唯一Worker32420/32142、Vite30460/5173（启动器8232）通过独立隐藏launcher恢复。首页/原画布200、API代理同revision/verified，两角色readiness五项ok、cloud-development/local-mailpit保持。启动前活动图片/文本任务、未派发outbox、个人/工作区预留及两队列均0，原66迁移保留。未迁移/重置/写fixture/发真实生成/扣费或生产操作；仅必要构建和运行核对，未lint/typecheck/代码检查/测试/浏览器验收。GG-365/364源码保持，创建0/退役0，无子agent/新依赖副本。

> [GG-365](tasks/GG-365-reference-tray-reorder.md) GG-365拖动排序源码已接入c90545528347ecb729b19a5a9e3cacabc25e089c；隔离3378aee15c17a6e071718570eedf3258df152ec4精确接入023d76c5a49cb0f8fbfd47e6a1c0a2eae3517cb6，随后小修Tooltip仅隐藏内容，避免切换受控模式。chat直接/连线/组成员缩略图统一拖动插入排序，源淡化/目标灰边、横向滚动、取消/Escape及Alt方向键；cursor保持。只改当前目标，编号/新提交顺序一致，上传ID替换、移除、保存恢复、历史及复制保持。云层按已有直接数组和排名边ID可逆适配，无后台更新或迁移。GG-364稳定edges修复及既有功能保持。沿GG-276仅写回归来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、服务更新或生产操作；GG-358运行receipt未重查。 用户刷新5173手验，创建1/退役1，辅助已归档。

> [GG-364](tasks/GG-364-reference-update-loop.md) GG-364源码已精确接入56960a87115073a169c0800957a9ac7d0e076236（隔离a9a4f6818a712c3380506863b1f565fc4f28ae6e）。修复GG-363的graphRevision/受控edges引用反馈循环：空/普通边保留原数组，组边按实际原边/计数缓存并复用显示数组，计数和真实边变化仍正常更新，保存/历史观察保持。源码反馈链已定位，未做浏览器复现或自动验收。沿GG-276只写纯回归来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费、服务重启或生产操作，GG-358运行receipt未重查。用户刷新5173手验原画布/空画布、多图接入、移除计数/目标独立排除与保存刷新。

> [GG-363](tasks/GG-363-batch-reference-connection.md) GG-363源码已精确接入5cb456555b9af3e68933df302f03ab5a1e274fde（隔离68f697243acd7965ad5d02ccb758fbf71a45d6cb）。多选两张以上可用图片的外框右侧共用端点，一次有效连接后原位保留参考图组/一条线；组端点复用、连线计数/点击查看、逐张目标排除、去重/10图整批预检、上传等待失败/重试、取消/Escape防迟到提交、解散/重组输入保留及跨页复制/历史已接入。浏览器顺序/排除与导入键经可逆云子边/节点顺序适配，跨页ID唯一，兼容现有Web校验，无后台更新或迁移。 沿GG-276回归只写来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费、服务重启或生产操作。GG-358运行receipt保持未重查，GG-361/360/359源码保持；用户刷新5173手验5图一次接入、两个目标独立移除/刷新、取消/超额及原功能。创建1/退役1，managed辅助已归档，无子agent/依赖缓存。

> [GG-362](tasks/GG-362-batch-reference-design.md) 历史设计建议已由用户「试下看看」接受，并在GG-363实现；此备忘自身不计作源码/运行或验证结果。

> [GG-361](tasks/GG-361-region-toolbar-spacing.md) 框选细化源码完成：隔离ba8d5f249a62ff3225a34278dfea2a063cdf511e精确接入b7d8dbf6c1e7050a940dc2f8558605ce5165a937。删除左上标签/Scan及对应CSS；右侧取消确认面板按内容适应宽度，8px内距/6px间距，按实测宽度重新定位、保留156px上限及窄屏夹取，正常不再有固定宽度左侧空白。红框/副本/取消及加载错误处理保持；ADR0141/产品/交互/设计/手验说明同步，已有几何断言仅更新来源未运行。创建1/退役1，无子agent/依赖缓存，managed辅助归档。沿GG-276未编译/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费/服务/后台或生产操作；保留GG-360公告布局及GG-358运行receipt，本轮未重查。用户刷新5173手验。

> [GG-360](tasks/GG-360-canvas-announcement-order.md) GG-360源码35ed5209501c331994af7f2fbeb72d6689048aca：画布右上顺序为保存状态/公告/积分，公告仅图标及原未读/弹层保持，积分事件和会话条件不变。保留GG-359及GG-358运行receipt，未重查/重启。当前集成目录小改创建0/退役0，无子agent/缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider或生产操作，用户刷新手验。

> [GG-359](tasks/GG-359-image-region-copy.md) 红框编辑/副本源码完成：隔离7522b6beeb889169d0349a5b697dff06393d3c88精确接入34709d4a78f7c881fd23fc8720d96cc5ab5ee7ab。原图默认居中红框/四角柄、图内编辑提示/浅遮罩，支持重画/移动/调节及画布缩放；bbox/复制移除，右侧正常仅取消/确认。确认共同标注几何导出原尺寸PNG并走已有旁置副本/上传/资产/项目保存，原图保留，提示/遮罩/柄不导出。selected/来源ID/页/身份/取消和资源释放保持，贴图原流程保持。ADR0141及AGENTS标注红色例外、产品/交互/设计/手验说明同步。沿GG-276合成回归仅写来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费/后台/服务或生产操作；GG-358运行receipt未重查。创建1/退役1，managed辅助归档，无子agent/依赖缓存。用户刷新5173手验。

> [GG-358](tasks/GG-358-local-runtime-recovery.md) 2026-10-04连接拒绝再恢复：原应用进程已停止，Docker依赖healthy，日志无明确退出原因。必要构建verified 3b7393a16fc013d867c9be35904b1f61eb5bc0ee；通过Windows CIM/隐藏launcher独立启动Web7704/32131、唯一Worker15844/32142、Vite35552/5173（启动器23288）。launcher父进程为WmiPrvSE，跨命令仍运行；首页/原画布200、API代理verified、readiness五项ok。原66迁移/外部cloud-development/local-mailpit保留，启动前任务/outbox/预留/队列均0，无迁移/重置/fixture/真实请求/扣费或生产操作。创建0/退役0，未测试/lint/typecheck/浏览器验收；用户刷新手验。未确认前次退出根因，不声称根治，若再退出查本次退出日志；下方旧PID为历史。

> [GG-357](tasks/GG-357-local-restart-after-reboot.md) 电脑重启恢复完成：复用原E盘healthy依赖及当前GG-116，必要构建verified d066a241f385c52ef0032d3aca91f2e1bf614079，Web31140/32131、唯一Worker2624/32142、Vite28824/5173（启动器13756）可用；首页/原画布200，API代理verified，两角色readiness五项ok。启动前任务/outbox/预留/队列均0，本地66迁移保留，无迁移/重置/fixture/真实请求/扣费或生产操作。GG-350原因采集已随当前Worker启用，GG-356修复保留，用户手验；创建0/退役0，未测试/lint/typecheck/浏览器验收。下方Worker待启用及旧PID为历史交付状态。

> [GG-356](tasks/GG-356-seedream-constraints.md) GG-356已修复并本地启用：隔离4dbdaa4c7a53ffaff3cffb9440fe7e285e8b85b5精确接入6ba2d0d57ae15a4a77a6f3e01810dc0e72f96151。新增0066仅对齐generation_batches/projects/creation_drafts模型ID约束至既有schema，修复Seedream提交前503。2026-10-04 00:15:02通过直接迁移模块只应用0066到127.0.0.1:54449/goodgood；历史65条内容校验和匹配，迁移总数66，新校验和记录匹配，三处约束validated。迁移前后账户/资产/参考图/任务/项目/草稿及积分流水数量、个人/工作区可用及预留余额、Seedream目录/全部报价均不变，开始活动任务0。未改旧迁移/运行JS，不需构建或重启；Web/唯一Worker/Vite沿既有运行，GG-350Worker更新待办保持。专用数据库回归仅写来源，沿GG-276未构建/lint/typecheck/代码检查/测试/浏览器验收；无合成任务/Provider/扣费/自动重放或生产操作。创建1/退役1，managed辅助确认归档，无子agent/缓存。用户现在可自行重试Seedream，真实生成效果待手验。

> [GG-355](tasks/GG-355-seedream-diagnosis.md)（诊断历史，已按GG-356修复） GG-355只读诊断完成：2026-10-03 22:14:49/22:14:52两次POST /api/generations返回503，Web日志均为generation_batches_model_check约束失败。已验证127.0.0.1:54449/goodgood（连接/事务只读）：Seedream目录启用且1K30/2K60报价存在，但generation_batches/projects/creation_drafts模型约束只含五个原有模型、缺seedream-5.0-pro；源码0054只加目录/价格未扩展约束。Seedream任务未落库，未到Worker/上游；按事务代码在预留积分前失败并回滚。当前请求仅诊断，未改代码/迁移/真实数据/服务或触发生成；后续修复应新增迁移放行三处约束，不重写已应用0054。GG-354源码检查点cc31fcce862f127400ac5a65ef26bf55743ea969及现有功能/运行保持；GG-350Worker原因采集待办继续。 另已确认db/schema.ts三处采用模型ID格式约束，与已应用SQL的五模型枚举不一致。

> [GG-354](tasks/GG-354-inline-bbox.md) GG-354源码完成：隔离f6362fa868c019653695ba7a801f1753fec4aad1精确接入cc31fcce862f127400ac5a65ef26bf55743ea969；框选直接在画布原图拖框/移动/四角调整，无遮罩或独立弹框，右侧正常只显示原图像素bbox与取消/复制，复制仅一行坐标。浮层随原图/画布缩放移动，原图滚轮交现有画布；取消/Escape、空/加载/失败、切页/身份/源图守卫、键盘/触屏与资源释放已写。旧弹框框选状态/UI移除，贴图保留。保留GG-353连续工具栏008562243cd64a3d2f7fe57f618b9c4c36668ae2、GG-351顶部工具区及GG-346/350/349。GG-354合成回归仅写来源，沿GG-276未构建/lint/typecheck/代码检查/测试/浏览器验收，无应用HTTP/SQL/Provider/扣费/运行/后台或生产操作，既有receipt未重查。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存。用户刷新5173手验原图框选/坐标复制/取消/画布缩放及原有贴图；GG-350仍待独立委托更新唯一Worker。

> [GG-353](tasks/GG-353-canvas-control-colors.md) GG-353源码008562243cd64a3d2f7fe57f618b9c4c36668ae2：左下四个入口合为连续白色底板，浅灰细边/12px圆角、3px内距/2px间距；图标及缩放文字固定黑色#111，悬停/焦点/按下/开启仅改浅灰背景。原32px按钮、弹层/资产到达/焦点保持，地图上移8px保持10px间隙。创建0/退役0，无子agent/缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider/服务或生产操作，receipt未重查。用户刷新5173手验；GG-352/351/346及GG-350待独立启用Worker保持。

> GG-352源码完成：隔离3ac2e5b精确接入1847f2e7d5834f416f7efd30546e15a021499f06；图片快捷栏新增框选和贴图，单区域拖动/四角/数值及原图像素/0–1000 bbox提示词复制，最多10层本地/资产贴图移动/等比缩放/旋转/层序/删除，原图视图缩放平移不改坐标，确认原尺寸PNG旁置副本。独立context/几何/加载导出及资源取消已写，无新后台/计费/生成。保留GG-346操作排布、GG-351顶部工具区9e7b975efd0bd6599528ba47d278356f6484cd07和GG-350/349。合成回归仅写来源，沿GG-276未编译/lint/typecheck/代码diff检查/测试或浏览器验收，无应用HTTP/SQL/Provider/扣费/服务或生产操作，既有后台receipt保持未重查。创建1/退役1，managed辅助已确认归档（原目录gg-351，实际任务改号352），无依赖缓存/子agent。用户刷新5173手验框选坐标和复制、贴图透明/变换/层序、视图缩放、原尺寸副本及失败取消。

> [GG-350](tasks/GG-350-generation-response-reasons.md) GG-350源码已接入df97afd7bc3a307fd73dbc65b8bb5d60c7880964（隔离d0277e0）：后台逐项解释base64无链接、URL、MIME、数量、任务字段与状态冲突，保留HTTP上下文和图片序号/数量；旧格式错误明确未记录具体异常字段，不推断或回填base64。合成回归来源已写未运行，沿GG-276未构建/lint/typecheck/代码检查/测试或浏览器验收，无新Provider请求、数据改写、服务重启或生产部署。创建1/退役1，无子agent/辅助依赖缓存。当前Web67ffde7/唯一Worker94bee535保持；用户刷新5173手验旧提示，新原因采集待另行委托更新唯一Worker。

> GG-349源码完成：隔离a7a8cac精确接入7fb9a329875f44cab8b6304b807ff6cf28e6ab19；添加数据新增「随机生成」，100组不同示例填入11项拍摄参数、清空4项图片信息/旧粘贴草稿，每轮无重复并避免轮间紧邻重复，可手改。确认添加只需任一可编辑字段trim后非空，原加载/处理锁定、格式校验及旁置副本保持。暂不新增EXIF字段/后台/收费；保留GG-346调色。合成回归仅写来源，沿GG-276未构建/lint/typecheck/代码diff检查/测试或浏览器验收，无应用API/SQL/Provider/扣费/迁移/服务或生产操作；GG-342既有后台receipt保持未重查。创建1/退役1，managed辅助已确认归档，无依赖缓存/子agent；用户刷新5173手验随机填入、图片信息清空、单项非空/全空和确认副本。

> GG-348源码完成：隔离600bdbb精确接入7be483f77183e4852f4a8feb65f24d66be2b3f72，添加数据仅11项拍摄参数/4项图片信息；位置输入及inputMode移除，读入/复制/粘贴过滤坐标，写副本仅合并当前目标原有可读取成对坐标，不隐藏添加新位置。核对CIPA标准与实现：现有15项是EXIF常用子集，未支持白平衡/闪光灯/测光/曝光模式等，当前重建写入不完整保留未知EXIF。未新增字段/完整标签迁移；未构建/检查/测试/浏览器验收，无后台/数据/Provider/扣费或生产操作，GG-342receipt保持。创建1/退役1，managed辅助归档，无依赖缓存/子agent，保留GG-346并行开发；用户刷新手验。

> GG-347已交付源码：隔离eec8527精确接入021921b9abfecfd4aff6421ac1019186ecf20d11，删除添加数据的还原按钮、restore处理与RotateCcw导入；关闭丢弃草稿，重新打开重新读取当前图片，复制/粘贴/确认添加保持。未构建/检查/测试/浏览器验收，无后台/数据/Provider/扣费或生产操作，GG-342运行receipt保持。创建1/退役1，managed辅助归档，无依赖缓存/子agent；GG-346未提交登记保持，不混入本任务。用户刷新手验。

> GG-345已交付源码：隔离ae3489d精确接入62589eeb7f458ca01d6ce947cc67e867e2268602。添加数据移除参考图提取/关联读取、全部C2PA技术说明、左下清理提示及下载副本；底部唯一「确认添加」靠右，处理中「正在添加…」。当前图预填、复制/粘贴/还原、原副本保存及内部容器/凭证保留保持，无新API/存储/计费。未构建/检查/测试/浏览器验收，无迁移/服务/Provider/扣费或生产操作；GG-342后台receipt保持，本轮未重查。创建1/退役1，managed辅助已归档，无依赖缓存/子agent；用户刷新手验。

> GG-344源码完成：隔离2b4e2f2精确接入68373374d91f173e2b1cde0e0b7ba3b2cc491870，按钮/悬停/无障碍名称及弹框统一「添加数据」。入口依据受权素材能力独立启用，共享上下文移到独立模块以保持热刷新实例一致；原项目/切页/身份与源图匹配、副本写入校验保持。未构建/lint/检查/测试/浏览器验收，无迁移/重启/Provider/扣费或生产操作；GG-342后台receipt67ffde7保持，本轮未重查。创建1/退役1，辅助工作区managed归档，无依赖缓存/子agent；用户刷新手验入口、预填及副本保存/下载。

> GG-343已完成：隔离c8ce90c精确接入f09439732eeca6f8e28bc7e18adb6e5485cf5288；去除AI的title/aria-label仅为「去除AI识别」，移除积分、技术说明与该UI未使用常量导入。按钮短标签/处理中状态、即时执行及10积分服务端结算保持。仅源码/文档，未构建/检查/测试/浏览器验收，无迁移/服务/扣费或生产操作；GG-342既有后台启用receipt67ffde7保持，本轮未重查。创建1/退役1，辅助工作区managed归档，无依赖缓存/子agent；用户刷新5173手验。

> GG-342已完成源码与受权本地启用：隔离ffe0ab3精确接入67ffde7161f51ec3c4f73ae9dedabe210156a138；按钮只显示「去除AI」，每次10积分放入悬停提示/无障碍名称，点击立即处理，无确认弹框。必要构建通过，0064公告与0065清理按序应用到127.0.0.1:54449/goodgood（65段迁移），现有账户/资产/积分流水总数迁移前后相同，无fixture或数据重置。仅Web9448替换为34460/32131，唯一Worker23800/32142与Vite33440/5173保持；Web/Worker readiness五项ok、首页200、API代理verified67ffde7，新清理/公告/公告管理接口未登录返回401 SESSION_EXPIRED。功能、收费与公告实时效果仍待用户手验；未运行lint/typecheck/测试/浏览器验收、真实处理/扣费/Provider请求、公告发布/统计fixture或生产部署。创建1/退役1，managed辅助工作区已确认归档，无子agent/依赖缓存。

> 下方GG-341/340的待启用状态为当时交付历史，已由GG-342本地启用覆盖。

> GG-341「去除AI · 10积分」源码已精确接入3579444（隔离3c23d13，基线1c9ecbf，接入前8aaa0f9），保留GG-340铃铛及全部此前功能。JPEG/PNG内C2PA、EXIF/GPS及ComfyUI文本等统一清理；受权原图/幂等操作、个人充值来源/企业预算、ready副本和10积分同事务提交，失败回滚不收费；相邻画布副本/资产与余额刷新、跨页身份及未知结果原键恢复完成。元数据弹框移出清理按钮。ADR0138/0065及合成回归来源已写，未自动编译/lint/typecheck/代码diff检查/测试或浏览器验收，未SQL迁移/应用HTTP/Provider/后台/服务或生产操作；0064与0065和新Web需用户另行委托启用。创建1/退役1，managed辅助工作区已归档，干净无依赖缓存/子agent。运行receipt沿GG-330 verified94bee535/原Web/唯一Worker/Vite/数据/SMTP未重查。

> GG-340入口细化：972303e→d4c1e80已接入，画布仅铃铛/右上未读点，大厅标签与到达提醒保持。累计创建2/退役2，未构建检查/测试/浏览器验收，无后台启用；0064与Web仍待用户委托。

> GG-340公告源码：b25d670/40a67bb已接入当前5173源树，右上入口/有限到达动效/帖子阅读、站长发布周期/并发恢复、隐藏点赞与实际阅读统计，ADR0137。0064迁移与当前Web未启用，等待用户另行委托；创建1/退役1，无编译检查、测试运行、浏览器验收或数据/服务/生产操作。保留另一窗口GG-339登记及GG-337/338，运行receipt沿GG-330未重查。

> GG-339最新命名/布局：8087311→655213b已接入5173，右键/自动节点标题/连接名称为「提示词反推」，预设为「结构化提示词」，模型按钮与设置组按内容宽度/箭头紧邻。内部ID/隐藏指令/生成/计费保持；创建1/退役1，辅助已归档，未编译检查/测试/浏览器验收，无后台或运行变化，用户刷新手验。GG-338/337及GG-330运行receipt保持。

> GG-337最新只读分析：第二份用户JPEG存在6335字节C2PA，声明Google生成式AI创建/添加SynthID水印；原始JUMBF/APP11与完整JSON已导出仓库外。图片/声明哈希及随附公钥的claim签名匹配，未验证根信任/撤销/时间戳或像素水印。无应用代码/运行变化，GG-338「下载」文案及此前副本无内嵌C2PA结果保持。

> GG-338最新文案：08f3387→98c82d4已接入5173，画布图片与画布资产图片右键「下载原图」改为「下载」，原始字节下载行为保持。创建1/退役1，辅助已归档；按用户约定未编译检查/测试/浏览器验收，无后台或运行变化，用户刷新手验。

> 最后同步：2026-10-03。GG-337画布图片/画布资产列表右键下载原图18cb9aa→33525ab已接入5173；用户实际下载副本已独立只读解析/解码，1792×2390、3,120,501字节，仅JFIF基本信息，无内嵌C2PA/EXIF/XMP/IPTC/注释和尾部数据，缺原文件不判定前后变化。创建1/退役1，managed辅助已归档，应用合成回归只写未运行，未编译检查/浏览器验收，无后端更新。GG-336/335/334及此前源码、GG-330运行receipt保持，本轮无服务、数据或Provider操作。

| ID | 当前状态 | 入口 |
| --- | --- | --- |
| GG-351 | 顶栏白色悬浮分组源码完成：左右工具区/灰边圆角/窄屏与长名称，多页/菜单/公告保持；ADR0140，视口/运行未改，无自动验证 | [任务](tasks/GG-351-canvas-header-design.md) |
| GG-350 | 源码df97afd：图片格式失败具体原因与旧记录未知字段说明；未验证/未启用新Worker/未部署 | [任务](tasks/GG-350-generation-response-reasons.md) |
| GG-346 | 调色右侧同一行「查看变化」「恢复自动」完成；两处说明/格式选择已移除，确定白字、原图格式/尺寸副本保持，ADR0139，无自动验证/后台操作 | [任务](tasks/GG-346-color-grade.md) |
| GG-340 | 源码已接入b25d670/40a67bb：平台公告/发布周期/右上入口及帖子流、隐藏统计；创建1/退役1，未编译检查/验收，0064迁移与Web待用户委托启用 | [任务](tasks/GG-340-announcements.md) |

| GG-339 | 已接入655213b：提示词反推/结构化提示词命名，模型按钮按内容宽度；内部ID/生成/计费保持，创建1/退役1，无编译检查/后台更新，用户手验 | [任务](tasks/GG-339-prompt-reverse-ui.md) |
| GG-338 | 已接入98c82d4：两处「下载原图」改为「下载」，仅文案；创建1/退役1，无编译检查/后台更新，用户手验 | [任务](tasks/GG-338-download-label.md) |
| GG-337 | 已接入33525ab：两处右键原图下载；用户实际副本只读确认无内嵌C2PA/EXIF/XMP/IPTC，原图未提供，创建1/退役1，应用回归只写，无编译检查/后端更新 | [任务](tasks/GG-337-original-download.md) |
| GG-336 | 已接入4f686a1：JPEG/PNG内嵌C2PA存在检测及清除副本，未验签/AI判定；创建1/退役1，回归只写，无编译检查/后端更新，用户手验 | [任务](tasks/GG-336-c2pa-metadata.md) |
| GG-335 | 已接入f411a48：移除「从照片提取」/本地文件选择，目标图自动预填及参数操作保持；创建1/退役1，未编译检查/后端更新，用户手验，AI检测仅说明 | [任务](tasks/GG-335-remove-photo-extraction.md) |
| GG-334 | 已接入5c32b19：组/文本透明四角缩放，无角标或hover底色，文本键盘对边固定/夹限；创建1/退役1，回归只写，无编译检查/后端更新，用户手验 | [任务](tasks/GG-334-invisible-resize-corners.md) |
| GG-333 | 已接入7baf03b：自适应框上下28px/最小高度居中，已有框无内容跳位，手动留白保持；创建1/退役1，回归只写未运行，无编译检查/后端更新，用户手验 | [任务](tasks/GG-333-group-auto-centering.md) |
| GG-332 | 已接入a06a1fd/2d44a19：四角贴框内斜线图标、名称/emoji外置左上、选中上方快捷栏；创建1/退役1，无编译检查/后端更新，用户手验 | [任务](tasks/GG-332-group-toolbar-layout.md) |
| GG-331 | 已接入f86dd1b：chat宽度480–640px/参数间距、非模态单选模型列表，点击输入关闭且保留焦点；创建1/退役1，无编译检查/后端更新，用户手验 | [任务](tasks/GG-331-text-composer-spacing.md) |
| GG-330 | 本地已恢复verified94bee535：原E盘数据及依赖healthy、Web9448/唯一Worker23800/Vite33440，5173首页200；创建0/退役0，无测试/浏览器/真实请求，用户继续手验 | [任务](tasks/GG-330-local-connection-recovery.md) |
| GG-329 | 已接入efe7aa6：画布工具Provider与ReactFlow共享同一祖先/store，修复元数据hook祖先错误；创建1/退役1，未编译检查/后端更新，用户刷新手验 | [任务](tasks/GG-329-reactflow-context.md) |
| GG-326 | 已接入37eef68：完整emoji、四角缩放/保留留白/恢复自动、中央默认光标/边框整组移动；创建1/退役1，回归只写未运行，云字段已随GG-330 Web启用，用户手验 | [任务](tasks/GG-326-group-frame-controls.md) |
| GG-328 | 已接入a9952d7：紧凑composer/固定底栏/八行输入、真实阶段和编辑提示、统一发送可用性；创建1/退役1，无编译检查/后端更新，用户手验 | [任务](tasks/GG-328-text-generation-ui.md) |
| GG-327 | 已接入27ec47a/5a488cc：JPEG/PNG元数据预填、照片/参考提取、复制粘贴、清除与下载/保存副本；创建1/退役1，辅助工作区已归档，无编译检查/后台变化，用户手验 | [任务](tasks/GG-327-image-metadata.md) |
| GG-325 | 已接入faaad8a：建组测量循环源码修正，明确尺寸/完整测量/分帧写入，保留对比及分组；创建1/退役1，未编译检查或浏览器复验，用户重试 | [任务](tasks/GG-325-group-resize-loop.md) |
| GG-324 | 已接入da10928/3e34fa7：裁剪右侧对比、实际参考优先/资产搜索、hover/键盘/触屏及局部失败重试；创建1/退役1，无编译检查/后端更新，用户手验 | [任务](tasks/GG-324-canvas-image-compare.md) |
| GG-323 | 已接入源码2fa0486：原生分组/框选建组、整组移动、双击改名/emoji，解散复制及恢复；创建1/退役1，原任务无编译检查，用户手验；云字段已随GG-330 Web启用 | [任务](tasks/GG-323-canvas-groups.md) |
| GG-322 | 已接入0ce2360并仅Web启用verified0b5744d：实际同步错误、本机/云状态保持，新插槽校验生效；创建1/退役1，无测试/真实请求，用户手验 | [任务](tasks/GG-322-image-slot-sync-compatibility.md) |
| GG-321 | 已接入源码4489d1d：固定槽/单张并发/中央逐张重试、未知幂等及旧项目恢复；创建1/退役1，回归未运行，后继GG-322 Web已启用云字段、无SQL/Worker更新 | [任务](tasks/GG-321-image-result-slots.md) |
| GG-320 | 只读确认：当前local-mailpit，11:18登录验证码已进入本地邮件箱58045，未实际投递QQ；无服务或配置变化 | [任务](tasks/GG-320-local-email-delivery-audit.md) |
| GG-319 | 本地恢复完成：Docker E盘原数据/依赖healthy，Web与唯一Worker419b097及5173正常；GG-318已启用，无迁移/测试/真实请求 | [任务](tasks/GG-319-local-restart-after-reboot.md) |
| GG-318 | 源码a627d7f已交付，后继GG-319本地Web/唯一Worker419b097已启用诊断；既有事件/站长总日志，无迁移/历史回填，回归未运行 | [任务](tasks/GG-318-generation-failure-diagnostics.md) |
| GG-317 | 排查完成：本地确实创建3条任务，摸头/坐着成功，半蹲CAPACITY_BUSY失败且20积分已全部释放；非两组上限，无代码/运行修改或真实请求 | [任务](tasks/GG-317-canvas-three-prompt-audit.md) |
| GG-316 | 已接入5173源码3a823d8：画布查看按钮24px/图标14px保持固定屏幕尺寸，纯白不透明背景，资产入口同步；创建1/退役1，未编译或验证 | [任务](tasks/GG-316-canvas-view-icon-consistency.md) |
| GG-315 | 已接入5173源码5be1e21：模板缩略不再误报图片失败，图片/视频及文本全文自身错误保持；创建1/退役1，未编译或验证，无后端变化 | [任务](tasks/GG-315-text-template-media-error.md) |
| GG-314 | 已接入5173源码0a66ee3：三类图片右上复用资产hover按钮/现有大图详情，展开批次逐图查看，关闭回焦点；创建1/退役1，未编译或验证，无后端变化 | [任务](tasks/GG-314-canvas-image-view-button.md) |
| GG-313 | 已接入5173源码024e139：模板名称初始空白，用途_主题_风格/商品主图示例为占位参考，不强制三段；创建1/退役1，未编译或验证，无运行变化 | [任务](tasks/GG-313-prompt-template-name-guidance.md) |
| GG-312 | 已接入5173源码aeff94d：画布300%才允许最高2K预览，180ms稳定加载，低于300%恢复512，节点尺寸/像素密度不提前触发；创建1/退役1，未编译或验证，无后端变化 | [任务](tasks/GG-312-canvas-preview-zoom-threshold.md) |
| GG-311 | 已接入5173源码6e089c3：保存提示词模板/名称/保存，无弹窗预览；成功资产入口动效，右上类型筛选及空结果恢复；创建1/退役1，未编译或验证，无运行变化 | [任务](tasks/GG-311-prompt-template-save-and-asset-filter.md) |
| GG-310 | 已接入5173源码c3ba0d2：模板弹窗说明仅无障碍可读，取消深色字/保存及保存中白色字；创建1/退役1，未编译或验证，无运行变化，用户手验 | [任务](tasks/GG-310-text-template-dialog-copy-color.md) |
| GG-309 | 本地verified 287c4ca/Web40244/必要0063已启用最高2K预览、批量校验及文本资产API；创建2/退役2，原Vite/唯一Worker和数据保持，用户手验 | [任务](tasks/GG-309-canvas-preview-activation.md) |
| GG-308 | 已接入5173源码4317bdb：单击快捷栏/双击格式栏，冻结文本为私有模板资产、1:1文字缩略/全文与拖回复用；创建1/退役1，未编译/验证；持久接口/本地0063已随GG-309启用，用户手验 | [任务](tasks/GG-308-canvas-text-template-assets.md) |
| GG-306 | 已接入5173源码f004e5f：资产拖入/上传/生成结果默认512，放大按需最高2048；共享限并发/身份缓存、真实尺寸保留。创建1/退役1，未编译/验证；新2K私有接口已随GG-309启用，用户手验 | [任务](tasks/GG-306-canvas-adaptive-preview.md) |
| GG-307 | 已接入5173所用源码ebd8ace：Banana 2大图详情始终隐藏思考，只改展示/既有回归断言；创建1/退役1，未编译/验证，无后端变化 | [任务](tasks/GG-307-hide-banana-thinking-details.md) |
| GG-305 | 已接入5173所用源码5a4fb15：大图参数按模型支持及实际使用筛选，跨模型默认项/关闭搜索/空参考图隐藏，GPT适用记录值保留；预设不处理，创建1/退役1，未编译/验证，无后端变化 | [任务](tasks/GG-305-canvas-viewer-used-parameters.md) |
| GG-304 | 已接入5173所用源码0ad78b0：拖线预览与hover共用亮蓝/虚线流动，减少动态效果保持亮色静止实线；创建1/退役1，仅CSS/决策，未编译/验证，无后端变化 | [任务](tasks/GG-304-canvas-connection-drag-flow.md) |
| GG-303 | 已接入5173所用源码b4a5d6e：中英文分隔行/原生分割线触发并发批量，图片数/权威报价乘积，逐段结果/重试与保存恢复；创建1/退役1，不新增批量上限，未编译/验证，云端校验已随GG-309启用，用户手验 | [任务](tasks/GG-303-canvas-prompt-batches.md) |
| GG-302 | 清晰度逻辑已查明：画布使用最长边512px/quality80 WebP预览，放大仍读预览；生成原文件按上游bytes保存。仅排查/文档，无代码或运行改动，创建0/退役0 | [任务](tasks/GG-302-canvas-image-quality-audit.md) |
| GG-301 | 已接入5173所用源码9217c10：有序列表右侧分割线快捷按钮，原生Markdown插入/细灰横线，原编辑锁/撤销保存保持；创建1/退役1，未编译/验证 | [任务](tasks/GG-301-text-divider.md) |
| GG-300 | 用户委托构建b3844d2/仅本地0062/Web33840已启用预设及中断规则，20积分无额外费；代理verified/匿名401，创建1/退役1，用户手验，未真实生成或部署 | [任务](tasks/GG-300-preset-activation.md) |
| GG-299 | 已接入5173源码d8b40d7：图片hover由文件名改为放大图片，复用图片生成预览样式及私有地址，取消按钮保留；创建1/退役1，无编译/检查，用户手验 | [任务](tasks/GG-299-text-image-preview.md) |
| GG-298 | 已接入5173源码884ffdd：图片/文本/视频缩略右上角X可取消，复用连线移除/撤销/图保存，生成及恢复期间锁定；创建1/退役1，未编译/检查，用户手验 | [任务](tasks/GG-298-text-input-remove.md) |
| GG-297 | 预设菜单/可移除标签/空附加输入、后台白名单指令/保存恢复；后继GG-300已构建启用，无额外积分费，用户手验 | [任务](tasks/GG-297-text-generation-presets.md) |
| GG-296 | 用户中断扣10退10/成功20/系统失败0及无停止解释；后继GG-300已构建/本地0062/Web启用，用户手验，历史取消不追扣 | [任务](tasks/GG-296-text-cancel-half-credit.md) |
| GG-295 | 已接入5173源码：文本生成节点根部补TooltipProvider，覆盖NodeToolbar连接输入预览；创建1/退役1，无编译/检查/服务变化，刷新已有节点手验 | [任务](tasks/GG-295-text-generation-tooltip.md) |
| GG-294 | 已接入767e6db：文本编辑→文本生成→图片生成；按明确委托构建成功/本地0061/新版Web已启用，5173代理verified；创建1/退役1，用户手验，未真实生成或部署 | [任务](tasks/GG-294-text-generation-test.md) |
| GG-293 | 已接入5173所用源码fdd13ae：撤回GG-292整套方案，恢复修改前实现/原有校验，移除未执行0062。创建1/退役1，未编译/验证或服务变更 | [任务](tasks/GG-293-revert-prompt-limits.md) |
| GG-292 | 用户取消：由GG-293撤回，当前不包含其模型限制/32,000存储/全文预览排序方案，不激活或迁移；历史提交保留 | [任务](tasks/GG-292-model-prompt-limits.md) |
| GG-291 | 三类名称/编号、双击编辑、文本生成五模型/high/图文视频/流式可编辑结果/保存恢复，每次20积分。后继GG-294已构建767e6db并启用本地0061/Web；未做真实生成，用户手验 | [任务](tasks/GG-291-canvas-text-generation.md) |
| GG-290 | 已接入5173源码：文本编辑器标题/编辑标签连续编号，新建/复制排后，复用保存顺序兼容旧项目。创建1/退役1，用户手验，未自动编译/检查 | [任务](tasks/GG-290-canvas-text-editor-order.md) |
| GG-289 | 已接入5173源码：内边距纳入可编辑区，移除外层点击重置光标，修复反向拖选取消；原间距保持。创建1/退役1，用户手验，未自动编译/检查 | [任务](tasks/GG-289-canvas-text-selection-padding.md) |
| GG-288 | 已接入5173源码：具体尺寸预设按像素居中选取，原图不足时等比缩小；通用比例保持最大区域。创建1/退役1，未编译/验证，用户手验 | [任务](tasks/GG-288-canvas-crop-preset-pixels.md) |
| GG-287 | 已接入5173源码：文本/Markdown按光标粘贴，开放片段避免额外换行；富文本/代码块保留原生处理。创建1/退役1，用户手验，未自动编译/检查 | [任务](tasks/GG-287-canvas-text-paste.md) |
| GG-286 | 已接入5173源码：默认自由裁剪、通用移除自由/原始比例并在2:3上方补3:4，完成及处理中使用浅色文字。创建1/退役1，未编译/验证，用户手验 | [任务](tasks/GG-286-canvas-crop-action-color.md) |
| GG-284 | 已接入5173：生成图先解析受权原图直链、请求可取消；本地CORS补5173及Worker启动origin保持。定向7/7、预检200，创建1/退役1；无局部编译，用户重新打开裁剪复验 | [任务](tasks/GG-284-canvas-crop-image-fetch.md) |
| GG-280 | 已精确接入5173所用目录：快捷裁剪、W/H/比例锁、遮罩网格/拖拽、五组新预设，无LinkedIn；真实PNG/File上传和项目恢复。创建2/退役2，未编译/检查，用户手验 | [任务](tasks/GG-280-canvas-image-crop.md) |
| GG-275 / GG-274 | 文本编辑器外置标题/双斜线尺寸柄/固定14px、精简工具栏和尺寸保存已进入5173；本窗口读取新约定前45/45，之后不自动检查，用户手验。本地服务/数据保持 | [GG-275](tasks/GG-275-text-editor-layout.md) / [GG-274](tasks/GG-274-local-restart-after-reboot.md) |
| GG-272 / GG-262 | 已进入5173/Web：真实创建时间/北京时间、字标与标题同水平线；既有行内编辑/固定网格保持。22/22、lint/编译/必要构建通过，创建1/退役1 | [GG-272](tasks/GG-272-account-created-and-brand-row.md) / [GG-262](tasks/GG-262-profile-inline-edit-layout.md) |
| GG-268 / GG-273 / GG-276—279 / GG-283 / GG-285 | 编辑器/混合端口/1:1缩略已交付；GG-283前端共享请求/成功缓存已接入5173，服务端去重待构建重启。GG-285已隐藏添加参考图入口及空占位，创建1/退役1。用户手验，未自动编译/检查 | [GG-268](tasks/GG-268-markdown-text-node.md) / [GG-273](tasks/GG-273-canvas-editor-inputs.md) / [GG-276](tasks/GG-276-restore-reference-previews.md) / [GG-277](tasks/GG-277-square-reference-thumbnails.md) / [GG-278](tasks/GG-278-reference-add-icon-only.md) / [GG-279](tasks/GG-279-text-reference-thumbnails.md) / [GG-283](tasks/GG-283-generated-reference-reuse.md) / [GG-285](tasks/GG-285-hide-generator-reference-add.md) |
| GG-270 / GG-281 / GG-282 | 文件夹创建/右键管理和1:1卡片已交付；GG-282标题“重命名”、统一弹框/稳定按钮与无滚动焦点恢复，保存仅局部更新名称，已接入5173；累计创建2/退役2，用户手动检查 | [GG-270](tasks/GG-270-canvas-asset-context-menu.md) / [GG-281](tasks/GG-281-square-canvas-folders.md) / [GG-282](tasks/GG-282-canvas-folder-rename-dialog.md) |
| GG-266 / GG-267 / GG-269 / GG-271 | 已进入5173：Good Good字标单独展示，尺寸与导航对齐后继见卡，最终标题位置由GG-272并行交付；源码/diff/编译证据保留，用户验收 | [GG-266](tasks/GG-266-geometric-good-good-wordmark.md) / [GG-267](tasks/GG-267-compact-lobby-wordmark.md) / [GG-269](tasks/GG-269-wordmark-only.md) / [GG-271](tasks/GG-271-wordmark-nav-alignment.md) |
| GG-272 | 并行窗口：账户真实注册时间与品牌标题位置源码c4b10b8已精确进入；定向验证/Web同步及生命周期见其任务卡，归原窗口交付 | [任务](tasks/GG-272-account-created-and-brand-row.md) |
| GG-265 | 已进入5173：确认移动后原位置消失、目标保留同一素材，根层仅未归档；失败/刷新一致性与失效归属恢复，12/12、局部lint/编译通过，创建1/退役1 | [任务](tasks/GG-265-canvas-folder-move-membership.md) |
| GG-264 | 已进入5173：默认完整适配，放大可填满整个中间区域；无计数/右列动态居中保持。本轮16/16、局部lint/编译通过，累计创建2/退役2，用户验收 | [任务](tasks/GG-264-image-detail-fill-and-centered-rail.md) |
| GG-263 | 已进入5173：移除大厅「画布」，沿用项目页新建/已有画布入口；7/7、局部lint/模块编译通过，无辅助目录，用户验收 | [任务](tasks/GG-263-remove-lobby-canvas-entry.md) |
| GG-260 / GG-261 | 明细/来源已交付：余额/类型/任务 ID 复制/项目模型/20条分页、空心图标/普通字重；67 项相关检查、0060/Web 完成，创建2/退役2；免费规则待用户 | [GG-260](tasks/GG-260-credit-details-and-free-quota.md) / [GG-261](tasks/GG-261-daily-free-image-quota.md) |
| GG-249 / GG-251 / GG-253 / GG-258 | 当前素材信息/缩放/内容列/简洁说明已进入5173，旧轮播由后继取代、最终缩放以GG-264为准；定向/lint/编译证据见卡，用户验收 | [GG-249](tasks/GG-249-canvas-media-viewer.md) / [GG-251](tasks/GG-251-canvas-preview-fit.md) / [GG-253](tasks/GG-253-canvas-media-detail.md) / [GG-258](tasks/GG-258-canvas-detail-minimal.md) |
| GG-255 / GG-256 / GG-257 | 画布外部图片粘贴/编辑区隔离、文件夹拖入/状态动效与默认实线/hover流动已接入5173；定向检查完成，辅助目录已退役，用户验收 | [GG-255](tasks/GG-255-canvas-paste-image.md) / [GG-256](tasks/GG-256-canvas-folder-drop.md) / [GG-257](tasks/GG-257-canvas-edge-hover-flow.md) |
| GG-248 / GG-250 / GG-252 / GG-254 / GG-259 | 个人信息与直接编辑/随机六位ID记录，最终布局以GG-262为准；既有定向/SQL/服务证据保留在卡中，辅助目录已退役 | [GG-248](tasks/GG-248-account-personal-information.md) / [GG-250](tasks/GG-250-inline-personal-information.md) / [GG-252](tasks/GG-252-personal-info-cleanup.md) / [GG-254](tasks/GG-254-account-identity-editor.md) / [GG-259](tasks/GG-259-random-user-id-stable-edit.md) |
| GG-247 | 用户确认验证节奏：小需求定向检查即可交付，全量检查集中到批次/发布或必要回归 | [任务](tasks/GG-247-targeted-verification.md) |
| GG-246 | 已接入实际 5173：大厅视频默认暂停、中心播放提示，仅 mouse hover 预览；定向 31/31、共同门禁 685/22/0、辅助目录退役，用户验收 | [任务](tasks/GG-246-asset-video-hover.md) |
| GG-245 | 源码 `7ddb78d`、34/34、lint/typecheck 与所给 JPEG 读取通过；verified Web 已同步，子目录退役，用户验收 | [任务](tasks/GG-245-canvas-image-link-read.md) |
| GG-244 | 已接入当前 5173，定向 9/9，完整门禁 674/22/0；子目录退役，用户验收 | [任务](tasks/GG-244-canvas-asset-hover.md) |
| GG-243 | 已接入实际 5173：首位新建卡片直接进入新画布；共同门禁 665/22/0、定向 14/14，辅助目录已退役，用户验收 | [任务](tasks/GG-243-project-create-card.md) |
| GG-242 | 预览开发完成；定向 23/23、只读抽查 13/13、完整门禁 661 通过/22 隔离跳过；子 worktree 已退役，用户自行验收 | [任务](tasks/GG-242-canvas-image-preview.md) |
| GG-241 | 当前 5173、verified Web、唯一 Worker 和原本地依赖已恢复；原数据与迁移保留，无新增 worktree | [任务](tasks/GG-241-local-startup.md) |
| GG-240 | 子 agent/worktree 创建、缓存、集成和退役规范已写入入口文档、任务模板与契约测试；未部署 | [任务](tasks/GG-240-subagent-worktree-hygiene.md) |
| GG-239 | 当前 5173 累计源码、文档、迁移与测试收口为单一提交和标签；未部署 | [任务](tasks/GG-239-current-5173-checkpoint.md) |
| GG-238 | 方形添加卡与图片查看器已合入 5173，静态审阅完成，待用户手验 | [任务](tasks/GG-238-canvas-asset-viewer.md) |
| GG-236 / GG-237 | 项目卡默认浅灰外框已确认；4/3/2/1列响应布局与4:3封面已进入5173，待用户手验 | [GG-236](tasks/GG-236-project-card-default-frame.md) / [GG-237](tasks/GG-237-project-four-column-grid.md) |
| GG-235 | 本地媒体依赖端口已恢复；瀑布流、重试和视频首帧待 UI 手验 | [任务](tasks/GG-235-asset-media-masonry.md) |
| GG-226 | 项目管理后端、本地迁移 0056 与已验证 Web/Worker 的当前运行基线 | [任务](tasks/GG-226-project-library-actions.md) |
| GG-900 | C6 删除/内容安全继续停放，禁止自动恢复或批量合入 | [任务](tasks/GG-900-deferred-c6.md) |

## 下一步
用户刷新5173验收GG-272及此前交付；GG-268/270保留其任务卡证据。每日免费数量/模型/规格待用户答复后再开发quota，生产发布另立任务。新需求核对当前HEAD祖先，隔离辅助目录完成后退役。

## 全部任务卡索引

任务状态、被取代关系、验证和发布证据以各任务卡为准：

[GG-001-project-continuity.md](tasks/GG-001-project-continuity.md) · [GG-003-alpha-release-tooling.md](tasks/GG-003-alpha-release-tooling.md) · [GG-004-generation-dispatch-race.md](tasks/GG-004-generation-dispatch-race.md) · [GG-005-resolution-metadata.md](tasks/GG-005-resolution-metadata.md) · [GG-006-reference-tray-layout.md](tasks/GG-006-reference-tray-layout.md) · [GG-007-gpt-image-2-sd.md](tasks/GG-007-gpt-image-2-sd.md) · [GG-008-parallel-generation.md](tasks/GG-008-parallel-generation.md) · [GG-009-gpt-image-output-counts.md](tasks/GG-009-gpt-image-output-counts.md)

[GG-010-banana-multi-output.md](tasks/GG-010-banana-multi-output.md) · [GG-011-fast-safe-local-delivery.md](tasks/GG-011-fast-safe-local-delivery.md) · [GG-012-banana-thinking-search.md](tasks/GG-012-banana-thinking-search.md) · [GG-013-stable-generation-grid-download.md](tasks/GG-013-stable-generation-grid-download.md) · [GG-014-sidebar-balance-copy.md](tasks/GG-014-sidebar-balance-copy.md) · [GG-015-gpt-image-options.md](tasks/GG-015-gpt-image-options.md) · [GG-016-banana-hidden-high-thinking.md](tasks/GG-016-banana-hidden-high-thinking.md) · [GG-017-reusable-reference-library.md](tasks/GG-017-reusable-reference-library.md)

[GG-018-reference-ordering.md](tasks/GG-018-reference-ordering.md) · [GG-019-reference-large-preview.md](tasks/GG-019-reference-large-preview.md) · [GG-020-reference-quick-editor.md](tasks/GG-020-reference-quick-editor.md) · [GG-021-nano-banana-pro-pricing.md](tasks/GG-021-nano-banana-pro-pricing.md) · [GG-022-ongoing-production-restore.md](tasks/GG-022-ongoing-production-restore.md) · [GG-023-sharp-security-update.md](tasks/GG-023-sharp-security-update.md) · [GG-024-admin-dialog-styles.md](tasks/GG-024-admin-dialog-styles.md) · [GG-025-credit-activity.md](tasks/GG-025-credit-activity.md)

[GG-026-local-feature-integration.md](tasks/GG-026-local-feature-integration.md) · [GG-027-distributor-credit-transfers.md](tasks/GG-027-distributor-credit-transfers.md) · [GG-029-email-otp-plan.md](tasks/GG-029-email-otp-plan.md) · [GG-030-enterprise-workspace.md](tasks/GG-030-enterprise-workspace.md) · [GG-031-email-enterprise-integration.md](tasks/GG-031-email-enterprise-integration.md) · [GG-032-complete-base-email-enterprise.md](tasks/GG-032-complete-base-email-enterprise.md) · [GG-033-gpt-image-25-models.md](tasks/GG-033-gpt-image-25-models.md) · [GG-034-video-creation-frontend.md](tasks/GG-034-video-creation-frontend.md)

[GG-035-seedance-provider-lines.md](tasks/GG-035-seedance-provider-lines.md) · [GG-036-seedance-page-smoke.md](tasks/GG-036-seedance-page-smoke.md) · [GG-037-mixed-media-style-preview.md](tasks/GG-037-mixed-media-style-preview.md) · [GG-038-seedance-brand-icon.md](tasks/GG-038-seedance-brand-icon.md) · [GG-039-video-count-concurrency.md](tasks/GG-039-video-count-concurrency.md) · [GG-040-batch-prompts.md](tasks/GG-040-batch-prompts.md) · [GG-041-remove-batch-prompt-summary.md](tasks/GG-041-remove-batch-prompt-summary.md) · [GG-042-parameter-drawer-overlay.md](tasks/GG-042-parameter-drawer-overlay.md)

[GG-043-larger-reference-previews.md](tasks/GG-043-larger-reference-previews.md) · [GG-044-unified-account-navigation.md](tasks/GG-044-unified-account-navigation.md) · [GG-045-contextual-credit-management.md](tasks/GG-045-contextual-credit-management.md) · [GG-046-business-style-preview.md](tasks/GG-046-business-style-preview.md) · [GG-048-enterprise-overview.md](tasks/GG-048-enterprise-overview.md) · [GG-049-separate-business-roles.md](tasks/GG-049-separate-business-roles.md) · [GG-050-remove-page-return-actions.md](tasks/GG-050-remove-page-return-actions.md) · [GG-051-credit-pricing-reassessment.md](tasks/GG-051-credit-pricing-reassessment.md)

[GG-052-model-management.md](tasks/GG-052-model-management.md) · [GG-053-clear-model-pricing.md](tasks/GG-053-clear-model-pricing.md) · [GG-054-banana-lines.md](tasks/GG-054-banana-lines.md) · [GG-055-gemini-image-costs.md](tasks/GG-055-gemini-image-costs.md) · [GG-056-banana2-lines.md](tasks/GG-056-banana2-lines.md) · [GG-057-admin-navigation.md](tasks/GG-057-admin-navigation.md) · [GG-058-admin-text-and-actions.md](tasks/GG-058-admin-text-and-actions.md) · [GG-059-site-owner-workspace.md](tasks/GG-059-site-owner-workspace.md)

[GG-060-management-heading-hierarchy.md](tasks/GG-060-management-heading-hierarchy.md) · [GG-061-audit-log-section.md](tasks/GG-061-audit-log-section.md) · [GG-062-gpt-image-lines.md](tasks/GG-062-gpt-image-lines.md) · [GG-063-gpt-quality-pricing.md](tasks/GG-063-gpt-quality-pricing.md) · [GG-064-visible-quality-prices.md](tasks/GG-064-visible-quality-prices.md) · [GG-065-compact-model-management.md](tasks/GG-065-compact-model-management.md) · [GG-066-responsive-model-width.md](tasks/GG-066-responsive-model-width.md) · [GG-067-seedance-token-pricing.md](tasks/GG-067-seedance-token-pricing.md)

[GG-068-seedance-line-pricing.md](tasks/GG-068-seedance-line-pricing.md) · [GG-069-pricing-discount.md](tasks/GG-069-pricing-discount.md) · [GG-070-model-cards.md](tasks/GG-070-model-cards.md) · [GG-071-site-operations.md](tasks/GG-071-site-operations.md) · [GG-072-personal-profile.md](tasks/GG-072-personal-profile.md) · [GG-073-inspiration-cases.md](tasks/GG-073-inspiration-cases.md) · [GG-074-inspiration-editor.md](tasks/GG-074-inspiration-editor.md) · [GG-075-inspiration-publish-controls.md](tasks/GG-075-inspiration-publish-controls.md)

[GG-076-inspiration-hover-preview.md](tasks/GG-076-inspiration-hover-preview.md) · [GG-077-inspiration-visibility-statistics.md](tasks/GG-077-inspiration-visibility-statistics.md) · [GG-078-inspiration-card-statistics.md](tasks/GG-078-inspiration-card-statistics.md) · [GG-079-inspiration-likes-centered-detail.md](tasks/GG-079-inspiration-likes-centered-detail.md) · [GG-080-jcoin-planning.md](tasks/GG-080-jcoin-planning.md) · [GG-081-credit-types-operations.md](tasks/GG-081-credit-types-operations.md) · [GG-082-jcoin-minimum-issuance.md](tasks/GG-082-jcoin-minimum-issuance.md) · [GG-083-jcoin-batch-accumulation.md](tasks/GG-083-jcoin-batch-accumulation.md)

[GG-084-jcoin-ledger-pages.md](tasks/GG-084-jcoin-ledger-pages.md) · [GG-085-jcoin-batch-cards.md](tasks/GG-085-jcoin-batch-cards.md) · [GG-086-jcoin-live-progress.md](tasks/GG-086-jcoin-live-progress.md) · [GG-087-problem-feedback.md](tasks/GG-087-problem-feedback.md) · [GG-088-feedback-select-downward.md](tasks/GG-088-feedback-select-downward.md) · [GG-089-admin-navigation-order.md](tasks/GG-089-admin-navigation-order.md) · [GG-090-invitation-registration.md](tasks/GG-090-invitation-registration.md) · [GG-091-account-invitation-login.md](tasks/GG-091-account-invitation-login.md)

[GG-092-development-handoff.md](tasks/GG-092-development-handoff.md) · [GG-093-docker-cleanup-build-handoff.md](tasks/GG-093-docker-cleanup-build-handoff.md) · [GG-094-registration-invitation-visibility.md](tasks/GG-094-registration-invitation-visibility.md) · [GG-095-primary-email-auth-test-flow.md](tasks/GG-095-primary-email-auth-test-flow.md) · [GG-096-production-auth-entry.md](tasks/GG-096-production-auth-entry.md) · [GG-097-production-release-0019-to-0043.md](tasks/GG-097-production-release-0019-to-0043.md) · [GG-098-manual-grant-ceiling.md](tasks/GG-098-manual-grant-ceiling.md) · [GG-099-single-slot-compose-release.md](tasks/GG-099-single-slot-compose-release.md)

[GG-100-production-single-slot-host-cleanup.md](tasks/GG-100-production-single-slot-host-cleanup.md) · [GG-101-real-online-local-development.md](tasks/GG-101-real-online-local-development.md) · [GG-102-real-video-development.md](tasks/GG-102-real-video-development.md) · [GG-103-reference-input-optimization.md](tasks/GG-103-reference-input-optimization.md) · [GG-104-media-dropzone-layout.md](tasks/GG-104-media-dropzone-layout.md) · [GG-105-media-upload-200mb.md](tasks/GG-105-media-upload-200mb.md) · [GG-107-composer-send-arrow.md](tasks/GG-107-composer-send-arrow.md) · [GG-110-functional-reference-upload-preview.md](tasks/GG-110-functional-reference-upload-preview.md)

[GG-111-cloud-reference-upload-development.md](tasks/GG-111-cloud-reference-upload-development.md) · [GG-112-real-email-local-login.md](tasks/GG-112-real-email-local-login.md) · [GG-113-private-image-previews.md](tasks/GG-113-private-image-previews.md) · [GG-114-reusable-image-delivery.md](tasks/GG-114-reusable-image-delivery.md) · [GG-115-asset-workspace.md](tasks/GG-115-asset-workspace.md) · [GG-116-asset-history-actions.md](tasks/GG-116-asset-history-actions.md) · [GG-117-inspiration-retirement.md](tasks/GG-117-inspiration-retirement.md) · [GG-119-wordmark-only-workspace-brand.md](tasks/GG-119-wordmark-only-workspace-brand.md)

[GG-120-shared-impeccable-skill.md](tasks/GG-120-shared-impeccable-skill.md) · [GG-121-unified-asset-browser.md](tasks/GG-121-unified-asset-browser.md) · [GG-122-standalone-hero-page.md](tasks/GG-122-standalone-hero-page.md) · [GG-123-shadcn-ai-elements-adoption.md](tasks/GG-123-shadcn-ai-elements-adoption.md) · [GG-124-canvas-creation-foundation.md](tasks/GG-124-canvas-creation-foundation.md) · [GG-125-standalone-canvas-image-generation.md](tasks/GG-125-standalone-canvas-image-generation.md) · [GG-126-canvas-local-image-drop.md](tasks/GG-126-canvas-local-image-drop.md) · [GG-127-asset-resize-observer-loop.md](tasks/GG-127-asset-resize-observer-loop.md)

[GG-128-quiet-canvas-image-hover.md](tasks/GG-128-quiet-canvas-image-hover.md) · [GG-129-canvas-image-resize.md](tasks/GG-129-canvas-image-resize.md) · [GG-130-canvas-image-selection-frame.md](tasks/GG-130-canvas-image-selection-frame.md) · [GG-131-canvas-resize-observer-loop.md](tasks/GG-131-canvas-resize-observer-loop.md) · [GG-132-canvas-uncontrolled-resize.md](tasks/GG-132-canvas-uncontrolled-resize.md) · [GG-133-canvas-proportional-image-corners.md](tasks/GG-133-canvas-proportional-image-corners.md) · [GG-134-canvas-rounded-corner-resize-handles.md](tasks/GG-134-canvas-rounded-corner-resize-handles.md) · [GG-135-canvas-image-alignment-guides.md](tasks/GG-135-canvas-image-alignment-guides.md)

[GG-136-square-canvas-images.md](tasks/GG-136-square-canvas-images.md) · [GG-137-canvas-image-hover-frame.md](tasks/GG-137-canvas-image-hover-frame.md) · [GG-138-canvas-zoom-menu.md](tasks/GG-138-canvas-zoom-menu.md) · [GG-139-global-credit-icon.md](tasks/GG-139-global-credit-icon.md) · [GG-140-canvas-header-simplification.md](tasks/GG-140-canvas-header-simplification.md) · [GG-141-canvas-ai-composer.md](tasks/GG-141-canvas-ai-composer.md) · [GG-142-canvas-model-icons.md](tasks/GG-142-canvas-model-icons.md) · [GG-143-canvas-credit-only-generate.md](tasks/GG-143-canvas-credit-only-generate.md)

[GG-144-canvas-model-order.md](tasks/GG-144-canvas-model-order.md) · [GG-145-canvas-image-metadata.md](tasks/GG-145-canvas-image-metadata.md) · [GG-146-canvas-local-video-drop.md](tasks/GG-146-canvas-local-video-drop.md) · [GG-147-canvas-reference-previews.md](tasks/GG-147-canvas-reference-previews.md) · [GG-148-canvas-mini-map.md](tasks/GG-148-canvas-mini-map.md) · [GG-149-canvas-home-icon-menu.md](tasks/GG-149-canvas-home-icon-menu.md) · [GG-150-canvas-inline-name.md](tasks/GG-150-canvas-inline-name.md) · [GG-151-canvas-asset-panel.md](tasks/GG-151-canvas-asset-panel.md)

[GG-152-canvas-session-preview-build-error.md](tasks/GG-152-canvas-session-preview-build-error.md) · [GG-153-workspace-icon-rail.md](tasks/GG-153-workspace-icon-rail.md) · [GG-154-local-asset-runtime-compatibility.md](tasks/GG-154-local-asset-runtime-compatibility.md) · [GG-155-canvas-asset-drag-and-rename.md](tasks/GG-155-canvas-asset-drag-and-rename.md) · [GG-156-account-credit-usage-dialog.md](tasks/GG-156-account-credit-usage-dialog.md) · [GG-157-credit-usage-table-filter.md](tasks/GG-157-credit-usage-table-filter.md) · [GG-158-canvas-image-drag-performance.md](tasks/GG-158-canvas-image-drag-performance.md) · [GG-159-canvas-credit-detail-entry.md](tasks/GG-159-canvas-credit-detail-entry.md)

[GG-160-canvas-local-image-upload-preview.md](tasks/GG-160-canvas-local-image-upload-preview.md) · [GG-161-canvas-local-media-upload.md](tasks/GG-161-canvas-local-media-upload.md) · [GG-162-canvas-asset-thumbnail-density.md](tasks/GG-162-canvas-asset-thumbnail-density.md) · [GG-163-canvas-context-menu.md](tasks/GG-163-canvas-context-menu.md) · [GG-164-local-service-recovery-after-reboot.md](tasks/GG-164-local-service-recovery-after-reboot.md) · [GG-165-canvas-reference-add-tile.md](tasks/GG-165-canvas-reference-add-tile.md) · [GG-166-canvas-prompt-expand.md](tasks/GG-166-canvas-prompt-expand.md) · [GG-167-canvas-image-generator-node.md](tasks/GG-167-canvas-image-generator-node.md)

[GG-168-local-service-restart-2026-09-29.md](tasks/GG-168-local-service-restart-2026-09-29.md) · [GG-169-static-canvas-model-icons.md](tasks/GG-169-static-canvas-model-icons.md) · [GG-170-canvas-curved-reference-edges.md](tasks/GG-170-canvas-curved-reference-edges.md) · [GG-171-canvas-edge-flow-delete.md](tasks/GG-171-canvas-edge-flow-delete.md) · [GG-172-canvas-generator-initial-size.md](tasks/GG-172-canvas-generator-initial-size.md) · [GG-173-canvas-project-autosave.md](tasks/GG-173-canvas-project-autosave.md) · [GG-174-canvas-composer-spacing.md](tasks/GG-174-canvas-composer-spacing.md) · [GG-175-canvas-content-scoped-autosave.md](tasks/GG-175-canvas-content-scoped-autosave.md)

[GG-176-canvas-keyboard-shortcuts.md](tasks/GG-176-canvas-keyboard-shortcuts.md) · [GG-177-canvas-shortcut-panel-copy-history.md](tasks/GG-177-canvas-shortcut-panel-copy-history.md) · [GG-178-canvas-connection-handle-hit-area.md](tasks/GG-178-canvas-connection-handle-hit-area.md) · [GG-179-canvas-handle-offset-breathing.md](tasks/GG-179-canvas-handle-offset-breathing.md) · [GG-180-canvas-generator-identity-label.md](tasks/GG-180-canvas-generator-identity-label.md) · [GG-181-canvas-composer-rounded-shadow.md](tasks/GG-181-canvas-composer-rounded-shadow.md) · [GG-182-canvas-generator-real-results.md](tasks/GG-182-canvas-generator-real-results.md) · [GG-183-canvas-video-preview-fit.md](tasks/GG-183-canvas-video-preview-fit.md)

[GG-184-cancel-stale-local-generation-and-start-worker.md](tasks/GG-184-cancel-stale-local-generation-and-start-worker.md) · [GG-185-canvas-generator-reflective-progress.md](tasks/GG-185-canvas-generator-reflective-progress.md) · [GG-186-canvas-generation-stalled-on-cloud-reference.md](tasks/GG-186-canvas-generation-stalled-on-cloud-reference.md) · [GG-187-canvas-generator-output-dimensions.md](tasks/GG-187-canvas-generator-output-dimensions.md) · [GG-188-canvas-generator-shimmer-rounded-image.md](tasks/GG-188-canvas-generator-shimmer-rounded-image.md) · [GG-189-canvas-nano-adaptive-settings.md](tasks/GG-189-canvas-nano-adaptive-settings.md) · [GG-190-canvas-media-rounded-corners.md](tasks/GG-190-canvas-media-rounded-corners.md) · [GG-191-canvas-nano-default-2k.md](tasks/GG-191-canvas-nano-default-2k.md)

[GG-192-canvas-composer-action-corners.md](tasks/GG-192-canvas-composer-action-corners.md) · [GG-193-canvas-project-invalid-content-runtime-mismatch.md](tasks/GG-193-canvas-project-invalid-content-runtime-mismatch.md) · [GG-194-canvas-portrait-ratio-options.md](tasks/GG-194-canvas-portrait-ratio-options.md) · [GG-195-canvas-ratio-content-centering.md](tasks/GG-195-canvas-ratio-content-centering.md) · [GG-196-canvas-generator-borderless-progress.md](tasks/GG-196-canvas-generator-borderless-progress.md) · [GG-197-canvas-multi-output-stack.md](tasks/GG-197-canvas-multi-output-stack.md) · [GG-198-canvas-generation-batch-stack.md](tasks/GG-198-canvas-generation-batch-stack.md) · [GG-199-canvas-batch-expand-toggle.md](tasks/GG-199-canvas-batch-expand-toggle.md)

[GG-200-canvas-edge-hover-blue.md](tasks/GG-200-canvas-edge-hover-blue.md) · [GG-201-canvas-multi-selection-delete.md](tasks/GG-201-canvas-multi-selection-delete.md) · [GG-202-local-service-restart-2026-09-30.md](tasks/GG-202-local-service-restart-2026-09-30.md) · [GG-203-canvas-generation-count-eight.md](tasks/GG-203-canvas-generation-count-eight.md) · [GG-204-canvas-image-settings-full-view.md](tasks/GG-204-canvas-image-settings-full-view.md) · [GG-205-canvas-settings-count-summary.md](tasks/GG-205-canvas-settings-count-summary.md) · [GG-206-canvas-edge-hover-persistence.md](tasks/GG-206-canvas-edge-hover-persistence.md) · [GG-207-canvas-generator-context-menu-label.md](tasks/GG-207-canvas-generator-context-menu-label.md)

[GG-208-canvas-default-count-preview.md](tasks/GG-208-canvas-default-count-preview.md) · [GG-209-canvas-batch-stack-preview.md](tasks/GG-209-canvas-batch-stack-preview.md) · [GG-210-canvas-generator-context-menu-icon.md](tasks/GG-210-canvas-generator-context-menu-icon.md) · [GG-211-canvas-gpt-routing-options.md](tasks/GG-211-canvas-gpt-routing-options.md) · [GG-212-canvas-count-stepper-twelve.md](tasks/GG-212-canvas-count-stepper-twelve.md) · [GG-213-canvas-gpt-auto-settings.md](tasks/GG-213-canvas-gpt-auto-settings.md) · [GG-214-canvas-seedream-model.md](tasks/GG-214-canvas-seedream-model.md) · [GG-215-unified-g-logo.md](tasks/GG-215-unified-g-logo.md)

[GG-216-canvas-stale-upload-status.md](tasks/GG-216-canvas-stale-upload-status.md) · [GG-217-remove-jcoin.md](tasks/GG-217-remove-jcoin.md) · [GG-217-runtime-integration.md](tasks/GG-217-runtime-integration.md) · [GG-218-canvas-project-pages.md](tasks/GG-218-canvas-project-pages.md) · [GG-219-canvas-header-scale.md](tasks/GG-219-canvas-header-scale.md) · [GG-220-expanded-sidebar-home.md](tasks/GG-220-expanded-sidebar-home.md) · [GG-221-canvas-page-delete-size.md](tasks/GG-221-canvas-page-delete-size.md) · [GG-222-canvas-selection-arrange.md](tasks/GG-222-canvas-selection-arrange.md)

[GG-223-expanded-sidebar-hover.md](tasks/GG-223-expanded-sidebar-hover.md) · [GG-224-workspace-navigation.md](tasks/GG-224-workspace-navigation.md) · [GG-225-asset-search.md](tasks/GG-225-asset-search.md) · [GG-226-project-library-actions.md](tasks/GG-226-project-library-actions.md) · [GG-227-sidebar-footer.md](tasks/GG-227-sidebar-footer.md) · [GG-228-canvas-native-selection.md](tasks/GG-228-canvas-native-selection.md) · [GG-229-canvas-alignment-icons.md](tasks/GG-229-canvas-alignment-icons.md) · [GG-230-canvas-header-asset-alignment.md](tasks/GG-230-canvas-header-asset-alignment.md)

[GG-231-canvas-selection-border.md](tasks/GG-231-canvas-selection-border.md) · [GG-232-project-card-interaction.md](tasks/GG-232-project-card-interaction.md) · [GG-233-canvas-asset-cards-and-add.md](tasks/GG-233-canvas-asset-cards-and-add.md) · [GG-234-canvas-asset-card-default-hover.md](tasks/GG-234-canvas-asset-card-default-hover.md) · [GG-235-asset-media-masonry.md](tasks/GG-235-asset-media-masonry.md) · [GG-236-project-card-default-frame.md](tasks/GG-236-project-card-default-frame.md) · [GG-237-project-four-column-grid.md](tasks/GG-237-project-four-column-grid.md) · [GG-238-canvas-asset-viewer.md](tasks/GG-238-canvas-asset-viewer.md)

[GG-239-current-5173-checkpoint.md](tasks/GG-239-current-5173-checkpoint.md) · [GG-240-subagent-worktree-hygiene.md](tasks/GG-240-subagent-worktree-hygiene.md) · [GG-241-local-startup.md](tasks/GG-241-local-startup.md) · [GG-242-canvas-image-preview.md](tasks/GG-242-canvas-image-preview.md) · [GG-243-project-create-card.md](tasks/GG-243-project-create-card.md) · [GG-244-canvas-asset-hover.md](tasks/GG-244-canvas-asset-hover.md) · [GG-900-deferred-c6.md](tasks/GG-900-deferred-c6.md)

## GG-375 · 相册节点拖动与样式统一

GG-375相册节点源码已精确接入8d06014f1de118007359ded030f18d62d7ccd977（隔离5964debffd59c892ffd859f92803ea6229e18048）。仅相册接收鼠标事件，整框/缩略图/外置标题使用原生拖动，点击预览和内部滚轮浏览保持。左上文件夹图标/名称、右上数量直接复用图片元信息；右侧复用媒体圆点及已连接/键盘焦点样式；左下黑底圆形编号，底部精确为「连接到节点，一次性载入所有图片」。ADR0135和设计/交互/手验资料同步，快照/候选端口/请求上限/保存模型保持。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费、服务/后台或生产更新，GG-374运行receipt保持未重查。创建1/退役1，managed辅助已确认归档，无子agent/依赖缓存。已实现、未自动验收、未部署；用户刷新5173手验旧/新相册移动及外观。下一源码任务从当前HEAD核验8d06014祖先后隔离。 见[tasks/GG-375-album-node-polish.md](tasks/GG-375-album-node-polish.md)。

## GG-376 · 图片批量生成节点名称与样式

GG-376图片批量生成节点源码已精确接入93780cefc17d4446bfd5b0979a31e661e9fc0aee（隔离0717805f0acc4fe5d215eac7456067a01c258166）。节点/右键入口/连接提示统一名称，接收端复用媒体输入圆点，素材和组合预览共用18px黑圆白字编号；用户确认保留右上移除，以圆形黑底X/hover/键盘/触控统一。chat直接显示现有计划首组实际图序的一行横向预览，移除查看组合按钮/分页Dialog/关闭入口；完整执行/任务数/报价/公共参考/1–5组/10图及持久化保持。顺带补足PrivateObjectImage可选draggable转发，修正GG-375已有拖动设置未传达的问题。ADR0108及产品/设计/交互/手验资料同步。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费或后台/服务/生产更新，GG-374运行receipt保持未重查。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存。已实现、未自动验收、未部署；用户刷新5173手验。下一源码任务从当前HEAD核验93780ce祖先后隔离。 见[tasks/GG-376-batch-node-polish.md](tasks/GG-376-batch-node-polish.md)。

## GG-377 · 文件夹相册手动伸缩

GG-377文件夹相册手动伸缩源码已精确接入f1119dd16fc756f91ee58ea97c102ed377337762（隔离e184625cf6c9fd911e2ee43f4ed9c4b31a27fca9）。选中相册沿媒体透明四角原生调整，宽高独立/最小200×120，保留360×300初始尺寸；稳定回调复用历史和保存，方向键10px/Shift50px沿既有组几何。预览列按56px最小宽自适应、超高内部滚动，说明不压缩；外置名称/数量/圆点、快照成员/原始图片及候选/10图边界保持。现有手动group宽高保存/复制/刷新恢复，无新字段或后台更新。ADR0135及产品/设计/交互/手验资料同步，gg371回归补收紧高度/50成员保持、固定对边/现有云wire尺寸、空相册及无效尺寸来源，仅写未运行。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费、服务或生产操作，GG-374运行receipt保持未重查。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存。已实现、未自动验收、未部署；用户刷新5173手验四角调整和保存恢复。下一源码任务从当前HEAD核验f1119dd祖先后隔离。 见[tasks/GG-377-album-resize.md](tasks/GG-377-album-resize.md)。

## GG-378 · 相册伸缩回调缺失修复

GG-378相册伸缩回调修复已精确接入28431236bb8800a26fe5b7f26b8f5802908e103f（隔离440879109a385c491adfb746a88e4074a3085109）。用户手验发现GG-377选中相册即startResize未定义，源码确认开始/结束/键盘三项回调均遗漏声明；本次补齐稳定原生回调、历史捕获、manual标记和结束宽高/style同步保存，方向键仍复用既有相册几何10px/Shift50px。不改变ADR0135决定或外观、素材及候选边界，无新后台字段。GG-377任务补缺陷更正，错误和用户手验记录同步。沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，无生成/扣费、服务或生产操作，GG-374运行receipt保持未重查。创建1/退役1，managed辅助已确认归档，无子agent/依赖缓存。源码已补齐、未自动验收、未部署；用户刷新5173手验相册选中、四角持续伸缩、键盘及保存恢复。下一源码任务从当时HEAD核验2843123祖先后隔离。 见[任务卡](tasks/GG-378-album-resize-callbacks.md)。

## GG-379 · 画布空状态误保存

GG-379画布误保存保护已精确接入5941c82596840a18347bf98eda46aeef5a9aea20（隔离1f54025567e01785296db92028a6b008fe91130d）。用户丢失排查确认原画布48ad1462版本171于17:50:30变为0节点/0边；Vite17:50:27相册热更新及React Flow卸载reset与其一致，自动保存缺少临时空图保护。已备份原localhost5173 IndexedDB日志和服务器行，提取170干净快照（17:26:59，17节点/5逻辑边）；沿现有文档适配、校验与owner/workspace授权仓库创建独立恢复画布78d3d798-6bdb-45f5-b472-8995fdbf1955「开发画布（恢复副本）」版本1，只读落库/解码核对17节点/5边（云存储8条成员展开边），原171空记录保留，不改浏览器存储/原素材/原任务。同步器写本机前阻止同页非空变空，显式末节点删除或历史空帧给按页一次许可；新建空页/部分删除/删页保持，许可成功后消费/恢复时清理。无新产品决定/字段/迁移。回归来源覆盖六类场景，仅写未执行；沿GG-276未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，Computer Use两次内核退出、未发UI动作。只进行本次丢失诊断和独立恢复的本机数据操作；无provider/生成/扣费、服务或生产操作，GG-374运行身份不重写。创建1/退役1，managed辅助已确认归档，无子agent/依赖缓存，真实快照在仓库外TEMP/goodgood-canvas-recovery。源码已交付、恢复副本已落库，UI待用户手验、未部署；用户打开恢复副本继续工作并手验主动清空/撤销。下一源码任务从当时HEAD核验5941c82祖先后隔离。 见[任务卡](tasks/GG-379-canvas-data-loss.md)。
