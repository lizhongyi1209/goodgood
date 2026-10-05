# GG-386 · 视频生成chat对齐图片生成

- 日期：2026-10-05，Asia/Shanghai。用户要求检查图片生成chat实现并让视频对齐设计方向。
- 基线：干净9a34a1acd4ce445595bc1c8831d0ef933ab4c343，应用源码6181bdf；当前运行仍GG-385/5fd584d。
- 模式：Impeccable Operate，既有图片chat为视觉及交互依据，用户手动验收。
- 源码发现：图片chat固定660px受视口限制、距节点12px；空附件托盘隐藏、54px Attachment共用缩略/编号/移除/hover样式；参数摘要左、模型和积分生成按钮右；白色Popover参数用选项胶囊与比例卡；长提示词可展开/收起。视频目前默认520px/16px、始终出现添加素材卡、参数表单内嵌，触发及生成图标也各自实现。
- 范围：复用图片chat样式/primitives，视频专属模型/类型/参数及素材用途保持；空态不额外占附件行，上传/资产入口仍可找；同款提示词展开收起；模型/类型列表在输入/切换/取消选择时关闭；参数portal避免裁剪和chat高度跳变。无后台/计费/接口/数据变化。
- 决策：落实ADR0143既有一致性方向，更新其参数布局细则为图片同款下方Popover，不改变视频能力或价格。
- 工作区计划：根agent独占codex/gg-386-video-chat-consistency managed辅助目录，文件边界为视频节点TSX/CSS、视频提示词组件、相关设计/交互/手验/ADR/任务文档；不改图片chat或服务。精确集成后提交并归档辅助，不创建子agent/新依赖缓存。
- 验收：用户刷新5173手验两类chat默认宽度/留白、附件/鼠标预览/移除、左参数类型/右模型与积分、灰阶选项与比例卡、长文本展开、窄屏/资产侧栏/键盘，视频任务输入及重试保持。
- 验证边界：本轮只源码开发和集成，遵GG-276不自动构建/lint/typecheck/检查/测试/浏览器/HTTP/SQL/Provider或重启，保留GG-385运行receipt和临时价格。
- 状态：隔离源码完成，待精确集成/归档；未自动验收或部署。创建1/退役0，无依赖缓存。

## 实现记录

- 隔离工作区：C:/Users/Admin/.codex/worktrees/gg-386-video-chat/goodgood，分支codex/gg-386-video-chat-consistency，基线298d8ec1d81b73b79d0f0a2f4e7227fc5575ce84。无子agent。
- 所有者文件：canvas-video-generator-node.tsx/CSS、canvas-video-generator-prompt.tsx及canvas-video-generator-settings.tsx；设计/交互/手验/ADR0143及本卡。图片chat不改、后台与GG-385运行receipt不改。
- 改用660px/12px定位、Attachment及共享模型/积分按钮；加号移工具行，参数类型左/模型发送右；图片同款Portal参数、灰阶选项/比例卡，长输入展开/收起。角色/六类型/源输入冻结及报价保持。
- 初始空提示词不展示校验文字，真实失败/缺失素材不隐藏；菜单互斥，输入和取消选中关闭。工具区可见空间沿图片让位，减少动效模式无平移动画。
- 验证：仅源码实现；未执行自动编译、lint/typecheck/代码或diff检查、测试、浏览器、应用HTTP/SQL/Provider/生成/扣费/重启或生产操作。
- 下一步：精确提交及接入当前GG-116，再归档辅助；用户刷新5173手验。
