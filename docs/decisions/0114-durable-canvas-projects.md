# ADR 0114: Durable canvas projects

## GG-218 addendum · pages inside a canvas project (2026-09-30)

The operator requested a default 页面1 and up to ten pages per existing canvas project, with compact upper-left tabs, an add icon and equal visual icon/type height. Each page owns its nodes, edges, generator drafts, reference bindings and undo history. Existing schemaVersion1 documents become a single page without changing IDs or existing database rows; new schemaVersion2 documents persist an ordered pages array with stable page IDs/names and the same page content fields. Retain aggregate project limits, ownership/workspace authorization and CAS. Reject a legacy single-page write over an accepted multi-page project rather than silently discard pages.

The active page and each page's view are browser-local preferences, following the existing view/content split; a switch alone does not produce a cloud content write. Add/delete and page content edits retain existing local-first cloud sync. Upload and generation callbacks stay attached to the original page after switching, with no task resubmission. The operator confirmed deletion behind a second confirmation; retain at least one page, do not delete shared library assets, and block deletion while upload, generation or unresolved submission recovery is active. No page rename, cross-page connections or new route is included. Preserve GG-216's accurate distinction between pending files and terminal local submission placeholders.

- Status: Accepted for GG-173 local implementation
- Date: 2026-09-29
- Task: GG-173
- Supersedes: ADR 0108's temporary canvas document, node layout, generator draft, connection, and name lifetime.

## Context

The standalone canvas started as a temporary React Flow surface. Refreshing, closing, or losing the network discards its node layout, generator drafts, connections, and name. The operator now requires each canvas to be a resumable project, with prompt feedback when changes cannot reach the server. Existing creative `projects` are a different record: their save API requires at least one generation batch and restores a creation session rather than a graph. Empty canvases must not create a fake generation batch.

## Decision

- A canvas has a stable, client-generated UUID and an addressable `/canvas/:projectId` URL. Opening `/canvas` creates a new canvas identity, not a legacy creative project. The shared project index presents both kinds with their own restore destinations.
- Store a versioned canvas document in a distinct owner/workspace-scoped `canvas_projects` record. The document contains stable node identities, supported media asset references, node geometry, connections, per-generator prompt/model/settings and ready direct-reference IDs, and the viewport. Browser-only callbacks, Blob URLs, signed URLs, selection and transient menus are never persisted as server data. Server reads rehydrate media through authorized existing APIs.
- Save meaningful edits to IndexedDB first, including pending local `File` objects, then serialize remote saves. Coalesce movement frames and send the latest snapshot soon after an operation settles. A remote acknowledgment alone changes the status to synced. An interrupted upload retains its local file and can resume; a successful upload replaces the local placeholder with a durable asset ID and releases its local copy.
- Server writes carry an expected version and use compare-and-swap. An ambiguous response may be retried idempotently. When a second tab has written a different version, preserve both documents by saving this tab's dirty snapshot as a new canvas project and tell the user. No last-writer-wins overwrite.
- Failed or offline writes leave the local draft intact, show a clear unsynced state and retry on reconnection or explicit action. A reload restores a pending local snapshot before taking a remote result. A missing or unreadable local cache must not be described as saved. The existing generation and asset boundaries remain: creating or restoring a canvas never starts a provider request or spends credits.

## Consequences

This changes the previous explicit `/canvas` refresh-loss decision. Canvas project IDs remain separate from legacy creative project IDs, while the project index is a unified entry point. The browser cache is a recovery layer, not an authorization source or a replacement for server persistence. A ready asset remains an owner-scoped asset even if its node is removed; a pending local file needs IndexedDB capacity until its upload completes. The initial local implementation requires a backend checkpoint containing the new route and migration before the proxied 5173 interface can sync.

## GG-175 amendment · Separate content from the view

The operator chose content-scoped autosave after reviewing the initial GG-173 behavior. Pan, zoom, fit view, selection, hover, playback, and panel changes do not mark the canvas project dirty or send a server write. The last viewport is a per-browser preference saved after movement settles; an existing document viewport remains a fallback for older projects and is incidentally refreshed when actual content is saved. Node geometry, graph structure, generator inputs, name, ready asset identities, and result identities remain project content. Coalesce continuous gestures, compare normalized content before local writes, and skip server PUT when its normalized payload has not changed. The first empty project must still be created remotely. Browser-close handlers may attempt to flush pending work, but regular in-session persistence carries the durability guarantee; an asynchronous IndexedDB transaction at page close cannot be relied on.

## GG-226 addendum — 项目列表管理与快照（2026-09-30）

用户要求删除GOODGOOD PROJECTS英文眉题，项目可重命名/删除，画布预览采用已保存画布快照，更新时间显示「更新于 YYYY年MM月DD日」。统一索引保留画布与旧版创作两类恢复目的地，项目操作复用shadcn菜单/弹框；重命名只改名称而不提交旧图覆盖内容。删除经确认，仅移除项目和本机项目缓存，不删除素材、生成记录或计费数据；owner/workspace校验与并发版本保护保持。画布删除需退役标记防止其他打开页面自动保存使项目复活，具体最小schema/契约在任务卡记录。已删除项目不重试为新项目。

画布卡片根据真实保存的文档、节点几何、连接及受权素材显示只读缩略快照，优先本机未同步内容和本机活动页，无本机页选择则页面1；读取失败给重试，不用假示例/通用Frame图标充当快照。既有旧版项目无画布文档，保留真实批次封面，不伪造画布。不改活跃画布编辑器、同步器或节点文件，项目模块自行读取；不自动上传或生成。

## GG-232 addendum — 项目卡片直接进入与轻反馈（2026-09-30）

用户要求鼠标悬停项目时有代表可点击进入的轻动效，删除「继续创作」按钮，并去掉项目功能菜单/重命名弹窗的黑边框样式。这调整GG226的显式继续按钮决策：项目卡片主体成为直接进入入口，仍按原画布链接/旧创作恢复行为。操作菜单仍提供重命名和删除，功能控件/快照重试须独立于进入入口；不让菜单操作误进入项目，也不嵌套交互元素。hover为克制的灰度反馈和轻微预览缩放，键盘焦点可见，减少动效偏好下禁用运动；只有项目局部控件移除黑边框/黑焦点环，使用灰底焦点反馈，不全局更改shadcn原语。画布编辑器、真实项目数据、接口及运行服务不变。

## GG-236 addendum — 项目卡片常态外框（2026-09-30）

用户要求项目卡片默认也显示当前hover外框，hover保留现有预览放大以提示可点击。当前外框由卡片浅灰背景和既有内边距形成：将GG232的#f4f4f5底色设为常态，hover/focus沿用同色；现有1.015倍预览缩放、180ms过渡、减少动效规则与键盘焦点保持。画布与旧创作卡片共用局部规则，不改变卡片尺寸、间距、进入/菜单/重试、项目数据或接口。

## GG-237 addendum — 项目四列与紧凑预览（2026-09-30）

用户确认GG236外框效果正确，要求缩小项目卡片并在一行放四个。调整当前三列布局和1.48预览比例：项目可用内容宽度达到960px时固定四列，720–959px三列、480–719px两列、更窄一列；使用局部容器查询，列数跟随实际内容宽度而非仅屏幕宽度。两类项目封面统一4:3，保持12px间距、现有内边距及圆角；四列使宽高整体缩小，名称继续单行省略。浅灰常态外框、hover/focus的1.015倍预览及减少动效规则保留；真实画布快照仍居中完整适配，旧创作封面仍按原裁剪方式。仅布局展示变动，项目内容和接口保持。
