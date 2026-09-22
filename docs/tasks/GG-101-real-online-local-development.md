# GG-101 — 本地开发环境强制使用真实线上接口

- 状态：**本地实现与验证完成，未部署**。
- 用户决定：2026-09-23 要求可运行的本地开发环境必须使用真实线上接口，以降低推向生产时的差异与成本。
- 分支：`chore/GG-101-real-online-local-development`。
- 决策：[ADR 0092](../decisions/0092-real-online-interfaces-for-local-development.md)。

## 范围与边界

- 默认 Compose 开发入口和 checkpoint 工作区的 Web/Worker 均使用真实 O1Key。
- 使用仓库外的专用开发密钥；缺失、位于仓库内、空值或多行时拒绝启动，不回退 mock。
- 本地 PostgreSQL、Valkey、RustFS、身份与用户数据继续隔离；禁止生产秘密、生产数据库、R2、队列和用户数据进入本地。
- mock 只保留为显式命名的 `goodgood-mock-tests` 独立项目/profile；它有独立网络和卷，完整本地门禁与 fixture 不产生真实调用费用。
- 不借此接通未完成的 Seedance 持久任务、计费或资产链路，不部署生产。

## 验收

- `npm run stack:config` 和 `stack:up` 必须装载 O1Key override；Web/Worker 均使用文件密钥和真实 HTTPS endpoint。
- 缺少合法外部开发密钥时开发栈失败关闭。
- 普通 Compose 不自动启动 mock；测试命令名称明确包含 `mock-test`，固定独立项目名并显式启用 `mock-tests` profile。
- checkpoint 启动器不再接受 mock/provider 模式。
- 文档明确真实调用计费、测试隔离和生产数据禁入边界。

## 实现

- 新增统一的仓库外密钥校验与默认开发栈启动器。
- O1Key Compose override 同时覆盖 Web 和 Worker；mock 服务改为测试 profile。
- 默认生命周期命令切到真实接口；新增独立 mock 测试生命周期命令。
- Authing、Mailpit、SMTP 专题脚本仍是隔离的专项测试工具，显式开启 mock 测试 profile，不作为默认开发环境。
- checkpoint 的 workspace/login/worker 三种运行角色全部强制真实 O1Key。

## 验证记录

- `npm run stack:config`：通过；真实开发 Compose 合并配置可解析，未发起生成请求。
- `npm run stack:mock-test:config`：通过；隔离 mock 测试 profile 可解析。
- 定向 Node 测试：21/21 通过（Compose、checkpoint、外部密钥、O1Key route）。
- `npm run check:local`：566 项，540 通过 / 26 个显式隔离项跳过 / 0 失败；lint 仅保留既有 16 个 warning。
- 文档连续性 8/8 通过，`git diff --check` 通过。
- 未执行真实生图、未写生产、未部署。

## 下一步

用户可使用专用开发 O1Key 密钥启动开发栈并进行真实功能验收；生产发布仍需独立任务与授权。
