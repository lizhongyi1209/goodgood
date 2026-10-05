# GG-384 · 画布Kling视频生成节点

- 日期：2026-10-05。用户接受按其O1Key附件开发，并要求Impeccable/既有chat视觉一致性；GG-382方案与官方对照为设计依据，线上契约按用户附件。
- 基线：GG-116干净b993e3c，含当前GG-383 a4caee5和GG-380/379。当前IMPLEMENTATION_PLAN的5f5e7fb为历史基线，已从Git核实新增集成事实；不从main或C6开始。
- 负责人：根agent，无子agent。独立managed worktree C:/Users/Admin/.codex/worktrees/gg-384-kling-video/goodgood，分支codex/gg-384-kling-video，b993e3c隔离，6e3cc56同步仅本任务注册。所有权为shared视频契约、server/video-generation、0068与账本列、canvas视频组件/连接/保存恢复、必要runtime接线及文档/合成来源。保持GG-383上传去重、批量/相册、既有任务和运行身份。
- 接受范围：视频生成编号节点、三块chat（模型/生成类型/参数）、六类角色素材、单接收端口、原生视频输出及统一缩略/hover/状态、任务持久恢复/失败重试/视频结果私有资产；调用附件Omni/Motion路径/结构，不新增官方element/声音库或其他视频模型。
- 视觉：Operate，复用图片chat的660px受视口约束宽度、灰阶、素材54px方卡、auto-grow提示词、固定底栏/向下设置、ArrowUp生成、Radix菜单和一致状态。空态16:9/Film，真实比例结果，默认封面/hover静音播放及统一端口。
- 价格决定：用户选择按模型/分辨率/时长配置；已实现Web端GOODGOOD_VIDEO_CREDIT_RATES_JSON正整数每秒积分矩阵与权威报价。Omni取选定秒数，Motion按受权视频解码时长向上取整。五档每秒数值已异步询问、尚未给出；无默认/免费/固定20，也不使用中转cost作为平台积分。
- 运行边界：仅代码开发/必要合成测试来源，不自动编译/lint/typecheck/代码检查/测试/浏览器验收，不执行迁移或后台重启，不访问应用HTTP/SQL/Provider或发起付费请求/生产操作。GG-374运行receipt保留，激活待代码完成后的用户独立委托。
- 实现：编号16:9节点、共享图片chat样式/三块控件、六类型参数/用途校验、54px素材及hover/移除/上传/资产选择、文本前置合并、视频真实比例/静音hover/查看/下载、video→text/video连接、旧后台创建能力保护、草稿/冻结输入/输出保存恢复及复制保护。独立持久任务+原Worker最大2并发租约轮询，预留/成功结算/明确失败释放，未知POST不再付费提交，保存失败只保存。上游错误脱敏并可折叠查看，原始素材复用，不调用重复参考上传接口。
- ADR0143接受画布Kling持久任务与计价方向，Seedance预览保持。新增0068未应用，GG-383的0067未由本任务应用/核验。十四项合成回归来源已写未运行，包括空/成功/加载/失败、接口/计价/未知POST/保存/连接/持久化边界。
- 源码接入：6181bdf306cc85a2c59313e41b34d4d760fbf941（隔离a401316f40a7e6056107df759d58b370d146f635），当前GG-116/fix/GG-275-text-editor-layout，精确cherry-pick至干净1bb3b1e，保留并行GG-383交接；50个本任务文件，未从main/C6整合。代码已交付，未验证/后台启用/部署。
- 生命周期：创建1/退役1，managed辅助归档已确认（attachment为archived_worktree）；无安装依赖/构建缓存/子agent。下一步为用户给出五档价格，再另行委托0067/0068、Web/唯一Worker构建重启并手验；本轮不执行，未自动测试/检查/编译或浏览器验收。
