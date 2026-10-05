# GG-371 · 文件夹相册与紧凑批量组合查看

- 日期：2026-10-05；用户要求资产文件夹拖入画布形成一个相册、预览所有图片，一次连接批量素材组载入全部候选，并压缩查看组合的chat高度。
- 基线：干净a0fc6f9，已核验8e3e45b源码祖先；GG-366运行身份保持。
- 范围：资产侧栏已有文件夹拖放；相册为文件夹图片集合快照，过滤视频/音频/文本且不受侧栏当前媒体筛选或可见列表截断；只在一个相册中预览所有图，直接连批量候选端口，保持10张/请求和1–5组边界。列表当前接口无分页/LIMIT，可读取50及更多素材。移动/复制/删除/云恢复保持成员；不自动增减生成冻结输入。
- 决策：扩展ADR0108/0135与GG-370组合查看；相册使用album-ID的group wire+隐藏授权sourceImage子节点，云适配复用，不新增未知后台字段；相册端口用于批量候选组，避免普通或公共端口一次加载50张；相册是拖入时快照，不是实时文件夹同步。组合查看从inline细节改为单入口+有界Dialog分页，随机访问避免遍历巨大组合；chat保持短。
- 根agent：独立controller辅助；拥有canvas-page/workspace、相册UI/router/CSS、快照/恢复/复制/历史边界、相关docs；不改其他agent文件。
- batch_persistence：独立album-model辅助；拥有NEW canvas-folder-album.mjs/.d.mts与回归来源，canvas-asset-panel.tsx文件夹拖放回调/类型、canvas-groups.mjs/group-bounds.tsx相册隐藏子节点边界、canvas-reference-sources.mjs相册仅候选门控；不改root/preview文件。待create_worktree返回后登记绝对路径。
- batch_planner：独立preview辅助；拥有canvas-batch-reference-panel.tsx、canvas-batch-generator.module.css最小改动、NEW canvas-batch-combination-preview.tsx/.module.css、NEW canvas-batch-reference-page.mjs/.d.mts与回归来源；根保留控制器props接入，待返回后登记路径。
- 验证：沿GG-276仅开发/补有意义回归来源/精确集成；不自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收/HTTP/SQL/Provider/生成/扣费/运行或生产更新。
- 状态：已登记，隔离实施中；未验证/未部署。
- 下一动作：从本次登记SHA创建3个独立managed辅助并分工；完成限定源码集成后归档，用户刷新5173手验50图相册/连线/批量输入/紧凑组合分页。
