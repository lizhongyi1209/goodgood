# GG-377 · 文件夹相册手动伸缩

- 日期：2026-10-05；用户指定Impeccable，要求画布中的文件夹手动伸缩，减少大面积空白。
- 基线：干净5dd79d92dfa1e4a04836bfa212f0e82a61fe7f5c，已核验GG-376源码93780ce祖先；集成目录F:/goodgood-worktrees/GG-116。GG-374运行receipt保持。
- 决策：更新ADR0135，新增相册手动四角宽高调整；保留360×300初始尺寸、快照成员/候选端口和既有group manual geometry。宽高可独立调整，沿普通组200×120最小尺寸；没有固定比例或新存储字段。
- 设计：Impeccable Operate，沿图片节点透明四角命中区、斜向光标和键盘焦点；仅选中显示命中控制，不加可见装饰/弹框。预览列随宽度自适应，超过高度内部滚动，底部说明保留。
- 所有权：根agent单独实现codex/GG-377-album-resize，C:/Users/Admin/.codex/worktrees/gg-377-album-resize/goodgood。限定相册TSX/CSS、既有gg371回归来源和相关文档；创建1，无子agent/依赖缓存。
- 复用：原生NodeResizeControl、GroupActions历史/保存与既有resizeCanvasGroup键盘几何。回调保持稳定，不因逐帧nodes变化重装原生监听；相册内容边界已排除隐藏素材，不限制缩小。
- 验收：选中旧/新/空相册，拖四角可独立调宽高并收紧高度；左/上角对边保持，整体拖动/预览/滚动/连线继续可用。最小尺寸/键盘方向键10px、Shift50px及缩放/触屏；保存刷新、复制/撤销仍保留尺寸，50张隐藏成员/真实相机尺寸及候选关系保持。
- 协作约定：沿GG-276不运行自动构建/lint/typecheck/代码或diff检查/测试/浏览器/HTTP/SQL/Provider验收，回归仅写来源；不更新后台/服务/生产，不提交生成/扣费，GG-374运行身份未重查。
- 状态：源码与有意义回归来源完成，待限定提交及精确接入；未自动验收/未部署。
- 下一步：用户刷新5173手验四角收紧空白及保存恢复。

## 实现

相册选中时使用原生NodeResizeControl及图片的透明四角/可焦点空按钮，单独恢复命中事件，稳定start/end callback沿现有GroupActions捕获历史并提交手动宽高；方向键复用既有resizeCanvasGroup，隐藏成员不构成最小内容限制。缩略区使用auto-fill/56px最小列宽，说明不被压缩，整体移动/圆点/预览及内部滚动保持。原有group宽高/手动标记已被保存与云端认可，没有新字段/迁移/运行更新。

回归仅补既有文件来源，未自动构建/检查/执行测试或浏览器/API/SQL/Provider验收，未发起生成/扣费或生产操作；GG-374运行receipt保持未重查。
