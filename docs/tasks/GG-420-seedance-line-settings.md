# GG-420 · Seedance线路移入视频参数

- 日期：2026-10-08；状态：源码修改完成；界面与交互由用户手验。
- 用户授权：将HC/MAX改为左侧参数「线路」，值Doubao/Dreamina；模型列表与Kling保持一致。
- 基线：GG-116干净2e14ad6，GG-418源码90a46ea祖先已核验；分支feature/gg-420-seedance-line-settings。
- 范围：仅画布视频参数、摘要与模型菜单；Seedance线路移入左侧参数面板，模型菜单只保留统一图标/型号/勾选行，移除HC/MAX展示。内部standard/backup、上游型号、价格和冻结任务沿现有逻辑。
- 决策：调整GG-418已确认的线路位置与显示名称，先补ADR0143；仅呈现变化，不增加模式或API参数。
- 验收：Seedance可在左侧选Doubao/Dreamina，摘要显示当前线路；Kling不显示此参数；模型选择自由且受既有后台能力保护；换模型保留线路，草稿变化走现有保存/报价，冻结请求不改写。
- 边界：按用户既有要求只改源码；不自动构建、检查、测试、浏览器验收或重启，不HTTP/SQL/Provider/生成/扣费，不触碰生产/GitHub/外部配置。
- 生命周期：根agent，无子agent，创建/退役worktree均0，无依赖变动；现有GG-419运行receipt保持，不宣称新的构建已启用。
- 下一步：用户刷新5173原画布，切换Seedance后在左侧参数中选择Doubao/Dreamina并手验模型菜单；不需要因UI改动更新后端。

- 完成回执：[GG-420](tasks/GG-420-seedance-line-settings.md) Seedance线路UI源码完成：左侧视频参数新增「线路」Doubao/Dreamina，并在参数摘要及无障碍名称显示当前值；Kling隐藏此参数。模型菜单全部统一图标/型号/选中标记行，去掉HC/MAX标签及内嵌线路切换；同一后台能力禁用规则覆盖各型号，换型号沿现有草稿保留线路。standard/backup、Provider ID、报价/保存/冻结任务和既有素材处理不变。分支feature/gg-420-seedance-line-settings，基线干净2e14ad6含90a46ea祖先，ADR0143已记录该显示决定。仅源码及文档，按用户要求未运行构建/检查/测试/浏览器/HTTP/SQL/Provider或生成/扣费、重启、GitHub/生产；原GG-419构建90e0605和70迁移未更新或重新探测。创建0/退役0、无子agent/依赖变动。用户刷新5173手验，运行验收未声明通过。
