# GG-086 — JCOIN发行进度条与自动刷新

- 日期：2026-09-14；状态：本地实现及页面核对完成，未部署，未部署。
- 分支：feature/GG-086-jcoin-live-progress；worktree：F:/goodgood-worktrees/GG-086。
- 基线：5298a47（GG085完整累计候选，保留a73835f）；旧根/其他worktree不修改。
- 请求：每一期卡片加入实时发行进度条。
- 决策影响：UI展示与只读刷新，不改变ADR0084发行规则、预算、起算、退款或权限；无需新ADR。

## 范围与验收

- 卡片已发/剩余下方复用Radix/Shadcn Progress，Palace Red、百分比及明确无障碍期号标签；手机不溢出、尊重减少动画。
- 按本期累计issued/budget计算，不扣recovered；8位小数转整数后计算，百分比向下保留两位，未发满不得提前显示100%，极小非零显示<0.01%，空额度显示0%。
- 站长只读查询每15秒自动刷新，后台/隐藏页面暂停，回到可见页面立即读取；请求不重叠，离开取消，失败保留快照并提示，后续可恢复。
- 管理操作或开启确认期间暂停轮询，成功仍沿用原幂等操作与刷新机制；个人页继续不返回库存/发行进度。
- 更新原32141 Web供验收；保留mock Worker/provider与原数据，不发币、fixture或接真实provider。

## 实施与验证

- 已增加进度计算及只读轮询模块、卡片进度/更新时间/刷新失败提示。
- JCOIN定向10/10通过（GG084 7 + GG086 3）。check:local仅运行一次：lint/typecheck/build通过，542项中517通过/24 opt-in跳过/1文档断言失败（检查点缩写误删正式/历史域名说明）；补回说明后受影响发布文档与连续性测试15/15通过。仅文档修复，按契约不重跑全量代码门禁。
- 原Chrome32141显示0%及可访问进度条；390×844px卡片全宽无横向溢出，更新时间在未刷新页面情况下20:46:02→20:46:17，证实15秒自动读取。未点启期/处理，已恢复普通视口并保留标签页。
- 下一步：供站长验收原页面；生产发布或后续批次另行授权。

## 本地运行与交接

- UI提交a1955fb0f3deb1194e716eb5ca0b5165ebfeba92，原32141 Web1696从GG086 dist/source启动；仅核验并停止旧Web26608，原GG084 mock Worker30432/32142、mock provider9048/32143保留，后台相同。
- Web readiness、个人GET、站长只读计划POST及两mock readiness均200；第一期draft、issued0。数据库/积分/资产未改，无迁移/fixtures/provider请求/发币。
- 本地忽略helper：GG086工作目录执行node work/gg086-preview/start.mjs，读取GG084已核验的环境helper并动态记录revision；日志work/gg086-preview/web.*.log。停止前核验32141属于1696，仅停止本任务Web；不要运行旧prepare/重置流程。
- 后续提交只更新文档，运行UI源码保持一致；CURRENT_STATE生产身份不改。
