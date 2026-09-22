# GG-102 — 本地开发视频默认连接真实 Seedance

- 状态：本地代码与门禁完成，运行时核验中；未部署。
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
- O1Key `GET /v1/models` 返回 200、83 个模型；两条线路四个 Seedance 模型均在目录中。未提交生成。
- `npm run check:local`：568 项，542 通过 / 26 项命名隔离测试跳过 / 0 失败；lint 只有既有 16 个 warning。
- `npm run stack:config`、定向视频测试、类型检查和文档索引检查通过。尚未重新构建/启动版本绑定的本地 Web/Worker。

## 下一步

实现默认本地视频运行时、定向测试与完整本地门禁；提交后重建 checkpoint 并恢复本地 Web/Worker，核对实际页面来源与接口状态。真实视频生成只在确认成本范围后执行。
