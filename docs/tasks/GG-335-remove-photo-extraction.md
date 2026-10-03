# GG-335 · 移除本地照片元数据提取入口

- 日期：2026-10-03；用户要求去掉元数据弹框「从照片提取」，并询问能否检测图片中的 AI 相关信息。
- 基线：GG-116/5173 `8bfa266`，包含已核验祖先 `5c32b19`；负责人为当前图片元数据窗口。隔离分支 `codex/GG-335-remove-photo-extraction`，工作区 `C:/Users/Admin/.codex/worktrees/gg-335-remove-photo-extraction/goodgood`。关联分组/文本窗口 idle，精确接入时保留其源码。
- 决策：先更新 ADR0136，取消另选本地照片导入参数。打开目标图自动读取/预填、实际参考图提取、复制/粘贴、手动编辑、还原/清除及下载/保存副本继续使用。AI 检测只解释能力与局限，不实现新的产品功能。
- 范围：只移除局部按钮、隐藏文件选择器及其引用，更新相关提示与当前产品/交互/错误/交接文档。不更改元数据解析写入、图像字节、生成记录、API、持久字段或后台。
- 验收：弹框没有「从照片提取」或本地照片选择流程；空状态提示手动填写/粘贴，当前图已有参数自动预填。现有参数操作和实际参考图入口保持。
- 验证边界：沿 GG-276 用户约定仅开发代码与集成，不运行编译、lint/typecheck、代码/diff检查、测试或浏览器验收；本轮不新增重复实现的小改测试。用户刷新5173手验。
- 生命周期：创建1/退役0，辅助工作区待接入后归档；无子agent、依赖安装或缓存。
- 实现：移除 Upload 图标引用、隐藏文件选择器、fileRef 和本地导入按钮；弹框说明、无元数据/损坏提示改为当前图编辑与手动填写/粘贴。参考图提取保留独立加载文案和原草稿失败保护。其余逻辑没有新增行为。
- 状态：源码与产品/交互/错误/手验文档已修改，待提交和精确接入；未验证、未部署。运行身份沿 GG-330 verified94bee535 及原 Web9448/唯一Worker23800/Vite33440/数据/SMTP receipt，本轮不重查或操作服务。
- 下一步：提交后精确接入GG-116并归档辅助工作区，用户刷新手验。
- AI技术说明：本轮仅调研 [ComfyUI PNG生成记录](https://github.com/Comfy-Org/docs/blob/main/built-in-nodes/SaveImage.mdx)、[C2PA来源凭证](https://c2pa.org/faqs/)、[SynthID隐形水印](https://deepmind.google/models/synthid/) 和 [跨生成模型检测研究](https://openaccess.thecvf.com/content/CVPR2023/html/Ojha_Towards_Universal_Fake_Image_Detectors_That_Generalize_Across_Generative_Models_CVPR_2023_paper.html)。标记缺失不能证明实拍，相机EXIF可编辑，画面分类有泛化局限；未添加检测入口、外部上传或API。
