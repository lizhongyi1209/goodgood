# GG-422 — 画布线接入设计系统文档与并存 token

- 状态：接入、编号与冲突处理、文档测试、本地构建和 GitHub 推送均完成；设计方案仍提议中，现有页面保持。
- 用户需求：先备份 GG-421，再从 547022e 新建设计分支并 cherry-pick 336f24a；文档测试与 build:local 后推送，不开 PR、不合并。
- 最后更新：2026-10-09。
- 分支 / worktree：`design/GG-422-design-system` / `F:/goodgood-worktrees/GG-422-design-system`；负责人为根 agent，无子 agent。
- 基线：`547022eadeb3888741c4ef7d0cbbe4931f04ad9d`；来源分支 `design/GG-405-design-system-docs` / `336f24afde63297541ba3f25f7c696cffe75a18e`。
- 编号：画布 GG-405 已用于分镜菜单，故新任务用下一可用 GG-422；ADR 最高为 0143，来源 ADR 0144 可沿用。

## 范围与验收

- 接入 `docs/design/` 基础规范、页面与 33 个组件说明、tokens.json，以及 `app/design-tokens.css` 的 `--ds-*` 定义和 globals 导入。
- 保留当前 AGENTS/视觉约束、BACKLOG/任务记录、ADR 索引、React Flow CSS 导入和全部既有样式数值；新 token 不应用于页面。
- 修复实际文档测试暴露的行数、索引、断链和下一步缺失；历史入口全文归档且保持可追溯，不修改旧任务完成/撤回状态，不修改测试门槛。
- 决策影响：[ADR 0144](../decisions/0144-design-system-v3.md) 保持提议中，未接受积分蓝色方案；既有 ADR 0105 与画布的范围例外继续有效。
- 授权边界：本次明确授权文档测试、`npm run build:local`、本地提交及 GitHub 分支推送；无 PR、合并、部署、服务重启、数据库/队列或真实生成操作。换行配置与 .gitattributes 留待另行任务。

## 实现与证据

- A 已完成：2026-10-09 普通推送 `fix/gg-421-seedance-model-icon`；GitHub `git ls-remote` 精确返回基线 547022e，33 个此前未推送提交已备份，未修改该分支源码或 HEAD。
- B 来源：`git cherry-pick -x --no-commit 336f24a`；冲突位于 globals、BACKLOG、DESIGN_SYSTEM、ADR 索引。所有当前内容保留，来源新增规范/token 完整接入；来源历史 BACKLOG/ADR 索引另存归档。
- 源码保证：现有组件/业务源码不改；globals 只增加设计 token import，新 CSS 只含 :root 中的 --ds-* 自定义属性。
- 基线文档连续性测试：9 项中 5 通过/4 失败，失败涉及入口超长、旧任务链接/下一步、ADR 索引漏项；本轮只修文档，后续结果另记。
- 文档验证：`node --test tests/documentation-continuity.test.mjs tests/m8-production-release.test.mjs` 本轮 16/16 通过；入口行数为 AGENTS 168/170、CURRENT_STATE 35/150、WORKFLOW 130/150、IMPLEMENTATION_PLAN 42/150、BACKLOG 87/100。旧任务仅补下一步或修复自身链接，15 个既有 ADR 补入索引，历史全文保留。
- 构建验证：独立目录 `npm ci --no-audit --no-fund` 成功（1151 包），锁文件无变化；`npm run build:local` 五阶段完成、退出码 0。依赖 peer 提示、代理提示、插件耗时及大 chunk 提示未阻塞构建。
- 界面不变证据：与 547022e 对比，移除新增 import 后 globals 全文完全相同；新 CSS 只定义 80 个 --ds 自定义属性、现有源码消费者为 0；组件/功能/共享/服务器/静态素材及依赖锁文件完全无 diff。40 个设计文件与 336f24a 完全一致，AGENTS 原规则仅重新换行，原画布 GG-405 任务不变。
- `npm run check:local` 未运行：本次用户委托文档测试和 build:local；现行 AGENTS/WORKFLOW 要求按范围验证，不自动追加全量门禁。未执行浏览器截图验收，页面不变结论基于上述源码与 CSS 证据。
- B 推送收据：接入提交 `a411892e979cb51f2cd3f101dca2f70582e2f2f5` 已普通推送 `design/GG-422-design-system`；2026-10-09 `git ls-remote` 返回同一完整 HEAD，来源 trailer 保留 336f24a。该收据随本分支后续文档提交继续保存与推送，未设置 tracking 或改变 Git 换行配置。
- 发布：未部署，未开 PR、未合并 main。

## 并行与 worktree 收口

- 子 agent/worktree 清单：无子 agent；根 agent 独占上述新集成 worktree，避免切换或构建当前 5173 使用的 GG-116。
- 依赖/构建缓存：本轮在独立集成目录安装锁定依赖并构建，未复制环境、凭据或用户数据。构建进程退出并核对绝对路径/忽略属性后，已清理本目录 node_modules、dist、.next、.wrangler，未清理其他工作树。
- 收口：创建数 1（根集成目录），退役数 0；保留唯一根集成目录作为本分支源码交接/后续评审入口，无子 worktree、无依赖或构建缓存副本。F 盘清理前/后可用字节 80,557,195,264 / 81,916,620,800（增量 1,359,425,536 字节）；其他既有 dirty 路径归用户并保持。

## 恢复工作

- 本轮无未完成项：接入提交已推送并核对 GitHub HEAD；后续视觉迁移不属于本轮范围。
- 阻塞/风险：ADR 0144 尚未接受；构建不等于生产部署或用户视觉验收。
- 下一步：后续如评审 ADR 0144 或迁移页面，从已推送设计分支接续并单独确认产品范围；当前不继续改界面、开 PR、合并或部署。
