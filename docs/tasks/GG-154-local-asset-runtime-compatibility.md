# GG-154 — 本地资产读取与运行版本兼容

- 状态：已定位根因并恢复与本地数据库兼容的独立运行检查点；待站长在已登录的 5173 资产页手动验收。当前 GG-116 未提交的页面工作区保持原状，未提交、未部署。
- 请求：5173 资产页显示「资产库暂时无法读取，请重试」，需恢复本地资产读取。
- 决策：恢复既定读取行为，不改变产品决策，因此不新增 ADR。不回滚迁移、不恢复已删除的灵感表、不改动生产或真实用户数据。

## 根因与范围

- 5173 从 GG-116 `dev:workspace` 运行，并把 `/api` 代理至 32131。32131 此前采用 GG-115 的已验证检查点 `6cace565`。
- 本地数据库已应用 GG-117 的 `0047` 迁移，`inspiration_generation_prompts` 已不存在；只读 `to_regclass` 查询已确认。GG-115 的 `server/generation/repository.mjs` 中 `JOB_SELECT` 仍无条件读取该表，资产列表的 `findOwnerAssetGenerationJobs` 复用该查询，PostgreSQL 错误被 `assetApiError` 映射成统一 503 文案。GG-116 已提交代码已移除此引用。
- 为避免覆盖 GG-116 叠加的未提交 UI 改动，从 `efb72d9` 建立独立、干净的 `F:/goodgood-worktrees/GG-154-runtime` 运行工作树，仅在该树安装锁定依赖并构建、核验本地检查点。复用忽略的本地环境文件及仓库外云上传/邮件配置，不复制秘密到提交文件，不启动付费 Worker。

## 恢复与验证边界

- 先用隐藏后台进程恢复旧 GG-115 32131 与 GG-116 5173，证实 5173 代理健康接口返回旧检查点且未登录 `/api/assets` 正常返回 401；进程退出是服务离线的直接原因，但旧检查点仍与当前数据库不兼容。
- `npm ci`、`npm run build:checkpoint`、`npm run verify:checkpoint` 在干净 GG-154 运行树完成，检查点 `efb72d9e616631c569cbb5cc6b441ac30cf6e09f` 验证通过。仅停止已确认的旧 Web PID 14508，使用 `Start-Process -WindowStyle Hidden` 从该运行树启动新 Web PID 33688；GG-116 的 5173 父进程 PID 29328、监听 PID 32204 保持运行。两端日志放在 `%TEMP%/goodgood-local-services/`，没有进入 Git。
- 只读 `GET http://127.0.0.1:5173/api/health/version` 返回 200、`build.verified=true`、revision `efb72d9`，证明 5173 已代理至新 32131；没有执行迁移、删除、上传、生成或付费请求。
- 站长要求改动后自行手动验收；不运行应用测试或浏览器复测。健康检查仅证明服务与运行版本，不证明已登录资产列表体验。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
