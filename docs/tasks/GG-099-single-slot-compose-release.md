# GG-099 — 单槽位 Compose 发布

- 状态：**本地实现与验证完成**；未执行生产主机变更。
- 用户需求：取消 blue/green 发布切换，清理当前操作文档，确保新窗口不会再次选择该机制。
- 决策：采用 [ADR 0091](../decisions/0091-single-slot-compose-release.md)，未来使用固定的 `goodgood-production` Compose 项目和维护窗口内原地替换。

## 范围

- 更新运行时适配器、生产发布证据 schema 和发布计划，拒绝旧 blue/green 适配器与证据。
- 移除生产 Compose 的双槽位环境、双上游示例、独立 active-upstream 选择层和无效端口环境文件；
  固定唯一 Web/Worker 端口，并把 `127.0.0.1:3100` 直接写入 Nginx 站点配置。
- 更新 CURRENT_STATE、WORKFLOW、DEPLOYMENT、PROJECT_MAP、IMPLEMENTATION_PLAN、BACKLOG 和新窗口交接说明。
- 保留 GG-097/GG-098 发布收据中的历史事实，但明确它们不是未来操作模板。

## 不做

- 本任务不连接生产主机，不重命名生产 Compose 项目，不停止服务，不清理旧容器或卷。
- 不执行数据库迁移、镜像发布、Nginx reload 或真实 provider 请求。

## 验收

- 新的发布适配器为 `nginx-compose-single-slot-v1`，不暴露 slots 或上游切换步骤。
- 生产 Compose 项目固定为 `goodgood-production`，Web/Worker 固定为 `3100/3101`。
- 生产门禁 schema 升级，旧蓝绿证据不能通过。
- 当前默认文档只指导单槽位 Compose；历史文件有明确的“仅历史”边界。
- 定向发布/工作包/文档连续性测试通过，未改变生产数据。

## 验证

- 定向验证：`35` 项通过，`0` 失败。
- `npm run check:local`：`563` 项中 `537` 通过、`26` 项按既有隔离规则跳过、`0` 失败；
  lint 为 `0` error / `16` 条既有 warning，typecheck 和生产构建通过。
- 非历史范围残留扫描：运行时、Compose、Nginx、门禁与当前操作文档中不再存在旧 adapter、
  双项目名、动态 active-upstream、槽位 env 或切流步骤；GG-097/GG-098/操作记录保留真实历史。
- 未连接生产主机，未修改生产数据、容器、网络、卷、Nginx 或 provider。

## 下一步与交付边界

GG-099 已完成仓库内契约、配置、门禁和文档收口。生产主机迁移需要另一个
明确授权的维护任务，不能在本任务中隐式执行。
