# GG-088 — 问题类型向下展开

- 日期：2026-09-14；状态：本地实现验证完成；未部署。
- 分支：fix/GG-088-feedback-select-downward；worktree：F:/goodgood-worktrees/GG-088。
- 基线：b248836，保留a73835f及GG087；main已核验并不含当前累计候选，按用户授权继续当前版本。
- 请求：首次点击问题类型也从按钮下方向下展开。
- 决策影响：普通定位修复，保留ADR0085反馈范围，无新增ADR。
- 原因：共用Select默认item-aligned，初始选中末项other会把菜单向上铺开。
- 修改：仅反馈CategorySelect采用popper/bottom/start，禁用方向翻转；保留Radix键盘、焦点、菜单高度/滚动。
- 验收：首次默认其他、改选生成后再次打开均向下；桌面/390px检查；不提交反馈、不写数据库或调用provider。
- 验证：check:local通过（lint/typecheck/build，522通过/25显式写测试跳过/0失败）；定向反馈4/4、文档8/8通过。Chrome桌面与390px新表单默认其他首次均bottom，菜单顶部168/164px高于触发按钮底部163.64/159.64px数值且在其下方；改选生成后再次展开仍bottom。Home/Return选择及Escape返回触发器焦点正常，临时视口已重置、测试标签页已关闭。
- 本地预览：候选a5c0c83，原32141 Web已更新为PID4564（GG088 work/gg088-preview/start-review.mjs）；Worker30432/provider9048未重启；无迁移/数据库写入/provider请求。
- 下一步：用户刷新http://127.0.0.1:32141/feedback验收；下一普通需求GG089。未部署/推送/合入main。
