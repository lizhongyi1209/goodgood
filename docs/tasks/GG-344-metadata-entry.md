# GG-344 · 添加数据入口恢复

- 日期：2026-10-03；用户要求「增加元数据」重命名「添加数据」，恢复启用。
- 基线：干净52b4947，确认含f094397当前应用检查点；managed隔离codex/GG-344-metadata-entry，路径C:/Users/Admin/.codex/worktrees/gg-344-metadata-entry/goodgood，无子agent。
- 决策：先修订ADR0136显示名称；共享快捷按钮/悬停/无障碍名称及弹框标题统一「添加数据」，恢复所选图片的编辑入口，读取/写入/副本/10积分去除AI逻辑不变。
- 现状：源码入口disabled来自MetadataContext.enabled，Provider以cropEnabled和当前裁剪状态控制；cropEnabled含项目恢复、切页与账户条件。没有用户故障堆栈或浏览器复现，已异步询问具体是灰色/无弹框/报错，先完成命名。
- 范围：添加数据的共享入口与启用条件、必要文档；不改后端/数据库/计费或其他功能。
- 验证边界：沿GG-276只修改/精确集成，不构建/lint/typecheck/代码diff检查/测试或浏览器验收，不迁移/重启/Provider/真实扣费/生产操作，原GG-342后台receipt保持。
- 状态：源码实现完成，待精确集成与用户刷新手验；无浏览器故障复现，不能将代码调整当作用户验收。

- 恢复实现：MetadataProvider启用条件改为既有受权素材能力assetLibraryEnabled且无裁剪弹层，解除与裁剪/项目就绪开关的联动；未登录/禁用账户/预览仍保持权限门控。上下文与hook移到独立canvas-image-metadata-context.ts，工具栏与Provider共享同一实例，避免编辑器模块热刷新导致消费方取到默认disabled状态的风险。原onCommit的项目就绪/切页/身份/源图匹配校验、原图读取错误/副本保存/取消生命周期保持。不能确认用户当前故障的唯一触发原因，未浏览器重现。
