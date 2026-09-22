# GG-102 — 本地开发视频默认连接真实 Seedance

- 状态：本地实现与验证完成；未部署。
- 用户决定：2026-09-23，创建真实接口开发环境，视频像图片一样默认可用，不再手动开启。
- 分支：`codex/GG-102-real-video-development`；基线 `99191be`（GG-101）。
- 决策：[ADR 0093](../decisions/0093-default-real-video-in-local-development.md)。

## 范围与验收

- 保留本地 PostgreSQL、Valkey、RustFS、邮件和既有用户数据；真实图片继续通过服务端 O1Key。
- checkpoint 与普通 Compose 开发入口默认提供真实 Seedance 页面调用，使用同一仓库外开发凭据；本地 Vite serve 在凭据存在时自动可用。
- 仅用户点击生成才产生真实 provider 视频任务；状态检查不计费。浏览器不接触密钥，视频不进入图片 API。
- 保留仅本地、同源写入保护。现阶段视频结果为临时预览，不声称已实现正式视频计费、持久任务和资产入库。
- 核验服务版本来源、真实接口可用性、模型目录与本地环境；记录每次实际计费请求。

## 当前事实

- Node v24.12.0、npm 11.6.2；`npm ci` 已完成。旧 32131/32142 进程来自 `210b340`，已核验本地库只有 3 个 succeeded 任务后停止。
- 本地状态容器健康；专用开发密钥文件存在。`npm run stack:config` 通过。
- O1Key `GET /v1/models` 返回 200、83 个模型；两条线路四个 Seedance 模型均在目录中。本次未提交付费视频任务。
- `npm run check:local`：568 项，542 通过 / 26 项命名隔离测试跳过 / 0 失败；lint 只有既有 16 个 warning。
- `npm run stack:config`、定向视频测试、类型检查和文档索引检查通过。
- `build:checkpoint` 和 `verify:checkpoint` 通过；32131 `/api/health/version` 报告 `build.verified=true` 且 revision 与构建提交一致，32142 的数据库、对象存储、队列、provider 均 ready。
- 32131 与 Vite serve 的 `/api/video/preview` 均返回 `available:true,persistence:false`；外部 Host 返回 503、跨站 POST 返回 403。构建产物扫描 2994 个文件，开发凭据命中 0。
- 已授权的一次真实图片冒烟：原本地账户正常邮箱验证码登录，Nano Banana 2 / 1K / 1:1 / 1 张由真实 Worker 完成，输出 1 张；可用积分 180→160，冻结余额 0，任务表由 3→4 个成功。未访问生产环境、未重置本地数据。

## 下一步

从 32131 开展后续真实接口功能开发；切换提交后按交接说明重建并核对版本。正式视频持久任务、计费和资产链路需独立需求；若需要实际付费视频生成验收，先确认该次成本范围。
