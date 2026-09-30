# GG-222 · 多选节点快速排列与选区几何

- 日期：2026-09-30。
- 状态：独立树实现已完成并精确回放GG-116/5173源码；待站长手验，未部署。
- 来源：站长要求框选后显示常用排列图标，并修复部分节点超出选区边框。
- 决策：新增手动排列，延续GG-135撤下时保留的未来方向；不恢复拖动辅助线/吸附。实施前已补ADR0110。
- 隔离来源：`F:/goodgood-worktrees/GG-222` / `feature/GG-222-canvas-selection-arrange`从verified05e90d2建立，祖先核验；当前选区/节点及设计文档明确保存为基线11e74ce，不覆盖GG-219/GG-221或其它dirty内容。

## 范围与验收

多选时，选区上方显示自动整理、左/水平居中/右对齐、顶/垂直居中/底对齐七个常用图标。灰黑紧凑工具栏支持键盘、说明、焦点与禁用状态。仅修改节点位置，保留媒体比例、单节点批次、连接和生成设置；进入现有每页撤销/重做及内容保存。

静态源证据：React Flow原生NodesSelection使用内部measured body矩形；metadata绝对定位在body上方22px；生成器卡片通过overflow:visible和局部expandedKey向右/下变换。因此原生body矩形不能覆盖这些可见内容，尚未声称浏览器复现。修复后的视觉边框包含可见metadata/卡片，排除端点、不可见控制区、下方chat。视角缩放转换、不同真实尺寸和批次展开占位共同参与布局计算；不改变node真实宽高。

## 验证与交接

遵照持续不复测指示，不运行测试/check:local/构建/浏览器；不触发真实请求、服务重启或数据库改动。仅源审阅、精确差异检查；补有意义的几何/排列测试定义但不执行。最终只回放本任务相对明确基线的差异。

实现文件：`canvas-selection-layout.mjs`提供矩形并集、可见stack目标占位和七种纯位置排列；`canvas-selection-controls.tsx`在React Flow内订阅store，以选中节点局部缓存和RAF直接写选框CSS变量/工具栏坐标。仅选中内容DOM被观察，不监听自身style，也不逐帧setState镜像全部节点。`canvas-generator-node.tsx`暴露临时stack属性和占位变化事件；`canvas-workspace.tsx`/CSS接入工具栏，扩展原生多选矩形而保留drag/键盘。

自动整理以可见矩形上到下、左到右的稳定阅读顺序排成ceil(sqrt(n))列；各列宽/行高按最大真实占位计算，间距24px。metadata包含真实DOM行及生成器星点；stack按目标公式计算，收起/展开过渡保留旧/新占位并集240ms。有限坐标和正数实测尺寸才可排列；缺测量、框选进行中或拖动/缩放时隐藏或禁用，空/无变化动作不进入历史。七个灰黑图标保持固定屏幕像素，贴着选区上方并在屏幕边缘让位；没有新菜单。

排列仅替换现有节点position；批次、尺寸、data和edges保持。动作前调用既有onBeforeGraphEdit，完成onProjectGraphChange(true)进入当前每页保存/历史。整个活动页pending上传/生成或参考图未ready时，既有canvasGraphIsStable历史暂停保护继续生效；本任务未扩大历史体系，也未恢复GG-135拖动辅助线/吸附。

新增`tests/gg222-canvas-selection-layout.test.mjs`六项几何/排列定义，覆盖占位、混合尺寸防重叠、六对齐、读取顺序、输入不变、空/未测量/非法输入与no-op；全部未执行。静态源码不能替代浏览器效果或Undo行为验证。

交付：隔离实现提交146d51c，以11e74ce→146d51c精确patch回放8文件；DESIGN_SYSTEM/UX_FLOWS因其它窗口新增顶段，仅逐段插入本任务新增内容。没有整树复制/merge；所有其它窗口段落保持。独立树与目标源码归一化比对及git diff --check为本次静态检查，未执行自动或浏览器验证。

下一步：站长手验多种节点、缩放/拖动、展开/收起批次与每页撤销和保存。后端仍verified05e90d2/55迁移；GG-219/GG-220/GG-221/GG-223及其它窗口更改保持。
