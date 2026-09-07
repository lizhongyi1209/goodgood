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

在这个项目中新开窗口，直接写新需求即可。agent 负责检查分支、创建任务记录、
按已有设计/架构实现并验证；不用复制长聊天。未发布的历史 C6 已单独保全，
不应混入新需求。详细资料见 [文档导航](docs/README.md)。

## 当前产品

- 正式入口：https://goodgood.o1key.com
- Authing 登录，账户待审核、100 欢迎积分、站长页面审核/暂停/人工补分。
- Nano Banana 2 真实生图，14 宽高比与 1K/2K/4K，一次 1 张、10 积分。
- 私有参考图/结果、资产库、项目恢复与创作草稿。
- 支付、其他模型/多输出、自动账户删除、举报及大规模配套未开放。

这是能力概览；精确版本与证据以 CURRENT_STATE 为准，不把 main 自动等同线上。

## 本地开发与检查

要求 Node.js `>=22.13.0`、npm；持久流程还需要 Docker Desktop 的 Linux runtime。

```bash
npm ci
npm run dev:local
```

界面预览不需要秘密，使用输出的本地 URL。持久化、任务/积分等用隔离的本地栈：

```bash
npm run stack:config
npm run stack:up
npm run stack:verify
npm run stack:down
```

本地默认 PostgreSQL、Valkey、RustFS、mock provider 和测试身份；`stack:down`
保留数据卷。不要使用生产数据/凭据，也不要把 UI 预览当成真实集成测试。

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

品牌使用 Double G / GoodGood 字标、宫墙红和飞鸿发送标记。保持既有产品语言，
按 [PROJECT_MAP.md](docs/PROJECT_MAP.md) 逐步调整模块，不做无关整站重写。
