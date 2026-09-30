# GG-152 — 画布预览会话接口加载错误

- 状态：本地最小修复已写入当前 GG-116 未提交工作区；待站长手动复核。未提交、未部署。
- 报告：打开 `/canvas` 时出现 vinext Build Error：`Cannot read properties of undefined (reading 'endsWith')`。
- 定位：5173 的 `/canvas` 页面返回 200，随后 `/api/auth/session` 返回 500。本地预览会话本应在 `GET` 中直接返回，但该路由顶层静态导入真实鉴权运行时；依赖链经过 `server/generation/resources.mjs` 和 `server/images/private-preview.mjs` 提前加载 Sharp。当前 Cloudflare/Vite Worker 环境无法加载 Sharp 的原生模块；Sharp 的错误处理又对缺失的 `err.code` 调用 `endsWith`，遮蔽了原始加载错误。这不是画布拖动或节点逻辑引起的错误。
- 改动：`app/api/auth/session/route.ts` 在本地预览分支返回之后才动态导入真实鉴权运行时；异常格式化模块只在异常分支加载。真实会话的响应和错误映射沿用原逻辑，预览分支不触达 Sharp。未修改 32131、Docker、生成接口或资产数据。
- 决策：这是恢复既定本地预览行为的缺陷修复，不变更产品决定，不新建 ADR。
- 验收：站长手动打开 5173 `/canvas`，确认 `/api/auth/session` 不再因 Sharp 模块加载返回 500，且不出现该 `endsWith` 覆盖层；完整本地服务可用时确认真实会话由 32131 代理正常读取。按站长长期要求，代理未运行自动测试、构建或浏览器复测。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
