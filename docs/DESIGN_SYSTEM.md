# Design system

## GG-291 文本节点

GG-298文本生成的54×54素材缩略沿图片生成右上角18px深灰圆形X样式，hover或焦点显示，触屏常显；移除按钮与缩略预览为相邻控件，保留原预览及卡片几何。见[GG-298](tasks/GG-298-text-input-remove.md)。

GG-297在文本生成模型旁加入“预设”菜单，首项结构化反推；复用DropdownMenu和Badge。输入区标签为灰底深灰小圆角胶囊，含可访问名称和移除图标，不展示实际指令；生成期间菜单/标签锁定。预设与模型保持同一设置组，极窄宽度下发送按钮独立换行并靠右，避免挤压。见[ADR0130](decisions/0130-text-generation-presets.md)。

标题统一“图片生成 / 文本编辑 / 文本生成”。文本生成初始238×238灰卡沿图片生成几何/端点，中间换FileText；结果复用白色Markdown区、固定14px正文和尺寸柄。下方chat沿图片生成宽度/响应位置，54×54图标/图片缩略、黑灰模型品牌图标，设置只显示模型。名称上方选中快捷栏在编辑后启用；非编辑区默认光标/可拖动。减少动态效果偏好关闭光标闪动和逐字节奏。见 [ADR0127](decisions/0127-canvas-text-generation.md)。

## GG-280 画布图片裁剪

单张图片选中的快捷栏放在文件名/原始尺寸行上方，两行之间留出明确间距，工具保持屏幕字号。裁剪在完整原图上呈现灰色外侧遮罩、细三分网格和圆形四角手柄；这些可见手柄只用于裁剪，不改变普通媒体缩放柄规则。相邻面板沿用白色、细灰边、轻阴影和圆角，宽高输入用浅灰底，中间为比例锁定；预设带小比例图标和右侧像素尺寸，具体尺寸创建对应像素选区，超过原图时等比缩小到图内，通用比例取最大可容纳区域。列表内部滚动，底部取消/深色完成固定，完成及处理中图标/文字显式使用action-fg浅色前景。默认自由裁剪、比例解锁，不把自由加入通用，不显示原始比例；通用比例依次为1:1、3:4、2:3、9:16、4:3、3:2、16:9。通用后依次是小红书、抖音、淘宝、拼多多、亚马逊，再保留参考图其他社交分组但去掉LinkedIn。窄视口根据可用空间放置面板，保持图片名行可读。见 [ADR 0126](decisions/0126-canvas-image-crop.md) / [GG-286](tasks/GG-286-canvas-crop-action-color.md) / [GG-288](tasks/GG-288-canvas-crop-preset-pixels.md)。

## GG-259 / GG-262 个人信息稳定编辑

用户名旁的铅笔默认可见，阅读和编辑使用相同的响应网格（宽度最多220px、行高32px），动作占位24px，铅笔/确认/加载图标统一14px。文字保持单行、零内边距和24px行高，无可见滚动条；编辑区域透明背景，仅下划线显示状态。头像局部动作采用相同尺寸。头像和用户名规则始终保留实际换行高度，非编辑状态使用 visibility hidden 并移出可访问性树，编辑时在下方显示；标签对齐各自第一行，不随规则区高度垂直居中移动。窄屏按真实换行预留空间，保持黑白灰及原局部确认/外部取消行为。见 [GG-259](tasks/GG-259-random-user-id-stable-edit.md) / [GG-262](tasks/GG-262-profile-inline-edit-layout.md)。

## GG-253 画布资产详情与自由预览

GG-264起，中间图片视口四边贴合舞台，移除右下数量。用户澄清后，默认完整等比contain适配，放大过程中允许填满整个中间区域；完整图像位于可移动平面，超出部分仅由舞台裁切，拖动/缩放可查看，禁止拉伸。当前右侧缩略图始终垂直居中，首尾动态留空保证第一/最后一张同样居中，尺寸或前方缩略图加载变化时重新定位；保留隐藏滚动条、真实比例、间隙和减少动效。见 [GG-264](tasks/GG-264-image-detail-fill-and-centered-rail.md) / [ADR 0123](decisions/0123-canvas-media-preview-carousel.md)。

画布资产详情保持稍大的居中浮层，宽不超过 1280px/视口减 32px，高不超过 900px/92dvh；窄屏保留 8px 外边距。左侧独立信息区显示素材名和已有真实模型/参数/提示词；GG-258 非生成素材在标题下仅显示已有尺寸，不显示素材类型或缺少生成参数的说明。中央图片先完整 contain 适配，再支持平移与滚轮缩放；GG-258 移除右下角缩放/适配按钮和倍率覆盖层，键盘操作保留。右侧复用资产栏原比例图片/视频内容，透明点击容器、不套填充卡片，单列右对齐、12px 间隙、无标题及可见滚动条。当前项不降低清晰度、轻微向左抽出 10px，其余项轻淡；不靠放大/重叠改变排列。窄屏信息区移到主图下方，减少动效关闭过渡与平滑滚动。此规则取代 GG-249/251 的轮播几何及原位放大；资产页保持既有布局。见 [ADR 0123](decisions/0123-canvas-media-preview-carousel.md)。

GG-256 起，资产图面使用默认光标，查看按钮使用 grab 光标；文件夹拖入靶区采用克制灰黑填充/细内圈和打开图标，卡片保持原位。拖动源图轻淡，提交中源图轻缩、靶区呼吸/微光，成功短暂勾选，失败保留重试；减少动效取消位移/循环动画。GG-257 完成连线默认静止实线，仅连线/剪刀 hover 启用流动，减少动效始终静止。见 [ADR 0120](decisions/0120-canvas-asset-hover-video-preview.md) / [ADR 0108](decisions/0108-standalone-canvas-image-generation.md)。

## GG-246 大厅资产视频暂停提示

`/assets` 的网格与列表视频缩略图默认暂停，画面中央显示半透明白色圆底与黑色播放图标；小型列表缩略图同步收敛提示尺寸。图标不截获指针或点击，沿用既有卡片查看入口。只有实际播放时隐藏提示，加载、暂停或播放失败时保留；图片、视频真实比例与菜单/选择控件保持原布局。见 [ADR 0121](decisions/0121-asset-video-hover-preview.md)。

## GG-243 项目页新建卡片

项目网格第一项为「新建项目」卡片，复用当前浅灰外框、圆角、4:3 封面区域及 4/3/2/1 列布局，使用简洁加号与标签。整卡链接可点击和键盘聚焦，焦点反馈沿用灰色轮廓；页头原新建按钮撤下。读取中、空列表或读取失败时仍显示入口，不为新建卡片填入假封面或更新时间。见 [ADR 0119](decisions/0119-project-create-card.md)。

## GG-244 资产 hover 查看入口与视频图面

图片/视频卡右上查看入口从 28px 略缩小，桌面仅真实指针 hover 显示；键盘 focus-visible 和无 hover 设备保留入口，普通点击焦点不让按钮常驻。视频不再有图面外「视频」标签。图面与明确打开的预览参考画布视频节点：真实比例 contain、暂停时居中圆形播放按钮和左下时长，播放时覆盖层隐去。既有白底/灰黑配色与圆角保持；图片仍沿显式图片查看器。见 [ADR 0120](decisions/0120-canvas-asset-hover-video-preview.md) 和 [任务](tasks/GG-244-canvas-asset-hover.md)。

## GG-238 方形添加卡与显式图片放大

首位添加卡完整填充一个瀑布流列宽，1:1浅灰圆角，样式按局部class定位而不依赖asChild透传后变化的data-slot。图片卡右上白底圆角Maximize2入口独立于拖入/改名，常驻规则已由 GG-244 的 hover 入口取代；hover/focus不打开额外预览图。大图复用资产详情的浅灰完整图面与右侧竖排缩略图，白底轻分隔和灰黑状态，contain保留真实比例；减少动效时取消进入动画与缩略图smooth滚动。见[任务](tasks/GG-238-canvas-asset-viewer.md)。

## GG-235 画布资产瀑布流

承接 GG-233/234：一列或面板宽≥240px的两列保留，改为按真实卡片高度的紧凑瀑布流。原图片/视频比例不裁切，列间/素材下方约8px间距；加号、文件夹、上传中卡和改名/失败区都参与高度测量。沿用 #eaeaec 与 brightness(0.97)。尺寸观察仅收集，下一动画帧批量先读后写行跨度；宽度变化重测，关闭取消观察/帧。见[任务](tasks/GG-235-asset-media-masonry.md)。

## GG-232 项目卡片直接进入

GG-237项目列表按实际内容宽度展示4/3/2/1列（阈值960/720/480px），宽屏每行四个；封面4:3，间距12px，缩小整体卡片。两类项目共用局部布局，真实画布快照完整居中，旧创作封面保留原裁剪，名称单行省略。

整卡主体可点击，常态浅灰外框可见（GG-236）；鼠标悬停/键盘聚焦时真实预览缩放1.015倍、180ms过渡，外框底色保持；减少动效偏好禁缩放和过渡。footer仅名称/日期/三点菜单，移除继续创作按钮。菜单和快照重试独立于整卡入口；项目局部菜单容器/控件与重命名输入去黑边框和黑焦点环，输入以灰底提示focus，卡片入口保留灰色键盘轮廓。

## GG-226 / GG-227 项目卡片与侧栏

项目标题仅「项目」，时间为「更新于 YYYY年MM月DD日」。卡片只读按真实保存画布几何/授权媒体呈现，不显示假Frame或示例；旧创作保留真实生成图封面。操作复用shadcn DropdownMenu/Dialog，展开时名称常驻。左下角帮助/问题反馈撤下，账户保持。项目确认框局部overlay70/content71，pending禁止重复或中途关闭，保留键盘与失败重试。

GG-228画布非编辑界面不使用浏览器文字选择高亮；main禁止选字，提示词、名称、资产改名、缩放等输入与contenteditable保留原生文本选择。此保护不改变节点选框、键盘焦点或控件状态。见[任务](tasks/GG-228-canvas-native-selection.md)。

## GG-222 multi-selection arrangement

两个及以上节点选中后，选区上方显示固定屏幕像素的白底圆角工具栏。GG-229采用站长173615参考图：16px局部向量图标，低对比基准线与两根圆端短实线，自动整理为同风格实心网格；七项按自动整理、左/水平居中/右、顶/垂直居中/底排列，水平/垂直组间轻分隔。32px入口复用shadcn Button，工具栏14px/按钮8px圆角，浅灰hover/按下，命令无持久选中态；黑灰颜色、独立aria/title和清晰焦点，移动/调整尺寸时禁用。工具栏随选区坐标移动，接近视口边缘时让位以保持可访问；无多级菜单、强调色或重阴影。见[GG-229](tasks/GG-229-canvas-alignment-icons.md)。

原生多选外框覆盖节点实测主体、上方可见metadata及生成批次可见卡片；metadata星点计入轮廓，端点命中区、隐藏卡片与下方composer不计入。展开按目标卡片offset即时扩展，收起过渡短暂保留旧/新并集后缩回。只扩展外框视觉CSS，不修改媒体宽高、自然比例、节点拖动变换或原生键盘范围框。见[ADR0110补充](decisions/0110-canvas-image-selection-frame.md#gg-222-addendum--explicit-selection-arrangement-and-visible-bounds-2026-09-30)。

GG-231完成框选后的外框改为与媒体一致的1px `#3b82f6` 实线、零偏移外侧outline；共用直边与图片外侧轮廓重合，焦点状态仍显示。拖动中的临时框仅改实线，沿用原1px线宽、颜色和半透明填充。外框几何、metadata/批次范围及工具栏位置保持。见[ADR0110补充](decisions/0110-canvas-image-selection-frame.md#gg-231-addendum--solid-selection-outline-at-the-media-edge-2026-09-30)。

GG-225资产页右上搜索复用shadcn InputGroup/InputGroupAddon/InputGroupInput。输入内部无边框/焦点环，外层灰色focus-within提示；其他输入焦点保持。搜索尺寸/响应式/过滤与清空选择保持。见[任务](tasks/GG-225-asset-search.md)。

GG-224撤下无处理函数的「探索」；「资产」使用同一Lucide LibraryBig资料库标志，表达混合素材集合，名称/导航/新增提示保持。见[任务](tasks/GG-224-workspace-navigation.md)。

## GG-221 compact page delete control

页面标签的独立删除按钮外盒与12px页面文字共用尺寸变量，不再采用16px盒子；X保持12px SVG及1.6线宽，使用标准24单位viewBox的内部留白，降低悬停时的视觉重量。继续垂直居中、浅灰悬停、键盘焦点、禁用状态与二次删除确认；页面/新增图标、字体、其它入口尺寸不变。

## GG-220 PC端展开导航

展开侧栏（GG-223）在hover或键盘聚焦时不再弹出重复名称；导航常驻文字和可访问名称继续提供说明，其他位置的Tooltip按原规则。见[任务](tasks/GG-223-expanded-sidebar-hover.md)。

共享大厅在720px移动断点以上默认使用约206px宽的展开侧栏，图标与名称常驻。顶部保持最新26px G图标；首入口改用Lucide Home房屋图标与「首页」，语义为home。菜单仍用黑灰图标、白底、浅灰hover/选中与清晰键盘焦点；帮助/反馈与头像账户入口在底部展开显示。手机布局保持，已有主入口统一首页语义。不添加折叠开关，不影响独立画布。此规则取代GG-153桌面仅图标布局，见[ADR0118](decisions/0118-expanded-desktop-sidebar-home.md)。


## GG-219 canvas header scale

左上Logo为20px视觉尺寸，保留26px命中区。画布名、原位输入与页面标签统一12px/400字重/16px行高；页面/新增/删除功能图标共用12px和1.6线宽，调整SVG viewBox以贴近文字的可见高度。各入口26px高并垂直居中，保持浅灰hover/选中与键盘焦点，缩紧名称和页面间距。仅此区域调整，不缩放全局品牌或右侧积分。

GG-230将默认画布头部顶部设为7px，保持36px最小高度，单行内容中心为距顶25px，与51px资产标题栏扣除1px底边框后的中心一致。资产侧栏开关和拉伸只影响既有横向避让；980px换行及560px手机top:12px覆盖保持。见[任务](tasks/GG-230-canvas-header-asset-alignment.md)。

## GG-218 compact canvas page tabs

在原左上项目标识与名称后加入页面标签和加号，参考站长截图的紧凑工具栏：白底、灰黑图标和文字，选中浅灰圆角，hover出现小×，不增加重阴影或彩色强调。图标与文字使用统一视觉高度和固定行高、inline-flex垂直居中，避免大图标配小文字。页面1为默认，最多10页时加号禁用并说明上限；窄屏页面列可水平滚动，加号保持可访问。关闭按钮有独立命名与焦点行为、二次确认删除整页；最后一页和有活动任务/上传的页面不可删除。

页面删除确认复用shadcn AlertDialog，局部明确遮罩70/内容71，内容置于全局70层遮罩之上。390px以内白底黑字、14px圆角、浅灰遮罩；15px标题/12px说明左对齐，34px取消/确认按钮右对齐，取消浅边框、确认近黑。Radix焦点/键盘与减少动态效果偏好保持，样式不扩散至其它弹框。

## GG-214 canvas Seedream settings

Seedream 5.0 Pro 使用已有本地 ByteDance 图标，画布模型按钮转灰黑并与模型文字等高。设置仅分辨率1K/2K和宽高比，隐藏数量及摘要中的数量；自适应为居中纯文字，八个固定比例保留居中图形加文字。参数弹框按两个分辨率和无数量行计算完整向下高度。多返回复用现有首图、窄边堆叠、右下展开按钮和单行真实尺寸，不添加独立图层布局。

## GG-213 canvas automatic parameters

自适应卡片取消图标/上方空位，单行文字横纵居中；固定比例仍图形在上、文字在下。质量新节点默认自动，选择显示自动/低/中/高/超高/极高，对应auto/low/medium/high/xhigh/max；GPT2只有已文档化前四项，GPT2.5完整六项。透明背景使用已有shadcn Switch与关联label，默认关，开启transparent+PNG，关闭auto保留PNG。灰黑无彩色界面及键盘/禁用语义沿用。向下无滚动设置测量包含六项质量和32px开关行。取代GG-211默认medium和背景双选项；旧手选草稿继续保留。

## GG-211 / GG-212 canvas image settings

画布所有图片模型的数量采用现有shadcn Button/Input组合成108×32px胶囊：减号、居中纯数字、加号，默认1，整数1–12，可直接输入。边界禁用对应按钮，合法输入即时更新，空白/超界编辑在失焦或Enter规范，Esc恢复；保留键盘方向键与spinbutton语义。不增加依赖。取代GG-203离散数量按钮，摘要继续显示数字。

GPT设置增加白底灰色状态的质量与背景选项，复用ToggleGroup；质量2.5五档、GPT2三档，新节点标准画质（medium），旧auto标注「质量（自动）」；背景自动/透明背景。依然向下完整展开，测量包含新参数组，不新增滚动条。透明请求选PNG，质量与背景保留在生成器。其余画布控件、批次堆叠和单节点拖动规则保持。

GG-210：空白画布右键菜单的「图片生成器」左侧复用生成器的 12px 图片轮廓与右上角 8px 星点；图标和文字沿 shadcn 菜单行垂直居中，间距 8px，不新增图标体系或行样式。

GG-209：多图收紧时完整展示首图，最多露出两层自然平放的后图边缘，每层右偏 6–10px、下偏 4px，不随数量增加拉宽。22px 展开/收起按钮两态均固定首图内部右下角 8px，取代 GG-199 跟随批次最右的位置；展开仍按原顺序显示所有输出，间隔 12px，位移/透明度沿用短过渡与减少动态效果规则。全部输出仍在同一节点，单行元数据保持。

GG-206：补齐 GG-200 的持续悬停反馈。线上一秒后出现的居中剪刀按钮与对应单条边属于同一悬停区域，停在按钮上或回到线上保持亮蓝，离开两者恢复灰色；颜色、过渡、动画和按钮样式不变。

GG-208 / GG-205：画布图像设置参数预览始终显示当前有效数量，不带「张」，例如新节点「自适应 · 2K · 1」或多图「自适应 · 2K · 8」。GG-208 取代 GG-205 最初省略单图第三项的规则；按钮形状、尺寸、弹层和报价未改。

GG-204：画布图像设置不再限高或滚动，按可见画布（扣除资产栏）与视口适配完整布局。空间充足保留 324px 四列、76px 的竖向比例卡片；短屏可增加列数，使用 64px/58px 卡片、6px 图文间距与较紧凑的组间距，保持卡片高于宽及 20px/16px 图文槽居中，不缩小文字。紧凑态分辨率/数量标签与选项同行，数字按钮最小 44×32px。沿用白底灰字、选中描边和向下弹出，必要时画布视角让位。此条取代 GG-194 的固定四列/高度及旧窄屏滚动。

GG-203：画布图像设置的「生成数量」按钮只显示数字，去掉「张」。两款 Nano 显示 `1 / 2 / 4 / 8`；GPT 保留 `1 / 2 / 4`。沿用 60px 最小宽度、32px 高度、胶囊圆角和 8px 间距，四个选项在原面板中容纳；默认仍为 1。多图沿用 GG-199 的单节点显式展开，不新增单张元数据。

GG-200：参考图连线默认保持 `#a1a1aa` 中性灰，指针进入 React Flow 既有宽命中区时，仅可见曲线以 `#1687ff` 亮蓝点亮，离开后恢复灰色。颜色过渡 120ms，减少动态效果时即时切换；虚线流动、曲线、剪刀按钮和拖拽预览不变。该亮蓝 hover 是无彩色画布的定向交互例外。

GG-199：多图生成器使用 22px 白底细边圆形按钮，右向双箭头展开、左向双箭头收起；展开后同一节点内向右排开，间隔 12px，减少动态效果时无过渡。悬停、聚焦与点击图片不改变首图，不旋转，只显示一行元数据。收紧边缘及按钮位置由 GG-209 更新；GG-198 自动换首图视觉已被取代。

GG-198：一次多图生成的全部输出属于一个图片生成器节点。首图位于原节点位置，后图保持自然方向，以约 18–26px 的小步长向右错位；不旋转、不抬升，每层只用浅阴影说明边缘。整批只显示生成器的一行类型名称和当前首图尺寸，后层图不重复资产名或尺寸。悬停、键盘聚焦或点击可见后图时，它和首图交换槽位，使用约 220ms 的短位移动效；减少动态效果时立即换位。节点的蓝色悬停/选中细框仍贴合首图圆角。GG-197 的独立余图节点和扇形旋转方案已被取代。

GG-196：图片生成器在排队、生成和精修时隐藏选中外轮廓，让灰底扫光直接贴合卡片圆角；未生成、成功出图和失败状态保留现有选中/悬停轮廓。生成中仍可选中并使用下方输入框及连线。

GG-195：画布宽高比竖向卡片的图形和文字各占稳定的 20px/16px 行，两行连同 8px 间距在 76px 卡片内垂直居中。自适应图标及不同高宽比的比例轮廓都在图形槽中居中，文字基线保持一致；四列宽度与交互状态沿用 GG-194。

GG-194：画布图像设置中的宽高比选项保持四列、上方比例符号和下方文字；单项高度 76px，高于常规约 67px 的宽度，图文间距 8px。自适应及各固定比例使用相同竖向卡片，选中描边、悬停底色和键盘焦点沿用原样。

GG-192：画布生成器提示词下方的图像设置摘要、模型选择入口和生图积分按钮共用胶囊圆角。前两者的透明、悬停、展开及焦点轮廓保持同形；只统一几何，不改各自的高度、宽度、背景色或窄屏位置。沿用现有 shadcn Button/SelectTrigger，不改变公共组件。

GG-191：画布新图片生成器两款 Nano 默认自适应与 2K；摘要初始隐藏数量 1 的规则已由 GG-208 更新为「自适应 · 2K · 1」。尚未手动选择分辨率时，切到 GPT 显示其既有 1K 默认，切回 Nano 显示 2K。用户明确选择后保留选择；旧节点与复制节点不重置。GG-189 的比例与向下弹层样式不变。

GG-190：画布中的本地图片、额外生成结果图片及视频预览与图片生成器共用 `min(8px, 4%)` 圆角；媒体由节点边界裁切，1px 蓝色悬停/选中轮廓贴边。圆角随小尺寸节点收敛，四角透明缩放命中区和媒体原比例不变。GG-136 的普通图片直角设计已由 [ADR 0110 补充](decisions/0110-canvas-image-selection-frame.md#gg-190-addendum--shared-canvas-media-corners-2026-09-29) 取代。

GG-189：画布图片设置入口的宽高比摘要对两款 Nano 新生成器显示「自适应」，比例选项有同名图标位，数量提供 1/2/4 张。白色设置面板从工具栏向下展开，不自动翻到上方；靠近底部时视角为面板留空。抽象为未来图片/视频生成器共用的向下弹层组件。普通图片、视频和生成器仍由 React Flow 节点显式宽高控制，媒体保持原比例；shadcn/ui AspectRatio 已在仓库可用，但此处不叠加其 padding 高度。下文「向上展开」为 GG-189 前旧设计。

GG-188：图片生成器进行中采用浅灰底上的单条柔和扫光，参考 CodeFronts Dark Mode Skeleton 的移动渐变机制，但按白色画布使用无彩色浅色配色；仅生成器排队、运行和精修时循环。减少动态效果时保留静态灰底。生成器卡片与成功图片共用最大 8px 的随尺寸收敛圆角，图片裁切与悬停/选中细描边贴合。GG-188 当时普通画布图片仍为直角，后由 GG-190 同步圆角。此条取代下文 GG-182/GG-185 的「无圆角、柔和反光、不做扫光线」历史视觉记录。

GG-181 修正生成器下方白色 chat 的浅色直角残影：React Flow 工具栏滚动外壳与输入卡片使用同一圆角，浅阴影由外壳绘制，桌面 22px、窄屏 17px；卡片边框和内容布局不变。

GG-182/GG-185：图片生成器仍为浅灰色占位卡，左上角类型标签加稳定序号。明确提交后，排队、生成和精修状态隐藏中央占位图标，在原节点显示柔和的无彩色反光；灰底稍加深，大片柔光缓慢改变亮度和位置，不做进度条。减少动态效果时反光静止。成功后图片填入原卡，失败时在卡内用简短白底提示说明；多图成功后的当前规则见 GG-198。上传图片仍使用自己的遮罩与呼吸光。
GG-187：生成器成功出图后，在上沿右侧按普通图片节点的灰色小字显示首张图的原始像素宽×高。没有有效解码尺寸时不显示占位数字；宽度不足时先省略左侧名称，极窄时沿用图片节点的只留类型图标规则。

## GG-177 画布快捷键入口

左下角控制列在地图图标旁加入同为 32px 点击区的细线键盘图标；默认灰色，悬停或展开时仅有浅灰底。向上打开紧凑白底快捷键列表，黑字与灰色键位分列，点击外部关闭。空白处右键菜单只保留画布动作，避免重复入口。

## GG-167 画布图片生成器节点

纯白画布初始不悬浮 chat。右键新建的图片生成器是无圆角浅灰方形占位卡，中央只有低对比度细线图像符号；没有示例画面或默认文案。GG-180 在卡片上沿左侧增加与图片节点元数据行对齐的灰色小标签：图片图标右上角有小星点，旁边显示「图片生成器」，宽度不足时单行省略；卡片主体仍只有中央占位图标。GG-172 将初始 124×124px 改为与方形图片相同的桌面 238×238px 上限，窄屏复用图片节点的视口比例限制；符号保持克制。选中后，现有白色输入区通过 React Flow NodeToolbar 贴在卡片下方约 12px，界面尺度不跟随画布缩放；靠近视口边界时在可见区域内收紧宽度，底部空间不足时轻微移动视角。悬停只略调灰色，选中用细灰轮廓。GG-178 起，图片与生成器的连接点显示为约 10px 的深灰实心圆点，带细白边和灰色外缘；26px 透明命中区与圆点同心，悬停及有效连接时仅出现轻灰外晕，拖线时所有生成器输入端显现。GG-179 将圆点圆心移到节点边框外约 11px，圆点与边框留有可见间隙；外层浅灰光晕在端点可见时缓慢呼吸，圆点本体和连线锚点不动，减少动态效果时静止。GG-167 的 9px 灰白点是历史值。GG-170 将完成连线和拖拽预览统一为低曲率贝塞尔曲线（曲率 0.18，`#a1a1aa`，1.2px）；GG-257 取代 GG-171 的默认持续流动：完成线条默认静止实线，仅连线/剪刀 hover 时流动，减少动态效果偏好下始终静止，拖拽预览保持原细曲线。GG-200 起，完成线条仅在悬停时改为 `#1687ff` 亮蓝，默认与拖线预览继续为灰色。悬停连线 1 秒后，白底灰色小型圆形剪刀按钮的正中心位于曲线上，沿曲线跟随鼠标最近位置。参考图托盘里，连入图片沿用 GG-165 缩略图、序号、删除与等待/失败状态；删除连入缩略图等同断线。

GG-125/GG-141 的页面底部固定输入区位置是历史布局；提示词、模型、设置及 GG-166 展开控件的内部样式不变。

## GG-166 画布提示词展开控件

画布输入框默认自动增长到 188px，内容继续增加而出现内部滚动条时，滚动条右侧显示轻量斜箭头展开按钮；未溢出时控件不可见。展开后输入区按文字内容向上增长，并受视口高度限制，按钮变为浅灰圆底的收起图标。输入框和按钮均为白灰黑配色，按钮有键盘焦点；工具栏始终位于提示词下方，参考图托盘在上方，画布本身不缩放。为按钮始终留出紧凑空间，避免按钮出现时文字意外换行。GG-174 将输入区到工具栏的额外下边距收紧为 2px（桌面与窄屏一致），使参考图到首行、末行到工具栏的视觉间隔接近；文字仍有底部内边距。GG-166 的桌面 18px / 窄屏 14px 外间距是历史值。仅此输入框的原生滚动条上下箭头隐藏。滚动轨道的起点、终点与文字区域的上、下内边距一致，展开图标与首行居中对齐，窄屏沿用相应缩小的间距。可见滑块仅在内容可滚动且鼠标悬停提示词区域时显示，移开后短暂淡出；降低动画偏好下直接隐藏。

## GG-161 画布真实上传状态

电脑拖入 JPEG/PNG/MP4 后，节点保持清晰预览，沿用 GG-160 的轻暗遮罩和原位玻璃呼吸光；动画在真实上传期间持续循环，减少动态效果时保持静态，不按三秒强行结束。上传失败时在节点下沿以紧凑灰白提示和「重试」操作说明原因；成功后撤下光效并呈现原有蓝色选中细框。无需新增全局弹框、环形进度或上传文字。既有资产拖入和生成结果不显示上传状态。GG-160 约三秒的旧视觉时长已被本任务取代。

## GG-162 画布资产小图密度

GG-234 将 GG-233 卡片的既有悬停外观设为常态：加号与文件夹卡默认填充为 #eaeaec，素材图面默认 brightness(0.97)，鼠标进出不再切换这两项外观。按下的 #e4e4e7、灰色焦点和禁用反馈继续有效，较大预览仍仅由 hover/聚焦触发。见[任务](tasks/GG-234-canvas-asset-card-default-hover.md)。

GG-233 已取代本节与 GG-155 的文件名列表样式：资产集合首位为浅灰圆角「+」方卡，文件夹为 1:1 圆角卡并保留小号可截断名称；图片卡完整展示原宽高比，无常驻图片名，只有改名时显示输入。面板以自身宽度自适应一列/两列，至少 240px 时两列（默认 248px 已为两列），卡间距 8px，图片无额外套框；视频和音频保留类型区分。添加菜单与链接输入浮层为白底轻灰边、浅灰悬停和灰黑焦点，复用现有 Radix 浮层以避开滚动裁切。原缩略图预览、拖入画布和双击/F2 改名继续有效。见[任务](tasks/GG-233-canvas-asset-cards-and-add.md)。

画布左侧资产列表的素材缩略图改为 28×28px 正方形，图片与视频在小图内以原画面中心裁剪；类型占位图标同步缩小。保留 34px 文件夹图标、约 49px 行高，并在小图两侧留等量空间，让素材名与文件夹名仍从同一列开始。小图悬停/聚焦时的较大完整预览保持原尺寸与原比例。GG-155 的 34px 素材小图为历史尺寸。

## GG-160 画布本地图片放入预览

本地图片刚放入画布时，保持图片清晰，在其上叠不拦截指针的轻暗遮罩和覆盖大部分画面的柔和径向玻璃光晕；光晕原位明暗呼吸，明暗差稍明显但不泛白、不横扫，约 3 秒后移除。不覆盖「上传中」文字、圆环、弹框或进度条。完成后沿用既有图片选中框与缩放控件。减少动态效果时只保留静态轻暗遮罩直到计时结束。已上传资产与生成结果不套用此视觉状态。

## GG-155 画布资产行与音频节点

资产侧栏缩略图与文件夹图标统一为 34×34px，列表行约 49px 高；图片和视频在方形缩略图内居中裁剪，文件名独立占据剩余宽度并用省略号收尾。完整预览仅由缩略图悬停或聚焦触发，继续保留白底浅灰边的轻浮层。双击文件名后同位出现紧凑输入框，错误文字只在失败时显示。拖入的音频节点使用白底细边、小号类型图标与文件名、原生音频控制条；不增加彩色面板或常驻工具栏。GG-151 的 40px 缩略图和整行预览规则由此取代。

## GG-153 大厅图标导航栏

共享大厅在 720px 以上统一使用 56px 宽的左侧图标栏，不再按大屏和中屏分别使用带文字的宽栏。顶端复用独立画布的 26px 黑底白色抽象 G 图标；其下各入口使用 40px 正方点击区和原灰阶 Lucide 图标，选中时为浅灰填充，悬停只用轻灰底。图标旁不常驻名称或新增资产数字；悬停和键盘聚焦时在右侧显示中文短提示，按钮始终保留可访问名称与清晰焦点。账户头像保持栏底入口。720px 及以下沿用原移动端头部、字标和导航。见 [ADR 0111](decisions/0111-workspace-icon-rail.md)。

## GG-151 画布资产列表

左下角入口与地图、百分比同列，只用 16px 资料库图标，不附文字；32px 点击区悬停为浅灰底。打开后白底侧栏从页面最左侧默认覆盖画布最多 248px，以一条浅灰细线分隔，不加悬浮阴影；右缘 10px 命中区悬停仅变为横向缩放光标，不出现深色边框或额外描边，键盘聚焦时用淡灰底提示位置。拖动时侧栏和画布控件实时跟手，宽度最多 400px，同时保留至少 280px 可见画布。标题与滚动列表分开。React Flow 画布始终铺满视口，已有图片节点不会因为侧栏拉伸而改变坐标或尺寸；顶部标题、底部输入区、左下角地图和缩放入口向右让位。文件夹和素材行使用紧凑统一的高度，40px 方形缩略图居中裁剪，文件名及文件夹名超出可用宽度时单行省略，完整名称仍可通过悬停标题查看；完整图片预览按原比例置于无箭头的白色小浮层，尺寸明显大于缩略图但不盖满画布。视频预览保持静音，音频只呈现类型图标；窄屏按视口比例收窄侧栏和小地图，560px 及以下不显示拉伸命中区。

## GG-150 画布名称编辑

26px G 图标右侧以短间距显示同高的单行「未命名画布」，13px 中等字重、深灰文字，长名省略。默认无框；悬停或键盘聚焦时名称区出现浅灰圆角底，鼠标为文本编辑光标，不显示铅笔。点击后输入框维持原位、同高，宽度随当前文字变化，编辑时没有外侧黑色焦点边框，以浅灰底和插入光标区分状态；名称最多 20 字。窄屏缩短名称区，右侧积分保持原位。画布名称是临时页面状态，不以保存图标或持久化文案暗示已有画布文档。

## GG-149 画布左上角入口

独立画布左上角展示 26×26 的黑色圆形项目图标。内部由三片分离的白色光圈式几何形构成，彼此之间的留白共同暗示 G；不画完整字母，也不添加纸张折面等细节。小尺寸下优先保持清晰的整体剪影。悬停只轻微降低不透明度；键盘焦点有可见细轮廓。点击后在图标下方展开白底、浅灰边框的紧凑菜单，唯一选项为「主页」。GG-150 起图标旁显示可编辑的临时画布名称；GG-149 首版仅有图标的布局成为历史。右侧积分保持原位，不加新导航工具。

## GG-148 画布地图与百分比入口

左下角在缩放入口上方显示约 200×132 的白色小地图，浅灰节点和 1.5px 中灰矩形轮廓标出当前视口，矩形外轻微淡化，不呈现图片内容、网格或额外装饰。地图可拖动区域悬停显示抓手，按住拖动时显示握紧抓手。百分比左侧只有一个低调的地图开关，展开时使用浅灰底；百分比按钮缩为 12px 中等字重灰色数字，不再有右侧下拉箭头，点击仍打开白底缩放菜单。地图与缩放入口在窄屏同时上移，避开底部输入区。画布背景继续纯白。

## GG-147 画布参考图缩略图

输入区提示词上方的参考图沿用独立横向托盘。GG-165 起缩略图与添加入口均为 54×68px、15px 圆角；缩略图居中裁剪，左上角用 18px 深色半透明圆标标出从 1 开始的顺序；右上角删除标同为 18px 圆形，两者距圆角内侧均为 5px。鼠标悬停或键盘聚焦小图时，正上方用无箭头的白底轻描边浮层完整容纳原图，预览最大约 148×192；预览底边中心与小图顶边中心对齐，间距 8px，不让托盘的横向滚动裁掉预览。点击小图不出现黑色外框，键盘聚焦保留浅灰细线。删除在小图右上角悬停、聚焦或触屏时出现。托盘零张时也显示浅灰「参考图」入口卡片，内有细线图像图标和小字；已有小图时跟在其后，十张满额隐藏。底部不再保留文字上传入口。上传中复用画布图片节点的轻暗遮罩与呼吸光，成功后恢复清晰缩略图；失败重试按原位显示，颜色仍遵守黑白灰界面。

## GG-146 画布视频节点

本地 MP4 沿用图片节点直角、轻阴影、悬停与选中细框、四角等比缩放。视频元数据就绪后，节点按原始比例容纳完整画面，选中框贴合视频，不保留横向占位框。上沿以小型实心播放三角形代表视频，文件名与图片一样在左侧截断/展开，右侧只显示原始像素宽高；继续缩窄时收起名称和尺寸，图标始终可见。GG-183 起不显示 FPS。静止视频以原始比例展示封面，中间是低调的深色圆形播放按钮，左下角有时长小标；实际播放时两者消失，不叠加播放器工具栏。画布其余区域保持白色和灰阶。

## GG-145 画布图片元数据

本地与生成图片的左上沿显示小型图片图标与文件名，右上沿显示原始像素宽高。使用灰阶小字、无背景面板，置于图片之外，不遮挡图像或改变直角轮廓。元数据始终单行；文件名随节点宽度截断为省略号，变宽后自然展开。窄节点先隐藏文件名，极窄节点再隐藏尺寸，但始终保留图片类型图标。尺寸数字保持原始像素值，不使用当前节点 CSS 尺寸或画布缩放值。

## GG-141 画布 AI 输入区

底部保留白色、轻描边的紧凑输入框，参考图托盘独立位于提示词上方，底部工具保留图像设置、模型与生成。图像设置从摘要入口向上展开白色浮层，分辨率与数量用短选项，宽高比用小比例轮廓网格；仅展示当前模型可用值。GG-143 起生成按钮以近黑底仅显示等大的闪电图标与当前积分报价，原方向箭头和分隔线已撤下；无报价禁用显示横杠，提交中图标位置显示载入。窄屏工具分两行，避免压缩模型名或误触。无渐变背景、额外装饰或假示例。

GG-142 在模型 Select 列表名称前使用 Lobe 的单色 `NanoBanana` / `OpenAI` 图形；GG-169 改为从 `public/model-icons/nanobanana.svg` 和 `openai.svg` 读取本地静态文件，保持 16px 尺寸。按稳定模型 ID 对应，不从展示名称推断品牌。图标维持菜单灰阶和文本对齐，辅助辨认但不替代模型名称。列表宽度由内容和选中符号撑开，窄屏仅按视口限宽。

GG-144 画布模型菜单按 Pro、Banana 2、Sunburst、Flare、Image 2 的顺序展示；三个 GPT 名称为 `GPT Image 2.5 Sunburst`、`GPT Image 2.5 Flare`、`GPT Image 2`。仅排序可用项，不以此更改默认模型或其他页面。

## GG-140 画布顶部

画布顶部右侧仅保留「闪电＋数字」积分余额按钮。悬停有轻灰底、键盘焦点有细轮廓；点击打开与大厅相同的账户管理/积分明细弹框，关闭后画布内容原位保留。原「添加图片」「适应画布」按钮已撤下；用户把本地图片拖入画布，或在输入区另选生成参考图。视口拟合留在左下角缩放菜单中，避免顶部重复操作。

## GG-139 积分图标

积分在全局使用同一实心闪电图标，采用现有黑灰界面色，以细轮廓控制视觉重量。画布与移动端右上角余额简写为「闪电＋数字」，图标按相邻数字的 `1em` 大小缩放，保留可访问名称中的积分含义；账户菜单、导航和流水可保留中文标签。平台币继续使用硬币图标，避免两种余额混淆。

## GG-138 画布缩放菜单

纯白画布左下角保留安静的当前百分比入口；向上展开紧凑白色菜单，使用黑字、浅灰描边及浅灰悬停，顶部可输入 10%–800%，下面依次为放大、缩小、适合屏幕、50% 和 100% 快捷项。不展示 800% 快捷项。默认 100%，点击菜单外关闭；窄屏时控件上移，避开底部创作输入区。图片初始尺寸在桌面以 238×320 CSS 像素为上限，窄屏按视口宽高进一步收紧，保持首屏占比与原图比例。

## GG-130 画布图片选中框

本地与生成图片的主体在悬停和拖动时使用系统默认箭头。GG-137 起悬停和选中均显示紧贴图片的一像素亮蓝色 `#3b82f6` 轮廓，不再以灰色遮罩压暗图片；悬停本身不触发选中或缩放控件。GG-190 起图片及视频与生成器共用随尺寸收敛的圆角，媒体裁切与亮蓝轮廓贴合；GG-136 直角及 GG-133 早期动态圆角为历史实现。四角仅保留靠近角点的小型椭圆透明缩放命中区，不显示方块或圆弧；旁边直边保持默认箭头，角点命中区显示对应的对角缩放指针，并按原始比例调整尺寸。蓝色仅用于画布媒体轮廓，是 [ADR 0110](decisions/0110-canvas-image-selection-frame.md) 对灰阶界面的局部例外；GG-129 的指针与单点样式为历史实现。

## GG-129 画布图片缩放

本地图片与已生成图片悬停和拖动时使用“移动”指针，保留 GG-128 的轻灰遮罩。选中且图片加载完成后，卡片右下角显示一个近黑色小缩放点；拖动时保持图片原始比例，缩放点使用对角缩放指针。图片上的旧操作按钮不恢复，节点尺寸只存在本页画布中。缩放控制采用已安装的 React Flow `NodeResizeControl`。

## GG-128 画布图片悬停

GG-128 时本地图片和生成结果图片在画布上悬停只出现极浅灰阶遮罩，不显示图片上的操作按钮、标题或菜单；GG-137 后悬停改为细蓝亮边框，仍不显示图上操作。节点仍可拖动、选中；生成结果保留点击进入资产详情，失败节点保留重试。输入区参考图选择独立存在。GG-128 按 [ADR 0109](decisions/0109-quiet-canvas-image-hover.md) 取代 GG-126 的节点操作覆盖层。

## GG-126 画布图片节点（历史实现）

本地图片节点只用原比例图片、浅边框和轻阴影，不常驻标题或额外面板。最初的查看、参考和移除覆盖层已由 GG-128 移除。拖入过程中仅出现轻灰虚线落点提示，平时仍是纯白画布。GG-126 的顶部文件选择与适应视野按钮已由 GG-140 撤下；不增加网格、装饰或彩色状态。

## GG-125 独立画布

画布承接现有白色、无彩色工作区，使用全屏纯白 React Flow 平面，不绘制网格、示例节点或引导卡。GG-125 初版将紧凑图片生成输入区固定在底部；GG-167 改为只在选择生成器节点后贴在节点下方。参考图托盘在提示词上方，基本规格排在输入区下方。结果节点承载真实进度、图片或失败恢复，保持图片原比例并允许移动；原右下角固定级别选择器已由 GG-138 左下角缩放菜单替代。不显示默认角标。

## GG-123 component adoption

`components/ui` is the shared shadcn layer for controls, labels, inputs, dialogs
and selection semantics. Feature components own GoodGood-specific visual layout,
private media and generation behavior. Reuse the existing primitives before
writing a second control. Image and video creation share a single prompt field
that keeps the established eight-line growth limit. Asset selection uses the
shared checkbox with an indeterminate select-all state, while its hover
placement and floating actions keep the current asset layout. The pinned AI
Elements CLI is available through `npm run ui:ai:add -- <component-name>`;
install each component when its data and interaction model matches a real
GoodGood surface. It does not redefine the generation or private-asset API.
Image and video parameter choices share a controlled shadcn ToggleGroup while
keeping their established selected and disabled styles. Asset selection actions
use the shared Button primitive with the existing destructive visual treatment.
Profile editing, project saving, model line switches and operations filters use
the shared Input, Label, Button, Checkbox and Select primitives. Hidden native
file pickers and media-specific controls keep their feature behavior.

## GG-122 standalone Hero preview

The isolated `/hero` preview uses the supplied centered title, copy, two calls
to action and three-image fan. It inherits GoodGood's white, achromatic
tokens and wordmark. The supplied image URLs are preview material, not claims
of GoodGood-generated work. The demo's unverified social-proof count is absent.
Subtle entry motion respects reduced-motion settings; the page does not alter
the creation workspace's quiet empty state or its navigation.

## GG-121 asset browser

`资产` uses the existing bright, achromatic workspace. A compact title sits
beside source icons (`已上传`, `已生成`), grid/list controls, search and a near-black
`新建` menu. Media categories are text-only quiet pills without counts. Folder
tiles have centered line icons in near-square white surfaces, with name and
item count below. Hover/focus reveals a top-right menu and bottom-right
selection circle on folder tiles, matching file cards. Selected folders use the
same dark floating bar with count, red Delete and close; file-only Download and
Move stay hidden. The `项目` section contains asset files, not saved creative
projects. In grid mode images preserve their aspect ratios in close masonry
columns. On wide screens, the six columns span the full asset content width
through the right edge below `新建`; narrower screens reduce the column count.
Videos keep their native
ratio, hide the grid caption, and preview muted/looping while visible unless
reduced motion is requested. Hover/focus adds a faint neutral veil to folder
covers and file previews, then reveals a top-right menu and bottom-right empty
selection circle. The check appears only after selection. An open menu keeps its
trigger and veil visible; Move submenus use the same soft border and shadow as
their parent. Folder covers, media previews and their names keep the default
arrow cursor on hover; menu and selection controls keep their action cursor.
List mode puts folders and files into one quiet table, with a narrow
selection gutter outside the rows, compact icons/thumbnails, name, date and
size. The `名称` heading and icon/thumb column align with the first media
category above, while date and size align with their values. Rows gain a shallow
gray fill on hover/selection; a More trigger sits
at the far right of a hovered/focused row. Selection is
visible in a restrained near-black floating toolbar with count, Download, Move,
Delete, and close. Delete alone uses a red fill with white icon and text by the
operator's explicit ADR 0107 exception; the rest remains achromatic.
Keep keyboard and touch controls reachable and source icon labels in Chinese
tooltips. The four supplied ChatGPT screenshots are layout references, not a
source of blue/yellow accent colors or document-file support.
`新建文件夹` opens a centered, compact in-page dialog with a dim overlay, one
labelled name field and quiet `取消 / 创建` actions. The input focus ring stays
achromatic; the Create action remains disabled for an empty name.
Rename uses that same dialog with the current name prefilled and selected, and
`取消 / 保存` actions.
Inside a folder, the heading becomes a quiet root breadcrumb plus the active
folder name. Media tabs disappear, search copy becomes folder-specific, and a
wide dashed upload target fills the empty state. List mode keeps its column
headings before that target. A small bottom-right upload tray shows actual
pending, completed and failed states with counts; it does not imply a measured
percentage that the API cannot provide. An opened folder uses a compact
six-column image grid on wide screens, reflowing at narrower widths.
The upper-right `新建 → 上传文件` entry opens the native file picker directly;
the same bottom-right tray reports uploads from both the root and folders. Do
not show an intermediate upload dialog or save button.

## GG-115 asset workspace

Historical GG-115 styling used two quiet tabs (`生成记录`, `个人资产库`). History
has compact media pills with counts, dates, and image cards. Library folders
are simple white cards; media cards use private thumbnails, restrained metadata,
and small organize actions. The upload dialog reuses the site's accessible
dialog primitive, exposes supported formats/20 MB limit, and shows per-file
states. Generated outputs are listed automatically. The earlier batch/gallery
asset styling below is historical for this local iteration.

GG-091账户入口默认/悬停/展开/焦点均无状态外框，键盘焦点复用浅色背景；菜单关闭后返回焦点不产生红色描边。

GG-091邮箱模式只有邮箱、验证码/发送、邀请码（新用户填写）、确认，标题“登录”；无模式切换、成功发信说明或修改邮箱按钮。邮箱发送后及发送期间可编辑，更改地址清挑战/码；错误就地简短显示。本人账户菜单积分下方展示六位邀请码，使用普通文本行，无点击/悬停填充或复制按钮，手机菜单同序；站长账户列表积分下方也显示各账户码。

GG-090邮箱表单保持原有克制布局，登录/邀请码注册以按钮切换；注册增一邀请码输入，验证失败保留内容。旧未开通账户提供邀请码开通按钮；邀请码管理复用账户工具栏及Dialog，单次明文可复制、列表仅末6位提示/状态，窄屏自然换行。

GG-089站长功能栏按运营看板 → 账户管理 → 总日志 → 企业管理 → 模型管理 → 用户反馈 → 平台币 → 审计日志排列；共享桌面/手机顺序。用户反馈仍指向/admin/feedback，个人侧栏仍为问题反馈，默认入口运营看板。

GG-088问题类型菜单固定从按钮下方展开（首次及切换选项后均如此），保留Radix键盘/焦点与可滚动菜单。

GG-087反馈沿用侧栏普通MessageSquare图标与站长功能栏；安静标题、白色圆角反馈列表、右侧640px Sheet（手机全宽），字段复用Select/Textarea/Button。上传88px方形缩略图并带可访问移除，5张时禁用添加；原图复用Dialog，状态/时间/回复使用中性层级，不加重阴影。

GG-086站长批次卡片在已发/剩余下方增加Palace Red细进度条和百分比，复用Radix/Shadcn Progress、期号aria-label/value文本；减少动画时禁用过渡，手机保持全卡宽度。用户个人页不展示发行进度。

GG-084沿用轻量个人工作区与站长功能栏，Palace Red突出自己的币与奖励；三项统计、简洁时间流水，未加币价或发行进度营销。手机入口使用既有Radix账户菜单，保持顶部工具位置；站长窄屏总量独占一行，另两项并排，发行批次采用独立白色圆角卡片、轻边框无阴影；期号/状态在顶部，额度突出，已发/剩余并排，规则及操作在卡片内。卡片网格自适应，手机单列，数字不截断（GG-085）。开启确认复用Dialog与既有Button，加载/错误用status/alert，刷新有明确aria-label。功能样式限定features/jcoin/jcoin.css。

GG-081继续使用同一admin-action-dialog及Radix Select/Checkbox：积分类型有显式label，默认测试，充值动态展开凭证与收款确认；不增加独立支付页。看板延续operations-metrics/可横向滚动日表，趋势按钮支持键盘及aria-pressed。现金带¥，峰值缺失显示暂无统计及—，排队与当前并发分开。

GG-117 removed the inspiration surface entirely, so its visual entries no longer
apply: the shared LayoutGrid navigation icon and image-detail publication control,
the quiet board heading/search and 720px case Sheet, the case editor shell, the
hover preview seam, and the centered detail images are all gone with the feature.
See [ADR 0104](decisions/0104-inspiration-feature-retirement.md). The
canvas/soft/ink/muted/line/Palace Red tokens those views reused are shared and
stay in use.

GG-072 uses a quiet profile identity row (circular centered avatar, name, muted
@handle, one edit button) above responsive image works preserving their ratios.
An accessible 480px right Sheet edits identity; mobile uses full width. Reuse
canvas/soft/ink/muted/line/Palace Red tokens and existing private image rendering.

GG-071 adds quiet responsive KPI cards, selectable Palace Red daily bars and
compact table rows in the existing owner shell. Logs have task/ledger buttons,
wrapping labelled search/date/filter controls and a right 640px detail Sheet
(mobile full width/internal scroll). Wide tables scroll within their area, never
expand the page. Existing single page title and wrapping management links remain.

GG-070 supersedes the pricing-row layouts below with compact responsive model
cards. Each card shows name/status, default-line price range and specs/line count;
video reference rates remain separate. A same-page right Sheet holds full pricing
controls, with internal content scrolling and a fixed save footer. Desktop width
is 760px, mobile full width; minimal borders and no panel shadow. Repeated pricing
and route explanations are removed; necessary units and discount rules remain.

GG-069 pricing dialogs add a compact overall-discount input, percent unit and
apply button after route controls. Quiet helper copy defines 98/80/100 and
non-compounding behavior; inline feedback stays beside the control. No new
list columns or navigation; responsive controls wrap with visible labels.

## Visual thesis

GG-068 adds two aligned standard/backup video price rows per model, each with a
quiet route label. Video groups omit the requested billing subtitle and use
元/百万token below specifications. The editor uses the existing compact route
buttons rather than duplicating its form; adaptive page width remains intact.

GG-067 video rows show two compact mutually exclusive rate rows (无参考视频 /
含参考视频), with an explicit 人民币/百万 tokens unit. The editor aligns supported
resolutions and both rates; calculation and optional JSON parsing share one
quiet surface. Adaptive width stays unchanged.

GoodGood is a bright, premium visual workspace: continuous white space, quiet
interface chrome, compact rounded controls, and vivid imagery. The interface
itself is achromatic — black type and icons over white and light gray — so the
generated images are the only saturated thing on the page. See
[ADR 0105](decisions/0105-achromatic-interface-palette.md); Palace Red is no
longer a token or a current visual rule, and entries below that still name it
describe historical builds.

GG-054/GG-062 Banana and GPT line choice reuses the compact rounded segmented controls beneath
the model selector. Selection uses the near-black action fill; unavailable choices retain native
disabled and accessible pressed states. The pricing list keeps one model name
with three compact aligned line rows and RMB/credit units. Desktop shares the
resolution header; narrow screens repeat it once per model, not per line. The
editor switches line inputs without duplicating the full model form or exposing
provider IDs. Line enable/availability stays explicit.

GG-065 supersedes GG-064: quality-priced lines show ranges in the list; tier
details live only in the pricing editor. GG-066 restores adaptive embedded page
width and the original standalone 1500px maximum, retaining the 200px desktop model-name column and compact aligned price/action
columns. Narrow screens retain the stacked model/price layout and resolution labels.

## Foundations

Canonical CSS tokens currently live in `app/globals.css`.

| Token | Value | Role |
| --- | --- | --- |
| `--canvas` | `#ffffff` | Main application canvas |
| `--white` | `#ffffff` | Active surfaces and segmented controls |
| `--ink` | `#111111` | Primary text, icons, and active state |
| `--muted` | `#52525b` | Secondary copy |
| `--quiet` | `#6b6b76` | Metadata and helper copy |
| `--line` | `#e6e6e9` | Necessary structural edge only |
| `--soft` | `#f0f0f2` | Hover and neutral control fill |
| `--fill-hover` | `#ececef` | Pointer hover on interactive surfaces |
| `--fill-selected` | `#f0f0f2` | Selected / current-navigation surface |
| `--fill-active` | `#e6e6ea` | Pressed and open state fill |
| `--action` | `#1a1a1a` | Primary action fill |
| `--action-hover` | `#000000` | Primary action hover and pressed |
| `--action-fg` | `#ffffff` | Text and icons on the action fill |
| `--focus` | `#111111` | Focus ring, against white and gray fills |
| `--danger` | `#111111` | Error / destructive emphasis |
| `--danger-surface` | `#f0f0f2` | Error and destructive surface |

There is no chromatic accent token. Depth comes from weight, size, spacing, and
gray fill — not from hue, and not from large shadows or glossy decoration.
Error, warning, and success states are carried by icon, wording, weight, and
placement; they must never rely on color alone.

## Scale

- Spacing base: 4px; common steps: 4, 8, 12, 16, 24, 32.
- Control heights: 32px compact, 40px default, 48px large/form.
- Type: 11px metadata, 12px compact UI, 14px body/control, 20px section title.
- Radius: 8px compact, 12px control/group, 16px major surface.
- Icon size: normally 15–18px inside 40px controls. The composer send arrow is
  17px inside a 32px visible circle, with a 40px action target in both modes.

Control size is determined by the global system, not by the visual mass of an
individual icon. Upload, settings, and send align to the same 40px box.
The composer shell uses 22px outer corners on wide screens and 18px on mobile;
the attached parameter drawer matches those corners.

## Surfaces and separation

- GG-059 embeds site-owner enterprise/model/account content beside the retained
  lobby sidebar. GG-060 removes its duplicate visible context title: the upper
  row only exposes wrapping 40px function links using the gray selected surface;
  the current content page supplies the sole 20px primary title with a secondary
  description. Embedded admin content omits duplicate brand/header,
  outer viewport height and padding; Chinese font settings remain scoped there.
  GG-061 adds an independent audit function with the same sole primary title,
  quiet desktop columns and stacked mobile fields. Actor, target and reason stay
  readable without truncating audit evidence; no duplicate account-page log panel.

- The model-management list groups images and videos, shows each model name
  once, and aligns resolution prices in quiet desktop columns. On mobile each
  row retains its actions above a compact price grid. RMB values have modest
  emphasis with tabular digits; equivalent credits and units are secondary.
  Output/reference video prices remain distinct. The editor uses compact
  specification groups and a collapsed technical detail area, not repeated IDs
  or version badges in ordinary rows (GG-053).

- Prefer whitespace and grouping over lines.
- Sidebar and content share the same canvas; no vertical divider.
- Ordinary actions—including navigation, return, retry, search, row actions,
  and cancel—have no outer border and remain transparent with neutral text and
  icon color at rest. Their hover may use only the quiet `--soft` surface.
- An ordinary button must not use a status-colored fill in its default state.
  Action fill is reserved for an explicit selected/pressed state or a final
  commit/confirmation action; text and icons on that fill are always white.
- Form fields and select triggers may retain a neutral structural border. Focus
  is communicated with a near-black outline or ring, not a persistent fill.
- Default icon hover: `--soft`; active navigation uses the `--fill-selected`
  gray tile.
- Avoid persistent navigation shadows. Composer may use a very shallow neutral
  elevation to remain legible while sticky.
- Authentication recovery is a compact white card over a softened canvas, not
  a marketing hero. The email-only candidate keeps its normal email field,
  one six-digit code field, and the send-code action together in a compact
  single-column form: left-aligned stacked brand, a small underlined mode label,
  full-width email, code/send row, then one neutral dark login action. It fits a
  390px mobile viewport. Secondary send/modify states stay quiet. Email and code
  focus is a near-black border with no input shadow; authentication errors use
  a strong neutral heading with an icon and explanatory copy, since no
  chromatic error color exists. OIDC rollback mode may retain its combined
  hosted-login label until cutover.

## Brand and icons

- `public/goodgood-wordmark.svg`: lobby desktop/mobile navigation shows only
  **Good Good** lettering (GG-269), with no separate G icon or reserved gap.
  The custom paths match the segmented G and rounded 4.3–4.6 unit strokes;
  the GG-267 size remains 108px/about 14px high and may shrink on mobile so
  account controls retain their space. The sidebar brand is one 32px-high home
  button sized to its contents, with vertically centered lettering. GG-271 uses
  the same 12px horizontal inset as navigation items, aligning the wordmark's
  left edge with the navigation icon boxes beneath it. GG-272 places its center
  on the project title center: shared heading top 34px (28px at ≤1040px),
  title line-height 36px, brand top margin heading-top minus 10px, navigation
  gap 2px. The 108px lettering and mobile header stay unchanged.
- `public/goodgood-g-icon.svg`: other brand icons use the same G from GG-149,
  with a black circle and three white geometric pieces. Authentication/account
  states, creation empty state, compact canvas, management, Hero and browser
  icons keep one G. Preserve accessible names and links.
- SVG/ICO favicons and the self-contained maintenance page use the same geometry.
  Old Double G assets are historical only. [ADR 0116](decisions/0116-unified-g-brand-icon.md)
  supersedes earlier brand and mobile-wordmark rules.
- Composer send/generate action: Lucide upward arrow in a near-black circle
  (ADR 0098). `public/feihong-send.png` remains a loading illustration.
- Creation navigation: Brush.
- Explore: Compass.
- Projects: Folder.
- Assets: Images.
- Moodboard: Layout grid.
- Model providers: transparent marks from the peer-free
  `@lobehub/icons-static-svg` distribution only.
- Seedance 2.0–2.5 uses `bytedance-color.svg` from the same distribution,
  displayed at 26px within the existing transparent 32px model-icon slot.

## Composer

- One visual component: prompt row plus optional reference tray and parameter
  drawer; drawers must not appear detached.
- Parameters open as an opaque attached downward overlay above results (ADR
  0055), not an in-flow expansion. Raise the open composer one stacking level;
  retain shallow elevation and joined edges. Opening must not move results.
  Long drawers scroll within the viewport space below the prompt/reference tray.
- A compact `图片 / 视频` segmented control is attached below the prompt row.
  It uses the same white/soft surfaces and the restrained gray selected state;
  it is a creation-mode choice, not another navigation bar.
- Prompt is the flexible column. Left and right controls remain top-aligned and
  fixed while the textarea grows.
- Do not add a batch-prompt summary row in either composer (ADR 0054).
  Image quote beside send uses the total across segments, not just one segment;
  retain video interface status without inventing pricing or replacement copy.
- Reference thumbnails use a horizontal tray, centered 1:1 crops at `96 × 96 px`
  on desktop and `80 × 80 px` on mobile (ADR 0056), with a compact upper-right removal
  control that minimizes image obstruction. Each thumbnail
  keeps a compact lower-left `图 1…图 10` badge so prompt references match the
  submitted order. Keep the sizes in shared responsive tokens and do not show a
  redundant tray heading or total.
- Reference drag feedback uses a restrained opacity change on the moving item
  and a near-black inset edge on the current destination; it must not resize or
  reflow the tray before the drop.
- Clicking a ready reference opens a focused, viewport-contained quick editor.
  The default view shows the complete source with `object-fit: contain` and keeps
  `图 N` plus the filename visible. A compact left rail exposes view, crop,
  brush, sticker, arrow, and box-selection tools; the active tool uses Palace
  Red while inactive tools remain transparent or neutral.
- Tool settings stay attached above the image stage and completion actions stay
  in one quiet footer. Do not split the editor into heavy inspector panels or
  let tool chrome cover the source detail being inspected.
- Uploading and failed references reuse the thumbnail silhouette with a quiet
  opacity treatment and centered status icon; do not introduce a detached
  upload panel or success banner.
- The reference icon opens a compact source menu for local upload or existing
  materials. Existing-material selection uses a focused responsive dialog with
  1:1 centered previews, visible selection, existing-tray disabled state, and a
  single confirmed add action.
- In video mode the source menu uses one unadorned `上传素材` row, followed by
  `从资产库选择` and a separated
  `创建素材` action. The creation action opens a focused checklist; no item is
  selected by default, and ordinary upload never implies material creation.
- Material creation status and concurrent progress belong in that focused flow,
  not as more badges over the tray previews. Expired or unavailable historical
  material uses one concise inline recovery message and `重新创建` action before
  submission.
- Video provider line is a compact two-option control inside the model group,
  after model capability copy and before generation mode. It reads `标准 / 备用`,
  defaults to `标准`, and never resets another video value when changed.
- Video output adds `生成数量` with `1 / 2 / 4`, default 1, below sound. Reuse
  the existing quiet segmented controls. Send remains available while earlier
  videos run; compact stream status, not a disabled send action, shows progress.
- Video mode keeps the same tray silhouette for local image, video, and audio
  references. It uses exactly one compact lower-left overlay: multimodal shows
  the media ordinal without a space (`图片1 / 视频1 / 音频1`), while first/last-
  frame shows only `首帧 / 尾帧`. Do not add an upper-left role label or expose a
  manual role selector. The accessible description retains the full media type,
  ordinal, filename, and role. Audio uses a quiet
  neutral placeholder rather than invented artwork. Video mode uses the same
  focused picker as image mode, adding quiet `全部 / 图片 / 视频 / 音频` filters,
  count badges, media labels, and type-specific empty states. Image cards retain
  centered crops, video cards use muted cover frames, and audio cards use a quiet
  neutral placeholder. Video-mode tray items open a focused read-only preview:
  complete contained image, video with controls, or audio with controls; never
  autoplay. Loading/error/retry remain inside it and do not alter references.
  Video mode does not expose the image quick editor in its
  frontend-only phase.
- Video generation mode is a quiet two-option segmented control inside the model
  parameter group. `多模态` is selected by default; `首尾帧` uses the same selected
  treatment. Unsupported upload and asset-filter entries remain visible but
  disabled with concise text, so the active limit is legible before selection.
- Parameter group order: aspect ratio; model; output group with resolution above
  generation count. Aspect ratio leads from the left on desktop and remains first
  when the drawer reflows or stacks.
- Both Banana models show the GG-054 three-line control under the model selector;
  Nano Banana 2 also places its Google Search control below the line choice.
  Use quiet labels and the existing gray selected/on treatment;
  hiding the control must not leave an empty panel for other models.
- All three GPT image models use the same attached, quiet segmented-control treatment directly
  under the model selector for `质量`, `背景`, and `输出格式`. Keep the groups in
  that order. Disabled JPEG under a transparent background remains legible but
  subdued, with a concise compatibility explanation.
- The credit quote is quiet 11px metadata beside the settings/send actions. It
  shows the per-image rate and, for 2/4 outputs, the selected batch total. It has
  no filled chip, border, icon, or payment emphasis.
- Before video pricing exists, the same location reads `接口可用` in configured
  local development and `接口待接入` elsewhere, without a fake price. Video output
  controls use resolution, duration, and sound; they
  retain the existing quiet segmented and slider language.

## Page-header navigation

ADR 0061 removes persistent top-right return entries from Assets, credit
activity, distributor management, enterprise management and site-owner account
management. Do not add replacement buttons, breadcrumbs or logo navigation.
Existing content tabs, filters, logout, `新建创作`, detail/dialog close controls
and error-body recovery actions retain their current semantics and focus behavior.

## Account credit

- The desktop account trigger stays as a quiet avatar at the foot of the icon
  rail. Its compact menu gives identity and a clickable `积分` row with the
  available balance, then separates the logout action below. Selecting the
  credit row opens a wide white modal with a pale gray account navigation area
  and a restrained usage table. Identity is one of `站长`, `个人`, `企业`,
  or `分销商`; site-owner identity takes precedence over any business-role value.
  The exact numeric balance retains ink emphasis. Per-image price, batch
  total, and
  approximate remaining image count do not repeat there; generation pricing
  remains beside the composer actions.
- Mobile uses one small neutral balance pill in the existing top bar. It opens
  the same usage dialog while retaining its quiet visual weight.
- Loading and unavailable states keep the username subtitle footprint so account
  chrome does not jump. Do not add a wallet panel, pricing hero, or checkout treatment before
  a real payment provider and customer checkout flow are accepted.
- The credit-usage view uses one compact `今日消耗 / 本周消耗 / 本月消耗`
  summary, a compact filter, and a white four-column table with shallow separators.
  Rows show only business category, batch reference when present, time, status,
  and credit change. Model, resolution, count, prompt, and image-result controls
  stay in the asset library; the record view must not resemble a checkout or
  marketing dashboard.

## Site-owner account management

- GG-057 shares the account/model header under `站长管理`: quiet white sticky
  chrome, one matching content width, two compact navigation links, near-black
  current-page fill/text plus `aria-current`, and the direct creation action.
  GG-058 removes header logout and sets an explicit Chinese sans-serif fallback
  stack with no synthesized font weights on these two page bodies.
  Narrow screens wrap the brand/action row and retain both text navigation
  labels below it. Match the two page headings and spacing; add no shadow or
  decorative management hero.

- Treat `/admin/users` as a compact working surface, not a marketing page. Use
  the existing light canvas, quiet chrome, rounded controls, and near-black only
  for selection or the primary confirmed action.
- Use no decorative imagery. Desktop favors a readable account table; narrow
  layouts use stacked account rows without hiding status, tier, or the primary
  review action.
- Resolve account identity to one user-facing label: `站长` takes precedence;
  every other account displays exactly one of `个人`, `企业`, or `分销商`.
  Keep access state and account tier visually distinct from that label. Status
  treatments remain restrained and must not rely on color alone.
- On wide screens, account email, identity, and direct parent occupy separate
  table columns. The account column contains only the account identifier; a
  missing direct parent displays an em dash. Card layouts use the same identity
  and direct-parent labels as separate fields rather than nesting them below the
  email.
- Use the access-state select as the only status filter. Do not repeat the same
  pending, active, and suspended choices as summary cards above the table; the
  initial view lists all accounts.
- Use existing table, dialog, select, input, and alert-dialog primitives where
  their semantics match. Granting credit requires an explicit confirmation and
  never uses checkout, wallet, or payment visual language.
- Account-management select lists open below and left-aligned to their trigger
  with a small gap; they do not flip upward over the field or preceding
  content. Long candidate lists keep a bounded height and scroll internally.
- Loading, empty, failure, retry, and mutation-in-progress states retain the
  page silhouette so rows and controls do not jump.

## Distributor allocation

- ADR 0060 puts allocation only in `分销管理 → 客户与下级`, with horizontal
  `划拨记录` tabs, not in enterprise management or standalone main navigation.
  Each account displays one identity; no enterprise/distributor toggle or combined
  badge. Enterprise management contains only its four company tabs.
  Reuse the light account-table/list language and near-black
  only for the selected state or final confirmed allocation; do not introduce a
  sales dashboard, wallet hero, earnings chart, or commerce illustration.
- Show personal total credit and `可分配积分` as a compact inline facts row,
  not prominent summary cards. Distributor allocation never implies company
  pool or employee budget ownership. Explain the transferable subset
  as payment-funded credit (`充值来源积分`) in supporting copy; do not use color alone to distinguish it
  from non-transferable welcome/test/promotion credit.
- Direct-child rows prioritize identity, cumulative allocated credit, latest
  transfer time, `查看记录`, and `分配积分`. They never expose that child's
  balance or creative content. Narrow layouts stack the row and keep both
  neutral actions together without hiding relationship context.
- Account-specific history is an ephemeral filter of fetched pages. Keep
  `全部记录`, range disclosure and load-more visible even when that filter
  yields no rows; do not label a partial empty result as empty full history.
- The allocation dialog mirrors the compact site-owner credit dialog: explicit
  target, transferable balance, integer amount, optional remark, and one final
  Near-black action. Completion shows the public transfer reference. There is
  no price, currency, payment, order, commission, revenue, or reclaim control.
- Loading, empty, first-read failure, stale-relationship conflict, insufficient
  transferable balance, and mutation progress preserve layout and keyboard/
  focus behavior. A disabled action must have a text explanation in addition to
  its visual state.
## Enterprise workspace management

- ADR 0059 makes overview a compact operational page, not repeated navigation
  cards: four metrics, actionable credit/invitation attention, member usage and
  recent team outputs. Monthly aggregates show `— / 待接入统计` until connected;
  current member figures are explicitly cumulative. Use white rounded lists,
  neutral row actions, two columns that stack on narrow screens, and bounded
  image thumbnails opening a focused, complete-image read-only dialog.
- ADR 0057 removes all global Workspace selectors, including site owners.
  Enterprise management and eligible credit distribution use the normal main
  sidebar. Enterprise detail has compact horizontal content tabs, not a second
  sidebar. Only legacy scoped creation URLs display quiet company context.
- Enterprise headings use the 20px section scale; summaries are restrained
  white 16px-radius surfaces. Ordinary row/invite/navigation actions stay
  neutral. The invitation and budget dialogs reuse `admin-action-dialog`.
- Enterprise overview, members, usage, and Assets remain working surfaces on the
  white image-first canvas. Reuse the compact admin table/card rhythm without
  making organization managers look like GoodGood site owners.
- Member rows lead with email/name, then role, membership state, allocated,
  consumed, reserved, and remaining credit. Wide layouts use a readable table;
  narrow layouts use stacked labeled fields and retain the primary action.
- Invitation, role/status, and budget dialogs preserve their page context.
  Confirmed allocation uses the near-black action only for the final action; current/new
  amounts and company unallocated capacity are visually distinct without wallet
  or checkout styling.
- Team Assets keep the normal gallery-first presentation. Creator and usage
  metadata stay subordinate to images; employee oversight must not turn the
  gallery into a ledger table.
- Loading, empty, access-denied, expired-invite, stale-version, mutation, and
  retry states keep stable silhouettes and keyboard/focus behavior.

## Image presentation

- GG-037 opt-in style prototype mixes image and video output cards in the same
  four-column / narrow two-column masonry. Video cards use a compact play/time
  overlay, not an embedded full-width player; progress occupies the same slot.
  Shared detail keeps a complete preview, parameters, and mixed thumbnail rail.
  This prototype is labelled simulation; the owner accepted its layout on 2026-09-13.

- The asset library separates generated images from uploaded materials without
  making either look like a file-management table. Material cards preserve the
  image's real ratio and keep filename/dimensions subordinate to the image.

- Preserve the actual output ratio in all data and detail views.
- Creation and asset gallery use tight 3px gaps and a single rounded outer frame;
  internal image corners remain square.
- Creation skeletons occupy the same final masonry slots as their outputs; a
  completed image replaces its skeleton without a second layout pass.
- Creation-card hover metadata shows the concrete pixel dimensions. Successful
  outputs are already in the asset library, so creation cards and image detail
  expose only download rather than a duplicate bookmark action.
- Creation-card download controls provide visible hover, focus, and pressed
  feedback through the near-black action and a shallow elevation change.
- Generated assets retain their original color in creation, project, asset, and
  detail views. Do not apply ordinal-based saturation, contrast, hue, brightness,
  or other presentation filters to make outputs appear artificially varied.
- Batch rows align image group, prompt, and metadata to the same top edge.
- The image group has a stable visual height within a batch; width follows ratio.
- Object cropping is acceptable only for a deliberately fixed thumbnail surface;
  full detail must show the complete asset.

## Destructive confirmation

- Use one compact modal only when an in-app action would clear meaningful
  unsaved creation state. The confirmation itself is an opaque white card over
  a restrained secondary veil; canvas or page content must never show through
  its text and actions. Keep `继续编辑` visually quiet and the explicit discard
  action near-black; do not use a generic browser confirmation.

## Motion

- Motion communicates state: drawer reveal, generation progress, new-asset cue,
  result reveal, and detail navigation.
- Typical duration: 160–300ms. Result reveal may use 480ms with small stagger.
- No decorative constant movement. Respect `prefers-reduced-motion` for every
  new animation.

GG-077、GG-079 的灵感参数可见性单选组、大厅查看/使用/点赞图标数字行、隐藏参数说明与详情居中规则随灵感板块整体下线一并移除，不再有对应界面；见 [ADR 0104](decisions/0104-inspiration-feature-retirement.md)。

GG-275文本节点沿用图片生成器的外置灰色元信息、圆角与白色书写区；移除内置页头和Markdown/字数页脚，右下显示低调双斜线尺寸柄。32px操作区支持拖动、触摸与方向键调整，Shift加大步幅；工具栏在外置标签上方保持间距。正文固定14px，H1/H2/H3保持相对层级；调整节点宽高仅重排文字，超出内部滚动，画布视口缩放仍缩放整个节点。工具栏移除删除线、引用、代码块入口，既有Markdown内容与解析保留。文本圆点直接复用媒体圆点class，生成器仅保留一个图片/文本输入；图片缩略与悬停预览按后继GG-276/ADR0125恢复，文本和视频文件卡保持。不展示Markdown源符号，不增加色彩强调。见ADR0124。
