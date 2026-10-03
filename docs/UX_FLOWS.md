# GG-063 quality pricing

## GG-349 · 添加数据随机填写

打开添加数据仍先读取当前图已有参数。原图就绪后点击工具行「随机生成」，立即将100组示例中的一组填入11项拍摄参数、清空图片信息及粘贴草稿，并提示可继续修改。当前弹框每轮100组无重复，跨轮末尾/开头不紧邻重复；关闭重开仍重新读取源图。任一可编辑字段trim后非空即可启用确认添加，不要求所有字段完整；全空、原图未就绪及处理中禁用。点击确认仍校验填写格式并保存旁置副本，失败保留草稿；随机填写不请求模型或触发收费。

## GG-341 · 去除AI快捷操作

选中上传完成的源图/实际生成输出→图片快捷栏「去除AI」（悬停提示「去除AI识别」）→
立即处理，锁定重复点击→服务端提交私有副本和收费→原图旁新增可下载
副本、刷新资产和余额。失败显示原图不变及局部重试；余额不足不收费。
不根据缺少C2PA推断实拍，也不承诺移除像素水印。展开批次按点击output
固定ID；切页/身份取消前端读取，不向新上下文插入结果，已提交副本仍在
原用户资产中。未知网络结果用原UUID恢复，同请求不再扣费；确认成功后的
新点击是新的10积分操作。元数据弹框清理按钮移出，保留参数编辑。

## GG-340 · 公告发布、到达与阅读

站长管理→公告→写公告；空标题/正文允许保存草稿，发布前两者必须填写。
发布/更新按稳定操作ID和版本保存，旧稿冲突保留编辑，明确放弃后加载最新。
已发布稿只能发布更新或撤回，撤回后可编辑/重新发布或软删除；未保存关闭
和撤回/删除均显示简短确认，保存中阻止重复动作及关闭。
用户收到公告→短暂可关闭提醒、持久未读点→自主打开右侧帖子流；可视停留
800ms且页面可见后记阅读，点击入口/关闭提醒不等于已读。正文更新产生新未读。
点赞是显式点赞/取消点赞，不显示计数。滚动中收到公告保留旧内容/位置，
通过「查看新公告」回顶部；撤回即时移除，断线/恢复/30秒补读用已加载ID快照
清理旧帖。后台流关闭、页面隐藏或换身份时清理订阅/计时器/请求。
阅读面板不打断创作；加载/空/失败重试/分页/移动端/减少动态效果保持。

## GG-339 提示词反推名称与模型排列

画布空白处右键以「提示词反推」创建原textGenerator节点，自动标题/连接输入名称及无障碍模型、预设、停止、视频输出入口同步显示新名称。预设菜单/选中Badge/移除标签均显示「结构化提示词」，旧项目的structured_reverse直接恢复为新显示名；手写附加内容、隐藏指令和生成流程保持。模型按钮由名称决定宽度，箭头紧邻文字，预设接在旁边；窄屏名称可省略/设置换行，发送仍靠右。原键盘选择、输入聚焦关闭模型菜单、锁定/流式/停止不改。见 [GG-339](tasks/GG-339-prompt-reverse-ui.md)。

## GG-337 画布右键下载原图

右键画布上传/资产拖入/独立结果图片，或展开生成批次中的某张图片，显示「下载」（GG-338收短文案）；画布资产侧栏图片右键在重命名/删除之前提供同一操作。空白处仍显示原创建菜单，文件夹/其他媒介菜单保持。右键操作不编辑图或改变元数据。读取时显示下载中反馈并禁用该入口的重复提交；失败/空文件显示原因与「重试」，成功仅表示浏览器下载已开始。切换账号、工作区、画布页或卸载取消尚未完成的读取，已交给浏览器的下载由浏览器管理。下载名称使用当前显示名称并按文件 MIME 修正扩展名。见 [GG-337](tasks/GG-337-original-download.md) 和 [GG-338](tasks/GG-338-download-label.md)。

## GG-331 文本生成模型列表关闭

模型列表为受控的非模态单选菜单，选中模型关闭并更新原草稿。打开列表后点击或聚焦输入框即时关闭，焦点保留在textarea，可直接继续输入；选项和Escape沿Radix原键盘行为，切走节点或锁定输入时不保留打开状态。预设菜单同样允许外部控件正常接收焦点。宽度与参数间距细化不改生成、流式、积分或持久化契约，无后端更新，用户刷新手验。

## GG-327 / GG-345 添加图片数据

单选图片 →「添加数据」→读取当前图并自动预填。GG-348表单只显示拍摄参数/图片信息，移除位置填写；复制/粘贴过滤坐标，不向目标图隐藏添加位置，当前图已有的成对坐标在副本保持。受权素材能力独立控制入口，副本写入仍验证项目就绪、当前页/身份及源图。复制参数、粘贴参数与手动编辑保持；GG-347删除还原，确认添加前关闭即丢弃草稿，重新打开重新读取当前图片。无另选照片/参考图提取流程，不展示C2PA状态或底层逻辑。

底部只有「确认添加」；处理中为「正在添加…」，防止重复提交。成功新增旁置图片及私有资产并关闭弹框，取消没有文件写入；读取/字段/保存错误在本弹框内恢复，输入保留，凭证相关底层错误归为一般图片处理失败。页面/身份切换关闭弹框并取消读取。原下载副本入口和左下清理提示移除，当前图或新增图可通过画布/资产右键下载。

## GG-326 分组排版

emoji 弹层采用完整分类/搜索/最近使用与肤色选择；选中后写入名称左侧，可移除。
选中组后拖四角调整框大小，组内内容保持绝对位置；角点也支持方向键10px/Shift50px。
中央空白默认光标/常规画布操作，标题和任意边缘可拖动整组，成员相对位置不变。
默认自动跟随可见内容；手动缩放后留白保存，内容内移不缩框，外移/展开仍自动扩展。
GG-332将组名/emoji放在外框左上方，保留标题拖动和双击/Enter/F2改名。GG-334将可见角标改为图片节点同款透明四角命中区，选中组后hover角落只切换斜向缩放光标、直接拖动；没有图标或悬停底色，方向键/Shift及键盘焦点轮廓保留。选中时节点上方快捷栏按emoji、手动时「适应内容」、解散组排列，取消选中关闭emoji弹层，重新选中不自动重开。快捷栏与标题保持分离的间距，缩放时随当前节点定位。
「适应内容」恢复自动包围。无法缩过当前内容和原留白下限；不缩放组内图片/文本。
GG-333自适应模式按实际可见内容上下等距包围，120px高度下限的额外留白居中分配；已有自动组下次拟合即可修正旧上预留。只移动/缩放外框并重算成员相对坐标，内容绝对位置不变；手动模式不自动居中，点击「适应内容」后采用新规则。
复制、页历史、本机保存/恢复保留手动模式。云字段已随GG-330 Web启用；GG-332无新保存/服务字段。

## GG-323 画布建组

Shift框选两个或以上节点，点工具栏「建组」或Ctrl/Cmd+G；新组保留内容原位置，选中组框。拖动标题整体移动，组内节点仍可单独移动、编辑和连线。双击组名或聚焦名称按Enter/F2编辑；Enter/失焦确认，Escape取消，空名保持原名，输入法确认不提前提交。名称左侧选择/清除emoji。点解散或选中组后Ctrl/Cmd+Shift+G保留成员绝对位置；仅删除组框也保留成员，明确选中的成员仍按原删除规则。再建组展开已有成员关系，不嵌套。复制组带成员和内部连线，复制单成员在粘贴后独立定位。保存恢复/各页历史/项目封面沿既有边界，新云校验需以后受权更新Web启用。没有自动上传、生图或计费操作。见[GG-323](tasks/GG-323-canvas-groups.md)。

## GG-324 图片对比

选中画布上传/资产图片、独立结果或生成器当前输出，点击裁剪右侧「对比」。弹框固定当前图，优先显示该输出实际job.input的可用参考图并默认第一张；展开批次按当前所选output找其job，不读其他结果或已修改草稿。无参考时直接展示资产图片选择，参考空态也可转到资产。资产只读列出生成/上传图片，包含文件夹中的素材，按真实名称搜索；不包含视频/音频/文本，不改变原归属。

对比图在左、当前图在右，默认中间分界；鼠标hover横向移动即时改变可见比例，移出保留位置，点击/触屏捕获拖动，方向键调整2%、Shift10%、Home/End查看完整一侧。切换对比图重置50%。两图同框居中等比完整显示，采用受权最高2048预览，缩略沿512。图片或部分列表读取失败保留另一侧/已读素材并提供局部重试；同一资源去重且不提供当前图片作为选项。

关闭/Escape返回原入口焦点，切页/身份变化或画布不可用时清理临时会话/对象URL，忽略过期列表返回；对比选择不持久化，不产生上传、生成、积分或图数据修改。用户手验视觉，不运行自动浏览器验收。

## GG-321 固定图片插槽与逐张重试

用户选择图片数后点击生成，按提示词组和组内图片顺序保留结果位置；4张展开4位，
成功显示图片，进行中显示现有生成状态，失败位置保持并在卡片中央提供重试。
点击只处理此位置，沿用冻结提示词/参考素材/模型参数，成功兄弟和展开状态不变；
编辑当前草稿不会改变旧失败位置的重试输入。确认失败重试是正常单张请求/报价，
未知提交仅由明确点击按原幂等身份恢复，不自动重发。刷新时恢复各槽对应任务，
按真实job/output关联大图、裁剪和输出连线，不使用压缩后的成功索引。
Seedream原生多层保持原语义，旧多图任务/项目兼容。源码交付与新云字段Web激活分开，
未更新Web时保存错误须明确显示，不伪装成功。见[ADR0134](decisions/0134-canvas-image-result-slots.md)。

## GG-318 总日志失败诊断

站长进入总日志→任务记录→详情，在基础参数与积分流水之间查看失败诊断。
每项关联时间/尝试序号，展示已有的阶段、原因、HTTP状态/耗时、地址模板、
上游请求/任务ID、错误信息及路由。备用渠道启用与最终失败分别展示；历史无诊断
显示「此任务未记录详细诊断，仅保留错误代码」。沿现有site_owner/CSRF、
加载/失败重试及Sheet焦点恢复，不新增普通用户解释或重试动作。

## GG-314 画布图片右上查看

图片节点图面hover时，右上显示与资产面板一致的查看大图按钮；键盘聚焦和触屏仍可操作。上传/资产拖入图打开当前图片；独立结果打开对应job的图片范围，生成器批次打开所有已有输出并定位点击的图片。展开批次每张有入口，收起只保留最前图入口。按钮独立阻止拖动/节点点击/连线和键盘快捷动作，裁剪中或小图未就绪时禁用；空生成器和无图片的失败状态无入口。详情复用受权原图/本地源、真实尺寸、已有job.input参数及缩放/平移/缩略图，关闭/Escape回按钮。无新上传或生成，画布300%高清预览门槛保持。见[GG-314](tasks/GG-314-canvas-image-view-button.md)。

## GG-306 画布按需图片预览

资产图片拖入画布先显示512px预览，不读取原图下载地址；上传图片及生成器/独立结果共用规则。GG-312将高清门槛固定为画布缩放达到300%，不因节点尺寸或屏幕像素密度提前加载；只对视口内/附近且允许高清的图片加载最高2048px预览，180ms稳定等待避免滚轮过程中反复加载。低于300%立即露出保留的512图层；高清失败保留512，不回退无限制原图。隐藏叠图不加载高清。保持上传/失败重试、裁剪及保存恢复，实际像素不会被预览尺寸覆盖。见[GG-306](tasks/GG-306-canvas-adaptive-preview.md)、[GG-312](tasks/GG-312-canvas-preview-zoom-threshold.md)。

## GG-304 拖动节点连线

从图片/文本等节点端口拖动连线时，临时曲线立即显示原hover亮蓝流动特效；放下接线或取消后，预览由原React Flow生命周期移除，已完成连线继续默认灰色实线/hover亮蓝流动。减少动态效果偏好下拖线预览是亮蓝静止实线；原端口、连接校验、剪刀和保存行为保持。见[任务](tasks/GG-304-canvas-connection-drag-flow.md)。

## GG-303 画布图片提示词批量

图片生成节点提示词或连接文本中，单独一行的`---`/`———`/`－－－`分割为并发提示词；文本编辑器的原生分割线也输出`---`。按既有顺序合并后拆分，空段不提交，重复段保留；每段使用同一冻结模型/参考图/图片数量，预期图片数与积分按段数相乘，不增加批量/并发上限。成功图片仍在原节点按提示词顺序堆叠/展开，其他段进行中可查看/裁剪已完成图片；全部活动任务期间原设置锁定。选中节点后显示逐段失败信息和单段重试，保留成功结果；刷新仅恢复已接受任务，不自动重新提交未知请求。全文草稿可超过4000，现有接口4000按每段提示，不截断。见[ADR0131](decisions/0131-canvas-concurrent-prompt-batches.md)。

## GG-328 文本生成状态与输入

选中文本生成显示底部紧凑composer；素材和提示词在上部，模型/预设与生成按钮固定在底部。素材仍按原54px正方形和图片hover大图展示，上传或前序文本生成未就绪时提示准备中，不能发送；空输入可选预设/连接可用媒体，不能空发。合并连接文本和附加提示词超过现有上限或有未确认pending时不发送，按钮hover/键盘焦点说明原因；Ctrl/Cmd+Enter沿同一条件，不重复请求。

真实素材准备、已接受流式与结果恢复分别显示准备中/生成中/恢复中；正文未到时在原文档区域显示轻量占位，有文字后沿原打字机/Markdown展示。选中完成结果显示双击编辑，进入编辑仍用原格式栏/选区/粘贴和Esc退出；共享普通文本编辑行为不变。生成/待确认时禁用模型、提示词、预设修改及素材移除，原停止动作、20/10积分、无停止成功提示、历史和恢复保持。无需后端更新，由用户手验。

## GG-291 文本生成与双击编辑

GG-313：保存提示词模板时，名称输入初始空白，显示用途_主题_风格及商品主图示例。用户可按参考命名或自定义名称，填写后保存；占位示例不是字段内容，原空名禁用保存与全文冻结/失败重试保持。不新增提示词或名称格式限制。

GG-311：单击快捷栏「设置模板」打开标题「保存提示词模板」的命名弹窗，无内容预览，提交按钮「保存」。成功关闭弹窗，资产入口显示短暂接收动效/「已添加到资产」，刷新私有列表；失败保留名称和冻结内容且不报成功。画布资产右上筛选图标提供全部/图片/视频/音频/提示词模板，按当前根层或文件夹筛选；选项跨文件夹导航保持，文件夹卡片仍可进入、拖入整理。无匹配时可「显示全部」，不隐藏或改变存储/归属。关闭入口移至原资产切换按钮，Escape先退出打开的筛选菜单/弹窗，再关闭资产面板。既有全文预览/资产页筛选保持。

GG-301：进入文本编辑后，可点击有序列表旁的“分割线”按钮，在当前光标处插入Markdown横线并继续输入；沿原文本撤销/重做和项目保存恢复。共享Markdown结果编辑区使用相同入口，非编辑态或流式中仍依原规则不可操作。见[任务](tasks/GG-301-text-divider.md)。

GG-299文本生成chat图片缩略hover或键盘焦点展示图片本身的放大预览，沿图片生成既有Tooltip；使用已有私有previewUrl，无新增上传或生成。无可用图片地址时保留名称提示。见[GG-299](tasks/GG-299-text-image-preview.md)。

GG-298文本生成chat的连接素材缩略可取消，图片/文本/视频统一右上角X；取消只移除对应连线，保留源节点及资产。复用图片生成的撤销/图保存路径；生成中及恢复待处理请求时锁定取消。见[GG-298](tasks/GG-298-text-input-remove.md)。

GG-297模型旁“预设”打开列表，首项“结构化反推”；选择后输入区显示可移除标签，已有草稿不覆盖，附加输入可空。移除标签或取消菜单选中恢复原输入规则。生成时发送presetId和用户输入，隐藏指令由后端置于当前输入前；历史只记录名称/用户输入。复制/保存/重开保留选择。旧后端缺新路由时提示未启用，不发起普通计费请求。见[ADR0130](decisions/0130-text-generation-presets.md)。

右键新增顺序为“文本编辑 / 文本生成 / 图片生成”，保留各自编号。文本编辑默认箭头光标/可拖动，双击或Enter/F2进入，外部点击/Escape退出并保留内容；选中显示Markdown快捷栏，编辑后可操作，保留H1/H2/H3及原选字/粘贴。文本生成空态同图片生成，一个端口接收文本/图片/视频；下方chat仅模型和20积分生成/停止，默认Claude/high。连接文本先于输入草稿，图片复用原素材，视频按顺序代表画面分析，不含音轨。流式打字/光标，生成中禁止编辑/重复提交；结果可双击编辑并继续连到图片/文本生成。系统失败保留内容并全退；GG-296用户中断按10积分结算、退回10，停止按钮操作前提示费用。主动停止后左下角不展示停止或费用解释，仅结束动效/保留内容，恢复已取消请求也不显示该解释。重开只恢复已有请求，不重发模型；服务已成功、前端动画未结束时仍扣20。见[GG-291](tasks/GG-291-canvas-text-generation.md)、[ADR0129](decisions/0129-text-generation-interruption-billing.md)。

## GG-280 画布图片裁剪

单独选中已就绪的图片，点击文件名行上方快捷栏的裁剪，进入图上选区和相邻预设面板。默认自由裁剪、比例解锁，W/H和四角可独立调整宽高；自由不属于通用预设，原始比例选项移除，通用3:4位于2:3上方。拖动选区移动位置，拖动四角调整范围；W/H显示实际原图选区像素，输入尺寸或切换比例锁定同步选区。通用比例预设以原图可容纳的最大区域居中选取；带W×H的尺寸预设按标注像素居中选取，例如2100×2800原图选择小红书1080×1440时，选区及导出为1080×1440，外侧显示遮罩。尺寸超过原图时等比缩小到图内，不放大图片；选择后可解锁比例返回自由调整，保留当前选区。见 [GG-286](tasks/GG-286-canvas-crop-action-color.md) / [GG-288](tasks/GG-288-canvas-crop-preset-pixels.md)。

取消或切页退出而不改变图像；点击完成才导出并上传新私有素材。上传图片和独立结果节点保留身份/位置/连线并换为新裁剪图；生成器结果在旁边创建新图片节点，保留原任务和生成器。原素材不删除，完成后的图片沿用连线、上传重试和项目保存恢复。加载/导出失败留在裁剪面板，上传失败留在素材节点并可重试。通用下方加入小红书、抖音、淘宝、拼多多和亚马逊，不提供LinkedIn。见 [GG-280](tasks/GG-280-canvas-image-crop.md)。

## GG-275 文本节点布局与尺寸调整

文本编辑器以生成器同样的外置小标题标识，框内只保留书写区。GG-334将右下可见柄改为四角透明缩放入口，与图片节点一致：hover边角变为对应斜向光标，直接拖动调整宽高，不展示角标或底色。聚焦后方向键也可调整、Shift加快；从左/上角调整时对边固定，尺寸边界沿用180×140至1400×1600，达到下限时角点不再偏移。共享Markdown生成结果采用相同入口。内容自动换行/内部滚动，正文14px和各级标题字号不随节点宽高改变；调整后的真实尺寸可保存恢复。选中时上方工具栏保留正文/H1/H2/H3、粗体、斜体、列表、撤销/重做，移除删除线、引用、代码块按钮，旧Markdown项目仍完整读取。见 [任务](tasks/GG-275-text-editor-layout.md) / [GG-334](tasks/GG-334-invisible-resize-corners.md)。

GG-287：纯文本/Markdown粘贴使用开放的编辑器片段，在光标处接续或替换当前选区，不因包装成完整文档而额外换行；真实多段内容保留分段与格式。富文本及代码块保留编辑器原生处理，粘贴仍进入文本撤销、字符限制和项目更新。见 [任务](tasks/GG-287-canvas-text-paste.md)。

GG-289：书写区的上下/左右内边距属于可编辑元素，容器允许文本选择；左右拖选进入内边距时继续由编辑器管理选区，外层不再点击后强制定位末尾。保留原16/18/38px间距、占位文案位置和内容滚动。见 [任务](tasks/GG-289-canvas-text-selection-padding.md)。

GG-290：外置标题按当前页面文本节点顺序显示“文本编辑器 1、2、3…”，可访问编辑标签同步编号。新建或复制排在后面，删除后连续编号；项目恢复沿用保存的节点顺序，旧节点无需额外字段。文字内容、提示词连接顺序和节点ID保持。见 [任务](tasks/GG-290-canvas-text-editor-order.md)。

## GG-253 画布资产自由图片预览

GG-305/GG-307：生成参数按该图片的受权生成记录和模型支持范围筛选，不从当前节点草稿或所有模型共用的默认字段补造。Banana/Seedream不显示GPT专属质量、背景或输出格式；参考图为空不显示。按GG-307补充要求，Nano Banana 2的思考参数始终隐藏，包括已开启高思考的记录；仅实际启用的谷歌搜索显示，关闭或未记录时隐藏，其他模型不展示这两项。GPT保留支持且已记录的值（包含实际发送的自动值），质量按具体GPT型号范围筛选；未使用和缺失值不出现。用户澄清暂不处理预设。见 [GG-305](tasks/GG-305-canvas-viewer-used-parameters.md) / [GG-307](tasks/GG-307-hide-banana-thinking-details.md) / [ADR 0123](decisions/0123-canvas-media-preview-carousel.md)。

GG-264经用户澄清后：初次打开/换图/0或Home保持完整等比适配，放大过程中允许填满整个中间区域，超出视口的完整原图可拖动/缩放查看。右下不显示数量；选择或缩略图/窗口尺寸变化后，当前右侧缩略图自动垂直居中，第一/最后一张也支持。仅canvas模式适用，其他交互及资产页规则保持。见 [GG-264](tasks/GG-264-image-detail-fill-and-centered-rail.md)。

图片右上按钮打开当前范围详情，左侧为素材名、真实模型/参数/提示词；GG-258 起非生成素材在标题下只展示已知尺寸，取消图片/视频类型和缺少参数的说明，尺寸未知时不编造。主图先完整适配，按住拖动平移，滚轮以鼠标位置为中心缩放（适配倍率 0.25–16）；GG-258 移除右下角缩放/适配按钮及倍率，预览聚焦时仍可用方向键平移、加减缩放、0/Home 适配，换图/关闭复位。滚轮不再切图：右列仅原比例图片视频内容，保留间隙，滚动翻看列表，点击/列表方向键选择，选中项清晰并轻微向左抽出。选中的视频保留节点式 hover/手动播放、时长与签名重试。Escape/关闭回原入口，后台卡片暂停；不改变节点、项目或资产数据。此规则取代 GG-249/251 的画布滚轮切图与原位缩略图放大，资产页保持既有行为。见 [GG-253](tasks/GG-253-canvas-media-detail.md) / [GG-258](tasks/GG-258-canvas-detail-minimal.md)。

## GG-255 图片粘贴与 GG-256 文件夹整理

用户在项目外复制实际图片后，到画布按 Ctrl/Cmd+V 即走与文件拖入相同的验证、上传、节点、保存和重试流程；焦点在 body 时无需先点空白，输入、可编辑控件及打开的弹层/菜单保留原生粘贴。剪贴板 files/items 去重，不从文本链接或 HTML 另行抓图；内部节点复制保留独立标记，避免粘贴旧节点或重复上传。

资产图面 hover 为默认光标，查看按钮 hover 为 grab，按钮保持独立点击且不触发拖拽。图片拖到现存文件夹时显示可接收靶区，松开后复用归档接口并保留标签/名称；请求中防重复，确认成功才更新归属，失败保留原素材并可重试。GG-265修正根列表：确认移动后，同一素材从原位置消失，仅在目标文件夹展示；根层显示未归档素材，失效文件夹归属可回根层恢复，重新读取保持该规则。同目录、无效或非图片拖入无操作，拖到画布仍走原添加路径。见 [GG-255](tasks/GG-255-canvas-paste-image.md) / [GG-256](tasks/GG-256-canvas-folder-drop.md) / [GG-265](tasks/GG-265-canvas-folder-move-membership.md)。

## GG-257 连线 hover 流动

已完成参考连线默认静止实线；指针进入线条或对应剪刀控件才显示原流动效果，离开两者立即恢复。减少动效偏好下 hover 也静止；既有 hover 颜色、一秒剪刀延时和断线行为保留，取代以下 GG-171 默认持续流动说明。见 [GG-257](tasks/GG-257-canvas-edge-hover-flow.md)。

## GG-245 画布图片链接添加

资产「新建资产 → 链接」提交公开图片 URL 后显示正在添加。GoodGood 后端经真实会话及 workspace 授权读取并验证图片，浏览器得到 File 后走原上传及当前文件夹归档；仅 ready 资产可拖入画布。缺少图床 CORS 头不再阻止有效链接。

失败保留链接及明确重试/文件上传入口；正在读取时关闭或卸载取消远端读取。已经开始的私有上传沿原完成逻辑，会话失效走既有恢复路径；归档失败重试复用已上传素材，避免重复。没有 hover 自动上传或 provider 生成。见 [任务](tasks/GG-245-canvas-image-link-read.md)。

## GG-246 大厅资产视频 hover 预览

进入 `/assets` 后，视频卡片静止并显示中心播放提示。真实鼠标进入视频画面才开始静音循环，移开后暂停；离屏、页面隐藏、页面禁用或打开明确媒体预览也暂停后台缩略图。减少动态效果设置、触屏操作和键盘焦点不会启动卡片预览。延迟加载只在当前鼠标仍悬停且预览可用时开始播放，失败时保留播放提示和原有查看入口。点击查看继续沿用现有视频预览，画布资产面板按其独立约定处理。见 [任务](tasks/GG-246-asset-video-hover.md)。

## GG-243 项目页直接新建画布

项目页首位「新建项目」卡片直接导航到既有 `/canvas`，由画布原有新建流程创建独立空白项目和稳定 ID，沿现有自动保存恢复。无需先命名或进入大厅创作。列表读取中、空或失败时仍可使用该入口；已有项目的打开、重命名、删除和列表重试继续按原路径处理。见 [任务](tasks/GG-243-project-create-card.md) 和 [ADR 0119](decisions/0119-project-create-card.md)。

## GG-244 画布资产 hover 与视频播放

在画布打开资产栏后，图片/视频卡右上较小的查看按钮仅在指针 hover 时显示；键盘聚焦入口或无 hover 设备仍可操作。离开卡片后普通鼠标焦点不保持显示。图片点击仍进既有图片查看器；视频点击明确打开节点式视频预览，关闭/Escape 返回入口。视频卡下方不显示「视频」文字，改名输入和失败恢复保留。

视频默认保留首帧，hover 在图面内静音循环播放，移出暂停；手动播放按钮允许明确播放。预览采用画布视频节点的完整比例、播放覆盖层与内置时长。打开预览时暂停背景卡，关闭/卸载及页面隐藏暂停，减少动态偏好不自动播放。播放、查看、改名和拖入各走独立交互路径；hover 不打开浮层、不上传或生成。见 [ADR 0120](decisions/0120-canvas-asset-hover-video-preview.md) 和 [任务](tasks/GG-244-canvas-asset-hover.md)。

## GG-238 画布内图片浏览

从图片卡右上放大图标打开当前canvas内的模态图片查看器，不换路由、不修改节点。右侧仅包含当前可见范围的图片，按列表既有顺序排列；普通纵向滚轮和方向键切换，缩略图点击定位，边界停留。缩略图同步滚入可视范围，减少动效时即时滚动。Escape/关闭回到放大入口，原双击/F2改名、拖入、folder/上传/媒体重试保留。移除所有hover/focus媒体大预览。资产页上传图片也使用此共用viewer；已有generated详情的参数/下载/路由，以及视频音频播放器继续沿用。见[任务](tasks/GG-238-canvas-asset-viewer.md)。

## GG-235 画布资产媒体恢复

资产图片正常读取私有预览，失败只尝试一次已有受权原图入口；仍失败留在列表并提供单卡「重试」。列表成功刷新、源地址改变或明确重试清除本地失败状态。视频从真实元数据取得比例并定位首帧，默认不播放；GG-235原保留hover/聚焦大预览；GG-238已撤下，由明确图片放大入口替代。视频重试只重新读取受权视频列表获取地址，关闭/新列表轮次忽略旧回包；失败不移除素材，不触发生成。原比例瀑布流随加载、改名和上传卡高度收紧空隙，拖入、文件夹和添加行为保留。见[任务](tasks/GG-235-asset-media-masonry.md)。

## GG-232 卡片与功能菜单

GG-237缩小项目卡片，内容宽度>=960px时一行四个，窄区依次三/二/一列；封面4:3，不拉伸快照或图片。调整侧栏或屏幕宽度只改变布局，不写入项目或改动排序/进入行为。见[任务](tasks/GG-237-project-four-column-grid.md)。

GG-236把原hover浅灰外圈设为常态，两类项目默认可见边界；hover仍通过原预览轻微放大表达可进入，菜单/重试范围保持独立。见[任务](tasks/GG-236-project-card-default-frame.md)。

画布卡片主体链接到原canvas项目，旧创作主体按钮调用原恢复；封面、名称和日期范围都可进入。更多菜单和快照重试为独立兄弟控件，点击/聚焦不会误进入，hover也不触发进入动效。重命名/删除确认、错误重试、等待禁用及新建创作保持；恢复状态改在卡片内提示。重命名输入以灰底focus反馈，无黑环；提交黑底白字，取消灰底。

## GG-226 项目卡片管理

项目卡片移除英文眉题，日期显示「更新于 YYYY年MM月DD日」。画布卡片按真实保存文档/几何/连接和素材显示只读缩略快照，本机活动页优先，缺省第一页；空/读取中/失败有准确状态与重试，旧版创作保留真实批次封面。更多菜单提供重命名和删除；重命名校验现有名称长度，删除弹框说明只删除项目、素材保留，确认后请求完成才移除，失败保留卡片与输入并可重试。新建创作/项目进入目的地保持（卡片入口见GG232）。见[任务](tasks/GG-226-project-library-actions.md)。

GG-228画布开始非编辑操作时清除与当前画布DOM相交的残留浏览器Selection；界面文字不因拖动/原生全选出现蓝底。输入区仍可全选、复制、编辑；React Flow的框选、多选、拖动、排列及快捷键沿用既有行为。未取消pointer默认行为或抢焦点，弹框/输入外部的文本选择不被全局清理。见[任务](tasks/GG-228-canvas-native-selection.md)。

## GG-222 多选快速排列与完整选框

GG-229将对齐按钮造型替换为参考图的简洁线段式，水平与垂直两组轻分隔，hover/按下显示浅灰底；七个动作、键盘焦点、禁用条件、选框计算与保存/撤销保持。命令按钮不保留持久选中状态。见[任务](tasks/GG-229-canvas-alignment-icons.md)。

Shift框选或Ctrl/Cmd点选两个及以上节点后，选区上方显示七个常用排列图标。自动整理按上到下、左到右阅读顺序排成约sqrt列，各列/行留出真实可见占位并保持24px间距；其余六项按选区可见边缘或中心对齐。动作只移动节点position，生成批次仍是一个节点，媒体尺寸、参数与连线保持。

外框包含媒体上方信息与可见的生成批次卡片。显式展开或收起批次时，外框按目标占位更新并覆盖过渡期间内容；缩放后图标大小保持稳定，拖动选区与方向键继续使用React Flow原生范围框。缺少实测尺寸或框选中不提供排列，拖动/调整尺寸时按钮禁用；已对齐的无变化动作不保存或增加Undo步骤。完成排列进入已有每页撤销/重做与项目内容保存；当前活动页仍有pending上传/生成或未ready引用时，沿用原历史暂停保护，稳定后恢复。此操作不触发上传或生成，不恢复GG-135吸附/辅助线。

GG-225资产页右上搜索复用shadcn InputGroup/InputGroupAddon/InputGroupInput。输入内部无边框/焦点环，外层灰色focus-within提示；其他输入焦点保持。搜索尺寸/响应式/过滤与清空选择保持。见[任务](tasks/GG-225-asset-search.md)。

GG-224撤下无处理函数的「探索」；「资产」使用同一Lucide LibraryBig资料库标志，表达混合素材集合，名称/导航/新增提示保持。见[任务](tasks/GG-224-workspace-navigation.md)。

## GG-220 首页与展开侧栏

展开侧栏（GG-223）在hover或键盘聚焦时不再弹出重复名称；导航常驻文字和可访问名称继续提供说明，其他位置的Tooltip按原规则。见[任务](tasks/GG-223-expanded-sidebar-hover.md)。

PC端左侧无需点击展开即可看到图标和名称。点击「首页」的Home图标继续沿现有主页/创建导航；其他入口、权限与选中状态沿用原逻辑。移动端维持现有头部和菜单，仅同义首入口统一首页语义。资产到达轻提示、账户积分用量弹框与平台币退役保持；独立画布不使用此侧栏。见[ADR0118](decisions/0118-expanded-desktop-sidebar-home.md)。


## GG-218 canvas pages

旧单页画布打开为页面1，项目名称和资源ID不变。点击左上加号创建空页并切换，最多10页；点标签切换显示对应节点、连线与生成器草稿，各页撤销记录独立。切换先保存当前页本地快照，但切换/平移/缩放本身不发云内容写。上传或生成中切页继续任务，结果按原page/node ID回写；恢复项目读全部页并恢复本地激活页和视角。hover页标签出现×，点后先二次确认，至少保留一页；上传、运行或未确认提交页不可删除，删除完成页不删共享资产。页面名称重命名、页面间连线和整批取消不包含。

## GG-214 canvas Seedream generation

用户在生成器选择Seedream后仅设置1K/2K及自适应/文档八种比例；隐藏生图数量，实际请求n1。成功参考图（连线与直接上传去重）变化时，生成按钮显示基础30/60加第二张起每张2积分。无有效报价时禁用生成，不在浏览器猜价。仅用户点击提交真实任务。继续保留生成动效、提示词/参数/连线恢复及内联失败。多返回归为同一生成器，可整批移动并显式展开；当前入口不提供拆层模式。

## GG-213 GPT adaptive and automatic defaults

新生成器在画布参数中选择自适应（卡片仅居中文字），GPT内部draft仍adaptive，通过canvas专属resolver保留，服务端发size:auto；Nano沿旧省略aspect_ratio逻辑。分辨率仍决定路由/固定报价，真实像素来自完成图片。新质量默认为auto，旧显式选择不重置；GPT2四项、2.5六项，max显示极高。透明开关默认关/auto，开启立即写transparent与png，关为auto保留当前PNG，生成中禁用。所有选择仍随生成器保存/复制/刷新恢复，只有用户点击生成提交；大厅固定比例/旧任务不改变。替代GG-211默认medium与背景双选项。

## GG-211 / GG-212 canvas settings and generation

用户点击图片生成器，再点击参数入口，在向下展开的图像设置中用减号/输入/加号选择1–12，默认1。合法输入更新报价；临时空白或超界不写非法数量，失焦/回车恢复或截到边界。按钮在1/12禁用相应方向；数量与其他草稿一起保存、复制和恢复。大厅数量选择仍1/2/4。

GPT生成器可选质量（2.5五档、2三档）与自动/透明背景；新节点medium，旧输入auto保留。透明自动用PNG。只有用户点击生成才冻结canvas-image-v1、当前数量/质量/背景与报价版本；1K/2K路由-sp、4K路由-sd，明确未接单的渠道不可用才允许一次无后缀4K备用。每张独立任务的完整结果形成同一批次，按原序展开且一起移动；未知提交不重发，失败保留草稿，沿原重试入口。由站长手验，未代发请求。

## GG-206 连线持续悬停

在线条上静止超过一秒，剪刀按钮出现后线条继续亮蓝；沿线移动、停在剪刀按钮或回到同一条线均保持。移开线条与按钮、切换另一条线、点击空白或删除时清理旧状态。该反馈仅临时存在于当前页面，不触发自动保存。

## GG-208 / GG-205 图像设置数量预览

首次创建图片生成器就显示「自适应 · 2K · 1」；选择数量、切换节点后，图像设置摘要末尾显示当前有效的 1/2/4/8 等数字，不带单位。GG-208 取代 GG-205 最初隐藏数量 1 的规则，生成与报价行为不变。

## GG-204 图像设置完整展示

打开生成器图像设置后，所有当前可用的分辨率、宽高比和数量直接显示，不需滚动。面板根据屏幕和已打开资产栏的可见空间调整列数/尺寸，窗口、资产栏或 composer 大小变化时重新适配；提示文字不缩小、选择与报价不变。面板仍从按钮下方展开，空间不足时平移画布让完整面板进入可见区域；点击外部关闭。该规则取代 GG-194 的窄屏滚动。

## GG-203 画布 Nano 八图批次

选中 Nano Banana 2/Pro 图片生成器并打开图像设置后，生成数量以 `1`、`2`、`4`、`8` 纯数字显示。选择 8 只更新草稿与报价，明确点击生成才创建一个八图任务。无 count-eight 活跃报价或余额不足时继续阻止提交。切换 GPT 后不提供 8，也不会向其提交 8。画布保存、重开与复制保留 Nano 数量 8；全部输出仍作为一个批次堆叠，右下角按钮展开全部八张并再次收起。任一上游输出失败仍走已有整批失败/释放与重试流程，大厅数量控件不增加 8。

## GG-201 画布多选内容整体删除

用户按住 Shift 在画布框选多个节点后，可直接按 Delete 或 Backspace 一次删除全部选中内容；同时选中的连线以及被删节点的连接边一并移除。删除进入同一条画布编辑历史并触发项目自动保存，撤销可恢复删除前的稳定画布图。焦点位于提示词、名称编辑、资产改名、按钮、菜单或弹框时，删除键只保留当前控件的行为，不影响画布节点。

## GG-200 画布连线悬停反馈

已连接的参考图曲线默认显示中性灰。指针进入线条既有的宽命中范围后，曲线立即以明亮蓝色点亮；移开后恢复灰色。悬停不改变线条的可点击范围，不影响流动虚线或一秒后在线条当前位置出现的剪刀按钮。拖线预览继续使用灰色；减少动态效果偏好下，完成线为静态实线，颜色直接切换。

## GG-209 / GG-199 · 画布多图批次手动展开

多图成功后，整批默认在同一个生成器节点中收紧堆叠，完整首图后最多露出两层窄边，4/8 张不会让收紧堆叠继续变宽。悬停、聚焦或点击图片不换图。用户点击首图右下角双箭头后，全部图片按原顺序向右排开；按钮固定在首图右下角并变为收起图标，再次点击整批收回。按钮可用 Tab 定位、Enter/空格操作，不触发节点拖动；拖动可见图片仍移动整个批次。展开仅是当前查看状态，换任务或刷新时恢复收紧；图片不旋转、不跳资产详情、不重复显示后图名称或尺寸。减少动态效果设置下直接完成排布。

## GG-198 · 画布多图批次堆叠

以下为历史交互描述：单节点批次归属仍有效，换首图由 GG-199 取代，收紧边缘和按钮位置以 GG-209 为准。

选择 2 或 4 张并完成生图后，所有输出在原图片生成器节点中向右错位，作为一个不可拆分的批次。拖动任一可见图片都会移动整个节点。将指针移到后层图片露出的右边缘，或用键盘聚焦、点击该图时，它与当前首图交换槽位；前一张首图进入原后层槽位。卡片保持自然方向，没有旋转和悬浮。生成器上沿只显示一行类型名称与当前首图尺寸，后图不重复名称和尺寸。点击图片只完成画布选择/切换，不进入资产页；选中生成器仍打开该任务的提示词与参数。项目刷新按 job 的全部输出恢复同一批次；旧 GG-197 对当前 job 创建的冗余余图节点会被归并。单张、生成中和失败状态沿用原行为。

## GG-196 · 图片生成中隐藏外框

生成器任务处于排队、运行或精修时，即使节点仍被选中，也不绘制卡片外轮廓；下方输入框和参考图连线继续保持原有选中关系。任务结束后，空白/失败态的灰色选中轮廓和成功图片的蓝色悬停/选中轮廓恢复原样。

## GG-195 画布宽高比选项对齐

在图像设置中浏览「自适应」与各固定比例时，图形与文字都位于卡片中央的固定两行位置；比例轮廓自身在图形行内居中，切换选项不会使文字上下错位。选择方式和下方展开的设置面板沿用现有流程。

## GG-194 画布宽高比选项

打开图片生成器的图像设置后，宽高比选项以符号在上、文字在下的竖向卡片展示；自适应与固定比例按原四列排列。点击和键盘选择仍更改同一参数，面板继续固定向下展开并沿用窄屏滚动。

## GG-191 画布 Nano 默认规格

新建图片生成器时，两款 Nano Banana 的宽高比为自适应，分辨率为 2K，数量为 1；图像设置摘要显示「自适应 · 2K」。在新节点尚未手动选择分辨率时切换模型，Nano 使用 2K，GPT 沿用 1K；手动选择后切换模型继续保留该分辨率。刷新恢复的旧节点和复制节点保留已存草稿，不套用新默认值。提交前的报价按实际展示的模型、分辨率和数量读取。

## GG-190 画布媒体圆角

画布已加载的本地图片、额外生成结果图片、视频与图片生成器共用随节点尺寸收敛的圆角。悬停或选中时蓝色细框贴合媒体边缘；缩放仍保持原始比例，视频预览和生成器输入行为不变。加载失败及生成失败卡片保留原样。普通图片直角属于 GG-136 的历史设计。

## GG-189 画布生成规格

新建画布图片生成器时，Nano Banana 2 与 Nano Banana Pro 的宽高比显示「自适应」，旧生成器保留已存规格。打开图像设置时，面板只从按钮下方向下展开；底部空间不足，画布视角上移以完整显示，点击外部仍关闭。用户可选择 1、2、4 张，积分按钮随已选模型/分辨率/数量显示真实报价；无报价或余额不足时不可提交。点击生成后才创建任务，Pro 多图按每张独立上游任务执行并作为一次 GoodGood 任务保存；全部输出按 GG-198 留在同一生成器批次中。自适应结果按照解码后真实宽高展示，刷新项目恢复相同设置和结果。本地 32131/32142 已由 GG-189 更新，待站长手验。

## GG-176 画布键盘操作

点击空白画布可让画布接收键盘操作；Tab 可定位节点和连线，Enter/空格可选择焦点对象。Ctrl/Cmd+A 全选可选节点及连线，Delete/Backspace 删除选中内容，Esc 清除选择。Ctrl/Cmd 点击进行多选，Shift 拖动框选；焦点在节点上时方向键移动节点，Shift 加速；按住空格可拖动平移。地图按钮旁的键盘图标展开快捷键提示，点击外部关闭；空白右键菜单只放画布动作。删除继续走现有节点/边变更与上传、预览、参考图清理，内容变动按 GG-175 保存；仅改变选中状态不保存。焦点在提示词、项目名称、资产改名、按钮或菜单时，各控件沿用自身键盘行为，不触发全选或删除画布。

## GG-177 复制粘贴与画布编辑历史

选中节点后 Ctrl/Cmd+C 复制，Ctrl/Cmd+V 粘贴在原位置右下方，并选中新副本。两端节点都被复制时带上它们之间的参考图连线；素材与已完成结果仍引用原有服务端记录，生成器复制当前草稿和已就绪的直接参考图，不再次上传或生成。上传中/失败的素材、未完成/失败的结果及未就绪参考图不允许复制。Ctrl/Cmd+Z 撤销最近一次稳定画布图编辑；Ctrl/Cmd+Shift+Z 或 Ctrl/Cmd+Y 重做。节点添加、删除、移动、缩放及连线变更进入最多 40 步的本标签页历史，视角移动、选择、输入框文本编辑、上传/生成进度不进入。上传或生成开始时暂时挂起历史，完成后以新状态重新开始；页面刷新后历史清空，但最终画布图继续按项目自动保存。输入框继续使用浏览器原生文本撤销。

## GG-167 画布图片生成器与参考图连线

首次进入 `/canvas` 只见纯白画布与基础控件，不显示底部 chat。在空白处右键并选「图片生成器」（GG-207 命名）后，指针所在画布位置出现浅灰方形图像占位节点；GG-172 起桌面初始尺寸与方形图片一样最多 238×238px，窄屏按图片节点的视口上限缩小，点击位置仍落在节点中心。GG-180 起节点上沿左侧有带小星点的图片图标和「图片生成器」标签，与普通图片的文件名行对齐；中央仍是浅灰图像占位符。此时不上传或生成。点击该节点时，原 chat 以不随画布缩放的尺寸出现在节点下方；点空白或其他节点即隐藏，切换生成器时显示目标自己的提示词、模型、规格和直接添加的参考图。删除节点会丢弃这个未保存的草稿；节点和连线均不持久化。

把画布图片右侧的连接点拖到生成器左侧，可形成参考图连线。GG-179 起可见深灰圆点圆心位于节点边缘外约 11px，灰色外晕在可见时缓慢呼吸；周围较大的透明区域可起拖线。接近生成器输入端松开也可由 React Flow 的连接半径捕捉，非法连接仍按原校验拒绝。当前本地图片上传中时，参考图位保持等待并禁止生成；成功拿到 `reference_assets` ready ID 后方可提交，失败可重试或断线。资产库引用图片直接使用 ready ID；生成结果或生成资产先通过受权服务端导入为 ready 引用，导入前不得伪称已可生成。直接上传加连线总数最多十张；每条连线只归属其目标生成器，删除边或源节点即移除相应输入，不删除已经保存的资产。视频、音频、无有效图片资产的节点不能接入。悬停/删除、键盘可用性及明确点击生成的原边界沿用。

GG-257 取代 GG-171 的持续流动，已完成参考图连线默认静止实线，仅连线/剪刀 hover 时流动；GG-200 起，指针进入现有宽命中范围时可见线条变为亮蓝色，离开恢复灰色，不改变命中范围。用户在同一条线上停留 1 秒后，剪刀按钮的正中心出现在线条上、对应鼠标最近的曲线位置。鼠标沿线移动时图标跟随；提前移开不显示，点击按钮断线，点击空白或离开线条与控件后收起。断线移除该生成器的参考图输入，不删除图片资产。减少动态效果偏好下，连线保持静态实线，颜色即时切换。

## GG-166 画布长提示词展开查看

在 `/canvas` 输入短提示词时，右侧展开控件不出现。输入增多后，提示词框先自动增高，超过默认上限产生内部滚动时，右侧出现展开图标。点击后提示词区域向上增高以查看更多内容，图标变为可点击的收起操作；再次点击恢复默认高度和内部滚动，不改变文字或生成参数。按钮支持键盘聚焦和操作；调整窗口宽度时，显示条件跟随文本实际溢出情况。文字末行与滚动条末端在底部工具栏上方留出间距，提示词滚动条不显示上下原生箭头。内容可滚动时，鼠标进入提示词区域才显示滚动滑块，移出后淡出；未悬停时鼠标滚轮、键盘滚动和原生滑块拖动能力仍在。

## GG-165 画布参考图添加入口

画布输入区的参考图托盘始终在提示词上方，零张图时也显示浅灰色「参考图」卡片，图像图标位于文字上方；有图时卡片跟在按序号排列的同形 54×68px 缩略图后。点击卡片打开本地 JPEG/PNG 选择器，立即展示本地预览，同时按现有接口申请上传地址、直传文件并完成校验。真实上传期间，缩略图复用画布图片的轻暗遮罩与呼吸光；成功后去掉效果，清晰图片保留与入口一致的比例。只有服务端成功返回的素材 ID 可用于生成。满十张时隐藏入口，移除任意一张后恢复；原有悬停预览、删除、失败重试与生成门禁不变。底部工具区不再显示「添加参考图」文字按钮。

## GG-163 画布右键菜单

在 `/canvas` 的空白画布上按鼠标右键，指针旁出现内部菜单，第一项是「图片生成器」（GG-207 命名），GG-210 在文字左侧增加与生成器节点一致的图片加星点图标，垂直居中。GG-167 起该项创建临时图片生成器节点，GG-163 的禁用占位是历史状态；点击外部或按 Esc 可关闭菜单。节点、资产栏、地图、顶部和输入区右键不打开空白画布菜单。画布页面不显示浏览器原生右键菜单，离开页面后恢复浏览器原有行为。

## GG-161 画布本地图片/视频真实上传

有权限的用户从电脑把 JPEG/PNG/MP4 拖到 `/canvas` 后，文件立即以本地预览节点出现，真实上传进行时保持轻暗遮罩与原位呼吸光；没有固定三秒进度或「上传中」文字。成功后光效消失，节点选中，已打开的资产栏刷新；素材可在资产库再找到，但画布位置仍不会随刷新保存。失败时本地预览、文件及节点保留，提示原因并可点「重试」；上传中删除会中止当前请求。视频的短期签名预览地址失效时按需刷新，仍不可读时有预览重试入口。已有资产从侧栏拖入不重新上传，输入区参考图仍按原流程工作。本节取代 GG-160 固定 3 秒模拟、GG-126/GG-146 本地素材不入库的旧描述。

## GG-162 画布资产小图

GG-233 取代以下小图文件名行：首位「+」卡片打开仅有「上传文件」「链接」的菜单；选择文件后沿现有接口上传 JPEG/PNG/MP4/MP3，图片直链在链接浮层内粘贴并按向上箭头或 Enter 提交。只有服务确认 ready 后刷新真实资产；在文件夹中添加归档到提交时的文件夹，归档失败说明素材已在全部资产并可只重试归档。每个失败文件保留单独重试，链接失败保留输入；关闭侧栏停止仍在读取的链接，但已开始的私有上传继续入库，重新打开读取真实结果，已打开的新面板也会收到旧上传完成后的刷新通知。新素材仅进入资产库，不自动放入画布。图片保持完整原比例并隐藏名称，双击图面或键盘 F2（也可 Enter/空格）才出现名称编辑；拖入、预览和 Enter/失焦保存、Esc 取消规则保持。窄面板一列，面板至少 240px 时两列，默认 248px 为两列；文件夹始终为有名称的 1:1 圆角卡。加载、读取失败和空库保留添加入口。见[任务](tasks/GG-233-canvas-asset-cards-and-add.md)。

打开 `/canvas` 左侧资产列表时，图片和视频素材以 28px 方形小图展示原画面的中心区域；文件夹图标和素材名称列继续对齐。将焦点移到小图或鼠标悬停其上，仍显示较大的完整比例预览。长文件名省略、文件夹箭头、拖入画布和双击/F2 改名继续按 GG-155 流程工作。

## GG-160 画布本地图片放入预览

用户从电脑将 JPEG/PNG 拖入画布后，本地图片节点立即出现并保持原有落点、文件名与像素尺寸；图像保持清晰，轻暗遮罩下的柔和玻璃光晕原位明暗呼吸约 3 秒，不横扫、不显示上传文字。计时结束时效果移除并选中本批新增图片，用户可继续移动、等比缩放或删除。这个过程不触发网络上传；输入区参考图仍走其原有真实上传流程。已存在于资产栏的图片直接拖入以及生成结果不经过这个假进度状态。

## GG-155 画布资产拖入与改名

打开 `/canvas` 左侧资产列表后，从任意图片、视频或音频素材行开始拖动，到右侧可见画布区域松开，会在松开的位置增加一个临时节点；在资产栏内松开不添加。生成图片读取现有资产的原图地址，已上传素材沿用已有私有读取地址，不重新上传、不触发生成。图片和视频沿用已有节点的原比例预览与移动；音频显示文件名和播放控件。画布节点位置仍只在当前页面存在，刷新后清空。

列表缩略图缩为 34px 方形并居中裁剪。仅悬停或键盘聚焦缩略图时出现较大的完整预览，移到文件名不会触发它。双击文件名（键盘可用 F2）原位编辑；Enter 或失焦保存，Esc 取消。名称为空或超过 255 字时留在编辑态说明原因；服务端失败也保留原名称和输入内容供重试。保存成功后侧栏即时更新，重新打开资产页也会读到同一显示别名，原始文件和下载对象不变。此前 GG-151 的只读浏览规则由此显式扩展。

## GG-153 大厅图标栏

在 720px 以上的大厅，用户从左侧窄栏按原有入口切换创作、画布、探索、项目、资产及角色对应管理页；底部保留帮助、反馈和账户菜单；平台币已由GG-217移除。积分用量从头像菜单可点击的「积分」行进入页面内弹框；左侧不再单列积分记录。鼠标悬停或键盘聚焦图标时，右侧显示对应中文提示；当前页面用浅灰背景标出。顶部 G 图标复用画布品牌图形，点击走现有创作导航逻辑。新增资产沿用图标轻提示，数量包含在资产入口的可访问名称与悬停提示中，栏内不显示数字。移动端继续使用原头部与导航，不受图标栏排版影响。
账户弹框左侧以「积分明细」标识当前板块，主区标题同为「积分明细」；今日、本周、本月消耗在各自标签下仅显示数字。画布右上角的积分余额也是同一弹框的入口，关闭后留在原画布。明细表的第二列表头是状态筛选入口，默认「全部」，可选「已消耗 / 已获取」；列表加载、为空或读取失败时表头仍保留，用户可继续切换筛选。

## GG-151 画布资产浏览

在 `/canvas` 左下角点击资料库图标，从页面最左侧展开资产列表并覆盖画布左边；React Flow 画布维持原始尺寸与节点坐标，顶部标题、底部输入区、地图和缩放入口向右让出宽度。再次点击图标、侧栏关闭按钮或 Esc 可收起，操作画布本身不会自动关闭侧栏。桌面端鼠标移到侧栏右边缘时仅变为横向缩放光标，不显示黑色描边；按住拖动时侧栏与这些控件实时同步移动，画布底层不被缩窄；取消拖动恢复原宽。范围从 248px 到当前视口允许的上限；键盘聚焦边缘后可用左右箭头微调。关闭再打开保留本页宽度，刷新后恢复默认。根层先见文件夹，再见素材；点击文件夹进入，顶部返回入口回到全部资产。素材以缩略图/类型图标和文件名排列，鼠标悬停或键盘聚焦图片/视频行时浮出较大预览，离开即收起。正在读取时显示载入状态，读取失败可重试；空列表与空文件夹分别说明。此浏览动作不改变画布节点或输入区参考图。

## GG-150 临时画布名称

进入 `/canvas` 后，26px G 图标旁紧邻显示同高的「未命名画布」。鼠标悬停名称时变为文本编辑光标，名称区呈浅灰底；点击后同位置出现随内容宽度变化的输入框，不显示外侧焦点边框，并默认选中旧名称。Enter 或失焦保存去空白后的值，Esc 恢复旧值；输入空白时使用默认名称。名称最长 20 个中文字符，超出显示区时省略。当前画布布局未持久化，名称同样只在当前页面有效，刷新重置；图标的「主页」菜单仍独立运行。

## GG-149 画布主页菜单

在 `/canvas` 点击左上角圆形 G 图标，于其下方打开菜单；选择「主页」导航到 `/create` 主工作台，与此前返回箭头的目的地一致。菜单支持键盘聚焦、Esc 和点击外部关闭。画布临时节点离开后仍依既有规则不保存，已生成资产保持在服务端。

## GG-148 画布地图

进入 `/canvas` 时左下角地图展开，显示节点缩略形状和标示当前画面范围的中灰矩形，矩形外轻微淡化；移动或缩放画布时矩形跟随更新。拖动地图可移动画布视口，滚轮可在地图内缩放，均沿用 React Flow 的 10%–800% 边界。点击百分比左侧地图按钮可收起或再展开，按钮的按下状态同步。百分比仅显示数字与 `%`，不带右侧下拉图标；点击数字仍打开原缩放输入、放大/缩小、适合屏幕和 50%/100% 菜单。地图只是本页视口导航，不保存节点布局。

## GG-147 画布输入区参考图预览

点击画布参考图托盘中的方形「添加」入口打开原有本地文件选择器；选中的 JPEG/PNG 仍按既有私有上传流程进入参考图数组。缩略图按添加顺序自左向右排列并显示 1 起始的序号；删除任意项后，剩余项即时重新编号。缩略图仅做居中裁剪，悬停或键盘聚焦会在上方展示完整原图。右上角删除仅在悬停、聚焦或触屏时可见；上传中状态、失败重试和十张上限继续生效。这个预览不打开图片详情，也不改变提示词、报价或提交生成的门禁。入口位置按 GG-165 调整。

## GG-146 画布本地视频

用户将本地 MP4 放到 `/canvas`，视频以 React Flow 节点出现在落点附近，并按现有私有素材流程上传。上沿左侧是播放三角形与可省略文件名，右侧只显示原始宽高；窄到不足时按图片节点规则收起名称和尺寸，保留播放类型图标。原始宽高与时长通过视频加载获得；不再解析或展示 FPS。加载完成后节点按原视频比例贴合完整画面，早期保存的横向占位尺寸会自动校正；已按比例缩放的节点保持其大小。用户可自由移动、选中并从四角等比缩放。静止时展示封面、中央播放按钮和左下总时长；鼠标悬停后静音预览并隐藏按钮/时长，移出时暂停和恢复覆盖信息，再次悬停从原进度继续。页面隐藏或用户启用减少动态效果时自动播放暂停。移除节点或离开页面释放本地对象 URL。

## GG-145 画布图片元数据

本地图片拖入后，上沿左侧显示原始文件名；生成图片成功后显示按已有下载规则生成的文件名。两者左侧都有图片图标，右侧显示原始像素宽高；本地尺寸尚未取得时显示横杠，图片加载后补齐。生成结果缺少后端原始尺寸元数据时也显示横杠，不使用缩略图宽高。缩小节点时长名称省略，变宽后自动展开；继续缩窄时先隐藏名称，极窄时隐藏尺寸，图片图标始终保留且元数据不换行。拖拽、四角缩放或画布缩放不改变尺寸数值，也不触发上传、重新生成或保存画布布局。

## GG-141 画布 AI 输入区

提示词继续受控，多行自动增长并可用 Ctrl/Cmd+Enter 提交。参考图按钮打开既有私有图片选择与上传流程，缩略图位于提示词上方。点击「比例 · 分辨率」摘要展开图像设置，可选择当前报价支持的分辨率、当前模型支持的宽高比和生成数量；点击模型摘要展开现有模型列表，GG-142 起每项名称前显示对应 Nano Banana / OpenAI 单色图标，GG-144 起依次为 Pro、Banana 2、Sunburst、Flare、Image 2（不可用项仍隐藏）；三个 GPT 画布名称统一使用 `GPT Image` 和首字母大写的变体名。GG-143 起生成按钮仅显示闪电与报价积分，点击后仍按原登录、上传、报价、余额和提交门禁运行；提交中同位显示载入，无报价时禁用显示横杠，读取中、无报价和失败恢复提示保持可见。窄屏底部工具重排为两行。

## GG-140 画布顶部操作

右上角不再提供本地图片文件选择和适应画布按钮。本地 JPEG/PNG 通过拖放进入画布；生成参考图仍由输入区的独立按钮选择。视口拟合从左下角百分比菜单执行。

## GG-138 画布缩放

进入 `/canvas` 时画布为 100%。左下角显示实时百分比，点击展开白底黑字菜单；点击菜单外关闭。放大、缩小和适合屏幕作用于 React Flow 视口，快捷选择 50% 或 100%。在菜单顶部输入百分比并按回车或离开输入框后应用，小于 10% 或大于 800% 的数字分别收敛到边界；无效输入恢复当前值。滚轮或手势改变视口时百分比同步更新。菜单没有 800% 快捷项，但输入或普通放大仍可到达 800%。图片初始尺寸受桌面固定上限和窄屏视口上限约束，仍保持原图比例。

菜单的「适合屏幕」自动拟合所有节点，但不会把单张小图放大到超过 100%。顶部同名按钮已由 GG-140 撤下。随后选择 50% 会得到固定的绝对比例，不叠加前一次缩放。

## GG-130 画布图片选中与缩放

图片主体悬停和拖动时使用系统默认箭头；GG-137 起悬停和选中都显示贴紧边界的细蓝框，悬停不改变选中状态，也不压暗图片或显示缩放控件。GG-190 起已加载图片和视频与生成器共用圆角，边框贴合裁切边缘；GG-136 直角为历史设计。选中后四角缩放命中区没有可见样式；靠近角点的小型透明命中区显示对应的对角缩放指针，旁边直边仍是普通箭头；拖动任意角时媒体按原始比例缩放。生成结果仍可点击进入资产详情；未加载、加载失败和生成失败节点没有缩放命中区。旧的 GG-129 单右下角样式已由 [ADR 0110](decisions/0110-canvas-image-selection-frame.md) 替换。

## GG-129 画布图片缩放

将鼠标移到本地图片或生成结果上，指针为“移动”；按住图片可移动节点。单击选中已加载图片后，右下角出现缩放点；拖动缩放点按原图宽高比改变卡片大小，内容不拉伸。单击生成结果仍进入资产详情；未加载完成、加载失败或生成失败的节点不显示缩放点。刷新后节点和尺寸仍按当前临时画布规则消失。

## GG-128 画布图片悬停

GG-128 时本地图片与生成结果图片悬停仅有轻微灰阶遮罩；GG-137 后由细蓝亮边框替代，仍不会展示节点操作按钮。节点仍可拖动和选中，生成结果点击进入资产详情。用户从输入区独立选择参考图，生成失败仍可重试。旧的本地节点查看大图、用作参考及移除覆盖层已按 [ADR 0109](decisions/0109-quiet-canvas-image-hover.md) 移除。

## GG-126 画布本地图片（历史实现）

把本地 JPEG/PNG 拖到画布时在落点附近即时出现图片节点，多张并排；GG-126 曾提供顶部文件选择器和「适应画布」按钮，现已由 GG-140 撤下。图片保持原比例，节点可移动。最初的节点悬停查看、加入参考与移除操作已由 GG-128 取代；输入区的独立参考图选择、最多 10 张、上传中、失败重试、移除规则继续有效。移除画布节点不会删除已上传素材。文件类型、空文件或超出 20 MiB 会在输入区显示错误；拖放不触发上传或生成。

## GG-125 独立画布生成流程

在大厅点击 `画布`，或直接访问 `/canvas`，进入独立全屏画布。空画布可平移、缩放。用户输入提示词，可选参考图及已定价模型、比例、分辨率、数量；上传完成且报价与积分有效时，点击 `生成` 明确提交。任务占位节点随后变为图片或可重试错误；点击图片打开既有资产详情，拖动节点调整项目内的节点位置。失败的参考图可重试或移除，计费/登录读取失败可重试；页面刷新从画布项目恢复已保存的布局和草稿，已生成图片仍归入资产。返回 `/create` 使用正常路由加载其持久草稿。

## GG-121 unified asset flow

Open `/assets` into one file collection. Media tabs and uploaded/generated icon
filters narrow it without changing file identity; search matches file names.
In grid mode, folders appear above the `项目` file section; in list mode, root
folders lead the same table as files. Opening one narrows the same collection.
Grid images keep their real ratios. Hover/focus reveals the card menu and a
separate bottom-right selection button; clicking the image opens its existing
detail or private preview. The hover veil and empty selector indicate an
available action without suggesting selection. A check appears only after the
selector is activated, and an open menu keeps its trigger visible. Video tiles
hide their title, keep the source ratio and play a muted loop while visible;
offscreen and reduced-motion previews pause. List rows show a selection box outside the left row
edge, leaving the header and thumbnails aligned with the category controls;
the right edge has a hover/focus menu. Selecting one file reveals all file
boxes and a top select-all box for visible files. Folder tiles expose a
top-right Rename/Delete menu and bottom-right selection button; list folder
rows offer the same menu and an outside selection box. Folder and file selection
are mutually exclusive. Selected folders use the same floating toolbar with
count, Delete and close; their contained files return to the root when the
folder is deleted. File selection exposes Download, Move, Delete and close.
There is no toolbar
More action or tag editor. `Esc` or close clears selection. Delete asks for
confirmation and permanently removes generated images or uploaded media; the
generated-image notice says settled credits are not refunded. The file menu
retains `用于创作` where applicable. Grid/list switching retains filters and
selection. `新建 → 上传文件` opens the native file picker directly and starts
uploading after selection. The current folder is captured as the destination;
uploads from the root remain unclassified. The bottom-right tray reports upload
and organization failures and offers retry without an in-page upload dialog.
`新建文件夹` opens an in-page dialog with focus in the name field. Rename opens
the same dialog with the current name selected. Empty names cannot submit.
Enter saves, while Cancel, Escape or outside click closes; a create or rename
failure stays in the dialog with the entered name available to edit.
Opening a folder clears root search/filter state and shows a breadcrumb back to
`资产`. Its search only narrows that folder. Empty grid and list views offer a
large upload target; list headings remain visible. The button opens the native
file picker, and dropping files on the target uses the same upload path. Files
are validated and uploaded into the captured folder. A fixed progress tray
shows real per-file states, completed count, errors and retry for failed rows;
closing it does not change uploaded assets. After refresh, the folder shows the
new file in the active grid/list view. A failed folder assignment is reported
as an uploaded file needing organization from all assets.

## GG-115 assets flow

Historical GG-115 flow: open `/assets` into generation history; media filters showed counts and
empty states (transient video previews are not history). Switch to personal
library for folders and all saved generated/uploaded media. The root lists all
items, while an opened folder narrows the grid; search checks names and tags.
`上传资产` opens a focused dialog: select multiple supported files, choose folder
and optional tags, then see each upload's ready/failure state. A completed
upload remains in the library even if folder assignment fails. The same private
image/video upload boundaries are reused by the composer and library; MP3 has a
private material boundary. Files above 20 MiB and formats outside JPG/JPEG,
PNG, MP4, MP3 are rejected before transfer. Earlier upload limits in this file
describe historical checkpoints.

GG-096认证入口：受保护页未登录进入`/login`，可用固定子导航切换`/register`；登录只显示邮箱/邮件码，注册直接增加邀请码。登录提交发现新邮箱时自动切注册并保留邮箱、挑战和邮件码。安全`returnTo`恢复原站内业务页，认证字段不入URL。GG-091的邀请码规则继续有效：缺码/无效码不注册，既有active无需邀请码；每账户固定六位码可无限邀请，暂停邀请者的码不可用于新注册。

GG-090已有账户默认邮箱登录；新用户点击使用邀请码注册，填写邮箱、邮件码及邀请码，双验证后直接进入工作区。登录时有效邮件码发现未开通/新邮箱，会提示邀请码并切换注册，保留邮件码；无效邀请码可修正再试，达到挑战失败上限须重新发码。旧pending会话使用邀请码开通，重新验证邮箱；暂停仍人工恢复。站长邀请码只生成成功当次显示明文，关闭后不可重读；响应丢失重试显示对应提示，停用后再生成。

GG-087桌面帮助下方/手机账户菜单进入个人反馈，保存当前创作。提交在Sheet选择类型（GG088固定向下展开）、信息、0—5张图片；失败保留输入和同内容操作键，提交期间禁止关闭，成功进入详情并刷新列表。本人查看状态/站长回复并手动刷新；站长过滤状态、打开详情追加回复或改状态，版本冲突保留回复并提供刷新。

GG-086平台币发行进度是历史交互，已由GG-217移除。

GG-217移除平台币个人/站长页面及所有导航，不提供替代奖励入口；旧地址按未知路由处理，正常积分页面与生成流程保持。历史GG-084—086的发行/退款回收交互停止，数据记录保留。

GG-081站长入口进入/admin/operations，既有管理深链接保留。增加积分弹窗默认测试，下拉六类；充值才显示凭证及已收款确认，数量或凭证修改后重新确认，充值赠品另记赠送。失败保留编辑与同内容幂等键，成功关闭并刷新余额/审计。看板展示现金充值金额/笔数/人数/积分、当前生成并发、排队、每日峰值；缺历史显示暂无统计，刷新更新时间戳，提交数量不再作为指标。

GG-117 removed the case-publish/reuse/preview flows that GG-073 through GG-077
defined: the board entry, the dedicated case editor, the 发布灵感案例 control on
image detail, hover previews, comparison settings, likes and the view/use
statistics are gone, and no route replaces them. The flows below are retained as
a record of the retired design. See
[ADR 0104](decisions/0104-inspiration-feature-retirement.md).

GG-254 replaces GG-072's personal home: account menu → account dialog, with
personal information selected first and credits as the other section. Username
(default `mimi`) edits as plain contenteditable text; avatar stays a local file
preview until its adjacent confirm icon is clicked. Rules appear below the active
edit. Outside pointer/focus or Escape cancels unconfirmed changes; Enter focuses
confirmation without saving. Confirmed upload/save disables dismissal and section
changes until complete. Failed saves preserve the draft, version conflicts offer
reload. Six-digit user ID/email/invitation are text. Legacy `/profile` returns to
`/create` and opens this dialog; no personal works page remains.

GG-272 displays account creation time as a read-only text row after invitation, using the account timestamp in Asia/Shanghai as YYYY-MM-DD HH:mm. Missing/invalid values show 暂不可用. Loading/error handling and inline name/avatar editing retain their existing behavior; this value cannot be edited or copied via a new control.

GG-259 keeps the pencil visible before hover. Name/avatar rules reveal within
their reserved wrapped space below the active editor, preserving field/label
positions. User IDs are fixed six random decimal digits, unique and independent
of registration order; existing display numbers are reassigned once.

GG-071 owner operations: choose an end date and 7/30-day trend, click a daily
bar/date to show that day's metrics. Logs: select tasks or credits, enter mailbox,
task/batch ID, bounded calendar range and event/state, then query. Next page uses
stable keyset; filter query resets page. Details open on the same route, showing
submitted parameters and linked credit timeline; Esc restores trigger focus.
Aborted/stale requests cannot overwrite current filters/details. Read loading,
empty, normalized failure/retry remain visible without placeholder metrics.

GG-070 replaces directory matrices with cards. Click opens a right pricing Sheet;
existing routes, quality/discount edits, trial quotes and one atomic save remain.
Quick enable/disable stays on the card. Adding uses the same Sheet, with scrollable
fields and a pinned save footer. Cancel/Esc discard drafts and restore trigger
focus; saving blocks close. Search/filter and access/loading/error/empty states
remain. Full matrix values are no longer displayed in the directory.

GG-069 adds an overall discount to image/video route pricing. Input 98 means
98% (9.8折), 80 means 8折; apply updates every current-route specification and
quality/reference rate. Each route retains its first-application baseline;
repeat applications do not compound and 100 restores that baseline. Save uses
existing final-price persistence; cancel discards changes. Reopen starts from
saved prices at 100. Invalid input preserves prices and shows an inline error.

GG-068 video pricing switches 标准/备用, retaining separate prices and enable
states; one save commits both. Initial rates retain owner values, which can be
edited directly to independent discounted retail prices. Trial parameters stay
when switching, with the selected route's price. Seedance 2.5 is first in admin
and creation, with 480p/720p/1080p. Existing default 720p and references stay.

GG-067 supersedes the video-second pricing flow below. The video editor shows
two RMB/million-token fields per supported resolution, an actual-use calculator,
and optional response JSON extraction. Choose reference-video state explicitly;
images/audio do not select that rate. Read completion_tokens only, never add
total_tokens. Single-task credits round upward once. Invalid usage shows an
error and preserves inputs. Legacy seconds require new token prices; the
current pure mock preview still does not debit video credit.

Each GPT line retains fixed-resolution pricing or opts into quality pricing.
The editor lists resolution columns and model-owned quality rows, plus a quality
selector in the price calculator. GG-065 list rows show only price ranges; quality
details are viewed through the pricing editor. GPT 2.5 creation shows xhigh/max; GPT 2 does not. Auto pricing on a
quality line explicitly uses the highest price. Errors preserve the edited values.

# UX flows and state contracts

GG-062 extends the Banana three-line flow to GPT IMAGE 2/2.5: new creation defaults
to special, selection updates the independent fixed quote, and unavailable lines
remain disabled without automatic fallback. Site owners edit and enable each
line in the existing model dialog; original prices and model flags remain intact.
Restored drafts/projects keep the chosen line.

## GG-057 site-owner navigation (local candidate)

- Account and model management share a `站长管理` header with `账户管理` and
  `模型管理` links. Exactly one link marks the current page. The same header
  remains during directory loading, empty, and read-failure states after access
  has been confirmed; signed-out and denied accounts keep their access gates.
- `返回创作` and the brand link go directly to `/create`; switching tabs uses
  `/admin/users` and `/admin/models`. Neither action begins login or replays
  browser history. Native Back/Forward remains available.
- GG-058 removes direct logout from the management header. Use `返回创作` and
  the creator account menu for sign-out; access gates retain their logout action.
- Revisiting `/api/auth/login` in explicitly configured local mode retains a
  valid current identity or signs in the configured default, then redirects to
  a validated local return path. Missing local defaults fail closed. Production
  OIDC/email OTP and site-owner permissions remain unchanged.

## GG-052 site-owner model pricing (local candidate)

- Enter `模型管理` from the site-owner navigation or account-management tab.
  Pending/suspended accounts retain their access gate; ordinary members see a
  no-permission state. Session expiry returns to authentication.
- Search/filter and use `添加模型` or `编辑 / 定价`. Adding uses an integrated
  adapter template; saved ID/template are stable. Names/descriptions may change.
  Disable stops new submissions; accepted jobs retain their adapter and price.
- Enter RMB output prices by resolution and reference-video-second prices
  (zero permitted). Display credits at 1 CNY = 100 credits. All resolutions need
  positive output prices before enabling; unpriced drafts may remain disabled.
  Trial quotes combine quantity and output/reference seconds, rounding the
  fractional total upward to one credit.
- `保存并生效` persists a new edit version and applicable immutable image prices.
  Failures keep input, conflicts require refresh/reopen, and loading/empty/retry
  states stay inline. Images consume published prices; video preview has no
  settlement. No actual-token surcharge follows an accepted creator quote.

GG-053 refines this panel: the list shows each model name once and groups image
and video models with aligned resolution prices. RMB is primary; credits show
the equivalent image/second unit. Video output/reference rates are separate,
and unpriced/supported specifications differ from unsupported ones. The editor
groups inputs by resolution. New catalog IDs are generated automatically;
existing IDs remain stable. `接入详情` reveals the ID's purpose, adapter name and
configuration version on demand. These technical fields do not repeat in the
list or normal price editor; conflicts and server-side version checks remain.

GG-054 keeps one Banana model name with three price rows (特价/优质/专线),
each aligned to 1K/2K/4K. In the editor, line buttons switch independent price
inputs and trial quotes; unsaved inputs survive switching and one save commits
all lines. Line enable and model enable are distinct. Enabled lines require
complete positive prices and a known provider mapping. Original prices remain
on special; other lines start unpriced/disabled. Pro trial quantity is 1.
The composer shows three line buttons below a Banana model, defaulting to
special on new creation/model change. Unavailable lines are disabled; restoring
an unavailable choice explains recovery instead of silently substituting it.
Changing lines changes the displayed quote. Drafts/projects/retry/details retain
the line; accepted tasks retain the choice and quote after disable/reprice.

## Authentication

- On first load, confirm the GoodGood session before enabling owner-scoped
  work; keep the loading state quiet and blocking.
- Signed-out and expired sessions use the addressable `/login` recovery page and
  preserve a validated same-origin business `returnTo`. Email mode keeps fixed
  `登录 / 注册` navigation: login shows mailbox and six-digit code, while register
  adds the six-digit invitation. A new mailbox discovered during login switches
  to register without discarding its challenge or code. Password, phone, and
  social login are absent. OIDC rollback mode keeps its hosted button.
- Sending is user-initiated. Before a challenge exists the code control is
  disabled. After a successful send, the same control shows a 60-second resend
  countdown. Editing the mailbox invalidates the old challenge/code but does not
  shorten that cooldown. Focused mailbox/code/invitation inputs change border
  only, without a focus shadow. Refresh restores only a browser-bound active
  challenge; mailbox/code/invitation never enters a URL or localStorage.
- Invalid/replayed/expired/cross-browser codes use stable copy and keep the
  current creative state. Uncertain delivery asks the user to wait/check mail;
  it does not claim inbox delivery or automatically send a second message.
- Session expiry preserves the in-browser prompt, references, parameters, and
  completed local view state, then allows the user to sign in again.
- The account card shows the authenticated email and exposes explicit logout.
  Logout revokes the GoodGood session and expires its cookie. Only the deployed
  OIDC mode additionally navigates through Authing's hosted logout.
- The authenticated workspace shows available credit in the desktop account
  area and as a compact mobile balance. Initial loading stays quiet; a read
  failure keeps the workspace usable and offers a local retry. Zero is a valid
  balance, never an empty or error state.
- The lower sidebar has no credit-record entry. The account trigger opens a
  menu with identity, a clickable `积分` row with the available balance, and
  logout. Selecting `积分` opens the account-management-style usage dialog over
  the current workspace; the compact mobile balance opens the same dialog.
  Closing it preserves the composer, project, and active generation. The dialog
  shows the current available balance and settled spend for today, the current
  Monday-based week, and the month, plus `全部 / 消费 / 获得` filtering and
  previous/next cursor pages of at most 20 rows. `/credits` remains a
  compatible deep link, not the primary entry.
- A generation reservation is one user-facing record. While open it reads as
  processing and settlement changes it to consumed. Release and refund entries
  do not appear in the user-facing usage table; the original ledger remains
  intact. Raw reserve/settle rows and internal reasons never appear.
- The `类型` column identifies `图片生成 / 视频生成 / 其他变动`. Generation
  rows show the recorded project and model; unavailable historical context stays
  empty. The rightmost `任务 ID` column abbreviates the real generation-job ID
  and offers a small button to copy it in full, with local success/failure feedback.
  Resolution, count, prompt and result controls remain in asset details.
- Credit-record loading, empty, first-page failure, retry and next-page failure
  preserve the page silhouette and any already loaded records. Selecting a page
  replaces its rows; changing the filter returns to the first page. A successful
  generation is traced by its task ID. Records
  before credit metering are not invented or backfilled.
- First valid email verification (or deployed Authing login before cutover)
  provisions a new GoodGood owner in `pending` access state.
  The authenticated pending surface replaces the creation workspace with one
  compact review message, shows that the 100 welcome credits are waiting, and
  offers status refresh plus logout. It does not render usable upload, project,
  asset, or generation controls.
- Approval moves the user into the normal workspace without another identity
  registration. If access is later removed, current in-browser creative state
  is preserved locally where safe, but new owner-scoped reads and mutations
  fail closed and the global account-state surface replaces the workspace.
- The only access states are `pending`, `active`, and `suspended`; there is no
  rejected state. The normal approved workspace corresponds to `active`.

### Site-owner account management

- Only a persisted site-owner role sees the account-management navigation and
  route. Direct URL or API access by every other account is rejected by the
  backend, regardless of hidden controls.
- The first useful view lists all accounts. One access-state select is the sole
  status filter; do not duplicate it as summary cards above the table. Loading,
  empty, read-failure, and retry states stay restrained. Search and filters must
  not place email addresses or other personal data in the URL.
- Review actions show the target account and resulting state explicitly.
  Repeated submission is idempotent. A failed action keeps the current row and
  filters intact and shows the support ID.
- Each row shows email, registration and last-login times, one resolved display
  identity, `seed` / `内测用户` tier, access state, and available/reserved
  credit. The display identity is `站长` for the site owner; every other account
  is exactly `个人`, `企业`, or `分销商`. Valid actions are approve, suspend,
  restore, and test-credit grant.
- Wide account tables give email, identity, and direct parent their own columns;
  the email cell does not carry secondary identity or hierarchy text. Narrow
  cards preserve those as two separately labelled fields and render a missing
  direct parent as `—`.
- Test-credit grant is a compact dialog showing the selected account, current
  balance, validated grant amount, required reason, and final confirmation. It
  appends ledger/audit evidence and never looks like a customer payment.
- The dialog takes a manual positive-integer amount with no preset buttons;
  one grant may not exceed 1,000,000 credits (RMB 10,000 at 100 credits per CNY).
- Routine review and grants happen in this surface. The one-time site-owner
  bootstrap remains an out-of-band security operation, not a public signup
  shortcut.

### Distributor allocation (implemented locally, not deployed)

- The site-owner account surface keeps system role, access state, account tier,
  and business role separate in authorization and persistence, while resolving
  them to one row-level identity label. A site-owner row shows only `站长` and
  does not offer business-identity or direct-parent controls. Other rows may be
  set to `个人`, `企业`, or `分销商`, and may create/end/replace one direct
  parent, with target, prior/resulting state, reason, and explicit confirmation.
  It never presents those actions as payment.
- ADR 0060 permits one current business identity per account: personal, enterprise
  or distributor, never enterprise plus distributor. Users needing both use two
  independent accounts. Existing role replacement ends the old assignment before
  inserting the new one; it does not move money, relationships or company data.
- Only an active distributor can allocate through `分销管理 → 客户与下级`.
  Enterprise management has no direct-account/transfer-history tabs.
  There is no standalone allocation main-navigation item. Direct navigation by
  any other account stays denied even if it knows the URL. The first view shows
  total available credit, `可分配积分` (payment-funded available credit), and a
  direct-child list. It does not show exchange price, CNY, revenue, commission,
  order, prompts, generations, or assets.
- Selecting a direct child opens a compact allocation dialog with the child,
  current transferable balance, positive integer amount, optional non-secret
  remark, and final confirmation. The browser never decides provenance or
  submits a balance. A successful response updates both the summary and that
  child row and shows the public transfer reference. If post-acceptance reads
  fail, retain the confirmed account result and show the completed public ID
  with a read-only refresh action; never describe this as a failed allocation.
- Insufficient transferable credit is distinct from insufficient total credit:
  the UI explains that welcome/test/promotion credit cannot be allocated. A
  duplicate click returns the same completed transfer; a conflicting replay,
  ended relationship, suspended account, or concurrent balance change keeps the
  current view and offers a safe refresh using the support ID.
- Transfer history shows `上级分配` or `分配给下级`, signed credit amount, time,
  counterparty display identity, and public transfer reference. Completed rows
  are immutable and expose no parent reclaim action.
- `查看记录` on an account row opens `划拨记录` scoped to that counterparty.
  Filtering uses only loaded pages, not a new API query. When a cursor remains,
  explicitly disclose the partial range, preserve load-more even for an empty
  filtered page, and offer `全部记录`. The main history tab clears the filter.
  Filters are not persisted into creative drafts or URLs.
- A business child may reallocate received payment-funded credit only if the
  site owner independently granted it the distributor role and it has its
  own direct children. Relationship depth never broadens a user's visible list
  or permission.
### Enterprise workspace and member management (implemented locally; not deployed)

ADR 0057 removes the desktop/mobile global Workspace switcher for every account,
including site owners. Creation and the main account navigation stay personal.
ADR 0060 keeps enterprise and distributor management as main-sidebar entries,
with personal-credit allocation and history only inside distributor tabs;
commercial identity exposes features but never grants company data access.
Managers enter their organization directly (a management-only directory is used
for multiple organizations); overview/members/usage/Assets are horizontal
content tabs inside the shared app shell. Legacy enterprise account URLs return
to enterprise management for an enterprise, or the corresponding distribution
tab for a distributor, without resetting creation. Only distributor identity
grants allocation; company membership/platform role does not. Employee
invitations never establish commercial direct-child relationships.
Personal composer state and polling
remain mounted while visiting management. Invitation acceptance refreshes this
directory without automatically entering enterprise creation.

Legacy scoped creation URLs retain membership checks and quiet company context;
returning to personal creation never transfers drafts, credit or Assets.

ADR 0059 replaces overview shortcut tiles with operational facts. Zero company
credit, missing/paused/exhausted active-member budgets and pending invitations
expiring within 48 hours lead to the existing budget dialog or member page;
opening overview never allocates credit. Members are ranked by cumulative
settled usage, not monthly activity. Monthly metrics remain explicitly pending
until complete aggregation exists. Recent successful company outputs use the
manager asset boundary, up to six previews; clicking opens a read-only dialog
with prompt, parameters, creator and time. Closing restores thumbnail focus.

The platform site owner creates an organization for a verified principal and
assigns its first `org_owner`. Organization owners/admins then use a separate
enterprise management view in the normal app shell to:

1. enter an employee email and role;
2. see the pending invitation without creating credentials;
3. let the employee log in normally and accept the matching invitation;
4. allocate or reclaim only unspent member budget with a reason;
5. suspend/restore membership without suspending the person's GoodGood account;
6. inspect settled/processing/released usage and generated company Assets by
   member.

Invitation loading, empty, failure, expired, already-accepted, and email-
mismatch states preserve the current dialog/page input. Budget confirmation
shows organization available/unallocated capacity, the member's current and new
limit, and the exact change. Failure keeps the selected member and reason.

Every creator, including an owner/admin, needs an allocation to generate in an
organization Workspace. The creation composer shows organization name, member
remaining allocation, and organization availability without exposing internal
account IDs. Insufficient member budget and insufficient company credit are
distinct recoverable states; neither falls back to personal credit.

Organization managers see a team Asset view filtered by creator. Opening an
Asset shows the output, prompt, parameters, creator, and generation time but
does not sign creator-only reusable raw references. Ordinary members see only
their own organization work. A removed member loses organization access
and new signed reads; company history remains visible to authorized managers.

## Creation surface

### Empty

Show only a small GoodGood mark, one primary sentence, and a quieter secondary
sentence. Image mode says `描述你想创作的画面`; video mode says
`描述你想创作的视频`. Do not insert sample images, tutorials, or parameter
descriptions to fill space.

### Composer

- Empty prompt submission: short toast, keep focus available.
- Settings opens an attached overlay below the prompt/reference tray in either
  mode; results stay in place. Toggle closes it without losing values. Closed
  controls are inert; long drawers scroll internally within available viewport
  space, including after prompt growth or page scrolling (ADR 0055).
- `图片 / 视频` is always visible as a quiet segmented control attached below
  the prompt row. Image remains the default. Switching affects only the active
  composer and preserves separate in-memory inputs; it never alters an active
  image job or sends a request.
- Prompt: autosize from one to eight lines; scroll after eight.
- A standalone `---` line (optional surrounding spaces/tabs) separates concurrent
  prompts in image and video modes. Inline hyphens/longer rules remain literal.
  Trim and ignore empty segments, keep duplicates and source order; all-empty
  input submits nothing. Do not add a separate batch summary in either composer;
  retain the multiplied image quote beside send. Parameters and ordered
  references are frozen and shared.
  Image mode submits one durable multi-output job per segment; local video mode
  submits one single-output request per segment/output. Failure/retry is isolated.
  Image quotes multiply the server's per-segment quote; reservations remain per
  job, so partial acceptance is possible on insufficient credit. Composer/draft/
  project retain full source; assets/models use their individual segment only.
  A retry of a segment still present in a batch project keeps that full prompt
  context, without re-submitting siblings. Image input total stays at 4000 chars.
- References: the add control offers local upload or selection from the owner's
  uploaded materials. Append in upload/selection order, deduplicate by stable
  reference ID, and enforce the shared maximum of 10.
- The tray sits above the prompt in both modes. External images/videos may be
  dropped anywhere on the composer; dropping video in image mode opens video
  mode without submitting. Internal image dragging still reorders thumbnails.
- Check each file before creating its preview. JPEG/PNG/WebP images and
  MP4/MOV videos have a 200 MiB original upload limit. Rejected
  files stay out of the tray and name the allowed limit or format. Failed
  uploads keep the local preview, show a safe reason, and offer retry/removal.
- A selected reference appears immediately from its local file, with a small
  uploading indicator while the original transfers and is validated in the
  background. Up to two files upload concurrently; one rejected file does not
  stop the others. The tray retains a failed file for retry or removal during
  the current page session. A timed-out completion is reconciled against the
  owner-scoped material status before the tray declares failure.
- It becomes ready only after direct upload and server-side decoded validation.
  The reusable material keeps the original. Generation prepares a bounded
  model input copy without delaying the upload preview.
- The tray uses moderately enlarged responsive 1:1 centered crops and scrolls
  horizontally without wrapping: 96px desktop / 80px mobile (ADR 0056).
- Every tray item shows `图 1…图 10` at the lower left. Dragging one item onto
  another moves it to that position and immediately renumbers the tray. Focused
  items support `Alt + ← / →` for the same operation.
- Clicking a ready tray item opens a viewport-contained quick editor in its
  neutral view tool, with the complete uncropped source available for detail
  inspection. Enter/Space opens the focused item; Escape closes the editor.
  Uploading/failed items and completed drag gestures do not open it. The smaller
  upper-right remove control deletes without opening the editor.
- Video-mode tray items support click/Enter/Space to open a read-only focused
  preview of the complete image or controlled video/audio. No autoplay, editing,
  new upload or material creation. Escape/close restores trigger focus; nested
  removal does not open preview. Loading/error/retry preserve composer materials.
- Crop, brush, sticker, and arrow edits affect the exported pixels. Stickers may
  come from a local file or the owner's reusable materials and can be moved,
  scaled, rotated, or removed. Box selection reports pixel and normalized
  coordinates relative to the current cropped output; copy and prompt insertion
  do not burn the box into the exported pixels.
- Undo, redo, and reset operate inside the current editor session. Closing with
  pixel-affecting unsaved edits asks for confirmation. Completing an edit uploads
  a new reusable material and only then replaces the current `图 N` in the tray;
  a project-backed session persists that replacement before reporting success.
  The original material remains reusable, and export/upload failure preserves
  the editor state for retry.
- Send is blocked while any retained reference is uploading or failed. Ready
  references preserve their tray order in the submitted batch snapshot.
- Video mode accepts local JPEG/PNG/WebP, MP4/MOV, and WAV/MP3 references for frontend
  composition. It also offers `从资产库选择` as one media-aware picker for image,
  video, and audio assets, preserving stable asset IDs and private read URLs
  without transferring bytes again. Generated images, uploaded images, and
  uploaded videos feed the current frontend; audio filters remain empty until
  its durable API is connected. Images from either source may be marked
  `首帧 / 尾帧 / 参考图`; selected videos and audio become reference media.
  Selection respects the model's per-type and total-media limits, and IDs already
  present in the video tray are disabled. Video settings default to `多模态`, where
  images, videos, and audio use `参考图片 / 参考视频 / 参考音频` roles. `首尾帧`
  accepts only two images and derives `首帧 / 尾帧` from tray order; video/audio
  upload and asset filters are disabled. A model or mode change is blocked when
  retained media exceeds the target capability, without silently removing it.
  Each preview has one lower-left label only: multimodal displays `图片1 / 视频1 /
  音频1` ordinals, while first/last-frame displays only `首帧 / 尾帧`.
  The source menu has one `上传素材` action rather than separate media-type rows;
  its native picker accepts only image, video, and audio MIME types still allowed
  by the active mode. Images use the private reference store; uploaded videos
  enter an owner-scoped private library after validation and can be reused.
  Audio remains session-only.
  `创建素材` is a separate, opt-in selection dialog with nothing preselected and
  a concurrent-processing promise. Until the material API arrives, its commit action
  is visibly unavailable rather than simulating a returned material ID.
  Before final video submission, every historical created material is checked
  again. Valid items may proceed; expired, evicted, or indeterminate items keep
  the draft intact, block submission, and offer `重新创建`.
  Local object URLs give immediate previews while image/video uploads finish.
  The current text-only video preview still refuses to submit with references.
- Settings: attached downward overlay drawer above results; closing it must not reset values or move results.
- Settings read from aspect ratio to model to output; aspect ratio is the leftmost
  wide-screen group and stays first through responsive reflow.
- Model list: opens within the parameter drawer and collapses after selection.
- Video model order is Seedance 2.5, Seedance 2.0, Seedance 2.0 Fast, then
  Seedance 2.0 Mini. Video settings use aspect ratio, model, provider line, and
  generation mode, then output. Provider line defaults to `标准`; `标准` maps to
  Doubao and `备用` maps to HC without changing any other selected value;
  output contains resolution, integer-second duration, and `有声 / 静音` rather
  than image-only options. Video count supports 1/2/4 (default 1), independently
  of image count. Every click freezes current inputs and starts that many single-
  video requests concurrently; another batch may be submitted while earlier ones
  run. Each result/failure belongs to its own ordered slot. Poll interruption
  keeps its task ID and offers query-only recovery, never an automatic new POST.
  Seedance 2.5 exposes 480p/720p and 4–30 seconds; standard
  Seedance 2.0 exposes 480p/720p/1080p/4K and 4–15 seconds; Fast and Mini expose
  480p/720p and 4–15 seconds.
- Nano Banana 2 accepts its 14 displayed ratios; each of GPT IMAGE 2.5
  sunburst, GPT IMAGE 2, and GPT IMAGE 2.5 flare accepts `9:16`,
  `2:3`, `3:4`, `1:1`, `4:3`, `3:2`, and `16:9`. Both use the existing
  `1K / 2K / 4K` resolution domain and support `1 / 2 / 4` outputs.
  The pixel readout follows the selected model's exact size table. A model
  change keeps a compatible ratio or visibly moves to the nearest supported
  ratio in the same orientation, and normalizes an unsupported count to one.
- Selecting Nano Banana 2 reveals only the `谷歌搜索` (`关闭 / 开启`, default
  `关闭`) segmented control in the attached drawer. New Nano requests use the
  internal high-thinking mode without exposing a creator control or detail row.
  Changing to another model hides and resets Google Search. Historical
  low/high values remain in frozen records for exact retries but are not shown.
- Selecting any GPT image model reveals `质量` (`自动 / 低 / 中 / 高`, default `自动`),
  `背景` (`自动 / 透明`, default `自动`), and `输出格式`
  (`PNG / JPEG / WebP`, default `JPEG`). Choosing transparent while JPEG is
  selected immediately moves output format to PNG; JPEG remains disabled until
  background returns to automatic. Leaving GPT hides and resets all three.
  Draft/project restore, retry, and image detail use the frozen values.
- Unsupported model/count/domain combinations fail before submission without
  replacing values inside an immutable generation snapshot.
- Keep the active server quote next to the composer actions as plain metadata,
  for example `10 积分/张 · 共 40`; do not turn it into a purchase call-to-action.
- Send: upward arrow in a circular button. It remains available while earlier jobs generate; each
  click freezes the current composer values and submits one independent job per
  nonempty prompt segment (one job when no separator is used).
  Active styling and the creation stream communicate progress without blocking
  another click. There is no product-side concurrent-job count ceiling.
- In a configured local development workspace, video send is available by
  default through the loopback-only real Seedance route. It never calls the image
  generation boundary or renders a synthetic result. This route supports
  text-to-video only, uses GG-039 independent concurrent 1/2/4 slots,
  polls each returned task ID, and labels the playable result as local and
  not persisted. Reference media stays in the draft and blocks this temporary
  submission until the durable upload/material boundary exists.
- The Seedance transport contract uses `POST /v1/seedance/assets` and its typed
  status query for explicit materials, plus `POST /v1/video/generations` and its
  task query for videos. Multimodal with no references is text-to-video; the
  existing reference roles map directly into the ordered provider `content`.

Reference ordinal is the current tray index and is stored in data for prompt
interpretation. The visible `图 1…10`, accessible name, draft/project order,
generation snapshot, and provider reference order must all describe that same
array; there is no separate display-only ordinal.

### Authenticated root draft

- `/create` is the canonical creation URL. `/` remains a compatible direct
  entry, and choosing `创作` or confirming `新建创作` moves history to
  `/create` without mounting a second workspace instance.
- After the authenticated session resolves, the root creation surface restores
  the owner's unexpired draft before autosave starts. A direct project route
  restores only that project and never applies the root draft over it.
- Meaningful root changes to prompt, ordered ready references, model, ratio,
  resolution, count, or model-owned generation options save after a short
  debounce. Uploading/failed references pause saving until the retained set is
  ready.
- The draft expires 30 days after its last successful write. Empty root state
  removes it; saving the root context as a project or confirming
  `新建创作` also clears it.
- A load/save failure preserves the current page state and offers retry. If
  another tab has advanced the draft version, autosave pauses and presents
  `保留当前内容` and `恢复云端草稿`; no tab wins silently.
- Draft persistence does not include project edits, generation batches, or
  active job state. Existing explicit-discard confirmation remains authoritative
  for destructive in-app transitions.

## Generation lifecycle

Canonical states:

```text
idle -> queued -> rendering -> refining -> complete
                    |             |
                    +-----------> failed
failed -> queued (retry)
```

- Create an immutable input snapshot at submission containing the prompt,
  ordered reference identities, stable model ID, ratio, resolution, and count.
- Give every click a stable client run identity and insert it at the top of the
  current creation stream. Replacing its temporary `pending_*` ID with the
  durable server job ID must not create or erase another run.
- Use ratio-correct skeletons for the requested image count.
- Render active task skeletons and completed images in one creation masonry.
  Submission creates the final ratio-correct slots immediately; success replaces
  those slots in place without moving another run or redistributing previously
  generated images.
- On success, replace skeletons with assets in place and prepend the completed
  batch to the asset library without rendering the batch twice.
- Asset metadata shows the requested resolution together with that Asset's
  decoded pixel dimensions, for example `4K · 3584 × 4800`. It never derives
  actual dimensions from the nominal tier or another Asset in the batch.
- Refresh the account summary after a job is accepted into the queue and after
  every terminal outcome so reserved and available credit converge without a
  full page reload.
- On full-batch failure, replace that run's active task area with one compact
  inline status strip that summarizes the requested count. Concurrent failures
  retain separate strips; do not repeat one run's error per requested image.
- A GPT or Nano Banana multi-output batch succeeds only after every requested image
  is decoded, stored, and committed. A missing or invalid output fails the whole
  batch and exposes no partial Assets; partial-result settlement requires a
  later explicit provider and billing policy.
- Do not reorder an older completed batch above a newer submission merely
  because the provider completed out of order; sort by submission time.
- On failure, keep the failed batch location and all input state.
- `重新生成` always submits the failed immutable snapshot, even if the composer
  has since changed. `修改设置` restores a mutable copy of that snapshot into
  the composer before opening the parameter drawer.
- A retry updates only the selected run. Guard the retry action against a rapid
  duplicate activation because it may create another billable upstream task.

## Page-header navigation

ADR 0061 removes the persistent top-right return actions from Assets, credit
activity, distributor management, all four enterprise content tabs and site-owner
account management. Existing navigation and tabs stay unchanged. No replacement
entry is added to the standalone site-owner page. Error-body recovery, browser
history, dialog/detail close, logout and `新建创作` remain available as before;
this does not authorize creative-state clearing or route changes.

## Continuous creation and projects

- A creation session accumulates batches newest-first.
- `保存为项目` names and persists the whole current context.
- Once saved, new batches are automatically associated with that project.
- Restoring a project restores the latest prompt/model/ratio/resolution/count,
  all batches and their order, and its ordered ready reference links. Private
  image and reference URLs are freshly signed on each read.
- Project index and detail use `/projects` and `/projects/:projectId`. Direct
  access, refresh, and browser back/forward re-enter the same owner-scoped
  restore flow; a failed detail read offers retry, return, and `新建创作`.
- Project list loading, empty, and read failure states stay in place; save
  failure remains in the drawer and keeps all current creation state for retry.
- `新建创作` starts a clean session. A changed prompt, reference set/order,
  generation setting, or unprojected generation is meaningful work. New-session
  clearing or restoring another project requires an explicit discard dialog;
  `继续编辑` preserves the full state, while an active generation blocks the
  destructive action until it reaches a terminal state.
- Saving an unprojected root context as a project transfers continuity to the
  project and clears the separate root draft. Project edits remain governed by
  project save/restore rather than root-draft autosave.

## Asset library

All successfully generated images and accepted reference uploads enter the
asset library automatically. `生成图片` and `上传素材` are separate sections:
generated images keep their batch/gallery modes, while materials list the
owner's reusable uploads newest first with filename, dimensions, size, and a
direct `用于创作` action. A material already in the current tray is visibly
disabled rather than duplicated.
The library uses `/assets`; direct access, refresh, and browser back/forward
reload the current owner's durable assets without resetting the in-memory
batch/gallery mode during an in-app detail round trip.

From the composer, `从资产库选择` opens a focused multi-select dialog using 1:1
centered thumbnails. Loading, empty, and failed reads keep the dialog silhouette
and expose retry. Confirming adds the chosen stable IDs in selection order and
does not transfer object bytes again. Video mode extends the picker with
`全部 / 图片 / 视频 / 音频` filters. Selected assets join the video reference tray
with their real media type and consume the active Seedance model's matching
per-type and total reference capacity.

### Batch mode

- Group by calendar date; newest date and batch first.
- One row per batch.
- Images dominate the row. Prompt and compact parameter tags are secondary.
- Preserve ratio and count; do not use mock layout that contradicts selected
  generation parameters.

### Gallery mode

- Suppress prompt/parameter weight so visual selection dominates.
- Mixed ratios share a coherent row height while widths follow ratio.
- Use the same tight gap and outer-corner treatment as creation.
- Selection is separate from opening detail.

## Image detail

GG-037 provides an isolated preview-session `?media-preview=1` mock of unified
image/video creation and detail. Completed video covers open the same three-zone
layout; wheel over the stage, arrow keys, and the mixed rail navigate completed
works. Closing restores the grid and focus. Playback is explicitly a simulated
cover motion, not real generated media. No mock item enters drafts or projects.

- Available from generated images and both asset views.
- Uses `/assets/:assetId`; direct access and refresh resolve the stable asset ID
  from the authenticated owner's asset list.
- Left: largest possible complete image on a neutral stage.
- Middle: prompt, parameters, save/download actions.
- Right: vertically scrollable rail of all images in current scope.
- Wheel down/up and arrow keys select next/previous image; metadata changes with
  the image and the URL is replaced with that asset's stable ID. The page beneath
  must remain fixed and restore its source scope, selected asset mode, and scroll
  position after close or browser Back.
- A missing, inaccessible, or temporarily unreadable asset keeps its detail URL
  and offers retry plus return to the asset library.

## Notifications

Site owners enter `站长管理` from the lobby sidebar (one compact mobile entry).
Enterprise opens first; enterprise/model/account links switch the right-hand
content, and GG-061 adds `审计日志` for the latest 30 account-management actions.
The old account-page recent-action list is removed. Audit refresh and read errors
have explicit loading/retry states; an empty list does not masquerade as a failure.
All four functions switch right-hand
content without reloading the creation shell. Existing admin URLs, refresh and
Back/Forward use this same shell. Creation inputs and tracked jobs stay in memory.
With the sidebar hidden on mobile, management replaces the direct sign-out avatar
with an accessible creation return; management itself exposes no direct logout.
Successful model/account changes refresh shared billing/directory data so returning
to creation uses current prices/availability/balances. Ordinary enterprise manager
access and all server authorization remain unchanged (ADR 0067).

- Toast: brief confirmation or local validation (`已添加`, `已下载`, missing
  prompt). Never the only record of a generation failure.
- Inline status: ongoing generation within the creation stream.
- Inline error panel: durable job failure with recovery actions.
- Asset navigation cue: completed assets arrived; clear when assets is opened.

GG-077、GG-078、GG-079 描述的参数可见性档位、大厅查看/使用去重统计与点赞规则已随灵感板块整体下线移除，
不再有对应页面或端点；见 [ADR 0104](decisions/0104-inspiration-feature-retirement.md)。
# GG-173 · 画布保存与恢复

打开 `/canvas` 后为新画布分配稳定项目地址；从「项目」打开画布回到 `/canvas/:id`。改名、拖动和缩放节点、增删节点及连线、编辑任一生成器参数/提示词/参考图等内容变化先写本地，再串行同步服务器；连续拖动与缩放只提交最终状态，重复内容不写。平移、缩放和适应屏幕只在操作结束后记住本机视角，不触发项目保存提示或服务器写入；选中、悬停和播放预览亦不触发。顶部显示「保存中」「已保存」或「未同步 · 重试」；未同步时说明网络或本地存储错误，点击重试或恢复连接后继续同步。刷新先恢复本地待同步内容和本机视角；两处同时编辑产生版本冲突时，本页内容自动另存为新画布并提示，原项目不被覆盖。等待上传的本地 File 可在同一浏览器恢复并重试，未收到任务 ID 的生成请求不自动重发。见 [ADR 0114](decisions/0114-durable-canvas-projects.md)。
## GG-182 画布生成器真实结果

GG-268：空白画布右键可新增「文本编辑器」。内容直接显示Markdown效果，输入快捷语法或粘贴Markdown会转换格式；选中节点时上方显示正文、H1/H2/H3、粗斜体、删除线、列表、引用、代码与文本撤销/重做按钮。四角自由改变尺寸，字号随尺寸调整并自动换行；编辑中的选区、剪贴板和撤销由编辑器管理。右侧文本端口连接图片生成器左侧唯一的接收端点，图片也接到同一点。旧text目标连线保存/恢复时规范化为reference且保留ID。生成器上方图片/文本输入共用文件卡，视频创作附件也用相同尺寸/图标，点击预览、移除/断线；接收文本在前，自身描述空行分隔追加在后，可仅用接收内容生成。合计超过4000字符时明确提示并阻止提交，不截断；点击生成后固定当次合并快照。内容、尺寸、连线随项目多页保存恢复，后续编辑不改写已提交任务。

GG-270：画布资产「添加」提供创建文件夹，使用现有名称中第一个可用的「文件夹N」，创建成功回根层显示。文件夹右键重命名/删除，已保存图片、视频、音频右键提供既有改名与删除；键盘可聚焦卡片打开菜单。删除沿用二次确认和既有规则：文件夹解除归档、素材回根层；素材永久删除、生成积分不退回，已有引用可能失效。失败保留卡片并允许刷新重试；上传占位由既有上传组件管理。

在任一图片生成器的 chat 点击生成后，该生成器保持原 ID 与参考图连线。GG-185 起，排队、生成及精修时隐藏中央图标或旧图，在灰色卡面显示缓慢变化的柔和反光，减少动态效果时静止；上传图片仍用原有呼吸遮罩。真实任务完成时，首张图在原生成器卡面展示；失败时在原卡面提示原因。两张或四张规格的其余输出继续出现为独立结果图片，不能丢弃。画布可有多个编号生成器，各自保存提示词、模型、比例、分辨率和数量；一个节点正在生成不阻止另一节点操作。完成后点击生成器图片仍选择它并显示附着的 chat，内容保留该节点上次提交的参数与提示词。序号、已确认任务 ID、节点位置和连线随项目保存；刷新恢复时仅查询已有任务，不自行发起新的付费任务。未收到任务 ID 的请求在本地标出状态未确认，不自动重发。早期任务另起首张结果节点的描述只适用于旧数据。

GG-187 起，首张图完成且返回有效解码像素尺寸后，原生成器上沿右侧显示该图的宽×高；排队、失败或未提供尺寸时不展示虚构值。额外结果仍各自标注自身尺寸；项目重开时沿已存任务 ID 读取相同元数据。
## GG-308 文本快捷栏与模板资产

文本编辑/文本生成结果单击选中时显示快捷栏，第一项设置模板；双击或Enter/F2才进入编辑并显示格式工具栏，退出编辑回到快捷栏。空节点仍显示禁用的设置模板，生成/恢复中不可保存。点击设置模板冻结当前内容、以首行作默认名称，确认保存后进入私有资产；错误保留内容/名称、同一尝试可重试，不重新生成或收费。后续编辑源节点与模板独立。

两处资产列表提供1:1文字缩略，内容超出方形只显示可见部分；查看按钮读取完整文本，失败重试/切换关闭取消旧读取。画布沿原重命名/文件夹/删除，模板可拖回画布成为独立文本编辑节点，沿原撤销和项目保存；资产页新增文本筛选并支持完整Markdown下载、移动与删除，不把模板归为已上传媒体。完整内容不由截图或预览恢复。新的持久保存接口/0063需另行更新Web及迁移，本轮未启用。见[GG-308](tasks/GG-308-canvas-text-template-assets.md)/[ADR0133](decisions/0133-canvas-text-template-assets.md)。

## GG-346 · 打开即参考校色

选中上传就绪图片/实际输出→调色→读取当前原图及该输出冻结参考→自动匹配→在自动结果上微调→保存新图片。更换参考取消旧读取并重新自动匹配，重选同张也重新匹配；不悄悄跳过失败参考。无参考时展开资产选择，允许仅手动；黑白/透明等缺少统计也保留手动入口。查看调整前只改变展示，恢复自动调整回到强度100%/手动中性。保存锁定参数快照，按原始文件实际JPEG/PNG格式与原像素尺寸经既有createCopy提交，不提供格式选择，源图不变；读取/匹配/预览/保存错误分别在原区域，保留参数重试。关闭/取消/Escape/切页/身份/源节点失效会取消异步资源和未提交导出，关闭回原入口。
