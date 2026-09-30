# GG-216 · 修复已结束生成占位导致的上传提示

- Status: 本地前端修复已完成并精准回放 GG-116；待站长手验，未部署
- Date: 2026-09-30
- Branch: `fix/GG-216-canvas-stale-upload-status`
- Worktree: `F:/goodgood-worktrees/GG-216`
- Decision: 修复 ADR 0114 / GG-175 既定保存状态，不改变产品决定。

## Scope and acceptance

画布没有待上传素材时，不应因为已失败或已取消的浏览器生成占位一直提示「素材正在上传或仅保存在本机」。实际待上传/上传失败的图片、视频和参考图仍阻止误报全部保存；未确认的生成提交另用准确提示。保留 IndexedDB 中的本地任务与文件、恢复和网络/CAS失败处理，不删除或修改用户现有素材/节点/项目，也不自动重新提交任何生成。

## Diagnosis

`http-generation-boundary.ts` 在提交前创建 `pending_` 任务，提交失败后保留同一 ID 并报告 `state: failed`。`canvas-project-sync.ts` 原先对所有 `pending_` 任务都判定 `hasLocalOnlyContent`，却由 `remoteCanvasProjectDocument` 始终剥离这些临时 ID；于是即使远端已保存真实节点/参数，客户端仍持续 `dirty/offline` 且给出素材上传提示。

根 agent 只读核对所报告本地项目：云端五节点中的两个图片有持久资产，两个生成器任务已成功，第三生成器没有持久任务 ID；云端没有待上传字段。该证据只说明服务端内容，不声称已读取浏览器 IndexedDB，也不据此清除本地文件。

## Source isolation

已核验 `257f959` 为已验证检查点 `29e566d` 的祖先，并从后者创建本任务独立分支/工作树。当前 5173 的 GG-116 前端保存模块尚未跟踪于该后端检查点，因此仅复制本任务直接涉及的 `canvas-project-sync.ts` / `canvas-project-snapshot.ts` 为单独基线提交；新修复在后续明确增量中实现，再精准回放到 GG-116。保留其他脏文件与现有 Web/Worker。

## Handoff

`pendingCanvasProjectContent` 先判断真实 `pendingFileId` / `pendingReferences`；只有匹配 `jobId` 且已 `failed/cancelled` 的浏览器生成占位不再阻止项目内容成为已保存。GG-218多页整合保留明确 `SUBMISSION_UNKNOWN` 例外：即使恢复为failed仍未确认且dirty。活跃任务、缺少本地任务和任务 ID 不一致仍未同步，但显示「生成请求尚未确认」，不再冒充素材上传。

保存器两条路径（远端已是相同内容 / 服务端本次确认）均使用同一判断。仅更新 dirty/version，完整本地 document/localJob 仍写入 IndexedDB，远端剥离浏览器任务的规则不变。文件持久化失败、真实上传失败、网络失败/离线重试和 CAS 冲突分叉原样保留。恢复自动续跑已有明确的 `!pending_` 条件，刷新不会自动重新提交待确认请求；活跃/未知占位仍保留 dirty，不进入「干净本地缓存被更高远端版本替换」路径。现有 POST 幂等键生成方式未改变，不声称新增持久幂等恢复。

`tests/gg216-canvas-stale-upload-status.test.mjs` 补充四项未执行定义：已结束占位保留本地恢复但不冒充上传；活跃/未知占位继续待确认；图片/视频/参考图待上传继续阻塞且不删除；空画布/真实任务与资产无待上传阻塞。定义只读内存 fixture，不接数据库、provider、文件上传或生成。

仅做静态代码/差异审阅和 `git diff --check`。按站长持续指令，未执行上述测试或任何自动功能测试、构建、浏览器复测、上传/生成，也未切换服务或接触生产。目标项目浏览器 IDB 未读取，不将代码路径结论误称为现场重现。下一步由站长刷新同一画布手动验收：没有待上传文件且生成已结束时恢复已保存；若仍有真实本地素材则保留准确提示。
