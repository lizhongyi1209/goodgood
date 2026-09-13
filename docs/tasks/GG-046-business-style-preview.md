# GG-046 — 企业与分销积分管理模拟填充

- 状态：模拟实现与门禁通过；用户认为模拟不直观，已按要求切回真实本地企业账户页面，未发布
- 更新：2026-09-13
- 分支/目录：`feature/GG-046-business-style-preview` / `F:/goodgood-worktrees/GG-037`
- 基线：干净已验证 GG-045 `9239e77`；main `bab17fd` 为祖先，不使用 C6。
- 决策影响：不改变 ADR 0058 的正式功能、权限或积分规则，无新增产品 ADR。

## 范围与验收

- 在 UI-only preview session 中通过显式 `business-preview=1` 填充企业直属账户、分销客户及划拨记录。
- 复用正式列表、记录筛选、参数与确认弹框；提供两种上下文的样式切换，不伪造真实登录身份。
- 模拟账户含已划拨和未划拨情形，收支/累计/时间相互一致；标注模拟，正式提交禁用。
- 不读取真实划拨接口，不回写主界面真实余额，不写数据库、队列或浏览器持久状态。
- 原 32140 真实接口服务/会话与 Worker 保留；只把原 Chrome 专用标签用于独立 UI-only 预览，不使用 Playwright 或新 Chrome 窗口。

## 当前检查点

- 已核验现有 preview session 默认仅非 production 且未配置 AUTH_MODE 时可用；沿用该隔离方式，不增加服务器模拟 API/账户。
- 已实现企业/分销各 4 个模拟账户，包含未划拨账户、上级划入和下级分配记录；数额及时间相互一致。
- 复用正式组件，切换上下文及列表/记录在本地状态中完成；禁用确认按钮并在提交处理再次阻断，读取/加载更多也不调用真实 API。
- 定向测试 `gg046-business-style-preview`、`gg045-contextual-credit-management`、`gg027-distribution-ui`：27/27 通过。最终 `npm run check:local` 一次通过：396 项中 382 通过、14 opt-in 跳过、0 失败；lint、TypeScript、构建通过。未启用数据库写测试。
- `npm run dev:local -- --host 127.0.0.1 --port 5173 --strictPort` 启动 UI-only 预览（会话 88668）；`/api/auth/session` 确认 preview session。原 Chrome 专用标签已打开 `http://127.0.0.1:5173/organizations/accounts?business-preview=1` 并确认企业账户填充内容出现；未做浏览器交互/窄屏/划拨测试。
- 原 32140 Web 随最终构建更新，仅重启已核验的本机 Node Web 进程；数据库/对象/Worker/登录会话不变。恢复时首次遗漏正确的 provider base URL 与 Seedance 文件变量名，导致只读状态 503；按现有代码恢复 `GENERATION_API_BASE_URL` / `GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE` 后 readiness 五项全部 ok、视频 available true。最终执行会话 8691；未提交生成或划拨，不改代码或存储。
- Sites 既有页面规范使预览继续复用现有 shell/列表/弹框，不新建另一套设计或改变托管；Computer Use 仅沿用现有 Chrome 单标签，未使用 Playwright 或新窗口。生产 CURRENT_STATE 不变。
- 最终文档连续性测试 8/8 与 `git diff --check` 通过；仅提交本任务文件，无密钥、数据库或素材进入候选。
- 2026-09-13 用户反馈模拟不直观，要求按真实企业账户展示。通过 Computer Use 把原 Chrome 1648143727 从 5173 模拟页切回 `http://127.0.0.1:32140/organizations`，沿用已有有效 `enterprise-demo@local.goodgood` 会话，没有自动登录或伪造身份。
- 已确认实际 `GoodGood 测试企业` 概览出现：左侧企业管理，内容内概览/成员与额度/消费记录/团队资产/直属账户/划拨记录；真实企业积分 0、未分配额度 0、有效成员 1、待接受邀请 0。没有修改源代码、创建账户/邀请/关系、追加积分或生成/划拨，模拟内容不注入真实接口。
- 下一步：用户从原 32140 真实企业概览检查完整页面并反馈；5173 模拟实现保留但不再作为当前展示入口。补充真实测试数据需另行明确范围，不擅自改账本或关系。未推送、合入 main 或部署，无 blocker。
