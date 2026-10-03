# GG-335 · 移除本地照片元数据提取入口

- 日期：2026-10-03；用户要求去掉元数据弹框「从照片提取」，并询问能否检测图片中的 AI 相关信息。
- 基线：GG-116/5173 `8bfa266`，包含已核验祖先 `5c32b19`；负责人为当前图片元数据窗口。隔离分支 `codex/GG-335-remove-photo-extraction`，工作区 `C:/Users/Admin/.codex/worktrees/gg-335-remove-photo-extraction/goodgood`。关联分组/文本窗口 idle，精确接入时保留其源码。
- 决策：先更新 ADR0136，取消另选本地照片导入参数。打开目标图自动读取/预填、实际参考图提取、复制/粘贴、手动编辑、还原/清除及下载/保存副本继续使用。AI 检测只解释能力与局限，不实现新的产品功能。
- 范围：只移除局部按钮、隐藏文件选择器及其引用，更新相关提示与当前产品/交互/错误/交接文档。不更改元数据解析写入、图像字节、生成记录、API、持久字段或后台。
- 验收：弹框没有「从照片提取」或本地照片选择流程；空状态提示手动填写/粘贴，当前图已有参数自动预填。现有参数操作和实际参考图入口保持。
- 验证边界：沿 GG-276 用户约定仅开发代码与集成，不运行编译、lint/typecheck、代码/diff检查、测试或浏览器验收；本轮不新增重复实现的小改测试。用户刷新5173手验。
- 生命周期：创建1/退役1；干净辅助工作区已managed归档，list_artifacts确认为archived_worktree。保留分支/提交，无子agent、依赖安装或缓存。
- 实现：移除 Upload 图标引用、隐藏文件选择器、fileRef 和本地导入按钮；弹框说明、无元数据/损坏提示改为当前图编辑与手动填写/粘贴。参考图提取保留独立加载文案和原草稿失败保护。其余逻辑没有新增行为。
- 状态：隔离提交30f1a62已精确接入GG-116/5173为f411a48，接入前GG-116为干净8bfa266，关联组窗口idle；GG-334/331及此前源码保留。未编译、lint/typecheck、代码/diff检查、测试或浏览器验收，未部署。无需后台更新，运行身份沿 GG-330 verified94bee535 及原 Web9448/唯一Worker23800/Vite33440/数据/SMTP receipt，本轮没有重查运行、HTTP/SQL/Provider或服务操作。
- 下一步：用户刷新5173、重开弹框，手验本地导入入口消失、当前图参数自动预填与复制/粘贴/手动填写、清除、下载/保存副本。AI信息检测仅说明，尚无新增开发范围。
- AI技术说明：本轮仅调研 [ComfyUI PNG生成记录](https://github.com/Comfy-Org/docs/blob/main/built-in-nodes/SaveImage.mdx)、[C2PA来源凭证](https://c2pa.org/faqs/)、[SynthID隐形水印](https://deepmind.google/models/synthid/) 和 [跨生成模型检测研究](https://openaccess.thecvf.com/content/CVPR2023/html/Ojha_Towards_Universal_Fake_Image_Detectors_That_Generalize_Across_Generative_Models_CVPR_2023_paper.html)。标记缺失不能证明实拍，相机EXIF可编辑，画面分类有泛化局限；未添加检测入口、外部上传或API。
