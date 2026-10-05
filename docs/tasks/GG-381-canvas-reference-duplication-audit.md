# GG-381 · 画布原始参考图重复创建分析

- 日期：2026-10-05；用户要求思考画布一系列操作是否会重复创建同一张原始参考图。
- 范围：只读源码分析添加/拖放、相册、复制粘贴、上传/重试、生成参考转换、组合去重、保存恢复。没有要求实现新的合并或去重规则。
- 基线：干净5e1d3054748f067475a0ce4f8fed9402f19390e2；源码5f5e7fb8048db8f5b8b9537f6d37f078f70bc83f，GG-379空图保护保留。
- 决策：不改变已有多节点/快照/副本产品决定，无新增ADR；下方改进均是建议。
- 所有权：根agent只读分析与交接文档，F:/goodgood-worktrees/GG-116；创建0/退役0，无子agent或依赖缓存。
- 验收：明确节点重复与存储资产重复的边界、正常主动副本及可重复上传风险，指出已有保护和下一步建议。
- 状态：源码路径分析完成；未核验用户实际资产数量，未实现去重/合并，未运行自动检查/测试或浏览器验收。
- 下一步：用户选择新的开发需求时，优先补上传操作幂等及同一文件复用；不自动删除/合并现有素材或限制主动节点复制。

## 证据与判断

| 路径 | 现状与边界 | 源码证据 |
| --- | --- | --- |
| 资产重复拖入 | 每次随机创建新节点，assetId保持，非新文件上传 | canvas-page.tsx:addLibraryAsset（1370） |
| 节点/相册复制粘贴 | 新节点ID，源图data.assetId和ready参考ID复制；相册包含全部隐藏成员 | canvas-page.tsx:pasteCanvasSelection（1035） |
| 文件夹重复拖入/单图与相册交叉 | 新album/member节点，同原资产身份；只在同文件夹数据中按kind+id过滤重复 | canvas-folder-album.mjs:20/36/52；canvas-page.tsx:1353 |
| 本地拖放/外部图片粘贴/直链 | 新节点/上传行，每个新的上传意向随机资产ID，无完整文件内容复用 | canvas-page.tsx:1213；canvas-asset-add-card.tsx:makeRow；server/references/repository.mjs:5/19 |
| 上传失败后完整重试 | uploadOne重新POST，clientId不持久作为幂等键；后端若前次已ready而前端未确认，可重复成功入库 | http-reference-upload.ts:159/168；repository.mjs:19/40 |
| 同一次上传内的重试 | PUT重试沿同intent；complete未知结果按原referenceId轮询；已拿到ready ID后归档/预览重试复用 | http-reference-upload.ts:95/118；canvas-page.tsx:startLocalUpload；canvas-asset-add-card.tsx:runRow |
| 生成图转参考 | 客户端按源assetId合并进行中请求和ready结果；后台稳定派生ID及授权事务锁复用，首次可新增一份参考副本 | canvas-generated-reference-import.ts:27/34/37；server/references/api.mjs:94；repository.mjs:58/88 |
| 实际送图去重 | 按源资产/转换后的参考ID和桶内身份去重，每个组合最终按reference.id去重；不同ID相同内容不会合并 | canvas-reference-sources.mjs:identities/uniqueCanvasReferenceInputs；canvas-batch-reference-plan.mjs:9 |
| 单次粘贴重复事件 | files优先items，同File对象Set去重；阻止冒泡/已处理事件，未提供文件字节去重 | canvas-clipboard.mjs:readCanvasClipboardImages/handleCanvasClipboardPaste |
| 恢复/历史/任务状态 | restore/撤销使用setNodes整页替换；同runKey结果先移除同前缀再upsert，没有观察到无条件追加同原图 | canvas-page.tsx:1114/2461；canvas-job-nodes.mjs:13 |

优先建议：同一上传操作只产生一份资产（重试/并发/未知结果幂等），独立重选同一完整字节文件在同owner/workspace授权范围内复用，节点仍可多次引用。不能按文件名、缩略图URL或屏幕外观判断同文件，也不能跨身份共享私有素材；添加数据/裁剪/标注等主动产出独立版本保持。旧资产不自动删除/合并。

## 当前交付

GG-381完成用户要求的画布原始参考图重复创建源码路径分析；应用源码仍为GG-380 5f5e7fb8048db8f5b8b9537f6d37f078f70bc83f，本轮基线5e1d3054748f067475a0ce4f8fed9402f19390e2。资产重复拖入/节点复制/相册重复拖入会新增节点但复用assetId；文件夹内按kind+id去重，独立图片与相册可同时引用同图。重复本地文件/外部粘贴/直链上传可新增reference资产，未按文件内容复用；完整重试重新POST上传意向时后台仍随机新ID，clientId仅关联返回，存在原请求已成功但前端未确认后的重复风险。同一次PUT重试/complete状态轮询沿原ID；生成图转参考则有客户端按源assetId共享缓存及后台稳定ID/事务锁复用。送图按参考ID去重，不识别不同ID的相同文件。恢复/撤销替换节点，结果按runKey upsert；未见这些路径无故追加原始源图。建议优先同操作上传幂等，再做同授权范围内完整文件字节复用，保留主动多节点与编辑副本；仅建议，未改变产品决定或实现去重。只读源码分析/文档，无测试/编译/浏览器/HTTP/SQL/Provider、数据/服务或生产操作；当前真实画布是否已有重复资产未读取核验。创建0/退役0，无子agent/缓存。
