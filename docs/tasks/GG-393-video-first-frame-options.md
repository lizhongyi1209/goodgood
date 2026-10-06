# GG-393 · 简洁视频类型列表与仅首帧

- 日期：2026-10-06；用户要求移除类型功能描述、一图启用首尾帧，确认官方是否支持仅首帧。
- 基线：干净GG-116 / codex/gg-392-video-material-modes，HEADd2b8eb0；应用源码31a666c祖先已核验。当前分支codex/gg-393-video-first-frame-options。
- 官方依据：2026-10-06只读获取https://kling.ai/document-api/api/video/3-0-omni/video-omni.md，150–151行明确支持first frame only / first frame + last frame，不支持last frame only。公开缓存TEMP/goodgood-kling-api-audit-20261006，不加入Git；无Provider生成调用。
- 决策：补充ADR0143，替代GG-392两图门槛与必须有尾帧的本地限制。界面仅显示类型名称，禁用仍保留。
- 实现范围：一张图启用首尾帧；移除尾帧后仍保留当前类型/首帧。校验必须首帧但尾帧可选。只有首帧时使用现有image_to_video提交快照（同Omni接口/first_frame请求），兼容GG-391旧Web/Worker校验；有尾帧保留first_last_frame，不制造尾帧或更换计价。
- 边界：现有模型ID、上游路由、数量、价格、素材归属、保存、任务中锁定和冻结重试保持。无迁移/服务/生产操作，不自动编译/检查/测试/浏览器验收；用户手验。
- 生命周期：小范围改动复用干净集成目录，创建0/退役0，无子agent/依赖或缓存副本。
- 状态：源码已提交41c6fe88fcab8a7fc5c92e248162c79df65b0bf8；补充三项纯回归来源并更新GG-392一图可用/移除尾帧预期，均未执行。

## 开发结果

- 类型菜单只显示名称，移除副文案和专属样式，保留素材驱动禁用。
- 单图即启用首尾帧；首帧自动分配，尾帧不伪造。移除尾帧时保持该UI模式。
- 共用校验不再要求尾帧，仍要求首帧；只有首帧的新提交快照沿现有image_to_video，同Omni路由发送prompt/first_frame，不新增请求或费用。原冻结请求/失败重试不改写。
- 官方文档通过web工具打开因text/markdown类型不能解析；使用Node只读GET原官方.md成功200，并缓存仓库外。未使用第三方教程作为结论，也没有真实生成验证中转。
- 无自动构建/lint/typecheck/代码检查/测试/浏览器验收，无应用HTTP/SQL、Provider创建/查询任务、迁移/重启或生产操作。GG-391实际运行identity保持；用户刷新5173手验。

- 交接：源码41c6fe88fcab8a7fc5c92e248162c79df65b0bf8，创建0/退役0；后台仍GG-391 / 4ecd1db，不需重启即可用现有单帧契约。用户刷新5173进行手动验收。
