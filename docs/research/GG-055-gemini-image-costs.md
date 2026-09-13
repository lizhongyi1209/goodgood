# GG-055 — Gemini 官方图片成本核对

核对日期：2026-09-13。范围为 Gemini Developer API 的 Standard 实时生成；人民币按测算汇率 1 USD = 7 CNY，不代表实时支付汇率。沿用 1 CNY = 100 积分，仅做成本分析，不发布售价，不改变 ADR 0063/0064。

## 官方输出价格折算

模型对应 Nano Banana Pro / `gemini-3-pro-image` 与 Nano Banana 2 / `gemini-3.1-flash-image`。官方按图片 output tokens 计费，费率分别为 120 / 60 USD 每百万图片 tokens；以下用官方分辨率对应 tokens 精算，官方美元展示有四舍五入。[Google 官方定价](https://ai.google.dev/gemini-api/docs/pricing)

| 模型 | 规格 | 图片 tokens | USD/张 | CNY/张 | 成本积分向上取整 |
| --- | --- | --- | --- | --- | --- |
| Nano Banana Pro | 1K | 1120 | 0.1344 | 0.9408 | 95 |
| Nano Banana Pro | 2K | 1120 | 0.1344 | 0.9408 | 95 |
| Nano Banana Pro | 4K | 2000 | 0.2400 | 1.6800 | 168 |
| Nano Banana 2 | 1K | 1120 | 0.0672 | 0.4704 | 48 |
| Nano Banana 2 | 2K | 1680 | 0.1008 | 0.7056 | 71 |
| Nano Banana 2 | 4K | 2520 | 0.1512 | 1.0584 | 106 |

这仅是最终图片输出成本。完整上游账单还包括输入、文字/思考输出与付费工具项。Standard 输入/text-thinking output 每百万 tokens 分别为 Pro 2/12 USD、Banana 2 0.5/3 USD。Pro 参考图输入按每张 560 tokens；不是生成图收费。Google Search 超出共享免费额度后按实际执行查询收费。[官方定价说明](https://ai.google.dev/gemini-api/docs/pricing)

思考文本 tokens 会收费；中间 thought images 不能当作额外交付图逐张收费。Nano Banana 2 支持 minimal/high，隐藏思考显示不会免去其计费；GoodGood 已固定 high，需要为该配置单独统计成本。[官方图片生成说明](https://ai.google.dev/gemini-api/docs/image-generation)

## 追问：五张参考图与长提示词

同一任务继续核对输入增量，仍按 Standard 和 1 USD=7 CNY，不改变定价决策或产品费率。每个算例是一次请求生成一张图、传入五张参考图；多任务重复传图会重复计算输入，不因素材已上传到 GoodGood 而免费。

Pro 价格页明确每张输入图为 560 tokens，因此五张图增加 `5 × 560 × 2 / 1e6 × 7 = 0.0392 CNY`，与本次输出 1K/2K/4K 无关。[模型专用价格注释](https://ai.google.dev/gemini-api/docs/pricing#gemini-3-pro-image)

Banana 2 价格页只给输入费率 0.5 USD/百万 tokens，没有给每张参考图固定 token 数。本表依据 Gemini 3 通用 default/high 图片输入规则，以每张 1120 tokens 作预算假设，五张增加 0.0196 CNY；不是该模型已确认固定值或成本上限。media input resolution 不等同输出尺寸或 thinking level；不承诺改变参数可获得某个 token 数。应使用实际模型/请求的 usage 与账单校准。[通用媒体 token 规则](https://ai.google.dev/gemini-api/docs/media-resolution#token-counts)、[输入 token 核对](https://ai.google.dev/gemini-api/docs/tokens)

以下长提示词统一假设为 5000 个输入 tokens，不能按 5000 个汉字理解。文本另外增加 Pro 0.0700 CNY / Banana 2 0.0175 CNY；连同五张参考图，输入合计增加 0.1092 / 0.0371 CNY。另举文本长度敏感性：1000/10000 个输入 tokens 的文本成本，Pro 为 0.014/0.14 CNY，Banana 2 为 0.0035/0.035 CNY。[输入费率](https://ai.google.dev/gemini-api/docs/pricing)

| 模型 | 输出规格 | 最终图片输出 CNY | 五图＋5000 文本 tokens 输入增量 CNY | 输入＋图片输出小计 CNY | 成本积分向上取整 |
| --- | --- | --- | --- | --- | --- |
| Nano Banana Pro | 1K | 0.9408 | 0.1092 | 1.0500 | 105 |
| Nano Banana Pro | 2K | 0.9408 | 0.1092 | 1.0500 | 105 |
| Nano Banana Pro | 4K | 1.6800 | 0.1092 | 1.7892 | 179 |
| Nano Banana 2（参考图假设） | 1K | 0.4704 | 0.0371 | 0.5075 | 51 |
| Nano Banana 2（参考图假设） | 2K | 0.7056 | 0.0371 | 0.7427 | 75 |
| Nano Banana 2（参考图假设） | 4K | 1.0584 | 0.0371 | 1.0955 | 110 |

这是输入与最终图片输出的小计，未包含文字/思考输出、搜索或失败重试，不能称完整账单或推荐售价。复杂参考图和长文本还可能间接增加思考消耗：每额外 1000 个文字/思考输出 tokens，另加 Pro 0.084 CNY / Banana 2 0.021 CNY；与上文输入项分开。暂无该间接增量实测，不给总成本波动上限。[思考计费说明](https://ai.google.dev/gemini-api/docs/image-generation)

## 整单和平台按张报价

`单次上游 USD = input_tokens × 输入费率 / 1e6 + text/thinking_output_tokens × 对应费率 / 1e6 + image_output_tokens × 图片费率 / 1e6 + 工具费用`

各计费项要按对应费率分别计算，不将总 tokens 全部乘图片输出费率。最终图片输出有按规格公开的基准，但完整账单不是无条件固定每张金额；尤其高思考、参考图与搜索会改变成本。尚未读取真实账单，不能把假设当实测均值/上限。

假设整单另有 1000 输入 tokens、1000 文字/思考 tokens，无搜索（全部是假设，不是真实平均）：Pro 1K/2K 为 1.0388 CNY、4K 为 1.778 CNY；Banana 2 1K/2K/4K 为 0.4949/0.7301/1.0829 CNY。每额外 1000 个文字/思考 tokens 增加 Pro 0.084 CNY、Banana 2 0.021 CNY。

若以这组假设完整成本计算、目标毛利率 30%，向上取整的试算售价分别为 Pro 149/149/254 积分、Banana 2 71/105/155 积分；还不包含失败损耗、存储、汇兑/支付费、充值赠送与分销折扣，不是获批准默认售价。

## 线路与优惠方式

特价/优质固定采购价应采用供应商实际每张成本。专线按量采购则分别计算官方 token 项与真实折扣；只有供应商对各项统一打折时才能给整单直接乘一个折扣。不能把 Google 原价直接当作三条 O1Key 线路成本。

官方 Batch 图片输出价约 Standard 的一半；适用于异步批处理，官方说明周转可达 24 小时，不能作为普通实时生成可必得的采购成本。[定价](https://ai.google.dev/gemini-api/docs/pricing)、[批处理说明](https://ai.google.dev/gemini-api/docs/image-generation#generate-images-in-batch)

建议沿用已确认按张固定售价，按模型/线路/规格积累成功交付与失败支出的真实完整成本，再以毛利目标及最低实际积分收入定价。下一步所需数据为 O1Key 真实折扣/固定采购价、high 模式 usage 分项与重试/失败退款规则。本轮无 API 生图、数据修改或生产发布。
