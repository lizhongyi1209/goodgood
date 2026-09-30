# GG-236 项目卡片默认显示外框

- 日期：2026-09-30。
- 状态：隔离实现1fd5dbf已精确合入GG116/5173，静态审阅通过；站长随后回复「正确了」确认外框效果，未自动复测/部署。
- 需求：项目卡片常态也显示原hover外框，hover保留当前预览放大。
- 工作树：F:/goodgood-worktrees/GG-236-project-frame / fix/GG-236-project-card-default-frame。
- 基线：当前verified70e10c6，05e90d2祖先已核验；GG116当前项目CSS/design/UX/ADR显式快照1dfb068。仅交付此快照之后的任务增量，保留其他窗口。
- 决策：实施前追加ADR0114 GG236，调整GG232的hover-only浅灰外框。

## 范围与验收

源码确认全局.project-card为白底/7px内边距/18px圆角，项目局部hover入口才设#f4f4f5。因此外框由背景与已有内边距形成。只把该颜色设为局部卡片常态，使用两类名组合选择器覆盖全局白底，避免依赖样式加载次序；不改变尺寸或增加几何线宽。

画布项目和旧创作项目常态可见浅灰外圈，hover/focus同底色且预览继续1.015倍/180ms；菜单/快照重试仍独立，不触发预览缩放或误进入。键盘焦点、pending/restoring、reduce-motion及真实快照/恢复/项目操作保持。空列表与加载/失败逻辑不改。

## 验证与下一步

沿用站长不复测限制，仅静态源码及diff检查，不tests/check:local/typecheck/build/浏览器/CUA/API/provider/服务/数据库/部署。纯可逆样式不新增镜像CSS测试，效果待站长刷新手验。

实现仅新增局部`.card:global(.project-card) { background: #f4f4f5; }`单规则，选择器比全局.project-card优先级高。已有hover颜色、缩放、过渡、焦点和reduce-motion规则无改动；两类article源码均同时使用project-card及局部card类。design/UX与ADR同步，无全局CSS/TSX/数据逻辑变化。隔离`git diff --check`通过，不等于浏览器视觉验收。

交付：仅1dfb068→1fd5dbf五文件任务增量经git apply --check后精确回放GG116，回放后限定diff检查通过。既有GG232项目进入/菜单和所有画布改动保持，无服务操作。下一步站长刷新手验默认外框与hover预览放大；后端70e10c6/56迁移保持。
