# 创作页设计稿截图（参考用，不合并）

来源：设计画布 1440 宽导出。规格以 `docs/design/create.md`、`docs/design/components/` 和 `tokens.json` 为准；截图与文字规格冲突时以文字为准。

| 文件 | 内容 |
| --- | --- |
| QuickImage.png | 图片创作页：左侧设置面板，右侧生成记录（生成中、悬停操作、部分失败） |
| QuickImageScroll.png | 面板与记录各自滚动 |
| QuickImageStates.png | 模型菜单、比例菜单、高级设置展开（GPT Image 质量） |
| QuickImageErrors.png | 图片页异常：生成失败、审核未通过、积分不足等 |
| QuickImageErrorsPanel.png | 面板内异常：素材上传失败、缺少必填项、积分不足提示条 |
| QuickVideo.png | 视频创作页：生成方式 ModeGrid、参考素材、时长、生成音频 |
| QuickVideoScroll.png | 视频页滚动 |
| QuickVideoStates.png | 视频各生成方式与菜单状态 |
| QuickVideoErrors.png | 视频页异常：超时失败、审核未通过、重试中、提交失败 Toast |
| QuickVideoErrorsPanel.png | 视频面板内异常 |
| ViewerImage.png / ViewerVideo.png | MediaViewer 大图 / 视频预览 |
| ViewerInfo.png | MediaViewer 信息面板 |

## 截图里不要照抄的地方

- 左上角标志是破图占位。侧栏、图标栏、手机标签栏一律沿用 GG-423 已实现的组件。
- 面板标题写的是「图片生成」「视频生成」，实现时改为「图片」「视频」，与导航一致。
- 账户行「[余额]」「[单价]」是占位，用真实数据。
- 灰块是图片占位。
