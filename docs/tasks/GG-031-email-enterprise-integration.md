# GG-031 — 邮箱验证码与企业工作区本地集成

- 状态：阶段 0—3 自动化本地集成完成；阶段 4 用户手工本地流程实测进行中；线上环境测试未开始
- 最后更新：2026-09-11
- 分支：`feature/GG-031-email-enterprise-integration`
- 工作树：`F:\goodgood-worktrees\GG-031`
- 基线：`origin/main` @ `42fc8d81d7f50ea6139671a2c239a0ee2d4455ea`
- 输入候选：GG-029 @ `27b77224d1daa6d62791208e251b176d12110bce`；GG-030 @ `90b3b1da3f8ba40f0214e677abba8202595a31d5`

## 用户需求

邮箱验证码登录与企业工作区分别完成本地测试后，将两者放入同一个隔离候选做完整本地联调；
只有两者共同通过后，才考虑线上环境测试。

## 范围与边界

- 在新工作树中吸收 GG-029 与 GG-030，保持两个来源工作树及其分支不变。
- 企业邀请复用 GG-029 的邮箱规范化规则，并以已验证邮箱绑定作为邮箱身份权威来源；保留受审旧身份迁移兼容路径。
- 合并认证入口、企业管理入口、运行时路由、数据库迁移与测试契约。
- 覆盖迁移重放、API、隔离 Compose、Mailpit 邮件验证码、桌面和移动浏览器流程。
- 新邮箱账号仍先进入 `pending`；站长审核为 `active` 后才能查看或接受企业邀请。邀请不绕过 controlled-alpha 审核。
- 本任务不发送真实邮件，不调用真实生成 provider，不访问生产数据库，不安装生产密钥，不推送、合并或部署线上候选。
- 不纳入 GG-024、GG-025、GG-027 或其他并行计划的改动。

## 验收标准

- 迁移 `0023`—`0027` 可在空数据库顺序执行并安全重放。
- 邮箱验证码新用户的个人工作区与欢迎积分只创建一次。
- 企业邀请链路覆盖：待审核不可接受、审核后可接受、邮箱不匹配/未验证/停用/跨企业均拒绝。
- ASCII 与 IDN/Unicode 域名使用同一规范化结果；绑定邮箱优先于可变的用户展示邮箱。
- 企业页面触发登录时保留原目标 URL，验证码成功后返回该页面。
- 合并后定向测试、浏览器验收和 `npm run check:local` 全部通过。

## 阶段 4 手工本地实测流程（换窗口后的恢复清单）

### 环境与约束

- 工作树：`F:\goodgood-worktrees\GG-031`，分支：`feature/GG-031-email-enterprise-integration`。
- 若隔离栈尚未运行，从工作树执行以下 PowerShell 命令；若已运行，只检查 readiness，不要重复建卷：

  ```powershell
  $env:GOODGOOD_WEB_PORT="32131"; $env:GOODGOOD_WORKER_HEALTH_PORT="32132"; $env:GOODGOOD_MOCK_GENERATION_PORT="32133"; $env:GOODGOOD_POSTGRES_PORT="55231"; $env:GOODGOOD_VALKEY_PORT="57131"; $env:GOODGOOD_OBJECT_STORAGE_PORT="59031"; $env:GOODGOOD_OBJECT_STORAGE_CONSOLE_PORT="59032"; $env:GOODGOOD_MAILPIT_PORT="58031"; docker compose --project-name goodgood-gg031 -f compose.yaml -f compose.email-otp-local.yaml up --build --detach --wait
  curl.exe -fsS http://127.0.0.1:32131/api/health/ready
  ```

- GoodGood：`http://127.0.0.1:32131`；Mailpit：`http://127.0.0.1:58031`；只使用
  `boss.manual@gg031.local` 和 `employee.manual@gg031.local` 这两个 Mailpit 地址，不发送真实邮件。
- Web/Worker 必须为 `GENERATION_PROVIDER_KIND=mock`。本轮手工结束前不要执行
  `docker compose ... down --volumes`；若必须从头开始，只允许针对 `goodgood-gg031` 专用项目执行。

### 主流程（逐段确认）

1. **老板邮箱注册**：打开 `/admin/users`，用 `boss.manual@gg031.local` 请求验证码；在 Mailpit 打开
   最新邮件并回填验证码。预期看到“账号正在审核中”、欢迎积分 `100`、 “刷新状态”和“退出登录”，且
   不能进入站长控制台。到此暂停并记录结果。
2. **本地站长 bootstrap**：确认第 1 步通过后，在工作树执行一次以下命令（不要在生产或其他项目执行）：

   ```powershell
   $env:DATABASE_URL="postgresql://goodgood:goodgood-local-only@127.0.0.1:55231/goodgood"; npm run accounts:bootstrap-site-owner -- --email boss.manual@gg031.local --operator gg031-local-operator --reference GG-031-manual-local-20260911 --execute
   ```

   预期输出 `administration.site_owner_bootstrapped`；若输出 `replayed: true`，说明此前已执行过，继续下一步。
3. **老板审核后恢复**：回到 `/admin/users` 点击“刷新状态”。预期进入站长工作台，老板账户为“已启用”、
   角色为“站长”，并能看到账户列表和审核操作。
4. **创建企业**：在老板账户行点击“企业”，填写例如 `GG-031 手工企业` 和原因，确认创建。记录返回的
   `workspaceId`（若页面不显示，由下一窗口读取本地数据库或 `/api/workspaces`，不要手改数据库）。
5. **准备企业积分池**：当前页面没有企业充值按钮；必须在老板已登录的浏览器会话中调用企业 credit-grants
   API（不要直接改账本）：

   ```js
   fetch(`/api/organizations/${workspaceId}/credit-grants`, {
     method: "POST",
     headers: {
       "content-type": "application/json",
       "x-goodgood-organization-action": "1",
       "idempotency-key": "gg031-manual-credit-20260911"
     },
     body: JSON.stringify({ amount: 500, reason: "GG-031 手工本地测试" })
   }).then(async (response) => ({ status: response.status, body: await response.json() })).then(console.log)
   ```

   预期 HTTP `201`（同一幂等键重复执行可为 `200`），企业概览显示企业可用积分 `500`。
6. **创建邀请**：老板进入 `/organizations/<workspaceId>/members`，邀请
   `employee.manual@gg031.local`，角色选“员工”，填写邀请原因。预期出现待接受邀请。
7. **员工首次登录与 pending 边界**：用第二个浏览器/隐私窗口打开同一成员 URL，用员工邮箱请求并回填 Mailpit
   验证码。预期仍为“账号正在审核中”，URL 保持企业成员目标页，不能接受邀请；老板邀请不能绕过平台审核。
8. **站长审核员工**：老板回 `/admin/users` 搜索员工邮箱，点击“通过”并填写原因。员工点击“刷新状态”，
   预期账号变为 active，但普通员工没有企业管理权限；回到 `/create` 后应在移动顶栏/工作区切换器看到邀请浮层。
9. **接受邀请与工作区切换**：员工点击“接受”，预期跳转 `/workspaces/<workspaceId>/create`，工作区名称为
   手工企业；员工看到企业额度入口但不能看到“企业管理”。
10. **分配员工额度**：老板在企业“成员与额度”页对员工点击“额度”，设置累计额度 `200`，填写原因并确认。
    预期成员行显示 `200 / 200`；员工刷新创作页后看到企业剩余额度 `200`。
11. **实际 mock 创作与审阅**：员工在企业创作页使用默认 `Nano Banana 2`、`1K`、1 张，提示词填写
    `GG-031 手工联调：一只红色纸飞机` 并发送。等待结果完成，预期只扣除该模型报价（当前 10 积分），
    员工能看到生成结果；老板刷新“消费记录”应出现 1 条员工、提示词和积分记录，“团队资产”应出现 1 张结果图。
12. **暂停/恢复回归**：老板暂停员工成员，员工刷新企业创作页，预期该企业不可用且不能继续创作；老板恢复
    员工后，员工重新刷新可恢复访问。记录两次状态边界，不要把账号级暂停与企业成员暂停混为一谈。

### 必要负向检查与停止条件

- 员工在 pending、未接受邀请、成员 suspended 三种状态下都不得创建企业创作任务；发现可进入或可提交时立即
  停在当前步骤并记录 URL、界面文案和时间。
- 用第三个不同邮箱（如 `mismatch.manual@gg031.local`）登录时，不得看到发给员工邮箱的邀请；不得用改动
  用户资料邮箱的方式验证身份匹配。
- 任一步出现真实外部邮件、`GENERATION_PROVIDER_KIND` 不是 mock、非预期网络地址、账本重复授予或跨企业
  数据可见，立即停止，不进入线上测试。
- 每个步骤记录“通过/失败/未执行”和截图或界面文案；本地手工流程完成后，再由站长决定是否另开线上测试，
  本任务不自动推进线上。

## 决策检查

本任务不改变已确认决策：它只验证并修复 GG-029 与 GG-030 的组合行为。继续采用“平台审核后才能使用”
和“老板邀请不等于平台自动放行”的现有 controlled-alpha 边界，因此无需新 ADR。若未来希望受邀员工自动绕过
平台审核，必须另开产品决策。

## 阶段

| 阶段 | 状态 | 交付物 |
| --- | --- | --- |
| 0 | 已完成 | 隔离工作树、合并预检、任务契约和本地边界 |
| 1 | 已完成 | GG-029/GG-030 已合入；冲突按组合语义解决，lint、TypeScript 与定向 39/39 通过 |
| 2 | 已完成 | 统一邮箱身份语义；GG-031 1/1、GG-029 1/1、GG-030 14/14 PostgreSQL 实跑通过 |
| 3 | 已完成 | 隔离 Compose + Mailpit + 桌面/移动浏览器验收、完整本地门禁 |
| 4 | 实施中 | 用户在隔离本地环境手工复验老板、站长审核、企业与员工全流程 |

## 已有证据

- GG-029 工作树干净；本地门禁 280 项：273 通过、7 项 opt-in 跳过、0 失败。
- GG-030 工作树干净；本地门禁 266 项：257 通过、9 项 opt-in 跳过、0 失败。
- 合并树预检只发现 6 个文本冲突：`app/page.tsx`、BACKLOG、IMPLEMENTATION_PLAN、
  decisions 索引及两份 CI/发布测试；迁移列表、数据库 schema、运行时路由和管理页可自动组合。
- 在一次性 PostgreSQL 容器内已顺序执行并重放 GG-029 与 GG-030 的全部迁移；`0023`—`0027` 均登记，
  核心邮箱和企业表均存在。容器已停止并自动删除，未启动 Web、Worker、邮件或 provider。
- 预检发现真实集成缺陷：GG-029 会将 IDN 域名规范化为 ASCII/Punycode，GG-030 原实现只做 trim/lower；
  阶段 2 将统一此语义，并让邀请匹配优先使用已验证邮箱绑定。
- 合并后的 ESLint、TypeScript、`npm run build:local` 和冲突相关定向测试 39/39 通过。
- Windows 下 `npm run build` 的 Bash 包装器在进入应用构建前因 checkout 的 CRLF 报 `pipefail\r`；本地门禁
  使用的 `build:local` 已通过。该环境包装问题不冒充应用失败，也不在本任务中扩张修复。
- 企业邀请现直接复用登录模块的邮箱规范化；IDN 域名统一为 ASCII/Punycode。邮箱绑定存在时，邀请
  查询、接受、成员/额度/用量展示均以已验证绑定为准；只有未绑定且已有受审非邮箱身份时才读取旧字段。
- 企业页和站长页的未登录状态现直接复用邮箱验证码面板，验证码请求保存当前路径与查询参数；不再通过
  `/api/auth/login` 回到原页形成无输入框循环。
- 全新 GG-031 PostgreSQL 实跑覆盖邀请→OTP 注册→`pending` 拒绝→站长审核→停用拒绝→恢复→接受、
  可变展示邮箱不可冒充身份、无验证身份拒绝、重复登录不重复用户/个人工作区/欢迎积分，1/1 通过。
- 同一隔离容器中的 GG-029 原生 PostgreSQL 回归 1/1、GG-030 阶段 1—4 联合回归 14/14 通过；
  三个数据库及容器均已删除。
- 专用 Compose 项目 `goodgood-gg031` 在独立端口启动 Web、Worker、PostgreSQL、Valkey、对象存储、
  mock provider 与 Mailpit；readiness 全部健康，迁移登记到 `0027_gg030_management_surface.sql`。
- 使用应用真实邮箱 OTP 接口和 Mailpit 完成浏览器联合验收 1/1：桌面老板注册、待审核、升为站长、
  创建企业、充值企业测试积分、邀请员工、审核员工、分配 200 积分并查看空消费记录/空资产库；移动员工
  注册后先被 pending 边界拦截，经审核后回到企业目标、接受邀请并看到 200 积分。桌面视口为
  1440×1000，移动视口为 390×844；无页面异常和横向溢出。
- 浏览器验收发现移动端曾隐藏邀请入口，首次展示修复又被 sticky composer 遮挡；现改为移动顶栏下方的
  高层级邀请浮层，并加入静态 UI 契约测试。
- Web 与 Worker 的 `GENERATION_PROVIDER_KIND` 均为 `mock`；浏览器验收后 `generation_jobs=0`、
  `generation_attempts=0`，mock 日志只有 readiness，未产生真实 provider 请求。
- 原生 Computer Use 管道连续三次不可用，按工具恢复边界改用本机 Chrome + Playwright 做等价浏览器验收；
  临时脚本和结果已清理，未写入依赖清单。
- `npm run check:local` 最终通过：295 项测试中 284 通过、11 项 opt-in 跳过、0 失败；Lint、TypeScript
  与 `build:local` 同时通过。首次门禁发现 IMPLEMENTATION_PLAN 合并时漏掉既有 staging 名称契约，
  恢复既定事实后定向 24/24 及完整门禁通过。
- `goodgood-gg031` 容器、网络和数据卷均已删除；其他并行 Compose 项目保持运行。没有发送外部邮件，
  没有访问生产数据/密钥，没有推送、合并或部署。

## 下一步

`goodgood-gg031` 隔离栈已重新以全新数据卷启动，应用入口为 `http://127.0.0.1:32131`，Mailpit 为
`http://127.0.0.1:58031`；Web 与 Worker 继续锁定 mock provider。用户先用
`boss.manual@gg031.local` 完成邮箱 OTP，并确认看到“账号正在审核中”；随后由本任务执行可审计的本地
站长 bootstrap，再继续企业和员工手工流程。环境在本轮人工验收结束前保留。
