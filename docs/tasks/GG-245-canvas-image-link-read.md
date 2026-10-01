# GG-245 — 画布新建资产图片链接读取

- 状态：读取边界已决定，子 agent 实现中
- 用户需求：交给子 agent 修复资产「新建资产」链接输入后报“无法读取图片直链，请确认链接允许跨域访问，或改为上传文件”。
- 测试 URL：https://ecimg.cafe24img.com/pg1512b73653014091/cherrycrko/web/product/P0000SNM/t5.jpg
- 最后更新：2026-10-01
- 基线：GG-244 收口 `dd8dca9` 与 GG-246 共同门禁收口 `cea9fdd6a6c835343c1cd5b62561d6c75ff16b5c`，两个任务均保留。
- 集成：`fix/GG-245-canvas-image-link-read`，`F:/goodgood-worktrees/GG-116`，现有 5173 运行目录。

## 范围与验收

- 只读核对所给公开图片链接的 HTTP、图片格式和跨域响应，以及当前链接读取/上传链路。
- 实现能完成该正常公开 JPEG 链接读取的最小完整修复，保留原上传、目录归档、加载/失败/重试和取消。
- 如需服务端读取，使用现有 GoodGood 鉴权和边界，拒绝内网/环回/元数据目标、危险重定向、非图片、超限及超时；不将浏览器 CORS 限制改写为无效的 opaque 响应。
- 代码验证由 agent，浏览器和真实资产导入验收由用户；只读 URL 检查可执行，真实本地项目/素材写入、provider 生成和生产操作不在本任务测试范围。
- 决策影响：[ADR 0122](../decisions/0122-authenticated-public-image-link-read.md) 已接受，替代 ADR 0108 GG-233 的 browser-only 限制；受鉴权、workspace 授权完成后只读获取字节，继续既有 File 上传与归档。

## 实现与证据

- 根因：客户端直接以 `mode:cors` 获取外站字节；所给 URL 返回 HTTP 200、`image/jpeg`、290,537 字节，带 5173 Origin 仍无 `Access-Control-Allow-Origin`，浏览器无法读取响应。
- 已完成：子只读诊断及最小源码范围；根建立 ADR 0122 边界。通过受鉴权 GoodGood 读取端点获得图片字节，固定公开 DNS、逐跳验证并真实解码；Web 本地运行须同步，唯一 Worker/迁移和原云配置保留。
- 验证：公开 URL 只读内存 GET/格式头尾/CORS 头核对通过，不保存图片、不写本地资产/数据库；本任务实现测试尚未执行，不执行浏览器验收。
- 发布：未发布。

## 并行与 worktree 收口

- 子 agent：`link_import`，先只读诊断与最小源码范围建议；根负责集成、运行目录与文档。
- 子分支 `fix/GG-245-image-link-agent`；唯一子目录 `F:/goodgood-worktrees/GG-245-image-link`，从本任务边界登记提交建立。
- 子文件：`features/canvas/canvas-asset-addition.mjs`、`features/canvas/canvas-asset-add-card.tsx`、`server/references/image-link.mjs`、`server/references/api.mjs`、`server/references/node-api.mjs`、`app/api/references/read-link/route.ts`、`tests/gg233-canvas-asset-addition.test.mjs`、`tests/gg245-canvas-image-link.test.mjs`。
- 依赖/构建缓存：默认零；不得安装/构建/启动服务或复制/链接 node_modules，不读秘密，不调用上传/生成，不写数据库/队列。需 Sharp 的定向测试由根使用现有集成依赖执行。
- 收口：创建 1，退役 0；根完成精确整合、代码验证、干净/无缓存/无进程核对后退役，保留提交与分支。其他运行目录与 dirty worktree 保留。

## 恢复工作

- 尚未完成：子实现、根审查和集成、相关定向验证、本地 Web checkpoint 构建与同步、子目录退役。按 GG-247 不叠加逐任务全门禁。
- 阻塞/风险：无明确阻塞；浏览器验收由用户负责，不阻塞开发交付。
- 下一步：根提交边界登记并建立唯一子目录，将八文件交 `link_import` 实现；根维护文档与运行同步。
