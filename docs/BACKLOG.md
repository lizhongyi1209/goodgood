# 当前任务与优先级

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
