# GG-256 — 画布资产光标与拖入文件夹

- 状态：已实现并精确接入实际 5173，子与根定向代码验证完成，辅助目录退役。未部署，浏览器验收由用户完成。
- 日期：2026-10-01
- 分支 / worktree：`feat/GG-256-canvas-folder-drop` / `F:/goodgood-worktrees/GG-256-canvas-folder-drop`
- 源码基线：`896bce2`（含 GG-253 大图 pan/zoom、模型信息与 AssetVisual 缩略图复用）；HEAD 祖先核验通过。文档检查点尚为 GG-252，不能回退 main。

## 范围与验收

画布打开「资产」后，素材图面 hover 使用默认光标；右上「查看大图」按钮 hover 使用抓手，但仍只点击查看，不拖入或改名。生成图片与上传图片可拖到现有文件夹；拖到画布仍沿原 copy/add 路径。

文件夹可接收时给出克制灰黑靶区、移入提示；提交时源图与文件夹显示状态，成功后短暂确认并恢复，失败保留原素材/归属且可重试。同文件夹、未知素材/目录和非图片安全无操作；请求中防重入。减少动效取消位移/呼吸动画，原 folder 点击、改名、查看与键盘焦点保持。

仅复用 `saveAssetOrganization(kind,id,{folderId,tags},null)`，不复制/上传/创建节点；保留 tags 和服务端 displayName。无后端、路由、全局 CSS、生成流程或共享查看器修改。GG-253 metadata Map、controls=false 与 renderThumbnail/renderVideo 接线保持。

## 决策影响

用户确认素材默认 cursor 与查看入口 grab cursor，作为 [ADR 0120](../decisions/0120-canvas-asset-hover-video-preview.md) 的局部追加。文件夹移动复用 GG-115 已确认组织模型，不新增存储语义。

## 实现与证据

- `canvas-asset-panel.tsx/.module.css`：默认图面 cursor、独立 grab 查看入口；原生拖入使用 copyMove，文件夹接收使用 move，拖到画布仍保留 copy。私有拖拽 payload 与本面板当前拖拽 identity 匹配后才提交，folder/panel 消费 drop，不新增节点。
- `canvas-folder-drop.mjs/.d.mts`：只从已授权列表解析 generated/reference 图片与现存 folder；同目录/未知/非图片无请求。串行 pending guard、确认后合并真实返回 arrangement、失败无乐观移除、retry 重读最新 tags；卸载后忽略迟到 UI 回调。既有 library event 刷新防旧读取覆盖已确认归属。
- 靶卡保持原位置，以灰黑浅填充/细内圈、folder-open 图标和「拖入整理/松开移入」提示接收范围；源卡轻淡、靶卡请求呼吸/微光、成功勾选 1.8 秒后恢复。pending/success 用 SR 状态，避免插入可见提示行使文件夹跳位；失败行保留重试。减少动效取消过渡/位移/循环动画。
- `node --test tests/gg256-canvas-folder-drop.test.mjs`：8/8，通过（身份与 tags、空/未知/同目录/非图片、安全无请求、防重复提交、成功前保留、失败/最新 tags 重试、卸载迟到成功/失败及通用错误）。均使用内存合成集合/Promise，无网络或真实资源写入。
- 定向 lint：`node F:/goodgood-worktrees/GG-116/node_modules/eslint/bin/eslint.js --config F:/goodgood-worktrees/GG-116/eslint.config.mjs features/canvas/canvas-asset-panel.tsx features/canvas/canvas-folder-drop.mjs features/canvas/canvas-folder-drop.d.mts tests/gg256-canvas-folder-drop.test.mjs` 退出 0；仅无子 node_modules 的 React detect 提示，无 lint 错误。
- `git diff --check` 通过；源审阅确认 GG-253 generationMetadata、AssetPreviewThumbnail、controls=false、ImageViewer renderThumbnail/renderVideo 未改变，Enter/Space/F2 改名和 folder 原按钮路径保持。
- 未执行：浏览器/视觉验收、真实资产/API 写入、上传/生成、数据库/队列操作、安装、全量 gate/build/typecheck。子树未运行全局文档索引测试；根负责最终共享文档检查，模块编译已完成。
- 根交付：子提交 `df7cdf4` 精确回放为 `5183287`；根定向 8/8、四个相关代码/类型/测试文件 lint 零错误/警告。panel/helper/CSS 三个实际 Vite 模块编译 HTTP 200，folder mover 与 GG-253 元数据/缩略图接线确认保留。

## 子 agent/worktree 清单

- 子 agent：`/root/canvas_folder_drop`；唯一可写树为上述 GG-256；父 agent 拥有 GG-116 集成树。
- 文件边界：`features/canvas/canvas-asset-panel.tsx` / `.module.css`、最小 helper/声明/定向测试、本任务卡和 ADR 0120 追加。禁止修改并行 GG-255 的 canvas-page/workspace 入口及父共享状态文档。
- 创建数：1；集成数：1；退役数：1。父核对绝对所有权路径、clean（含 ignored）、无 reparse point/缓存/进程后以 Git remove/prune 退役，目录已不存在；其余 worktree 保留。
- 保留 dirty 路径：交付限定提交后本树干净；不含其他任务改动。
- 依赖/构建缓存：不创建 node_modules、dist、.next 或测试缓存；父使用唯一 GG-116 依赖做集成 lint/编译。
- 退役条件：限定提交已审查/精确集成且本树干净；父执行 worktree remove/prune，不强删目录。

## 恢复工作 / 下一步

开发、精确集成、定向代码验证及干净目录退役完成，共享状态/交互规范同步。用户验收光标、靶区/请求/成功/失败动效、同文件夹安全无操作、独立查看/改名，以及原拖入画布行为；无待完成代码/运行步骤。
