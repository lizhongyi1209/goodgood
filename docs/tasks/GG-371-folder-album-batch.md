# GG-371 · 文件夹相册与紧凑批量组合查看

- 日期：2026-10-05；用户要求资产文件夹拖入画布形成一个相册、预览所有图片，一次连接批量素材组载入全部候选，并压缩查看组合的chat高度。
- 基线：干净a0fc6f9，已核验8e3e45b源码祖先；GG-366运行身份保持。
- 范围：资产侧栏已有文件夹拖放；相册为文件夹图片集合快照，过滤视频/音频/文本且不受侧栏当前媒体筛选或可见列表截断；只在一个相册中预览所有图，直接连批量候选端口，保持10张/请求和1–5组边界。列表当前接口无分页/LIMIT，可读取50及更多素材。移动/复制/删除/云恢复保持成员；不自动增减生成冻结输入。
- 决策：扩展ADR0108/0135与GG-370组合查看；相册使用album-ID的group wire+隐藏授权sourceImage子节点，云适配复用，不新增未知后台字段；相册端口用于批量候选组，避免普通或公共端口一次加载50张；相册是拖入时快照，不是实时文件夹同步。组合查看从inline细节改为单入口+有界Dialog分页，随机访问避免遍历巨大组合；chat保持短。
- 根agent：独立controller辅助；拥有canvas-page/workspace、相册UI/router/CSS、快照/恢复/复制/历史边界、相关docs；不改其他agent文件。
- batch_persistence：独立album-model辅助；拥有NEW canvas-folder-album.mjs/.d.mts与回归来源，canvas-asset-panel.tsx文件夹拖放回调/类型、canvas-groups.mjs/group-bounds.tsx相册隐藏子节点边界、canvas-reference-sources.mjs相册仅候选门控；不改root/preview文件。实际路径见下方。
- batch_planner：独立preview辅助；拥有canvas-batch-reference-panel.tsx、canvas-batch-generator.module.css最小改动、NEW canvas-batch-combination-preview.tsx/.module.css、NEW canvas-batch-reference-page.mjs/.d.mts与回归来源；根保留控制器props接入，实际路径见下方。
- 验证：沿GG-276仅开发/补有意义回归来源/精确集成；不自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收/HTTP/SQL/Provider/生成/扣费/运行或生产更新。
- 状态：相册模型、拖入/恢复/复制/删除、相册预览及紧凑组合分页源码已在隔离controller完成；待精确接入当前开发目录。未自动验证/未部署。
- 下一动作：精确接入当前开发目录、归档3个辅助并同步当前检查点；用户刷新5173手验50图相册/连线/批量输入/紧凑组合分页。

## 实际辅助目录

- 根agent：C:/Users/Admin/.codex/worktrees/gg-371-folder-controller/goodgood，codex/GG-371-folder-controller。
- batch_persistence：C:/Users/Admin/.codex/worktrees/gg-371-album-model/goodgood，codex/GG-371-album-model。
- batch_planner：C:/Users/Admin/.codex/worktrees/gg-371-combination-preview/goodgood，codex/GG-371-combination-preview。
- 三个辅助从同一登记6ef1e0b创建；本轮不新建依赖缓存，完成各自限定提交后精确集成并逐个归档。

## 实施记录

- 相册模型原始提交e7c62e70e1a0e01010157989c40001425ea3ef1d，controller精确接入bedcaf0；紧凑分页原始提交2ed7c38ab07c3869ba79edc3cf6ad82777dcc596，controller精确接入cdcd881。
- 相册固定360×300，5列内部滚动预览全部成员，点击复用既有大图查看，单图读取/失败重试及空相册禁连；资产完整授权列表构成拖入时快照。隐藏子节点保持真实asset/reference身份，不按名称推断。
- 相册整体移动/复制/删除与云恢复，禁止通用解组/嵌套组合使成员泄漏；候选端口一次扩展全部成员，公共/普通端口拒绝，原10图实际请求上限和生成冻结保持。
- chat仅保留查看组合按钮，Dialog每页12组，完整总数/图序、前后翻页及跳页；巨量组合按混合进位直接定位目标页，保留配对单图复用。
- 回归来源tests/gg371-folder-album.test.mjs与tests/gg371-batch-reference-page.test.mjs仅写未运行；未执行自动代码或diff检查、测试或真实请求。
