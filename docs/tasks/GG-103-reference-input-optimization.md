# GG-103 — 多参考图预览、上传恢复与模型输入优化

- 状态：本地实现与验证完成；未部署。
- 基线：GG-102 `bd4b3a1`；分支 `codex/GG-103-reference-input-optimization`。
- 需求：上传范围内的大图立即出现本地预览，后台继续上传；网络或校验超时不误判最终结果；Nano Banana / GPT Image 真实发送的每张图最多 10 MB，多图也有合计预算。
- 决策：[ADR 0094](../decisions/0094-reference-preview-and-provider-inputs.md)。原图继续作为私有可复用素材，生成前派生模型输入图；现有原图入库单张 20 MiB 上限暂维持，用户的 10 MB 偏好用于模型实际发送副本。

## 验收

1. 选择文件后先显示本地预览和上传状态；慢网、其他图片上传不会挡住它，失败项可重试或移除。
2. 多图直传限制并发，临时网络故障可重试；完成接口超时后查询素材真实状态，已入库的图不误报失败。
3. Worker 保留参考图顺序和原图，逐张生成模型副本，单张不超过 10,000,000 字节且整批受限；无法达标时不调用计费生成接口。
4. 定向测试覆盖正常、小图透传、多图预算、透明图、上传重试、状态恢复和失败；完整 `check:local` 通过。

## 边界与下一步

- 本任务只做本地实现和验证，不改生产数据，不部署，不自动发起真实付费生图。
- 验证：`node --test tests/ui-components.test.mjs` 20/20；
  `node --test tests/gg103-reference-inputs.test.mjs` 5/5；
  `npm run check:local` 575 项，549 通过、26 隔离跳过、0 失败。
  本次没有向真实 O1Key 上传参考图或提交生成请求，因此 10 MB 是已验证的
  GoodGood 出站约束，O1Key 对压缩后多图的实际接受性仍待显式付费实测。
- 本地运行：检查点构建与来源验证通过；32131 Web 的
  `/api/health/version` 返回 `build.verified=true` 且对应本任务提交，
  `/create` 返回 200；32142 真实 O1Key Worker 的 runtime/database/
  objectStorage/provider/queue 均为 `ok`。启动前确认生成活动任务数为 0；
  保留本地数据库、素材和浏览器草稿，没有提交付费生成。
- 下一步：用户可在 32131 检查上传体验；多图压缩后的真实 O1Key 接受性需另行
  明确进行付费实测，生产发布另行授权。
