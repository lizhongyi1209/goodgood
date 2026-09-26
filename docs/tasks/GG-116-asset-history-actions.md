# GG-116 — 生成历史纯图片网格与卡片操作

- Status: 本地实现中；未部署。
- Baseline: GG-115 `6cace56`；分支 `feature/GG-116-asset-history-actions`；
  worktree `F:/goodgood-worktrees/GG-116`。
- Decision: [ADR 0103](../decisions/0103-generated-asset-hard-delete.md)。
- 关联：灵感板块整体下线（含删除 `inspiration_cases` 等表）是独立破坏性任务，
  见 [GG-117](GG-117-inspiration-retirement.md)；本任务只保留宽引用检查。

## 站长要求（2026-09-25）

1. 优化资产库样式。
2. 「生成记录」重命名为「生成历史」。
3. 历史只需展示图片本身：不展示图片名称，不展示时间，默认按最近时间排列。
4. 鼠标悬停在图片上出现下载、删除按钮，以及放大按钮（查看图片详情）。

站长追加确认：删除为**硬删除**；放大**复用**现有图片详情视图；删除按钮
**按单张删**（同批其余图片保留）；灵感功能整体下线并删表，另开任务。

## Scope and acceptance

- `/assets` 默认分区页签文案为「生成历史」。
- 历史网格为单一扁平网格：无卡片标题、无日期分组标题、无尺寸/时间副文案；
  顺序为 `createdAt` 倒序，最近生成的最前。
- 每张图悬停（键盘为聚焦）显示三个操作：下载、删除、放大。
  - 下载调用现有 `saveImageToLocal`，使用原图签名地址。
  - 放大调用现有 `onOpenGenerated(detailKey)` 进入图片详情，不新增灯箱。
  - 删除为硬删除：删除 `assets` 行、`asset_organization` 整理行与存储对象；
    保留 generation job/batch 与积分流水；需二次确认。
- 删除后网格立即移除该图，并触发一次权威刷新；同批其余图片保持可见。
- 图片 `alt` 不再使用合成名称，改用中性文案，避免屏幕阅读器读到「生成图片
  {uuid} · n」这类内部标识。
- 个人资产库分区行为保持不变（仍显示名称、时间与整理操作）。

## Implementation

- `features/assets/asset-workspace.tsx`：页签与空状态文案改名；历史渲染改为扁平
  网格；卡片结构由整块 `<button>` 改为 `article` + 内层按钮 + 悬浮操作层，
  避免按钮嵌套。
- `app/page.tsx`：传入删除回调；删除成功后从 `assetBatches` 派生数据移除该图，
  并刷新资产库。
- `server/assets/api.mjs`：新增 `deleteGeneratedAsset`；按 owner/workspace 限权，
  事务内先删组织行再删资产行，提交后删存储对象。当时的「已有未删除灵感案例时返回 409」
  已由 GG-117（ADR 0104）随灵感表删除一并移除。
- `server/assets/node-api.mjs`、`app/api/assets/[assetId]/route.ts`：暴露
  `DELETE /api/assets/{assetId}`。
- `features/assets/http-asset-boundary.ts`：新增 `deleteAsset`。

## Verification and handoff

- 定向测试：`m4-assets`、`gg050-page-header-navigation`、`gg115-asset-workspace`、
  `image-download`、`m5-private-asset-image` 共 22/22 通过，含新增的删除用例。
- `npm run check:local`：593 项、**567 通过 / 26 隔离跳过 / 0 失败**；lint 16 条
  已有 warning、0 error；typecheck 通过。
- 新增测试覆盖：owner/workspace 越权被拒、
  组织行先于资产行删除且在同一事务、对象删除在 COMMIT 之后、事务计数
  （2 次 BEGIN / 1 次 ROLLBACK / 1 次 COMMIT）。「已发布灵感案例返回 409 且不删字节」
  一条已由 GG-117 连同 409 检查一起删除。
- 文档测试要求 ADR 索引与 100 行 BACKLOG 上限，已同步；为此合并了 BACKLOG 中
  GG-001/002 与 GG-116/117 两行。
- 尚未在浏览器验收：2026-09-26 站长提供的运行状态为 32131 已验证检查点
  `33902d8`、5173 从本工作树热更新。站长会自行手动检查；未做真实删除的生产/线上数据操作。

## 下一步

由站长在 5173 验收四点：页签是否显示「生成历史」、历史是否为无标题无日期
的扁平网格且最近在前、悬停是否出现下载/删除/放大、删除后该图是否立即消失且同批其余
图片保留。验收后按反馈调整；生产部署另开任务。
