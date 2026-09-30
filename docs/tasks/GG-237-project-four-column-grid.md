# GG-237 项目四列与紧凑预览

- 日期：2026-09-30。
- 状态：隔离实现cdef5ea已精确合入GG116/5173，静态审阅通过；待站长手验，未复测或部署。
- 需求：用户确认GG236外框正确，要求项目卡片缩小，一行可以放4个。
- 工作树：F:/goodgood-worktrees/GG-237-project-grid / fix/GG-237-project-four-column-grid。
- 基线：verified70e10c6，05e90d2祖先已核验；GG116当前项目TSX/CSS/design/UX/ADR显式快照c9a8927。只交付快照之后任务增量，保留所有其它窗口。
- 决策：实施前追加ADR0114 GG237，变更原三列及1.48预览比例。

## 范围与验收

项目可用内容宽度>=960px为四列、>=720px三列、>=480px两列、更窄一列；两类封面统一4:3。局部CSS Module与容器查询覆盖全局旧列数，随侧栏及屏幕可用空间调整。已有12px间距、浅灰外框、圆角、hover/focus1.015倍/180ms、reduce-motion和名称省略保持。宽度1420px时封面约332×249，旧三列约451×305，因此整体更小。

画布快照仍按SVG xMidYMid meet完整居中，旧创作图片保留原object-fit/object-position。不改变进入、恢复、重命名/删除、快照重试、加载/空/错误状态、任何数据接口或运行服务。

## 验证与下一步

沿用站长不复测限制，仅静态源码及精准diff检查，不运行tests/check:local/typecheck/build/浏览器/CUA/API/provider/服务/数据库/部署。可逆布局无需镜像CSS测试；交付后由站长刷新手验四列、紧凑封面与窄屏换列。

实现只增加section/grid两个局部类及容器查询、覆盖封面aspect-ratio；局部双类选择器优先于全局旧列数/比例，不依赖加载次序。源码核对快照preserveAspectRatio、hover/focus/reduced-motion及所有控件原逻辑保持；隔离git diff --check通过，不等于实际浏览器视觉验证。

交付：c9a8927→cdef5ea六文件任务增量经git apply --check后精确回放GG116。前端源与隔离实现归一化一致，限定diff检查通过；不合入基线快照、保留GG235及其它窗口改动。后端70e10c6/56迁移保持。下一步站长刷新手验>=960px内容宽度四列及窄屏3/2/1列、封面大小与原默认外框/hover轻放大。
