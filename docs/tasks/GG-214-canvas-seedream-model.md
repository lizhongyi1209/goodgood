# GG-214 · Seedream 5.0 Pro 画布接入

- 2026-10-04后继GG-356：0066已在本地应用，补齐三处模型约束，解除GG-355提交阻塞；Seedream真实生成仍由用户手验。既有模型/计费/目录/上游接口未改。

- 2026-10-03后继GG-355只读定位：本地首次实际Seedream提交被generation_batches_model_check拒绝，原0054只加目录/报价而漏模型约束，三处实际SQL与schema.ts不一致。此前“接入”不代表真实调用已成功；当前需新迁移修复，见[GG-355](GG-355-seedream-diagnosis.md)。

- 日期：2026-09-30。
- 状态：前端与隔离本地 Web/Worker 已接入，待站长手动验收，未部署；未运行自动测试、浏览器复测或真实 provider 请求。
- 来源：站长提供完整[O1Key Seedream文档](https://cf-api.o1key.com/docs/)；provider ID `dola-seedream-5-0-pro-260628-ep`，产品ID `seedream-5.0-pro`。
- 已确认：默认普通生图，节点兼容多图层返回；计费按文档基础价，普通1K30/2K60积分，参考图首张免费、第二张起每张2积分。图层拆分15/30乘实际返回张数作为将来显式拆层的规则记录，本次不启用layer_decomposition，不增加模式字段或入口。接口不传watermark，默认PNG。
- 决策：[ADR0108 GG-214](../decisions/0108-standalone-canvas-image-generation.md#gg-214-addendum--seedream-5-0-pro-normal-generation-and-stacked-outputs-2026-09-30)先记录。
- 范围：画布模型/本地图标，设置仅分辨率1K/2K和宽高比（自适应映射size bucket，固定比例按文档八项），无数量/质量/背景/1.5K/4K；单次请求n1/images URL数组，返回1..17同一生成器按z_index完整可靠时稳定排序，否则保留顺序，并复用堆叠/展开，真实size来自结果。
- 分工：seedream_provider_support负责adapter/capability/provider-router和独立未执行定义；seedream_canvas_model_ui负责画布界面；根负责共享契约、精确报价/积分冻结、成功落库guard、目录/迁移、本地隔离运行和文档。
- 边界：不扩大客户端上传格式/大小、不开启拆层、不改变其他模型strict count、旧任务路由/账本/素材/生产。不得让未报价模型浏览器猜价或生成。
- 验收：模型可选且参数能力正确，参考图按URL传，PNG无水印字段，quote包含参考图附加费，返回多张同节点一起移动并可展开，全部成功后沿现有原子落库结算。真实调用只由站长触发。
- 下一步：站长刷新 5173 画布，手验 Seedream 模型、参数、参考图附加费及自行触发的真实生成；普通模式通常单图，多返回的堆叠兼容仍需实际结果验收。

## 实施与运行证据

- 画布模型列表增加 Seedream 5.0 Pro，复用已有本地 ByteDance SVG 并转为灰黑图标。参数面板仅分辨率 1K/2K 与自适应/八种固定比例，隐藏数量与相关摘要；继续向下完整展开。大厅不增加 Seedream 入口。参考图去重后动态报价，报价缺失禁用生成。
- Provider 固定 dola-seedream-5-0-pro-260628-ep，n:1，images 为公网 URL 字符串，output_format:png；不传 watermark 或 layer_decomposition。自适应 size 为选中的 1K/2K；固定比例按共享文档像素表。Seedream 允许返回 1..17，可靠完整 z_index 稳定排序，否则原序。Worker 和成功事务使用同一数量规则，其他模型保持精确数量；逐张解码真实尺寸，全部成功才写入一个原子批次并结算，失败清理已暂存对象。
- 本地迁移 0054 仅新增 Seedream 目录和两条不可变 count:1 基础报价，1K30/2K60，已有同 ID 配置不覆盖。前端及个人/企业预留复用统一精确金额函数，首张参考图免费、第二张起每张 2 积分，冻结接受时总额和基础版本，重放仍读取原冻结记录。拆层 15/30 × 实际张数仅记录，未启用。
- 运行从已 verified 257f959 新建 F:/goodgood-worktrees/GG-214-runtime / feature/GG-214-canvas-seedream-runtime，仅提取本任务源码/迁移与未执行定义；提交 29e566dec66bf24452379dc05be183bf18334238。npm ci、启动所需 build:checkpoint 与 verify:checkpoint 完成，artifact d33e67ea4ada54c2275b5185de0012a0312cbac7212be2df6af7e3ec0219daf0，source 22e71d160edd9db0fa205b9ff118223782a88d7da05ff20c9daf6fbaacc15f8a。
- 两次核对零活跃任务、未派发 outbox、个人/企业冻结与 Valkey ready/processing 队列后，替换旧 Web27492/Worker10032，仅在 loopback54449/goodgood 前进 0054 至 54 条迁移，不运行 fixtures；原画布项目 1 保留。新 Web32131 PID25576 / 唯一 Worker32142 PID30008 五项 ready 均 ok；Vite5173 PID34440 保持，代理同 verified revision。沿用忽略的 Valkey56549 启动 helper 和外部 cloud env，日志 %TEMP%/goodgood-local-services/gg214-{web,worker}.{out,err}.log。生产未变。
- 静态审阅和 diff check 完成；补 provider 能力/参数/多输出/不重复提交、暂存失败清理及报价/目录/缺报价定义，未执行。未运行 check:local 或浏览器/生图复测；必要编译与本地就绪核对不代表功能验收。此前 GPT/Nano 功能待手验项保留。
