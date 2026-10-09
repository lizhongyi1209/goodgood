# GG-219 · 画布左上工具栏统一尺寸

- 日期：2026-09-30。
- 状态：本地实现已精确回放GG-116；2026-10-09 已按确认范围存档并推送，待站长手验，未部署。
- 来源：站长截图要求缩小左上Logo，统一画布名/页面名与功能图标大小。
- 决策：细化既有GG-150/GG-218紧凑工具栏，不改变导航/品牌图形/页面功能决定，不新增ADR。
- 分支与来源：从当前verified runtime05e90d2隔离建立F:/goodgood-worktrees/GG-219 / fix/GG-219-canvas-header-scale，已核验ba9a947祖先；仅保存当前GG-116的三个相关前端文件为基线adea1e8。不从main/C6或旧UI整树合入。

## 范围与验收

仅画布左上区域：Logo视觉26→20px，按钮命中区保持26px；名称/编辑输入/页面标签共用12px文字、400字重和16px行高。页面/加号/删除图标共用12px尺寸与1.6线宽，按各图标绘制边界调整viewBox，减少SVG内部留白差异。页面、名称和新增入口统一26px高度、垂直居中；名称及分隔间距适当收紧。

保留品牌菜单、名称20字限制及随文本宽度的原位编辑、页面新增/删除保护和二次确认、焦点/禁用/触屏与窄屏行为。右侧积分/保存状态、全局Logo资源、画布数据、后端/Worker/数据库保持。

## 验证与交接（2026-09-30 历史记录）

按站长持续指示不复测：未运行自动测试、check:local、构建、浏览器复测、上传/生成或服务重启。纯尺寸样式不增加镜像实现的测试，仅静态源码/精确差异检查。当时5173继续GG-116，后端为verified05e90d2/55迁移；这不是2026-10-09重新核验的运行事实。

下一步：站长检查左上Logo比例、图标文字对齐、名称点击编辑与多页标签。未宣称视觉手验通过。

## 2026-10-09 · 保存已有本地改动

- 请求：只保存当前未提交的画布改动，更新任务卡并提交、推送 GitHub；不改功能代码，不开 PR，不合并、不部署。
- 范围核对：入口 `F:/goodgood` 为 `codex/GG-106-oss-storage` / `074fd11`，无未提交功能内容；实际画布差异位于本任务工作树 `F:/goodgood-worktrees/GG-219` / `fix/GG-219-canvas-header-scale`。
- 提交前基线：`adea1e801737aa598c0d4f4f6d7baf259a6b247f`；`git merge-base --is-ancestor ba9a947 HEAD` 和 `git merge-base --is-ancestor 05e90d2 HEAD` 均退出 0。沿用现有任务分支，不从 main 或 C6 重新分支。
- 待保存源码：`features/canvas/canvas-page.module.css`、`features/canvas/canvas-page.tsx`、`features/canvas/canvas-project-pages-bar.tsx`；差异共 20 行新增 / 17 行删除，与上文工具栏尺寸范围一致。本轮不编辑这些源码。
- 排除清单：本工作树另外 40 个 status 修改项的 Git 内容差异为空；2026-10-09 用户明确要求恢复，已逐一核对无内容差异后仅对这 40 个路径执行 `git restore --source=HEAD --worktree`，全部恢复为干净状态、不暂存。根目录技能/配置、其他工作树任务文档保持原样，不纳入本次提交。
- 决策影响：仅存档已有实现，不改变已确认产品决定，无需新增 ADR。
- 验证状态：已检查 status、最近 5 次提交、工作树、完整画布 diff 与 Git 祖先；恢复无关文件前后，3 个画布源码原始字节 SHA-256 均一致。`git diff --check` 通过；遵循本卡既有不复测要求，未运行 `npm run check:local`、自动测试、构建或浏览器验收，不把历史门禁作为本次通过证据。
- 当前状态：6 文件存档提交 `866b42685ec7a6fc3d33fe51eb751db67197b1bf`（`fix(canvas): unify GG-219 header logo, labels and page icons`）已普通推送 `origin/fix/GG-219-canvas-header-scale`，`git ls-remote` 精确核对同一 commit；40 个无关换行项已恢复，源码原始字节未编辑。随后仅在 3 个交接文档同步本收据，不增加源码范围。未开 PR、未合并或部署。
- 下一步：站长手动复核原 GG-219 工具栏尺寸。后续累计画布功能从 GG-116 工作树的 GG-421 源码检查点接续；GG-219 是独立旧任务存档，不作为最新画布基线。

### 换行与开发线核对

- 有效配置来自 `C:/Program Files/Git/etc/gitconfig`：`core.autocrlf=true`。本仓库无已跟踪或当前根目录 `.gitattributes`，`git check-attr -a` 未发现相关路径的生效属性，未设置 `core.attributesFile`，无 `info/attributes` 覆盖。
- 40 个文件仅因工作区换行状态被 status 标记：抽查恢复前 `i/lf w/lf`，恢复检出后 `i/lf w/crlf` 且 status 干净；Git 内容比较一直为空。配置会在检出时写 CRLF、暂存时归一化 LF。不能据此断言是哪次编辑/工具最初写回 LF；原有效换行配置保持不变。
- 推送命令 `-u` 曾自动添加本分支 remote/merge 跟踪项；随即精确撤回这两项，恢复原本无 upstream 的状态。`core.autocrlf` 等原有配置保持，根目录用户 skills/配置未操作。
- 2026-10-09 `git fetch origin` 与 `git ls-remote --heads origin` 核对：GitHub main 为 `7c4927240ee8f9b7e2dc43362ce1f2f19e2ab16d`。画布当前主开发工作树 `F:/goodgood-worktrees/GG-116` 干净，源码检查点为 `fix/gg-421-seedance-model-icon` / `547022e`；新增 Seedance 持久生成、Nano Banana 2.1 等累计功能，不是 GG-219 的旧工具栏存档。
- 此时 GitHub 最新画布设计快照为 `design/gg-402-frontend-snapshot` / `e60d95c`；它是 `547022e` 的祖先，后者另有 33 个提交未存在于任何当前 GitHub 分支，且同名 GG-421 分支未推送。本轮仅获授权推送 GG-219，不扩展推送范围。
- 最新画布开发线与 GitHub main 已分叉：`git rev-list --left-right --count origin/main...fix/gg-421-seedance-model-icon` 为 `5 / 547`，共同祖先 `de699e1`。main 的 5 个独有提交属于 GG-106 隔离 OSS 发布和收据；不能描述成 main 仅单向落后。GG-219 与 GG-421 的共同祖先为 `efb72d9`，GG-219 不是最新画布开发基线。
- 本地 main 为 `0611efb`，比 GitHub main 多 1 个参考图上传收据文档提交；与 GG-421 比较为 main 独有 6 / 画布独有 547。因此对外报告以已实时核对的 GitHub main `7c49272` 为准。
- `adea1e8` 被本地 `fix/GG-219-canvas-header-scale` 和 `fix/GG-219-canvas-header-scale-isolated` 包含；推送后也被远端 `origin/fix/GG-219-canvas-header-scale` 包含，GitHub 已有。它不在 main 或 GG-421 祖先链上。
