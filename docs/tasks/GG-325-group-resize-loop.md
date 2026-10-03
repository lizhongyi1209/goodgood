# GG-325 · 建组时 ResizeObserver 循环

- 日期：2026-10-03；用户截图：点击建组后出现 ResizeObserver loop completed with undelivered notifications，另有旧Web拒绝组字段的云同步提示。
- 基线：GG-116 `8e9eeb8`，已核验分组提交2fa0486是祖先。独立 `codex/GG-325-group-resize-loop`，`C:/Users/Admin/.codex/worktrees/gg-325-group-resize-loop/goodgood`，无子agent。
- 协作：GG-324图片对比在另窗/独立F:/goodgood-worktrees/GG-324-image-compare进行；此任务只改分组几何、测量调度及组内框CSS，不碰对比入口/弹框或服务。交付只精确集成本次提交并保留对方变化。
- 发现：React Flow原生节点ResizeObserver同步更新内部测量；当前组框使用百分比内容尺寸、浮点边界及可能未测量成员的回退尺寸，组测量/重包围时存在反复布局的条件。截图调用栈来自错误覆盖层，没有真实observer堆栈；未执行浏览器复现，不把推断写成已验证根因。
- 修复范围：明确整像素组尺寸、独立定位框内容；等成员/父组测量完成后包围，采用持久节点坐标，读写分帧且丢弃过期计划，避免在通知期间反复改布局。不捕获或屏蔽ResizeObserver错误，不修改依赖或全局observer。
- 决策：保持ADR0135交互/存储，无新产品决定；不激活旧Web，云保存错误和前端测量循环分开。
- 验收：点击建组/快捷键不再出现循环覆盖层；组框/成员不跳位，独立拖动/叠图展开/命名和emoji、保存恢复保持。没有自动生成或运行数据操作。
- 验证边界：沿最新源码交付约定，必要回归来源只写；不自动编译/lint/测试/代码检查或浏览器验收。源码修复与已复现/已验证/后台激活分别记录。
- 状态：隔离源码修复完成；创建1/退役0，无依赖/缓存/服务操作。groupFrame向外取整并同时声明width/height与style，已恢复style-only组一次归一；一像素容差吸收测量噪声。框内容改absolute/inset，不参与父尺寸计算。组/成员完整measure和handleBounds就绪后才拟合，以持久节点坐标计算绝对位置，下一帧提交且节点数组身份变化即取消计划，卸载清除待读/待写帧。
- 回归来源：扩展tests/gg323-canvas-groups.test.mjs的浮点边界/重复亚像素噪声、明确尺寸、展开图片、旧style-only恢复及成员绝对坐标，未运行。无编译/lint/测试/检查或浏览器验收，不能宣称报错已在浏览器复现并验证消失。
- 下一步：精确集成本次源码、干净退役工作区；用户刷新重试建组，原云group字段仍待另外受权激活Web。
