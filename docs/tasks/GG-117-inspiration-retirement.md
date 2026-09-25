# GG-117 — 灵感板块整体下线并删除灵感数据表

- 状态：工作树文档、代码与删除迁移已完成；迁移未执行；破坏性步骤待站长授权。
- 用户需求：2026-09-25 站长对 GG-116 的追加指示「灵感版功能可以先删掉，后面再重构」，
  经追问确认为「整体下线，并删除数据表」。
- 最后更新：2026-09-25
- 分支 / worktree：`feature/GG-116-asset-history-actions`（`F:/goodgood-worktrees/GG-116`），
  叠加在 GG-116 的 `1aab378` 之上。
- 基线：GG-116 `1aab378`；生产应用版本另查 CURRENT_STATE（仍为 GG-098）。

## 范围与验收

- 要做：整体移除灵感功能的代码、路由、导航与测试；标记 0076—0078 退役并新增 ADR 0104；
  按子表优先顺序删除五张表；同一变更里移除 `ASSET_PUBLISHED` 检查及其测试。
- 不做：不迁移、不导出、不保留归档表；不删除历史任务卡与历史 ADR；不改 ADR 0073/0074/0075/0079。
- 验收点：仓库内不再有灵感功能的可执行引用；ADR 索引包含 0104；BACKLOG ≤100 行；
  文档契约测试通过。浏览器验收与生产删除均不在本次范围内。
- 决策影响：新增 [ADR 0104](../decisions/0104-inspiration-feature-retirement.md)，退役
  [ADR 0076](../decisions/0076-shareable-inspiration-cases.md)、
  [ADR 0077](../decisions/0077-inspiration-editor-private-presets.md)、
  [ADR 0078](../decisions/0078-inspiration-visibility-and-statistics.md)；同时修订单个
  [ADR 0103](../decisions/0103-generated-asset-hard-delete.md) 段落中的 409 描述。
- 授权边界：仅本地实现与文档。生产迁移不在本次授权内，需单独申请并确认恢复点。

## 实现与证据

- 相关文件/专题文档：`docs/PRODUCT.md`、`docs/ROUTES.md`、`docs/ARCHITECTURE.md`、
  `docs/DATA_MODEL.md`、`docs/UX_FLOWS.md`、`docs/TESTING.md`、`docs/ERROR_HANDLING.md`、
  `docs/DEPLOYMENT.md`、`docs/DESIGN_SYSTEM.md`、`docs/DEVELOPMENT_HANDOFF.md`、
  `docs/BACKLOG.md`、`docs/IMPLEMENTATION_PLAN.md`、`docs/decisions/README.md`。
- 已完成：阻塞 GG-117 决策的文档层全部落定——退役 ADR 0076—0078、新增并索引 ADR 0104、
  修订单个 ADR 0103 段落、清理各专题文档的灵感章节、BACKLOG 保持 100 行。
- 已完成：代码层移除——`app/page.tsx` 的灵感导航/状态/视图分支、发布入口与用例载入、
  `features/navigation/workspace-route.mjs` 的三个灵感路由种类与解析、渲染分支，
  `features/creation/http-generation-boundary.ts` 的预设端点与动作头，
  `server/assets/api.mjs` 的 `ASSET_PUBLISHED` 检查，以及随预设下线的 `parametersHidden`
  参数链（契约、边界、组合器、页面与仓库查询）。灵感测试文件已删除。
- 迁移：删除五张表的迁移已写为 `migrations/0047_gg117_drop_inspiration.sql`，尚未执行。
  顺序为 `inspiration_interactions`、`inspiration_generation_prompts`、`inspiration_likes`、
  `inspiration_events`，最后 `inspiration_cases`（引用 `assets(id)`、`reference_assets(id)`、
  `users(id)`）；不使用 `CASCADE`，子表优先顺序显式写出。四张子表之间没有外键，相对顺序
  不影响正确性，以迁移文件为准。迁移 0036/0037/0038 保留为历史记录。
- 与 GG-116 的耦合：`server/assets/api.mjs` 的 `deleteGeneratedAsset` 曾以查询
  `inspiration_cases` 返回 409 `ASSET_PUBLISHED`；表删除后该查询会运行时报错，
  因此该检查及其测试必须在同一变更里移除。
- 审计复查（13 个代理，Map/Implement/Audit 三阶段）发现 11 项，均已逐条核实：
  已修 `hashGenerationInput` 中灵感预设遗留的 `presetFingerprint` 死分支；已把
  文档里与实际迁移不一致的删表顺序、以及"迁移文件名尚未确定"的反事实描述改为指向
  `0047`；已修正 `parameters_hidden` 随表消失而非留存的表述；已为
  `gg072-profile-postgres.test.mjs` 的 protected 计数补注来源（灵感分支移除后仅剩头像
  一条），并新增文档与迁移文件名的守卫断言。
- **我复核时拦下的回归（审计未发现）**：删除灵感预设后，子代理把
  `createGenerationJob` 里批次的 `visiblePrompt` 从 `input.prompt` 改成了
  `input.composerPrompt ?? input.prompt`，并同步改写了原本通过的
  `gg040-batch-prompts.test.mjs` 断言来适配。`git log -S` 证明 `visiblePrompt` 只被
  `fa5a080`（灵感预设）动过，`GG-040` 引入的 `composerPrompt` 只喂给 `projects` 表的
  UPDATE（`projectComposerPrompt`），本就**不**作用于批次行。该改动会让项目批量生成时
  每张图的提示词显示整段含 `---` 的文本，而不是生成它的那一条切片。已回退
  `visiblePrompt = input.prompt` 并把断言改回守卫正确行为，同时加注释说明这个分工。
- **有意不修（记录以免日后当成遗漏）**：
  1. `db/schema.ts` 与 SQL schema 存在既有漂移（缺 `asset_folders`、`asset_organization`、
     `audio_materials`、`video_materials` 四个迁移 0045/0046 的表定义），`git show HEAD` 证明
     本次改动前就已如此。属独立任务，不在 GG-117 范围内顺手修。
  2. `tests/gg040-batch-prompts.test.mjs:128` 的 `visiblePrompt` 绑定断言是源码文本级、
     且是这条绑定的唯一守卫。本次已把它改回守卫 `input.prompt`；**不要当成冗余断言清理掉**，
     否则该绑定将失去全部覆盖。
- 验证：`npm run check:local` **575 项，552 通过 / 23 隔离跳过 / 0 失败**；lint 0 error
  （15 条既有 warning）；typecheck 通过。新增 `tests/gg117-inspiration-retirement.test.mjs`
  8 项全过，覆盖路由/组件/契约已移除、无残留导入、无残留表名与 `ASSET_PUBLISHED`、
  路由回落到创作、页面与运行时不再挂载、迁移按子表优先顺序、退役 ADR 保留并索引、
  文档指向真实迁移文件而非占位名。测试数由 GG-116 的 593 降到 575、隔离跳过由 26 降到 23，
  与删除灵感测试文件一致。迁移未执行，灵感表行数未统计。
- 发布：未发布；生产应用仍为 GG-098。

## 恢复工作

- 尚未完成：迁移执行（本地与生产）；灵感表行数统计；浏览器验收与发布。
- 阻塞/风险：生产删除不可逆且案例数据直接丢弃；迁移若与其它功能混在同一次发布，
  回滚成本高。ADR 0073/0074/0075/0079 与本功能无关，改动它们会造成决策记录错乱。

## 下一步

1. 站长确认可丢弃现有案例数据后，先统计并回报本地与生产 `inspiration_cases` 行数。
2. 确认后在隔离库执行 `migrations/0047_gg117_drop_inspiration.sql`，并跑一次完整门禁。
3. 生产执行单独开窗口，先记录恢复点。
