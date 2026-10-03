# GG-336 · C2PA内嵌内容凭证识别与清除

- 日期：2026-10-03；用户希望在现有图片元数据功能中识别 C2PA 数据并清理。
- 基线：当前GG-116/5173干净242765d，已核验f411a48祖先；负责人为图片元数据窗口。隔离分支codex/GG-336-c2pa-metadata，工作区C:/Users/Admin/.codex/worktrees/gg-336-c2pa-metadata/goodgood；关联组/大厅窗口idle。
- 决策：先扩展ADR0136。JPEG APP11的C2PA JUMBF、PNG caBX内嵌凭证存在检测接入原弹框，既有清除动作移除凭证。检测不代表验签或AI定论；不新增SDK/后台/远端查询或水印处理。
- 文件边界：image-file-metadata.mjs/.d.mts、局部元数据弹框TSX、必要合成回归来源与当前专题/交接文档。20MiB JPEG/PNG、副本提交/源图保护及GG-335本地导入移除保持。
- 验收：普通、带凭证及检测未完成有明确提示；JPEG多分片/跨扫描和PNG caBX清除不损坏像素/色彩结构，不误删其他APP11；EXIF坏而容器可处理时仍保留原C2PA检测结果。清除待保存/下载才写副本；取消/还原及普通编辑规则明确。
- 验证边界：沿GG-276用户约定只开发代码/精确接入，必要回归来源只写，不运行编译、lint/typecheck、代码/diff检查、测试或浏览器验收。无真实图片外部上传、HTTP/SQL/Provider/运行或生产操作；公开技术资料只读。
- 生命周期：创建1/退役0，提交接入后归档辅助工作区；无子agent、依赖安装或缓存。
- 实现：新增独立readImageFileC2pa及metadata.c2pa状态；JPEG按完整Manifest Store UUID/标签与instance/root header识别分组，LBox/XLBox重复头/描述分片及跨扫描支持，PNG识别caBX。清除只移除确定的C2PA组/块，不误删其他APP11；无法确认归属的损坏数据拒绝部分清除，确定UUID的破损组允许整组移除。普通编辑保留凭证字节，弹框标明未验签/可能失效及水印/外部范围；坏EXIF恢复保留原凭证状态。
- 回归来源：tests/gg336-image-c2pa-metadata.test.mjs为纯合成容器，覆盖普通/多片/XLBox/跨扫描、非C2PA保留、PNG多块与像素色彩原样、普通编辑、坏EXIF、破损可识别/未知、无效结构；按约定只写未运行，未使用真实凭证或照片。
- 状态：实现及产品/交互/架构/错误/手验文档已修改，待提交接入；未编译/检查/测试/浏览器验收、未部署。运行身份沿GG-330 verified94bee535/原Web/唯一Worker/Vite/数据/SMTP receipt，无后台更新需求。
- 下一步：提交、精确接入当前预览并归档辅助工作区，用户刷新手验内嵌凭证提示与清除副本；真实签名验证和远端凭证不在本轮范围。
