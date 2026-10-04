# Production implementation plan

- Last synchronized: 2026-10-04
- Current phase: GG-365参考缩略图拖动排序源码已接入当前项目，GG-364循环修复及多图参考保持；用户手验待办，未部署生产。
- Current objective: 用户刷新5173手验chat拖动排序/鼠标样式、编号及新提交顺序，两个目标独立、取消/滚动、保存刷新及撤销复制；不自动检查、生成、重放或重启，GG-358运行保持。
- Previous objective: GG-313模板名称格式/示例参考、GG-312画布300%高清门槛、GG-311模板保存/成功动效及类型筛选、GG-310前景色已交付源码；GG-309私有2K接口、批量校验及文本资产API/本地0063已启用。

## Current checkpoint

- 当前应用源码检查点：c90545528347ecb729b19a5a9e3cacabc25e089c；[GG-365](tasks/GG-365-reference-tray-reorder.md) GG-365拖动排序源码已接入c90545528347ecb729b19a5a9e3cacabc25e089c；隔离3378aee15c17a6e071718570eedf3258df152ec4精确接入023d76c5a49cb0f8fbfd47e6a1c0a2eae3517cb6，随后小修Tooltip仅隐藏内容，避免切换受控模式。chat直接/连线/组成员缩略图统一拖动插入排序，源淡化/目标灰边、横向滚动、取消/Escape及Alt方向键；cursor保持。只改当前目标，编号/新提交顺序一致，上传ID替换、移除、保存恢复、历史及复制保持。云层按已有直接数组和排名边ID可逆适配，无后台更新或迁移。GG-364稳定edges修复及既有功能保持。沿GG-276仅写回归来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、服务更新或生产操作；GG-358运行receipt未重查。 创建1/退役1，辅助已归档。下一任务从当前HEAD核验祖先，旧GG-364/363为历史来源，不改写GG-358运行身份。

- 历史应用源码检查点：56960a87115073a169c0800957a9ac7d0e076236；[GG-364](tasks/GG-364-reference-update-loop.md) GG-364源码已精确接入56960a87115073a169c0800957a9ac7d0e076236（隔离a9a4f6818a712c3380506863b1f565fc4f28ae6e）。修复GG-363的graphRevision/受控edges引用反馈循环：空/普通边保留原数组，组边按实际原边/计数缓存并复用显示数组，计数和真实边变化仍正常更新，保存/历史观察保持。源码反馈链已定位，未做浏览器复现或自动验收。沿GG-276只写纯回归来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费、服务重启或生产操作，GG-358运行receipt未重查。用户刷新5173手验原画布/空画布、多图接入、移除计数/目标独立排除与保存刷新。 下一任务从当前HEAD核验祖先，GG-363为历史来源，不改写GG-358运行身份。

- 历史应用源码检查点：5cb456555b9af3e68933df302f03ab5a1e274fde；[GG-363](tasks/GG-363-batch-reference-connection.md) GG-363源码已精确接入5cb456555b9af3e68933df302f03ab5a1e274fde（隔离68f697243acd7965ad5d02ccb758fbf71a45d6cb）。多选两张以上可用图片的外框右侧共用端点，一次有效连接后原位保留参考图组/一条线；组端点复用、连线计数/点击查看、逐张目标排除、去重/10图整批预检、上传等待失败/重试、取消/Escape防迟到提交、解散/重组输入保留及跨页复制/历史已接入。浏览器顺序/排除与导入键经可逆云子边/节点顺序适配，跨页ID唯一，兼容现有Web校验，无后台更新或迁移。 沿GG-276回归只写来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费、服务重启或生产操作。GG-358运行receipt保持未重查，GG-361/360/359源码保持；用户刷新5173手验5图一次接入、两个目标独立移除/刷新、取消/超额及原功能。创建1/退役1，managed辅助已归档，无子agent/依赖缓存。 后续从当前HEAD核验祖先；旧GG-361等为历史来源，不改写GG-358运行身份。

- 历史设计分析：[GG-362](tasks/GG-362-batch-reference-design.md) 多图参考建议已被接受，并由GG-363实现；方案与运行/验证状态以GG-363卡及上方当前检查点为准。

- 历史应用源码检查点：b7d8dbf6c1e7050a940dc2f8558605ce5165a937；[GG-361](tasks/GG-361-region-toolbar-spacing.md) 框选细化源码完成：隔离ba8d5f249a62ff3225a34278dfea2a063cdf511e精确接入b7d8dbf6c1e7050a940dc2f8558605ce5165a937。删除左上标签/Scan及对应CSS；右侧取消确认面板按内容适应宽度，8px内距/6px间距，按实测宽度重新定位、保留156px上限及窄屏夹取，正常不再有固定宽度左侧空白。红框/副本/取消及加载错误处理保持；ADR0141/产品/交互/设计/手验说明同步，已有几何断言仅更新来源未运行。创建1/退役1，无子agent/依赖缓存，managed辅助归档。沿GG-276未编译/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费/服务/后台或生产操作；保留GG-360公告布局及GG-358运行receipt，本轮未重查。用户刷新5173手验。 下方GG-359图内提示/固定156px面板为历史，现行按GG-361，后续从当前HEAD核验祖先。

- 历史应用源码检查点：35ed5209501c331994af7f2fbeb72d6689048aca；[GG-360](tasks/GG-360-canvas-announcement-order.md) GG-360源码35ed5209501c331994af7f2fbeb72d6689048aca：画布右上顺序为保存状态/公告/积分，公告仅图标及原未读/弹层保持，积分事件和会话条件不变。保留GG-359及GG-358运行receipt，未重查/重启。当前集成目录小改创建0/退役0，无子agent/缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider或生产操作，用户刷新手验。

- 历史应用源码检查点：34709d4a78f7c881fd23fc8720d96cc5ab5ee7ab；[GG-359](tasks/GG-359-image-region-copy.md) 红框编辑/副本源码完成：隔离7522b6beeb889169d0349a5b697dff06393d3c88精确接入34709d4a78f7c881fd23fc8720d96cc5ab5ee7ab。原图默认居中红框/四角柄、图内编辑提示/浅遮罩，支持重画/移动/调节及画布缩放；bbox/复制移除，右侧正常仅取消/确认。确认共同标注几何导出原尺寸PNG并走已有旁置副本/上传/资产/项目保存，原图保留，提示/遮罩/柄不导出。selected/来源ID/页/身份/取消和资源释放保持，贴图原流程保持。ADR0141及AGENTS标注红色例外、产品/交互/设计/手验说明同步。沿GG-276合成回归仅写来源，未构建/lint/typecheck/代码检查/测试/浏览器验收，无HTTP/SQL/Provider/扣费/后台/服务或生产操作；GG-358运行receipt未重查。创建1/退役1，managed辅助归档，无子agent/依赖缓存。用户刷新5173手验。 下方旧框选bbox/复制验收为历史，现行按GG-359；下一任务以当前HEAD核验祖先，不改写GG-358运行身份。

- 最新运行恢复：[GG-358](tasks/GG-358-local-runtime-recovery.md) 2026-10-04连接拒绝再恢复：原应用进程已停止，Docker依赖healthy，日志无明确退出原因。必要构建verified 3b7393a16fc013d867c9be35904b1f61eb5bc0ee；通过Windows CIM/隐藏launcher独立启动Web7704/32131、唯一Worker15844/32142、Vite35552/5173（启动器23288）。launcher父进程为WmiPrvSE，跨命令仍运行；首页/原画布200、API代理verified、readiness五项ok。原66迁移/外部cloud-development/local-mailpit保留，启动前任务/outbox/预留/队列均0，无迁移/重置/fixture/真实请求/扣费或生产操作。创建0/退役0，未测试/lint/typecheck/浏览器验收；用户刷新手验。未确认前次退出根因，不声称根治，若再退出查本次退出日志；下方旧PID为历史。 当前应用源码仍6ba2d0d；运行receipt严格绑定3b7393a，纯文档提交不改写身份，未来启动按届时HEAD构建。

- 最新运行恢复：[GG-357](tasks/GG-357-local-restart-after-reboot.md) 2026-10-04按用户要求，复用原E盘healthy依赖及GG-116必要构建verified d066a241f385c52ef0032d3aca91f2e1bf614079；Web31140/32131、唯一Worker2624/32142、Vite28824/5173（启动器13756）可用，首页及原画布200，API代理verified，readiness五项ok。启动前活动任务/outbox/预留/两队列均0，66迁移及既有数据保留，无迁移/重置/fixture/真实请求/扣费/生产操作。GG-350随当前Worker启用，下面待启用和旧运行receipt是历史。当前应用源码仍6ba2d0d57ae15a4a77a6f3e01810dc0e72f96151；纯文档交接不改写运行receipt，未来启动按届时HEAD构建。创建0/退役0，未测试/lint/typecheck/浏览器验收。

- Seedream诊断历史（已按GG-356修复）：[GG-355](tasks/GG-355-seedream-diagnosis.md) GG-355只读诊断完成：2026-10-03 22:14:49/22:14:52两次POST /api/generations返回503，Web日志均为generation_batches_model_check约束失败。已验证127.0.0.1:54449/goodgood（连接/事务只读）：Seedream目录启用且1K30/2K60报价存在，但generation_batches/projects/creation_drafts模型约束只含五个原有模型、缺seedream-5.0-pro；源码0054只加目录/价格未扩展约束。Seedream任务未落库，未到Worker/上游；按事务代码在预留积分前失败并回滚。当前请求仅诊断，未改代码/迁移/真实数据/服务或触发生成；后续修复应新增迁移放行三处约束，不重写已应用0054。GG-354源码检查点cc31fcce862f127400ac5a65ef26bf55743ea969及现有功能/运行保持；GG-350Worker原因采集待办继续。 另已确认db/schema.ts三处采用模型ID格式约束，与已应用SQL的五模型枚举不一致。

- 历史应用源码检查点：6ba2d0d57ae15a4a77a6f3e01810dc0e72f96151；[GG-356](tasks/GG-356-seedream-constraints.md) GG-356已修复并本地启用：隔离4dbdaa4c7a53ffaff3cffb9440fe7e285e8b85b5精确接入6ba2d0d57ae15a4a77a6f3e01810dc0e72f96151。新增0066仅对齐generation_batches/projects/creation_drafts模型ID约束至既有schema，修复Seedream提交前503。2026-10-04 00:15:02通过直接迁移模块只应用0066到127.0.0.1:54449/goodgood；历史65条内容校验和匹配，迁移总数66，新校验和记录匹配，三处约束validated。迁移前后账户/资产/参考图/任务/项目/草稿及积分流水数量、个人/工作区可用及预留余额、Seedream目录/全部报价均不变，开始活动任务0。未改旧迁移/运行JS，不需构建或重启；Web/唯一Worker/Vite沿既有运行，GG-350Worker更新待办保持。专用数据库回归仅写来源，沿GG-276未构建/lint/typecheck/代码检查/测试/浏览器验收；无合成任务/Provider/扣费/自动重放或生产操作。创建1/退役1，managed辅助确认归档，无子agent/缓存。用户现在可自行重试Seedream，真实生成效果待手验。

- 历史应用源码检查点：cc31fcce862f127400ac5a65ef26bf55743ea969；[GG-354](tasks/GG-354-inline-bbox.md) GG-354源码完成：隔离f6362fa868c019653695ba7a801f1753fec4aad1精确接入cc31fcce862f127400ac5a65ef26bf55743ea969；框选直接在画布原图拖框/移动/四角调整，无遮罩或独立弹框，右侧正常只显示原图像素bbox与取消/复制，复制仅一行坐标。浮层随原图/画布缩放移动，原图滚轮交现有画布；取消/Escape、空/加载/失败、切页/身份/源图守卫、键盘/触屏与资源释放已写。旧弹框框选状态/UI移除，贴图保留。保留GG-353连续工具栏008562243cd64a3d2f7fe57f618b9c4c36668ae2、GG-351顶部工具区及GG-346/350/349。GG-354合成回归仅写来源，沿GG-276未构建/lint/typecheck/代码检查/测试/浏览器验收，无应用HTTP/SQL/Provider/扣费/运行/后台或生产操作，既有receipt未重查。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存。用户刷新5173手验原图框选/坐标复制/取消/画布缩放及原有贴图；GG-350仍待独立委托更新唯一Worker。

- 历史应用源码检查点：008562243cd64a3d2f7fe57f618b9c4c36668ae2；[GG-353](tasks/GG-353-canvas-control-colors.md) GG-353源码008562243cd64a3d2f7fe57f618b9c4c36668ae2：左下四个入口合为连续白色底板，浅灰细边/12px圆角、3px内距/2px间距；图标及缩放文字固定黑色#111，悬停/焦点/按下/开启仅改浅灰背景。原32px按钮、弹层/资产到达/焦点保持，地图上移8px保持10px间隙。创建0/退役0，无子agent/缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider/服务或生产操作，receipt未重查。用户刷新5173手验；GG-352/351/346及GG-350待独立启用Worker保持。

- 历史应用源码检查点：1847f2e7d5834f416f7efd30546e15a021499f06；[GG-352](tasks/GG-352-image-region-sticker.md) GG-352源码完成：隔离3ac2e5b精确接入1847f2e7d5834f416f7efd30546e15a021499f06；图片快捷栏新增框选和贴图，单区域拖动/四角/数值及原图像素/0–1000 bbox提示词复制，最多10层本地/资产贴图移动/等比缩放/旋转/层序/删除，原图视图缩放平移不改坐标，确认原尺寸PNG旁置副本。独立context/几何/加载导出及资源取消已写，无新后台/计费/生成。保留GG-346操作排布、GG-351顶部工具区9e7b975efd0bd6599528ba47d278356f6484cd07和GG-350/349。合成回归仅写来源，沿GG-276未编译/lint/typecheck/代码diff检查/测试或浏览器验收，无应用HTTP/SQL/Provider/扣费/服务或生产操作，既有后台receipt保持未重查。创建1/退役1，managed辅助已确认归档（原目录gg-351，实际任务改号352），无依赖缓存/子agent。用户刷新5173手验框选坐标和复制、贴图透明/变换/层序、视图缩放、原尺寸副本及失败取消。

- 历史应用源码检查点：9e7b975efd0bd6599528ba47d278356f6484cd07；[GG-351](tasks/GG-351-canvas-header-design.md) GG-351源码9e7b975efd0bd6599528ba47d278356f6484cd07：顶部左导航/右状态两组不透明白底、细灰边和12px圆角，无阴影；原字号/桌面25px中心、侧栏避让及事件保持，980px内左组两行/名称收缩/页签滚动。中间指针透传，画布viewport/节点坐标不变。ADR0140 Accepted。干净GG-116小改创建0/退役0，无子agent/辅助缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider/扣费/服务或生产操作，原运行receipt保持未重查。用户刷新5173手验图片顶部混叠、宽窄屏/多页/名称/侧栏及公告/账户/保存；GG-350新原因采集仍待独立委托更新唯一Worker。

- 最新设计分析：[GG-351](tasks/GG-351-canvas-header-design.md) 方案已获用户试用授权并实现，ADR0140 Accepted；不再是待实施建议。

- GG-346历史源码检查点：6cd79e205e2c7c08cb73269c2ee18d812b07c03c；[GG-346](tasks/GG-346-color-grade.md) GG-346操作排布6cd79e205e2c7c08cb73269c2ee18d812b07c03c：查看变化/恢复自动放右侧参数下方同一行靠右，同尺寸/间距；查看按压切换与恢复默认参数保持，原预览底部工具行移除，图面及加载/失败遮罩同步扩展。ADR0139同步。当前GG-116小改创建0/退役0，无子agent/缓存；未编译/检查/测试/浏览器验收，无后台/数据/Provider/扣费/服务或生产操作，既有运行保持未重查。用户刷新手验布局/切换/恢复；GG-350新原因采集仍待另行委托更新唯一Worker。

- GG-350历史源码检查点：df97afd7bc3a307fd73dbc65b8bb5d60c7880964；[GG-350](tasks/GG-350-generation-response-reasons.md) GG-350源码已接入df97afd7bc3a307fd73dbc65b8bb5d60c7880964（隔离d0277e0）：后台逐项解释base64无链接、URL、MIME、数量、任务字段与状态冲突，保留HTTP上下文和图片序号/数量；旧格式错误明确未记录具体异常字段，不推断或回填base64。合成回归来源已写未运行，沿GG-276未构建/lint/typecheck/代码检查/测试或浏览器验收，无新Provider请求、数据改写、服务重启或生产部署。创建1/退役1，无子agent/辅助依赖缓存。当前Web67ffde7/唯一Worker94bee535保持；用户刷新5173手验旧提示，新原因采集待另行委托更新唯一Worker。

- GG-349历史源码检查点：7fb9a329875f44cab8b6304b807ff6cf28e6ab19；[GG-349](tasks/GG-349-random-parameters.md) GG-349源码完成：隔离a7a8cac精确接入7fb9a329875f44cab8b6304b807ff6cf28e6ab19；添加数据新增「随机生成」，100组不同示例填入11项拍摄参数、清空4项图片信息/旧粘贴草稿，每轮无重复并避免轮间紧邻重复，可手改。确认添加只需任一可编辑字段trim后非空，原加载/处理锁定、格式校验及旁置副本保持。暂不新增EXIF字段/后台/收费；保留GG-346调色。合成回归仅写来源，沿GG-276未构建/lint/typecheck/代码diff检查/测试或浏览器验收，无应用API/SQL/Provider/扣费/迁移/服务或生产操作；GG-342既有后台receipt保持未重查。创建1/退役1，managed辅助已确认归档，无依赖缓存/子agent；用户刷新5173手验随机填入、图片信息清空、单项非空/全空和确认副本。

- GG-346历史源码检查点：72083c594ed4fffbaa1b8927ff71bb7e943a5e6a；[GG-346](tasks/GG-346-color-grade.md) GG-346已交付源码：隔离7bf093305645d4d7de15687ef7bcafc9ea556235精确接入72083c594ed4fffbaa1b8927ff71bb7e943a5e6a。图片快捷栏对比之后新增调色，当前输出冻结参考首张打开即自动匹配；实际参考/资产切换、仅手动、六项参数、调整前/恢复、原尺寸PNG/JPEG新副本完成。OKLab有界色度匹配默认保明度，共用LUT的WebGL预览/Worker导出及取消/失败处理；不调用生成或新增收费，不需新API/迁移/后台重启。GG-347/348添加数据更新保留。创建1/退役1，独立Git工作树干净无依赖/构建缓存，分支保留；Windows当前目录句柄只留下空目录，已从外部正常移除空目录，无强制删除文件。未构建/lint/typecheck/代码diff检查/测试/浏览器验收，合成回归仅写源码，无应用API/SQL/Provider/扣费/服务或生产操作；GG-342既有后台receipt保持，本轮未重查。用户刷新5173手验自动参考质量、参数/对比/重置、无参考/失败、透明/格式/尺寸、新副本上传及关闭/身份切页取消。

- GG-348历史源码检查点：7be483f77183e4852f4a8feb65f24d66be2b3f72；[GG-348](tasks/GG-348-remove-location.md) GG-348源码完成：隔离600bdbb精确接入7be483f77183e4852f4a8feb65f24d66be2b3f72，添加数据仅11项拍摄参数/4项图片信息；位置输入及inputMode移除，读入/复制/粘贴过滤坐标，写副本仅合并当前目标原有可读取成对坐标，不隐藏添加新位置。核对CIPA标准与实现：现有15项是EXIF常用子集，未支持白平衡/闪光灯/测光/曝光模式等，当前重建写入不完整保留未知EXIF。未新增字段/完整标签迁移；未构建/检查/测试/浏览器验收，无后台/数据/Provider/扣费或生产操作，GG-342receipt保持。创建1/退役1，managed辅助归档，无依赖缓存/子agent，保留GG-346并行开发；用户刷新手验。

- GG-347历史源码检查点：021921b9abfecfd4aff6421ac1019186ecf20d11；[GG-347](tasks/GG-347-remove-reset.md) GG-347已交付源码：隔离eec8527精确接入021921b9abfecfd4aff6421ac1019186ecf20d11，删除添加数据的还原按钮、restore处理与RotateCcw导入；关闭丢弃草稿，重新打开重新读取当前图片，复制/粘贴/确认添加保持。未构建/检查/测试/浏览器验收，无后台/数据/Provider/扣费或生产操作，GG-342运行receipt保持。创建1/退役1，managed辅助归档，无依赖缓存/子agent；GG-346未提交登记保持，不混入本任务。用户刷新手验。

- GG-345历史源码检查点：62589eeb7f458ca01d6ce947cc67e867e2268602；[GG-345](tasks/GG-345-add-data-dialog.md) GG-345已交付源码：隔离ae3489d精确接入62589eeb7f458ca01d6ce947cc67e867e2268602。添加数据移除参考图提取/关联读取、全部C2PA技术说明、左下清理提示及下载副本；底部唯一「确认添加」靠右，处理中「正在添加…」。当前图预填、复制/粘贴/还原、原副本保存及内部容器/凭证保留保持，无新API/存储/计费。未构建/检查/测试/浏览器验收，无迁移/服务/Provider/扣费或生产操作；GG-342后台receipt保持，本轮未重查。创建1/退役1，managed辅助已归档，无依赖缓存/子agent；用户刷新手验。

- GG-344历史源码检查点：68373374d91f173e2b1cde0e0b7ba3b2cc491870；[GG-344](tasks/GG-344-metadata-entry.md) GG-344源码完成：隔离2b4e2f2精确接入68373374d91f173e2b1cde0e0b7ba3b2cc491870，按钮/悬停/无障碍名称及弹框统一「添加数据」。入口依据受权素材能力独立启用，共享上下文移到独立模块以保持热刷新实例一致；原项目/切页/身份与源图匹配、副本写入校验保持。未构建/lint/检查/测试/浏览器验收，无迁移/重启/Provider/扣费或生产操作；GG-342后台receipt67ffde7保持，本轮未重查。创建1/退役1，辅助工作区managed归档，无依赖缓存/子agent；用户刷新手验入口、预填及副本保存/下载。

- GG-343历史源码检查点：f09439732eeca6f8e28bc7e18adb6e5485cf5288；[GG-343](tasks/GG-343-cleanup-tooltip.md) GG-343已完成：隔离c8ce90c精确接入f09439732eeca6f8e28bc7e18adb6e5485cf5288；去除AI的title/aria-label仅为「去除AI识别」，移除积分、技术说明与该UI未使用常量导入。按钮短标签/处理中状态、即时执行及10积分服务端结算保持。仅源码/文档，未构建/检查/测试/浏览器验收，无迁移/服务/扣费或生产操作；GG-342既有后台启用receipt67ffde7保持，本轮未重查。创建1/退役1，辅助工作区managed归档，无依赖缓存/子agent；用户刷新5173手验。

- GG-342历史源码及现有后台receipt检查点：67ffde7161f51ec3c4f73ae9dedabe210156a138；[GG-342](tasks/GG-342-cleanup-activation.md) GG-342已完成源码与受权本地启用：隔离ffe0ab3精确接入67ffde7161f51ec3c4f73ae9dedabe210156a138；按钮只显示「去除AI」，每次10积分放入悬停提示/无障碍名称，点击立即处理，无确认弹框。必要构建通过，0064公告与0065清理按序应用到127.0.0.1:54449/goodgood（65段迁移），现有账户/资产/积分流水总数迁移前后相同，无fixture或数据重置。仅Web9448替换为34460/32131，唯一Worker23800/32142与Vite33440/5173保持；Web/Worker readiness五项ok、首页200、API代理verified67ffde7，新清理/公告/公告管理接口未登录返回401 SESSION_EXPIRED。功能、收费与公告实时效果仍待用户手验；未运行lint/typecheck/测试/浏览器验收、真实处理/扣费/Provider请求、公告发布/统计fixture或生产部署。创建1/退役1，managed辅助工作区已确认归档，无子agent/依赖缓存。

- 当前本地Web构建/运行receipt绑定上述67ffde7，后续交接文档提交不改实际运行身份；唯一Worker继续GG-330 verified94bee535。原GG-330及下方待启用段落为历史，本地启用事实以上述GG-342为准，生产保持原状。

- GG-341历史源码检查点：3579444f50d2568d065dd75bacacda5c5bd17cfc；GG-341「去除AI · 10积分」源码已精确接入3579444（隔离3c23d13，基线1c9ecbf，接入前8aaa0f9），保留GG-340铃铛及全部此前功能。JPEG/PNG内C2PA、EXIF/GPS及ComfyUI文本等统一清理；受权原图/幂等操作、个人充值来源/企业预算、ready副本和10积分同事务提交，失败回滚不收费；相邻画布副本/资产与余额刷新、跨页身份及未知结果原键恢复完成。元数据弹框移出清理按钮。ADR0138/0065及合成回归来源已写，未自动编译/lint/typecheck/代码diff检查/测试或浏览器验收，未SQL迁移/应用HTTP/Provider/后台/服务或生产操作；0064与0065和新Web需用户另行委托启用。创建1/退役1，managed辅助工作区已归档，干净无依赖缓存/子agent。运行receipt沿GG-330 verified94bee535/原Web/唯一Worker/Vite/数据/SMTP未重查。

- GG-340入口细化972303e→d4c1e80：画布纯铃铛/右上未读圆点，大厅标签与到达提醒保持；累计创建2/退役2，后续隔离已正常移除，未编译检查/测试或浏览器验收，公告后端启用仍待用户委托。

- GG-340历史源码检查点：d4c1e80d27a5167df444ebeda3be91963cea1986；[GG-340](tasks/GG-340-announcements.md)公告b25d670加顶部预留已实现，标题/Markdown/安全链接、灰阶有限提醒与非模态帖子流、站长生命周期/CAS、仅后台指标。真实启用与验收待用户另行委托，0064迁移/新Web未启用，未验证/未部署。独立分支codex/GG-340-announcements/55c9424保留，创建1/退役1，无自动验证/数据/服务或生产操作；保留另一窗口GG-339登记及GG-337/338，下面条目为已有能力与运行历史。

- 最新命名/模型布局 [GG-339](tasks/GG-339-prompt-reverse-ui.md)：从干净36542d8隔离8087311精确接入655213b，先补ADR0127/0130显示名/布局。右键/自动节点标题/连接名称与无障碍入口显示提示词反推，预设目录名称/菜单/Badge显示结构化提示词；内部textGenerator/structured_reverse及隐藏指令保持。底栏设置组和模型flex-grow取消，max-content模型按钮，极窄屏取消整行flex-basis；图标/箭头、名称省略、自然换行及发送靠右保持。既有GG297目录预期更新仅源码，创建1/退役1，managed辅助已归档，无依赖/子agent，未编译检查/测试/浏览器验收，无后台或运行更新。用户刷新手验，GG-338/337及GG-330运行receipt保持。

- 最新原始凭证提取 [GG-337](tasks/GG-337-original-download.md)：用户第二份JPEG含单段APP11/6335字节C2PA Manifest Store，声明Google生成式AI创建及不可见SynthID水印。独立读取claim/actions/hash/ingredient/签名与证书，按公开规范核验三条声明哈希、图片排除凭证后的哈希和随附叶证书公钥ES256 claim签名均匹配；未做完整信任链/撤销/时间戳或像素水印检测。原始二进制/完整解码JSON导出仓库外供用户查看，未修改/上传图片或改变应用代码/运行。前一副本仍确认无内嵌C2PA，但不是已确认同图配对，应用回归仍未运行。

- 最新下载文案 [GG-338](tasks/GG-338-download-label.md)：从干净17fae8a隔离08f3387精确接入98c82d4，两处右键「下载原图」改为「下载」，ADR0034/产品/交互/设计说明同步。只改文案，原始字节/目标/下载状态保持；创建1/退役1，managed辅助已归档，无子agent/缓存，未编译检查/测试/浏览器验收，无后台或运行更新。用户刷新手验，GG-337及此前源码/文件核验receipt保持。

- 最新实际文件核验 [GG-337](tasks/GG-337-original-download.md)：用户下载并提交无元数据JPEG，独立只读完整容器解析和Pillow解码一致：1792×2390、3,120,501字节，仅APP0/JFIF，APP11/APP1/APP13/COM与EOI后数据均0，全文件未发现C2PA/JUMBF/Manifest Store UUID及EXIF/XMP/IPTC标识。当前副本无内嵌凭证；没有原文件，不验证此前是否有凭证或像素/压缩流前后相同。实际文件不进入Git、不修改或外部上传；应用测试/编译/浏览器验收仍未运行，服务/数据/Provider保持。该只读检查不改变下方源码交付的验证边界。

- 最新原图下载 [GG-337](tasks/GG-337-original-download.md)：从已核验干净c09d623隔离18cb9aa，精确接入33525ab。ADR0034扩展画布图片/资产侧栏既有右键菜单；原始本地File Blob和受权私有原图统一交给浏览器，稳定ID读取不使用preview/source展示URL，实际点击批次输出定位，清理副本下载自身。MIME修正名称扩展名，下载中/失败重试、身份/工作区/画布切换取消读取；空白创建/编辑器原生/重命名删除保持。创建1/退役1、managed辅助已归档，无依赖/子agent；合成回归只写未运行，无编译/lint/typecheck/代码diff检查/测试或浏览器验收，无后台更新或运行/生产操作。用户刷新下载并发实际文件后再独立核验元数据；GG-336/335/334及GG-330运行receipt保持。

- 最新内嵌凭证 [GG-336](tasks/GG-336-c2pa-metadata.md)：从已核验242765d隔离fe750a6，精确接入4f686a1。先扩展ADR0136，独立检测JPEG C2PA JUMBF全UUID/label及instance/root header分组、重复LBox/XLBox/描述分片/跨扫描，PNG caBX；原清除动作处理可确定归属的整组/块，未知结构/分片序号歧义明确失败，不误删其他APP11。普通编辑保留原凭证字节并提示可能失效，坏EXIF恢复保留原凭证状态。弹框显示存在/未发现/未完成，未验签或判断AI，不处理水印/外部凭证；20MiB JPEG/PNG及原副本/朝向保护不变。创建1/退役1、managed辅助已归档，纯合成回归来源只写，无编译/lint/typecheck/代码diff检查/测试或浏览器验收，无依赖/后台/运行/生产操作；用户刷新手验，GG-335/334及GG-330运行receipt保持。

- 最新元数据入口 [GG-335](tasks/GG-335-remove-photo-extraction.md)：从已核验8bfa266隔离30f1a62，精确接入f411a48，覆盖ADR0136本地照片导入决定。取消按钮/隐藏文件选择器/Upload/fileRef，说明与空状态提示改为当前图编辑及手动填写/粘贴；实际参考图提取保留独立加载/错误文案。当前图自动读取、复制/粘贴、还原/清除、下载/保存副本及解析写入不变。创建1/退役1、managed辅助已归档，无依赖缓存或子agent；未编译、lint/typecheck、代码/diff检查、测试或浏览器验收，无后台更新或运行/生产操作。用户刷新手验，AI检测本轮仅说明技术与局限，不新增接口/上传/产品入口；GG-334/331及GG-330运行receipt保持。

- 最新缩放入口 [GG-334](tasks/GG-334-invisible-resize-corners.md)：核验982a460含GG-333，隔离cf79e22精确接入5c32b19，保留关联idle窗口源码。先补ADR0124/0135覆盖可见尺寸柄；组/共享Markdown复用图片resizeControl、透明空白按钮和仅键盘焦点轮廓，四角原生定位/方向光标/缩放补偿保持，移除斜线SVG与hover底色。文本四角键盘几何保持对边固定，尺寸夹限后仅移动实际变化量，旧右下size helper兼容；组内容约束/稳定回调/成员原位及GG-333居中不变。创建1/退役1、managed辅助已归档，无依赖缓存或子agent；回归来源只写，未编译/lint/typecheck/代码diff检查/测试或浏览器验收，无HTTP/SQL/provider/服务或生产操作。用户刷新手验，无后台更新，GG-330运行receipt保持。

- 最新组几何 [GG-333](tasks/GG-333-group-auto-centering.md)：核验2e5b6d0，隔离a4b59bf精确接入7baf03b。旧框内标题预留导致上60/下28，现标题外置，自动框按可见成员/标题/叠层上下28px，120px下限额外留白按中心均分，左右规则不变。实际content envelope与自动最小尺寸分离，手动框只扩展实际内容+间距，既有手动留白/位置保持，框修正重算相对坐标不移动内容。GG-325明确尺寸/完整测量/分帧/过期计划/死区保持，无新存储/API/后台更新。创建1/退役1、managed辅助已归档、零依赖缓存，必要回归只写未运行，未编译/检查或浏览器验收，无服务/数据/provider或生产操作。用户刷新手验，GG-332/331及GG-330运行receipt保持。

- 最新分组视觉 [GG-332](tasks/GG-332-group-toolbar-layout.md)：核验f86dd1b及GG-330/326祖先，隔离20d29a3/cc1a86b精确接入最新1c74ff8为a06a1fd/2d44a19，保留另一窗口文本宽度/菜单交互。ADR0135先补位置决定，四角改文本节点16px双斜线、32px命中范围/框内4px，清除居中translate并对应角落旋转/缩放原点；外置名称/emoji复用imageMetadata字号/间距，原改名/拖动保持。原生NodeToolbar在标题上方，emoji/手动时适应内容/解散按既有白灰快捷栏排列，选中关闭清理emoji开关，14px图标明确。仅组TSX/CSS及必要文档，无几何/存储/接口变化；创建1/退役1，managed辅助已归档，零依赖缓存，无编译/lint/typecheck/代码diff检查/测试/浏览器验收或运行/生产操作。用户刷新手验，无后端更新，当前后台receipt沿GG-330。

- 最新局部交互 [GG-331](tasks/GG-331-text-composer-spacing.md)：核验184458f，隔离12ac96d/cd5fe3d精确接入f241059/f86dd1b。文本生成chat480–640px、保留视口/资产边栏边界，固定底栏内距及12px模型/预设间距；原模态Select替换为现有非模态DropdownMenu单选，受控开关，输入点击/聚焦关闭且不抢焦点，切走节点/锁定关闭，预设同为非模态。仅TSX/CSS与设计/交互/手验说明，无产品决定/ADR/依赖/API/计费/存储变化，无后端更新；创建1/退役1，未构建、lint/typecheck、代码/diff检查、测试或浏览器验收，无HTTP/SQL/Provider/服务或生产操作。用户刷新手验，保留GG-330运行与前序任务。

- 最新运行恢复 [GG-330](tasks/GG-330-local-connection-recovery.md)：当前a254a01登记94bee5354e5b1a77516235ee894a19a42767610e并必要构建，原5173/Web/Worker与Docker均已停止，无明确退出原因。Desktop初启回到C盘空状态，正常停止后仅恢复CustomWslDistroDir原E盘，再启动原依赖healthy；没有盘/卷或数据库重置。任务/冻结/队列只读均0；Web9448/32131、唯一Worker23800/32142和Vite33440/5173可用，首页200/API代理verified94bee5354e5b1a77516235ee894a19a42767610e、readiness五项ok。云素材/local-mailpit及现有数据保持，当前Web包括组云校验，无迁移、测试/浏览器/真实请求或部署，创建0/退役0。用户刷新继续手验，下方旧运行/待激活为历史阶段。

- 最新上下文修复 [GG-329](tasks/GG-329-reactflow-context.md)：基线8c2997f，隔离7f0efdc/14ffdef精确接入47fd0b8/efe7aa6。CanvasWorkspace在工具Provider链外增加单一ReactFlowProvider，元数据useReactFlow与节点共享当前store；已安装xyflow复用外层上下文，初始化edges/空节点/10%–800%缩放保持。仅一个应用文件，无新产品决定/ADR/依赖/API/持久字段；创建1/退役1，未编译、lint/typecheck、代码/diff检查、测试或浏览器验收，无HTTP/SQL/provider/服务或生产操作，无后台更新。用户刷新手验，保留GG-328/326/327及前序任务。

- 最新文本生成细化 [GG-328](tasks/GG-328-text-generation-ui.md)：基线b8e8916、登记809d86b，保留并行5745472/3eb685d登记/交接后隔离698544b精确接入a9952d7。360–520px/视口限制的composer、上部独立滚动/固定底栏、八行prompt及焦点灰边/快捷键提示；模型/预设/明确生成和停止/20积分、窄屏换行及禁用原因统一。生成与Ctrl/⌘+Enter共用合并输入/可用素材/预设/pending/长度判断；现有准备/流式/恢复阶段反馈、文档等待骨架和结果双击/Escape提示，普通文本编辑可选展示参数默认保持。Impeccable沿既有Operate系统，创建1/退役1、零依赖缓存，无构建/检查/测试、浏览器/HTTP/SQL/provider/运行或生产操作，无新API/持久/计费/后端更新。用户刷新手验，保留GG-326/327及前序任务。

- 最新分组排版 [GG-326](tasks/GG-326-group-frame-controls.md)：基线b8e8916，隔离f1fc6a0精确接入最新c751455为37eef68，保留另窗GG-327/324及GG-325；共同文档冲突保留双方段落。完整Emoji Mart分类/搜索/最近使用/肤色与本地中文数据按需加载，既有锁定依赖显式声明，局部失败重试。中央透传/默认光标、标题/四边移动，选中四角原生缩放及内容约束/方向键；手动留白只扩展，可恢复适应内容，groupSizing快照/恢复/校验同步。创建1/退役1、managed辅助工作区已归档，零依赖安装缓存，回归来源只写，未编译检查或浏览器验收，无服务/数据/provider或生产操作。另窗GG-328独立目录保持；用户刷新手验，云字段仍待另外受权Web激活。

- 最新图片文件工具 [GG-327](tasks/GG-327-image-metadata.md)：基线8e9eeb8，独立a792534/51227f7合并范围为ae12b1c，精确接入27ec47a/5a488cc，保留b8e8916的分组修复/对比与共同文档。ADR0136先记录；JPEG/PNG EXIF/XMP常用相机/镜头/曝光/时间/作者/GPS预填、照片/实际参考提取、JSON复制粘贴、还原/清除、下载/保存副本完成。无依赖、数据库或生成接口变化；createCopy复用既有上传/重试/素材及项目同步，普通文件压缩像素保留，清除朝向EXIF时生成视觉朝向保持的PNG。回归只写未运行，创建1/退役1，辅助工作区已归档，零依赖缓存；无编译/检查、浏览器、服务/数据/provider或生产操作，用户刷新手验。另窗GG-326只在其独立分支继续，不含在本次交付。

- 最新分组修复 [GG-325](tasks/GG-325-group-resize-loop.md)：基线8e9eeb8，隔离d6aadee精确接入faaad8a，保留已完成另窗GG-324。截图报错仅有覆盖层调用栈，未浏览器复现；修正浮点/百分比组尺寸及不完整测量重包围条件：向外取整、明确width-height、框absolute/inset、原生组/成员measure就绪，持久坐标及下一帧写入/过期计划取消，一像素死区。必要回归只写未运行，不屏蔽全局错误；创建1/退役1，辅助工作区已归档，零依赖缓存，无编译检查、数据/服务/provider或生产操作。用户刷新重试建组；组云字段仍待受权Web激活，无SQL/Worker更新。

- 最新图片工具 [GG-324](tasks/GG-324-canvas-image-compare.md)：基线ba73fea，登记d8dc0d6→4e32799，隔离cdf6c02/97fd038精确接入da10928/3e34fa7；保留另一窗口GG-323及其文档。三类图片节点快捷栏裁剪右侧对比，当前图固定右侧、真实所选输出job.input参考优先左侧，资产按实际名称/日期及搜索；50%分界hover随鼠标、触屏/方向键/Shift/Home/End，居中等比完整适配。独立Dialog/有界2048预览池和原512缩略，无上传/生成/积分或持久字段；局部空/加载/失败、关闭回焦点/页身份清理完成。Impeccable沿既有Operate系统，创建1/退役1、零依赖缓存，无构建/检查/测试、浏览器/HTTP/SQL/provider或运行/生产操作，用户刷新手验，无需后端更新。

- 最新分组源码 [GG-323](tasks/GG-323-canvas-groups.md)：基线0b5744d，快进保留另窗ba73fea；隔离2d51561精确接入2fa0486，ADR0135先记录。自定义灰组框复用原生parentId移动、选择工具栏/快捷键建组、名称双击编辑和左侧emoji，成员单独编辑/连线及可见展开范围；解散/删除框、复制与裁剪、快照/云校验/恢复/封面及每页历史完成。必要回归来源只写未运行；创建1/退役1，辅助工作区已归档，无依赖/缓存或运行变化。用户刷新手验，本机恢复可用；新云组字段须另外更新Web，无SQL迁移或Worker变化，GG-322运行receipt保持。

- 最新修复/运行 [GG-322](tasks/GG-322-image-slot-sync-compatibility.md)：登记e2f228c，隔离9920bde精确接入0ce2360；不再以INVALID_CANVAS_PROJECT且含slots推断服务版本，显示实际平台错误/明确本机与云状态。截图根因是旧Web419b097无新imageSlots校验，保存失败不阻断生成提交；用户授权构建0b5744d并仅替换Web28248→25664，32131/5173版本verified、Web readiness均ok，已有槽云校验生效。唯一Worker419b097/Vite/原数据/SMTP保持，创建1/退役1，无检查/测试、浏览器、SQL/provider或生产操作。用户刷新手验；下方GG-321待启用为当时阶段。

- 最新插槽交付 [GG-321](tasks/GG-321-image-result-slots.md)：基线ca54019、登记aa4967f，子隔离4398d08精确接入4489d1d，15文件；固定结果位置/先本机flush请求key、独立count1并发、中央单槽重试及未知幂等/旧count4/Seedream层恢复。云imageSlots规范输入/受权保存及旧Web本机提示完成，回归来源只写不运行。创建1/退役1，辅助工作区零依赖/缓存正常Git移除，子结束；无构建/检查、浏览器、SQL、provider或运行/生产操作，用户刷新手验，新云字段须后续Web激活，无迁移/Worker更新。

- 最新只读邮件核对 [GG-320](tasks/GG-320-local-email-delivery-audit.md)：当前投递local-mailpit，11:18登录验证码已在本地58045收件箱，非真实QQ投递；无配置/服务变化，GG-319当前运行和手验目标保持。


- 最新恢复 [GG-319](tasks/GG-319-local-restart-after-reboot.md)：GG-319电脑重启恢复完成：Docker原E盘数据目录恢复，原依赖healthy；构建419b097，Web28248/32131、唯一Worker28236/32142和Vite33312/5173可用，API代理verified、readiness均ok。GG-318已启用，无迁移/数据重置/测试/真实请求或部署，用户继续手验。 构建receipt严格绑定419b097，后继文档不改变已运行身份；再次重启按GG-116当前HEAD构建和核对Docker原E盘目录，不启动旧GG-226 Worker。


- 最新失败诊断 [GG-318](tasks/GG-318-generation-failure-diagnostics.md)：基于ea71443，登记4a2017f→9121d32，隔离4443b25精确接入a627d7f；ADR0074先扩展站长脱敏白名单，诊断非枚举不改变终态确认，现有provider_failed/provider_fallback事件记录阶段/尝试/HTTP/上游/路由。总日志详情受权读取最多50条并再次脱敏，历史/旧Web兼容。创建1/退役1，无依赖/缓存、编译/检查、测试、浏览器、真实请求或激活；无迁移或请求/积分变化。下次明确委托时同步激活Web及唯一Worker，新失败才有诊断，不能回填历史；当前运行沿GG-309及GG-317证据保持。

- 最新只读排查 [GG-317](tasks/GG-317-canvas-three-prompt-audit.md)：当前源码d4894f6/原运行身份不变；核对本地真实画布/3条job及attempt，摸头/坐着成功、半蹲CAPACITY_BUSY无provider_task_id，账本reserve -20/release +20净0。分隔逻辑无两组上限，原始HTTP状态未保存，不断言具体429。创建0/退役0，无代码、运行、数据或真实provider请求；用户可单段重试，完整证据见任务卡。

- 最新入口修正 [GG-316](tasks/GG-316-canvas-view-icon-consistency.md)：基于36c345e，登记5b05e92→fd69d74、隔离04aa7e0精确接入3a823d8；ADR0123先补固定屏幕尺寸及实色背景，共用查看按钮以1/zoom补偿及边距定位，共享expand背景#fff。原图标/hover/focus/触屏/详情和300%高清门槛保持。创建1/退役1，无编译/检查、API/迁移/运行或生产操作，用户刷新手验；GG-315及GG-309运行保持。

- 最新修复源码 [GG-315](tasks/GG-315-text-template-media-error.md)：基于0ae7e68，登记42d1c62、隔离c42ef94精确接入5be1e21；AssetMedia原仅排除audio导致text无URL初始failed被误报为图片失败，条件改为明确image/video。仅一个展示条件和错误说明，原文本缩略/全文自身错误、图片/视频回退/重试保持，不改变已确认决定，无新ADR。创建1/退役1，无编译或验证、API/数据/运行或生产操作，用户刷新手验；GG-314/313/312/311及GG-309运行保持。

- 最新图片入口源码 [GG-314](tasks/GG-314-canvas-image-view-button.md)：基于31d55ed，登记b423afd→349070a、隔离3294d11精确接入0a66ee3；先补ADR0123恢复独立hover查看入口。共用Button/资产expand及visualFrame样式，三类图片/批次对应已有ImageViewer、私有原图/本地源和真实job.input元数据，按钮阻止拖动/节点点击/快捷键，关闭回焦点，裁剪/未就绪禁用，原叠图定位保持。创建1/退役1，无编译/检查、API/迁移/运行或生产操作，用户刷新手验；GG-313/312及GG-309运行保持。

- 最新命名源码 [GG-313](tasks/GG-313-prompt-template-name-guidance.md)：基于ebfbd83，登记a04caf9、隔离215422f精确接入024e139；ADR0133先记录用户接受的用途_主题_风格建议，共享名称框初始空白并显示商品主图示例，示例不是输入值，原空名禁用与自定义命名保持。仅共享TSX和设计/交互说明，无新限制或存储变化。创建1/退役1，未编译或验证、运行或生产操作，用户刷新手验；GG-312/311及GG-309运行身份保持。

- 最新清晰度源码 [GG-312](tasks/GG-312-canvas-preview-zoom-threshold.md)：基于93fdc2f，先补ADR0132并登记19aad19→2992b99，隔离0921ca9精确接入aeff94d；统一zoom>=3/180ms稳定，低于300%立即露出512，去除原560/420像素条件及尺寸观察。视野/隐藏叠图、最高2048、双层加载/失败及身份缓存保持。创建1/退役1，无编译/检查、后端/运行或生产操作，用户刷新手验；GG-310/311及GG-309运行保持。

- 最新交互源码 [GG-311](tasks/GG-311-prompt-template-save-and-asset-filter.md)：基于a3eb6f5，登记07d867d、隔离232ce8e精确接入6e089c3；ADR0133先补覆盖决定。弹窗标题/名称/保存，不预览；受权保存确认后资产入口2.5秒灰阶动效/短提示，减少动态效果静态，失败/删除不触发。画布资产右上×改Radix类型筛选，现有文件夹选择联合媒体过滤，空结果可恢复全部，文件夹卡/拖入/权限及资产列表1:1文字缩略保持；菜单/弹窗Escape优先。创建1/退役1，必要回归来源只写未执行，无编译或验证、API/迁移/运行及生产操作。当前实际Web287c4ca/本地0063身份沿GG-309记录。

- 最新修复源码 [GG-310](tasks/GG-310-text-template-dialog-copy-color.md)：基于287c4ca，登记a19be42、隔离45bbba9精确接入c3ba0d2，保留另窗GG-309 f5b0b59；重复保存说明改为sr-only，模板弹窗操作区按variant显式指定取消ink、保存action-fg。仅共享TSX/CSS及设计说明，原存储/工具栏/预览保持，无新ADR。创建1/退役1，未编译或验证、运行或生产操作，用户手验；运行receipt仍见下方GG-309。

- 当前运行检查点 [GG-309](tasks/GG-309-canvas-preview-activation.md)按用户重启请求，已构建并启用verified 287c4ca、本地Web40244/必要0063；动态最高2048预览、GG-303云端批量校验及GG-308文本API生效，用户手验。仅修复实际构建阻塞的重复zoom声明，Vite27464/唯一Worker31280、cloud-development/local-mailpit及数据保持；创建2/退役2，无测试、浏览器、真实provider请求或生产操作。构建完整指纹及时间见任务卡；文档后继不改变已运行receipt，后续重启先构建新HEAD。下方源码交付时的待启用描述均为历史阶段。

- 当前功能源码 [GG-308](tasks/GG-308-canvas-text-template-assets.md)：基于e7e1f6f，登记61895c5后隔离e95c52c精确接入4317bdb；文本节点selected只显示设置模板快捷栏，canEdit才显示格式栏，空/生成或恢复中禁用保存。命名弹窗冻结完整Markdown/纯文本及UUID，新增私有text资产API/0063、幂等冲突/owner-workspace权限与整理删除，列表摘要和全文分开。两处资产UI的1:1文字缩略/全文查看、原整理删除，资产页下载Markdown、画布原重命名及拖入独立textEditor复用完成，原图保存/撤销保持。ADR0133先记录决策，必要回归来源只写未运行；创建1/退役1，无编译/验证、运行或生产操作。持久保存需后续Web/0063启用，GG-306/307及前序源码保持。

- 当前显示源码 [GG-306](tasks/GG-306-canvas-adaptive-preview.md)：基于5a4fb15，隔离3e75204精确接入f004e5f，保留并行GG-307 ebd8ace；ADR0132将画布显示分512及最高2048两档，资产拖入不取下载地址，上传/结果共用显示组件，视野/屏幕需求及180ms迟滞控制高清，保留小图层、共享3并发/8闲置URL身份缓存。新canvas-preview复用私有鉴权并返回等比最高2048 WebP，原图/列表/附件/裁剪及模型输入保持。实际尺寸独立于预览，保存重开沿原ID。创建1/退役1，无编译/检查或运行/迁移变化，回归来源只写未执行；新高清接口待更新Web，旧Web保留512，用户手验。

- 当前修正 [GG-307](tasks/GG-307-hide-banana-thinking-details.md)：基于09dbe13，登记e3fdb6d后隔离0e6d4f2精确接入ebd8ace；移除详情中的思考条目，包括Nano Banana 2 high记录。先补ADR0123覆盖GG-305的高思考显示规则，仅改展示/既有回归断言，生成请求/快照和其他参数保持。创建1/退役1，未编译/验证或运行变化，用户刷新手验；GG-306独立工作区保持。

- 当前修复 [GG-305](tasks/GG-305-canvas-viewer-used-parameters.md)：基于1387b4c，登记ea78337后隔离167e864精确接入5a4fb15；详情参数按图片对应job.input、模型能力与provider发送条件筛选，Banana/Seedream无GPT专属项，空参考图/未开启搜索及低思考占位隐藏，GPT有效记录值和具体型号质量范围保留。仅元数据组装/回归来源与ADR0123细则，无生成/存储/后端/布局变化；用户确认预设暂不处理。创建1/退役1，未编译/验证或运行变化，用户刷新手验。

- 当前样式 [GG-304](tasks/GG-304-canvas-connection-drag-flow.md)：基于31be3bd，登记a91b200后隔离30790ea精确接入0ad78b0；临时connection-path复用hover亮蓝/7 4/1.3s流动、reduce亮色静止实线，原贝塞尔/线宽/完成线/连接校验及剪刀保持。先补ADR0108与AGENTS/设计/交互规则，无TSX/后端/图存储变化；创建1/退役1，未编译/验证或服务变化，用户刷新手验。

- 当前源码 [GG-303](tasks/GG-303-canvas-prompt-batches.md)：基于03e1b43，隔离88ddc4f在93d731a/GG-302排查之后精确接入为b4a5d6e；图片生成识别`---`/`———`/`－－－`单行，原生hr输出分隔符，空段忽略、参数冻结并发，各段当前图片数/权威报价乘积，不新增批量上限。原节点顺序聚合/活动锁/单段重试，裁剪及图像输入沿各实际结果；JSON有序jobIds/localJobs、全任务权限与刷新恢复，无SQL迁移，原单段4000按段处理。创建1/退役1，无依赖缓存/编译/检查/服务或生产变化，GG-292撤回保持；用户手验，云端批量保存须更新Web后启用。

- 最新排查 [GG-302](tasks/GG-302-canvas-image-quality-audit.md)：以03e1b43只读追踪画布→生成响应→私有preview→存储/已运行Worker，确认画布生成图片使用512px最长边/quality80 WebP且放大不切原图；原生成bytes未重采样，实际像素元数据与请求2K分开。仅排查及文档，未修改代码或运行，创建0/退役0；后续若优化应仅改画布大图读取，保留卡片预览策略，原GG-301及GG-300运行保持。

- 当前源码 [GG-301](tasks/GG-301-text-divider.md)：从b3844d2隔离，6b56d36在GG-300后继d174d54后精确接入为9217c10；有序列表后、撤销前新增分割线，复用StarterKit原生命令，hr显示1px细灰线，Markdown/选择/历史/原编辑与流式锁保持。补充ADR0124，无依赖/后端/迁移或服务变化；创建1/退役1，未编译/验证，用户刷新5173手验，原GG-300运行身份及GG-292撤回保持。

- 当前启用 [GG-300](tasks/GG-300-preset-activation.md)：基于d3a4717，隔离登记a708816精确接入b3844d2；用户授权预设启用且无额外费，checkpoint构建成功、本地仅0062及Web33072→33840已启用预设/保存校验与中断策略。32131/5173版本均verified b3844d25a7a4328d71bf79e9196ecdbbc18a504e，匿名preset-stream合法Origin返回401；无真实生成/测试或生产变化。Vite27464/Worker31280保持，创建1/退役1，临时启动器备份已清理，下一步用户手验；构建指纹见任务卡。

- 当前源码 [GG-299](tasks/GG-299-text-image-preview.md)：基于025196e，隔离d8b40d7精确接入GG-116/5173；文本生成图片hover显示PrivateObjectImage放大图，直接复用图片生成referencePreview样式，保留取消按钮、文本/视频提示。创建1/退役1，无编译/检查或运行变更，用户手验。用户随后明确委托启用GG-297预设，沿原文本生成20积分，无额外预设费用；本地启用工作待后续任务登记。

- 当前源码 [GG-298](tasks/GG-298-text-input-remove.md)：基于e8b26df，隔离884ffdd精确接入GG-116/5173；文本生成图片/文本/视频缩略右上角X，hover/焦点显示及触屏常显，复用removeLinkedReference移除对应连线/撤销/图保存，保留源节点及素材。生成/恢复请求及不可编辑时禁用；无新增上传或生成调用。创建1/退役1，无编译/检查、后端/迁移/服务或生产变化，用户手验。

- 当前源码 [GG-297](tasks/GG-297-text-generation-presets.md)：基于7230935，隔离448c1ed→GG-116 0648cd5；ADR0130扩展模型旁预设，首项structured_reverse/结构化反推，输入区灰Badge可移除、附加文本可空且草稿保持。仅ID/名称进入客户端，后端展开精确指令/长度校验/幂等快照；原JSON草稿复制/保存恢复保留ID。新preset-stream与普通生成共享边界，旧Web404拒绝，避免忽略预设后计费。创建1/退役1，无自动检查、构建/迁移/服务或生产变化；后端与GG-296新0062待委托启用。

- 当前源码 [GG-296](tasks/GG-296-text-cancel-half-credit.md)：基于9a122fd，隔离c16e3bd→GG-116 7b7c9d7；ADR0129取代取消全退，后端行锁/终态确保中断10退款10，成功20、系统失败及租期回收全退，个人资金来源及企业成员额度一致，消费记录/汇总按实际净额，历史取消不追扣。前端停止/取消恢复无左下角解释，实际失败继续显示。新0062只写源码，与GG-292撤回迁移无关；创建1/退役1，无自动检查、构建、迁移或服务/生产变化。下一步按明确委托启用后端并由用户手验。

- 当前修复 [GG-295](tasks/GG-295-text-generation-tooltip.md)：基于d7147c5，隔离2cd651c→GG-116 45c0155；文本生成节点自身根部提供180ms TooltipProvider，覆盖空态/结果和选中NodeToolbar的输入预览，Provider不增加DOM包装。创建1/退役1，无依赖/缓存、自动编译/检查、真实请求或服务/数据库变化；下一步用户刷新点击已有节点复验。

GG-291停止收尾保护同属当前构建：完成后仍在打字时以服务器终态保留成功结果，迟到取消响应不覆盖后一次请求或用户随后的编辑；GG-294仅执行用户委托构建和本地运行启用，没有自动测试或真实生成。

- 当前交付 [GG-294](tasks/GG-294-text-generation-test.md)：基于a15f636，隔离79db1ed→实际GG-116 767e6db。创建1/退役1，无子目录缓存；构建成功，0061新增迁移完成且不运行fixtures，仅替换Web4552→33072，Vite27464/5173和Worker31280/32142保持。两Web版本端点均verified，匿名文本任务GET为401；下一步用户手验，未部署。构建指纹与时间见任务卡。

- 当前源码 [GG-291](tasks/GG-291-canvas-text-generation.md)：基线0e9de05/登记bcfd337，隔离d41e5d3→当前046fa5d/2f6a91f/a15f636，集成于GG-293恢复后fdd13ae。默认拖动/双击编辑，Claude默认/五模型/high、唯一图文视频端口、流式打字/停止/结果编辑及复制/多页/保存恢复、独立文本任务与20积分预留结算/释放；GG-294已构建启用0061/新版Web。源码交付当轮创建1/退役1/零缓存，真实效果待用户手验，未部署。

- 当前源码 [GG-293](tasks/GG-293-revert-prompt-limits.md)：从e06c2aa登记ea7915e，隔离70302b3→实际GG-116/5173 fdd13ae，只恢复GG-292涉及路径至c7c9a57的既有实现，不reset或改写历史。新模型策略/32,000存储/计数建议/全文预览排序与未执行0062已撤回，原有组合4,000/文本16,000规则恢复，ADR0128 Withdrawn、ADR0124恢复。创建1/退役1，未编译/验证；Web/Worker/0060、前序编号/选择/粘贴/裁剪及GG-291独立目录保持，不再要求GG-291保留取消方案。

- 最新文本编号 [GG-290](tasks/GG-290-canvas-text-editor-order.md)：基于`ee4c01e`，登记`b16b417`，隔离源码`b1530e5`→`8675cd9`；当前页文本节点从1连续编号，新建/复制排后，删除闭合间隙，重开沿用已保存顺序。创建1/退役1，未编译/检查，无服务/生产变化，用户手验；旧项目/提示词/裁剪交付保持。

- 最新选区修复 [GG-289](tasks/GG-289-canvas-text-selection-padding.md)：基于`72fb61c`，登记`c82b36d`，隔离源码`e484b71`→`8521bcc`；原padding移至Tiptap可编辑元素，书写外层允许选字，撤去点击focus(end)，保持间距/滚动/占位。创建1/退役1，未编译/检查，无服务/生产变化，用户手验；并行裁剪交付保持。

- 最新裁剪尺寸 [GG-288](tasks/GG-288-canvas-crop-preset-pixels.md)：登记`11d5326`，隔离源码`bd04081`→实际GG-116 `4017ceb`；带W×H预设按目标宽度及自身比例设置真实像素选区，超出原图则等比缩小，通用比例仍取最大区域；遮罩、W/H及导出复用实际选区。创建1/退役1，ADR0126已更新，未编译/验证，无服务/生产变化，用户手验，GG-287/286保持。

- 最新粘贴修复 [GG-287](tasks/GG-287-canvas-text-paste.md)：登记`a9418e4`，隔离源码`8bdc976`→`cc20e8d`；Markdown使用开放Slice替换选区，按光标接续单行，保留多段格式及富文本/代码块原生处理、粘贴元信息。创建1/退役1，未编译/检查，无服务/生产变化，用户手验；GG-286源码及`96557dd`交接保持。

- 最新裁剪细化 [GG-286](tasks/GG-286-canvas-crop-action-color.md)：隔离源码`7a7933d`→实际GG-116 `dcfa3ce`；新会话比例解锁，不自动锁原图比例，通用移除自由/原始比例且3:4置于2:3上方；完成及处理中局部使用action-fg浅色前景。创建1/退役1，未编译/验证，无服务/生产变化，用户手验，ADR0126已更新；并行GG-285/287保持。

- 最新入口收起 [GG-285](tasks/GG-285-hide-generator-reference-add.md)：基于`6d230bf`，登记`5535022`，隔离源码`c3414a3`→`e7ac61a`；仅关闭添加按钮与空附件占位，图片/文本连线和既有预览保持。创建1/退役1，未编译/检查，无服务/生产变化，用户手验。

- 最新裁剪读取修复 [GG-284](tasks/GG-284-canvas-crop-image-fetch.md)：`592c3e6`→`07e1ba3`；生成图解析download-url后直接无凭据读取，签名/字节请求可取消；共享本地桶此前仅32131，已备份并补两种5173 Origin，预检200/匹配ACAO，null仍403。Worker启动也保留5173，忽略启动器同步，无服务重启/构建；定向7/7，真实浏览器复验由用户完成。创建1/退役1，并行GG-283保持，初始撞号已纠正。

- 最新参考复用 [GG-283](tasks/GG-283-generated-reference-reuse.md)：登记`689d7c4`、隔离源码`4fa31f5`已精确集成；前端同assetId共享进行中请求/成功结果，取消一边不影响其他边、失败可重试；后端延迟原图读取/处理至源资产锁及已有副本检查后。前端接入5173，服务端待构建重启；创建1/退役1，无自动编译/检查，无API/SQL/生产变化。

- 最新裁剪 [GG-280](tasks/GG-280-canvas-image-crop.md)：子`7c35dac/7af5bce`→根`a66b46d/a801b6b`→实际5173 `34f10b0/80a7e5e`；名称行上方快捷栏、展开批次定位、图上选区/预设面板与实际像素裁剪File，沿用私有上传/本机恢复/项目保存。新增五组国内/电商预设，无LinkedIn；创建2/退役2，零依赖/构建缓存，未自动编译/检查，用户手验，未部署。

- 最新弹框修正 [GG-282](tasks/GG-282-canvas-folder-rename-dialog.md)：`85b1e88`及后继`88a67a5`/`47940b1`已精确接入5173，统一弹框、标题“重命名”；保存仅局部名称更新、固定按钮宽度及preventScroll恢复焦点，提交保护保持。累计创建2/退役2，未运行编译/检查，用户手验，并行GG-280裁剪保留。

- 最新资产样式 [GG-281](tasks/GG-281-square-canvas-folders.md)：`995359c`→`b560f33`将文件夹样式从data-slot依赖改为button.folderCard，恢复1:1正方形及完整交互/移动状态，已接入5173；创建1/退役1，无服务/后端变化，未自动编译/检查，用户手验。并行GG-280裁剪保持开发中；本任务初始撞号已修正。

- 最新文本缩略 [GG-279](tasks/GG-279-text-reference-thumbnails.md)：文本输入改为54×54px图标缩略，默认隐藏文件名/字数，复用悬停/焦点预览与移除，混合端口/提示词合并保持；已接入5173，创建1/退役1，无后端/服务变化，未自动编译/检查，用户手验。

- 最新入口精简 [GG-278](tasks/GG-278-reference-add-icon-only.md)：移除添加按钮的可见“参考图”文字，仅保留图标，1:1尺寸与预览/上传保持，已接入5173；创建1/退役1，未运行编译/检查，用户手验。

- 最新缩略调整 [GG-277](tasks/GG-277-square-reference-thumbnails.md)：`ad36891`→`07de752`，参考图片缩略与添加入口均为54×54px正方形，悬停预览保持。创建1/退役1，无服务/后端变化，按用户要求未编译或检查，用户手验。

- 当前文本布局 [GG-275](tasks/GG-275-text-editor-layout.md)：从干净`3bbf42e`核验祖先后建立`fix/GG-275-text-editor-layout`，根agent写入/子agent只读。外置元信息/完整书写区、框内右下双斜线32px柄，正文固定14px，精简三项工具栏，旧Markdown保持；修正文本真实尺寸保存。读取GG-276约定前已完成45/45相关检查、局部lint零错误/3既有警告、实际模块200，之后停止自动检查；创建0/退役0，无后端/服务/迁移变化，用户手验。

- 当前纠正 [GG-276](tasks/GG-276-restore-reference-previews.md)：`cb6a4a0`→`3920306`恢复图片生成器54×68px真实缩略与悬停/焦点预览，文本附件/唯一混合端口保持；创建1/退役1，无后端/服务变化。用户要求本次及后续不自动编译/代码检查，手验由用户负责；并行GG-275未提交内容保留。

- 本次恢复 [GG-274](tasks/GG-274-local-restart-after-reboot.md)：从`80b8c0f`必要构建/来源核验后恢复Web，唯一Worker复用`70e10c6`；5173首页/画布/API代理200、两角色readiness五项ok，启动前任务/outbox/冻结/两队列0，迁移0060/原卷保持，WinNAT已恢复Running。创建0/退役0，无产品决定变化。

- 当前画布收口 [GG-273](tasks/GG-273-canvas-editor-inputs.md)：`17ec871`→`e7ae650`、测试`f7369f5`→`f51b6ba`/`397d735`→`b9ce4bf`；文档页头/书写区/状态栏及H1-H3，圆点直接复用原class，生成器仅reference接收图片/文本；旧text目标边保存/恢复规范化。统一160×52px图片/文本/视频附件卡与文件图标，预览/删除/重试保留。相关30项、类型/局部lint/实际模块/必要Web通过，创建1/退役1，无新依赖/SQL/Worker/生产变化，用户验收。

- 当前资料/品牌：[GG-272](tasks/GG-272-account-created-and-brand-row.md) `c4b10b8`：个人信息新增真实只读创建时间（北京时间），桌面字标下移与项目标题同水平线、保留GG-271左侧对齐。22/22、局部lint/三个模块编译与必要Web构建通过，创建1/退役1、无子缓存；Web/5173为verified `c4b10b8`，0060/原云配置/唯一Worker保持，用户验收，未部署。

- 当前文本节点 [GG-268](tasks/GG-268-markdown-text-node.md)：`2580389`及`6238846/804e5dd/6f4b482`，可视化Markdown/选中格式栏/缩放排版、独立text端口、接收预览与前置提示词合并；旧图片参考/自身附加描述保持，多页JSON保存恢复与复制接线。本任务13/13、组合52/52、类型/局部lint/实际模块/必要Web通过，创建1/退役1，ADR0124，无真实生成或浏览器验收。
- 当前资产菜单 [GG-270](tasks/GG-270-canvas-asset-context-menu.md)：子`8e177e6`→根`b1b3d1c`，文件夹自动编号创建/右键改名，所有已保存素材右键删除与既有改名入口；确认/失败保留/刷新、删除文件夹保留资产保持。子19/19/根组合52/52，创建1/退役1，无API或SQL变化。

- 品牌历史收口 [GG-269](tasks/GG-269-wordmark-only.md)：从`001ac1b`隔离修改，`f51777b`→`c30ccb3`；大厅桌面/移动移除独立G，仅保留108px字标，清理图标样式/间距/占位。源码/diff和实际页面/CSS编译通过，创建1/退役1、无缓存，ADR0116/AGENTS/DESIGN_SYSTEM已同步；后续对齐以GG-271/272卡为准。
- 当前字标比例 [GG-267](tasks/GG-267-compact-lobby-wordmark.md)：从干净`27bd4f4`核验祖先后建`fix/GG-267-compact-lobby-wordmark`，源码`0dfd499`。132px收至108px、间距8px，品牌按钮fit-content，移动组合142px；只改三个样式与两处尺寸。源码/diff和实际页面/CSS编译通过，创建0/退役0，无服务/后端变化，用户视觉验收。
- 当前字标交付 [GG-266](tasks/GG-266-geometric-good-good-wordmark.md)：从`26b28af`隔离开发，`b7f27e8`→`4756c7b`；沿用图标G几何的Good Good本地SVG，放在大厅桌面/移动图标右侧，响应式收缩与首页行为保持。SVG解码、局部lint零错误（11既有警告）、实际页面/样式/字标HTTP200通过；创建1/退役1、无依赖/构建缓存，ADR0116/DESIGN_SYSTEM已同步。
- 当前移动修复 [GG-265](tasks/GG-265-canvas-folder-move-membership.md)：从干净`2ff0113`/登记`26b28af`建立子树，`fb7cc90`→`b1f364c`。画布根层过滤已归档素材，确认成功从原位置消失、目标保留同一身份，失败保留及重读/失效归属恢复完整；子与根12/12、局部lint/两模块编译通过，创建1/退役1，无缓存/API/数据库/服务变更。
- 当前图片详情交付 [GG-264](tasks/GG-264-image-detail-fill-and-centered-rail.md)：初版`1c9ae74`后用户澄清，从`f10e8b1`隔离修正`c48e68e`→`5409cce`，恢复初次打开/换图/复位完整contain适配，放大可铺满整个舞台；无计数/缩略图动态居中和并行GG-263保持。本轮16/16、相关lint/两模块编译通过，累计创建2/退役2、无缓存，无Web/数据库变更。
- 当前资料交付 [GG-262](tasks/GG-262-profile-inline-edit-layout.md)：从`c0d8d08`/登记后`ee2c9fc`建立隔离分支，`3338fa9`精确回放为`2f0d8fd`；透明下划线编辑、稳定文字/动作网格、无可见滚动条及统一14px图标。12/12、局部lint/两个实际模块编译通过；创建1/退役1、零子缓存，无Web重建/数据库变更，用户验收。
- 当前交付 [GG-260](tasks/GG-260-credit-details-and-free-quota.md) / [GG-261](tasks/GG-261-daily-free-image-quota.md)：从 `c6f6bb9` 登记并创建两子树；UI `dbe7f38`→`e1d7f61`，来源 `936da92`→`d9e5aff`，根接线/微秒分页修复 `9f9d788`。UI15、生成12、来源/M615、账户/报价/导航24、隔离SQL1均通过；相关lint零错误（画布7既有警告）、实际模块编译通过。0060与verified Web完成，子树创建2/退役2、无缓存；免费额度尚未实现/发放。
- Task [GG-258](tasks/GG-258-canvas-detail-minimal.md)：从干净 `821705e` 核对祖先后建立 `fix/GG-258-canvas-detail-minimal`；移除缩放按钮/倍率及无用样式，非生成素材只展示标题和已知尺寸。SSR/导航 10/10、相关 lint 零错误/警告、三个 Vite 模块编译 HTTP 200；保留滚轮/拖动/键盘及真实参数，无新 worktree/依赖/缓存。
- Task [GG-259](tasks/GG-259-random-user-id-stable-edit.md)：独立 `d4ec0be` 回放为 `c6f6bb9`；现有/新增随机六位数字、不重号，常驻铅笔、下方提示预留换行高度。12/12、两组隔离 SQL 2/2、相关 lint、本地 0059 完成，创建 1/退役 1（初始编号/路径更正一次），API 兼容原 Web，不重建服务。
- Task [GG-254](tasks/GG-254-account-identity-editor.md)：子 `bbf26d5` 精确回放为 `422c32f`；用户名默认 mimi、后端六位 ID、内容文字编辑、局部确认/外部撤销、头像确认后上传，撤去个人主页。定向 20/20、资料 SQL 1/1、ID SQL 10/10、相关 lint 完成；0058 与 verified Web `41df2dc` 同步，创建 1/退役 1。
- Task [GG-253](tasks/GG-253-canvas-media-detail.md)：源码 `896bce2`；素材信息独立列、完整适配后的图片平移/滚轮缩放、原比例图片视频缩略列，选中项轻微向左抽出。22/22 导航/播放与 3/3 SSR、相关 lint、五个实际 Vite 模块编译通过，无新增依赖/缓存。
- Task [GG-255](tasks/GG-255-canvas-paste-image.md)：子 `c7d878c`/`31f5290` 精确回放为 `41df2dc`/`d4ea42c`；原生图片 Ctrl+V 复用拖入上传/节点/持久化，body 焦点可直接粘贴，输入/弹层隔离，保留内部复制。子与根 19/19、相关 lint 零错误、四个 Vite 模块编译通过；创建 1（初始路径改名 1 次）/退役 1。
- Task [GG-256](tasks/GG-256-canvas-folder-drop.md)：子 `df7cdf4` 回放为 `5183287`；图面默认光标、查看按钮 grab、图片拖入既有文件夹，pending/成功/失败重试和减少动效完整接线。子与根 8/8、相关 lint 零错误/警告、三个 Vite 模块编译通过；创建 1/退役 1。
- Task [GG-257](tasks/GG-257-canvas-edge-hover-flow.md)：子 `53f1934` 回放为 `6f63a8f`；CSS 覆盖原 animated 基态为静止实线，连线/剪刀 hover 才流动，reduced motion 始终静止。源审阅、实际 Vite CSS 编译通过；创建 1/退役 1，不改变图数据/断线逻辑。
- 共同交接：文档连续性 9/9、diff 检查通过；三子树经 clean/ignored/绝对路径/缓存/服务核对后以 Git remove/prune 退役，其他工作树保留。未执行浏览器验收、全量门禁/构建或真实资源写入。
- Task [GG-252](tasks/GG-252-personal-info-cleanup.md)：`2feef8c` 精确回放为 `4fd9be3`，默认文字资料、删除复制与解释、仅改动后显示操作；默认 goder 例外共享、自定义保持唯一，头像新上传/绑定 2 MB。22/22、lint、必要 Web 构建/同步、0057 已完成，创建 1/退役 1；并行 GG-251 `3e2add5` 保留。
- Task [GG-251](tasks/GG-251-canvas-preview-fit.md)：从 `4152490` 核对 GG-249/250 祖先后创建 `fix/GG-251-canvas-preview-fit`；显式画布边界/完整适配、稍大浮层、按放大后尺寸保留间隙和原位 1.12 倍放大。9/9、相关 lint、实际 Vite 模块编译通过，无新增 worktree/缓存；用户验收。
- Task [GG-250](tasks/GG-250-inline-personal-information.md)：独立 `9ea1002` 精确回放为 `99fb14a`，个人信息直接编辑头像、昵称/用户名并保存/取消；13/13 功能、相关 lint、最终文档 9/9，5173 编译接线通过，辅助目录创建 1/退役 1。保留并行 GG-249 文件及后继 `8ee22d8`。
- Task [GG-249](tasks/GG-249-canvas-media-viewer.md)：从 `e857437` 新建 `fix/GG-249-canvas-media-viewer`，画布图片入口改为受限完整预览、无标题/滚动条的混合媒体轮播；15/15、相关 lint、四个 Vite 模块编译通过，无新增 worktree/缓存，用户验收。
- Task [GG-248](tasks/GG-248-account-personal-information.md)：`b4a34a6` 回放为 `520b452`，六项真实资料、ID/邀请码复制与每次默认入口已接入实际目录；20/20、定向 lint，无全量检查，辅助目录创建 1/退役 1，不改变 GG-245 范围。
- Task [GG-247](tasks/GG-247-targeted-verification.md)：用户要求高频小需求默认定向验证，完整门禁按批次/发布或必要回归执行，规则见 AGENTS/WORKFLOW；不改变 GG-245 的并行开发范围。
- 当前集成分支`fix/GG-275-text-editor-layout`，目录`F:/goodgood-worktrees/GG-116`，当前HEAD含GG-275与已接入GG-276及此前功能并作为下一任务基线；`b9ce4bf`、`3bbf42e`与`3920306`须为祖先。实际verified Web保持`80b8c0f`，免费政策待补，生产未授权。
- Task [GG-246](tasks/GG-246-asset-video-hover.md)：子提交 `c563d98`/根回放 `ec51488` 已整合为 `83a4306`，实际目录 `F:/goodgood-worktrees/GG-116`，基于 GG-244 收口 `dd8dca9`，仅修改大厅资产视频。定向 31/31、一次完整共同门禁 685 通过/22 隔离跳过/0 失败；5173 编译模块 HTTP 200 含新接线；辅助目录创建 2/退役 2。不改变 GG-245 并行任务。
- Task [GG-244](tasks/GG-244-canvas-asset-hover.md)：分支 `fix/GG-244-canvas-asset-hover` 基于 `86ee3b7`；子提交精确回放 `be84c53`、`9d7d18c`，定向 9/9、完整门禁 674/22/0；子目录创建 1/退役 1，沿用 GG-242/243 与云配置。
- Task [GG-245](tasks/GG-245-canvas-image-link-read.md)：子八文件 `e471c1c` 精确回放为 `7ddb78d`；34/34、定向 lint/typecheck、必要 checkpoint 构建通过，实际 cafe24 JPEG 新读取器下载/解码成功（900×1190）。ADR 0122 与原上传/归档保持，本地 Web 同步完成。
- Task [GG-243](tasks/GG-243-project-create-card.md)：独立实现 `f647e13` 及其记录分支已整合到 `F:/goodgood-worktrees/GG-116`；基线为 GG-242 收口 `00f7568`。首位新建卡片取代页头按钮，复用 `/canvas` 新建流程；不修改画布源码。
- 共同整合 `dec0025` 已通过实际运行目录完整门禁：665 通过/22 隔离跳过/0 失败；定向 14/14，5173 编译模块 HTTP 200、包含新卡片和 /canvas 入口。GG-242/243 均为祖先，本任务辅助目录创建 2/退役 2。当前分支名是历史名称，不能单凭名称推断范围。
- Task [GG-242](tasks/GG-242-canvas-image-preview.md)：子 agent 最小源码修复已精确回放为 `c3700b7`，基于 GG-241 `f1570de`，继续保留。GG-240 生命周期规范继续有效。
- 5173源码目录：`F:/goodgood-worktrees/GG-116`，当前累计源码含GG-242—276交付；目录名/旧标签不能代表最新代码，免费quota未实现。
- 5173 API代理：Web `32131`为GG-116 verified `80b8c0f0b41aff4371e4673597bc4b483233e405`，指纹见GG-274；唯一真实开发Worker `32142`保持GG-226 `70e10c6`，将来quota需要同步两角色。文档HEAD不是新构建身份。
- 本地依赖：PostgreSQL `54449`、Valkey `56549`、RustFS `58049/58050`、Mailpit `58045/58046`；数据库迁移为 `0060`，0059随机ID与用户/任务/积分流水保持，0060仅新增授权来源列/约束。
- 云参考图：Web 必须加载仓库外 `cloud-upload.env`，Worker 同样保持 `cloud-development`；否则 23 条 `local-dev/references/` 图像会读取失败，readiness 正常不能代替素材预览验证。
- GG-242 验证：定向 23/23、只读预览 13/13；一次 `check:local` 通过（683 总数，661 通过、22 隔离跳过、0 失败）。浏览器验收交给用户。
- 2026-10-01 启动前只读核对活动任务、待分发 outbox、冻结积分和两队列均为 0；保留原数据卷，没有执行迁移或生成。
- GG-235 已恢复本地媒体只读链路；GG-236 外框已获用户确认；GG-237 和 GG-238 仍需用户在 5173 手验。
- 生产身份继续为 revision `7888554a4650b1b06dbce4293c52e8c018e5c71b`、迁移 `0044_gg098_raise_manual_grant_ceiling.sql`，详见 [CURRENT_STATE](CURRENT_STATE.md)。GG-239 未部署。
- 生产入口仍为 `https://goodgood.o1key.com`，预发布入口为 `https://staging-goodgood.o1key.com`；本地 5173、开发数据库与生产数据继续严格隔离。
- 早期生产实施流水保存在 [2026-09-07 implementation log](history/2026-09-07-implementation-log.md)，仅在追溯历史时读取。
- Next action: 用户刷新5173手验GG-297预设菜单/标签/附加草稿保留；实际预设及GG-296中断10规则待委托应用新0062并构建Web启用。新需求从当前HEAD继续开发，默认不自动编译/检查；免费政策与生产授权另列。
- Blockers: 本地启动无阻塞；免费政策仍缺每日数量和适用模型/规格，浏览器验收由用户负责，生产未获授权。

## Verification sequence

1. 核对当前分支 HEAD，确认 GG-253 `896bce2`、GG-254 `422c32f`、GG-255 `d4ea42c`、GG-256 `5183287` 与 GG-257 `6f63a8f` 均为祖先；交付 `git status --short` 为空。Web/Worker 身份按 CURRENT_STATE/HANDOFF 核对。
2. 核对 `http://127.0.0.1:5173/`、`32131/api/health/version`、`32142/health/ready`；不得凭旧 PID 推断版本。
3. 按 GG-247 默认定向验证；GG-245 检查客户端、公开链接读取与 reference API，实际 Web 同步需要 verified checkpoint 构建，不叠加无关全项目测试。文档流程只运行文档连续性与 diff 检查，准确记录实际结果。
4. 浏览器交互及产品验收由用户完成，覆盖 GG-245 图片链接、GG-244/246 hover 视频、GG-243 首位卡片、GG-242 预览恢复和未确认的 GG-237/GG-238；agent 无需代验。真实生成必须另获该次计费请求授权。
5. 发布是独立任务，必须取得不可变 CI 镜像并按单槽 Compose 清单执行。

## Milestones

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| 生产 GG-098 / GG-100 | 已部署 | controlled alpha 应用 + 单槽 Compose；身份见 CURRENT_STATE |
| GG-101—121 | 本地累计 | 真实本地接口、素材/资产工作区；具体边界见任务卡 |
| GG-122—155 | 本地累计 | Hero、shadcn/AI Elements、独立画布、资产栏与运行兼容 |
| GG-156—189 | 本地累计 | 积分明细、画布交互/持久化、真实生成与 Nano 多图 |
| GG-190—218 | 本地累计 | 画布视觉、批次、模型路由、Seedream、平台币退役与多页面 |
| GG-219—238 | 本地累计 | 导航、项目管理、选择/排列、资产面板和图片查看器 |
| GG-239 | 本地检查点 | 当前 5173 累计源码首次形成单一可恢复提交和标签；未部署 |
| GG-240 | 流程检查点 | 子 agent/worktree 创建、缓存、集成、退役与脏目录保留形成可测试规范；未部署 |
| GG-241 | 本地启动完成 | 原依赖、5173、Web/Worker 恢复，Windows 54449 端口冲突已处理；原数据保留，未部署 |
| GG-242 | 本地预览恢复 | Web 云配置补回；画布重开 generated source 使用稳定受权 content URL，子 worktree 已退役 |
| GG-243 | 已整合实际 5173 并验证 | 首位新建项目卡片直接进入新画布；共同门禁 665/22/0，辅助目录已退役，未部署 |
| GG-244 | 已整合实际 5173 并验证 | hover 小按钮与节点式视频预览；门禁 674/22/0，子目录已退役，未部署 |
| GG-245 | 已整合 5173/Web 并验证 | 受鉴权公开图片链接读取，34/34 与实际 URL 解码通过，verified Web 同步和子目录退役完成 |
| GG-246 | 已整合实际 5173 并验证 | 大厅视频仅 mouse hover 预览，定向 31/31，辅助目录已退役 |
| GG-247 | 验证规范生效 | 小需求默认定向检查，完整门禁用于批次/发布或必要回归 |

## New-session recovery

1. 读 `AGENTS.md`、`CURRENT_STATE.md`、`WORKFLOW.md`、本文件、`BACKLOG.md` 和 `DEVELOPMENT_HANDOFF.md`。
2. 使用 `git worktree list` 和当前分支 HEAD 核对上述 GG-253—257 祖先；GG-245 标签仅为历史来源，不得从目录名、main 或 parked C6 猜测最新源码。
3. GG-243 已整合共同运行目录；新需求核对并分配未占用编号，仅在并行写任务时创建 worktree，并按 WORKFLOW 登记所有权、缓存和退役结果。
4. 本地真实 Worker 可能计费；先检查活动任务、队列和冻结积分，再决定是否启动或切换服务。
5. 生产操作必须另有明确授权，且生产事实以 CURRENT_STATE 和发布记录为准。
