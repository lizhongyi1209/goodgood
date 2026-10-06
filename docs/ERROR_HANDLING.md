# GG-063 quality pricing errors

## GG-407 · 缺料保留所选模型

素材缺失不再阻止选择模型，也不自动跳回O3；缺图/视频或未就绪素材仍由原模式规则/校验禁用生成并就地说明。显式模型切换只去除超量引用，在素材适配中仍超限时禁止生成，不在每次增删素材时静默删除。模型更换立即清旧报价，新报价失败时沿原错误显示/禁用，不拿旧模型价格提交。原未知受理/失败/保存重试及冻结输入保持。

## GG-401 · 场景时长与参考输入

总长/单场景滑块使用整数分配自动维持合计，添加/删除不会产生不匹配总长；达到最多6场景或无可分配秒数时禁止再加。空场景、首场景连同连接文本超512及总串超3072仍沿原校验，确认禁用并在开始编辑后就地显示说明；不静默截断用户描述。运镜参考合并连接文本超限时禁用，只替换完整匹配的预设行并保留其他内容。取消/关闭不写入，已锁定任务不改变。历史缺省multiShot按false解析以避免把旧冻结任务切成自动。原请求失败恢复及权威服务端校验不变。

## GG-390 · 分镜编辑引导

合计时长不等于总时长、空镜头、无效秒数、描述超512（包括首镜头连接文本）或总描述超3072时，弹框就地说明并禁止确定，不向Provider提交。取消不覆盖原配置。原生API校验继续作为最终边界；手动模式不再把原主描述同时放入整体prompt导致互斥错误，连接文本不被默默丢弃。

## GG-389 · 多视频独立恢复

所有卡片和冻结请求先建立，提交分别处理。明确4xx或Provider未配置属于未受理，保留卡片/输入和有界说明，刷新后仍可单项重新提交；服务器已有failed任务使用原输入retry。网络/5xx不认定未受理，保持原requestId查询，避免重复消费；save_failed仍只重试保存。每条独立server积分事务，部分受理按各自任务实际预留/结算，不虚构整批成功。

## GG-388 · 视频参数ResizeObserver反馈

截图的ResizeObserver通知循环属于前端布局，堆栈只指开发错误叠层。源码中Radix Popper size在观察回调写入可用高度，而弹层max-height读取它并改变观察尺寸，构成反馈。改为独立读取触发按钮/可视窗口、动画帧按变化写入自己的高度上限；关闭卸载取消帧。不屏蔽全局错误或改开发叠层，保留实际业务错误。未执行浏览器复现，用户手验仍待完成。

## GG-384 · 视频失败与恢复

VIDEO_UNPRICED/VIDEO_PRICE_CHANGED在任务创建/积分预留前拦截；授权、素材格式/尺寸/时长、重复用途与描述错误不提交Provider。queued素材准备失败或上游明确4xx拒绝关闭任务并释放预留；上游FAILURE同样释放。超时、网络断开、5xx、缺失回执或提交中断不得认定未扣上游资源，转submission_unknown并保留预留，不自动POST。已知task_id的查询短暂失败仅延后查询。上游SUCCESS先保留结果再保存，下载/存储/结算暂失败变save_failed，retry-save不走生成调用。失败详情仅owner/workspace读取脱敏HTTP状态、模板路径、上游请求/任务标识等，不保留提示词/素材数据/认证/带签名URL；前端卡片提供恢复动作和折叠错误详情。旧Web/0068未应用时创建入口能力检查保护画布保存；源代码不等于接口已生效。


## GG-356 · Seedream模型约束修复

新增0066修正GG-355发现的提交前数据库拒绝，不改任务/积分事务、上游失败映射或自动重试。迁移校验和沿现有runner，失败回滚约束和迁移记录；本地执行限制锁等待/语句时间，只应用已核验的0066，发现其他待应用迁移或历史校验和不同则停止。普通生成仍需用户点击，不自动重放原失败请求；其他上游错误仍按既有路径报告。

## GG-355 · Seedream提交前数据库拒绝

22:14两次POST /api/generations返回503 INTERNAL_ERROR，是generation_batches_model_check拒绝Seedream ID，发生在任务落库和积分预留之前；事务回滚，没有Worker任务或上游模型请求。普通界面由API通用兜底返回“生成服务暂时不可用，请稍后重试”，此处重试相同请求无法避开约束。仅诊断记录，后续需要新增迁移同步模型限制；不得推断成provider繁忙、令牌/参考图/比例问题，亦不自动重放请求。

## GG-354 · 原图框选恢复

读取原图尺寸期间不允许拖框/复制，短暂加载状态后仅bbox与取消/复制；失败在右侧给出重试读取，取消始终可用。空框`bbox=[]`不可复制；剪贴板失败保留坐标供手动选择复制，复制成功只换勾图标。指针取消恢复拖动前选区；取消/Escape丢弃临时选区并回当前图片，切页/身份/源图改变或取消选中结束浮层、不抢新页面焦点。关闭取消读取及剪贴板结果回写，尺寸取得即释放解码资源，不写源图/模型/积分。

## GG-352 · 框选与贴图恢复

原图连接/权限/空文件/解码失败留在编辑器，允许重读；本地贴图仅JPEG/PNG/WebP真实签名、20MiB、单边<=16384且<=4000万像素，拒绝损坏/无效/超限输入。逐张添加失败只报告失败图片，保留已添加图层；满10张停添加并提示。复制失败仍可选中区域文本手动复制；选框为空不允许复制。

导出失败、浏览器画布不可用、安全错误或合成PNG超过20MiB均保留贴图草稿供调整；不插入虚假成功图片。旁置副本提交沿项目就绪/页/身份/源图守卫，后续上传失败沿现有局部重试和恢复。处理中锁定，关闭/切页/身份/目标变化取消未提交操作，忽略旧异步结果，回收已移除/全部关闭图层URL及原图。指针取消还原起始变换，多指不覆盖已活动拖动。

## GG-350 · 图片结果格式诊断

站长总日志区分图片 URL 缺失/无效/不支持的协议、base64 图片数据无可下载链接、
mime_type 缺失或非图片、成功结果数量不符、任务 ID/状态/图片列表错误及状态与图片冲突。
仅当明确存在非空 b64_json/base64/image_base64 字段且没有 URL，或 url 是 base64 图片
data URI 时记录 base64 原因；有有效 URL 的输出仍可接受，不依据笼统格式错误猜测编码。
图片序号与请求/实际数量是受限数字字段；请求上下文保留，图片字节、原始响应及私有链接
仍不入库。旧 invalid-task-response 明确「未保存具体异常字段，无法确定是否返回了 base64」，
不回填或改写旧任务。沿既有 INTERNAL_ERROR/积分释放行为，未新增 base64 接收或自动重试。
新采集须启用更新后的 Worker；回归来源已写，按用户约定未运行，旧任务不能事后补字段。

## GG-341 · 去除AI收费与恢复

输入/受权/原图不可用/余额不足/损坏/凭证分片歧义/副本超限/存储失败均
回滚操作与积分，不发布副本。普通网络失败无法推断提交结果：保留UUID，
「重试」POST返回原副本或完成原操作，绝不通过本地余额假装扣费。COMMIT
回复丢失时不得删除已可能提交的对象；先按操作记录恢复。确定未提交时
清理新对象；删除失败只记录事件和操作ID，不记录图片/元数据。进程中断
可能留下尚未入库的对象，后续维护须按数据库引用核对，不据网络失败盲删。
副本被用户删除后的旧请求明确不可用，既有收费不再执行。切页/登出停止
前端请求与提示，不能宣称取消已提交收费；副本留在原用户资产库。旧Web
或未迁移时显示不可用，不免费降级。源码未运行，实际错误行为待用户验收。

## GG-340 · Announcements

Public errors expose bounded messages/request IDs, never database/provider
details. Authentication uses the existing session-expired boundary; inactive
users and non-site-owners are rejected by database authorization.
CAS/state conflicts retain draft text and require explicit reload/discard.
Unknown write outcomes retry the same mutation ID/payload; new edits get a new
ID and cannot overwrite an intervening revision. Publishing requires content;
published rows cannot silently become drafts or be deleted before withdrawal.
Withdrawn/deleted public posts return404 and stale view revisions409; the
reader refreshes its authorized snapshot. Likes remain unchanged on failure.
Committed publications succeed even if Redis broadcasting is unavailable,
with safe transport diagnostics and reconnect/poll catch-up. Hidden pages
release streams; aborted/canceled streams release timers/counts, stalled
consumers coalesce refresh markers rather than queueing unlimited changes.
Until migration0064 and a current Web are enabled, the client shows an honest
inline unavailable state with retry rather than fabricated announcements.

## GG-337 canvas download failures

原图授权/连接/非成功响应、空文件或本地Blob不可用时不生成替代预览下载，保留画布及原图片，用既有灰阶toast提供失败与重试。保存出口区分准备与启动失败，已创建的Object URL延迟回收；成功反馈为「图片下载已开始」，不宣称文件已落盘。重复点击在读取中禁用；切换身份/工作区/画布页、关闭组件主动取消读取并清除旧toast，不把取消显示为错误。见 [GG-337](tasks/GG-337-original-download.md)。

## GG-329 React Flow ancestor error

The image metadata provider called useReactFlow above ReactFlow's implicit
provider. CanvasWorkspace now supplies one shared ancestor for both. This fixes
the mounting boundary rather than suppressing the error or giving the tool a
separate empty store. No generation error, retry, billing or recovery behavior
changes.

## GG-327 图片元数据恢复

GG-336：内嵌凭证存在检测独立于EXIF，坏EXIF恢复路径保留原凭证状态。PNG caBX和可确定C2PA归属的JPEG分片可清除；无法识别归属的破损JUMBF显示检测未完成，清除报「图片中有无法完整识别的内容凭证数据，暂时无法安全清除。请使用完整原图。」，不产生部分清除副本。未发现只描述文件内检查结果，不保证没有外部凭证/水印或判定实拍；发现不代表签名有效。原网络/授权/格式/20MiB/关闭取消/保存失败恢复继续适用。

原图网络/受权/解码失败可重读；非 JPEG/PNG、超过20MiB或容器损坏明确拒绝。单独EXIF损坏而容器可处理时仍允许手动填写、粘贴、从实际参考图提取或清除，不能宣称原参数已完整读取；GG-335移除本地照片导入及相关恢复提示。提取无常用字段、不支持或失败不会覆盖原草稿。JSON、日期、分数/ISO/焦距及GPS配对/范围校验在保存前报错；作者/描述/版权支持中文，其他传统EXIF相机文本需ASCII。保存失败保留弹框与输入；副本接入画布后异步上传失败沿原节点重试。朝向EXIF清除需要的PNG副本若超20MiB，明确拒绝而不写入。关闭/换页/换身份中止读取，取消不修改资产。

## GG-326 group frame and emoji recovery

The emoji picker loads its locked catalog/Chinese locale as local chunks only
when opened. Loading or failed chunk retrieval stays inside the popover, with
retry; no label is cleared on failure. No runtime CDN catalog request is used.
Native and keyboard frame resizing reject nonfinite/below-minimum geometry or
an envelope that would exclude visible contents and padding. Manual geometry
and sizing mode remain in browser recovery when the old Web rejects new fields.
Server source validates the group-only enum; runtime activation is separate.
GG-325 integer dimensions, complete native measurements and stale-plan-safe
read/write frames remain; dragging/resizing suppresses automatic fitting.

## GG-323 group editing and recovery

GG-325 addresses the reported build-group ResizeObserver loop at the geometry
boundary: outward-rounded integer/explicit frame dimensions, absolutely inset
frame content, complete native parent/member measurements, authoritative node
coordinates and a later-frame write that discards stale read plans. Existing
small rounding differences do not repeatedly resize the frame. No global error
filter or observer override is installed. Browser reproduction/acceptance is
still delegated to the user; the screenshot's concurrent old-Web cloud rejection
remains a separate activation boundary.

Empty/single-member selections do not create a frame. Empty names revert to the
existing name, Escape cancels and IME confirmation keeps editing. Emoji can be
cleared. Ungrouping/deleting only a frame never deletes its members or assets.
Invalid/missing/cross-page parents, nested groups, group edges and malformed
labels fail the normal canvas validation before a write. Older Web rejecting
the additive group fields leaves the existing local draft dirty/offline with
the real server error through GG-322; it must not claim cloud synchronization.
Pending upload recovery remains attached to the original member IDs.

## GG-324 comparison recovery

Image comparison is read-only. A failed detail preview offers local retry inside the modal, retains selection and never initiates generation/upload. Partial asset/reference/organization reads retain successful choices and offer list retry; loading, empty references/assets and search misses stay inside the picker. Closing or changing page/owner releases preview handles and object URLs; late list replies cannot update the closed dialog. Source assets, generation inputs and saved canvas content stay unchanged.

## GG-321 逐张错误恢复

画布新图片批次使用每请求位置的独立单张任务。提交/轮询/上游失败或不确定受理
只更新相应位置，既有成功任务不被整批错误覆盖；未接受的请求仍保留失败位置。
用户明确点击中央重试才执行此槽的冻结单张输入，不自动付费重试；未知提交沿
原幂等身份恢复，已确定失败按正常单张新尝试/报价计费。服务端积分归还及
SUBMISSION_UNKNOWN不自动重复规则保持，新失败仍沿GG-318记录诊断。
旧多张任务失败的单槽恢复不得重新提交其原count，须独立count1请求。

GG-322：画布云同步被INVALID_CANVAS_PROJECT拒绝时，展示服务器实际平台错误并明确本机已保存、尚未云同步；不能仅凭包含slots就推断服务器版本。保留脏快照及同步阻断状态，不剥离插槽或伪报已同步。本机flush与生成提交、远端同步为不同路径，此保存错误不等同于重试生成失败。运行旧Web时须启用已有imageSlots校验才能恢复云同步，无SQL迁移或Worker更新。

## GG-328 text composer guards

Text generation disables submission for empty combined input without a preset/media, unavailable connected material, over-limit combined prompt and unresolved pending state. Keyboard submission uses the same guard. Disabled action reasons remain reachable through a focusable Tooltip wrapper; material preparation and length problems are local to the composer. Existing API/stream/cancel/recovery errors, billing and histories remain unchanged. Pending state also locks draft/model/preset mutations and removal controls. Phase labels derive from material preparation, accepted stream and recovery paths, never invented completion. No error is hidden or converted to success.

## GG-318 site-owner failure details

Image failures keep existing normalized user errors, retryability, submission
uncertainty, terminal confirmation and billing. Diagnostic reasons distinguish
HTTP rejection, invalid JSON/protocol, network cause, upstream terminal failure,
poll timeout and output processing; HTTP200 is kept when the request succeeds
but its task fails. Final failure and approved channel rejection/fallback share
existing atomic event writes. Owner-only global-log detail presents sanitized
fields, never response bodies. Absent historical statuses/IDs are not inferred.

## GG-308 文本模板保存/读取

GG-315：文字模板缩略直接展示previewText，不依赖图片/视频URL。画布通用卡片的媒体失败/重试区域仅针对image/video，text缺少媒体地址不会被误报为「图片暂时无法读取」；全文查看仍沿自己的文本API读取错误与重试，不掩盖真实文本失败。

空内容、无效名称/UUID和超出既有编辑器边界在存储前拒绝；生成/恢复期间不保存。提交锁避免重复点击，同一尝试以稳定UUID重试，内容冲突409不覆盖旧模板。保存失败保留冻结内容和名称并显示弹窗错误，不能报告成功或自动生成/扣费。旧Web无文本API时列表返回空模板范围且原媒体可读，保存明确提示暂未启用；新服务/迁移不可用503不影响其他资产显示，提供读取重试。全文查看按ID/workspace隔离状态，切换/关闭取消旧读取，失败可重试；没有用预览截断覆盖完整内容。后端异常沿受权资产错误边界，不泄露凭据或上游内容。见[GG-308](tasks/GG-308-canvas-text-template-assets.md)。

## GG-303 画布并发提示词失败

分割后全空内容不提交；超过原接口4000的单段显示段号，不截断全文，不提交该批次。每个请求独立接受、预留和结算；一个失败不撤销或重复提交其他段，选中节点显示各段中文错误及可重试按钮，重试使用该段冻结输入。未知pending请求继续阻止云端确认，重开标为SUBMISSION_UNKNOWN且不自动重发。已接受的活动任务恢复轮询，全部任务期间原编辑/重复提交锁生效；某个云端任务读取失败且无本机快照时显示画布重载错误，不静默丢弃任务身份。旧Web拒绝新增jobIds时仍保留本机副本并显示原同步错误；新校验只改源码，启用交给用户后续委托。

## GG-291 文本流式失败

GG-297未知预设ID和解析后过长输入在预留前拒绝；合法预设允许空附加文本。预设请求走新preset-stream，旧后端404显示“预设功能暂未启用，请更新后端后重试”，不回退普通请求，不重新发起模型调用或扣费。菜单/标签锁定期间保持生成状态，移除预设不清空用户草稿。

GG-295修复选中带连接输入的文本生成节点时缺TooltipProvider的渲染错误。节点自身根部提供上下文，覆盖选中NodeToolbar的输入预览及空态/结果；恢复点击节点不要求重新生成，不改变既有结果或积分。见[任务](tasks/GG-295-text-generation-tooltip.md)。

空输入、未就绪素材、未同步画布和积分不足拒绝而不调用模型。上游拒绝、空/超长/截断内容、十分钟超时和提供商连接失败使用平台中文错误，不透传上游原文；系统失败全退20。GG-296用户停止/刷新/切页/卸载/浏览器连接断开，已预留请求扣10并返还10，保留已收到文字和输入；预留前不收费。主动停止后不在左下角展示“已停止生成”或费用说明，恢复取消终态也不显示，真实失败仍展示错误。UUID、任务行锁和账本关闭唯一性避免重复扣费；成功重读/迟到取消保留成功及20费用。Web回收11分钟租期过期请求仍全退；不进图片Worker。迟到结果不能写入新页面。见[GG-291](tasks/GG-291-canvas-text-generation.md)、[ADR0129](decisions/0129-text-generation-interruption-billing.md)。

## GG-280 画布裁剪失败与取消

裁剪使用当前受权图片来源并真实解码；无法读取、解码或导出时在面板内说明失败，保留选择和取消/重试入口，不替换节点或假报完成。提交后的私有上传失败沿用既有节点失败提示、File本机保存与重试；不自动提交生成。取消、切页、节点删除或卸载应停止裁剪读取并释放临时URL，迟到结果不能写入其他页面。见 [GG-280](tasks/GG-280-canvas-image-crop.md)。

GG-284修复生成图打开裁剪的跨域读取：先通过受权download-url取得新签名，再直接无凭据读取原始字节，避免content的跨源302产生opaque Origin；上传图仍读同源content。签名与原图请求均可取消，连接失败显示“原图连接失败，请重试。”。本地共享RustFS的CORS需包含32131及5173，Worker启动也保留5173；不接受null或通配origin。见 [任务](tasks/GG-284-canvas-crop-image-fetch.md)。

## GG-246 大厅资产视频预览未播放

卡片播放被浏览器拒绝或媒体加载失败时保持暂停和中心播放提示，仍可从既有卡片打开明确预览；不增加错误横幅或自动重试循环。离开 hover、禁用或卸载后迟到的播放请求也必须暂停。见 [任务](tasks/GG-246-asset-video-hover.md)。

## GG-238 图片查看器加载与关闭

查看器仅使用已经受权列表返回或同一受权图片content入口，loading/失败/空范围准确区分。大图失败显示有界的明确重试，缩略图失败不伪造素材，也不自动提交请求循环。切换或关闭卸载旧图片状态，滚轮节流/listener与缩略图滚动引用须清理；关闭不改变画布或资产数据。原GG235侧栏失败恢复保留。见[任务](tasks/GG-238-canvas-asset-viewer.md)。

## GG-235 资产侧栏读取失败

媒体 loading、最终失败与空库区分；图片 preview→受权 content 仅一次，最终失败显示独立重试，视频每次手动重试至多重新读取一次列表。源/成功列表轮次重挂载本地失败状态，异步重试在卸载或读取轮次变化后丢弃。没有自动循环请求、素材删除或假首帧。本次 preview503/socket hang up 实际对应本地 Docker 发布端口失效，原卷保留后恢复连通；不把图片占位符一概归因于签名过期。见[任务](tasks/GG-235-asset-media-masonry.md)。

## GG-233 画布资产添加错误

文件按现有 JPEG/PNG、MP4、MP3 及 20 MiB 上限校验，上传失败保留失败项和重试入口，不生成可拖动的假素材。GG-245 图片直链通过受鉴权后端读取，图床缺少浏览器 CORS 头不再单独导致失败；仅允许公开 HTTP(S)。不安全地址/重定向、网页或无效格式、超限及超时在链接表单说明原因并保留输入，取消中断读取，会话失效走既有恢复入口。成功上传但归档失败说明素材已保存于全部资产、归档未成功，不重复上传已成功素材。读取列表、无素材与读取失败仍独立。代码验证和实际浏览器验收分别记录于 [GG-245](tasks/GG-245-canvas-image-link-read.md)。

## GG-226 项目操作错误

重命名或删除失败显示在项目操作弹框并保留卡片/输入，可重试；提交中禁用重复提交，不能把断网当删除成功。版本冲突提示刷新重试，不发送旧画布document覆盖服务器内容。退役画布GET/PUT返回CANVAS_PROJECT_DELETED/410且retryable:false，保持现有同步器非retryable阻断；不使用VERSION_CONFLICT/409触发复制项目。快照失败单独重试而不阻碍项目操作/恢复，不显示假封面。见[任务](tasks/GG-226-project-library-actions.md)。

## GG-216 terminal browser generation placeholders

素材等待同步只由真实pendingFileId/pendingReferences判断。匹配ID且failed/cancelled并非SUBMISSION_UNKNOWN的pending_生成占位保留本地任务恢复与提示词/参数，但不再阻止已确认项目成为已保存。活跃/缺失或不匹配localJob以及恢复后的SUBMISSION_UNKNOWN占位继续dirty，并提示“生成请求尚未确认”，避免误报素材上传或丢失未确认请求。该判断覆盖全部页面；未知任务所在页禁删，不自动重发。IndexedDB文件失败、网络重试、CAS分叉和真实上传提醒保持。未读取所报告页面的IDB，现场只读云端诊断不代表已复现。

## GG-214 Seedream output and quote failures

拒绝不支持的4K/1.5K、多图请求数量、超限参考图或未配置报价。Seedream仅允许实际1..17有效图片，空/超限/错误MIME/不安全URL按现有provider失败处理；其他模型保持精确数量。任一结果下载/解码/存储失败，整批不成功，清理暂存对象并沿原失败结算与保留输入。未知提交不自动重复，无新增备用线路；不返回部分层成功。基础报价缺失时前端禁用生成，服务端拒绝预留，不依赖客户端金额。

## GG-213 automatic GPT boundaries

GPT adaptive without canvas-image-v1 remains unsupported at the API/legacy adapter boundary. Invalid resolution, unsupported quality or undocumented background:trans fail before provider submission; the Switch writes only auto/transparent and forcesPNG on enable. TransparentJPEG still rejects server-side. size:auto leaves actual dimensions to the provider, so completion metadata uses decoded pixels; fixed-ratio requests keep fixed sizes. No uncertainty/retry/atomic-batch changes or default reset of accepted jobs.

## GG-211 / GG-212 canvas request boundaries

数量0、13、小数、字符串或未知routingPolicy在后端拒绝；UI只向草稿写合法整数，报价必须匹配真实count与模型/线路/质量/分辨率上下文，缺报价维持禁止提交。保存保留合法质量/背景/格式字段，透明JPEG拒绝。GPT2不能提交xhigh/max。部分多图失败沿现有整批失败/预留释放，不能展示为完整成功。

4K主渠道仅明确无可用渠道且没有taskID时，作为已拒绝的独立attempt记录，再创建一次无后缀备用attempt。认证、余额、配额、限流、审核、参数错误不备用；网络/超时/普通5xx/不可解析成功/已获部分任务ID都不重发。备用仍失败则沿原失败路径，未知提交仍SUBMISSION_UNKNOWN。恢复使用已固定routeVersion，不重送已受理任务；不改变积分reservation或复用primary attempt。生产与原数据保持。

GG-203: count-eight is valid only for Nano generation. Missing count-eight quotes disable canvas submission and are rejected server-side before enqueue/reservation; do not infer eight-times-single amounts in the browser. A Nano task-set resume can hold one through eight known single-image task IDs, retaining the existing submission-unknown guard against duplicate billable requests. The final output count must be exactly eight; short, failed or unstoreable results retain the existing atomic failure and credit-release policy.

GG-189: if a count-specific Nano Banana Pro quote is absent, the canvas disables generation and shows the existing unavailable-price message rather than multiplying a browser-side guess. The server likewise rejects unquoted submissions before enqueue or credit reservation. `adaptive` is validated as a Nano domain value, omitted in the provider payload, and rejected for GPT routes; provider or transport failure continues through the existing inline generator failure and retry flow. No automatic retry of potentially billable requests is added.

## GG-167 connected canvas reference recovery

A connection from a computer-dropped image can be drawn before its existing private upload finishes, but it stays pending and disables generation until the source receives a ready reference ID. Failure retains the source node and connected thumbnail with retry/remove actions. A generated-output connection invokes the owner-scoped generated-asset import; while pending it also blocks generation. Import denial, unsupported source bytes, size/validation errors or network failure appear on that thumbnail with explicit retry; no generated asset ID is ever submitted as a reference ID. Removing an edge or source cancels/ignores its pending browser request and removes it from the target generator's input. The server may already have completed a private import, which remains a normal personal reference asset. Missing 32131 runtime support for the new endpoint is a visible import failure until that local checkpoint is replaced; it is not reported as a successful connection. Creating/selecting a generator and drawing edges do not call a generation provider or debit credits.

## GG-161 canvas upload and remote preview recovery

Canvas JPEG/PNG/MP4 upload errors leave the original local preview and `File` attached to the temporary node, with the service message and an explicit retry. An abort caused by deleting the node or leaving the page does not surface a failure; the pending request and local Blob URL are cleaned up. A lost completion response uses the existing owner-scoped status recovery. A ready image whose authorized content cannot load falls back to its retained Blob preview until a retry is requested. A ready video whose signed read fails obtains a fresh signed URL through the existing owner list; if it still cannot load, the node shows a preview retry action. After authorized content loads, the local Blob is released, so a later read failure relies on that recovery action. Network failures do not charge generation credits and do not silently remove the node. Preview-only sessions cannot start a private upload.

## GG-155 canvas asset drag and rename recovery

Dragging a library item inside the sidebar is inert. A failed generated-original URL lookup or unavailable signed source leaves the canvas unchanged and reports an inline error; retry requires another drag. Image/video decode and audio playback failures stay visible in their temporary nodes. A rename with blank, overlong, or control-character content is rejected before sending; owner/workspace denial or a server failure keeps the editor and the previous persisted name, with the returned message available for retry. Escape cancels editing. Browser drag/drop cannot upload a duplicate asset or submit a billable job. The local 32131 runtime must first include the PATCH handler and database migration 0048; until then rename cannot be claimed operational in 5173's real-session proxy.

## GG-152 preview session module loading

The unauthenticated local UI preview returns its demo session before importing real authentication runtime dependencies. The previous top-level import pulled in Sharp through the storage preview module even when the preview branch did not need it; a native load failure inside the Vite/Worker runner surfaced as `Cannot read properties of undefined (reading 'endsWith')`. Real sessions retain their existing runtime and error mapping, with those modules loaded only on the real-session path. This fix has not been manually confirmed under the standing no-retest instruction.

## GG-151 canvas asset browser recovery

The canvas asset list loads on opening, displays an in-place loading state, and shows the returned error with a retry action if any read fails. Empty personal libraries and empty folders have separate messages. Missing or failed image/video URLs fall back to a media icon; demo sessions do not request private assets. Closing the sidebar restores the full canvas width without changing node coordinates. A retry only repeats existing read requests and cannot upload, bill or mutate an asset.

The operator reported a vinext `ResizeObserver loop completed with undelivered notifications` overlay while continuously dragging the sidebar edge. A pointer-release-only mitigation broke the required live push behavior. Pointer movement now coalesces temporary CSS width writes into at most one animation frame at a time; the sidebar covers a fixed-size React Flow host and only the overlay controls move with the edge. React state commits only on release, and pointer cancellation restores the prior width. This removes the repeated React Flow host resize that accompanied dragging; disappearance of the overlay still awaits the operator's manual confirmation under the standing no-retest instruction.

## GG-146 local canvas video recovery

The canvas rejects non-MP4, empty and over-20-MiB video files before creating object URLs, reporting the first invalid file inline while still accepting valid files in a mixed drop. A video that cannot decode shows an inline preview failure. GG-183 removes FPS parsing and its unavailable marker; missing frame-rate metadata cannot block playback. Browser autoplay rejection leaves the play control visible. Removing a video node or leaving the canvas releases its object URL; GG-161 later added private upload and GG-173 durable canvas records, with their own recovery rules above.

## GG-127 asset grid resize recovery

The asset masonry `ResizeObserver` batches observed card changes and writes grid spans on the next animation frame. This avoids synchronous observed-size feedback that browsers report as `ResizeObserver loop completed with undelivered notifications`; cleanup cancels a pending frame. The grid and list views retain their existing fallbacks and asset data is unaffected.

## GG-126 local canvas file errors

The canvas rejects non-JPEG/PNG files, empty files and files over 20 MiB before creating object URLs. Invalid names receive an inline composer error while valid files in the same drop can still appear. A corrupt image shows a local preview failure and cannot be sent as a reference. A missing/non-active session or preview mode blocks the explicit reference upload. Existing reference upload failure stays in the tray for retry or removal; removing the local node does not discard a separate tray reference. Dropping a file prevents the browser's default file-navigation behavior. Temporary nodes and their previews are cleared on refresh.

## GG-125 canvas generation recovery

The standalone canvas redirects a missing session to login with a safe `/canvas` return. Pending or suspended accounts use the existing access gate. A missing billing quote, insufficient credits, invalid prompt or unready reference prevents submission; read errors retain the composer and offer retry. Failed reference uploads stay in the tray for retry or removal. GG-182 keeps a new job's progress or failure on its originating generator and leaves its inputs and connected references intact; the next explicit Generate action starts another job. Existing legacy result nodes retain their retry action. A confirmed job ID is read and polled after reload, never resubmitted. A request that never gained a durable job ID is marked unconfirmed on local recovery and must not be replayed automatically because it might spend credits twice. Node positions, generator inputs and confirmed result IDs now follow ADR 0114's canvas-project save path; durable assets remain in the asset library.

## GG-121 uploaded asset deletion

The confirmation names permanent removal; selected generated images also state
that settled credits are not refunded. An invalid ID or foreign owner's file
returns a non-enumerating 404. A failed database transaction rolls back folder
and file changes and never deletes bytes. If private storage deletion fails
after the database commit, the API reports `ASSET_DELETE_INCOMPLETE` and the
browser refreshes its asset lists so the removed file cannot be selected again.
The logged file ID, kind, and private object key allow support to finish object cleanup. A failed
refresh also leaves a visible retry error.

## GG-115 asset recovery

The upload dialog rejects unsupported format or files above 20 MiB before
requesting an intent. A failed image/video/MP3 transfer stays on its own row
for retry; other rows continue. A lost completion response is checked against
owner-scoped upload status. A successful upload that cannot be assigned to a
folder remains in the unclassified library and reports the organization error.
Folder name/tag validation and foreign item IDs fail without changing existing
metadata. History and library have separate loading/error states, so a media
library outage does not conceal generated history. Existing old-format media
remain readable; a new upload of those formats is rejected.

GG-091缺邀请码提示“请输入邀请码”，格式/邀请者暂停/不存在统一“邀请码无效”；码无限复用，无已消耗错误。expected email与验证码挑战不一致统一验证码无效；失败次数和现有限流保持。分配码或Session失败回滚整个注册与邀请关系，不留多码/半账户；发送中改地址的旧异步响应不附着新地址。

GG-090有效邮件码后缺邀请码返回INVITATION_REQUIRED（403）提示补填；无效/已用/停用统一INVITATION_INVALID（403），不回显码，计入挑战失败次数。错误邮件码仍统一旧无效提示，不查/消耗邀请码。事务失败整体回滚，无用户/欢迎积分/Session半成品；已提交响应丢失后可新验证码正常登录既有账户。后台生成重放不再返回明文，停用对应未使用码后重建；无数据库权限/停用站长403，已用码停用409。

GG-087输入/格式/图片解码400，超大正文413，登录失效401，非站长或header缺失403，其他用户反馈404；同键异内容/版本冲突409、20条/24h限额429。未知DB/对象异常503并隐藏敏感细节。创建正常失败回滚并清理本次不可达对象，COMMIT不明不删除可达图片；核验/对象清理失败保留待运维核对，不声称完整自动删除。

GG-086站长轮询失败保留已显示计划与进度，显示失败及保留上次数据提示；不把旧快照标成刚更新。后续查询成功清除轮询错误，管理动作错误独立保留；卸载/操作暂停取消请求，迟到结果不覆盖。

GG-084个人/站长边界复用登录失效401；未启用或非站长403 JCOIN_ACCESS_DENIED，管理header不足403 JCOIN_CSRF_FAILED。非法动作、limit、cursor、幂等键或大于4KiB请求400 JCOIN_INVALID；同键异动作409 JCOIN_IDEMPOTENCY_CONFLICT，状态不匹配409 JCOIN_BATCH_CONFLICT。未知数据库异常统一503并隐藏SQL/连接信息。个人读取失败可重试、更多失败保留已加载记录；管理动作失败保留稳定键，成功后重新读取失败只重试查询。奖励事务失败整批回滚，定期重放；来源缺证据排除不是零币流水。库存初始草稿/起算前为正常状态，不触发奖励或兑换。

GG-081未知类型/非法数量返回400；未确认充值返回ADMIN_PAYMENT_CONFIRMATION_REQUIRED，凭证内容不合规则ADMIN_REQUEST_INVALID；重复凭证返回ADMIN_PAYMENT_RECEIPT_CONFLICT（409），价目冲突ADMIN_PAYMENT_PRODUCT_CONFLICT（409），同键不同操作ADMIN_IDEMPOTENCY_CONFLICT（409）。身份/CSRF在入账前拒绝，事务失败回滚订单/账本/审计。表单保留编辑并重用相同内容键；历史峰值缺时间为null/暂无统计，不伪造为零。

GG-072 has independent profile/works loading, empty, error and retry states.
PROFILE_INVALID/PROFILE_AVATAR_INVALID preserve edits; PROFILE_HANDLE_TAKEN409
asks for a different handle; PROFILE_CONFLICT409 offers reload before editing.
Unauthenticated access uses the existing session-expired flow. Unexpected server
errors return safe PROFILE_UNAVAILABLE503 without SQL/storage/provider details.

GG-070 card summaries show unpriced/disabled and legacy-unit states explicitly.
Existing save conflicts/errors preserve right-sheet fields; errors remain above
the pinned save footer. Loading disables card mutation actions; cancel/Esc
restores trigger focus. Pricing validation/persistence semantics are unchanged.

GG-069 accepts integer discounts 1–100 only. Invalid/malformed prices or a
route with no positive price fail before draft mutation. Blank specifications
remain blank; exact rounding keeps positive prices at least 0.01 RMB. Inline
errors retain all inputs; existing save/loading/conflict handling is unchanged.

GG-068 rejects malformed/unknown video route configs and missing enabled-route
specifications. Disabling both routes prevents model enable. Unsupported video
resolution fails before provider transport; editing/switching preserves input.

GG-067 rejects unknown/mixed billing units, incomplete enabled-model prices and
nonpositive token rates as MODEL_REQUEST_INVALID. Missing/invalid
completion_tokens is unresolved, never zero or inferred from total_tokens.
Malformed response JSON and extraction errors stay inline with input preserved.
No generation or ledger operation occurs in the pricing calculator.

Reject incomplete/unsupported/nonpositive quality prices before persistence.
Enabled quality lines require all model-owned tiers and resolutions. GPT 2 rejects
xhigh/max before provider POST. Stale price versions reject new submission without
credits reserved; already accepted jobs retain original quote and failure release.

# Error handling and recovery

GG-071 read failures retain search/date controls and offer inline retry; request
IDs accompany normalized API failures. ADMIN_REQUEST_INVALID rejects invalid
dates/ranges over 90 days, filters, cursor and limits before SQL. Missing detail
returns ADMIN_RECORD_NOT_FOUND. Cross-user logs require an authenticated active
site owner; no prompts, raw upstream messages or credentials enter response DTOs.

## Principles

- Tell the user what failed, what was preserved, and the next useful action.
- Place persistent failure beside the task/result it belongs to.
- Never expose raw provider payloads, stack traces, credentials, bucket keys, or
  internal hostnames to the user.
- Every server error has a normalized code and request/job ID for support.

## Error categories

GG-052 model edits reject invalid IDs/templates/prices with
`MODEL_REQUEST_INVALID`, and concurrent edits with `MODEL_VERSION_CONFLICT`;
the dialog keeps input and offers list refresh/reopen. Directory read failures
have inline retry; unauthorized accounts never reach model mutation. New image
submissions reject unavailable entries/specifications as `MODEL_DISABLED` or
a stale displayed quote as `PRICE_CHANGED` before reserving credit. Preserve
prompt/references/settings and refresh the catalog/quote before retrying.
Already accepted jobs retain their original quote despite later price or enable
changes. The denomination migration rejects undrained jobs/reservations/pending
orders atomically; never bypass the guard or rewrite historical records.

GG-054 and GG-062 apply `MODEL_DISABLED` to disabled/unpriced/unknown image lines before
credit reservation. Banana and GPT image templates accept the three stable line IDs.
Admin activation requires confirmed mapping and complete line prices;
invalid changes retain the dialog input. Stale quotes are checked within the
chosen line. Restored unavailable choices preserve state and offer another line;
there is no automatic fallback. Accepted jobs continue their pinned line and
quote after model/line disable, including restart and failure credit release.

GG-056 archiving rejects non-owners before persistence, stale versions with
`MODEL_VERSION_CONFLICT`, and missing/archived entries with `MODEL_DISABLED`.
Normal saves and new generation also reject archived catalog IDs. Failures
roll back both catalog update and audit; refresh the list to recover. No automatic
price changes or line enabling accompanies confirmed Banana 2 mappings.

GG-044 directory loading/empty/error lives in the enterprise content area,
not a global Workspace control. Retry reads the authenticated directory only.
Direct company access is still authorized by manager APIs; denial offers the
enterprise list without enumerating other companies. Invitation/budget failures
stay in their compact dialog with email/member, amount and reason preserved;
stale tab/directory reads cannot overwrite newer results. No recovery switches
creative identity, transfers records or submits generation.

GG-045 keeps allocation errors inside the relevant distribution
content. A successful transfer followed by a failed list read retains the
confirmed balance and public transfer ID; it warns against repeat allocation
and offers a read-only refresh. An empty counterparty filter with more pages
explicitly says only loaded records are empty and retains load-more/all-records.
Failed pagination preserves loaded rows and the counterparty filter.

GG-046 simulated lists/history are explicitly preview-only. Allocation dialogs
can be inspected, but final submission is disabled with a text explanation and
a handler guard. Mock loads never fall back to real reads or writes.

GG-049 returns `BUSINESS_ROLE_REQUIRED / 403` for enterprise/personal distribution
reads, new transfers and historical transfer replays. Suspended distributors stay
denied. New parent bindings reject a non-distributor with the existing admin
conflict code and no relationship mutation. Old enterprise allocation links use
read-only navigation recovery; it never assigns a role or deletes history.

GG-048 overview keeps missing monthly aggregates and unconfigured credit accounts
distinct from real zero. Dashboard `account: null` means no credit account exists,
not a failed request; ask the site owner to fund it, never claim healthy credit.
Recent-output loading/failure/retry is local to its panel and preserves
balance/member facts; late or unmounted requests are ignored. Image detail has
loading, failure, remount retry and read-only signed-address refresh. None of
these recovery actions creates assets, generation tasks or allocations.

| Category | Example code | UI placement | Default recovery |
| --- | --- | --- | --- |
| Input | `INVALID_PROMPT` | Composer field/toast | Focus and correct |
| Generation capability | `M3_SLICE_UNSUPPORTED` | Composer/toast | Keep inputs and choose a model-supported ratio/count combination |
| Reference upload | `UPLOAD_TYPE_INVALID`, `UPLOAD_DECODE_INVALID`, `UPLOAD_TOO_LARGE` | Reference tray item | Retry after changing the file, or remove |
| Reference transfer/completion | Network error or completion timeout | Reference tray item | Retry transient PUT; query owner-scoped status before reporting a completion failure; retain the local file for explicit retry |
| Reference readiness | `REFERENCE_NOT_READY` | Composer/toast | Wait for upload or remove failed item |
| Reference model input | `REFERENCE_INPUT_INVALID` | Failed batch in stream | Keep prompt/references; reduce or replace the image and explicitly retry generation |
| Reference cleanup | `OBJECT_DELETE_FAILED` | Operator evidence/logs | Keep row, release lease, retry a later bounded run |
| Quota | `INSUFFICIENT_POINTS` | Submission action | Explain and manage plan |
| Price | `PRICE_NOT_AVAILABLE` | Submission action | Keep inputs and retry after configuration recovers |
| Provider timeout | `MODEL_TIMEOUT` | Failed batch in stream | Retry |
| Submission unknown | `SUBMISSION_UNKNOWN` | Failed batch in stream | Do not auto-submit; explicitly create a new billable task or edit settings |
| Provider rejected | `MODEL_REJECTED` | Failed batch in stream | Edit prompt/settings |
| Rate/capacity | `CAPACITY_BUSY` | Failed/pending batch | Backoff retry |
| Seedance request invalid | `INVALID_VIDEO_REQUEST` | Video input boundary | Preserve input and identify the incompatible field |
| Seedance unavailable | `PROVIDER_UNAVAILABLE` | Video provider boundary | Do not infer acceptance; retain the selected line and input |
| Seedance malformed response | `PROVIDER_MALFORMED_RESPONSE` | Video provider boundary | Fail closed without inventing material/task identity |
| Persistence | `SAVE_FAILED` | Affected asset/project | Retry without clearing |
| Draft persistence | `DRAFT_UNAVAILABLE` | Composer-attached status | Keep current page state and retry |
| Draft conflict | `DRAFT_CONFLICT` | Composer-attached alert | Keep current tab or restore newer server draft |
| Asset library | `ASSET_LIBRARY_UNAVAILABLE` | Asset library state | Retry the owner-scoped read |
| Reference materials | `REFERENCE_LIBRARY_UNAVAILABLE` | Material section or picker | Keep composer state and retry the owner-scoped read |
| Reference editor | `REFERENCE_NOT_FOUND`, image decode/export/upload failure | Focused editor footer/stage | Keep edits, retry or reduce the crop when output exceeds 20 MiB |
| Authentication | `SESSION_EXPIRED` | Global blocking state | Sign in, restore draft |
| Login callback | `AUTH_CALLBACK_INVALID` | Global sign-in state | Restart Google/email-code sign-in |
| Login provider | `AUTH_PROVIDER_UNAVAILABLE` | Global sign-in state | Retry later |
| Account association | `ACCOUNT_LINK_REQUIRED` | Global sign-in state | Complete provider-side account linking/support |
| Account review | `ACCOUNT_PENDING` | Authenticated review state | Refresh later or log out |
| Account access | `ACCOUNT_SUSPENDED` | Authenticated blocking state | Contact the site owner or log out |
| Administration | `ADMIN_ACCESS_DENIED` | Non-enumerating route recovery | Return to the workspace |
| Administration | `ADMIN_REQUEST_INVALID` | Account row/dialog | Correct input without losing context |
| Unknown | `INTERNAL_ERROR` | Affected operation | Retry + request ID |

## Generation failure contract

GG-043 material inspection failures stay in the read-only preview dialog with
`重新加载`; closing or retrying does not remove the material, create an asset,
or submit generation. Retry only reloads its existing browser-readable URL.

GG-040 validates nonempty segments before fan-out. Empty segments are ignored;
an all-delimiter prompt creates no request and keeps the input for correction.
Each segment keeps the existing independent failure strip or video slot.
There is no batch-wide rollback: a rejected/insufficient-credit segment does not
cancel accepted siblings. Retry only the selected segment, never the whole source.

Each failed batch remains visible in the active result region as its own compact
inline status strip. One run's failure, retry, or settings recovery never clears
another active or failed run, and failure strips do not enter or redistribute
the completed-image masonry. Each strip contains:

- Short title, useful explanation, requested/failed count, normalized error
  code, and job ID.
- `重新生成` using the preserved immutable input snapshot rather than the
  current composer draft.
- `修改设置` restoring a mutable copy of that snapshot before returning to the
  parameter drawer.

For a full-batch failure, show one strip for that run rather than one repeated
error per requested output. Multiple failed runs therefore show multiple
strips. Current GPT and Nano Banana multi-output is atomic: a short, malformed, or partly
unstorable provider result fails the whole batch and exposes no partial Assets.
A later partial-result policy must define output-level charging first.

A toast may announce a transient validation problem, but must not replace this
panel for asynchronous generation failure.

## Local image download

Image download is a user-initiated browser operation. The browser first reads
an owner-authorized fresh signed URL by stable Asset ID, then reads and validates
the complete object before its download manager receives an in-memory Blob URL.
The expiring preview URL retained in page state is never reused for download.
A URL-resolution, signed-object read, empty-body, or Blob creation failure keeps
the current image/detail state and shows `下载失败，请重试`; it must not navigate
the current page, open the signed image URL in another tab, or create a
destination file. The console records only the Asset ID, safe error message, and
one of `resolve-url / fetch / read / validate / prepare / start`; signed URLs are
excluded. Whether a separate save dialog appears follows the browser's download
preference. Once the browser has accepted the download the app reports
`图片下载已开始`; browser-side cancellation is not observable by the page.
Local managed object storage permits the reviewed app origins to read signed
objects with `GET`/`HEAD` as well as upload with `PUT`. The browser rejects an
empty response before creating the Blob download. The object URL is released
only after a delay so the browser cannot race the download against immediate
resource revocation.

The M3 mock contract maps a provider rejection to `MODEL_REJECTED`, a bounded
poll deadline to `MODEL_TIMEOUT`, provider reachability/capacity to
`CAPACITY_BUSY`, and malformed provider results to `INTERNAL_ERROR`. Database,
queue, and object-storage diagnostics remain server-side. Queue dispatch failure
leaves the committed outbox row pending; an object-storage failure leaves the
non-terminal job and attempt evidence recoverable for worker reconciliation.
Dispatchers claim outbox rows atomically before publishing them, and recovery
does not reopen a fresh dispatch until the Worker lease window has elapsed.
Duplicate deliveries of the same active job are ignored, and an unexpired lease
cannot be reclaimed by the same Worker identity.
The generation API admits Nano Banana 2's 14 ratios and all three GPT image models' seven
ratios with `1 / 2 / 4` outputs at `1K` / `2K` / `4K`. Unknown
model combinations return `M3_SLICE_UNSUPPORTED` before a job, credit
reservation, or provider POST is created. The adapter repeats this validation.
Nano sends the admitted ratio and resolution values in one single-image task
per output and never sends `n`; each GPT route sends the corresponding exact pixel size
and native count in one task.
Nano's omitted thinking/search values normalize to `high` and false before
persistence. Explicit historical `low` remains valid so a frozen retry can omit
the upstream field. Invalid thinking values, non-boolean search values, or enabled
Nano-only options on another model return `M3_SLICE_UNSUPPORTED` before credit
reservation or provider submission. The provider adapter repeats this
fail-closed model isolation check.

The local Seedance route fails closed unless the request targets loopback, the
development runtime has enabled video with an absolute file credential, and the
credential is readable. Built local runtimes carry an explicit local marker;
public production requests remain unavailable. Cross-origin writes are rejected.
Provider rejection or polling failure appears in the local video result while
the prompt and parameters stay intact; the browser never retries the POST or
falls back to the image route. Reference media blocks the temporary text-only
submission instead of sending browser-only or private URLs upstream.
GPT's omitted quality/background/output-format values normalize to
`auto` / `auto` / `png`. Invalid enum values, GPT-only options on another model,
or `transparent` plus `jpeg` return `M3_SLICE_UNSUPPORTED` before a batch,
credit reservation, or provider POST exists. The UI also auto-corrects that
incompatible pair to PNG and disables JPEG while transparency is selected.

The M5 O1Key contract normalizes `SUBMITTED`, `IN_PROGRESS`, `SUCCESS`, and
`FAILURE` polling responses. Unknown error names and malformed or conflicting
terminal payloads become `INTERNAL_ERROR`; raw O1Key errors never reach the
browser. A bounded poll deadline becomes `MODEL_TIMEOUT` even when the last
observation was still submitted or processing. GPT success must contain exactly
the requested ordered output count. Every Nano task must return one image and
the ordered task set must total the requested count; either mismatch becomes
`INTERNAL_ERROR`. The
image API documents no callback path.
After a durable task ID, a single `FAILURE` observation remains provisional
until the same normalized failure repeats on consecutive polls. A later
non-failure observation clears it. A `SUCCESS` result URL also receives a small
bounded download retry before a persistent transfer/decode error becomes
terminal. Neither recovery path repeats the billable generation POST.
An interrupted generation POST, a 5xx response, or a successful response
without a usable `task_id` becomes `SUBMISSION_UNKNOWN`. The attempt guard is
already durable at that point, so worker recovery fails it instead of issuing a
second POST. The inline retry states that it creates a new potentially charged
task. For Nano multi-output, each known task ID is persisted and a
submission-started marker is written immediately before the next POST; a restart
may submit only the provably unstarted suffix. If that marker remains or any
later POST has an unknown outcome, the entire batch fails as
`SUBMISSION_UNKNOWN` without exposing
partial Assets or repeating that POST. GoodGood releases the customer's full
reservation when this no-Asset job becomes terminal; that customer policy does
not assert or record an upstream
refund, so New API usage reconciliation is still required. Reference-upload
failures happen before this billable guard and retain their ordinary retry
behavior.
Before acceptance, downloaded results are bounded and fully decoded as JPEG,
PNG, or WebP; empty, oversized, truncated, type-mismatched, or excessive-pixel
outputs normalize to `INTERNAL_ERROR` and never become an Asset. An active
attempt whose persisted route differs from the configured worker route is
deferred for reconciliation rather than polled through a different provider.
After a valid output is stored, the Worker records success only if the database
accepts the asset and terminal transition. If a failed, cancelled, or missing
job rejects completion, the unaccepted object is deleted and the execution is
reported as superseded. Cleanup failure is emitted as `OBJECT_DELETE_FAILED`
with orphan evidence for operator reconciliation. A lost lease or an already
succeeded job preserves the deterministic object because another accepted
execution may own it.

## API error envelope

Target response shape:

```json
{
  "error": {
    "code": "MODEL_TIMEOUT",
    "message": "本次生成未完成，请重试。",
    "retryable": true,
    "requestId": "req_...",
    "jobId": "job_..."
  }
}
```

The production Node runtime also returns the same server-owned value in
`X-Request-Id`; it never accepts a caller-supplied value as correlation. This
request ID is the support ID a customer may report. Log the internal cause
server-side with the same request/job IDs. Keep user copy stable even if
provider wording changes.

Generation endpoints authenticate before reading or mutating owner data.
Missing, malformed, unknown, and unmapped credentials normalize to
`SESSION_EXPIRED` without revealing whether an external identity exists.
In OIDC mode, provider bearer tokens are never accepted as GoodGood API
credentials. Login state is stored as a hash and consumed once before code
exchange; expired, missing, replayed, signature-invalid, issuer/audience/nonce
mismatched, and unverified-email callbacks normalize to stable authentication
errors. Every configured OIDC callback outcome expires the one-time browser
binding cookie, including cancellation and invalid/expired state; it does not
expire an otherwise valid GoodGood session. Raw Authing or Google responses,
codes, tokens, and client secrets stay server-side. If a verified email already belongs to another internal owner,
GoodGood returns `ACCOUNT_LINK_REQUIRED` rather than silently merging subjects.
Missing or drifted OIDC capabilities normalize to
`AUTH_PROVIDER_UNAVAILABLE`. Login discovery and capability validation complete
before the one-time state/PKCE attempt is persisted, so a rejected provider
configuration does not leave an unusable login attempt.
Explicit logout revokes the GoodGood session and expires its cookie before the
browser navigates to Authing. The provider logout URL and return target are
server-owned; callers cannot supply them. If that navigation is interrupted,
the local session remains revoked and reloading returns the global signed-out
recovery surface.
Authentication configuration errors are operator/startup failures, not user
session failures. Local mode requires `GOODGOOD_ALLOW_LOCAL_AUTH=true`; OIDC
mode rejects that switch. HTTPS OIDC callbacks additionally require a Secure
cookie whose name starts with `__Host-`. The runtime and staging preflight fail
closed instead of falling back to local identities or contacting discovery
with an unsafe configuration.

GG-057 fixes the explicit local `/api/auth/login` entry: validate the return
path first, retain a valid existing session, otherwise issue only the configured
local default HttpOnly cookie and redirect. No default returns
`AUTH_NOT_CONFIGURED`; unsafe destinations return `AUTH_RETURN_TO_INVALID`.
Unexpected session lookup failures are propagated without issuing a fallback
identity. OIDC/email modes never enter this branch. Direct management links and
`返回创作` use stable page destinations instead of replaying login history.

The GG-029 email candidate requires exact same-origin POST, bounded JSON, a
valid single mailbox, and a short-lived HttpOnly browser-binding cookie.
Malformed, expired, consumed, replaced, cross-browser, and incorrect codes all
normalize to `EMAIL_CODE_INVALID`; failed guesses still commit their counter.
Shared limits return `EMAIL_RATE_LIMITED` with `Retry-After`. A definite SMTP
rejection returns `EMAIL_SEND_UNAVAILABLE` and invalidates that challenge;
connection/timeout ambiguity is stored as `unknown`, remains verifiable if a
message arrives, and is never auto-retried. No response contains the raw code,
SMTP error body, secret, or complete mailbox after the request step.

In `email_otp` mode, send and verify are same-origin JSON POSTs with a 2 KiB
body limit. Invalid mailbox input fails before SMTP. Wrong, expired, replayed,
replaced, cross-browser, and exhausted codes normalize to
`EMAIL_CODE_INVALID`; no response reveals whether the mailbox already has an
account. Shared limit failures return `EMAIL_RATE_LIMITED` and a bounded
`retryAfterSeconds`. SMTP rejection returns stable unavailable copy, while an
uncertain timeout leaves the exact challenge verifiable without automatic
resend. Provider errors, credentials, full mailbox addresses in audit subjects,
and codes are not returned. Disabling sends does not invalidate existing
sessions or already issued challenges; disabling registration is disclosed
only after a valid unbound mailbox challenge is verified.

The read-only email-auth operations command emits one redacted JSON report and
uses stable alert codes: `EMAIL_AUTH_GLOBAL_BUDGET_HIGH`,
`EMAIL_AUTH_DELIVERY_FAILURE_STREAK`, and `EMAIL_AUTH_CLEANUP_OVERDUE`.
Operators and the separately owned monitoring layer may group repeated reports
by code; this repository slice does not add an alert transport. Status-command
failure emits only `EMAIL_AUTH_STATUS_FAILED`; cleanup-command failure emits
only `EMAIL_AUTH_CLEANUP_FAILED`. Neither path prints a database error,
connection string, mailbox, code, SMTP response, or secret. Suspending a
specific account revokes that owner's active sessions atomically; it never
causes a global session purge.

The existing-owner binding command fails closed before writes for malformed or
count-mismatched manifests, digest mismatch, duplicate owner/email entries,
missing owners, stored-email mismatch, absent prior identity, unverified or
out-of-order site-owner mapping, existing binding conflicts, and partial replay.
Expected failures use stable `EMAIL_BINDING_*` codes; unexpected database or file
errors collapse to `EMAIL_BINDING_FAILED`. Command failure output never includes
the database URL, raw manifest, full mailbox, external reference, or provider
detail. All inserts are one transaction, so a failed execution creates neither a
partial identity set nor any business/credit mutation.

ADR 0020 separates authentication from creation admission. A valid new Authing
identity receives a GoodGood session and `pending` account projection rather
than an authentication failure. Pending users receive stable review-state copy,
may refresh that state and log out, and can see that welcome credit is waiting;
all product capabilities reject before owner data or provider capacity is read
or mutated. `ACCOUNT_PENDING` and `ACCOUNT_SUSPENDED` are stable 403 capability
failures; the safe session read still allows either account to see its own
state and log out. Approval or restoration takes effect on a fresh authorized
request and does not require creating another external identity.
Cross-owner job and retry requests normalize to `GENERATION_NOT_FOUND`, so one
owner cannot use response differences to enumerate another owner's records.
Reference completion likewise returns `REFERENCE_NOT_FOUND` across owners.
Reference-material lists authenticate before lookup, return only accepted ready
rows for that owner, and normalize database or signing failures to
`REFERENCE_LIBRARY_UNAVAILABLE`. The browser keeps its existing tray and offers
retry; no object key or cross-owner existence signal is exposed.
Generation resolves only ready references owned by the caller and returns the
same `REFERENCE_NOT_READY` response for missing, foreign, pending, rejected, or
expired IDs, avoiding cross-owner enumeration. Failed decoded/type/size/
dimension checks mark the pending record rejected before the normalized error
is returned; a missing object stays retryable because direct upload may not have
completed yet.

`GET /api/billing` authenticates before reading the owner account. A missing or
inactive account becomes retryable `CREDIT_ACCOUNT_UNAVAILABLE`; an unavailable
active quote becomes retryable `PRICE_NOT_AVAILABLE`; unexpected read failures
normalize to retryable `BILLING_UNAVAILABLE`. None of these errors grants
credit, creates an account, exposes internal identifiers, or blocks the rest of
the workspace. The account surface keeps a stable footprint and offers retry;
an exact zero balance is rendered as data rather than treated as a failure.

`GET /api/billing/activities` uses the same active-owner boundary. Invalid
filter, limit, mismatched-filter cursor, or an owner-missing cursor returns
non-retryable `CREDIT_ACTIVITY_REQUEST_INVALID`; unavailable account or storage
remains retryable and exposes a support ID, not ledger details. A first-page
failure keeps the page shell and offers retry. A load-more failure retains all
previous rows and retries only that cursor. No read error mutates balance or
falls back to payment behavior.

Payment product and order APIs authenticate before owner-scoped access.
Malformed requests and missing idempotency keys use stable 400 responses;
same-key/different-product reuse returns `PAYMENT_IDEMPOTENCY_CONFLICT`.
Cross-owner and malformed public order IDs both normalize to
`PAYMENT_ORDER_NOT_FOUND`. The local fake callback authenticates the provider,
not a browser session: disabled sandbox, missing/invalid HMAC, stale timestamp,
unsupported event, unknown order, event-ID conflict, or amount/currency mismatch
all fail before credit is granted. Any database failure rolls the order state,
ledger grant, and event append back together. An identical event replay returns
the stored result; a different success event for an already-paid order records
non-application and does not grant again.

The manual payment command is an operator boundary, not an authenticated
customer route. It defaults to a non-mutating preview and requires explicit
`--execute`. Missing, ambiguous, or inactive owner email, unavailable product,
invalid operator/reference input, and reuse of a receipt for another owner or
product all fail before an order or grant is written. Exact replay returns the
already-paid order without another ledger entry. The command never accepts a
money amount, credit amount, or browser session, and it does not reinterpret a
failed database transaction as a successful receipt.

Site-owner account-management endpoints authenticate the GoodGood session and
authorize the persisted system role before resolving list filters or a target
owner. A non-owner receives `ADMIN_ACCESS_DENIED` without account-list or target
existence detail. Review and test-credit mutations require a current CSRF-safe
request, idempotency key, target stable ID, and validated reason. Same-key/same-
operation replay returns the recorded result; conflicting reuse fails without
mutation. Grant failure rolls back the ledger entry and administrative audit
together, preserves the selected account and dialog input, and returns a
support ID. No error path falls back to a payment order, direct balance update,
or command-line receipt semantics.
Invalid access transitions return `ADMIN_STATUS_TRANSITION_INVALID`; a site
owner cannot suspend their own account. Test-credit amount outside the positive
integer range 1-5000 returns `ADMIN_CREDIT_AMOUNT_INVALID` before ledger work.

GG-030 enterprise endpoints authenticate the GoodGood session before resolving
the requested Workspace. Missing, foreign, suspended, or removed memberships
normalize to `WORKSPACE_ACCESS_DENIED` without disclosing the organization,
member, invitation, budget, or Asset. Platform site-owner authority is not an
implicit content bypass.

Invitation creation validates normalized email, role, expiry, actor capability,
and idempotency before mutation. A same-workspace pending invite for the same
email is replayed or explicitly replaced; conflicting reuse returns
`ORGANIZATION_IDEMPOTENCY_CONFLICT`. Acceptance derives the verified email from
the session. Missing, expired, revoked, already-consumed by another user, or
email-mismatched invitations return `INVITATION_UNAVAILABLE` without identifying
another account. Failure preserves the current signed-in state and offers return
to personal creation; it never creates credentials or calls an authentication
code endpoint.

Membership transitions reject the last-owner removal with
`ORGANIZATION_OWNER_REQUIRED`, invalid transitions with
`MEMBERSHIP_TRANSITION_INVALID`, and stale versions with
`MEMBERSHIP_CONFLICT`. Suspending a member blocks new Workspace reads/writes and
signed URLs but does not suspend their GoodGood user or erase company history.

Budget updates require a current member, integer limit, reason, version, and
idempotency key. `MEMBER_BUDGET_INSUFFICIENT` identifies a member limit shortfall;
`ORGANIZATION_CREDIT_INSUFFICIENT` identifies company pool capacity. A failed
allocation or generation rolls back budget and credit evidence together and
keeps the dialog/composer input. No error falls back to personal credit,
GG-027 transfer, direct cache edit, payment order, or provider submission.

`ORGANIZATION_CREDIT_UNAVAILABLE` and `MEMBER_BUDGET_UNAVAILABLE` distinguish a
disabled projection from a shortfall without exposing another Workspace.
`MEMBER_BUDGET_CONFLICT` rejects a stale version, unchanged limit, or reclaim
below settled plus reserved use. A second, different close for one reservation
returns `ORGANIZATION_CREDIT_RESERVATION_CLOSED`; a same-key/same-operation
replay returns the recorded result. Settlement and release remain allowed for
an in-flight reservation after Workspace suspension so the ledger cannot stay
half closed.

Manager usage and Asset reads retain the current list on transient failures and
offer retry. An Asset not in the validated organization scope returns the same
not-found response as an unknown ID. Raw reference objects remain creator-only;
a manager-facing result never contains their object keys or signed URLs.

Draft read, save, and delete derive the owner only from the GoodGood session.
`DRAFT_UNAVAILABLE` never clears the current composer; the inline recovery
retries the blocked read or write. Each mutation carries the last observed
version. A stale mutation returns `DRAFT_CONFLICT` plus the safely presented
current server draft, pauses further autosave, and requires an explicit
`保留当前内容` or `恢复云端草稿` choice. Foreign references normalize to
`DRAFT_REFERENCE_NOT_READY` without disclosing ownership. Direct project routes
do not consume or overwrite the root draft. Restored reference thumbnails use
an owner-scoped preview route, which signs OSS processing or streams a local
WebP transform. A client-side thumbnail
load failure keeps the reference record and tray item available for retry or
removal; it must not clear the draft or weaken server-side private-network
protections.

Project list, create, read, and update endpoints authenticate before accessing
state. Cross-owner read/update and generation continuation normalize to
`PROJECT_NOT_FOUND` before reference validation, so request ordering cannot
reveal whether another owner's project exists. `SAVE_FAILED` keeps the drawer
open and preserves the current prompt, references, parameters, and batches for
retry. A foreign, missing, or already assigned batch returns
`PROJECT_BATCH_CONFLICT` without reassigning any row.
An addressable project-detail read keeps its stable URL while loading. If the
read fails, the creation state is not replaced; the route-level error offers
retry, return to `/projects`, and `新建创作`. Authentication expiry preserves
the requested path so a successful sign-in can re-enter the same owner-scoped
restore flow.
Before an in-app new-session clear or different-project restore, a changed
prompt, references, settings, or unprojected generation opens one blocking
confirmation. Closing it or choosing `继续编辑` performs no mutation. The discard
action is explicit, and active generation blocks the destructive transition
rather than detaching its visible task state.

Asset-list reads authenticate before accessing state and derive the owner only
from the GoodGood session. An owner with no accepted successful outputs receives
an empty list. Database or private-object signing failures normalize to
`ASSET_LIBRARY_UNAVAILABLE`; the browser preserves its current asset state and
offers a retry without exposing object keys or internal error detail.
Fresh signed asset URLs use the same browser-direct private-object image
primitive rather than the server image optimizer. A client-side image load
failure keeps the asset record and its surrounding batch layout intact; it must
not reinterpret an accepted generation as a provider failure or weaken
server-side private-network protections.
An addressable `/assets/:assetId` read resolves only within that owner-scoped
list. A missing or inaccessible stable ID stays on its URL and presents the same
non-enumerating message with retry and return-to-`/assets` recovery; no foreign
asset metadata is disclosed.

Reference cleanup is an operator boundary and never turns a browser-side tray
removal into an immediate object deletion. Dry-run performs no mutation.
Execution leases a bounded candidate set, deletes each private object first,
and records `object_deleted_at` only while it still owns that lease. Storage
failure records `OBJECT_DELETE_FAILED`, increments attempt evidence, releases
the lease, and exits nonzero after the batch so a later run can retry. Losing a
lease also makes the command fail instead of asserting deletion evidence it no
longer owns. Project, generation, and unexpired creation-draft snapshots remain
authoritative protection; cleanup does not expose object keys in a user
response.

An automated PostgreSQL backup failure leaves the source database untouched,
removes only the transient plaintext archive created by that invocation, exits
nonzero, and leaves the service failed in systemd with root-journal evidence.
It does not retry a database dump, weaken retention, initialize a replacement
repository, initiate a restore, or send a staging-only outbound alert. The unit
does not print its secret URL, R2 credential, Restic password, database content,
or public host address. ADR 0016 delegates the M8 monitoring platform and
notification route to a separate agent, but the existing staging unit remains
unchanged until the resulting external route and a firing/resolved delivery
test are installed and acknowledged. Alerting never initiates a restore or
billable retry.

A production image that cannot resolve its packaged runtime modules fails the
CI image-import smoke before publication. If a later staging-only dependency
or health failure still appears after label verification and migration, the
release command exits nonzero and the operator re-applies the retained prior
release file without reversing the additive schema. The failed candidate never
replaces the active release record.

Artifact-security ingestion emits no evidence when the downloaded artifact is
malformed, its bytes differ from GitHub's immutable SHA-256, the workflow is not
a completed successful `main` run, the candidate identity differs, or any
required verify/publish step is absent or failed. GitHub API, token, and response
details are reduced to non-secret check failures. The production release
planner returns `plan: null`, `executed: false`, and a failed gate when any
required evidence is not current. It deliberately rejects execution arguments
and cannot pull, migrate, start, switch, or roll back production.
Its ADR 0091 adapter permits one fixed production Compose project and only one
production Worker. A replacement failure keeps maintenance enabled and restores
the prior application image and Worker in that same project. Nginx keeps the
fixed `127.0.0.1:3100` upstream; no release step rewrites or switches it. A
failure after reopening public traffic restores maintenance first, then repeats
public/state fingerprints after the compatible application recovery, and never
attempts a schema downgrade. Failure to prove any of those outcomes emits no
passing candidate-health or rollback evidence.

ADR 0021's single-host seed profile fails closed before conversion when the
existing Hong Kong host cannot prove its expected x86_64, 2-vCPU, 4-GiB,
50-GiB, private-R2, off-host-backup, and bounded PostgreSQL/Valkey contract. It
must also stop if a proposed reset would import staging business data, reuse a
staging R2 credential, reclassify a non-empty `goodgood` bucket, target an
unresolved path/volume/object, or run without an exact inventory, verified
archive, and explicit destructive approval. Resource-headroom failure leaves
the active release unchanged.

Single-host backup success alone does not emit production recovery evidence;
the encrypted off-host copy and isolated restore drill must still prove at most
one hour RPO, at most four hours RTO, and 14 daily / 8 weekly / 12 monthly
recovery points. The final staging archive is deleted only after its seven-day
safety window and a separate exact-target approval. ADR 0018's managed
ECS/RDS/Tair profile remains a scale-out option, never an automatic fallback or
purchase.

The initial observation phase has no fixed job-count or concurrency rejection.
If host `MemAvailable` is below 500 MiB or root-disk use reaches 80%, reject only
new generation submissions with the normalized inline recoverable error and a
support ID. Never cancel, automatically retry, or resubmit existing provider
work in response to resource pressure. Safe login, account administration, and
asset reads remain available while their dependencies are healthy. Clearing the
protection state requires an operator decision after inspecting monitoring;
capacity pressure never triggers an automatic purchase or deployment.

The Node production Web runtime implements this as a pre-write admission check
for generation submission and retry. It emits
`GENERATION_CAPACITY_PROTECTED` with HTTP 503 and `retryable: true`, records one
redacted `generation.resource_protection_activated` event, and latches the
process in protection after either threshold or an unreadable host-resource
probe. A healthy observation does not clear an already latched process: the
operator inspects the cause and restarts Web deliberately. Generation reads,
login, site-owner administration, and other non-generation handlers do not pass
through this check. Worker jobs already accepted continue independently.

Production conversion stops before seed admission if the reused Authing
application still allows a GoodGood loopback/obsolete staging callback, the
production login/logout URLs differ from `goodgood.o1key.com`, the client secret
was not rotated, it appears inline, or any old hashed GoodGood session was
imported into fresh state.
Never recover by importing old GoodGood identity bindings or sessions. A valid
existing Authing identity is provisioned through the normal fresh pending-owner
path; unexpected inherited role, credit, or content is a failed clean
conversion.

The initial conversion begins and fails closed in public maintenance mode. If
any required clean-state, identity, storage, backup, generation, health, or
rollback check fails—or the four-hour execution limit is reached—the public
site remains in maintenance and the attempt stops. Do not reopen the former
staging stack publicly, import its data, or waive a check to meet the deadline.
It may run only on a private operator path for diagnosis before another reviewed
window.

The production maintenance controller cannot reopen traffic. It rejects a
symbolic-link or incorrectly owned marker, validates the installed asset and
Nginx site, and reloads only after `nginx -t`. If reload fails or the local
origin does not return the reviewed HTTP 503 response, it stops Nginx and leaves
the marker in place. Public opening is a separate, unimplemented approval
boundary. The R2 inventory path is similarly read-only: malformed metadata,
duplicate keys, summary/hash drift, a truncated page without a continuation
token, or unknown historical-version scope stops conversion. Its deletion plan
binds the exact current-object hash but has no execution path; a changed object
set requires a new inventory and approval.

## Business-role and credit-transfer failures

- A missing/ended business role returns `BUSINESS_ROLE_REQUIRED` before any
  child or balance detail is read. Ordinary callers must not learn whether an
  arbitrary account belongs to another hierarchy.
- A target that is not the caller's active direct child returns
  `DIRECT_CHILD_NOT_FOUND`. Self, indirect, ended, or foreign relationships use
  the same public outcome; the server may retain a more precise audited reason.
- Pending/suspended parent or child state returns `ACCOUNT_ACCESS_REQUIRED` and
  produces no transfer row or ledger entry.
- A positive amount larger than payment-funded available credit returns
  `INSUFFICIENT_TRANSFERABLE_POINTS`, even when aggregate available credit is
  higher. Copy explains that welcome/test/promotion credit cannot be allocated;
  it does not suggest changing an off-platform price.
- A relationship or source balance changed after the browser read returns
  `CREDIT_TRANSFER_CONFLICT`. The browser keeps the form values, refreshes the
  summary/child row, and requires an explicit resubmission.
- Same-key/same-transfer retry returns the original completed transfer.
  Same-key/different-input reuse returns
  `CREDIT_TRANSFER_IDEMPOTENCY_CONFLICT` without mutation.
- Missing mutation CSRF evidence returns `DISTRIBUTION_CSRF_CHECK_FAILED` before
  parsing or writing a transfer. Malformed child IDs, amounts, remarks, limits,
  or opaque cursors return `CREDIT_TRANSFER_REQUEST_INVALID`.
- Site-owner attempts to create a self-link, active cycle, unchanged relationship,
  parent without an active business role, second active parent, or duplicate
  business-role interval fail with stable 409 codes such as
  `ADMIN_RELATIONSHIP_SELF_FORBIDDEN`, `ADMIN_RELATIONSHIP_CYCLE`,
  `ADMIN_RELATIONSHIP_UNCHANGED`, `ADMIN_PARENT_BUSINESS_ROLE_REQUIRED`, and
  `ADMIN_BUSINESS_ROLE_UNCHANGED`. They write no partial relationship/audit state.
- Parent debit, child credit, source allocations, paired ledger entries, and the
  public transfer/audit record are one transaction. Any failure rolls back all
  of them; there is no pending or partially completed user-facing transfer.

## Idempotency and retries

- Browser-to-GoodGood submission carries an owner-scoped idempotency key, so a
  network retry does not create a duplicate GoodGood job.
- O1Key generation submission has no upstream idempotency key. The worker
  persists its at-most-once guard before POST and never automatically resubmits
  a guarded attempt without `task_id`.
- Polling retries are bounded. User retry creates a visible new job linked to
  the previous failure; for O1Key it is also a new billable upstream task.
- Polling an already durable O1Key task and retrying delivery of its returned
  URL do not create a new upstream task or charge.
- Asset and project save operations are idempotent. Current project creation
  carries an owner-scoped idempotency key; repeating the same request returns
  the original project and conflicting key reuse returns 409.
- Credit-ledger operations are server-only and account-scoped. Same-key/
  same-operation replay returns the existing append; same-key/different-
  operation replay fails with `CREDIT_IDEMPOTENCY_CONFLICT`. A reservation
  closes through exactly one settle or release entry, and a settled
  single-output charge accepts at most one full refund. Live generation maps
  unavailable price and insufficient balance errors to the submission action;
  internal ledger consistency errors still fail closed.
- Direct-child transfers additionally use a parent-scoped idempotency key and
  deterministic two-account locking. Retrying a committed request returns its
  immutable public transfer; a concurrent generation reservation or transfer
  rechecks the source projection under lock and cannot overdraw it.

In the current M3 implementation, user retry is represented by a new durable
job linked with `retry_of_job_id`; the backend copies the failed snapshot rather
than trusting a browser-resubmitted replacement. Provider fallback within one
job is deferred to the real gateway milestone.

GG-077：下架/不可用案例不增加查看或使用；载入固定预设前先验证参数和可用报价。查看/使用的交互UUID跨effect重入和重试保持，报价刷新不增加使用。实际生成仍通过原子预留和版本冲突/积分不足恢复，不在浏览器拼接隐藏参数。
# GG-104 upload failures

The composer checks image and video type and 200 MiB original size before
adding a preview. Each accepted file displays a local
preview while uploading. A failed file stays visible with a safe server
message, HTTP status or request ID when supplied, plus retry and removal.
Authentication, workspace and private-object errors do not expose SQL, keys,
credentials or raw provider responses. Completion status reconciliation avoids
marking a successfully validated file failed solely because its response was
lost. A failed upload never sends a generation request.
# GG-173 · Canvas save failures

Canvas edits write to IndexedDB before remote autosave. An unreachable API or offline network keeps the local snapshot and shows “未同步”; reconnect and explicit retry resume the same versioned document. If IndexedDB is unavailable or out of quota, show a distinct local-storage failure and never claim “已保存”. A 409 version conflict preserves the dirty local graph as a new project ID while leaving the server's existing project untouched. A remote project that cannot be read and has no local snapshot blocks editing rather than replacing unknown content with an empty document. Pending local media keeps its File for retry; a generation submit without a confirmed server job ID is not replayed automatically because it might duplicate a paid request. See [ADR 0114](decisions/0114-durable-canvas-projects.md).

## GG-346 · 调色错误与取消

当前图片读取/解码失败在图面重试；参考失败/无可用颜色在面板重新匹配或显式换图/仅手动，不选另一参考冒充成功。黑白/全透明当前图仍可手动预览，自动匹配给出明确提示。WebGL不可用用CPU预览，上下文丢失提示重开；导出失败保留参数，沿原图实际JPEG/PNG格式保存，超过20MiB提示暂不能保存，不切换格式或压缩，超过4000万像素/16384边不静默降分辨率。取消/Escape和身份/页/源节点失效取消任务，迟到结果不提交；双击保存由进行中锁合并。保存成功仅表示新File通过现有副本提交，实际上传失败仍由原上传状态/重试处理，不提前宣称云端已持久化。

## GG-363 · Batch reference failures

Preflight each whole connection before grouping: reject mixed/unavailable sources, duplicate-only groups, cycles and total unique inputs above ten. An invalid generator drop uses the existing brief error notification, including required reduction; never silently load a partial batch or mutate existing refs. Uploading inputs stay placeholders and failed inputs retain per-image retry; both prevent Generate. Group members removed during dragging invalidate the frozen selection. Escape blocks even a late native pointer-up callback. Removed/excluded members and deleted pages cancel their own import consumers; other targets retain independent subscriptions.

## GG-364 · Controlled-edge update loop

GG-363 rebuilt visibleEdges on every graphRevision, including empty/ordinary graphs. React Flow wrote that new array to its store and the project observer advanced graphRevision again, causing Maximum update depth exceeded. The fix keeps unchanged projected edges/arrays stable and allows real changes through. This is a source-level cause/fix; no browser reproduction or automatic acceptance was run under GG-276.

## GG-365 · Reference reorder cancellation

Sorting makes no generation or upload request. Single/empty lists and busy generators do not start; outside drops, Escape, pointer cancellation/capture loss, window blur and source/scope invalidation leave order intact. Commit validates live source/target IDs and the current target lock. Loading/failed references keep their status, retry and generation gate; upload completion remaps a sorted pending direct ID instead of losing its position. Existing IndexedDB/CAS save errors remain authoritative.

GG-367 preview is isolated from the saved order. An altered reference list, resized tray or changed canvas zoom cancels measured-slot displacement rather than submitting stale geometry. Release within the image row (including gaps) commits once; outside/text-item drops and cancellation clear transforms with no draft/history edit. Animated thumbnails never serve as insertion hit targets.


## GG-370 · 批量生成边界

空组/素材未完成/失败、配对多图组数量不一致、实际单请求超10张、报价缺失/余额不足或画布容量超1MiB时不提交，保留素材/提示词/参数。容量门控作用于整次批量，不静默截断候选组合，也不新增人为总任务上限。每次请求保持原单图slot幂等：未知提交沿原key查询，已确认失败按原冻结组合独立重试，成功结果不重复。总额为各实际参考数量档报价累加，提交并非跨任务资金原子事务，后台仍按每任务预留/结算/释放。

## GG-371 · 相册与组合详情恢复

资产侧栏读取中/失败/管理忙时禁止拖放，避免把半集合当完整相册；载入失败沿原资产页重试。空相册显示明确空状态且不能连线。相册单图预览失败保留该成员并提供重试；参考转换失败在批量组保留原位置/重试门控，不静默跳过该图生成其他组合。身份/页面变化和侧栏内/无效拖放无新增相册。相册仅候选端口连接，普通/公共端口给出明确提示，10图实际请求约束保持。组合详情的页码越界按当前有效数量夹取，配置变化重新定位，不把异步旧页内容用于提交。

## GG-372 · 右键移动门控与恢复

移动至只读取当前已授权素材/文件夹，kind必须与media匹配；不存在/同目录/缺数据直接拒绝。读取失败/编辑/管理请求或移动pending时禁用且选择处理再读实时ref门控，避免重复提交。复用原mover保留名称/标签、成功后更新归属并刷新、失败保留原位置及重试、卸载后不回写；菜单不改文件内容、原资产身份或已建立相册快照。

## GG-378 · 相册选中时报伸缩回调未定义

GG-377相册渲染选中角点时引用了未声明的startResize，finishResize及resizeWithKeyboard也遗漏。补齐组件内回调，沿普通组捕获历史、标记manual、结束同步width/height/style并提交既有保存；方向键使用既有resizeCanvasGroup。属于渲染引用缺陷，不增加错误吞噬、重试请求或改写相册素材。用户刷新后手验，沿GG-276未自动验收。

## GG-379 · 临时空图不得覆盖已保存画布

热更新/卸载时React Flow StoreUpdater.reset会清空内部节点；CanvasProjectSync在写本机队列前检查同页从非空变空，未有显式删除末个节点或撤销/重做到空页的授权则拒绝更新并提示暂停保存，旧本机/服务器快照保持。授权按pageId限定，只在保存成功后消费并在项目恢复时清理；新增空页/初始空图、部分删除及删页保持。不得用仅重新渲染或视口变动授权清空。GG-379现场原171空记录保留，170恢复快照单独保存及新建副本，不覆盖用户当前内容或直接改浏览器LevelDB。

## GG-380 · 避免空端点残留

不能只删除参考边或排除最后一个成员而保留旧batchGroupCount。候选组前后比较使用所有实际输入，加载/失败图不会被当空图移除；删除部分成员、仍有其他连接时保留该组。只在显式移除事件收缩，不在render/effect/恢复/热更新中全局裁空。公共参考和普通生成不触发组收缩；未知/无节点输入不改节点配置。GG-379空图误保存保护保持。

## GG-383 · 上传复用失败边界

声明指纹格式不合法/复制策略无指纹拒绝请求；实际内容不匹配返回UPLOAD_CHECKSUM_MISMATCH并沿原失败处理。查询仅当前已授权workspace/creator，排除已删除/失败/过期条目；不会从文件名/预览相似判断。多个消费者完成同一pending允许匹配ready结果恢复，元数据/校验不符不接受，并且expires_at必须仍有效。原网络PUT重试/complete状态轮询、用户重试和文件保留路径保持。未应用0067不得启动新Web；旧Web仍接受新客户端的普通上传响应，但不能提供完整后台复用，交付不宣称刷新就全面生效。
