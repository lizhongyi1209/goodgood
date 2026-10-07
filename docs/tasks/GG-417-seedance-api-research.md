# GG-417 · Seedance 官方与 O1Key 参数对照

- 日期：2026-10-07；状态：公开文档调研及接入方案完成；官方参数同步已获用户确认，尚未开发/调用验收。
- 用户范围：接入前先核对 O1Key Seedance 文档与 Doubao/BytePlus Dreamina 官方接口；两条线路都需支持，请求端点为用户封装，端点差异不视为缺陷。
- 基线：GG-116 干净 HEAD 2c6099b，GG-416 应用源码 d7d31fb0890d924194588f00bede608b7b374b32 已核验为祖先；分支 chore/gg-417-seedance-api-research。
- 范围：公开文档 GET 与现有相关源码阅读；模型映射、素材与角色、分辨率/时长/比例/音频、任务状态与结果、遗漏或不确定项。
- 边界：本轮不改应用、数据库或 accepted 产品决定，不新增 ADR；不发付费生成、不操作本地服务/生产/GitHub，不构建、检查、测试或浏览器验收。
- 现状：旧 creation Seedance 临时预览已有 Doubao MAX/Dreamina HC 映射；持久画布视频链路目前仍为 Kling，不能据此宣称画布已接入 Seedance。
- 验收：结论由当前 O1Key 与官方文档支撑；区分明确相同、明确差异与封装未说明能力，不把官方可用直接等同于中转站可用。
- 协作：根 agent，只读调研与文档；无子 agent，创建/退役 worktree 均 0，无依赖或构建副本。
- 下一步：按文末用户确认的官方参数同步前提规划接入；方案待用户反馈，应用尚未修改。

## 资料与证据边界

- [O1Key Seedance](https://cf-api.o1key.com/docs/#seedance)：公开 HTML GET 200，完整读取 Seedance 小节。web 文本抓取失败后使用 Node fetch 读取，未打开应用浏览器、未请求生成接口。
- [火山方舟创建视频任务](https://docs.volcengine.com/docs/ark/create-video-generation-task-api?lang=zh&redirect=1)、[Doubao Seedance 2.5](https://docs.volcengine.com/docs/ark/seedance-2-5)：官方检索收录内容，确认模型、输出范围与 2.5 特殊约束。
- [BytePlus 创建视频任务](https://docs.byteplus.com/en/docs/modelark/create-video-generation-task-api?redirect=1)、[Dreamina Seedance 2.5](https://docs.byteplus.com/es/docs/modelark/seedance-2-5)：创建页公开 GET 200，解码 SSR 文档正文；模型教程官方检索内容交叉核对。比较对象为 ModelArk，未混入 LAS/Seedance 1.x 的参数规则。
- [BytePlus 查询视频任务](https://docs.byteplus.com/en/docs/modelark/get-video-generation-task-api?redirect=1)：公开 GET 200，读取完整正文；未声明数值 progress 字段，不能据此保证上游运行时一定没有该字段。
- 公开文档确认参数范围，不代表 O1Key 账号权限、实际型号/价格、上线版本或真实请求已验证；未发送 Provider POST/任务 GET 或使用凭据。

## 两条线路与模型

Doubao 与 Dreamina 是两套模型/线路标识，不是两种生成模式。官方两侧都有 2.0、2.0 Fast、2.0 Mini、2.5；O1Key 对应 MAX 与 HC。现有适配器恰好已有同一映射，但不能据此宣称持久画布已接入。

| 系列 | O1Key Doubao | O1Key Dreamina | 官方输出分辨率（两侧） | O1Key 明示范围 |
| --- | --- | --- | --- | --- |
| 2.0 | doubao-seedance-2-0-260128-max | dreamina-seedance-2-0-hc | 480p/720p/1080p/4k | HC 相同；MAX 未列具体范围 |
| 2.0 Fast | doubao-seedance-2-0-fast-260128-max | dreamina-seedance-2-0-fast-hc | 480p/720p | HC 相同；MAX 未列具体范围 |
| 2.0 Mini | doubao-seedance-2-0-mini-260615-max | dreamina-seedance-2-0-mini-hc | 480p/720p | 两侧相同 |
| 2.5 | doubao-seedance-2-5-260628-max | dreamina-seedance-2-5-hc | 480p/720p/1080p | HC 仅 480p/720p；MAX 未列具体范围 |

官方模型 ID 没有 MAX/HC 后缀；Dreamina 官方 ID 带 260128/260615/260628 日期，而 HC 别名不带日期。家族对应明确，HC 别名绑定的精确版本不能仅由名称证明。4K 是官方 2.0 支持范围，不应描述成中转站独有升频功能；2.5 不应套用 2.0 的 4K。

## 请求参数对照

| 项目 | 官方实际规则 | O1Key 文档及接入含义 |
| --- | --- | --- |
| 请求主体 | model、content，text/image_url/video_url/audio_url | 主体一致；按用户封装端点调用，不绕过封装 |
| 提示词 | 文生视频需 text；有素材时可以不带 text | 封装要求至少一项非空 text，首版应按此要求 |
| 角色/模式 | first_frame、last_frame、reference_image、reference_video、reference_audio；首帧/首尾帧/参考互斥 | 一致；一张首帧合法，尾帧需配首帧；不混用帧角色与 reference_* |
| 时长 | 2.0 为 4–15 秒或 -1；2.5 为 4–30 秒或 -1，默认 -1；2.5 编辑必须 -1 | 封装默认 5，列整数范围但未列 -1。不能未经确认把 -1 当作已透传能力；2.0 的 4–15 官方是范围，不仅是建议 |
| 比例 | 同一组选项；2.5 首帧/首尾帧/编辑/延长仅 adaptive | 封装未列任务特例；界面与提交须按类型锁定 adaptive，不能一律沿 Kling 固定比例；Doubao 的 aspect_ratio 别名为封装扩展 |
| 数量上限 | 2.0 为 9 图/3 视频/3 音频；2.5 为 30 图/10 视频/10 音频 | 封装通用上限仍为 9/3/3；不能直接按官方扩容 |
| 输入片段时长 | 2.0 视频、音频单段 2–15 秒，各自合计 ≤15 秒；2.5 单段 2–30 秒、各自合计 ≤30 秒，编辑视频单段 4–30 秒 | 封装只细化了 2.0；2.5 是否开放更高上限未说明 |
| 纯音频 | 2.0 必须搭配图片/视频；2.5 支持纯音频参考 | 封装统一要求音频同时有视觉素材，首版保持封装要求 |
| 音频默认 | generate_audio 默认 true | 封装说明可选但未给默认；请求显式传入，避免意外生成声音 |
| 素材传法 | 图片/音频支持 URL、Base64、asset://；视频 URL、asset:// | 封装明示公开 URL 与素材 Ref，未明确 Base64；不直接沿用 Kling 的本地图片 Base64 路径 |
| 水印/末帧 | watermark、return_last_frame 为官方参数 | 封装只允许 HC，Doubao MAX 不默认传这两项 |
| 2.5 子任务 | omni_reference_task_type=auto/reference/edit/extend，默认 auto；不符约束可能先接收后异步报错 | 封装未列。若要开放 2.5 编辑，需明确 -1 和任务提示参数的透传支持，不能只凭收到 task_id 判断成功 |
| 其他选项 | 支持范围内的 draft/草稿 task、output_format、callback_url、execution_expires_after 等 | 封装未说明，不把官方所有选项直接放进 UI；seed/frames/camera_fixed 文档包含 1.x 模型特有规则，不能移植给 2.x |

素材创建封装为 type/url/name/asset_type/model，返回 Processing/Active/Failed 与 Ref；只在 Active 后使用，Doubao 明示 7 天有效且 type 必须与线路对应。切线路不能假定另一线路可以复用旧 Ref，必要时从平台保留的原素材地址重新解析；原资产不删除。官方真人肖像有可信/授权素材流程，封装未说明如何映射；不能把创建成功等同于所有素材一定可被生成接受。

## 任务回执

- 官方以异步任务返回 id，查询结果为 content.video_url 与顶层 usage；状态主要为 queued/running/succeeded/failed（取消/过期按对应官方接口）。官方查询正文未声明百分比 progress，不能把状态当作百分比。
- O1Key 为 id/task_id、queued/in_progress/completed/failed、progress；视频地址为 result_url/metadata.url/metadata.outputs，用量示例为 metadata.usage。这是明确封装差异，按 O1Key 归一化；有有效进度采用最新值，持续 0/缺值继续既有有界估算。
- 封装未提供失败响应完整示例；开发应保留脱敏后的实际 code/message/任务 ID 和状态，不虚构嵌套错误字段，不用状态码掩盖单项失败。
- O1Key 没有声明单次请求的生成数量参数；界面 1/2/4 对应独立任务与独立结果插槽，不能猜测上游 n/count 字段。

## 后续最小开发边界

保留既有视频 chat 交互，在模型/线路能力表驱动模式、参数显示及校验；Doubao MAX 与 Dreamina HC 均可选。复用旧适配器中已匹配当前封装的 payload/mapping，但需接到持久画布任务、冻结输入、积分报价、Worker/结果资产链路，不能直接把临时预览当作正式生成。首版能力以当前封装明示范围为准；MAX 具体分辨率与 2.5 扩展能力先明确或限制为共同确定范围，不做静默线路切换或付费失败重发。

已完成公开文档对照和上述相关源码阅读；未修改应用、未改变 accepted 决定、未运行构建/检查/测试/浏览器或付费调用，未操作服务/数据/生产或 GitHub。应用源码仍 GG-416 d7d31fb，后台仍 GG-414/1dc37ee、69 迁移。下一步向用户汇报差异，等待其后续开发范围。

## 用户确认 · 官方参数同步

用户随后明确：HC 与 MAX 均完全同步官方参数，O1Key 页面只因未及时更新而范围陈旧。这一确认替代上文“首版只开放旧封装明示能力”的建议前提；并非已经过真实生成验证。

- 两条线路均按对应官方 2.0/Fast/Mini/2.5 能力配置；不再把 HC 2.5 限制在 720p，不再保留 MAX 的“范围未知”产品禁用。
- 支持官方有效值与约束，包括 -1、2.5 30/10/10 与纯音频、特殊比例/时长、官方支持的 Base64 和水印/末帧参数。官方未支持的 1.x 参数仍不移植。
- 端点、模型别名、素材 type/Ref 和任务回执仍按封装适配；参数同步不代表官方任务返回体或账号资产命名空间直接适用。

## 接入方案（建议，未实施）

1. 复用持久画布视频节点与既有黑白 chat；模型菜单加入 Seedance 2.5/2.0/Fast/Mini，选 Seedance 后显示 Doubao(MAX)/Dreamina(HC) 线路，共映射 8 个上游 ID。不做静默付费线路回退，保存节点和冻结任务记录实际系列/线路。
2. 官方模型能力表共用于前端联动与后台校验：2.0 为 4–15 秒、480p/720p/1080p/4k、9/3/3；Fast/Mini 为 4–15 秒、480p/720p、9/3/3；2.5 为 4–30 秒、480p/720p/1080p、30/10/10，均支持自动时长。首尾帧和多模态参考严格互斥。
3. 素材驱动文生、首帧、首尾帧、全能参考及可用视频编辑/延长；一张图可走首帧，两张图可首尾；2.5 纯音频参考可用。2.5 首帧/首尾/编辑/延长自动锁 adaptive，编辑 duration=-1 并显示随原视频。不发送 Kling 的 multi_shot/分镜数组或动作模仿字段。
4. 切系列/线路保留源素材、用户文字与合法参数；按既有顺序留下目标能力允许的引用，对被移除引用作简短提示，源节点/资产不删除；不静默裁短视频/音频，超出时长显示就地恢复入口。跨线路 Ref 单独解析，平台源素材不重复导入。
5. 扩展现有独立任务链路：每个输出冻结请求，1/2/4 为独立任务与插槽，Worker 查询而不因刷新或临时错误重新 POST；引用私有源素材，成功保存私有视频资产，失败保留插槽及单项重试。进度沿现有真实值优先/0 或缺值估算；结果沿既有手动播放、可拖节点和唯一查看/下载入口。
6. 平台积分价格独立按系列/线路/分辨率/时长/数量及输入视频适用因素配置，不把旧示例 token 刊例价或 Kling 临时价当作当前 Seedance 定价。建议先报价预留再成功结算/失败释放；自动时长需预留上限与实际时长核算，正式调用前明确积分价格。
7. 首个开发交付覆盖普通 MP4 视频完整闭环和上述官方能力；Draft→成片两次独立任务计费、MOV 输出及工具等扩展各有状态与成本，按需后续开放。普通 2.0 4K/2.5 1080p 的 HEVC 可播放性需纳入结果处理边界，保留原视频；不未经必要范围擅自增加第三方转码服务。

建议开发顺序：共用能力/保存与素材规则 → chat 与模式联动 → 双线路 Provider/Worker/结果持久化 → 积分报价和逐项恢复。完成源码后用户手动验收；构建/运行启用须另有相应指令，仍不自动编译/测试/浏览器验收。既有 Seedance 临时 adapter 可复用已正确的纯函数，但不是持久任务或积分实现。

本轮仅新增用户确认和方案记录，未更改应用、accepted UI/计费默认或运行环境；创建/退役 worktree 0，无子 agent、依赖或构建副本。公开官方文档 GET/检索与源码阅读用于方案事实依据，无付费调用、数据/服务操作或 GitHub/生产发布。
