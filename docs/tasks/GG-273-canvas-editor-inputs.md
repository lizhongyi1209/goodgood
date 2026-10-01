# GG-273 · 文本编辑器与统一输入附件收口

- 日期：2026-10-01；状态：已实现/定向验证并进入实际5173/本地Web，未部署生产；浏览器验收由用户负责。
- 基线：实际5173目录GG-116干净`bc4940b`，核验`c4b10b8`祖先，保留GG-272资料/品牌；隔离`fix/GG-273-canvas-editor-inputs` / `F:/goodgood-worktrees/GG-273-canvas-editor-inputs`，创建1/退役0，无子agent/重复依赖。
- 验收：文本节点有明确编辑器页头/文档区/状态区及选中快捷栏，补H1/H3；文本圆点复用图片节点样式。图片生成器永远一个接收端，支持图片和文本；旧双端口文本连线不丢失。图片/文本/视频附件复用同尺寸文件卡和同族图标、预览/删除/重试保持。
- 决策：用户修正ADR0124的独立文本输入端口，改为单一reference接收端、类型由来源节点/输出端口判定。旧text目标端接受并规范化；无需SQL迁移，后端验证需本地Web同步；视频样式复用既有视频创作附件，不发送到图片API。
- 设计：应用项目Impeccable局部规范，参考Tiptap Simple Editor与AI Elements Attachments；沿用已装Tiptap和项目Attachment/Radix组件，无新组件库依赖。
- 所有权：canvas编辑器/生成器/文本选择与持久化/输入附件，复用视频附件展示、项目验证/相关定向测试及本卡/相关决策与文档；不改账户/大厅品牌/生成provider。
- 验证：定向Markdown/连线兼容/附件各媒体/项目保存、局部lint/类型/实际模块编译与必要Web构建；无浏览器、真实生成/上传、生产写入或全量门禁。
- 实现：编辑器有可拖动页头、完整书写命中区与字符状态、分组格式栏H1/H2/H3；圆点直接复用referenceOutputHandle。生成器仅保留reference输入，图片/文本按sourceHandle分类，文本不占参考图数；旧text目标在runtime/快照/服务验证规范化且原ID不变。图片/文本和既有视频创作附件共用InputAttachment与160×52px文件图标卡，Popover或既有预览对话框/上传重试/删除保持；不把视频接入图片API。
- 精确集成：源码`17ec871`→`e7ae650`；测试`f7369f5`→`f51b6ba`，收口`397d735`→`b9ce4bf`。保留GG-272等并行交付，无依赖变更。
- 验证：GG-273 8/8（真实React Flow SSR外壳端点/编辑器/标题/旧边/云传输/统一卡片状态），既有Markdown/项目/分页22/22；类型与局部lint零错误（10既有警告），必要checkpoint build/verify通过。源/制品指纹`21d8ee6f4f5b888d74720ec8f3f329545bc3037d63b084cae69e64f43ca7f057` / `1a77a9390a4d740c68f07b4813d139318abccf07d30630e6fb3b1b10dd263530`，283文件，2026-10-01T14:15:35.939Z；Web revision`b9ce4bf88d4420f193d8fe42231de446f61c7135`，数据/云配置保持。
- 生命周期：创建1/退役1，无子agent，无辅助依赖/缓存；clean/ignored/进程/绝对路径核对后原生Git退役，保留分支/提交。沿用两份忽略portfix，Web同步、Vite和唯一Worker保持；无SQL/生产/真实资源写入。
- 下一步：用户刷新5173验收四项纠正；按当前HEAD继续小需求，免费政策仍待用户。
- 运行核对：32131 version verified/readiness200、原32142 readiness200，五个实际新/改Vite模块HTTP200；原cloud-development配置加载，本地数据与迁移0060保持，无本轮SQL操作。文档连续性9/9、diff通过。
