# GoodGood

以图片为中心的 AI 视觉创作工作台。当前已在香港正式环境开放站长审核制的
小范围真实用户测试（controlled alpha），不是仅有本地界面的原型。

![GoodGood](public/goodgood-mark.svg)

## 从这里接续开发

所有 coding agent 先读 [AGENTS.md](AGENTS.md)，随后读：

- [当前线上与仓库状态](docs/CURRENT_STATE.md)
- [开发、验收与发布流程](docs/WORKFLOW.md)
- [当前实施检查点](docs/IMPLEMENTATION_PLAN.md)
- [任务索引](docs/BACKLOG.md)

当前本地检查点/启动/测试见[跨窗口交接](docs/DEVELOPMENT_HANDOFF.md)；不要把下方已部署概览当作最新本地功能。

在这个项目中新开窗口，直接写新需求即可。agent 负责检查分支、创建任务记录、
按已有设计/架构实现并验证；不用复制长聊天。未发布的历史 C6 已单独保全，
不应混入新需求。详细资料见 [文档导航](docs/README.md)。

## 已部署产品概览（2026-09-09版本，测试用户2026-09-14已清理）

- 正式入口：https://goodgood.o1key.com
- Authing 登录，账户待审核、100 欢迎积分、站长页面审核/暂停/人工补分。
- Nano Banana 2 真实生图，14 宽高比与1K/2K/4K、1/2/4张，10/20/40积分。
- 私有参考图/结果、资产库、项目恢复与创作草稿。
- GPT IMAGE 2已接入；Pro仅展示报价。支付、自动账户删除、举报及大规模配套未开放。

这是能力概览；精确版本与证据以 CURRENT_STATE 为准，不把 main 自动等同线上。

## 本地开发与检查

要求 Node.js `>=22.13.0`、npm；持久流程还需要 Docker Desktop 的 Linux runtime。

```bash
npm ci
npm run dev:local
```

纯界面渲染不需要秘密，使用输出的本地 URL。持久化、任务/积分和真实接口联调用隔离的本地栈：

```bash
npm run stack:config
npm run stack:up
npm run stack:verify
npm run stack:down
```

本地 PostgreSQL、Valkey、RustFS、身份和数据保持隔离，但 Web/Worker 强制连接真实
O1Key；专用开发密钥从仓库外
`%USERPROFILE%\.claude\goodgood-local-secrets\o1key-api-key.txt`（或
`GOODGOOD_LOCAL_O1KEY_KEY_FILE`）读取，缺失时拒绝启动。真实生成会计费；绝不复用生产
凭据、数据库、R2、队列或用户数据。`stack:down` 保留数据卷。

mock 仅用于不计费的确定性自动化测试，入口名称明确为
`stack:mock-test:*`；它不是开发环境或真实接口验收证据。

交付前运行：

```bash
npm run check:local
```

包含 lint、typecheck、生产构建和自动测试。真实集成/浏览器/部署验证按风险补充。
端口、隔离 Authing/O1Key 测试、秘密管理、运行/回退细节见
[DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 发布边界

本地验收后提交干净候选，CI 验证不可变镜像，经批准再发布到现有香港主机。
Git 提交、CI 通过、镜像上传都不等于已经上线；记录部署 revision/digest。
当前没有常驻远程 staging，blue/green 也不是两套隔离的用户数据库。
未来生产发布只使用固定的 `goodgood-production` Compose 项目和 Nginx 上游；
旧双槽位流程仅保留在明确标记的历史发布记录中。

品牌使用 Double G / GoodGood 字标、宫墙红和飞鸿发送标记。保持既有产品语言，
按 [PROJECT_MAP.md](docs/PROJECT_MAP.md) 逐步调整模块，不做无关整站重写。
