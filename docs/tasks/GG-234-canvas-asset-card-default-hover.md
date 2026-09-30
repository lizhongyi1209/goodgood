# GG-234 画布资产卡片常态沿用悬停外观

- 日期：2026-09-30
- 状态：隔离实现完成，已精确回放 GG-116 / 5173 源码；仅静态审阅，待站长手验，未部署。
- 用户请求：鼠标不 hover 时也使用当前 hover 外观；承接 GG-233 资产卡片。
- 工作树：`F:/goodgood-worktrees/GG-234` / `fix/GG-234-canvas-asset-card-default-hover`
- 基线：当前已核验 `70e10c6ae6bd83542ba870f54059b54b999e9fdf`；GG-116 当前卡片 CSS/设计/ADR 显式快照 `b61d24ac36d75d65c94503cda529913d8156d64d`。
- 实施提交：`494bd2c71bb766c99810e215c66f4d4fafe2ad55`，四文件相对基线增量已预检并精确回放。
- 决策影响：仅改变 GG-233 的卡片 default/hover 外观，实施前已补 ADR0108 GG-234 addendum。

## 范围与实现

加号/文件夹卡常态填充从 #f4f4f5 改为原 hover 的 #eaeaec，hover 同色。素材 visualTrigger 将原 hover 的 brightness(0.97) 移到常态。保持 active、focus-visible、disabled、grab/drag，以及原比例、无图片名、两列布局、菜单与真实上传。大图 Tooltip 仍只在 hover/聚焦打开；仅本资产区域 CSS，两处样式 hunk，不改全站外观。

## 验证边界与下一步

按用户持续要求，只静态源码/差异检查；不运行测试/check:local/typecheck/build/浏览器/CUA/API/上传/provider/服务/数据库/部署，不新增镜像 CSS 的测试。隔离提交后只回放本任务 CSS/ADR/design/任务增量，不带入基线快照，保留其它窗口。站长手验鼠标移入/移出外观保持、按下/焦点/拖动及原预览仍正常。

实际证据：隔离 staged diff 检查通过；四文件 patch 的 `git apply --check` 通过后应用，目标 diff 检查通过；整份 CSS 归一化换行与隔离实现一致。仅两处 source hunk，其余声明和 React/上传代码未改。静态检查不等于行为或视觉验收；当前后端仍 verified70e10c6 / 56 迁移。根汇总 BACKLOG/PLAN/CURRENT_STATE/HANDOFF/TESTING，下一步站长手验。
