# GG-295 · 文本生成节点Tooltip上下文修复

- 日期：2026-10-02。
- 请求：生成文本后点击节点报错 `Tooltip must be used within TooltipProvider`。
- 决策：实现缺陷修复，不改变ADR0127、节点样式或交互决定。
- 基线：实际GG-116/5173源码d7147c5，祖先包含GG-294构建767e6db；32131 Web已启用本地0061，真实生成由用户测试。
- 所有权：根agent；分支fix/GG-295-text-generation-tooltip，辅助目录F:/goodgood-worktrees/GG-295-text-generation-tooltip；仅文本生成节点及本任务文档，无子agent。
- 原因：文本生成节点的连接输入卡使用Radix Tooltip，选中后底部NodeToolbar挂载，但该节点没有TooltipProvider。canvas-page中既有Provider只覆盖图片生成chat，不能覆盖此节点。
- 实现：在文本生成节点自身根部补TooltipProvider（delayDuration=180），覆盖空态、流式/结果和选中NodeToolbar的连接输入预览。Provider不增加DOM包装，保持节点位置、尺寸、Markdown编辑/拖动和已有素材。
- 状态：隔离提交2cd651c已精确接入GG-116/5173为45c0155，用户手验；未部署。
- 验证：按用户约定仅开发，不运行编译、lint、测试、代码/diff检查、浏览器或真实生成；不改数据库/服务。用户手动复验。
- 验收：已有连接输入的文本生成结果被选中不再缺上下文报错，hover/键盘聚焦输入缩略可正常显示预览；默认拖动及双击编辑保持。
- 生命周期：创建1/退役1；已核对干净Git/忽略项、指定根内路径且无使用进程，通过Git remove/prune退役，保留分支/提交；无依赖安装或构建缓存。
- 下一步：用户刷新5173并点击已有文本生成节点，无需重新生成；32131 Web仍为GG-294 verified 767e6db，Worker/0061保持，本次未重新构建或重启。
