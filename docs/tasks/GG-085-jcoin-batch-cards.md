# GG-085 — JCOIN发行批次卡片

- 日期：2026-09-14；状态：本地实现、门禁、浏览器和原服务更新完成，未部署。
- 分支：feature/GG-085-jcoin-batch-cards；worktree：F:/goodgood-worktrees/GG-085。
- 基线：c00bc4f4c9fa2f322e763dffd9727c5b408c68df，完整接续GG084并保留a73835f累计功能；旧根目录和其他worktree不改。
- 请求：站长平台币页面将每一期做成卡片展示。
- 决策影响：仅布局调整，不改变ADR0084发行规则、权限或用户私有统计；不需要新ADR。

## 范围与验收

- 实际批次独立卡片，包含期号、状态、额度、已发/剩余、奖励系数、起算、退款回收及原管理操作。
- 平台总量/回馈池与未安排额度留在卡片外；当前只展示真实第一期，不造后续批次，不新增配置接口。
- 保留开启确认、暂停/恢复、处理、加载和错误恢复；手机单列无横向溢出，用户页面不改。
- 原32141本地验收入口刷新新Web；保留原数据、mock Worker和mock provider，不生成或启期。

## 实施与验证

- 已提取批次卡片，样式仅新增jcoin-batch选择器；接口、数据库和发行处理器不变。
- 定向JCOIN 7/7、文档8/8通过；npm run check:local exit0，lint/typecheck/build通过，539项中515通过、24 opt-in跳过、0失败。无SQL或provider请求。
- Chrome原32141页面显示独立第一期卡片；390×844px单列及下部规则/操作核对通过，无横向溢出，已恢复普通视口并保留站长标签页。未点击开启/处理等写操作。
- 下一步：供站长验收原本地页面；发布或后续批次配置另行授权。

## 本地验收运行边界

- UI实现提交：332d0f05b6fc1b01ccf2f34ee78864fceb2c8418。Web从GG085构建运行，PID26608，http://127.0.0.1:32141/admin/jcoin；原GG084 Worker30432/32142、mock provider9048/32143继续运行，后台代码相同。
- 只核验并停止原32141 Web28072，未重启Worker/容器或迁移数据库；原PG54449、Valkey56449、对象58049及用户/积分/资产保留。个人API、站长只读计划、Web及两mock readiness均200，第一期仍draft。
- 恢复：在GG085执行node work/gg085-preview/start.mjs（忽略的本地helper，读取GG084已核验environment.mjs，动态标记Git revision）；无需旧prepare/重置脚本。日志在work/gg085-preview，停止前核验端口归属26608，只停止本任务Web。
- 无生产迁移/发币/部署，没有真实provider请求；后续Git仅文档提交不改变当前UI源码。
