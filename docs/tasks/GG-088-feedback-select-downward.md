# GG-088 — 问题类型向下展开

- 日期：2026-09-14；状态：实现，待验证；未部署。
- 分支：fix/GG-088-feedback-select-downward；worktree：F:/goodgood-worktrees/GG-088。
- 基线：b248836，保留a73835f及GG087；main已核验并不含当前累计候选，按用户授权继续当前版本。
- 请求：首次点击问题类型也从按钮下方向下展开。
- 决策影响：普通定位修复，保留ADR0085反馈范围，无新增ADR。
- 原因：共用Select默认item-aligned，初始选中末项other会把菜单向上铺开。
- 修改：仅反馈CategorySelect采用popper/bottom/start，禁用方向翻转；保留Radix键盘、焦点、菜单高度/滚动。
- 验收：首次默认其他、改选生成后再次打开均向下；桌面/390px检查；不提交反馈、不写数据库或调用provider。
- 验证：check:local通过（lint/typecheck/build，522通过/25显式写测试跳过/0失败）；定向反馈4/4、文档8/8通过。实际首次打开浏览器检查待更新Web。
- 下一步：验证稳定后只替换原32141 Web，保留Worker/provider及所有本地数据。
