# Product definition

## GG-405 · 智能分镜显式默认

按用户新决定，视频分镜展示智能分镜、单镜头与自定义；智能为新节点默认且可直接选回，替代GG-401隐藏自动选项。官方词汇的运镜参考全部收进单镜头子菜单，支持不指定运镜，不增加独立参数或解释标题。参数/素材限制、收费、自动分镜不提前调用AI脚本及旧已存选择保持。

## GG-401 · 视频分镜默认与运镜参考

视频新节点默认自动分镜，由原有生成任务multi_shot决定镜头，UI不要求用户再选择自动，也不预先发起AI写脚本调用。单镜头是可取消的明确选择；自定义允许按截图逐场景描述和滑块设置整数秒，合计始终等于总长。运镜参考基于[Kling官方运镜指南](https://kling.ai/quickstart/ai-camera-control-guide)的六类基本运镜词汇（变焦提供拉近/拉远），作为可见且可编辑的提示词，不宣称当前O1Key O3接口支持camera_control参数或保证效果。恢复/复制的旧选择与冻结任务不自动改变；不新增成本项、持久字段或提前调用。

## GG-397 · 全能参考与输出参数

「参考生成」更名「全能参考」，仅显示名及菜单位置变化，reference_to_video内部身份保持。首尾帧字体与编号同为10px。用户提议隐藏随素材参数；核对实际接口后，自动决定的是宽高比，清晰度仍是独立输出选项。按此事实隐藏无效比例以及视频参考的固定静音/分镜控件，保留仍有效的清晰度/时长与价格。依据为用户O1Key附件及[Kling Omni官方接口](https://kling.ai/document-api/api/video/3-0-omni/video-omni.md)、[Motion官方接口](https://kling.ai/document-api/api/video/3-0-omni/motion-control.md)，2026-10-06公开只读获取；未实测付费接口。

## GG-395 · 简洁的素材分类

生成类型已经确定图片的用途，缩略图不再提供独立分类菜单。仅首尾帧保留用于区别两张实际输入的纯文字标签；图生和参考生成不显示重复分类。可编辑首尾输入按图片托盘顺序自动决定。后续交互从用户的实际任务出发，优先减少重复设置与无助于决策的控件。

## GG-394 · 素材模式解释边界

视频菜单中的图生视频明确指恰好1张首帧图片；首尾帧仍可仅首帧，参考生成采用图片/视频参考而不固定首帧。hover规则替代常驻说明，可用于理解禁用原因。此为当前产品入口区分；Omni官方协议另支持首帧与参考图组合，不把组合能力笼统宣称为所有图生视频入口的能力。对功能与模型能力的解释需核对实际配置模型/路由的官方文档及用户中转契约；未确认事实需明确，不根据名称推断。

## GG-384 · 画布Kling视频生成

用户接受按O1Key附件开发视频生成节点；ADR0143专门扩展画布的持久视频任务，不改变Seedance临时预览。右键创建“视频生成”，当前页按节点顺序编号。模型明确为Kling 3.0 Omni与Kling 3.0动作模仿；Omni支持文生、图生、首尾帧、参考生成、视频编辑，动作模仿需一张角色图和一个动作视频。每次一条视频，不增加附件未定义的数量/element/取消接口。可接收连接的文本/图片/视频，也可上传或选资产；生成视频自动进入私有视频资产，并可连接给文本或视频节点。用户选择按模型/分辨率/时长计价，五档每秒积分未给定，未定价禁止提交。


## GG-352 / GG-354 / GG-359 · 图片框选与贴图

图片快捷栏提供「框选」「贴图」。框选按GG-359直接进入画布原图编辑状态，默认居中红框和四角调节柄，按GG-361移除左上文字标签，支持重新拖框、移动和调整大小；右侧内容适应的紧凑面板仅「取消」「确认」。暂时移除bbox/复制；确认将红框写入原尺寸PNG旁置副本，原图保留。提示、角点及编辑遮罩不进入副本，不打开独立弹框或自动调用模型。

贴图支持最多10张本地JPEG/PNG/WebP或已有受权资产图片，置于原图上层并保留透明度；选择图层后可移动、四角等比缩放、旋转柄/数值旋转、调整前后顺序及删除。原图支持视图缩放、平移、适应画面；所有编辑值均为原图像素，确认后保存原图尺寸的PNG旁置副本，超出原图的贴图部分裁去。当前不改变底图合成构图、覆盖源图、调用模型或新增收费/API/后台。首版布局暂不单独持久化，关闭丢弃草稿，只有确认输出保存到项目/资产。见[ADR0141](decisions/0141-image-region-and-stickers.md)。

## GG-341 / GG-342 · 去除AI（ADR0138，本地已启用）

图片快捷栏独立「去除AI」，GG-343悬停提示/无障碍名称仅显示「去除AI识别」，不展示积分或技术原理，点击直接处理选中原图并保存副本。
范围为文件内C2PA、EXIF/GPS/缩略图、XMP/IPTC/注释，以及PNG全部文本
（包含ComfyUI prompt/workflow）和时间块。原图保留；不承诺清除像素水印
或绕过AI检测。JPEG/PNG20MiB及既有参考图尺寸限制。普通文件保持图像流；
旋转标签移除需要保留视觉朝向时转为PNG。一次有效成功处理收费10积分，
空元数据图片同价；失败无收费，同请求重试不重复收费。元数据编辑弹框
继续填写/复制/粘贴参数，旧清理入口移至快捷栏。GG-342已完成0065与新Web本地启用，功能效果待用户手验。

## GG-340 · 平台公告（ADR 0137）

已启用的登录用户在大厅和画布右上角查看平台公告，站长在管理页发布
活动和重要消息。首版支持标题、Markdown正文、安全HTTP(S)链接、重要与
置顶标记；不含配图、评论、转发或系统推送。收到新发布/更新时有可关闭
短暂提醒及持续未读标记，不自动打开阅读面板。用户可点赞/取消点赞；
实际阅读人数与点赞数只由后台统计，所有前端暂不显示指标。
草稿、发布更新、撤回、软删除均为明确操作；已发布稿需先撤回才能删除。
GG-342已完成0064迁移和新Web本地启用，人工验收由用户负责。

## GG-339 提示词反推显示命名

画布右键入口与节点自动标题由「文本生成」改为「提示词反推」，首个预设名称由「结构化反推」改为「结构化提示词」。仅显示命名调整，内部textGenerator/structured_reverse和已有文本/图片/视频输入、生成/编辑/历史/计费保持。底栏模型按钮按图标、模型名称和箭头的内容宽度显示，预设紧随其后，不随输入框宽度拉伸。见 [GG-339](tasks/GG-339-prompt-reverse-ui.md)、[ADR0127](decisions/0127-canvas-text-generation.md) 和 [ADR0130](decisions/0130-text-generation-presets.md)。

## GG-337 画布原图下载

画布图片和画布内资产列表的图片右键提供「下载」（GG-338将原「下载原图」文案收短）。下载当前文件的原始字节，不额外压缩、调整尺寸、转码或修改元数据；清理/裁剪副本下载自身文件。生成批次按实际点击的图片定位，上传中或失败但仍保留本地原始 File 的图片也可下载。资产列表适用于生成图与上传参考图。见 [GG-337](tasks/GG-337-original-download.md)、[GG-338](tasks/GG-338-download-label.md) 和 [ADR0034](decisions/0034-stable-generation-grid-and-download.md)。

## GG-327 / GG-345 添加图片数据

GG-349在弹框工具行增加「随机生成」：从100组不同的示例数据填入全部11项拍摄参数，同时清空4项图片信息和旧粘贴草稿，可继续手动修改。单次弹框会话内每轮100组不重复，新轮第一组不紧邻重复上一轮末组；只随机填写，不调用模型或新增收费。确认添加以15项可编辑字段至少一项trim后非空为门槛，不要求填满；原图就绪、处理中锁定及写入格式校验仍保持。暂不新增EXIF字段。

GG-348移除位置信息填写，仅保留11项拍摄参数和4项图片信息。表单/复制/粘贴不添加位置，当前目标图已有的可读取成对经纬度沿原副本路径保持；这不是定位清理。图片快捷操作「添加数据」打开即读取当前原图并填入已有可编辑参数，支持复制/粘贴和手动填写；GG-347移除还原按钮，关闭弹框后重新打开即可重新读取原图参数。GG-345移除「从参考图提取」及关联读取流程，不在弹框展示C2PA、签名/凭证失效、水印/外部凭证或清理功能说明。

底部仅「确认添加」，移除下载副本和左下提示；确认后沿原保存路径新增私有图片副本与画布节点，不覆盖源图、不改生成记录或调用模型。普通编辑的内部凭证保留与安全解析不变，清理仍是独立快捷功能。图片下载继续通过画布/资产右键。见[GG-345](tasks/GG-345-add-data-dialog.md)与[ADR0136](decisions/0136-image-metadata-copies.md)。

## GG-311 提示词模板保存与画布资产筛选

文本节点模板保存弹窗只命名，不预览；标题「保存提示词模板」，按钮「保存」。保存服务端确认后以资产入口动效和短提示说明已添加，资产列表仍用1:1文字缩略。画布资产右上为类型筛选，全部/图片/视频/音频/提示词模板作用于当前文件夹，不改变素材身份或归属；面板沿资产入口切换或Escape关闭。见[ADR0133](decisions/0133-canvas-text-template-assets.md)。

## GG-303 画布图片提示词批量

图片生成节点将连接文本按边顺序与自身提示词合并，独占一行的`---`、`———`或`－－－`分割为并发任务。忽略空段、保留重复段与顺序；每段共用当前冻结设置和参考图，总图片数为非空段数×图片数量，积分按钮沿权威单段报价乘以段数。任务独立接受/结算，结果仍放在原节点，失败段单独重试；不新增段数、总图片数或并发上限。仅显式点击生成提交。见[ADR0131](decisions/0131-canvas-concurrent-prompt-batches.md)。

## GG-243 项目页创建入口

项目列表第一项固定为「新建项目」卡片，点击直接建立一个新的空白画布。此入口取代本页原页头新建创作按钮，沿用已有画布持久化与恢复能力。见 [ADR 0119](decisions/0119-project-create-card.md)。

## GG-217 平台币删除

平台币（JCOIN）退出产品：个人/站长入口、页面、余额与流水查询、发行管理和
自动奖励处理均移除。旧页面退出工作区，旧API返回410「功能已移除」。正常
积分、充值、消费结算与退款保持，历史账本只保留为证据。下方GG-080—086及
ADR0079—0084为历史，不再定义当前产品范围。见[ADR0117](decisions/0117-retire-jcoin.md)。

## GG-203 画布八张生成数量

画布 Nano Banana 2 和 Nano Banana Pro 的数量选择为纯数字 `1 / 2 / 4 / 8`，默认一张；GPT 和大厅沿用 1/2/4。八张仍是统一报价、统一成功或失败、统一移动/展开的一批图片，仅明确点击生成才提交；没有真实报价不能生成。八张通过既有逐张 Nano 请求编排，不要求上游新增原生多图参数。见 [GG-203](tasks/GG-203-canvas-generation-count-eight.md)。

## GG-189 画布 Nano 参数

画布中新建的图片生成器为 Nano Banana 2 和 Nano Banana Pro 提供「自适应」默认宽高比及 1、2、4 张输出；仅点击生成并且有有效价格时才提交。自适应是产品选择，供应商请求省略比例字段，由模型依据参考图或缺省方图决定结果；显示以真实输出像素为准。旧草稿及大厅默认规格不改。Pro 2/4 张每张独立执行，但作为一个可恢复、统一报价的任务。见 [GG-189](tasks/GG-189-canvas-nano-adaptive-settings.md)。

## GG-167 画布图片生成器与图片连线

`/canvas` 的图片生成功能从临时图片生成器节点进入。空白画布右键创建浅灰占位卡，选中卡片才显示原 chat；取消选择后画布恢复安静。每个生成器保有本次页面中的提示词、规格和直接上传的参考图，图片节点还可用连线提供参考图。连线输入必须最终对应所属用户的 ready 私有参考图 ID；生成资产需先通过服务端受权导入，未完成或失败的连线会阻止该生成器提交。用户仍需明确点击生成，连接和创建本身不扣费。画布结构与生成器草稿当前不保存，已上传参考图和生成结果仍遵循原资产生命周期。见 [GG-167](tasks/GG-167-canvas-image-generator-node.md) 和 [ADR 0108 补充](decisions/0108-standalone-canvas-image-generation.md)。

## GG-161 画布本地素材入库

从电脑拖入 `/canvas` 的 JPEG/PNG/MP4 现在会在保持即时预览的同时上传到个人私有素材库。素材成功后可从资产库再次使用；画布节点位置仍只属于当前页面。失败可在原节点重试，删除未完成的节点会停止本次上传。已有资产拖入画布不会重复入库，音频暂不扩展到此路径。GG-126/GG-146 的本地不入库规则及 GG-160 的三秒模拟均已由本决定取代。见 [GG-161](tasks/GG-161-canvas-local-media-upload.md) 与 [ADR 0108 补充](decisions/0108-standalone-canvas-image-generation.md)。

## GG-159 画布积分明细

独立画布右上角的积分余额可打开与大厅头像菜单相同的个人积分明细弹框，无需离开画布。弹框标题统一为「积分明细」，今日/本周/本月消耗的数值只显示数字；账本和余额语义不变，画布节点、视角、提示词与参考图在弹框关闭后继续保留。见 [GG-159](tasks/GG-159-canvas-credit-detail-entry.md) 和 [ADR 0112](decisions/0112-account-credit-usage-dialog.md)。

## GG-308 文本模板资产

文本编辑/文本生成结果单击选中显示快捷栏，首项设置模板；双击或Enter/F2进入编辑才显示格式栏。设置模板冻结当前完整Markdown和纯文本、命名后保存到私有资产，后续编辑源节点不改模板；空内容/生成或恢复中禁用。画布资产栏和资产页以1:1正方形展示部分文字缩略，溢出只影响预览；可查看全文、整理/删除，资产页下载Markdown，画布拖入为独立文本编辑节点并沿原项目保存。此功能不生成、不收费，也不保存文本生成预设的隐藏指令。见[ADR0133](decisions/0133-canvas-text-template-assets.md)。

## GG-151 画布资产浏览

`/canvas` 左下角的资料库图标可打开个人资产侧栏。侧栏从最左侧展开，将画布、顶部标题和底部输入区排至剩余区域；根层同时展示文件夹和未归档素材，点击文件夹查看其成员，再返回根层。移入文件夹是更新同一素材归属，成功后不再留在原位置；失效文件夹归属回根层显示，避免隐藏可用素材。素材行保留缩略图或媒体类型图标及文件名，悬停图片/视频时可查看较大预览。此入口只供浏览，不代表画布素材已被添加为节点，也不触发上传、生成或计费。见 [GG-151](tasks/GG-151-canvas-asset-panel.md)、[GG-265](tasks/GG-265-canvas-folder-move-membership.md) 与 [ADR 0108 补充](decisions/0108-standalone-canvas-image-generation.md)。

## GG-149 画布项目入口

`/canvas` 左上角使用黑底白色单 G 圆形项目图标取代原返回组合；点击图标打开仅含「主页」的菜单，返回 `/create` 主工作台。画布仍是独立界面，临时节点离开后不保存。见 [GG-149](tasks/GG-149-canvas-home-icon-menu.md) 和 [ADR 0108 补充](decisions/0108-standalone-canvas-image-generation.md)。

## GG-148 画布地图

`/canvas` 左下角提供可收起的小地图，显示当前临时图片/视频/生成节点的空间分布与视口位置，支持在地图上平移和缩放。地图只是当前画布的导航，不保存布局；百分比入口保留既有缩放能力，但不再展示右侧箭头。见 [GG-148](tasks/GG-148-canvas-mini-map.md) 和 [ADR 0108 补充](decisions/0108-standalone-canvas-image-generation.md)。

## GG-146 本地视频进入画布

`/canvas` 在 JPEG/PNG 图片之外接受从电脑拖入 MP4，立即形成可移动、可等比缩放的临时视频节点。封面保留播放标志和时长，悬停静音播放，移开暂停并保留进度；文件名、原始像素尺寸及可读取的 FPS 出现在节点上沿。拖入不上传、不生成、不持久化；画布的图片生成输入区仍只选择参考图片。见 [GG-146](tasks/GG-146-canvas-local-video-drop.md)、[ADR 0108 补充](decisions/0108-standalone-canvas-image-generation.md)。

## GG-126 本地图片进入画布

`/canvas` 接受从电脑拖入 JPEG/PNG，图片立即成为本页可移动的临时节点；拖入本身不上传。GG-126 曾提供顶部文件选择、适应画布和节点悬停操作，这些入口后来由 GG-128 与 GG-140 撤下；视口拟合保留在左下角缩放菜单。输入区仍可独立选择私有参考图，画布位置和本地图片刷新后消失，已明确上传的参考图及生成资产仍遵循既有持久边界。见 [GG-126](tasks/GG-126-canvas-local-image-drop.md)、[GG-140](tasks/GG-140-canvas-header-simplification.md)。

## GG-125 独立画布与图片生成

`/canvas` 是脱离大厅壳层的独立画布创作界面。纯白 React Flow 画布保留平移、缩放；常用图片生成从提示词、最多 10 张参考图、可用模型、比例、分辨率和数量开始，结果以可移动图片节点出现。生成任务与资产沿用既有持久服务；画布节点位置、连线和画布文档暂不保存。返回 `/create` 不清除其已有持久草稿；无网格、假节点或引导卡。见 [ADR 0108](decisions/0108-standalone-canvas-image-generation.md)。

## GG-122 standalone Hero preview

`/hero` is a standalone local preview of a GoodGood introduction, separate
from the signed-in creation workspace. It uses the supplied three-image Hero
component, truthful product copy and links to existing creation and asset
routes. The sample customer-count claim is omitted. `/` and `/create` remain
working creation tools, with no new navigation entry or release decision.

## GG-121 unified asset surface

`/assets` is named `资产` and shows generated results and accepted uploads in
one newest-first collection. Text-only `全部 / 图片 / 视频 / 音频` tabs filter media;
icon-only `已上传 / 已生成` controls filter origin. Folders organize the same files
without copying them. The `项目` heading on this asset page labels asset files,
not saved creative projects; those remain separate resumable sessions. Users can
switch between masonry grid and file list, select files, move or download them,
and permanently delete generated images or uploaded images, videos, and audio
after confirmation. Asset tags are no longer offered; existing metadata is
preserved. See [ADR 0106](decisions/0106-unified-asset-library-surface.md) and
[ADR 0107](decisions/0107-asset-selection-and-tag-retirement.md).
Inside a folder, creators can search its files and upload new media directly
from the empty state; uploaded files are assigned to that folder and surface in
the same grid or list after refresh.
The upper-right upload action also opens the system file picker directly. It
uploads to the current folder, or leaves files unclassified from the asset root,
and reports outcomes in the upload tray without an intermediate dialog.
Folders can be selected in grid or list view. Their selection bar offers Delete
and close; folder download and movement are deferred. Deleting a folder returns
its contents to the asset root. Folder Rename uses an in-page name dialog.

## GG-115 asset workspace decision

Historical GG-115 presentation: `/assets` defaulted to `生成记录`, grouped by date
with `全部 / 图片 / 视频 / 音频` counts. `个人资产库` showed the same generated objects together
with accepted uploads; generation automatically enters the library. Users can
create folders, move items, and add tags without copying media or turning
projects into folders. New uploads in every entry point are limited to 20 MiB
per file and JPG/JPEG, PNG, MP4, or MP3. Older WebP/MOV/WAV and larger stored
files remain readable. This decision supersedes earlier 200 MiB upload copy in
this document; see [ADR 0102](decisions/0102-asset-history-library-and-upload.md).

GG-096以ADR0088取代GG091的单一认证表单界面：提供独立`/login`、`/register`与固定登录/注册子导航；登录隐藏邀请码，注册直接显示邀请码。**邀请码已改为选填**（ADR 0089）：不填即可注册，填了必须有效。GG091账户规则不变：每账户固定唯一6位数字邀请码、可无限邀请，显示本人积分下方；邀请码为分享标识，不授予角色或奖励。**注册成功即建 `active` 账户并得 200 欢迎积分，可立即创作；准入收口唯一依赖 `GOODGOOD_EMAIL_REGISTRATION_ENABLED`**（ADR 0090，废弃 pending 审批模型）。**已于 2026-09-15 随 GG-097 部署生产并开放。**线上测试账户清理已独立执行，见GG091任务。

GG-090本地新注册入口改为邀请码：有效邮箱验证码及活动未使用单人邀请码共同创建已开通账户，无等待审核。已有用户邮箱登录；旧待审核用户新验证邮箱补码开通，暂停账户不自动恢复。站长在账户管理生成/停用/查看邀请码使用状态；邀请码明文生成时显示一次。不代表已部署生产。

GG-087新增私有问题反馈：帮助下方进入，选问题类型、描述、最多5张图片，查看自己的状态和站长回复；活动站长在管理页处理。登录待审核/暂停用户也可反馈，不赋予创作权限。无公开反馈/举报/邮件推送，图片不进入素材资产库。见ADR0085。

JCOIN历史决定（已由ADR0117退役）见[ADR0081](decisions/0081-jcoin-batch-accumulation.md)：每批限定总额、无截止日期、发完后另行开启下一批；第一期仅充值消费挖矿并累计，不支持积分或其他兑换，不锚定人民币价值。第一期100万枚已由[ADR0082](decisions/0082-jcoin-first-batch-budget.md)接受，按预计50万元有效消费规模确定每100有效充值消费积分奖励2枚，见[ADR0083](decisions/0083-jcoin-first-batch-consumption-coefficient.md)；此前系数10、兑换/服务面值及自动跨阶段建议失效。总上限1亿、5000万用户回馈、消费驱动与2026-09-18北京时间00:00起算不变，20%创作安排保留未启动。GG-084本地实现一期账本和页面，未部署或在真实数据发行。下文GG080为历史规划背景。

历史[ADR0084](decisions/0084-jcoin-runtime-and-private-user-view.md)（已退役）：个人平台币页只显示自己的余额、累计获得、退款撤回与分页流水，接口不返回发行总量/批次额度。站长管理查看固定库存及一期计划，开启、暂停、恢复和手动处理；迁移初始为未开启，9.18前不奖励。成功消费中的可靠正式充值部分按比例奖励，小额同样累计，已退款不奖励、事后退款撤回原实际奖励且不释放本期发行额度。混合测试资金或缺支付证据保守排除；创作池、企业来源、正式视频及下一批配置另行实施。

GG-081本地候选允许站长按充值/赠送/活动奖励/测试/服务补偿/其他增加个人积分，默认测试；类型独立于备注。充值登记已确认收款，凭证唯一，100积分/CNY，单次1—1000000（上限1万元），赠品独立记赠送。站长入口默认运营看板，统计真实充值与生成任务并发；GG-084在此基础上接入一期消费奖励。参见[ADR0080](decisions/0080-classified-admin-credit-grants-and-operations.md)。

GG-080 proposes a separate JCOIN reward system, continuing candidate a73835f.
The owner confirmed a fixed 100,000,000 supply cap and a 50,000,000 user-benefit
pool, consumption-driven release and a 2026-09-18 Shanghai settlement cutoff.
Early rewards require proven payment-funded consumption; a proposed 20% creative
arrangement needs denominator/utility clarification before the subpools are fixed.
Admin credit types must be structured rather than inferred from notes. Rates,
utility, beneficiary rules, classified grant implementation and issuance remain proposed in
[ADR 0079](decisions/0079-jcoin-reward-planning.md) and the
[distribution plan](research/GG-080-jcoin-distribution-plan.md).
No wallet, token issuance, pricing conversion or management change is implemented
by this planning task; existing consumption-credit rules remain authoritative.

GG-117 retired the inspiration board outright. The case-publish/reuse surface
that GG-073 through GG-077 built — public and hidden case prompts, before/after
comparison, likes, view/use statistics and recipe reuse — was removed, and its
five tables are dropped. No case is migrated. The images and their generation
and billing history remain; only the publication layer is gone. See
[ADR 0104](decisions/0104-inspiration-feature-retirement.md); the earlier
[ADR 0076](decisions/0076-shareable-inspiration-cases.md),
[ADR 0077](decisions/0077-inspiration-editor-private-presets.md) and
[ADR 0078](decisions/0078-inspiration-visibility-and-statistics.md) are
historical records of the retired design.

GG-254 replaces GG-072's private profile/works page with personal information
inside the existing account dialog. One username (default `mimi`) and avatar
can be edited there; login email, stable six-digit user ID and invitation code
remain visible. The separate @handle and personal home/works feature are retired;
historical data remains. ADR 0075 records this replacement.

## One sentence

GoodGood is an image-first AI visual creation workspace for people who need to
generate quickly, compare many visual directions, keep useful assets, and
resume a coherent body of work later.

## Positioning

- Category: global premium visual AI platform.
- Initial experience: Chinese-first creation workflow, globally legible brand.
- Primary users: photographers, visual creators, fashion/e-commerce teams, and
  small creative teams producing repeated image batches.
- Core promise: reduce the distance between an idea and a usable visual asset
  while preserving the creative trail.

GoodGood is not positioned as a technical model console. Model parameters are
necessary controls, but generated images remain the visual center of gravity.

## Core mental model

The product has four distinct concepts:

1. **创作 / Creation** — the active, fast, continuously accumulating session.
2. **批次 / Batch** — one submission plus its prompt, references, parameters,
   results, status, and time.
3. **资产 / Asset** — an owner-scoped stored image. Generated outputs can be
   inspected and downloaded; uploaded materials can be selected repeatedly as
   creation references without uploading their bytes again.
4. **项目 / Project** — a saved creative context containing multiple related
   batches and enough state to resume work.

Do not collapse these terms. In particular, an asset library is not a job log,
and a project is not simply a folder of images.

## Primary journey

1. A new user sees a restrained empty creation state.
2. They enter a prompt, optionally add up to 10 references from local files or
   previously uploaded materials, and optionally open the attached settings drawer.
3. They select model, aspect ratio, resolution, and generation count.
4. The latest batch begins at the top of the creation stream.
5. Completed images and accepted uploads enter their respective asset-library
   sections automatically.
6. The user continues generating around the same goal without leaving creation.
7. When the body of work becomes meaningful, they save the session as a project.
8. Later they open the project, restore its state, and continue; they can always
   start a clean creation from the project surface.

## Implemented scope and active launch boundary

The owner selected GoodGood-owned email-code-only authentication in
[ADR 0045](decisions/0045-goodgood-owned-email-otp.md), with Google deferred.
[EMAIL_AUTH_PLAN.md](EMAIL_AUTH_PLAN.md) defines the planned rollout; the
Authing entry below still describes the implemented/deployed baseline.

The product has real authenticated, durable production behavior, not just a
frontend simulation. Exact deployed identity and verification live in
`docs/CURRENT_STATE.md`; this section defines capability scope rather than
duplicating a release log.

- Prompt/reference composer, attached settings, responsive creation stream,
  polled pending/success/inline failure, retry, gallery and focused image detail.
- The composer also has an accepted frontend-only `图片 / 视频` mode boundary.
  Video mode presents Seedance 2.5, 2.0, 2.0 Fast, and 2.0 Mini with
  capability-derived ratio, provider line, generation mode, resolution, duration,
  audio, and multimedia reference controls. Line defaults to `标准` (Doubao) and
  offers `备用` (HC) with the same product capabilities. `多模态` is the default and accepts model-bounded
  image, video, and audio references; `首尾帧` accepts at most two ordered images.
  Video references may come from local files or reusable
  image, video, and audio assets in the owner's library. The current frontend
  receives real generated/uploaded images; durable video and audio rows remain
  empty until the mixed-media asset API is connected. Configured local development
  offers a real text-to-video Seedance preview on user submission, with transient
  results only. New video-mode file upload, quote, durable submission, billing,
  and persistence remain pending the authenticated durable job contract. The
  server-side O1Key transport adapter owns the Seedance material/video endpoints
  without exposing an upstream credential to the browser.
  Local reference upload is one explicit `上传素材` action capable of images,
  videos, and audio. It never creates an upstream reusable material automatically.
  `创建素材` is a separate opt-in flow for user-selected references. Historical
  created materials must be revalidated immediately before video submission;
  invalid or uncertain materials block submission and require explicit recreation.
- Nano Banana 2 through the real server-side O1Key route across 14 product
  ratios, plus the ordered GPT image family `GPT IMAGE 2.5 sunburst`,
  `GPT IMAGE 2`, and `GPT IMAGE 2.5 flare` across the same seven exact-size
  ratios. Their provider IDs are `gpt-image-2.5-sunburst`, `gpt-image-2`, and
  `gpt-image-2.5-flare`. All use `1K / 2K / 4K`, accept `1 / 2 / 4` outputs,
  and use model-owned capability maps. Each GPT image request uses one native task; Nano Banana 2
  composes a multi-image batch from one upstream task per requested image.
  Other visible model names are not a promise of availability.
- Nano Banana 2 exposes default-off Google Search grounding and internally uses
  high thinking without a creator-facing thinking control. These values are
  frozen with the generation snapshot and remain absent from other model contracts.
- Authing Google/email-code login and revocable GoodGood sessions, with
  owner-scoped jobs, private assets, uploads, projects and drafts. Local Compose
  uses explicitly isolated test identities/mock/RustFS, not production data.
- Up to 10 decoded JPEG/PNG/WebP references; accepted uploads are reusable from
  the owner-scoped material library. Project save/restore and continuing batches
  are durable; the root draft has 30-day expiry and stale-tab conflict handling.
- Stable `/create`, project and asset URLs, with root compatibility and
  source-preserving detail navigation. Route contracts live in `ROUTES.md`.
- One 100-credit welcome grant. Enabled Nano Banana 2 and GPT IMAGE 2 outputs
  cost 10 credits each; GPT batches of `1 / 2 / 4` therefore cost `10 / 20 / 40`.
  Nano Banana Pro has a published single-image quote of 15 credits, while its
  provider route remains unavailable. Billing uses transactional
  reserve/settle/release semantics, private credit summaries, and an owner-only
  activity view that summarizes today's, this week's, and this month's settled
  spend. Each row identifies image generation, video generation, or another
  change and uses the asset-library batch reference for traceability instead of
  repeating generation configuration or exposing raw ledger operations.
- Registration is open but creative use requires site-owner approval.
  `pending / active / suspended`, system role and product tier are distinct.
  `/admin/users` provides audited review and free test-credit grants. The site
  owner is bootstrapped deliberately, never selected by registration order.

ADR 0024 permits the owner-reviewed controlled alpha with non-sensitive test
content, direct operator contact and manual response. It does not claim the
full seed or paid gate. Its accepted deferrals remain in `docs/BACKLOG.md`:

- Customer checkout/domestic Alipay, Nano Banana Pro provider activation and further models, and
  partial-result settlement.
- Full automatic account/external-identity deletion, content reporting and
  broader moderation, provider-erasure terms, and complex monitoring.
- Search, Explore, Moodboards, collaboration, sharing, and richer cross-device
  session policy beyond existing drafts/projects are not shipped features.

The accepted CNY 10 / 500-credit payment product and fake sandbox/operator
recording infrastructure are not permission to collect payments during alpha.
Password/phone recovery is not offered because those sign-in methods are absent.
Historical implementation/verification stages are retained in `docs/history/`.

## Local candidate: managed model pricing

ADR 0063 additionally implements managed model pricing locally (GG-052):
1 CNY = 100 credits. Existing balances convert at 2 new credits per historical
credit; immutable history retains its original unit. `/admin/models` lets the
site owner add an entry using an existing adapter template, rename it,
enable/disable it, edit resolution prices in RMB and test the credit quote.
Arbitrary providers/protocols require adapter development. Images sell per
image and resolution; videos have output/reference-video-second prices.
Upstream token variation never changes an accepted customer quote. Image
pricing connects to durable submissions; video prices can be configured/tested
but the local preview has no settlement. This is not a production price change.

ADR 0064 (GG-054) extends Banana to three user-selected lines: 特价 (default),
优质 and 专线. One catalog model owns independent enabled states and 1K/2K/4K
fixed per-image prices for each line. Pro uses the three owner-specified provider
IDs; GG-056 also connects Banana 2 to the owner's confirmed special/quality/dedicated IDs.
Pro retains single-image output. Drafts/projects/results retain the choice;
accepted tasks retain their line and quote without automatic fallback or token
surcharges. Existing prices belong to special only; other lines start disabled
and unpriced. This is local implementation, not production Pro activation.

GG-056 removes catalog entries by archiving and disabling them, keeping accepted
jobs, results, projects, immutable prices and management audit intact. Archived
entries are absent from ordinary catalogs and reject new submissions. This
does not change saved Banana prices or enable flags, or add historical cleanup.

## Local candidate: direct-child credit allocation

ADR 0043 accepts a locally developed account-hierarchy capability without
claiming it is deployed. The site owner may classify an account as an
`enterprise` or `distributor`, exclusively, and bind one active direct parent.
ADR 0060 limits allocation to an active distributor, using only payment-funded
available credit to an active direct
child; a downstream business account may allocate received credit again because
the original payment provenance is retained. Welcome, test, promotion, and
operational grants cannot be allocated.

Allocation is a permanent atomic transfer, not a revocable limit. GoodGood does
not store the distributor's exchange price, CNY amount, downstream payment,
order, commission, revenue, or withdrawal. Those commercial arrangements stay
outside the product, and online payment remains deferred. The ordered
implementation phases are complete on the GG-027 local branch and the candidate
now awaits full local/Compose verification. It is not deployed; the site owner
separately decides whether a verified candidate should be released.

## Product principles

- Images first; records and parameters second.
- Fast iteration before configuration depth.
- Continuity without trapping the user in a project.
- Explicit recovery over vague toast errors.
- Preserve creative context; never make a retry re-enter known information.
- Simulated data must behave like real data: ordering, ratios, timestamps,
  states, and restored parameters must remain coherent.

## Accepted enterprise direction (implemented locally; not deployed)

GG-030 adds organization Workspaces without turning a company principal into a
GoodGood site owner. A verified user may retain a personal Workspace and join
one or more organization Workspaces as `org_owner`, `org_admin`, or
`org_member`. Company managers invite verified email identities, allocate
revocable member spending limits from one organization credit pool, inspect
organization generation consumption, and review generated company Assets.

ADR 0057 makes every identity a personal account in the main interface: no
global Workspace switcher, including site owners. ADR 0060 separates enterprise
and distributor identities: each account has one current business identity;
users needing both use two independent accounts in the short term. Allocation
lives only in distributor customers/downstream and transfer-history tabs.
Enterprise management contains overview, members/budgets, usage and team Assets,
without direct-account or transfer tabs. There is no standalone allocation navigation. Company
tabs live inside the same shell; platform role and commercial identity do not
replace organization authorization. Legacy company creative URLs and ownership
remain compatible; this navigation change does not migrate data or credit.

Enterprise identity cannot allocate personal credit. Only an active distributor
may do so. Transfers use the current personal account, never a company pool or
revocable employee budgets. Company membership roles are scoped collaboration
permissions, not a second business identity. No combined enterprise/distributor
identity or account-switching/automatic linking flow is offered.

Personal history and credit never become company data automatically. Work made
in an organization Workspace belongs to that organization and retains its
human creator; leaving the organization removes access without erasing company
history. Managers can review generated outputs, prompts, and parameter
snapshots, while reusable raw reference materials remain creator-restricted in
the first release.

This direction is distinct from GG-027's commercial `enterprise | distributor`
classification and permanent direct-child credit transfers, and independent of
whether Authing or GG-029 email OTP proves the user's email. Exact ownership,
authorization, and budget rules are fixed in ADR 0046. None of these enterprise
capabilities are part of the current production scope until implementation,
verification, and a separate release approval complete.

GG-077—GG-079 的灵感参数可见性、大厅查看/使用统计与点赞规则已随灵感板块整体下线
作废，见 [ADR 0104](decisions/0104-inspiration-feature-retirement.md)；原决策记录保留为历史。
# GG-173 · 画布成为项目

每个 `/canvas` 是可恢复的独立项目，取得稳定地址并在大厅「项目」中出现。画布名称、自由摆放及缩放的节点、连线、逐生成器提示词和参考图、视口随操作保留；网络不佳时先保存到本机，明确显示未同步，恢复连接后继续。旧创作项目的生成批次语义保留，空白画布不制造生成记录。见 [ADR 0114](decisions/0114-durable-canvas-projects.md) / [GG-173](tasks/GG-173-canvas-project-autosave.md)。

## GG-346 · 参考图自动调色（ADR0139）

图片快捷栏「对比」之后新增「调色」。打开即选中当前结果冻结输入的首张可用参考，自动匹配整体色调；用户可换实际参考/资产、查看调整前、调节强度/色温/色调/饱和度/曝光/对比度并恢复自动结果。无参考或不可匹配时可选图或仅手动，不宣称恢复AI已修改的局部材质或保证最佳效果。保存新图片保留源图和原像素尺寸，经既有上传进入画布/资产；本地计算，不调用生成Provider或新增积分收费。

## GG-363 · 多图参考共用端点

多选至少两张可用图片时，外框右侧共用端点一次连入图片生成器；成功后自动保留参考图组和一条可见线，成员原位，已有纯图片组可复用。首版来源是上传/资产拖入的图片及独立结果图片，不自动读取生成器的历史批次。参考图仍为独立输入，顺序首次按上到下/左到右固定，最多10张且整批先去重再校验；等待与失败逐张显示并阻止生成。取消/无效拖线不建组、不截断已有引用。托盘移除仅排除当前目标的一张，断线移除整组对该目标的输入；解散组保留独立引用。


## GG-370 · 独立画布批量生成（2026-10-05）

画布空白右键提供「图片批量生成」，保持普通图片生成节点与其他节点。独立节点复用现有chat提示词、模型/参数和发送；公共参考进入每个任务，1–5个候选素材组每次各取1张。候选组可通过源图片、参考图组或多选共用端点连接，池中候选数与每请求10张实际去重参考上限分离。全部组合展开笛卡尔积；顺序配对允许单图组重复使用，多图组数量须一致。默认1组，组可增减。生成前展示实际组合/总任务数、参考图序预览与总积分；冻结每组合输入，复用并发任务与独立失败重试。计费沿实际请求，不新增总任务/并发业务硬上限，既有画布文档容量约束在提交前判断。

## GG-371 · 文件夹相册与组合详情

资产侧栏已有文件夹可以整体拖入画布，形成一个相册节点。相册保存拖入时的全部图片快照（包括生成图和上传图），不受当前筛选影响；不导入视频/音频/文本，也不改变资产文件夹的原整理关系。相册内部滚动预览所有图片，点击图片沿现有查看器放大；空文件夹保留空相册并禁用连接。一次连到批量候选组端口，全部图片作为该组候选，每次选一张，实际每请求≤10图。GG-376组合预览直接显示首组实际图序的一行横向缩略图，移除查看组合按钮和分页详情，任务总数/报价仍按完整组合计算；其他任务沿相同组合规则执行。

## GG-372 · 画布资产右键移动至

画布资产素材右键提供移动至，选择现存授权文件夹即可整理，当前所属目录禁用，暂无文件夹时给出不可选提示。生成/上传图片、视频、音频与提示词模板均可移动；保留原素材、名称及标签，确认成功后只在目标位置展示，失败仍在原位置并可重试。已拖到画布的相册保持拖入时集合，不随此移动自动增减。

## GG-377 · 相册手动伸缩

文件夹相册在画布上可以从四角手动调整宽高，减少空白。缩略图按宽度重排，超出高度内部滚动，尺寸沿画布手动几何保存；不改变资产图像、快照成员、批量输入/上限与普通节点。

## GG-380 · 素材清空时移除多余组

用户显式移除候选素材或整条参考连接，导致该组没有剩余图片时，额外素材组和输入端同步移除，后续组顺次前移，至少保留1个默认入口。新增但未连接的空组保留，逐张移除仍有图片的组保持。公共参考/普通生成、已有源素材及冻结任务保持。

## GG-383 · 原始参考文件复用

同一账户/工作空间普通上传相同完整文件时复用可用素材，网络重试沿同上传记录恢复；画布多个节点可共同引用该图。匹配依完整文件字节，不依据文件名/外观；改动元数据或像素的文件自然分开。主动编辑产出仍保留独立副本。旧资产不自动合并或删除，复用素材保留原名称；明确的文件夹目的地沿现有整理行为。
