# GG-302 · 画布生成图片清晰度逻辑排查

- 日期：2026-10-02；请求：2K生成图片在画布模糊，检查是否压缩。
- 基线/所有权：GG-116/5173当前03e1b43，保留并行GG-301；Web为GG-300 b3844d2，唯一Worker为GG-226 70e10c6。根agent只读排查及文档，无子agent/worktree。
- 结论：生成器单图/展开批次及独立结果节点均直接显示output.previewUrl；publicGenerationJob将该字段设为私有/api/assets/:id/preview。readPrivateImagePreview等比缩到最长边512px并编码WebP quality80，放大节点/画布不会改为原图，因此预览会模糊。此为ADR0101的卡片预览方案被画布复用。
- 原图：downloadProviderOutput仅解码校验及读取实际宽高，返回原bytes；storeProviderOutputs校验/保存同一bytes，storeGeneratedAsset直接PutObject。已运行GG-226 Worker相同逻辑，没有将生成原文件缩到512。生成参数继续传job.resolution或相应模型像素映射；不凭用户选择2K断言单张上游实际尺寸，实际尺寸来自解码元数据。
- 范围/状态：逻辑原因已确认；未修改显示/压缩策略，未构建、测试、代码检查、浏览器或真实生成，未读取/导出用户原图，无运行/迁移/生产变化。
- 决策：本轮只排查，不改变ADR0101或生成参数。后续修复应仅调整画布大图读取，保留资产网格/附件的512预览，沿已有鉴权原图content路径，不重新生成/上传。
- 生命周期：创建0/退役0；按WORKFLOW只读审计/小文档在干净集成目录完成，无依赖/缓存。
- 下一步：向用户说明预览512px/quality80与原图存储的区别；后续画布清晰度优化另按明确范围开发。
