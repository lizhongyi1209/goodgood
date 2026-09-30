# GG-214 · Seedream 5.0 Pro 画布接入

- 日期：2026-09-30。
- 状态：实施中，未部署；由站长手动验收，无自动测试、浏览器复测或真实provider请求。
- 来源：站长提供完整[O1Key Seedream文档](https://cf-api.o1key.com/docs/)；provider ID `dola-seedream-5-0-pro-260628-ep`，产品ID `seedream-5.0-pro`。
- 已确认：默认普通生图，节点兼容多图层返回；计费按文档基础价，普通1K30/2K60积分，参考图首张免费、第二张起每张2积分。图层拆分15/30乘实际返回张数作为将来显式拆层的规则记录，本次不启用layer_decomposition，不增加模式字段或入口。接口不传watermark，默认PNG。
- 决策：[ADR0108 GG-214](../decisions/0108-standalone-canvas-image-generation.md#gg-214-addendum--seedream-5-0-pro-normal-generation-and-stacked-outputs-2026-09-30)先记录。
- 范围：画布模型/本地图标，设置仅分辨率1K/2K和宽高比（自适应映射size bucket，固定比例按文档八项），无数量/质量/背景/1.5K/4K；单次请求n1/images URL数组，返回1..17同一生成器按z_index完整可靠时稳定排序，否则保留顺序，并复用堆叠/展开，真实size来自结果。
- 分工：seedream_provider_support负责adapter/capability/provider-router和独立未执行定义；seedream_canvas_model_ui负责画布界面；根负责共享契约、精确报价/积分冻结、成功落库guard、目录/迁移、本地隔离运行和文档。
- 边界：不扩大客户端上传格式/大小、不开启拆层、不改变其他模型strict count、旧任务路由/账本/素材/生产。不得让未报价模型浏览器猜价或生成。
- 验收：模型可选且参数能力正确，参考图按URL传，PNG无水印字段，quote包含参考图附加费，返回多张同节点一起移动并可展开，全部成功后沿现有原子落库结算。真实调用只由站长触发。
- 下一步：完成源码与版本化本地价格，同步隔离Web/Worker，交站长手验。
